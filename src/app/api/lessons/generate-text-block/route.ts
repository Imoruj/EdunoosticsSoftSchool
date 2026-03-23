import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { buildReferenceMaterialsBlock, type ReferenceMaterialPromptInput } from "@/lib/lessons/referenceMaterialPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTION_CONTEXT: Record<string, string> = {
    introduction: "This is a lesson introduction section. Give a brief, engaging overview that sets the scene.",
    content: "This is a core lesson content section. Explain clearly with examples suitable for the class level.",
    summary: "This is a lesson summary section. Recap the key points concisely.",
    induction: "This is a lesson induction section. Use it to spark curiosity or connect to prior knowledge.",
    evaluation: "This is a lesson evaluation section. Describe or prompt the student to reflect on what they learnt.",
};

function countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length;
}

function trimToWordLimit(value: string, maxWords: number) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    return words.slice(0, maxWords).join(" ");
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function enforceHtmlWordLimit(html: string, maxWords?: number) {
    if (!maxWords || maxWords < 1) return html;

    const paragraphMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
    const paragraphs = (paragraphMatches.length > 0
        ? paragraphMatches.map((match) => match[1])
        : [html]
    )
        .map((paragraph) => paragraph.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        .filter(Boolean);

    let remainingWords = maxWords;
    const limitedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
        if (remainingWords <= 0) break;

        const wordCount = countWords(paragraph);
        if (wordCount <= remainingWords) {
            limitedParagraphs.push(paragraph);
            remainingWords -= wordCount;
            continue;
        }

        limitedParagraphs.push(trimToWordLimit(paragraph, remainingWords));
        remainingWords = 0;
    }

    const fallbackParagraph = trimToWordLimit(
        html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        maxWords,
    );

    const finalParagraphs = (limitedParagraphs.length > 0 ? limitedParagraphs : [fallbackParagraph]).filter(Boolean);
    return finalParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
}

function getDefaultPrompt(lessonSection?: string) {
    switch (lessonSection) {
        case "introduction":
            return "Write a short, classroom-ready lesson introduction that sets the scene, connects to what students already know, and prepares them for the main lesson.";
        case "summary":
            return "Write a concise lesson summary that reinforces the main ideas students should leave with.";
        case "induction":
            return "Write a short induction text that sparks curiosity and activates students' prior knowledge for the lesson.";
        case "evaluation":
            return "Write a short evaluation prompt that helps students reflect on or show what they learnt.";
        case "content":
            return "Write clear lesson content that explains the key idea with examples suitable for the class level.";
        default:
            return "";
    }
}

async function callOpenRouter(
    messages: object[],
    model: string,
    timeoutMs = 30000,
    maxTokens = 600,
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics Lesson Generator",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.55 }),
        signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content ?? "";
}

async function generateWithFallback(messages: object[], maxTokens = 600): Promise<string> {
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
            console.warn(`[lessons/generate-text-block] Model ${model} failed:`, err);
            lastError = err;
        }
    }

    throw lastError;
}

// POST /api/lessons/generate-text-block
// Body: { prompt?, lessonSection?, lessonTitle?, subjectName?, className?, sowWeekContent?, sowObjectives?, referenceMaterials?, minWords?, maxWords? }
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const {
            prompt,
            lessonSection,
            lessonTitle,
            subjectName,
            className,
            sowWeekContent,
            sowObjectives,
            referenceMaterials,
            minWords,
            maxWords,
        } = body as {
            prompt?: string;
            lessonSection?: string;
            lessonTitle?: string;
            subjectName?: string;
            className?: string;
            sowWeekContent?: string;
            sowObjectives?: string;
            referenceMaterials?: ReferenceMaterialPromptInput[];
            minWords?: number;
            maxWords?: number;
        };

        const trimmedPrompt = prompt?.trim() || getDefaultPrompt(lessonSection);
        if (!trimmedPrompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const contextLines: string[] = [];
        if (subjectName) contextLines.push(`Subject: ${subjectName}`);
        if (className) contextLines.push(`Class level: ${className}`);
        if (lessonTitle) contextLines.push(`Lesson title: ${lessonTitle}`);
        if (sowWeekContent) contextLines.push(`Week topic/content: ${sowWeekContent}`);
        if (sowObjectives) contextLines.push(`Learning objectives:\n${sowObjectives}`);

        const sectionHint = lessonSection ? SECTION_CONTEXT[lessonSection] ?? "" : "";
        const contextBlock = contextLines.length > 0
            ? `\nLesson context:\n${contextLines.join("\n")}`
            : "";
        const referenceBlock = await buildReferenceMaterialsBlock(referenceMaterials);

        const systemMsg =
            "You are an experienced Nigerian secondary school teacher writing clear, engaging lesson content. " +
            "Write in plain educational prose with no markdown, bullet points, or headings. " +
            "Wrap each paragraph in <p> tags and nothing else. " +
            "Produce 2 to 4 focused paragraphs unless told otherwise.";

        const userMsg =
            `Write lesson block content for the following request:\n${trimmedPrompt}` +
            `${contextBlock}` +
            `${referenceBlock}` +
            (sectionHint ? `\n\nSection guidance: ${sectionHint}` : "") +
            "\n\nUse the saved lesson reference materials when they add helpful detail. " +
            "Do not mention file names, URLs, or source labels directly." +
            (typeof minWords === "number" && minWords > 0
                ? typeof maxWords === "number" && maxWords >= minWords
                    ? `\n\nTarget a response between ${minWords} and ${maxWords} words.`
                    : `\n\nWrite at least ${minWords} words.`
                : "") +
            (typeof maxWords === "number" && maxWords > 0
                ? `\n\nKeep the full response to no more than ${maxWords} words.`
                : "") +
            "\n\nOutput only the <p>...</p> paragraphs with no labels or extra commentary.";

        let raw = await generateWithFallback(
            [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
            ],
            700,
        );

        const firstPassWordCount = countWords(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
        if (typeof minWords === "number" && minWords > 0 && firstPassWordCount < minWords) {
            raw = await generateWithFallback(
                [
                    { role: "system", content: systemMsg },
                    { role: "user", content: `${userMsg}\n\nYour response was too short. Rewrite it with at least ${minWords} words while keeping every other instruction.` },
                ],
                700,
            );
        }

        const text = raw.trim();
        if (!text) {
            return NextResponse.json({ error: "AI returned empty response. Please try again." }, { status: 502 });
        }

        const html = text.startsWith("<p")
            ? text
            : text.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.trim()}</p>`).join("\n");

        return NextResponse.json({ html: enforceHtmlWordLimit(html, maxWords) });
    } catch (error: any) {
        console.error("[lessons/generate-text-block] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
    }
}
