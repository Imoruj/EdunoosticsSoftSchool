import React from "react";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { AdminStats } from "./AdminStats";
import { DashboardUnavailableCard } from "./DashboardUnavailableCard";

export async function AdminDashboardAsync({
    schoolId,
    isSuperOrSchoolAdmin,
}: {
    schoolId: string;
    isSuperOrSchoolAdmin: boolean;
}) {
    try {
        const [studentCount, teacherCount, armCount, pubCount, totCount, currentTerm] = await withPrismaRetry(
            "admin dashboard summary",
            () =>
                prisma.$transaction([
                    prisma.student.count({ where: { schoolId } }),
                    prisma.user.count({
                        where: {
                            schoolId,
                            roles: {
                                hasSome: [
                                    UserRole.CLASS_TEACHER,
                                    UserRole.SUBJECT_TEACHER,
                                    UserRole.SCHOOL_ADMIN,
                                ],
                            },
                        },
                    }),
                    prisma.classArm.count({ where: { class: { schoolId } } }),
                    prisma.reportCard.count({ where: { student: { schoolId }, isPublished: true } }),
                    prisma.reportCard.count({ where: { student: { schoolId } } }),
                    prisma.term.findFirst({
                        where: { session: { schoolId, isCurrent: true }, isCurrent: true },
                    }),
                ])
        );

        const stats = {
            totalStudents: studentCount,
            totalTeachers: teacherCount,
            totalClasses: armCount,
            publishedReports: pubCount,
            totalReports: totCount,
            publishedPercentage: totCount > 0 ? Math.round((pubCount / totCount) * 100) : 0,
        };

        let classProgress: { name: string; progress: number }[] = [];

        if (isSuperOrSchoolAdmin) {
            const activeArms = await withPrismaRetry("admin dashboard active arms", () =>
                prisma.classArm.findMany({
                    where: { class: { schoolId } },
                    include: {
                        class: true,
                        subjectClassArms: true,
                        _count: { select: { students: true } },
                    },
                    take: 4,
                })
            );

            if (activeArms.length > 0 && currentTerm) {
                const armIds = activeArms.map((arm) => arm.id);
                const allScores = await withPrismaRetry("admin dashboard score progress", () =>
                    prisma.score.findMany({
                        where: {
                            termId: currentTerm.id,
                            student: { classArmId: { in: armIds } },
                        },
                        select: {
                            student: {
                                select: { classArmId: true },
                            },
                        },
                    })
                );

                const countMap = new Map<string, number>();
                allScores.forEach((score) => {
                    const classArmId = score.student?.classArmId;
                    if (classArmId) {
                        countMap.set(classArmId, (countMap.get(classArmId) || 0) + 1);
                    }
                });

                classProgress = activeArms.map((arm) => {
                    const expected = arm._count.students * arm.subjectClassArms.length;
                    const actual = countMap.get(arm.id) || 0;

                    return {
                        name: `${arm.class.name} ${arm.armName}`,
                        progress: expected === 0 ? 0 : Math.min(Math.round((actual / expected) * 100), 100),
                    };
                });
            }
        }

        return <AdminStats stats={stats} classProgress={classProgress} />;
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Admin dashboard temporarily unavailable because the database is busy.", error);

        return (
            <DashboardUnavailableCard
                title="Admin overview unavailable"
                description="The admin dashboard could not load because the database connection is temporarily unavailable."
            />
        );
    }
}
