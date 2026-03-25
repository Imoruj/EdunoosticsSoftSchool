import React from "react";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { AdminStats } from "./AdminStats";

export async function AdminDashboardAsync({ schoolId, isSuperOrSchoolAdmin }: { schoolId: string, isSuperOrSchoolAdmin: boolean }) {
    const [studentCount, teacherCount, armCount, pubCount, totCount] = await Promise.all([
        prisma.student.count({ where: { schoolId } }),
        prisma.user.count({ where: { schoolId, roles: { hasSome: [UserRole.CLASS_TEACHER, UserRole.SUBJECT_TEACHER, UserRole.SCHOOL_ADMIN] } } }),
        prisma.classArm.count({ where: { class: { schoolId } } }),
        prisma.reportCard.count({ where: { student: { schoolId }, isPublished: true } }),
        prisma.reportCard.count({ where: { student: { schoolId } } })
    ]);

    const stats = {
        totalStudents: studentCount, totalTeachers: teacherCount, totalClasses: armCount,
        publishedReports: pubCount, totalReports: totCount,
        publishedPercentage: totCount > 0 ? Math.round((pubCount / totCount) * 100) : 0
    };

    let classProgress: { name: string, progress: number }[] = [];

    const currentTerm = await prisma.term.findFirst({
        where: { session: { schoolId, isCurrent: true }, isCurrent: true }
    });

    if (isSuperOrSchoolAdmin) {
        const activeArms = await prisma.classArm.findMany({
            where: { class: { schoolId } },
            include: { class: true, subjectClassArms: true, _count: { select: { students: true } } },
            take: 4
        });

        if (activeArms.length > 0 && currentTerm) {
            const armIds = activeArms.map(a => a.id);
            const allScores = await prisma.score.findMany({
                where: { termId: currentTerm.id, student: { classArmId: { in: armIds } } },
                select: { student: { select: { classArmId: true } } }
            });

            const countMap = new Map<string, number>();
            allScores.forEach(score => {
                const cId = score.student?.classArmId;
                if (cId) countMap.set(cId, (countMap.get(cId) || 0) + 1);
            });

            classProgress = activeArms.map(arm => {
                const expected = arm._count.students * arm.subjectClassArms.length;
                const actual = countMap.get(arm.id) || 0;
                return {
                    name: `${arm.class.name} ${arm.armName}`,
                    progress: expected === 0 ? 0 : Math.min(Math.round((actual / expected) * 100), 100)
                };
            });
        }
    }

    return <AdminStats stats={stats} classProgress={classProgress} />;
}

