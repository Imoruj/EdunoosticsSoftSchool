import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { syncCurrentTerm } from "@/lib/currentTerm";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }

        // Ensure term is synced with today's date
        await syncCurrentTerm(schoolId);

        const currentSession = await prisma.academicSession.findFirst({
            where: { schoolId, isCurrent: true },
            include: {
                terms: {
                    where: { isCurrent: true }
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
            termId: currentTerm?.id
        });
    } catch (error: any) {
        console.error("Error fetching current session/term:", error);
        return NextResponse.json(
            { error: "Failed to fetch current status" },
            { status: 500 }
        );
    }
}
