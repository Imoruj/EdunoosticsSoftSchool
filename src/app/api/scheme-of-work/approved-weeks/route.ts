import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SowStatus } from "@prisma/client";

// GET /api/scheme-of-work/approved-weeks?subjectId=xxx
// Returns all weeks from APPROVED SOWs for a given subject in the teacher's school.
// Used to populate the week picker in the Lesson editor.
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

        const weeks = await prisma.schemeOfWorkWeek.findMany({
            where: {
                schemeOfWorkTerm: {
                    schemeOfWork: {
                        schoolId,
                        subjectId,
                        ...(classId ? { classId } : {}),
                        status: SowStatus.APPROVED,
                    },
                },
            },
            include: {
                schemeOfWorkTerm: {
                    include: {
                        term: { select: { name: true, termNumber: true } },
                        schemeOfWork: {
                            select: {
                                id: true,
                                title: true,
                                class: { select: { id: true, name: true } },
                                session: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
                sdgMappings: {
                    where: { approved: true },
                    select: { sdgNumber: true },
                },
            },
            orderBy: [
                { schemeOfWorkTerm: { termNumber: "asc" } },
                { weekNumber: "asc" },
            ],
        });

        const result = weeks.map((w) => ({
            weekId: w.id,
            weekNumber: w.weekNumber,
            topic: w.topic,
            content: w.content,
            objectives: w.objectives,
            waecObjectives: w.waecObjectives,
            jambObjectives: w.jambObjectives,
            igcseObjectives: w.igcseObjectives,
            sdgNumbers: w.sdgMappings.map((s) => s.sdgNumber),
            sowId: w.schemeOfWorkTerm.schemeOfWork.id,
            sowTitle: w.schemeOfWorkTerm.schemeOfWork.title,
            termName: w.schemeOfWorkTerm.term.name || `Term ${w.schemeOfWorkTerm.termNumber}`,
            termNumber: w.schemeOfWorkTerm.termNumber,
            className: w.schemeOfWorkTerm.schemeOfWork.class.name,
            sessionName: w.schemeOfWorkTerm.schemeOfWork.session.name,
        }));

        return NextResponse.json({ weeks: result });
    } catch (error) {
        console.error("[SOW approved-weeks] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch SOW weeks" }, { status: 500 });
    }
}
