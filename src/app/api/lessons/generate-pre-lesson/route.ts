import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReferenceMaterialInput {
    id: string;
    type: "TEXT" | "IMAGE" | "AUDIO" | "YOUTUBE" | "FILE" | "GOOGLE_DRIVE";
    title: string;
    url?: string;
    fileKey?: string;
    description?: string;
}

async function callOpenRouter(
    messages: object[],
    model: string,
    timeoutMs = 30000,
    maxTokens = 400,
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
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.5 }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices[0]?.message?.content ?? "";
}

async function generateWithFallback(messages: object[], maxTokens = 400): Promise<string> {
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
            console.warn(`[lessons/generate-pre-lesson] Model ${model} failed:`, err);
            lastError = err;
        }
    }
    throw lastError;
}

function parseUploadedFileId(path?: string | null) {
    const match = path?.match(/^\/api\/uploads\/([^/?#]+)/);
    return match?.[1] ?? null;
}

function compactText(value: string, maxLength: number) {
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeReferenceValue(value: string | null | undefined, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

async function extractUploadedReferenceExcerpt(fileId: string) {
    const uploadedFile = await prisma.uploadedFile.findUnique({
        where: { id: fileId },
        select: {
            originalName: true,
            mimeType: true,
            data: true,
        },
    });

    if (!uploadedFile) return null;

    try {
        if (uploadedFile.mimeType.startsWith("text/")) {
            return {
                fileName: uploadedFile.originalName,
                excerpt: compactText(Buffer.from(uploadedFile.data).toString("utf8"), 1200),
            };
        }

        if (uploadedFile.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer: Buffer.from(uploadedFile.data) });
            return {
                fileName: uploadedFile.originalName,
                excerpt: compactText(result.value || "", 1200),
            };
        }

        if (uploadedFile.mimeType === "application/pdf") {
            const { PDFParse } = await import("pdf-parse");
            const parser = new PDFParse({ data: Buffer.from(uploadedFile.data) });
            try {
                const result = await parser.getText();
                return {
                    fileName: uploadedFile.originalName,
                    excerpt: compactText(result.text || "", 1200),
                };
            } finally {
                await parser.destroy().catch(() => undefined);
            }
        }
    } catch (error) {
        console.warn("[lessons/generate-pre-lesson] Failed to extract uploaded reference text:", error);
    }

    return {
        fileName: uploadedFile.originalName,
        excerpt: "",
    };
}

async function buildReferenceMaterialsBlock(referenceMaterials: ReferenceMaterialInput[] | undefined) {
    if (!Array.isArray(referenceMaterials) || referenceMaterials.length === 0) return "";

    const items: string[] = [];

    for (const [index, reference] of referenceMaterials.slice(0, 6).entries()) {
        try {
            const title = normalizeReferenceValue(reference?.title, "Untitled reference");
            const description = normalizeReferenceValue(reference?.description);
            const href = normalizeReferenceValue(reference?.fileKey) || normalizeReferenceValue(reference?.url);
            const type = normalizeReferenceValue(reference?.type, "REFERENCE");
            const lines = [`${index + 1}. ${type}: ${title}`];

            if (description) {
                lines.push(`Note: ${compactText(description, 280)}`);
            }

            if (href && !href.startsWith("/api/uploads/")) {
                lines.push(`Link: ${href}`);
            }

            const uploadedFileId = parseUploadedFileId(href);
            if (uploadedFileId) {
                const uploaded = await extractUploadedReferenceExcerpt(uploadedFileId);
                if (uploaded?.fileName) {
                    lines.push(`Uploaded file: ${uploaded.fileName}`);
                }
                if (uploaded?.excerpt) {
                    lines.push(`File excerpt: ${uploaded.excerpt}`);
                }
            }

            items.push(lines.join("\n"));
        } catch (error) {
            console.warn("[lessons/generate-pre-lesson] Failed to process reference material:", error);
        }
    }

    return items.length > 0
        ? `\nReference materials selected for this lesson:\n${items.join("\n\n")}`
        : "";
}

// POST /api/lessons/generate-pre-lesson
// Body: { field: 'description' | 'priorKnowledge', subjectId?, lessonTitle, weekContent?, generalObjectives?, className?, referenceMaterials? }
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;

        const body = await req.json().catch(() => ({}));
        const { field, subjectId, lessonTitle, weekContent, generalObjectives, className, referenceMaterials } = body as {
            field: string;
            subjectId?: string;
            lessonTitle?: string;
            weekContent?: string;
            generalObjectives?: string;
            className?: string;
            referenceMaterials?: ReferenceMaterialInput[];
        };

        if (field !== "description" && field !== "priorKnowledge") {
            return NextResponse.json({ error: "Invalid field" }, { status: 400 });
        }

        // Resolve subject name if subjectId provided
        let subjectName = "the subject";
        if (subjectId) {
            const subject = await prisma.subject.findFirst({
                where: { id: subjectId, schoolId: user.schoolId },
                select: { name: true },
            });
            if (subject) subjectName = subject.name;
        }

        const topic = lessonTitle?.trim() || "the lesson topic";
        const contentBlock = weekContent?.trim()
            ? `\nWeek content covered:\n${weekContent.trim()}`
            : "";
        const objectivesBlock = generalObjectives?.trim()
            ? `\nLearning objectives:\n${generalObjectives.trim()}`
            : "";
        const classBlock = className?.trim() ? ` for ${className.trim()} students` : "";
        const referenceBlock = await buildReferenceMaterialsBlock(referenceMaterials);

        let systemMsg: string;
        let userMsg: string;

        if (field === "description") {
            systemMsg =
                "You are an experienced Nigerian secondary school teacher. Write clear, professional lesson plan content in plain prose. No bullet points, no markdown, no headings — just well-structured sentences.";
            userMsg =
                `Write a concise lesson description (2–3 sentences) for a ${subjectName} lesson${classBlock}.
Topic: ${topic}${contentBlock}${objectivesBlock}

The description should briefly state what the lesson is about, what students will learn, and why it matters. Write in plain sentences suitable for a lesson plan. Output only the description text — no labels, no bullet points.`;
        } else {
            systemMsg =
                "You are an experienced Nigerian secondary school teacher. Write clear, professional lesson plan content in plain prose. No bullet points, no markdown, no headings — just well-structured sentences.";
            userMsg =
                `Write the prior knowledge requirement (2–3 sentences) for a ${subjectName} lesson${classBlock}.
Topic: ${topic}${contentBlock}${objectivesBlock}

Describe what students should already know or be able to do before this lesson. Be specific to the topic and suitable for this class level. Output only the prior knowledge text — no labels, no bullet points.`;
        }

        if (referenceBlock) {
            userMsg = `${userMsg}

Use this reference material context when it adds helpful detail:
${referenceBlock}

Do not mention URLs, file names, or source labels directly in the response.`;
        }

        const raw = await generateWithFallback(
            [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
            ],
            350,
        );

        const text = raw.trim();
        if (!text) {
            return NextResponse.json({ error: "AI returned empty response. Please try again." }, { status: 502 });
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("[lessons/generate-pre-lesson] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
    }
}
