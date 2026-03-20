import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { normalizeObjectivePayload, normalizeObjectiveSection } from "@/lib/sowObjectiveSegments";
import { extractObjectivePayloadFromModelOutput, parseJsonFromModelOutput } from "@/lib/aiJson";

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
    try {
        return await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a curriculum research expert. Your ONLY job is to find and quote verbatim text from official published ${examBody} ${subjectName} syllabus documents. You must NEVER paraphrase, invent, or infer — only quote directly from the official source.`,
                },
                {
                    role: "user",
                    content: `Search the web for the official ${examBody} ${subjectName} syllabus document and find the section that covers the topic "${topic}".

The teacher has specified the following sub-topics and content for this week — use these as search anchors to find the correct syllabus section:

WEEK CONTENT (teacher-defined):
---
${weekContent}
---

These sub-topics tell you exactly what the class is studying. Match them against the official ${examBody} ${subjectName} syllabus.

Search strategies (try in order):
1. Search: site:waec.gov.ng OR site:jamb.gov.ng OR site:cambridgeinternational.org "${examBody} ${subjectName} syllabus" "${topic}"
2. Search: "official ${examBody} ${subjectName} syllabus" "${topic}" learning objectives
3. Search: "${examBody} ${subjectName} syllabus" [key sub-topics from the week content above]

From the official document, extract and QUOTE VERBATIM:
- The exact theme/section number and title (e.g. "Theme 2, Section 2.3: ...")
- The exact learning outcomes / objectives as worded in the official document (copy the text)
- The specific content points or sub-topics listed — especially any that match the week content above
- Any assessment objectives or command words associated with this topic

CRITICAL: Quote directly — do not paraphrase. If the topic or its sub-topics are not in the official ${examBody} ${subjectName} syllabus, state: "NOT FOUND: [explain why]"`,
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

// ─── Step 3: Double-check agent — verifies objectives against the syllabus ───
async function verifyObjectivesAlignment(
    examBody: string,
    subjectName: string,
    topic: string,
    objectives: string[],
    syllabusContent: string,
): Promise<{ verified: boolean; note: string; correctedObjectives: string[] | null }> {
    if (!objectives.length) return { verified: false, note: "No objectives to verify", correctedObjectives: null };

    // When no syllabus text was retrieved, the verifier must be strict — NOT permissive.
    const contextBlock = syllabusContent
        ? `RETRIEVED OFFICIAL ${examBody} ${subjectName} SYLLABUS CONTENT:\n---\n${syllabusContent.slice(0, 2500)}\n---\n\nFor each objective below, identify the EXACT sentence or phrase in the text above that justifies it. If you cannot point to specific text, the objective is hallucinated.\n\n`
        : `WARNING: No official syllabus text was retrieved. You must apply strict knowledge of the official ${examBody} ${subjectName} published syllabus. Be CONSERVATIVE — if you are not certain an objective appears verbatim or very closely in the official syllabus document, flag it as a hallucination. Generic objectives that merely restate the topic title are always hallucinated.\n\n`;

    try {
        const raw = await callOpenRouter(
            [
                {
                    role: "system",
                    content: `You are a strict anti-hallucination reviewer for ${examBody} ${subjectName} learning objectives. Your PRIMARY mission is to catch objectives that LOOK correct but are NOT grounded in the official ${examBody} ${subjectName} syllabus — they just sound plausible. Be ruthless: if an objective is generic enough to appear in any textbook on this topic, it is likely hallucinated.`,
                },
                {
                    role: "user",
                    content: `${contextBlock}Review these generated objectives for ${examBody} ${subjectName}, topic: "${topic}":
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

For EACH objective ask:
A) Is this objective traceable to a specific line/point in the retrieved syllabus text (or official document if no text)?
B) Is this objective SPECIFIC to the ${examBody} treatment of this topic — or is it so generic it could appear in any lesson on this topic? (Generic = hallucinated)
C) Does this use the correct ${examBody} command verb for the expected skill level?

HALLUCINATION SIGNS to reject:
- Objectives that only restate the topic title with an action verb ("Define the meaning of economics", "Explain economics as a social science")
- Objectives covering content not explicitly listed in the syllabus
- Objectives that are correct generally but NOT what ${examBody} specifically tests

