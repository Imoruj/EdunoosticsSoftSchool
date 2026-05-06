import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { STALE_SCHOOL_SESSION_MESSAGE, sessionSchoolExists } from "@/lib/session-school";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export async function GET(req: NextRequest) {
    try {
        let session;
        try {
            session = await getServerSession(authOptions);
        } catch (sessionError) {
            console.warn("Session resolution failed for /api/sessions/current", sessionError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }

        const schoolExists = await sessionSchoolExists(prisma, schoolId);
        if (!schoolExists) {
            return NextResponse.json({ error: STALE_SCHOOL_SESSION_MESSAGE }, { status: 401 });
        }

        // Ensure term is synced with today's date
        await syncCurrentTerm(schoolId);

        const currentSession = await prisma.academicSession.findFirst({
            where: { schoolId, isCurrent: true },
            include: {
                terms: {
                    where: { isCurrent: true },
                    select: {
                        id: true,
                        name: true,
                        termNumber: true,
                        startDate: true,
                        endDate: true,
                        totalWeeks: true,
                    }
                }
            }
        });

        if (!currentSession) {
            return NextResponse.json({ error: "No current session found" }, { status: 404 });
        }

        const currentTerm = currentSession.terms[0];

        return NextResponse.json({
            sessionName: currentSession.name,
            termName: currentTerm?.name || "No active term",
            sessionId: currentSession.id,
            termId: currentTerm?.id,
            termNumber: currentTerm?.termNumber,
            startDate: currentTerm?.startDate ? currentTerm.startDate.toISOString().split("T")[0] : null,
            endDate: currentTerm?.endDate ? currentTerm.endDate.toISOString().split("T")[0] : null,
            totalWeeks: currentTerm?.totalWeeks ?? null,
        });
    } catch (error: any) {
        console.error("Error fetching current session/term:", error);
        return NextResponse.json(
            { error: "Failed to fetch current status" },
            { status: 500 }
        );
    }
}

