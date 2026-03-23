import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal types matching what ContentBlocks expect
interface GeneratedOption {
    id: string;
    text: string;
    isCorrect: boolean;
    order: number;
}

interface GeneratedDragDropItem {
    id: string;
    content: string;
}

interface GeneratedDragDropZone {
    id: string;
    label: string;
    acceptMultiple: boolean;
}

type SupportedQuestionType = "multiple_choice" | "true_false" | "short_answer" | "drag_drop";
const QUESTION_TYPE_ORDER: SupportedQuestionType[] = ["multiple_choice", "true_false", "short_answer", "drag_drop"];

interface GeneratedQuestion {
    id: string;
    type: SupportedQuestionType;
    order: number;
    questionText: string;
    points: number;
    explanation: string;
    data:
        | { multipleCorrect: boolean; options: GeneratedOption[] }
        | { correctAnswer: boolean }
        | { maxLength: number; keywords: string[] }
        | { items: GeneratedDragDropItem[]; zones: GeneratedDragDropZone[]; matches: { itemId: string; zoneId: string }[] };
}

function uid(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

async function callOpenRouter(messages: object[], model: string, timeoutMs = 30000, maxTokens = 1200): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics Quiz Generator",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.6 }),
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
        "google/gemini-2.5-flash-lite",
        "meta-llama/llama-3.3-70b-instruct",
        "mistralai/mistral-small-3.1-24b-instruct",
    ];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await callOpenRouter(messages, model, 30000, maxTokens);
        } catch (err) {
            console.warn(`[lessons/generate-quiz] Model ${model} failed:`, err);
            lastError = err;
        }
    }
    throw lastError;
}

function parseJsonFromRaw(raw: string): unknown {
    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    try {
        return JSON.parse(stripped);
    } catch {
        // Try to extract first JSON array/object
        const arrMatch = stripped.match(/\[[\s\S]*\]/);
        if (arrMatch) {
            try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ }
        }
        const objMatch = stripped.match(/\{[\s\S]*\}/);
        if (objMatch) {
            try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
        }
        return null;
    }
}

function normalizeText(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function isSupportedQuestionType(value: unknown): value is SupportedQuestionType {
    return QUESTION_TYPE_ORDER.includes(value as SupportedQuestionType);
}

function coerceQuestionType(value: unknown): SupportedQuestionType {
    switch (value) {
        case "true_false":
        case "short_answer":
        case "drag_drop":
            return value;
        default:
            return "multiple_choice";
    }
}

function clampCount(count: number, max: number) {
    return Math.min(Math.max(Number(count) || 3, 1), max);
}

function coerceQuestionTypes(value: unknown, fallback: SupportedQuestionType[] = ["multiple_choice"]): SupportedQuestionType[] {
    const rawValues = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? [value]
            : fallback;

    const normalized = rawValues
        .map((entry) => (isSupportedQuestionType(entry) ? entry : coerceQuestionType(entry)))
        .filter((entry, index, arr): entry is SupportedQuestionType => arr.indexOf(entry) === index);

    return normalized.length > 0 ? normalized : fallback;
}

function buildQuestionTypePlan(questionTypes: SupportedQuestionType[], count: number): SupportedQuestionType[] {
    const source: SupportedQuestionType[] = questionTypes.length > 0 ? questionTypes : ["multiple_choice"];
    return Array.from({ length: count }, (_, index) => source[index % source.length]);
}

function getQuestionTypeLabel(questionType: SupportedQuestionType) {
    switch (questionType) {
        case "true_false":
            return "True / False";
        case "short_answer":
            return "Short Answer";
        case "drag_drop":
            return "Drag & Drop";
        default:
            return "Multiple Choice";
    }
}

function getQuestionTypeInstructions(questionType: SupportedQuestionType) {
    switch (questionType) {
        case "true_false":
            return {
                rules: [
                    "- For true_false items, include a boolean correctAnswer",
                    "- Each item must include a boolean correctAnswer",
                    "- Do not include answer options",
                ],
                schema: `[
  {
    "type": "true_false",
    "questionText": "...",
    "explanation": "...",
    "correctAnswer": true
  }
]`,
            };
        case "short_answer":
            return {
                rules: [
                    "- For short_answer items, include concise marking keywords",
                    "- Each item must include 3-6 marking keywords",
                    "- Keep answers short enough for a brief written response",
                    "- Include maxLength between 80 and 180",
                ],
                schema: `[
  {
    "type": "short_answer",
    "questionText": "...",
    "explanation": "...",
    "keywords": ["...", "...", "..."],
    "maxLength": 140
  }
]`,
            };
        case "drag_drop":
            return {
                rules: [
                    "- For drag_drop items, include draggable items, zones, and matches",
                    "- Each item must include 3 or 4 draggable items",
                    "- Each item must include the same number of zones as items",
                    "- matches must map itemIndex to zoneIndex",
                ],
                schema: `[
  {
    "type": "drag_drop",
    "questionText": "...",
    "explanation": "...",
    "items": [{"content": "..."}, {"content": "..."}, {"content": "..."}],
    "zones": [{"label": "..."}, {"label": "..."}, {"label": "..."}],
    "matches": [
      {"itemIndex": 0, "zoneIndex": 0},
      {"itemIndex": 1, "zoneIndex": 1},
      {"itemIndex": 2, "zoneIndex": 2}
    ]
  }
]`,
            };
        default:
            return {
                rules: [
                    "- For multiple_choice items, include exactly 4 options",
                    "- Every question must have exactly 4 options",
                    "- Exactly 1 option must be correct",
                ],
                schema: `[
  {
    "type": "multiple_choice",
    "questionText": "...",
    "explanation": "...",
    "options": [
      {"text": "...", "isCorrect": true},
      {"text": "...", "isCorrect": false},
      {"text": "...", "isCorrect": false},
      {"text": "...", "isCorrect": false}
    ]
  }
]`,
            };
    }
}

function normalizeParsedQuestions(parsed: unknown): any[] {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).questions)) {
        return (parsed as any).questions;
    }
    return [];
}

