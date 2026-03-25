import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const SUPPORTED_VOICES = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"] as const;

// ── Rewrite bullet-point slide text into natural teacher narration ─────────────
async function rewriteAsTeacherNarration(rawScript: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return rawScript;

    const models = [
        "google/gemini-2.5-flash-lite",
        "meta-llama/llama-3.3-70b-instruct",
        "mistralai/mistral-small-3.1-24b-instruct",
    ];

    const systemMsg =
        "You are an experienced Nigerian secondary school teacher. Write a SHORT spoken introduction for a lesson — 2 to 3 sentences maximum. Speak directly and naturally to students. Use simple, clear language. Do NOT use bullet points, markdown, or headers. Do NOT narrate the whole lesson — just give a brief, engaging overview.";
    const userMsg =
        `Write a short spoken lesson introduction (2–3 sentences, no more than 120 words) based on this lesson info. Speak directly to the students.\n\nLesson info:\n${rawScript}\n\nOutput only the narration — no labels, no formatting.`;

    for (const model of models) {
        try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
                    "X-Title": "EduNostics Lesson Narration",
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemMsg },
                        { role: "user", content: userMsg },
                    ],
                    max_tokens: 175,
                    temperature: 0.65,
                }),
                signal: AbortSignal.timeout(25000),
            });
            if (!res.ok) continue;
            const data = await res.json();
            const text = (data.choices[0]?.message?.content ?? "").trim();
            if (text) return text.slice(0, 670); // hard cap at 670 chars
        } catch {
            // try next model
        }
    }
    return rawScript; // fallback to original text if all models fail
}

type VoiceName = (typeof SUPPORTED_VOICES)[number];

function isValidVoice(value: unknown): value is VoiceName {
    return typeof value === "string" && (SUPPORTED_VOICES as readonly string[]).includes(value);
}

function buildWavBuffer(
    pcmData: Buffer,
    sampleRate = 24000,
    channels = 1,
    bitDepth = 16,
): Buffer {
    const dataSize = pcmData.length;
    const wav = Buffer.alloc(44 + dataSize);

    wav.write("RIFF", 0, "ascii");
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8, "ascii");

    wav.write("fmt ", 12, "ascii");
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(channels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    wav.writeUInt16LE(channels * (bitDepth / 8), 32);
    wav.writeUInt16LE(bitDepth, 34);

    wav.write("data", 36, "ascii");
    wav.writeUInt32LE(dataSize, 40);
    pcmData.copy(wav, 44);

    return wav;
}

async function callGeminiAudio(
    script: string,
    voiceName: VoiceName,
    apiKey: string,
): Promise<{ buffer: Buffer; mimeType: string; extension: string; fileName: string }> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                model: GEMINI_TTS_MODEL,
                contents: [{ parts: [{ text: script }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName },
                        },
                    },
                },
            }),
            signal: AbortSignal.timeout(90000),
        },
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini Audio ${res.status}: ${errBody.slice(0, 500)}`);
    }

    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.[0];

    if (!part?.inlineData?.data) {
        throw new Error("Gemini returned no audio data");
    }

    const rawBuffer = Buffer.from(part.inlineData.data, "base64");
    const mimeType = String(part.inlineData.mimeType ?? "").toLowerCase();

    if (mimeType.includes("l16") || mimeType.includes("pcm")) {
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        return {
            buffer: buildWavBuffer(rawBuffer, sampleRate),
            mimeType: "audio/wav",
            extension: ".wav",
            fileName: "ai-generated-audio.wav",
        };
    }

    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
        return {
            buffer: rawBuffer,
            mimeType: "audio/mpeg",
            extension: ".mp3",
            fileName: "ai-generated-audio.mp3",
        };
    }

    return {
        buffer: rawBuffer,
        mimeType: "audio/wav",
        extension: ".wav",
        fileName: "ai-generated-audio.wav",
    };
}

// POST /api/lessons/generate-audio
// Body: { script, voiceName? }
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Audio generation not configured" }, { status: 503 });
        }

        const body = await req.json().catch(() => ({}));
        const { script, voiceName: rawVoice } = body as {
            script: string;
            voiceName?: string;
        };

        if (!script?.trim()) {
            return NextResponse.json({ error: "Script is required" }, { status: 400 });
        }

        if (script.trim().length > 1000) {
            return NextResponse.json({ error: "Script must be 1000 characters or less" }, { status: 400 });
        }

        const voiceName: VoiceName = isValidVoice(rawVoice) ? rawVoice : "Aoede";
        // Convert raw slide text (bullet points) into natural teacher speech first
        const narrationScript = await rewriteAsTeacherNarration(script.trim());
        const audio = await callGeminiAudio(narrationScript, voiceName, apiKey);
        const storedName = `lesson-audio-ai-${user.id}-${randomUUID()}${audio.extension}`;

        const uploaded = await prisma.uploadedFile.create({
            data: {
                schoolId: user.schoolId ?? null,
                uploadedById: user.id,
                uploadType: "lesson_audio",
                originalName: audio.fileName,
                storedName,
                mimeType: audio.mimeType,
                extension: audio.extension,
                size: audio.buffer.length,
                data: audio.buffer,
            },
            select: { id: true },
        });

        return NextResponse.json({
            url: `/api/uploads/${uploaded.id}`,
            fileName: audio.fileName,
            fileType: audio.mimeType,
        });
    } catch (error: any) {
        console.error("[lessons/generate-audio] POST error:", error);

        const msg: string = error?.message ?? "";
        if (msg.includes("not configured")) {
            return NextResponse.json({ error: "Audio generation not configured" }, { status: 503 });
        }
        if (msg.includes("429")) {
            return NextResponse.json({ error: "Audio generation rate limit reached. Please try again." }, { status: 429 });
        }
        if (msg.includes("400") || msg.includes("404")) {
            return NextResponse.json({ error: "Audio generation model is unavailable right now. Please try again." }, { status: 502 });
        }
        return NextResponse.json({ error: "Audio generation failed. Please try again." }, { status: 500 });
    }
}

