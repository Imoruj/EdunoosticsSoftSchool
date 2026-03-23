import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SowStatus } from "@prisma/client";

interface SnapshotWeek {
    weekId: string;
    weekNumber: number;
    topic: string;
    content: string | null;
    objectives: string | null;
    waecObjectives: string | null;
    jambObjectives: string | null;
    igcseObjectives: string | null;
    objectiveSegments: unknown;
    references: Array<{
        id: string; type: string; title: string;
        url: string | null; fileKey: string | null;
        description: string | null; sortOrder: number;
    }>;
    sdgNumbers: number[];
}

const TERM_INCLUDE = {
    term: { select: { name: true, termNumber: true } },
    schemeOfWork: {
        select: {
            id: true, title: true,
            class: { select: { id: true, name: true } },
            session: { select: { id: true, name: true } },
        },
    },
    weeks: {
        orderBy: { weekNumber: "asc" as const },
        include: {
            references: { orderBy: { sortOrder: "asc" as const } },
            sdgMappings: { where: { approved: true }, select: { sdgNumber: true } },
        },
    },
} as const;

// GET /api/scheme-of-work/approved-weeks?subjectId=xxx[&classId=xxx]
// Returns the APPROVED snapshot of weeks for lesson building.
// Per-term approval: reads from approvedSnapshot (frozen at approval time).
// Fallback: if per-term status column unavailable, falls back to SOW-level status.
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId as string | undefined;
        if (!schoolId) return NextResponse.json({ error: "No school associated" }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");
        if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
        const classId = searchParams.get("classId") || undefined;

        const sowWhere = { schoolId, subjectId, ...(classId ? { classId } : {}) };

        // Try per-term status first; fall back to SOW-level status if column doesn't exist yet
        let approvedTerms: any[];
        try {
            approvedTerms = await prisma.schemeOfWorkTerm.findMany({
                where: { status: SowStatus.APPROVED, schemeOfWork: sowWhere },
                include: TERM_INCLUDE,
                orderBy: [{ termNumber: "asc" }],
            });
        } catch {
            // Fallback for dev servers where the migration hasn't been applied locally yet
            console.warn("[SOW approved-weeks] Per-term status unavailable, falling back to SOW-level status");
            approvedTerms = await prisma.schemeOfWorkTerm.findMany({
                where: { schemeOfWork: { ...sowWhere, status: SowStatus.APPROVED } },
                include: TERM_INCLUDE,
                orderBy: [{ termNumber: "asc" }],
            });
        }

        const result: object[] = [];

        for (const term of approvedTerms) {
            const sowMeta = {
                sowId: term.schemeOfWork.id,
                sowTitle: term.schemeOfWork.title,
                termName: term.term?.name || `Term ${term.termNumber}`,
                termNumber: term.termNumber,
                termId: term.id,
                className: term.schemeOfWork.class.name,
                sessionName: term.schemeOfWork.session.name,
                approvedAt: term.approvedAt ? new Date(term.approvedAt).toISOString() : null,
            };

            if (term.approvedSnapshot) {
                // New flow: use frozen snapshot taken at approval time
                const snapshot = term.approvedSnapshot as unknown as { weeks: SnapshotWeek[] };
                for (const w of snapshot.weeks) {
                    result.push({
                        weekId: w.weekId,
                        weekNumber: w.weekNumber,
                        topic: w.topic,
                        content: w.content,
                        objectives: w.objectives,
                        waecObjectives: w.waecObjectives,
                        jambObjectives: w.jambObjectives,
                        igcseObjectives: w.igcseObjectives,
                        objectiveSegments: w.objectiveSegments ?? null,
                        sdgNumbers: w.sdgNumbers,
                        references: w.references,
                        isFromSnapshot: true,
                        ...sowMeta,
                    });
                }
            } else {
                // Backward-compat: no snapshot yet — read live week data
                for (const w of term.weeks) {
                    result.push({
                        weekId: w.id,
                        weekNumber: w.weekNumber,
                        topic: w.topic,
                        content: w.content,
                        objectives: w.objectives,
                        waecObjectives: w.waecObjectives,
                        jambObjectives: w.jambObjectives,
                        igcseObjectives: w.igcseObjectives,
                        objectiveSegments: w.objectiveSegments ?? null,
                        sdgNumbers: w.sdgMappings.map((s: any) => s.sdgNumber),
                        references: w.references,
                        isFromSnapshot: false,
                        ...sowMeta,
                    });
                }
            }
        }

        return NextResponse.json({ weeks: result });
    } catch (error) {
        console.error("[SOW approved-weeks] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch SOW weeks" }, { status: 500 });
    }
}
