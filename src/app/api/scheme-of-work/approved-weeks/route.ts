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

// GET /api/scheme-of-work/approved-weeks?subjectId=xxx[&classId=xxx]
// Returns the APPROVED snapshot of weeks for lesson building.
// Per-term approval: reads from approvedSnapshot (frozen at approval time).
// Backward-compat: terms approved before snapshots existed fall back to live data.
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

        // Fetch all APPROVED terms for this subject/school
        const approvedTerms = await prisma.schemeOfWorkTerm.findMany({
            where: {
                status: SowStatus.APPROVED,
                schemeOfWork: {
                    schoolId,
                    subjectId,
                    ...(classId ? { classId } : {}),
                },
            },
            include: {
                term: { select: { name: true, termNumber: true } },
                schemeOfWork: {
                    select: {
                        id: true,
                        title: true,
                        class: { select: { id: true, name: true } },
                        session: { select: { id: true, name: true, startDate: true } },
                    },
                },
                // Live weeks — used only when no snapshot exists (backward compat)
                weeks: {
                    orderBy: { weekNumber: "asc" },
                    include: {
                        references: { orderBy: { sortOrder: "asc" } },
                        sdgMappings: { where: { approved: true }, select: { sdgNumber: true } },
                    },
                },
            },
            orderBy: [{ termNumber: "asc" }],
        });

        const result: object[] = [];

        for (const term of approvedTerms) {
            const sowMeta = {
                sowId: term.schemeOfWork.id,
                sowTitle: term.schemeOfWork.title,
                termName: term.term.name || `Term ${term.termNumber}`,
                termNumber: term.termNumber,
                termId: term.id,
                className: term.schemeOfWork.class.name,
                sessionName: term.schemeOfWork.session.name,
                approvedAt: term.approvedAt?.toISOString() ?? null,
            };

            if (term.approvedSnapshot) {
                // New flow: use the frozen snapshot taken at approval time
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
                // Backward-compat: no snapshot — read live week data
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
                        sdgNumbers: w.sdgMappings.map((s) => s.sdgNumber),
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
