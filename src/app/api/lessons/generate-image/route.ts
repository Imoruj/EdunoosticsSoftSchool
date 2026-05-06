import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { buildReferenceMaterialsBlock, type ReferenceMaterialPromptInput } from "@/lib/lessons/referenceMaterialPrompt";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function callImagen3(
    prompt: string,
    apiKey: string,
): Promise<{ data: Buffer; mimeType: string }> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1, aspectRatio: "16:9" },
            }),
            signal: AbortSignal.timeout(60000),
        },
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Imagen3 ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = await res.json();
    const prediction = json.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
        throw new Error("Imagen3 returned no image data");
    }

    return {
        data: Buffer.from(prediction.bytesBase64Encoded, "base64"),
        mimeType: prediction.mimeType || "image/png",
    };
}

// POST /api/lessons/generate-image
// Body: { prompt, lessonTitle?, subjectName?, className?, referenceMaterials? }
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Image generation not configured" }, { status: 503 });
        }

        const body = await req.json().catch(() => ({}));
        const { prompt, lessonTitle, subjectName, className, referenceMaterials } = body as {
            prompt: string;
            lessonTitle?: string;
            subjectName?: string;
            className?: string;
            referenceMaterials?: ReferenceMaterialPromptInput[];
        };

        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        if (prompt.trim().length > 800) {
            return NextResponse.json({ error: "Prompt must be 800 characters or less" }, { status: 400 });
        }

        // Build an education-contextualised prompt
        const contextParts: string[] = [];
        if (subjectName) contextParts.push(`subject: ${subjectName}`);
        if (className) contextParts.push(`class: ${className}`);
        if (lessonTitle) contextParts.push(`lesson: ${lessonTitle}`);
        const referenceBlock = await buildReferenceMaterialsBlock(referenceMaterials, {
            heading: "Reference materials for this lesson image:",
            excerptLength: 500,
            maxItems: 4,
        });

        const enrichedPrompt = contextParts.length > 0
            ? `Educational illustration for a Nigerian secondary school lesson (${contextParts.join(", ")}). ${prompt.trim()}. Clean, clear, school-appropriate diagram or illustration.${referenceBlock ? ` Use this reference context when helpful:\n${referenceBlock}` : ""}`
            : `Educational illustration for a Nigerian secondary school lesson. ${prompt.trim()}. Clean, clear, school-appropriate diagram or illustration.${referenceBlock ? ` Use this reference context when helpful:\n${referenceBlock}` : ""}`;

        const { data: imageBuffer, mimeType } = await callImagen3(enrichedPrompt, apiKey);

        const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? ".jpg" : ".png";
        const storedName = `lesson-ai-${user.id}-${randomUUID()}${ext}`;

        const uploaded = await prisma.uploadedFile.create({
            data: {
                schoolId: schoolId ?? null,
                uploadedById: user.id,
                uploadType: "lesson_image",
                originalName: `ai-generated-image${ext}`,
                storedName,
                mimeType,
                extension: ext,
                size: imageBuffer.length,
                data: imageBuffer,
            },
            select: { id: true },
        });

        return NextResponse.json({ url: `/api/uploads/${uploaded.id}` });
    } catch (error: any) {
        console.error("[lessons/generate-image] POST error:", error);

        const msg: string = error?.message ?? "";

        if (msg.includes("not configured")) {
            return NextResponse.json({ error: "Image generation not configured" }, { status: 503 });
        }
        if (msg.includes("Imagen3 4") || msg.toLowerCase().includes("safety") || msg.toLowerCase().includes("block")) {
            return NextResponse.json(
                { error: "Image could not be generated. Try adjusting your prompt." },
                { status: 422 },
            );
        }
        return NextResponse.json({ error: "Image generation failed. Please try again." }, { status: 500 });
    }
}

