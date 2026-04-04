import React from "react";
import { prisma } from "@/lib/prisma";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { TeacherStats } from "./TeacherStats";
import { DashboardUnavailableCard } from "./DashboardUnavailableCard";

export async function TeacherDashboardAsync({
    userId,
    isClassTeacher,
    isSubjectTeacher,
    schoolId,
}: {
    userId: string;
    isClassTeacher: boolean;
    isSubjectTeacher: boolean;
    schoolId: string;
}) {
    try {
        const [currentTerm, managedArms, assignedSubjects] = await withPrismaRetry(
            "teacher dashboard summary",
            () =>
                prisma.$transaction([
                    prisma.term.findFirst({
                        where: { session: { schoolId, isCurrent: true }, isCurrent: true },
                    }),
                    prisma.classArm.findMany({
                        where: { classTeacherId: userId },
                        include: {
                            class: true,
                            _count: { select: { students: { where: { isActive: true } } } },
                            subjectClassArms: true,
                        },
                    }),
                    prisma.teacherSubject.findMany({
                        where: { teacherId: userId },
                        include: {
                            subject: true,
                            classArm: {
                                include: {
                                    class: true,
                                    _count: { select: { students: { where: { isActive: true } } } },
                                },
                            },
                        },
                    }),
                ])
        );

        const myClasses = managedArms;
        const pairKey = (subjectId: string, classArmId: string) => `${subjectId}:${classArmId}`;

        const completionScores =
            assignedSubjects.length > 0 && currentTerm
                ? await withPrismaRetry("teacher dashboard completion scores", () =>
                    prisma.score.findMany({
                        where: {
                            termId: currentTerm.id,
                            subjectId: { in: assignedSubjects.map((assignment) => assignment.subjectId) },
                            student: {
                                classArmId: { in: assignedSubjects.map((assignment) => assignment.classArmId) },
                            },
                        },
                        select: {
                            subjectId: true,
                            studentId: true,
                            student: {
                                select: { classArmId: true },
                            },
                        },
                    })
                )
                : [];

        const scoredStudentsByPair = new Map<string, Set<string>>();
        completionScores.forEach((score) => {
            const classArmId = score.student.classArmId;
            if (!classArmId) {
                return;
            }
            const key = pairKey(score.subjectId, classArmId);
            if (!scoredStudentsByPair.has(key)) {
                scoredStudentsByPair.set(key, new Set<string>());
            }
            scoredStudentsByPair.get(key)?.add(score.studentId);
        });

        const mySubjects = assignedSubjects.map((assignment) => {
            const totalStudents = assignment.classArm._count.students;
            const completion = totalStudents > 0
                ? Math.round(
                    ((scoredStudentsByPair.get(pairKey(assignment.subjectId, assignment.classArmId))?.size || 0) /
                        totalStudents) *
                    100
                )
                : 0;

            return { ...assignment, completion };
        });

        const allAssignedArmIds = new Set([
            ...managedArms.map((arm) => arm.id),
            ...assignedSubjects.map((assignment) => assignment.classArmId),
        ]);

        const totalStudentsData = isClassTeacher && managedArms.length > 0
            ? managedArms.reduce((total, arm) => total + arm._count.students, 0)
            : await withPrismaRetry("teacher dashboard active student count", () =>
                prisma.student.count({
                    where: { classArmId: { in: Array.from(allAssignedArmIds) }, isActive: true },
                })
            );

        const stats = {
            totalStudents: totalStudentsData,
            totalClasses: allAssignedArmIds.size,
            totalSubjects: assignedSubjects.length,
            overallCompletion: mySubjects.length > 0
                ? Math.round(mySubjects.reduce((acc, subject) => acc + subject.completion, 0) / mySubjects.length)
                : 0,
        };

        return <TeacherStats myClasses={myClasses} mySubjects={mySubjects} stats={stats} />;
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Teacher dashboard temporarily unavailable because the database is busy.", error);

        return (
            <DashboardUnavailableCard
                title="Teacher overview unavailable"
                description="The teacher dashboard could not load because the database connection is temporarily unavailable."
            />
        );
    }
}
