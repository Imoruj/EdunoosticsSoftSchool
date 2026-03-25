import React from "react";
import { prisma } from "@/lib/prisma";
import { TeacherStats } from "./TeacherStats";

export async function TeacherDashboardAsync({ userId, isClassTeacher, isSubjectTeacher, schoolId }: { userId: string, isClassTeacher: boolean, isSubjectTeacher: boolean, schoolId: string }) {
    // 1. Fetch current term
    const currentTerm = await prisma.term.findFirst({
        where: { session: { schoolId, isCurrent: true }, isCurrent: true }
    });

    // 2. Fetch Classes where teacher is the Form Teacher
    const managedArms = await prisma.classArm.findMany({
        where: { classTeacherId: userId },
        include: {
            class: true,
            _count: { select: { students: { where: { isActive: true } } } },
            subjectClassArms: true // to get subject count per arm
        }
    });

    // 3. Fetch Subjects assigned to the teacher
    const assignedSubjects = await prisma.teacherSubject.findMany({
        where: { teacherId: userId },
        include: {
            subject: true,
            classArm: {
                include: {
                    class: true,
                    _count: { select: { students: { where: { isActive: true } } } }
                }
            }
        }
    });

    // 4. Calculate stats for the existing existing 'myClasses' and 'mySubjects' arrays expected by the UI
    const myClasses = managedArms;

    // For mySubjects, we need to inject a 'completion' percentage
    const mySubjects = await Promise.all(assignedSubjects.map(async (ts) => {
        let completion = 0;
        const totalStudents = ts.classArm._count.students;

        if (totalStudents > 0 && currentTerm) {
            // Count unique students who have at least one score entry for this subject in the current term
            const scoredStudents = await prisma.score.findMany({
                where: {
                    subjectId: ts.subjectId,
                    student: { classArmId: ts.classArmId },
                    termId: currentTerm.id
                },
                distinct: ['studentId']
            });
            completion = Math.round((scoredStudents.length / totalStudents) * 100);
        }

        return { ...ts, completion };
    }));

    // Calculate aggregated Quick Stats
    const allAssignedArmIds = new Set([
        ...managedArms.map(a => a.id),
        ...assignedSubjects.map(s => s.classArmId)
    ]);

    const totalStudentsData = await prisma.student.count({
        where: { classArmId: { in: Array.from(allAssignedArmIds) }, isActive: true }
    });

    const stats = {
        totalStudents: totalStudentsData,
        totalClasses: allAssignedArmIds.size,
        totalSubjects: assignedSubjects.length,
        overallCompletion: mySubjects.length > 0
            ? Math.round(mySubjects.reduce((acc, s) => acc + s.completion, 0) / mySubjects.length)
            : 0
    };

    return <TeacherStats myClasses={myClasses} mySubjects={mySubjects} stats={stats} />;
}

