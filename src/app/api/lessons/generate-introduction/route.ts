import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { buildReferenceMaterialsBlock, type ReferenceMaterialPromptInput } from "@/lib/lessons/referenceMaterialPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IntroductionImagePayload {
    title?: string;
    caption?: string;
    alt?: string;
    keywords?: string[];
    accent?: string;
}

interface IntroductionAudioPayload {
    title?: string;
    script?: string;
    caption?: string;
    voiceHint?: string;
}

interface IntroductionResult {
    text?: string;
    image?: IntroductionImagePayload | null;
    audio?: IntroductionAudioPayload | null;
}

function compactText(value: string, maxLength: number) {
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeText(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function trimToWordLimit(value: string, maxWords: number) {
    const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    return words.slice(0, maxWords).join(" ");
}

function parseJsonFromRaw(raw: string): unknown {
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    try {
        return JSON.parse(stripped);
    } catch {
        const objMatch = stripped.match(/\{[\s\S]*\}/);
        if (objMatch) {
            try {
                return JSON.parse(objMatch[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

async function callOpenRouter(messages: object[], model: string, timeoutMs = 30000, maxTokens = 1400): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics Lesson Introduction Generator",
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

async function generateWithFallback(messages: object[], maxTokens = 1400): Promise<string> {
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
            console.warn(`[lessons/generate-introduction] Model ${model} failed:`, err);
            lastError = err;
        }
    }

    throw lastError;
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildIllustrationDataUrl(image: IntroductionImagePayload, subjectName: string, lessonTitle: string) {
    const title = escapeXml(normalizeText(image.title, lessonTitle).slice(0, 48));
    const caption = escapeXml(normalizeText(image.caption, subjectName).slice(0, 72));
    const accent = escapeXml(normalizeText(image.accent, subjectName).slice(0, 28));
    const keywords = Array.isArray(image.keywords)
        ? image.keywords.map((keyword) => escapeXml(normalizeText(keyword))).filter(Boolean).slice(0, 3)
        : [];
    const chips = (keywords.length > 0 ? keywords : [accent || subjectName, "real life", "lesson"]).slice(0, 3);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" role="img" aria-label="${escapeXml(normalizeText(image.alt, `${lessonTitle} illustration`))}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe" />
      <stop offset="55%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#ede9fe" />
    </linearGradient>
  </defs>
  <rect width="1200" height="720" rx="36" fill="url(#bg)" />
  <circle cx="210" cy="170" r="96" fill="#bae6fd" opacity="0.85" />
  <circle cx="980" cy="140" r="80" fill="#c4b5fd" opacity="0.7" />
  <circle cx="1020" cy="560" r="120" fill="#bfdbfe" opacity="0.65" />
  <rect x="96" y="96" width="1008" height="528" rx="32" fill="#ffffff" stroke="#dbeafe" stroke-width="4" />
  <rect x="140" y="146" width="380" height="316" rx="28" fill="#eff6ff" stroke="#bfdbfe" stroke-width="3" />
  <rect x="192" y="194" width="276" height="52" rx="16" fill="#dbeafe" />
  <rect x="192" y="268" width="224" height="30" rx="15" fill="#bfdbfe" />
  <rect x="192" y="320" width="248" height="30" rx="15" fill="#c4b5fd" />
  <rect x="192" y="372" width="190" height="30" rx="15" fill="#ddd6fe" />
  <rect x="580" y="158" width="410" height="54" rx="18" fill="#0f172a" opacity="0.94" />
  <text x="612" y="192" font-size="28" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff" font-weight="700">${title}</text>
  <text x="580" y="274" font-size="58" font-family="Segoe UI, Arial, sans-serif" fill="#0f172a" font-weight="700">${escapeXml(accent || "Lesson Intro")}</text>
  <text x="580" y="332" font-size="28" font-family="Segoe UI, Arial, sans-serif" fill="#475569">${caption}</text>
  <rect x="580" y="396" width="340" height="122" rx="24" fill="#f8fafc" stroke="#e2e8f0" stroke-width="3" />
  <text x="612" y="442" font-size="24" font-family="Segoe UI, Arial, sans-serif" fill="#1e293b" font-weight="600">${escapeXml(subjectName)}</text>
  <text x="612" y="482" font-size="22" font-family="Segoe UI, Arial, sans-serif" fill="#64748b">Real-world hook for students</text>
  ${chips.map((chip, index) => `
    <rect x="${580 + index * 136}" y="560" width="120" height="42" rx="21" fill="${index === 0 ? "#2563eb" : index === 1 ? "#7c3aed" : "#0f766e"}" opacity="0.92" />
    <text x="${640 + index * 136}" y="587" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff" font-weight="600">${chip}</text>
  `).join("")}
</svg>`.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// POST /api/lessons/generate-introduction
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const {
            subjectId,
            lessonTitle,
            priorKnowledge,
            lessonDescription,
            weekContent,
            objectives,
            className,
            includeImage,
            audioMode,
            referenceMaterials,
        } = body as {
            subjectId?: string;
            lessonTitle?: string;
            priorKnowledge?: string;
            lessonDescription?: string;
            weekContent?: string;
            objectives?: string;
            className?: string;
            includeImage?: boolean;
            audioMode?: "none" | "generated" | "upload";
            referenceMaterials?: ReferenceMaterialPromptInput[];
        };

        let subjectName = "the subject";
        if (subjectId) {
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true },
            });
            if (subject?.name) subjectName = subject.name;
        }

        const topic = normalizeText(lessonTitle, "the lesson topic");
        const classBlock = normalizeText(className) ? ` for ${normalizeText(className)} students` : "";
        const priorKnowledgeBlock = normalizeText(priorKnowledge)
            ? `\nPrior knowledge students already have:\n${compactText(normalizeText(priorKnowledge), 700)}`
            : "";
        const descriptionBlock = normalizeText(lessonDescription)
            ? `\nTeacher lesson description:\n${compactText(normalizeText(lessonDescription), 500)}`
            : "";
        const contentBlock = normalizeText(weekContent)
            ? `\nLesson content to introduce:\n${compactText(normalizeText(weekContent), 900)}`
            : "";
        const objectivesBlock = normalizeText(objectives)
            ? `\nObjectives to point toward:\n${compactText(normalizeText(objectives), 700)}`
            : "";
        const referenceBlock = await buildReferenceMaterialsBlock(referenceMaterials, {
            heading: "Reference materials selected for this lesson introduction:",
            excerptLength: 800,
        });

        const systemMsg = "You are an experienced Nigerian secondary school teacher. Return only valid JSON. The introduction must be simple, relatable, and designed to prepare students' minds for the lesson before deeper teaching begins.";
        const userMsg = `Create a lesson introduction package for ${subjectName}${classBlock}.
Topic: ${topic}${priorKnowledgeBlock}${descriptionBlock}${contentBlock}${objectivesBlock}
${referenceBlock}

RULES:
- The text introduction is mandatory
- The text should read like a slide outline, not full prose
- Use 3 to 5 very short outline lines in plain classroom-ready language
- Keep the text introduction to 60 words or fewer
- Keep it simple, warm, and confidence-building
- Use everyday real-world situations when helpful
- Connect prior knowledge to the lesson topic
- Do not jump into advanced explanation yet
- ${includeImage ? "Include an illustration concept that visually supports the topic." : "Set image to null."}
- ${audioMode === "generated"
                ? "Include a short spoken narration script suitable for AI voice playback, and keep it between 150 and 220 words."
                : audioMode === "upload"
                    ? "Include a short narration script to guide the teacher's audio upload, and keep it between 150 and 220 words."
                    : "Set audio to null."}
- Use the saved lesson references when they add helpful detail
- Do not mention file names, URLs, or source labels directly

Return only JSON in this shape:
{
  "text": "plain introduction text",
  "image": {
    "title": "short illustration title",
    "caption": "short image caption",
    "alt": "accessible alt text",
    "keywords": ["keyword 1", "keyword 2", "keyword 3"],
    "accent": "short accent phrase"
  } | null,
  "audio": {
    "title": "short narration title",
    "script": "short spoken narration script",
    "caption": "short audio caption",
    "voiceHint": "warm clear teacher voice"
  } | null
}`;

        const raw = await generateWithFallback(
            [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
            ],
            1400,
        );

        const parsed = parseJsonFromRaw(raw) as IntroductionResult | null;
        if (!parsed?.text || typeof parsed.text !== "string") {
            console.warn("[lessons/generate-introduction] Bad AI response:", raw.slice(0, 500));
            return NextResponse.json({ error: "AI returned an invalid response. Please try again." }, { status: 502 });
        }

        const imagePayload = includeImage && parsed.image
            ? {
                title: normalizeText(parsed.image.title, "Lesson illustration"),
                caption: normalizeText(parsed.image.caption, "Visual introduction"),
                alt: normalizeText(parsed.image.alt, `${topic} illustration`),
                keywords: Array.isArray(parsed.image.keywords)
                    ? parsed.image.keywords.map((keyword) => normalizeText(keyword)).filter(Boolean).slice(0, 3)
                    : [],
                accent: normalizeText(parsed.image.accent, topic),
              }
            : null;

        const audioPayload = audioMode !== "none" && parsed.audio
            ? {
                title: normalizeText(parsed.audio.title, "Lesson narration"),
                script: trimToWordLimit(normalizeText(parsed.audio.script, parsed.text), 220),
                caption: normalizeText(parsed.audio.caption, "Audio support for the lesson introduction"),
                voiceHint: normalizeText(parsed.audio.voiceHint, "warm clear teacher voice"),
              }
            : null;

        return NextResponse.json({
            text: trimToWordLimit(parsed.text.trim(), 60),
            image: imagePayload
                ? {
                    ...imagePayload,
                    dataUrl: buildIllustrationDataUrl(imagePayload, subjectName, topic),
                  }
                : null,
            audio: audioPayload,
        });
    } catch (error: any) {
        console.error("[lessons/generate-introduction] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "Introduction generation failed. Please try again." }, { status: 500 });
    }
}