// POST /api/lessons/generate-quiz
// Body: { topic?, sourceText?, questionType?, questionTypes?, avoidQuestionTexts?, count?, subjectName?, className?, weekContent?, objectives?, lessonSection? }
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const {
            topic,
            sourceText,
            questionType,
            questionTypes,
            avoidQuestionTexts,
            count = 3,
            subjectName,
            className,
            weekContent,
            objectives,
            lessonSection,
        } = body as {
            topic?: string;
            sourceText?: string;
            questionType?: SupportedQuestionType;
            questionTypes?: SupportedQuestionType[];
            avoidQuestionTexts?: string[];
            count?: number;
            subjectName?: string;
            className?: string;
            weekContent?: string;
            objectives?: string;
            lessonSection?: string;
        };

        const requestedQuestionTypes = coerceQuestionTypes(
            questionTypes,
            questionType ? [coerceQuestionType(questionType)] : ["multiple_choice"],
        );
        const isInductionQuiz = lessonSection === "induction";
        const safeCount = clampCount(count, isInductionQuiz ? 3 : 8);
        const typePlan = buildQuestionTypePlan(requestedQuestionTypes, safeCount);
        const topicLine = topic?.trim() || "the lesson topic";
        const subjectLine = subjectName?.trim() ? ` in ${subjectName}` : "";
        const classLine = className?.trim() ? ` for ${className} students` : "";
        const contentBlock = weekContent?.trim() ? `\nWeek content: ${weekContent.trim().slice(0, 600)}` : "";
        const objBlock = objectives?.trim() ? `\nLearning objectives: ${objectives.trim().slice(0, 400)}` : "";
        const sourceBlock = sourceText?.trim()
            ? `\nPrior knowledge source text:\n${sourceText.trim().slice(0, 1200)}`
            : "";
        const avoidBlock = Array.isArray(avoidQuestionTexts)
            ? avoidQuestionTexts
                .map((text) => normalizeText(text))
                .filter(Boolean)
                .slice(0, 8)
                .map((text) => `- ${text}`)
                .join("\n")
            : "";

        if (isInductionQuiz && !sourceText?.trim()) {
            return NextResponse.json(
                { error: "Generate or enter the Prior Knowledge Requirement before generating the induction quiz." },
                { status: 400 },
            );
        }

        const promptGuides = requestedQuestionTypes.map((type) => ({
            type,
            ...getQuestionTypeInstructions(type),
        }));
        const allowedTypesBlock = requestedQuestionTypes.map((type) => `- ${getQuestionTypeLabel(type)}`).join("\n");
        const typePlanBlock = typePlan.map((type, index) => `- Question ${index + 1}: ${getQuestionTypeLabel(type)}`).join("\n");
        const typeRulesBlock = promptGuides.flatMap((guide) => guide.rules).join("\n");
        const typeSchemaBlock = promptGuides
            .map((guide) => `${getQuestionTypeLabel(guide.type)} JSON format:\n${guide.schema}`)
            .join("\n\n");

        const systemMsg = `You are an experienced teacher creating warm-up knowledge-check quiz questions. Always return ONLY valid JSON - no markdown, no explanation text outside the JSON array.`;

        const userMsg = `Generate ${safeCount} prior-knowledge check questions about "${topicLine}"${subjectLine}${classLine}.${sourceBlock}${contentBlock}${objBlock}

RULES:
- Questions should test understanding students SHOULD already have (prior knowledge), not new content
- Questions must be very basic, confidence-building, and suitable as a lesson warm-up
- Use simple real-world situations from home, school, market, transport, money, family, or community when helpful
- Help prepare the learner's mind for the lesson instead of testing mastery
- Keep the connection to the lesson content realistic and relatable
- Keep question text concise (max 20 words)
- Include a short explanation (1-2 sentences) for why the correct answer is right
- Questions must be appropriate for the class level
- Use only the selected question types listed below

Selected question types:
${allowedTypesBlock}

Use this type order:
${typePlanBlock}

${typeRulesBlock}

${avoidBlock ? `Avoid repeating or closely paraphrasing these existing question ideas:\n${avoidBlock}\n` : ""}

Return ONLY a JSON array - no markdown fences, no extra text:
${typeSchemaBlock}`;

        const raw = await generateWithFallback(
            [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
            ],
            1400,
        );

        const parsed = normalizeParsedQuestions(parseJsonFromRaw(raw));
        if (parsed.length === 0) {
            console.warn("[lessons/generate-quiz] Bad AI response:", raw.slice(0, 500));
            return NextResponse.json({ error: "AI returned an invalid response. Please try again." }, { status: 502 });
        }

        // Transform into proper QuizQuestion format
        const questions: Array<GeneratedQuestion | null> = parsed
            .filter((q: any) => q && typeof q.questionText === "string" && q.questionText.trim())
            .slice(0, safeCount)
            .map((q: any, i: number) => {
                const ts = Date.now() + i;
                const base = {
                    id: `q_${ts}_${Math.random().toString(36).slice(2, 6)}`,
                    order: i,
                    questionText: String(q.questionText).trim(),
                    points: 1,
                    explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
                };

                const plannedType = typePlan[i] ?? requestedQuestionTypes[0];
                const effectiveQuestionType = isSupportedQuestionType(q?.type) && requestedQuestionTypes.includes(q.type)
                    ? q.type
                    : plannedType;

                if (effectiveQuestionType === "true_false") {
                    return {
                        ...base,
                        type: "true_false" as const,
                        data: { correctAnswer: q.correctAnswer === true },
                    };
                }

                if (effectiveQuestionType === "short_answer") {
                    const keywords = Array.isArray(q.keywords)
                        ? q.keywords
                            .map((keyword: unknown) => normalizeText(keyword))
                            .filter(Boolean)
                            .slice(0, 6)
                        : [];
                    const maxLength = Math.min(Math.max(Number(q.maxLength) || 160, 80), 220);

                    return {
                        ...base,
                        type: "short_answer" as const,
                        data: { maxLength, keywords },
                    };
                }

                if (effectiveQuestionType === "drag_drop") {
                    const rawItems: any[] = Array.isArray(q.items) ? q.items : [];
                    const rawZones: any[] = Array.isArray(q.zones) ? q.zones : [];
                    const items = rawItems
                        .map((item) => ({ id: uid("item"), content: normalizeText(item?.content ?? item) }))
                        .filter((item) => item.content)
                        .slice(0, 4);
                    const zones = rawZones
                        .map((zone) => ({
                            id: uid("zone"),
                            label: normalizeText(zone?.label ?? zone),
                            acceptMultiple: true,
                        }))
                        .filter((zone) => zone.label)
                        .slice(0, items.length || 4);

                    if (items.length < 2 || zones.length < 2) {
                        return null;
                    }

                    const rawMatches: any[] = Array.isArray(q.matches) ? q.matches : [];
                    const matches = items.map((item, itemIndex) => {
                        const matched = rawMatches.find((entry) => Number(entry?.itemIndex) === itemIndex);
                        const zoneIndex = Math.min(
                            Math.max(Number(matched?.zoneIndex) || itemIndex, 0),
                            zones.length - 1,
                        );
                        return { itemId: item.id, zoneId: zones[zoneIndex].id };
                    });

                    return {
                        ...base,
                        type: "drag_drop" as const,
                        data: { items, zones, matches },
                    };
                }

                const rawOptions: any[] = Array.isArray(q.options) ? q.options : [];
                const options: GeneratedOption[] = rawOptions.slice(0, 4).map((opt: any, oi: number) => ({
                    id: uid("opt"),
                    text: normalizeText(opt?.text, `Option ${String.fromCharCode(65 + oi)}`),
                    isCorrect: opt?.isCorrect === true,
                    order: oi,
                }));

                const firstCorrectIndex = options.findIndex((option) => option.isCorrect);
                const normalizedOptions = options.map((option, optionIndex) => ({
                    ...option,
                    isCorrect: firstCorrectIndex === -1 ? optionIndex === 0 : optionIndex === firstCorrectIndex,
                }));

                while (normalizedOptions.length < 4) {
                    normalizedOptions.push({
                        id: uid("opt"),
                        text: `Option ${String.fromCharCode(65 + normalizedOptions.length)}`,
                        isCorrect: false,
                        order: normalizedOptions.length,
                    });
                }

                return {
                    ...base,
                    type: "multiple_choice" as const,
                    data: { multipleCorrect: false, options: normalizedOptions.slice(0, 4) },
                };
            });

        const validQuestions = questions.filter((question): question is GeneratedQuestion => question !== null);

        if (validQuestions.length === 0) {
            return NextResponse.json({ error: "No valid questions could be generated. Please try again." }, { status: 502 });
        }

        return NextResponse.json({ questions: validQuestions });
    } catch (error: any) {
        console.error("[lessons/generate-quiz] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "Quiz generation failed. Please try again." }, { status: 500 });
    }
}
