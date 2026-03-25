import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
            return NextResponse.json({ error: "Forbidden: Only Administrators can compute report rankings" }, { status: 403 });
        }

        const { classArmId, termId } = await req.json();

        if (!classArmId || !termId) {
            return NextResponse.json({ error: "classArmId and termId are required" }, { status: 400 });
        }

        // 1. Fetch all scores for the students in this class and term
        // We aggregate by student to calculate their total term score
        const scores = await prisma.score.groupBy({
            by: ['studentId'],
            where: {
                student: { classArmId },
                termId,
            },
            _sum: { total: true },
            _count: { subjectId: true },
        });

        if (scores.length === 0) {
            return NextResponse.json({ error: "No scores found for the selected class arm and term." }, { status: 404 });
        }

        // Also fetch the max obtainable CA to correctly compute `totalObtainable` dynamically
        // Or we assume 100 max per subject as standard.
        // For simplicity and matching the old logic: `studentCurrentScores.length * 100` for end of term.

        // Let's get class size to set on ReportCard
        const classSize = await prisma.student.count({
            where: { classArmId, isActive: true }
        });

        // 2. Sort by highest total score first
        const sortedStudents = scores.sort((a, b) => {
            const totalA = a._sum.total?.toNumber() || 0;
            const totalB = b._sum.total?.toNumber() || 0;
            return totalB - totalA;
        });

        // 3. Generate UPSERT statements for each ReportCard with their calculated stats
        const updateOps = sortedStudents.map((stat, index) => {
            const studentId = stat.studentId;
            const studentTotal = stat._sum.total?.toNumber() || 0;
            const subjectCount = stat._count.subjectId || 0;

            const obtainable = subjectCount * 100;
            const average = subjectCount > 0 ? studentTotal / subjectCount : 0;
            const rank = index + 1; // 1-based class position

            return prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId,
                    }
                },
                update: {
                    totalScore: studentTotal,
                    totalObtainable: obtainable,
                    average,
                    classPosition: rank,
                    classSize,
                },
                create: {
                    studentId,
                    termId,
                    classArmId,
                    totalScore: studentTotal,
                    totalObtainable: obtainable,
                    average,
                    classPosition: rank,
                    classSize,
                }
            });
        });

        // Execute all updates in a transaction
        await prisma.$transaction(updateOps);

        return NextResponse.json({
            message: "Successfully computed report card aggregates.",
            studentsComputed: sortedStudents.length
        });

    } catch (error: any) {
        console.error("Error computing report ranks:", error);
        return NextResponse.json({ error: "Failed to compute report ranks." }, { status: 500 });
    }
}

