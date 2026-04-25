import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

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

async function callOpenRouter(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics YouTube Search",
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 50,
            temperature: 0.4,
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() ?? "";
}

async function generateSearchQuery(topic: string, subject: string): Promise<string> {
    const prompt = `YouTube search query for an educational video: ${subject} — ${topic}. Return ONLY the query (max 10 words, no quotes).`;
    // Ultra-simple task (50 tokens) — cheapest paid models are sufficient
    const models = [
        "mistralai/mistral-nemo",             // $0.02/$0.04
        "meta-llama/llama-3.1-8b-instruct",  // $0.02/$0.05 — fallback
    ];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await callOpenRouter(prompt, model);
        } catch (err) {
            lastError = err;
        }
    }
    // Fallback: build a decent query from the topic itself
    return `${subject} ${topic} educational video`.slice(0, 100);
}

async function searchYouTube(query: string, apiKey: string): Promise<object[]> {
    const params = new URLSearchParams({
        key: apiKey,
        q: query,
        type: "video",
        part: "snippet",
        maxResults: "6",
        videoEmbeddable: "true",
        relevanceLanguage: "en",
        safeSearch: "strict",
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = await res.json();

    return (data.items || []).map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        channelTitle: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        publishedAt: item.snippet?.publishedAt,
    })).filter((v: any) => v.videoId);
}

// POST /api/scheme-of-work/weeks/[id]/search-youtube
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(id, user.id, user.schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const subjectName = (sow as any).subject?.name ?? "the subject";

        // Step 1: Generate optimal search query with AI
        const searchQuery = await generateSearchQuery(week.topic, subjectName);

        // Step 2: Search YouTube
        // Uses YOUTUBE_API_KEY — requires YouTube Data API v3 enabled in Google Cloud Console.
        // (Different from NEXT_PUBLIC_GOOGLE_API_KEY which is for Drive/Picker only.)
        const youtubeApiKey = process.env.YOUTUBE_API_KEY;
        if (!youtubeApiKey) {
            return NextResponse.json({ searchQuery, videos: [], noApiKey: true });
        }

        let videos: object[] = [];
        try {
            videos = await searchYouTube(searchQuery, youtubeApiKey);
        } catch (ytError: any) {
            console.error("[search-youtube] YouTube API error:", ytError?.message ?? ytError);
            return NextResponse.json({ searchQuery, videos: [], youtubeError: true });
        }

        return NextResponse.json({ searchQuery, videos });
    } catch (error: any) {
        console.error("[search-youtube] POST error:", error);
        return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
    }
}
