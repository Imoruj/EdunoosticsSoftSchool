
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

function getConfiguredAiProvider(): "openrouter" | "gemini" {
    if (process.env.OPENROUTER_API_KEY) return "openrouter";
    if (process.env.GOOGLE_AI_API_KEY) return "gemini";
    return "openrouter";
}

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }

        let aiSettings = await prisma.aiSettings.findUnique({
            where: { schoolId }
        });

        if (!aiSettings) {
            aiSettings = await prisma.aiSettings.create({
                data: { schoolId }
            });
        }

        return NextResponse.json(aiSettings);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch AI settings" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Debug endpoint to check AI provider configuration
        const provider = getConfiguredAiProvider();
        const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
        const hasGeminiKey = !!process.env.GOOGLE_AI_API_KEY;

        return NextResponse.json({
            provider,
            hasOpenRouterKey,
            hasGeminiKey,
            models: provider === "gemini"
                ? ["gemini-2.0-flash", "gemini-1.5-flash"]
                : ["deepseek-ai/deepseek-r1", "google/gemini-2.0-flash-lite-001", "google/gemini-2.0-flash-001", "google/gemini-flash-1.5-8b", "google/gemini-flash-1.5", "meta-llama/llama-3.1-8b-instruct:free"]
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to check AI configuration" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }
        const body = await req.json();

        const updated = await prisma.aiSettings.upsert({
            where: { schoolId },
            update: {
                teacherPrompt: body.teacherPrompt,
                principalPrompt: body.principalPrompt,
                useMultiAgentComments: body.useMultiAgentComments,
                commentConfig: body.commentConfig,
            },
            create: {
                schoolId,
                teacherPrompt: body.teacherPrompt,
                principalPrompt: body.principalPrompt,
                useMultiAgentComments: body.useMultiAgentComments ?? false,
                commentConfig: body.commentConfig,
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
    }
}

