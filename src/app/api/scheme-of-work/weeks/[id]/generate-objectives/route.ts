import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { normalizeObjectivePayload, normalizeObjectiveSection } from "@/lib/sowObjectiveSegments";
import { extractObjectivePayloadFromModelOutput, parseJsonFromModelOutput } from "@/lib/aiJson";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

async function resolveWeekAccess(weekId: string, userId: string, schoolId: string) {
    const week = await prisma.schemeOfWorkWeek.findFirst({
        where: { id: weekId },
        include: {
            schemeOfWorkTerm: {
                include: {
                    schemeOfWork: {
                        include: {
                            collaborators: { select: { userId: true } },
                            subject: { select: { name: true } },
                            class: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
    if (!week) return { week: null, sow: null, isOwner: false, isCollaborator: false };

    const sow = week.schemeOfWorkTerm.schemeOfWork;
    if (sow.schoolId !== schoolId) return { week: null, sow: null, isOwner: false, isCollaborator: false };

    const isOwner = sow.ownerId === userId;
    const isCollaborator = sow.collaborators.some((c) => c.userId === userId);
    return { week, sow, isOwner, isCollaborator };
}

async function callOpenRouter(messages: object[], model: string, timeoutMs = 45000, maxTokens = 1000): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics SOW Generator",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices[0]?.message?.content ?? "";
}

async function generateWithFallback(messages: object[], maxTokens = 1200): Promise<string> {
    const models = [
        "google/gemini-2.5-flash-lite",              // $0.10/$0.40 — 1M ctx, strong JSON + curriculum knowledge
        "meta-llama/llama-3.3-70b-instruct",         // $0.10/$0.32 — reliable structured output
        "mistralai/mistral-small-3.1-24b-instruct",  // $0.10/$0.30 — near-perfect JSON healing rate
    ];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await callOpenRouter(messages, model, 45000, maxTokens);
        } catch (err) {
            console.warn(`[SOW generate-objectives] Model ${model} failed:`, err);
            lastError = err;
        }
    }
    throw lastError;
}

// ─── Step 1: Web-search the official syllabus via Perplexity Sonar ───────────
// Returns the retrieved syllabus text (empty string on failure — callers handle gracefully).
async function searchSyllabusContent(
    examBody: string,
    subjectName: string,
    topic: string,
    weekContent: string,
): Promise<string> {
    // Extract key sub-topic terms from weekContent for targeted searching
    const contentLines = weekContent
        .split(/\n|,/)
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 3)
        .slice(0, 6);
    const contentKeywords = contentLines.join(", ");

    try {
        return await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a curriculum research expert. Your ONLY job is to find and quote verbatim text from official published ${examBody} ${subjectName} syllabus documents. You must NEVER paraphrase, invent, or infer — only quote directly from the official source.`,
                },
                {
                    role: "user",
                    content: `Search the web for the official ${examBody} ${subjectName} syllabus document and find the SPECIFIC section that covers ALL of the following teacher-defined sub-topics:

TEACHER'S WEEK TOPIC: "${topic}"
TEACHER'S WEEK SUB-TOPICS (the actual content being taught):
${contentLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

CRITICAL SEARCH REQUIREMENT: You must find the syllabus section that covers these SPECIFIC sub-topics, not just the broad topic name. The syllabus section you quote must contain content about: ${contentKeywords}

Search strategies (try in order):
1. Search: "${examBody} ${subjectName} syllabus" "${topic}"
2. Search: "${examBody} ${subjectName} syllabus" "${contentLines[0]}" "${contentLines[1] ?? ""}"
3. Search: site:waec.gov.ng OR site:jamb.gov.ng OR site:cambridgeinternational.org "${examBody} ${subjectName} syllabus" "${topic}"

From the official document, extract and QUOTE VERBATIM:
- The exact section number and title that covers the sub-topics listed above
- The exact learning outcomes / objectives for THAT section as worded in the official document
- The specific content points listed — prioritise points that match the sub-topics above
- Assessment objectives or command words from that section

CRITICAL ACCURACY RULE: The section you retrieve MUST cover the specific sub-topics above. If you find a section about "${topic}" but it covers different sub-topics than the ones listed, say so explicitly and search for the correct section. Do NOT return a section that is about a different aspect of ${subjectName} that merely mentions the word "${topic}".

If no matching section is found: state "NOT FOUND: [explain which sub-topics are missing]"`,
                },
            ],
            "perplexity/sonar",
            30000,
            2000,
        );
    } catch (err) {
        console.warn(`[SOW searchSyllabusContent] Perplexity search failed for ${examBody}:`, err);
        return "";
    }
}

// ─── Content-syllabus overlap guard ──────────────────────────────────────────
// Returns true if the retrieved syllabus text actually covers the teacher's content.
// Prevents generation when Perplexity returns the wrong syllabus section.
function syllabusCoversWeekContent(syllabusText: string, weekContent: string): boolean {
    if (!syllabusText || !weekContent) return false;
    const lower = syllabusText.toLowerCase();
    const contentTerms = weekContent
        .split(/\n|,/)
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim().toLowerCase())
        .filter((l) => l.length > 4);

    if (contentTerms.length === 0) return true; // no content to check against
    const matchCount = contentTerms.filter((term) => lower.includes(term)).length;
    // At least 40% of content terms must appear in the retrieved syllabus text
    return matchCount / contentTerms.length >= 0.4;
}

// ─── Step 3: Double-check agent — verifies objectives against syllabus AND week content ───
async function verifyObjectivesAlignment(
    examBody: string,
    subjectName: string,
    topic: string,
    weekContent: string,
    objectives: string[],
    syllabusContent: string,
): Promise<{ verified: boolean; note: string; correctedObjectives: string[] | null }> {
    if (!objectives.length) return { verified: false, note: "No objectives to verify", correctedObjectives: null };

    const contentLines = weekContent
        .split(/\n|,/)
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 3);

    const syllabusBlock = syllabusContent
        ? `RETRIEVED OFFICIAL ${examBody} ${subjectName} SYLLABUS CONTENT:\n---\n${syllabusContent.slice(0, 4000)}\n---\n\n`
        : `WARNING: No official syllabus text was retrieved — apply strict knowledge of the published ${examBody} ${subjectName} syllabus.\n\n`;

    try {
        const raw = await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a strict curriculum reviewer. You have TWO jobs: (1) verify objectives are grounded in the official ${examBody} ${subjectName} syllabus, and (2) verify objectives actually cover what the teacher is teaching THIS WEEK — not a different part of the syllabus. Both checks must pass.`,
                },
                {
                    role: "user",
                    content: `${syllabusBlock}TEACHER'S WEEK CONTENT (the specific sub-topics being taught this week — objectives MUST cover these, not other topics):
---
${contentLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}
---

Review these generated objectives for ${examBody} ${subjectName}, topic: "${topic}":
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

For EACH objective ask ALL THREE questions:
A) SYLLABUS CHECK: Is this traceable to a specific line in the retrieved syllabus text above? (if no syllabus, is it in the official ${examBody} ${subjectName} document?)
B) WEEK CONTENT CHECK: Does this objective cover a concept from the teacher's week content listed above? An objective about a concept NOT in the teacher's list is WRONG for this week even if it appears elsewhere in the syllabus.
C) COMMAND VERB: Does it use the appropriate ${examBody} command verb?

REJECT an objective if it fails EITHER check A or check B.
- Objectives about concepts not in the teacher's week content list → WRONG WEEK (fail B)
- Objectives not traceable to the syllabus → HALLUCINATED (fail A)

If 2+ objectives are rejected: verified=false, provide correctedObjectives that pass BOTH checks — grounded in the syllabus AND covering the teacher's week sub-topics.
If all objectives pass both checks: verified=true, correctedObjectives=null.

Return ONLY valid JSON (no markdown):
{"verified":true|false,"note":"empty string if all OK, otherwise list the specific issues per objective","correctedObjectives":["corrected obj 1","corrected obj 2"] or null}`,
                },
            ],
            "google/gemini-2.5-flash-lite",
            25000,
            1500,
        );

        const parsed = parseJsonFromModelOutput<{
            verified: boolean;
            note: string;
            correctedObjectives?: string[] | null;
        }>(raw);

        return {
            verified: parsed?.verified ?? true,
            note: parsed?.note ?? "",
            correctedObjectives: parsed?.correctedObjectives ?? null,
        };
    } catch (err) {
        console.warn("[SOW verifyObjectivesAlignment] Verification failed:", err);
        return { verified: false, note: "Verification could not be completed — treat as unverified", correctedObjectives: null };
    }
}

const VALID_SECTIONS = ["objectives", "waecObjectives", "jambObjectives", "igcseObjectives"] as const;
type Section = typeof VALID_SECTIONS[number];

const EXAM_BODY_LABEL: Partial<Record<Section, string>> = {
    waecObjectives: "WAEC SSCE",
    jambObjectives: "JAMB UTME",
    igcseObjectives: "Cambridge IGCSE",
};

// ─── Step 2: Build a generation prompt grounded in retrieved syllabus text ────
function buildSectionPrompt(
    section: Section,
    subjectName: string,
    className: string,
    topic: string,
    content: string,
    syllabusContent: string,
    syllabusQuery: string | null,
): { systemMsg: string; userMsg: string } {
    const queryLine = syllabusQuery ? `\nAdditional context / syllabus reference: ${syllabusQuery}` : "";
    const examBody = EXAM_BODY_LABEL[section]!;

    // When no syllabus text was retrieved, we must NOT let the model invent objectives.
    // Explicitly instruct it to return syllabusFound=false.
    if (!syllabusContent) {
        return {
            systemMsg: `You are a curriculum expert. A web search for the official ${examBody} ${subjectName} syllabus returned no usable content for this topic and week content.`,
            userMsg: `A web search for the official ${examBody} ${subjectName} syllabus found NO content matching the topic "${topic}" with week content:
---
${content}
---

CRITICAL: You MUST return syllabusFound=false. Do NOT generate objectives from your training knowledge — that produces hallucinated content that looks plausible but is factually wrong and unreliable.

Return ONLY this JSON:
{"syllabusFound":false,"syllabusRef":"","syllabusWarning":"Could not retrieve official ${examBody} ${subjectName} syllabus content for this topic. Use the 'Search & Generate' field to enter the exact syllabus section reference (e.g. 'Theme 2, Section 2.1: ...') and try again.","${section}":[]}`,
        };
    }

    const contentLines = content
        .split(/\n|,/)
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 3);
    const numberedContent = contentLines.map((l, i) => `${i + 1}. ${l}`).join("\n");

    return {
        systemMsg: `You are a curriculum expert specialising in the official ${examBody} ${subjectName} syllabus. Your task is strictly scoped: generate objectives ONLY for the specific sub-topics the teacher is covering this week, grounded in the retrieved syllabus text. Do NOT generate objectives for other parts of the syllabus, no matter how relevant they seem.`,
        userMsg: `Generate learning objectives for ${subjectName} (${className}), topic: "${topic}".
${queryLine}

━━━ TEACHER'S WEEK CONTENT (the exact sub-topics being taught) ━━━
${numberedContent}
━━━ These are the ONLY sub-topics you may generate objectives for. ━━━

━━━ OFFICIAL ${examBody} ${subjectName} SYLLABUS (retrieved — use as ground truth) ━━━
${syllabusContent.slice(0, 4000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERATION PROCESS — follow in order:
1. For each numbered sub-topic in the teacher's list, find the corresponding entry in the syllabus text.
2. Write ONE objective per sub-topic that appears in the syllabus. Skip any sub-topic not in the syllabus.
3. If the syllabus text covers a different set of sub-topics entirely (does not match the teacher's list), return syllabusFound=false.

HARD CONSTRAINTS:
- Every objective must map to a specific item in the teacher's week content list AND a specific statement in the syllabus.
- Do NOT generate objectives for concepts not in the teacher's content list, even if they appear in the retrieved syllabus.
- Use ${examBody} command verbs (e.g. Define, Identify, Explain, Describe, Distinguish, Calculate, Analyse).
- One observable skill per objective. No compound sentences. No "and".
- 4–6 objectives total.

Return ONLY valid JSON (no markdown):
{"syllabusFound":true|false,"syllabusRef":"exact section title from the syllabus text, e.g. 'Theme 1, Section 1.2: Demand' or empty string","syllabusWarning":"empty if matched, otherwise explain mismatch","${section}":["objective 1","objective 2"]}`,
    };
}

