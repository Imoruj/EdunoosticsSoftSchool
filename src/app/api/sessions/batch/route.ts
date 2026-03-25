import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = user.schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with account" }, { status: 400 });
        }

        const body = await req.json();
        const { startYear, endYear } = body;

        if (!startYear || !endYear || startYear >= endYear) {
            return NextResponse.json(
                { error: "startYear and endYear are required, and startYear must be less than endYear" },
                { status: 400 }
            );
        }

        if (endYear - startYear > 20) {
            return NextResponse.json(
                { error: "Cannot create more than 20 sessions at once" },
                { status: 400 }
            );
        }

        const sessionNames: string[] = [];
        for (let year = startYear; year < endYear; year++) {
            sessionNames.push(`${year}/${year + 1}`);
        }

        const created: string[] = [];
        const skipped: string[] = [];

        await prisma.$transaction(async (tx) => {
            for (const name of sessionNames) {
                const existing = await tx.academicSession.findFirst({
                    where: { schoolId, name },
                });

                if (existing) {
                    skipped.push(name);
                    continue;
                }

                const [startYearNum] = name.split("/").map(Number);
                const sessionStartDate = new Date(startYearNum, 8, 1); // September 1
                const sessionEndDate = new Date(startYearNum + 1, 6, 31); // July 31

                const academicSession = await tx.academicSession.create({
                    data: {
                        schoolId,
                        name,
                        startDate: sessionStartDate,
                        endDate: sessionEndDate,
                        isCurrent: false,
                    },
                });

                const termDefs = [
                    {
                        name: "First Term",
                        termNumber: 1,
                        startDate: new Date(startYearNum, 8, 1),   // Sep 1
                        endDate: new Date(startYearNum, 11, 15),   // Dec 15
                    },
                    {
                        name: "Second Term",
                        termNumber: 2,
                        startDate: new Date(startYearNum + 1, 0, 8), // Jan 8
                        endDate: new Date(startYearNum + 1, 3, 10),  // Apr 10
                    },
                    {
                        name: "Third Term",
                        termNumber: 3,
                        startDate: new Date(startYearNum + 1, 3, 20), // Apr 20
                        endDate: new Date(startYearNum + 1, 6, 20),   // Jul 20
                    },
                ];

                for (const term of termDefs) {
                    await tx.term.create({
                        data: {
                            sessionId: academicSession.id,
                            name: term.name,
                            termNumber: term.termNumber,
                            startDate: term.startDate,
                            endDate: term.endDate,
                            isCurrent: false,
                        },
                    });
                }

                created.push(name);
            }
        });

        return NextResponse.json({
            success: true,
            created,
            skipped,
            message: `Created ${created.length} session(s), skipped ${skipped.length} existing session(s).`,
        });
    } catch (error: any) {
        console.error("Error creating batch sessions:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create sessions" },
            { status: 500 }
        );
    }
}

