import React from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { RecentActivityFeed } from "./RecentActivityFeed";

type RecentScore = { updatedAt: Date; student: { firstName: string; lastName: string }; subject: { name: string } };
type RecentAttendance = Prisma.AttendanceGetPayload<{ include: { classArm: { include: { class: true } } } }>;
type RecentClassReportWorkflow = Prisma.ClassReportWorkflowGetPayload<{ include: { classArm: { include: { class: true } } } }>;

type ActivityItem = {
    type: "attendance" | "report" | "score";
    title: string;
    desc: string;
    time: Date;
    link: string;
    iconBg: string;
    iconColor: string;
    icon: React.ReactNode;
};

const studentIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const reportIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const scoreIcon = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

function formatClassArmLabel(workflowClassName: string, armName: string) {
    return `${workflowClassName} ${armName}`;
}

function getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildAttendanceActivities(rows: RecentAttendance[]): ActivityItem[] {
    const seen = new Set<string>();

    return rows.flatMap((row) => {
        const key = `${row.classArmId}:${getDateKey(row.date)}`;

        if (seen.has(key)) {
            return [];
        }

        seen.add(key);

        return [{
            type: "attendance" as const,
            title: "Attendance Marked",
            desc: `Marked attendance for ${formatClassArmLabel(row.classArm.class.name, row.classArm.armName)}`,
            time: row.createdAt,
            link: `/dashboard/attendance?classArmId=${row.classArmId}`,
            iconBg: "bg-blue-100 dark:bg-blue-900/50",
            iconColor: "text-blue-600 dark:text-blue-400",
            icon: studentIcon,
        }];
    });
}

function buildReportActivities(workflows: RecentClassReportWorkflow[], userId?: string): ActivityItem[] {
    return workflows.flatMap((workflow) => {
        const classLabel = formatClassArmLabel(workflow.classArm.class.name, workflow.classArm.armName);
        const actions: ActivityItem[] = [];

        if (workflow.commentsGeneratedAt && (!userId || workflow.commentsGeneratedById === userId)) {
            actions.push({
                type: "report",
                title: "Comments Generated",
                desc: `Generated report comments for ${classLabel}`,
                time: workflow.commentsGeneratedAt,
                link: `/dashboard/reports?classArmId=${workflow.classArmId}`,
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
                iconColor: "text-orange-600 dark:text-orange-400",
                icon: reportIcon,
            });
        }

        if (workflow.publishedAt && (!userId || workflow.publishedById === userId)) {
            actions.push({
                type: "report",
                title: "Reports Published",
                desc: `Published results for ${classLabel}`,
                time: workflow.publishedAt,
                link: `/dashboard/reports?classArmId=${workflow.classArmId}`,
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
                iconColor: "text-orange-600 dark:text-orange-400",
                icon: reportIcon,
            });
        }

        if (workflow.unpublishedAt && (!userId || workflow.unpublishedById === userId)) {
            actions.push({
                type: "report",
                title: "Reports Unpublished",
                desc: `Unpublished results for ${classLabel}`,
                time: workflow.unpublishedAt,
                link: `/dashboard/reports?classArmId=${workflow.classArmId}`,
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
                iconColor: "text-orange-600 dark:text-orange-400",
                icon: reportIcon,
            });
        }

        if (workflow.resultBroadcastedAt && !userId) {
            actions.push({
                type: "report",
                title: "Results Broadcasted",
                desc: `Broadcasted subject results for ${classLabel}`,
                time: workflow.resultBroadcastedAt,
                link: `/dashboard/insights?section=academics`,
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
                iconColor: "text-orange-600 dark:text-orange-400",
                icon: reportIcon,
            });
        }

        if (!actions.length) {
            return [];
        }

        return [actions.sort((a, b) => b.time.getTime() - a.time.getTime())[0]];
    });
}

