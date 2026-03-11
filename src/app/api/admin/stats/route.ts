import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const roles: string[] = (session?.user as any)?.roles || [];

    if (!roles.includes("SUPER_ADMIN")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
        totalSchools,
        activeSchools,
        totalStudents,
        totalUsers,
        totalClasses,
        totalSubjects,
        totalScores,
        recentSchools,
        schoolBreakdown,
    ] = await Promise.all([
        prisma.school.count(),
        prisma.school.count({ where: { isActive: true } }),
        prisma.student.count(),
        prisma.user.count(),
        prisma.class.count(),
        prisma.subject.count(),
        prisma.score.count(),
        // Recent schools for the table
        prisma.school.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                city: true,
                state: true,
                createdAt: true,
                isActive: true,
                _count: { select: { students: true, users: true, classes: true, subjects: true } },
            },
        }),
        // Full school breakdown for analytics
        prisma.school.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        students: true,
                        users: true,
                        classes: true,
                        subjects: true,
                        gradingRules: true,
                    },
                },
            },
        }),
    ]);

    return NextResponse.json({
        totalSchools,
        activeSchools,
        totalStudents,
        totalUsers,
        totalClasses,
        totalSubjects,
        totalScores,
        recentSchools,
        schoolBreakdown,
    });
}
