import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createUserNotification, createUserNotifications } from "@/lib/userNotifications";
import { getStudentAndParentNotificationUserIds } from "@/lib/studentAudience";
import { generatePrincipalComment, generateTeacherComment } from "@/services/aiService";
import { formatAttendancePoints } from "@/lib/attendance-points";

type WorkflowAction =
    | "broadcast_result"
    | "generate_comments"
    | "update_student_comments"
    | "regenerate_student_comment"
    | "class_approve_student"
    | "admin_review_student"
    | "publish_class"
    | "unpublish_class";

function toReportType(value?: string | null): ReportType {
    if (!value) return "END_TERM";
    if (value === "halfTerm" || value === "HALF_TERM") return "HALF_TERM";
    return "END_TERM";
}

function toClientReportType(value: ReportType): "halfTerm" | "endOfTerm" {
    return value === "HALF_TERM" ? "halfTerm" : "endOfTerm";
}

function plusDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function classLabel(className?: string | null, armName?: string | null) {
    return [className, armName].filter(Boolean).join(" ").trim() || "this class";
}

async function getClassStudentsForWorkflow(schoolId: string, classArmId: string, termId: string): Promise<string[]> {
    const [activeStudents, historicalReportStudents] = await Promise.all([
        prisma.student.findMany({
            where: { schoolId, classArmId, isActive: true },
            select: { id: true },
        }),
        prisma.reportCard.findMany({
            where: {
                termId,
                classArmId,
                student: { schoolId },
            },
            select: { studentId: true },
            distinct: ["studentId"],
        }),
    ]);

    const ids = new Set<string>();
    activeStudents.forEach((student) => ids.add(student.id));
    historicalReportStudents.forEach((record) => ids.add(record.studentId));
    return Array.from(ids);
}

async function ensureClassWorkflowWithStudents(params: {
    schoolId: string;
    classArmId: string;
    termId: string;
    reportType: ReportType;
}) {
    const workflow = await prisma.classReportWorkflow.upsert({
        where: {
            termId_classArmId_reportType: {
                termId: params.termId,
                classArmId: params.classArmId,
                reportType: params.reportType,
            },
        },
        update: {},
        create: {
            schoolId: params.schoolId,
            classArmId: params.classArmId,
            termId: params.termId,
            reportType: params.reportType,
        },
    });

    const studentIds = await getClassStudentsForWorkflow(params.schoolId, params.classArmId, params.termId);
    if (studentIds.length === 0) return workflow;

    const existing = await prisma.studentReportWorkflow.findMany({
        where: { classReportWorkflowId: workflow.id },
        select: { studentId: true },
    });
    const existingSet = new Set(existing.map((item) => item.studentId));
    const missingIds = studentIds.filter((id) => !existingSet.has(id));

    if (missingIds.length > 0) {
        await prisma.studentReportWorkflow.createMany({
            data: missingIds.map((studentId) => ({
                classReportWorkflowId: workflow.id,
                schoolId: params.schoolId,
                termId: params.termId,
                classArmId: params.classArmId,
                studentId,
                reportType: params.reportType,
                status: "COMMENTS_PENDING",
            })),
            skipDuplicates: true,
        });
    }

    return workflow;
}

type ScoreBroadcastStatus = {
    subjectId: string;
    subjectName: string;
    status: string;
    teacher: WorkflowUserSummary | null;
    reviewedBy: WorkflowUserSummary | null;
    broadcastedBy: WorkflowUserSummary | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    rejectionReason: string | null;
    lastUpdatedAt: string | null;
    nextAction: string;
    hasWorkflow: boolean;
    componentStatuses?: ScoreBroadcastComponentStatus[];
};

type WorkflowUserSummary = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

type ScoreBroadcastComponentStatus = {
    subjectId: string;
    subjectName: string;
    status: string;
    teacher: WorkflowUserSummary | null;
    reviewedBy: WorkflowUserSummary | null;
    broadcastedBy: WorkflowUserSummary | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    rejectionReason: string | null;
    lastUpdatedAt: string | null;
    nextAction: string;
    hasWorkflow: boolean;
};

function toWorkflowUserSummary(
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
    } | null
): WorkflowUserSummary | null {
    if (!user) return null;

    return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone,
    };
}