export async function RecentActivityAsync({ schoolId, userId, isAdmin, isTeacher }: { schoolId: string, userId: string, isAdmin: boolean, isTeacher: boolean }) {
    try {
        let recentActivities: ActivityItem[] = [];

        if (isTeacher) {
            const [teacherSubjects, managedArms] = await withPrismaRetry(
                "recent activity teacher scope",
                () =>
                    prisma.$transaction([
                        prisma.teacherSubject.findMany({ where: { teacherId: userId } }),
                        prisma.classArm.findMany({ where: { classTeacherId: userId } }),
                    ])
            );

            const assignedArmIds = new Set([
                ...teacherSubjects.map((ts) => ts.classArmId),
                ...managedArms.map((arm) => arm.id),
            ]);
            const assignedArmIdsArray = Array.from(assignedArmIds);
            const managedArmIds = managedArms.map((arm) => arm.id);
            const hasAssignedArms = assignedArmIdsArray.length > 0;
            const hasManagedArms = managedArmIds.length > 0;

            const [scores, reportWorkflows] = await withPrismaRetry(
                "recent activity teacher details",
                () =>
                    prisma.$transaction([
                        prisma.score.findMany({
                            where: {
                                OR: [{ createdById: userId }, { updatedById: userId }],
                                student: hasAssignedArms
                                    ? { schoolId, classArmId: { in: assignedArmIdsArray } }
                                    : { schoolId },
                            },
                            orderBy: { updatedAt: "desc" },
                            take: 5,
                            select: {
                                updatedAt: true,
                                student: { select: { firstName: true, lastName: true } },
                                subject: { select: { name: true } },
                            },
                        }),
                        prisma.classReportWorkflow.findMany({
                            where: {
                                schoolId,
                                ...(hasManagedArms ? { classArmId: { in: managedArmIds } } : {}),
                                OR: [
                                    { commentsGeneratedById: userId },
                                    { publishedById: userId },
                                    { unpublishedById: userId },
                                ],
                            },
                            orderBy: { updatedAt: "desc" },
                            take: 6,
                            include: {
                                classArm: { include: { class: true } },
                            },
                        }),
                    ])
            );
            const attendanceRows = hasManagedArms
                ? await withPrismaRetry("recent activity teacher attendance", () =>
                    prisma.attendance.findMany({
                        where: {
                            markedById: userId,
                            classArmId: { in: managedArmIds },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 12,
                        include: {
                            classArm: { include: { class: true } },
                        },
                    })
                )
                : [];

            recentActivities = [
                ...buildAttendanceActivities(attendanceRows),
                ...buildReportActivities(reportWorkflows, userId),
                ...scores.map((score) => ({
                    type: "score" as const,
                    title: "Score Updated",
                    desc: `Updated ${score.subject.name} score for ${score.student.firstName} ${score.student.lastName}`,
                    time: score.updatedAt,
                    link: `/dashboard/scores`,
                    iconBg: "bg-green-100 dark:bg-green-900/50",
                    iconColor: "text-green-600 dark:text-green-400",
                    icon: scoreIcon,
                })),
            ];
        } else if (isAdmin) {
            const [scores, reportWorkflows, attendanceRows] = await withPrismaRetry(
                "recent activity admin details",
                () =>
                    prisma.$transaction([
                        prisma.score.findMany({
                            where: {
                                student: { schoolId },
                            },
                            orderBy: { updatedAt: "desc" },
                            take: 5,
                            select: {
                                updatedAt: true,
                                student: { select: { firstName: true, lastName: true } },
                                subject: { select: { name: true } },
                            },
                        }),
                        prisma.classReportWorkflow.findMany({
                            where: {
                                schoolId,
                                OR: [
                                    { commentsGeneratedById: userId },
                                    { publishedById: userId },
                                    { unpublishedById: userId },
                                ],
                            },
                            orderBy: { updatedAt: "desc" },
                            take: 6,
                            include: {
                                classArm: { include: { class: true } },
                            },
                        }),
                        prisma.attendance.findMany({
                            where: {
                                classArm: { class: { schoolId } },
                            },
                            orderBy: { createdAt: "desc" },
                            take: 12,
                            include: {
                                classArm: { include: { class: true } },
                            },
                        }),
                    ])
            );

            recentActivities = [
                ...buildAttendanceActivities(attendanceRows),
                ...buildReportActivities(reportWorkflows),
                ...scores.map((score) => ({
                    type: "score" as const,
                    title: "Score Updated",
                    desc: `Updated ${score.subject.name} score for ${score.student.firstName} ${score.student.lastName}`,
                    time: score.updatedAt,
                    link: `/dashboard/insights?section=academics`,
                    iconBg: "bg-green-100 dark:bg-green-900/50",
                    iconColor: "text-green-600 dark:text-green-400",
                    icon: scoreIcon,
                })),
            ];
        }

        const normalizedActivities = recentActivities
            .sort((a, b) => b.time.getTime() - a.time.getTime())
            .slice(0, 5);

        return <RecentActivityFeed activities={normalizedActivities} />;
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Recent activity temporarily unavailable because the database is busy.", error);
        return (
            <RecentActivityFeed
                activities={[]}
                emptyMessage="Recent activity is temporarily unavailable because the database connection could not be established."
            />
        );
    }
}
