import React from "react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RecentActivityFeed } from "./RecentActivityFeed";

type RecentStudent = Prisma.StudentGetPayload<{ include: { classArm: { include: { class: true } } } }>;
type RecentReport = Prisma.ReportCardGetPayload<{ include: { student: true } }>;
type RecentScore = Prisma.ScoreGetPayload<{ include: { student: true, subject: true, createdBy: true } }>;

export async function RecentActivityAsync({ schoolId, userId, isAdmin, isTeacher }: { schoolId: string, userId: string, isAdmin: boolean, isTeacher: boolean }) {
    let recentStudents: RecentStudent[] = [];
    let recentReports: RecentReport[] = [];
    let recentScores: RecentScore[] = [];

    if (isTeacher) {
        // Fetch specific assignments for this teacher
        const [teacherSubjects, managedArms] = await Promise.all([
            prisma.teacherSubject.findMany({ where: { teacherId: userId } }),
            prisma.classArm.findMany({ where: { classTeacherId: userId } })
        ]);

        const assignedArmIds = new Set([
            ...teacherSubjects.map(ts => ts.classArmId),
            ...managedArms.map(ma => ma.id)
        ]);
        const assignedArmIdsArray = Array.from(assignedArmIds);
        const hasAssignedArms = assignedArmIdsArray.length > 0;

        // Filter class activity relevant to this teacher, but keep score updates user-specific.
        const [students, reports, scores] = await Promise.all([
            hasAssignedArms
                ? prisma.student.findMany({
                    where: { schoolId, classArmId: { in: assignedArmIdsArray } },
                    orderBy: { createdAt: 'desc' }, take: 3,
                    include: { classArm: { include: { class: true } } }
                })
                : Promise.resolve([] as RecentStudent[]),
            hasAssignedArms
                ? prisma.reportCard.findMany({
                    where: { isPublished: true, student: { schoolId, classArmId: { in: assignedArmIdsArray } } },
                    orderBy: { updatedAt: 'desc' }, take: 2,
                    include: { student: true }
                })
                : Promise.resolve([] as RecentReport[]),
            prisma.score.findMany({
                where: {
                    OR: [{ createdById: userId }, { updatedById: userId }],
                    student: hasAssignedArms
                        ? { schoolId, classArmId: { in: assignedArmIdsArray } }
                        : { schoolId }
                },
                orderBy: { updatedAt: 'desc' }, take: 4,
                include: { student: true, subject: true, createdBy: true }
            })
        ]);
        recentStudents = students;
        recentReports = reports;
        recentScores = scores;
    } else if (isAdmin) {
        // Admin activity is user-specific (not school-wide).
        recentScores = await prisma.score.findMany({
            where: {
                OR: [{ createdById: userId }, { updatedById: userId }],
                student: { schoolId }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: { student: true, subject: true, createdBy: true }
        });
    }

    const recentActivities = [
        ...recentStudents.map(s => ({
            type: "student" as const, title: `New Student: ${s.firstName} ${s.lastName}`,
            desc: `Admitted to ${s.classArm ? `${s.classArm.class.name} ${s.classArm.armName}` : 'Unassigned'}`,
            time: s.createdAt, link: `/dashboard/students`, iconBg: "bg-blue-100", iconColor: "text-blue-600",
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        })),
        ...recentReports.map(r => ({
            type: "report" as const, title: `Report Published`,
            desc: `${r.student.firstName} ${r.student.lastName}'s report card is now available.`,
            time: r.updatedAt, link: `/dashboard/reports`, iconBg: "bg-orange-100", iconColor: "text-orange-600",
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        })),
        ...recentScores.map(s => ({
            type: "score" as const, title: `Score Updated`,
            desc: `${s.subject.name} score for ${s.student.firstName} by ${s.createdBy?.firstName || 'System'}`,
            time: s.updatedAt, link: `/dashboard/scores`, iconBg: "bg-green-100", iconColor: "text-green-600",
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);

    return <RecentActivityFeed activities={recentActivities} />;
}