function getWorkflowNextActionLabel(params: {
    status: string;
    hasTeacher: boolean;
    isComposite?: boolean;
    componentStatuses?: ScoreBroadcastComponentStatus[];
}) {
    const { status, hasTeacher, isComposite = false, componentStatuses = [] } = params;

    if (isComposite) {
        if (componentStatuses.length === 0) {
            return "Configure component subjects";
        }

        if (componentStatuses.some((item) => !item.teacher)) {
            return "Assign missing component teacher";
        }

        if (componentStatuses.some((item) => item.status === "REJECTED")) {
            return "Resolve rejected component scores";
        }

        if (componentStatuses.every((item) => item.status === "BROADCASTED")) {
            return "Completed";
        }

        if (componentStatuses.every((item) => item.status === "APPROVED" || item.status === "BROADCASTED")) {
            return "Broadcast component scores";
        }

        return "Await component review";
    }

    if (!hasTeacher) {
        return "Assign subject teacher";
    }

    if (status === "REJECTED") {
        return "Teacher resubmits scores";
    }

    if (status === "APPROVED") {
        return "Broadcast approved scores";
    }

    if (status === "BROADCASTED") {
        return "Completed";
    }

    return "Await class review";
}

async function getCompositeConfigsForWorkflow(classArmId: string, termId: string) {
    const [classArm, term] = await Promise.all([
        prisma.classArm.findUnique({
            where: { id: classArmId },
            select: { classId: true },
        }),
        prisma.term.findUnique({
            where: { id: termId },
            select: { sessionId: true },
        }),
    ]);

    if (!classArm?.classId || !term?.sessionId) {
        return [];
    }

    return prisma.compositeSubjectConfig.findMany({
        where: {
            classId: classArm.classId,
            sessionId: term.sessionId,
            isActive: true,
        },
        include: {
            parentSubject: {
                select: { id: true, name: true },
            },
            components: {
                select: {
                    componentSubjectId: true,
                    componentSubject: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });
}

async function getExpectedSubjects(
    classArmId: string,
    termId: string
): Promise<Array<{ subjectId: string; subjectName: string }>> {
    const [assigned, scored, compositeConfigs] = await Promise.all([
        prisma.subjectClassArm.findMany({
            where: {
                classArmId,
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            },
            select: {
                subjectId: true,
                subject: { select: { name: true } },
            },
        }),
        prisma.score.findMany({
            where: {
                termId,
                student: { classArmId },
            },
            select: { subjectId: true },
            distinct: ["subjectId"],
        }),
        getCompositeConfigsForWorkflow(classArmId, termId),
    ]);

    const scoredSubjectIds = scored.map((item) => item.subjectId);
    const scoredSubjects =
        scoredSubjectIds.length > 0
            ? await prisma.subject.findMany({
                where: { id: { in: scoredSubjectIds } },
                select: { id: true, name: true, subjectKind: true },
            })
            : [];

    const subjectMap = new Map<string, string>();
    assigned.forEach((item) => subjectMap.set(item.subjectId, item.subject.name));
    const componentParentMap = new Map<string, { id: string; name: string }>();
    compositeConfigs.forEach((config) => {
        subjectMap.set(config.parentSubject.id, config.parentSubject.name);
        config.components.forEach((component) => {
            componentParentMap.set(component.componentSubjectId, {
                id: config.parentSubject.id,
                name: config.parentSubject.name,
            });
        });
    });
    scoredSubjects.forEach((item) => {
        if (item.subjectKind === "COMPOSITE_COMPONENT") {
            const parent = componentParentMap.get(item.id);
            if (parent) {
                subjectMap.set(parent.id, parent.name);
            }
            return;
        }
        subjectMap.set(item.id, item.name);
    });

    return Array.from(subjectMap.entries())
        .map(([subjectId, subjectName]) => ({ subjectId, subjectName }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

async function getScoreBroadcastSummary(schoolId: string, classArmId: string, termId: string) {
    const [expectedSubjects, compositeConfigs] = await Promise.all([
        getExpectedSubjects(classArmId, termId),
        getCompositeConfigsForWorkflow(classArmId, termId),
    ]);
    if (expectedSubjects.length === 0) {
        return {
            expectedSubjects: 0,
            broadcastedSubjects: 0,
            allBroadcasted: false,
            statuses: [] as ScoreBroadcastStatus[],
            pendingSubjects: [] as ScoreBroadcastStatus[],
            classReviewer: null as WorkflowUserSummary | null,
        };
    }

    const trackedSubjectIds = Array.from(
        new Set([
            ...expectedSubjects.map((item) => item.subjectId),
            ...compositeConfigs.flatMap((config) =>
                config.components.map((component) => component.componentSubjectId)
            ),
        ])
    );

    const [workflows, teacherAssignments, classArm] = await Promise.all([
        prisma.scoreSheetWorkflow.findMany({
            where: {
                schoolId,
                classArmId,
                termId,
                subjectId: { in: trackedSubjectIds },
            },
            select: {
                subjectId: true,
                status: true,
                rejectionReason: true,
                reviewedAt: true,
                broadcastedAt: true,
                updatedAt: true,
                subjectTeacher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                broadcastedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        }),
        prisma.teacherSubject.findMany({
            where: {
                classArmId,
                subjectId: { in: trackedSubjectIds },
            },
            select: {
                subjectId: true,
                teacher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        }),
        prisma.classArm.findUnique({
            where: { id: classArmId },
            select: {
                classTeacher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        }),
    ]);

    const workflowMap = new Map(workflows.map((workflow) => [workflow.subjectId, workflow]));
    const teacherAssignmentMap = new Map(
        teacherAssignments.map((assignment) => [
            assignment.subjectId,
            toWorkflowUserSummary(assignment.teacher),
        ])
    );
    const compositeByParent = new Map(
        compositeConfigs.map((config) => [config.parentSubject.id, config])
    );
    const buildLeafStatus = (subjectId: string, subjectName: string): ScoreBroadcastComponentStatus => {
        const workflow = workflowMap.get(subjectId);
        const teacher =
            toWorkflowUserSummary(workflow?.subjectTeacher) ||
            teacherAssignmentMap.get(subjectId) ||
            null;
        const status = workflow?.status || "PENDING_REVIEW";

        return {
            subjectId,
            subjectName,
            status,
            teacher,
            reviewedBy: toWorkflowUserSummary(workflow?.reviewedBy),
            broadcastedBy: toWorkflowUserSummary(workflow?.broadcastedBy),
            reviewedAt: workflow?.reviewedAt?.toISOString() || null,
            broadcastedAt: workflow?.broadcastedAt?.toISOString() || null,
            rejectionReason: workflow?.rejectionReason || null,
            lastUpdatedAt: workflow?.updatedAt?.toISOString() || null,
            nextAction: getWorkflowNextActionLabel({
                status,
                hasTeacher: Boolean(teacher),
            }),
            hasWorkflow: Boolean(workflow),
        };
    };

    const statuses: ScoreBroadcastStatus[] = expectedSubjects.map((subject) => {
        const compositeConfig = compositeByParent.get(subject.subjectId);
        if (!compositeConfig) {
            return {
                ...buildLeafStatus(subject.subjectId, subject.subjectName),
                componentStatuses: undefined,
            };
        }

        const componentStatuses = compositeConfig.components.map((component) =>
            buildLeafStatus(component.componentSubject.id, component.componentSubject.name)
        );
        const componentUpdatedAtValues = componentStatuses
            .map((item) => item.lastUpdatedAt)
            .filter((value): value is string => Boolean(value))
            .sort();
        const latestUpdatedAt =
            componentUpdatedAtValues.length > 0
                ? componentUpdatedAtValues[componentUpdatedAtValues.length - 1]
                : null;

        const status = (() => {
            const leafStatuses = componentStatuses.map((item) => item.status);
            if (leafStatuses.length > 0 && leafStatuses.every((item) => item === "BROADCASTED")) {
                return "BROADCASTED";
            }
            if (leafStatuses.length > 0 && leafStatuses.every((item) => item === "APPROVED" || item === "BROADCASTED")) {
                return "APPROVED";
            }
            if (leafStatuses.some((item) => item === "REJECTED")) {
                return "REJECTED";
            }
            return "PENDING_REVIEW";
        })();

        return {
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            status,
            teacher: null,
            reviewedBy: null,
            broadcastedBy: null,
            reviewedAt: null,
            broadcastedAt: null,
            rejectionReason: null,
            lastUpdatedAt: latestUpdatedAt,
            nextAction: getWorkflowNextActionLabel({
                status,
                hasTeacher: componentStatuses.every((item) => Boolean(item.teacher)),
                isComposite: true,
                componentStatuses,
            }),
            hasWorkflow: componentStatuses.some((item) => item.hasWorkflow),
            componentStatuses,
        };
    });
    const broadcastedSubjects = statuses.filter((item) => item.status === "BROADCASTED").length;
    const pendingSubjects = statuses.filter((item) => item.status !== "BROADCASTED");

    return {
        expectedSubjects: expectedSubjects.length,
        broadcastedSubjects,
        allBroadcasted: expectedSubjects.length > 0 && broadcastedSubjects === expectedSubjects.length,
        statuses,
        pendingSubjects,
        classReviewer: toWorkflowUserSummary(classArm?.classTeacher),
    };
}

async function buildCommentContext(params: {
    schoolId: string;
    studentId: string;
    termId: string;
    classArmId: string;
}) {
    const [student, reportCard, term, scores] = await Promise.all([
        prisma.student.findUnique({
            where: { id: params.studentId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                schoolId: true,
                classArmId: true,
            },
        }),
        prisma.reportCard.findFirst({
            where: { studentId: params.studentId, termId: params.termId },
            include: {
                affectiveRatings: { include: { trait: true } },
                psychomotorRatings: { include: { skill: true } },
            },
        }),
        prisma.term.findFirst({
            where: { id: params.termId, session: { schoolId: params.schoolId } },
            select: { name: true },
        }),
        prisma.score.findMany({
            where: { studentId: params.studentId, termId: params.termId },
            include: { subject: true },
        }),
    ]);

    if (!student) {
        throw new Error("Student not found");
    }

    if (student.schoolId !== params.schoolId || student.classArmId !== params.classArmId) {
        throw new Error("Invalid student/class selection");
    }

    const traitsSummary = reportCard
        ? [
            ...reportCard.affectiveRatings.map((rating) => `${rating.trait.name}: ${rating.rating}`),
            ...reportCard.psychomotorRatings.map((rating) => `${rating.skill.name}: ${rating.rating}`),
        ].join(", ")
        : "";

    const subjectScores: Record<string, number> = {};
    const resitSubjects: string[] = [];
    for (const s of scores) {
        const total = s.total.toNumber();
        subjectScores[s.subject.name] = total;
        if (total < 50) {
            resitSubjects.push(s.subject.name);
        }
    }

    return {
        id: student.id,
        studentId: student.id,
        termId: params.termId,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        term: term?.name || "",
        average: reportCard?.average?.toNumber() || 0,
        position: reportCard?.classPosition || 0,
        attendance: reportCard
            ? formatAttendancePoints(reportCard.daysPresent, reportCard.totalSchoolDays)
            : "N/A",
        traits: traitsSummary,
        schoolId: student.schoolId,
        subjectScores,
        resitSubjects,
    };
}

async function ensureReportCardAggregates(classArmId: string, termId: string) {
    const scores = await prisma.score.groupBy({
        by: ['studentId'],
        where: {
            student: { classArmId },
            termId,
        },
        _sum: { total: true },
        _count: { subjectId: true },
    });

    if (!scores.length) {
        return;
    }

    const classSize = await prisma.student.count({ where: { classArmId, isActive: true } });
    const sortedStudents = scores.sort((a, b) => {
        const totalA = a._sum.total?.toNumber() || 0;
        const totalB = b._sum.total?.toNumber() || 0;
        return totalB - totalA;
    });

    const updateOps = sortedStudents.map((stat, index) => {
        const studentId = stat.studentId;
        const studentTotal = stat._sum.total?.toNumber() || 0;
        const subjectCount = stat._count.subjectId || 0;

        const obtainable = subjectCount * 100;
        const average = subjectCount > 0 ? studentTotal / subjectCount : 0;
        const rank = index + 1;

        return prisma.reportCard.upsert({
            where: {
                studentId_termId: {
                    studentId,
                    termId,
                },
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
            },
        });
    });

    await prisma.$transaction(updateOps);
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const termId = searchParams.get("termId");
        const reportType = toReportType(searchParams.get("reportType"));

        if (!classArmId || !termId) {
            return NextResponse.json({ error: "classArmId and termId are required" }, { status: 400 });
        }

        const classArm = await prisma.classArm.findFirst({
            where: {
                id: classArmId,
                class: { schoolId },
            },
            select: {
                id: true,
                classTeacherId: true,
                armName: true,
                class: { select: { name: true } },
            },
        });

        if (!classArm) {
            return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
        }

        const isAssignedClassTeacher = isClassTeacher && classArm.classTeacherId === userId;
        if (!isAdmin && !isAssignedClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await ensureClassWorkflowWithStudents({ schoolId, classArmId, termId, reportType });
        const [classWorkflow, studentWorkflows, scoreSummary] = await Promise.all([
            prisma.classReportWorkflow.findUnique({
                where: {
                    termId_classArmId_reportType: {
                        termId,
                        classArmId,
                        reportType,
                    },
                },
            }),
            prisma.studentReportWorkflow.findMany({
                where: {
                    schoolId,
                    termId,
                    classArmId,
                    reportType,
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            admissionNumber: true,
                        },
                    },
                },
                orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
            }),
            getScoreBroadcastSummary(schoolId, classArmId, termId),
        ]);

        return NextResponse.json({
            classArm: {
                id: classArm.id,
                name: classLabel(classArm.class.name, classArm.armName),
            },
            reportType: toClientReportType(reportType),
            classWorkflow,
            studentWorkflows,
            scoreSummary,
            permissions: {
                canBroadcastResult: isAdmin || isAssignedClassTeacher,
                canManageComments: isAdmin || isAssignedClassTeacher,
                canAdminReview: isAdmin,
                canPublish: isAdmin,
            },
        });
    } catch (error) {
        console.error("Failed to fetch report workflow:", error);
        return NextResponse.json({ error: "Failed to fetch report workflow" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
        const isClassTeacher = roles.includes("CLASS_TEACHER");
        const actorName = (user.name as string) || "A teacher";

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        const body = await req.json();
        const action: WorkflowAction | undefined = body.action;
        const classArmId: string | undefined = body.classArmId;
        const termId: string | undefined = body.termId;
        const reportType = toReportType(body.reportType);
        const adminOverride = isAdmin && body.adminOverride === true;

        if (!action || !classArmId || !termId) {
            return NextResponse.json({ error: "action, classArmId, and termId are required" }, { status: 400 });
        }

        const classArm = await prisma.classArm.findFirst({
            where: {
                id: classArmId,
                class: { schoolId },
            },
            select: {
                id: true,
                classTeacherId: true,
                armName: true,
                class: { select: { name: true } },
            },
        });

        if (!classArm) {
            return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
        }

        const isAssignedClassTeacher = isClassTeacher && classArm.classTeacherId === userId;
        if (!isAdmin && !isAssignedClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const classWorkflow = await ensureClassWorkflowWithStudents({
            schoolId,
            classArmId,
            termId,
            reportType,
        });

        const className = classLabel(classArm.class.name, classArm.armName);

        if (action === "broadcast_result") {
            const scoreSummary = await getScoreBroadcastSummary(schoolId, classArmId, termId);
            if (!scoreSummary.allBroadcasted && !adminOverride) {
                return NextResponse.json(
                    {
                        error: "All subject scores must be broadcasted before broadcasting class result.",
                        scoreSummary,
                    },
                    { status: 400 }
                );
            }

            const updated = await prisma.classReportWorkflow.update({
                where: { id: classWorkflow.id },
                data: {
                    status: "RESULT_BROADCASTED",
                    resultBroadcastedAt: new Date(),
                    resultBroadcastedById: userId,
                },
            });

            await prisma.studentReportWorkflow.updateMany({
                where: { classReportWorkflowId: classWorkflow.id },
                data: {
                    status: "COMMENTS_PENDING",
                },
            });

            return NextResponse.json({
                message: "Class result broadcasted successfully.",
                classWorkflow: updated,
            });
        }

        if (action === "generate_comments") {
            if (
                !adminOverride &&
                classWorkflow.status !== "RESULT_BROADCASTED" &&
                classWorkflow.status !== "COMMENTS_GENERATED" &&
                classWorkflow.status !== "READY_FOR_ADMIN_REVIEW"
            ) {
                return NextResponse.json(
                    { error: "Broadcast class result before generating comments." },
                    { status: 400 }
                );
            }

            // Ensure all report cards have computed averages and position before AI generation.
            await ensureReportCardAggregates(classArmId, termId);

            const studentWorkflows = await prisma.studentReportWorkflow.findMany({
                where: { classReportWorkflowId: classWorkflow.id },
                select: { id: true, studentId: true },
            });

            for (const workflow of studentWorkflows) {
                const context = await buildCommentContext({
                    schoolId,
                    classArmId,
                    studentId: workflow.studentId,
                    termId,
                });

                const [teacherComment, principalComment] = await Promise.all([
                    generateTeacherComment(schoolId, context),
                    generatePrincipalComment(schoolId, context),
                ]);

                await prisma.$transaction([
                    prisma.studentReportWorkflow.update({
                        where: { id: workflow.id },
                        data: {
                            classTeacherComment: teacherComment,
                            principalComment: principalComment,
                            status: "COMMENTS_READY",
                        },
                    }),
                    prisma.reportCard.upsert({
                        where: {
                            studentId_termId: {
                                studentId: workflow.studentId,
                                termId,
                            },
                        },
                        update: {
                            classArmId,
                            classTeacherComment: teacherComment,
                            principalComment: principalComment,
                        },
                        create: {
                            studentId: workflow.studentId,
                            termId,
                            classArmId,
                            classTeacherComment: teacherComment,
                            principalComment: principalComment,
                        },
                    }),
                ]);
            }

            const updated = await prisma.classReportWorkflow.update({
                where: { id: classWorkflow.id },
                data: {
                    status: "COMMENTS_GENERATED",
                    commentsGeneratedAt: new Date(),
                    commentsGeneratedById: userId,
                },
            });

            if (classArm.classTeacherId && classArm.classTeacherId !== userId) {
                await createUserNotification({
                    userId: classArm.classTeacherId,
                    schoolId,
                    type: "COMMENTS_GENERATED",
                    title: "AI Comments Generated",
                    message: `AI comments were generated for ${className}.`,
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType },
                });
            }

            return NextResponse.json({
                message: "AI comments generated successfully.",
                classWorkflow: updated,
            });
        }

        if (action === "update_student_comments") {
            const studentId: string | undefined = body.studentId;
            const classTeacherComment: string | undefined = body.classTeacherComment;
            const principalComment: string | undefined = body.principalComment;

            if (!studentId) {
                return NextResponse.json({ error: "studentId is required" }, { status: 400 });
            }

            const studentWorkflow = await prisma.studentReportWorkflow.findFirst({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    studentId,
                },
            });

            if (!studentWorkflow) {
                return NextResponse.json({ error: "Student workflow not found" }, { status: 404 });
            }

            const updateData: any = {};
            if (classTeacherComment !== undefined) updateData.classTeacherComment = classTeacherComment;
            if (principalComment !== undefined) updateData.principalComment = principalComment;
            if (studentWorkflow.status === "COMMENTS_PENDING") {
                updateData.status = "COMMENTS_READY";
            }

            const updatedWorkflow = await prisma.studentReportWorkflow.update({
                where: { id: studentWorkflow.id },
                data: updateData,
            });

            await prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId,
                    },
                },
                update: {
                    classArmId,
                    ...(classTeacherComment !== undefined ? { classTeacherComment } : {}),
                    ...(principalComment !== undefined ? { principalComment } : {}),
                },
                create: {
                    studentId,
                    termId,
                    classArmId,
                    classTeacherComment: classTeacherComment || "",
                    principalComment: principalComment || "",
                },
            });

            return NextResponse.json({
                message: "Student comments updated successfully.",
                studentWorkflow: updatedWorkflow,
            });
        }

        if (action === "regenerate_student_comment") {
            const studentId: string | undefined = body.studentId;
            const target: "classTeacher" | "principal" | undefined = body.target;

            if (!studentId || !target) {
                return NextResponse.json({ error: "studentId and target are required" }, { status: 400 });
            }

            const studentWorkflow = await prisma.studentReportWorkflow.findFirst({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    studentId,
                },
            });

            if (!studentWorkflow) {
                return NextResponse.json({ error: "Student workflow not found" }, { status: 404 });
            }

            const context = await buildCommentContext({
                schoolId,
                classArmId,
                studentId,
                termId,
            });

            const generated = target === "classTeacher"
                ? await generateTeacherComment(schoolId, context)
                : await generatePrincipalComment(schoolId, context);

            const updateData =
                target === "classTeacher"
                    ? { classTeacherComment: generated }
                    : { principalComment: generated };

            const updatedWorkflow = await prisma.studentReportWorkflow.update({
                where: { id: studentWorkflow.id },
                data: {
                    ...updateData,
                    status: studentWorkflow.status === "COMMENTS_PENDING" ? "COMMENTS_READY" : studentWorkflow.status,
                },
            });

            await prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId,
                    },
                },
                update: {
                    classArmId,
                    ...updateData,
                },
                create: {
                    studentId,
                    termId,
                    classArmId,
                    classTeacherComment: target === "classTeacher" ? generated : "",
                    principalComment: target === "principal" ? generated : "",
                },
            });

            return NextResponse.json({
                message: "Comment regenerated successfully.",
                generatedComment: generated,
                studentWorkflow: updatedWorkflow,
            });
        }

        if (action === "class_approve_student") {
            const studentId: string | undefined = body.studentId;
            if (!studentId) {
                return NextResponse.json({ error: "studentId is required" }, { status: 400 });
            }

            const studentWorkflow = await prisma.studentReportWorkflow.findFirst({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    studentId,
                },
            });

            if (!studentWorkflow) {
                return NextResponse.json({ error: "Student workflow not found" }, { status: 404 });
            }

            if (studentWorkflow.status === "COMMENTS_PENDING") {
                return NextResponse.json({ error: "Generate comments before approval." }, { status: 400 });
            }

            const updatedWorkflow = await prisma.studentReportWorkflow.update({
                where: { id: studentWorkflow.id },
                data: {
                    status: "CLASS_APPROVED",
                    classTeacherApprovedAt: new Date(),
                    classTeacherApprovedById: userId,
                },
            });

            const pendingClassApprovals = await prisma.studentReportWorkflow.count({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    status: { notIn: ["CLASS_APPROVED", "ADMIN_APPROVED", "PUBLISHED"] },
                },
            });

            if (pendingClassApprovals === 0) {
                await prisma.classReportWorkflow.update({
                    where: { id: classWorkflow.id },
                    data: { status: "READY_FOR_ADMIN_REVIEW" },
                });
            }

            const admins = await prisma.user.findMany({
                where: {
                    schoolId,
                    isActive: true,
                    OR: [
                        { roles: { has: "SCHOOL_ADMIN" } },
                        { roles: { has: "SUPER_ADMIN" } },
                    ],
                },
                select: { id: true },
            });

            await createUserNotifications(
                admins.map((admin) => admin.id),
                {
                    schoolId,
                    type: "STUDENT_REPORT_CLASS_APPROVED",
                    title: "Student Report Awaiting Admin Review",
                    message: `${className} has student report(s) approved by class teacher and awaiting admin review.`,
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType },
                }
            );

            return NextResponse.json({
                message: "Student report approved by class teacher.",
                studentWorkflow: updatedWorkflow,
            });
        }

        if (action === "admin_review_student") {
            if (!isAdmin) {
                return NextResponse.json({ error: "Only admin can review this step." }, { status: 403 });
            }

            const studentId: string | undefined = body.studentId;
            const decision: "approve" | "reject" | undefined = body.decision;
            const note: string | undefined = typeof body.note === "string" ? body.note.trim() : undefined;

            if (!studentId || !decision) {
                return NextResponse.json({ error: "studentId and decision are required" }, { status: 400 });
            }

            if (decision === "reject" && !note) {
                return NextResponse.json({ error: "Rejection note is required." }, { status: 400 });
            }

            const studentWorkflow = await prisma.studentReportWorkflow.findFirst({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    studentId,
                },
            });

            if (!studentWorkflow) {
                return NextResponse.json({ error: "Student workflow not found" }, { status: 404 });
            }

            const updatedWorkflow = await prisma.studentReportWorkflow.update({
                where: { id: studentWorkflow.id },
                data: {
                    status: decision === "approve" ? "ADMIN_APPROVED" : "ADMIN_REJECTED",
                    adminReviewedAt: new Date(),
                    adminReviewedById: userId,
                    adminReviewNote: decision === "reject" ? note || null : null,
                },
            });

            if (decision === "reject" && classArm.classTeacherId) {
                await createUserNotification({
                    userId: classArm.classTeacherId,
                    schoolId,
                    type: "STUDENT_REPORT_ADMIN_REJECTED",
                    title: "Student Report Rejected",
                    message: `An admin rejected a student report in ${className}. ${note || ""}`.trim(),
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType, studentId, note: note || null },
                });
            }

            if (decision === "approve" && classArm.classTeacherId) {
                await createUserNotification({
                    userId: classArm.classTeacherId,
                    schoolId,
                    type: "STUDENT_REPORT_ADMIN_APPROVED",
                    title: "Student Report Approved By Admin",
                    message: `A student report in ${className} has been approved by admin.`,
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType, studentId },
                });
            }

            return NextResponse.json({
                message: decision === "approve" ? "Student report approved." : "Student report rejected.",
                studentWorkflow: updatedWorkflow,
            });
        }

        if (action === "publish_class") {
            if (!isAdmin) {
                return NextResponse.json({ error: "Only admin can publish results." }, { status: 403 });
            }

            const blockers = await prisma.studentReportWorkflow.count({
                where: {
                    classReportWorkflowId: classWorkflow.id,
                    status: { notIn: ["ADMIN_APPROVED", "PUBLISHED"] },
                },
            });

            if (blockers > 0 && !adminOverride) {
                return NextResponse.json(
                    { error: "All student reports must be admin-approved before publishing." },
                    { status: 400 }
                );
            }

            // Admin override: auto-approve all pending student workflows before publishing
            if (blockers > 0 && adminOverride) {
                await prisma.studentReportWorkflow.updateMany({
                    where: {
                        classReportWorkflowId: classWorkflow.id,
                        status: { notIn: ["ADMIN_APPROVED", "PUBLISHED"] },
                    },
                    data: {
                        status: "ADMIN_APPROVED",
                        adminReviewedAt: new Date(),
                        adminReviewedById: userId,
                    },
                });
            }

            const workflowStudents = await prisma.studentReportWorkflow.findMany({
                where: { classReportWorkflowId: classWorkflow.id },
                select: { studentId: true },
            });
            const workflowStudentIds = workflowStudents.map((entry) => entry.studentId);
            if (workflowStudentIds.length === 0) {
                return NextResponse.json({ error: "No students found for this class workflow." }, { status: 400 });
            }

            const publishedAt = new Date();
            const downloadExpiresAt = plusDays(publishedAt, 3);

            const updatedClassWorkflow = await prisma.$transaction(async (tx) => {
                const updated = await tx.classReportWorkflow.update({
                    where: { id: classWorkflow.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt,
                        publishedById: userId,
                        unpublishedAt: null,
                        unpublishedById: null,
                    },
                });

                await tx.studentReportWorkflow.updateMany({
                    where: { classReportWorkflowId: classWorkflow.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt,
                        downloadExpiresAt,
                    },
                });

                const chunkSize = 500;
                for (let i = 0; i < workflowStudentIds.length; i += chunkSize) {
                    const chunk = workflowStudentIds.slice(i, i + chunkSize);
                    await tx.reportCard.createMany({
                        data: chunk.map((studentId) => ({
                            studentId,
                            termId,
                            classArmId,
                            isPublished: true,
                            publishedAt,
                        })),
                        skipDuplicates: true,
                    });

                    await tx.reportCard.updateMany({
                        where: {
                            termId,
                            studentId: { in: chunk },
                        },
                        data: {
                            classArmId,
                            isPublished: true,
                            publishedAt,
                        },
                    });
                }

                const publishedCount = await tx.reportCard.count({
                    where: {
                        termId,
                        studentId: { in: workflowStudentIds },
                        isPublished: true,
                    },
                });
                if (publishedCount !== workflowStudentIds.length) {
                    throw new Error("Not all report cards were published for the selected class.");
                }

                return updated;
            });

            const { studentUserIds, parentUserIds } = await getStudentAndParentNotificationUserIds(
                workflowStudentIds
            );

            if (classArm.classTeacherId) {
                await createUserNotification({
                    userId: classArm.classTeacherId,
                    schoolId,
                    type: "RESULT_PUBLISHED",
                    title: "Result Published",
                    message: `${className} result has been published by ${actorName}.`,
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType },
                });
            }

            await createUserNotifications(studentUserIds, {
                schoolId,
                type: "RESULT_PUBLISHED",
                title: "Report Card Published",
                message: `${className} result is now available in your portal.`,
                href: "/dashboard/reports",
                metadata: { classArmId, termId, reportType },
            });

            await createUserNotifications(parentUserIds, {
                schoolId,
                type: "RESULT_PUBLISHED",
                title: "Ward Report Published",
                message: `${className} result is now available in the parent portal.`,
                href: "/dashboard/reports",
                metadata: { classArmId, termId, reportType },
            });

            return NextResponse.json({
                message: "Class result published successfully.",
                classWorkflow: updatedClassWorkflow,
                publishedAt,
                downloadExpiresAt,
            });
        }

        if (action === "unpublish_class") {
            if (!isAdmin) {
                return NextResponse.json({ error: "Only admin can unpublish results." }, { status: 403 });
            }

            const workflowStudents = await prisma.studentReportWorkflow.findMany({
                where: { classReportWorkflowId: classWorkflow.id },
                select: { studentId: true },
            });
            const workflowStudentIds = workflowStudents.map((entry) => entry.studentId);

            const updatedClassWorkflow = await prisma.$transaction(async (tx) => {
                const updated = await tx.classReportWorkflow.update({
                    where: { id: classWorkflow.id },
                    data: {
                        status: "UNPUBLISHED",
                        unpublishedAt: new Date(),
                        unpublishedById: userId,
                    },
                });

                await tx.studentReportWorkflow.updateMany({
                    where: { classReportWorkflowId: classWorkflow.id },
                    data: {
                        status: "UNPUBLISHED",
                        publishedAt: null,
                        downloadExpiresAt: null,
                    },
                });

                const chunkSize = 500;
                for (let i = 0; i < workflowStudentIds.length; i += chunkSize) {
                    const chunk = workflowStudentIds.slice(i, i + chunkSize);
                    await tx.reportCard.updateMany({
                        where: {
                            termId,
                            studentId: { in: chunk },
                        },
                        data: {
                            isPublished: false,
                            publishedAt: null,
                        },
                    });
                }

                return updated;
            });
            const { studentUserIds, parentUserIds } = await getStudentAndParentNotificationUserIds(
                workflowStudentIds
            );

            if (classArm.classTeacherId) {
                await createUserNotification({
                    userId: classArm.classTeacherId,
                    schoolId,
                    type: "RESULT_UNPUBLISHED",
                    title: "Result Unpublished",
                    message: `${className} result has been unpublished by ${actorName}.`,
                    href: "/dashboard/reports",
                    metadata: { classArmId, termId, reportType },
                });
            }

            await createUserNotifications(studentUserIds, {
                schoolId,
                type: "RESULT_UNPUBLISHED",
                title: "Report Card Unpublished",
                message: `${className} result has been removed from the portal.`,
                href: "/dashboard/reports",
                metadata: { classArmId, termId, reportType },
            });

            await createUserNotifications(parentUserIds, {
                schoolId,
                type: "RESULT_UNPUBLISHED",
                title: "Ward Report Unpublished",
                message: `${className} result has been removed from the parent portal.`,
                href: "/dashboard/reports",
                metadata: { classArmId, termId, reportType },
            });

            return NextResponse.json({
                message: "Class result unpublished successfully.",
                classWorkflow: updatedClassWorkflow,
            });
        }

        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    } catch (error) {
        console.error("Failed to process report workflow action:", error);
        return NextResponse.json({ error: "Failed to process workflow action" }, { status: 500 });
    }
}