// POST /api/scheme-of-work/weeks/[id]/generate-objectives
// Body (optional): { section?: string, syllabusQuery?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { id: weekId } = await params;
        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(weekId, user.id, schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!isAdmin && sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Cannot edit a submitted or approved scheme of work" }, { status: 409 });
        }

        const body = await req.json().catch(() => ({}));
        const targetSection = (body.section as string) || null;
        const syllabusQuery = (body.syllabusQuery as string)?.trim() || null;

        const subjectName = (sow as any).subject?.name ?? "the subject";
        const className = (sow as any).class?.name ?? "the class";

        // ── Section-specific generation ───────────────────────────────────────
        if (targetSection) {
            if (!(VALID_SECTIONS as readonly string[]).includes(targetSection)) {
                return NextResponse.json({ error: "Invalid section" }, { status: 400 });
            }
            const section = targetSection as Section;

            // Special case: harmonise objectives from exam-board sections
            if (section === "objectives") {
                const waec = (body.waecObjectives as string)?.trim() || "";
                const jamb = (body.jambObjectives as string)?.trim() || "";
                const igcse = (body.igcseObjectives as string)?.trim() || "";
                const nonEmptyCount = [waec, jamb, igcse].filter(Boolean).length;
                if (nonEmptyCount < 2) {
                    return NextResponse.json(
                        { error: "At least 2 exam board objectives are required to generate harmonised objectives." },
                        { status: 400 },
                    );
                }
                const examParts: string[] = [];
                if (waec) examParts.push(`WAEC SSCE Objectives:\n${waec}`);
                if (jamb) examParts.push(`JAMB UTME Objectives:\n${jamb}`);
                if (igcse) examParts.push(`Cambridge IGCSE Objectives:\n${igcse}`);

                const raw = await generateWithFallback([
                    {
                        role: "system",
                        content: `You are a curriculum expert. Your job is to distil existing exam-board objectives — drawn from WAEC, JAMB, and Cambridge IGCSE — into a clean, unified list. You must NOT invent new objectives; every harmonised objective must be traceable to at least one of the provided exam-board objectives.`,
                    },
                    {
                        role: "user",
                        content: `Below are the official objectives already generated from WAEC, JAMB, and Cambridge IGCSE syllabuses for the topic "${week.topic}" in ${subjectName} (${className}). Harmonise them into a single unified list.

${examParts.join("\n\n")}

HARMONISATION RULES — strictly enforced:
1. SOURCE FIDELITY: Every harmonised objective must be directly traceable to at least one of the exam-board objectives above — do NOT add new skills or concepts not present in the source objectives.
2. ONE SKILL PER OBJECTIVE: Each entry covers exactly one observable skill or concept. No "and", no compound sentences.
3. MEASURABLE: Start with a Bloom's action verb appropriate for ${className} level (e.g. Define, Identify, Explain, Calculate, Describe, Distinguish, Analyse, Compare).
4. CONCISE: Maximum 15 words per objective. Cut all filler words.
5. SIMPLE LANGUAGE: Write at ${className} reading level — no jargon, no academic hedging.
6. NO DUPLICATES: If WAEC and JAMB express the same skill, merge into ONE objective.
7. COUNT: Produce 4–6 objectives — enough to cover all key skills, not more.

Return ONLY valid JSON (no markdown):
{"syllabusFound":true,"syllabusRef":"harmonised from exam boards","syllabusWarning":"","objectives":["objective 1","objective 2"]}`,
                    },
                ]);

                const verificationParsed = parseJsonFromModelOutput<Record<string, unknown>>(raw);
                if (!verificationParsed) {
                    console.warn("[SOW generate-objectives] Unable to parse AI response:", raw.slice(0, 500));
                    return NextResponse.json({ error: "AI returned invalid response. Please try again." }, { status: 502 });
                }
                const objectiveParsed = extractObjectivePayloadFromModelOutput(raw);
                const sectionValue = objectiveParsed?.objectives ?? (verificationParsed.objectives as string | string[] | undefined);
                const { text } = normalizeObjectiveSection("objectives", sectionValue);
                return NextResponse.json({ objectives: text, syllabusFound: true, syllabusRef: "harmonised from exam boards", syllabusWarning: "" });
            }

            // ── Exam section 3-step pipeline: Search → Generate → Verify ─────
            const examBody = EXAM_BODY_LABEL[section]!;
            const weekContent = week.content || "N/A";

            // Step 1: Web-search the official syllabus
            const syllabusContent = await searchSyllabusContent(
                examBody, subjectName, week.topic, weekContent,
            );

            // Overlap guard: if retrieval returned content but it doesn't cover the teacher's
            // sub-topics, treat it as a failed search rather than generating wrong objectives.
            if (syllabusContent && !syllabusCoversWeekContent(syllabusContent, weekContent)) {
                console.warn(`[SOW generate-objectives] Retrieved syllabus content does not cover week sub-topics for "${week.topic}" — treating as not found`);
                return NextResponse.json({
                    [section]: "",
                    syllabusFound: false,
                    syllabusRef: "",
                    syllabusWarning: `The syllabus section retrieved does not match this week's sub-topics. Use the "Search & Generate" field to enter the exact ${examBody} ${subjectName} syllabus section reference for "${week.topic}" and try again.`,
                    syllabusVerified: false,
                    verificationNote: "",
                });
            }

            // Step 2: Generate objectives grounded in the retrieved syllabus text
            const { systemMsg, userMsg } = buildSectionPrompt(
                section, subjectName, className, week.topic, weekContent, syllabusContent, syllabusQuery,
            );

            const raw = await generateWithFallback([
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
            ]);

            const verificationParsed = parseJsonFromModelOutput<Record<string, unknown>>(raw);
            if (!verificationParsed) {
                console.warn("[SOW generate-objectives] Unable to parse AI response:", raw.slice(0, 500));
                return NextResponse.json({ error: "AI returned invalid response. Please try again." }, { status: 502 });
            }

            const syllabusFound = verificationParsed.syllabusFound !== false;
            const syllabusRef = String(verificationParsed.syllabusRef || "");
            const syllabusWarning = String(verificationParsed.syllabusWarning || "");

            if (!syllabusFound) {
                return NextResponse.json({
                    [section]: "",
                    syllabusFound: false,
                    syllabusRef,
                    syllabusWarning: syllabusWarning || `This topic does not appear to be in the official ${examBody} ${subjectName} syllabus.`,
                    syllabusVerified: false,
                    verificationNote: "",
                });
            }

            const objectiveParsed = extractObjectivePayloadFromModelOutput(raw);
            const sectionValue = objectiveParsed?.[section as keyof typeof objectiveParsed]
                ?? (verificationParsed[section] as string | string[] | undefined);
            const { text, items } = normalizeObjectiveSection(section, sectionValue);
            const objectiveLines = items.map((i) => i.text);

            // Step 3: Double-check agent — verify alignment with BOTH the syllabus AND the week content
            const { verified, note, correctedObjectives } = await verifyObjectivesAlignment(
                examBody, subjectName, week.topic, weekContent, objectiveLines, syllabusContent,
            );

            // Use the verifier's corrected set if it found issues
            if (!verified && correctedObjectives && correctedObjectives.length > 0) {
                const { text: correctedText } = normalizeObjectiveSection(section, correctedObjectives);
                return NextResponse.json({
                    [section]: correctedText,
                    syllabusFound: true,
                    syllabusRef,
                    syllabusWarning: "",
                    syllabusVerified: true,
                    verificationNote: note,
                });
            }

            return NextResponse.json({
                [section]: text,
                syllabusFound: true,
                syllabusRef,
                syllabusWarning: "",
                syllabusVerified: verified,
                verificationNote: verified ? "" : note,
            });
        }

        // ── Generate all sections (quick draft — no web search) ───────────────
        // WARNING: This path has NO syllabus retrieval and NO verification.
        // Output is flagged syllabusVerified=false so the UI can warn the teacher.
        const systemMessage = `You are a Nigerian secondary school curriculum specialist. Generate draft objectives only — the teacher will verify and correct them against official syllabuses. Be conservative: if you are not certain an objective appears in the official ${subjectName} syllabus for that exam body, write a generic classroom objective instead of inventing exam-specific content.`;

        const userMessage = `Generate draft objectives for this scheme of work week:
Subject: ${subjectName} | Class: ${className}
Topic: ${week.topic}
Content: ${week.content || "N/A"}

Return ONLY valid JSON (no markdown):
{"objectives":["3-5 general action-verb classroom objectives"],"waecObjectives":["4-5 objectives from WAEC SSCE ${subjectName} syllabus"],"jambObjectives":["4-5 objectives from JAMB UTME ${subjectName} syllabus"],"igcseObjectives":["4-5 Cambridge IGCSE ${subjectName} objectives using command words"]}

Rules: short standalone action-verb strings; no bullets/numbers/markdown inside values; prefer general objectives over confidently-wrong exam-specific ones.`;

        const raw = await generateWithFallback([
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
        ]);

        const parsed = extractObjectivePayloadFromModelOutput(raw);

        if (!parsed) {
            console.warn("[SOW generate-objectives] Unable to parse AI response:", raw.slice(0, 500));
            return NextResponse.json({ error: "AI returned invalid response. Please try again." }, { status: 502 });
        }

        const normalized = normalizeObjectivePayload(parsed);

        // Explicitly mark as unverified — no syllabus was retrieved for this path
        return NextResponse.json({
            ...normalized,
            syllabusVerified: false,
            syllabusWarning: "Quick draft generated without syllabus lookup. Use 'Search & Generate' on each exam board section to verify objectives against the official syllabus before approving.",
        });
    } catch (error: any) {
        console.error("[SOW generate-objectives] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
    }
}
