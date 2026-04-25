import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { extractSdgNumbersFromModelOutput } from "@/lib/aiJson";

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

async function callOpenRouter(messages: object[], model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics SOW SDG Mapper",
        },
        body: JSON.stringify({ model, messages, max_tokens: 80, temperature: 0.3 }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content ?? "";
}

async function generateWithFallback(messages: object[]): Promise<string> {
    // Simple classification (80 tokens) — cheapest paid models are sufficient
    const models = [
        "mistralai/mistral-nemo",             // $0.02/$0.04
        "meta-llama/llama-3.1-8b-instruct",  // $0.02/$0.05 — fallback
    ];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await callOpenRouter(messages, model);
        } catch (err) {
            console.warn(`[SOW suggest-sdgs] Model ${model} failed:`, err);
            lastError = err;
        }
    }
    throw lastError;
}

// POST /api/scheme-of-work/weeks/[id]/suggest-sdgs
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { id: weekId } = await params;
        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(weekId, user.id, user.schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!isAdmin && sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Cannot edit a submitted or approved scheme of work" }, { status: 409 });
        }

        const subjectName = (sow as any).subject?.name ?? "the subject";

        const prompt = `Map this lesson to the 1-4 most relevant UN SDGs. Only include SDGs that are genuinely relevant — do not force SDG 4 if the lesson does not directly address learning quality or access to education.
Subject: ${subjectName} | Topic: ${week.topic}
Objectives: ${week.objectives || week.content || "N/A"}
SDGs: 1-Poverty 2-Hunger 3-Health 4-Quality Education 5-Gender Equality 6-Clean Water 7-Clean Energy 8-Decent Work 9-Industry & Innovation 10-Reduced Inequalities 11-Sustainable Cities 12-Responsible Consumption 13-Climate Action 14-Life Below Water 15-Life On Land 16-Peace & Justice 17-Partnerships
Respond ONLY with JSON: {"sdgNumbers":[4,8]}`;

        const raw = await generateWithFallback([{ role: "user", content: prompt }]);

        const sdgNumbers = extractSdgNumbersFromModelOutput(raw);
        if (sdgNumbers.length === 0) {
            console.warn("[SOW suggest-sdgs] Unable to parse AI response:", raw.slice(0, 500));
            return NextResponse.json({ sdgNumbers: [4], fallback: true });
        }

        return NextResponse.json({
            sdgNumbers: Array.from(new Set(sdgNumbers))
                .filter((n) => n >= 1 && n <= 17)
                .sort((a, b) => a - b)
                .slice(0, 5),
        });
    } catch (error: any) {
        console.error("[SOW suggest-sdgs] POST error:", error);
        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "AI suggestion failed. Please try again." }, { status: 500 });
    }
}
