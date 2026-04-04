import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { getSafeServerSession } from "@/lib/server-session";

function calculateTotalWeeks(startDate?: Date, endDate?: Date) {
    if (!startDate || !endDate) return null;

    const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    if (endUtc < startUtc) return null;

    const diffDays = Math.floor((endUtc - startUtc) / 86400000) + 1;
    return Math.max(1, Math.ceil(diffDays / 7));
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/sessions");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;

        // Auto-sync current term based on date ranges
        if (schoolId) await syncCurrentTerm(schoolId);

        const sessions = await prisma.academicSession.findMany({
            where: { schoolId },
            orderBy: { name: "desc" },
            include: {
                terms: {
                    orderBy: { termNumber: "asc" }
                }
            }
        });

        return NextResponse.json({ sessions });
    } catch (error: any) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/sessions");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        const body = await req.json();

        const { sessionId, sessionName, currentTerm, terms } = body;

        // Transaction to ensure consistency
        const result = await prisma.$transaction(async (tx) => {
            let academicSession;

            // 1. Handle Session
            if (sessionId) {
                // Update existing
                academicSession = await tx.academicSession.update({
                    where: { id: sessionId },
                    data: {
                        isCurrent: true, // If we are saving settings for it, it likely becomes current
                    }
                });

                // If this is becoming current, unset others
                await tx.academicSession.updateMany({
                    where: { schoolId, id: { not: sessionId } },
                    data: { isCurrent: false }
                });
            } else if (sessionName) {
                // Create new
                // First checks if it exists to avoid dupes
                const existing = await tx.academicSession.findFirst({
                    where: { schoolId, name: sessionName }
                });

                if (existing) {
                    academicSession = await tx.academicSession.update({
                        where: { id: existing.id },
                        data: { isCurrent: true }
                    });
                } else {
                    academicSession = await tx.academicSession.create({
                        data: {
                            schoolId,
                            name: sessionName,
                            startDate: new Date(), // Defaults
                            endDate: new Date(),
                            isCurrent: true
                        }
                    });
                }

                // Unset others
                await tx.academicSession.updateMany({
                    where: { schoolId, id: { not: academicSession.id } },
                    data: { isCurrent: false }
                });
            } else {
                throw new Error("Session ID or Name required");
            }

            // Clear isCurrent on terms belonging to all OTHER sessions so that
            // syncCurrentTerm's early-return guard (exactly 1 current session +
            // 1 current term in that session) is satisfied after this save.
            const otherSessions = await tx.academicSession.findMany({
                where: { schoolId, id: { not: academicSession.id } },
                select: { id: true }
            });
            if (otherSessions.length > 0) {
                await tx.term.updateMany({
                    where: { sessionId: { in: otherSessions.map(s => s.id) } },
                    data: { isCurrent: false }
                });
            }

            // 2. Handle Terms
            // We expect 'terms' to be an array containing date info for specific terms.
            // terms: [{ name: "First Term", startDate: "...", endDate: "...", totalWeeks?: number }]

            if (terms && Array.isArray(terms)) {
                for (const termData of terms) {
                    let termNumber = 1;
                    if (termData.name.toLowerCase().includes("second")) termNumber = 2;
                    if (termData.name.toLowerCase().includes("third")) termNumber = 3;

                    // Determine if this term is the current one
                    // Logic: If currentTerm matches name OR matches number
                    const isCurrentTerm = currentTerm === termData.name ||
                        (currentTerm === "first" && termNumber === 1) ||
                        (currentTerm === "second" && termNumber === 2) ||
                        (currentTerm === "third" && termNumber === 3);

                    // Only update dates if provided
                    const startDate = termData.startDate ? new Date(termData.startDate) : undefined;
                    const endDate = termData.endDate ? new Date(termData.endDate) : undefined;
                    const parsedTotalWeeks = Number(termData.totalWeeks);
                    const totalWeeks = Number.isFinite(parsedTotalWeeks) && parsedTotalWeeks > 0
                        ? Math.round(parsedTotalWeeks)
                        : calculateTotalWeeks(startDate, endDate);

                    // We need to upsert these terms for the session.
                    // Accessing via unique constraint: [sessionId, termNumber]
                    const updateData: any = { isCurrent: isCurrentTerm };
                    if (startDate) updateData.startDate = startDate;
                    if (endDate) updateData.endDate = endDate;
                    updateData.totalWeeks = totalWeeks;


                    await tx.term.upsert({
                        where: {
                            sessionId_termNumber: {
                                sessionId: academicSession.id,
                                termNumber: termNumber
                            }
                        },
                        create: {
                            sessionId: academicSession.id,
                            name: termData.name,
                            termNumber,
                            startDate: startDate || new Date(),
                            endDate: endDate || new Date(),
                            totalWeeks,
                            isCurrent: isCurrentTerm
                        },
                        update: updateData
                    });

                    // If we set this term as current, unset others in this session if any (though logic usually handles one per session)
                    // But we also need to unset current term in OTHER sessions? Not strictly necessary if we rely on session.isCurrent first.
                    // But good practice to have only one current term globally if that's the logic.
                    // For now, let's assume term.isCurrent is only relevant within the current session.
                }
            }

            return academicSession;
        });

        return NextResponse.json({ success: true, session: result });
    } catch (error: any) {
        console.error("Error saving session:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save session" },
            { status: 500 }
        );
    }
}