If 3+ objectives are hallucinated: verified=false, provide correctedObjectives grounded ONLY in actual syllabus content.
If all objectives are genuinely syllabus-grounded: verified=true, correctedObjectives=null.

Return ONLY valid JSON (no markdown):
{"verified":true|false,"note":"empty string if all OK, otherwise list the specific issues","correctedObjectives":["corrected obj 1","corrected obj 2"] or null}`,
                },
            ],
            "google/gemini-2.5-flash-lite",
            25000,
            1200,
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
        return { verified: true, note: "Verification skipped", correctedObjectives: null };
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

    return {
        systemMsg: `You are a curriculum expert specialising in the official ${examBody} ${subjectName} syllabus. You have been given both the teacher's week content AND verbatim text from the official syllabus. Generate objectives that are grounded in the official syllabus AND relevant to the specific sub-topics the teacher is teaching this week.`,
        userMsg: `Generate 4-5 learning objectives for the topic "${topic}" in ${subjectName} (${className}).

STEP 1 — TEACHER'S WEEK CONTENT (what students are studying this week — use this to focus the objectives):
---
${content}
---
${queryLine ? queryLine + "\n" : ""}
STEP 2 — OFFICIAL ${examBody} ${subjectName} SYLLABUS CONTENT (retrieved from the web — ground truth for accuracy):
---
${syllabusContent.slice(0, 2500)}
---

RULES — strictly enforced:
1. RELEVANCE: Each objective must relate directly to one of the sub-topics or concepts in the teacher's week content above. Do not generate objectives for parts of the syllabus the teacher is not covering this week.
2. ACCURACY: Every objective must be traceable to a specific statement in the official syllabus text. Do NOT add objectives that merely "seem relevant" — that is hallucination.
3. NO TITLE RESTATEMENT: Do not restate the topic title as an objective (e.g. if the topic is "Meaning of Economics", the objective must say what the syllabus specifically requires, not just "Define the meaning of economics").
4. COMMAND VERBS: Use the exact ${examBody} command verbs from the syllabus text where they appear.
5. ONE SKILL PER LINE: No compound sentences. No "and".
6. If the retrieved syllabus text does not match the week content at all, return syllabusFound=false.

Return ONLY valid JSON (no markdown):
{"syllabusFound":true|false,"syllabusRef":"exact section reference from the syllabus text e.g. 'Theme 1, Section 1.2: ...' or empty","syllabusWarning":"empty if found, otherwise explanation","${section}":["objective 1","objective 2"] or []}`,
    };
}

// POST /api/scheme-of-work/weeks/[id]/generate-objectives
// Body (optional): { section?: string, syllabusQuery?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(params.id, user.id, user.schoolId);
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

            // Step 1: Web-search the official syllabus
            const syllabusContent = await searchSyllabusContent(
                examBody, subjectName, week.topic, week.content || "N/A",
            );

            // Step 2: Generate objectives grounded in the retrieved syllabus text
            const { systemMsg, userMsg } = buildSectionPrompt(
                section, subjectName, className, week.topic, week.content || "N/A", syllabusContent, syllabusQuery,
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

            // Step 3: Double-check agent — verify alignment with the actual syllabus
            const { verified, note, correctedObjectives } = await verifyObjectivesAlignment(
                examBody, subjectName, week.topic, objectiveLines, syllabusContent,
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
        const systemMessage = `You are a Nigerian secondary school curriculum specialist. Objectives for WAEC, JAMB, and IGCSE must be anchored directly to what those exam bodies publish for ${subjectName} — not generic content.`;

        const userMessage = `Generate objectives for this scheme of work week:
Subject: ${subjectName} | Class: ${className}
Topic: ${week.topic}
Content: ${week.content || "N/A"}

Return ONLY valid JSON (no markdown):
{"objectives":["3-5 general action-verb classroom objectives"],"waecObjectives":["4-5 objectives from WAEC SSCE ${subjectName} syllabus"],"jambObjectives":["4-5 objectives from JAMB UTME ${subjectName} syllabus"],"igcseObjectives":["4-5 Cambridge IGCSE ${subjectName} objectives using command words"]}

Rules: short standalone action-verb strings; no bullets/numbers/markdown inside values; exam objectives must match published syllabus content.`;

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

        return NextResponse.json(normalized);
    } catch (error: any) {
        console.error("[SOW generate-objectives] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
    }
}
