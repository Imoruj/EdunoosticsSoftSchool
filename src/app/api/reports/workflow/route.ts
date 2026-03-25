import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createUserNotification, createUserNotifications } from "@/lib/userNotifications";
import { generatePrincipalComment, generateTeacherComment } from "@/services/aiService";

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
};

async function getExpectedSubjects(
    classArmId: string,
    termId: string
): Promise<Array<{ subjectId: string; subjectName: string }>> {
    const [assigned, scored] = await Promise.all([
        prisma.subjectClassArm.findMany({
            where: { classArmId },
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
    ]);

    const scoredSubjectIds = scored.map((item) => item.subjectId);
    const scoredSubjects =
        scoredSubjectIds.length > 0
            ? await prisma.subject.findMany({
                where: { id: { in: scoredSubjectIds } },
                select: { id: true, name: true },
            })
            : [];

    const subjectMap = new Map<string, string>();
    assigned.forEach((item) => subjectMap.set(item.subjectId, item.subject.name));
    scoredSubjects.forEach((item) => subjectMap.set(item.id, item.name));

    return Array.from(subjectMap.entries())
        .map(([subjectId, subjectName]) => ({ subjectId, subjectName }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

async function getScoreBroadcastSummary(schoolId: string, classArmId: string, termId: string) {
    const expectedSubjects = await getExpectedSubjects(classArmId, termId);
    if (expectedSubjects.length === 0) {
        return {
            expectedSubjects: 0,
            broadcastedSubjects: 0,
            allBroadcasted: false,
            statuses: [] as ScoreBroadcastStatus[],
            pendingSubjects: [] as ScoreBroadcastStatus[],
        };
    }

    const workflows = await prisma.scoreSheetWorkflow.findMany({
        where: {
            schoolId,
            classArmId,
            termId,
            subjectId: { in: expectedSubjects.map((item) => item.subjectId) },
        },
        select: {
            subjectId: true,
            status: true,
        },
    });

    const statusMap = new Map(workflows.map((workflow) => [workflow.subjectId, workflow.status]));
    const statuses: ScoreBroadcastStatus[] = expectedSubjects.map((subject) => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        status: statusMap.get(subject.subjectId) || "PENDING_REVIEW",
    }));
    const broadcastedSubjects = statuses.filter((item) => item.status === "BROADCASTED").length;
    const pendingSubjects = statuses.filter((item) => item.status !== "BROADCASTED");

    return {
        expectedSubjects: expectedSubjects.length,
        broadcastedSubjects,
        allBroadcasted: expectedSubjects.length > 0 && broadcastedSubjects === expectedSubjects.length,
        statuses,
        pendingSubjects,
    };
}

async function buildCommentContext(params: {
    schoolId: string;
    studentId: string;
    termId: string;
    classArmId: string;
}) {
    const [student, reportCard, term] = await Promise.all([
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

    return {
        name: `${student.firstName} ${student.lastName}`,
        gender: student.gender,
        term: term?.name || "",
        average: reportCard?.average?.toNumber() || 0,
        position: reportCard?.classPosition || 0,
        attendance: reportCard
            ? `${reportCard.daysPresent || 0}/${reportCard.totalSchoolDays || 0}`
            : "N/A",
        traits: traitsSummary,
    };
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
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
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
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
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
            if (!scoreSummary.allBroadcasted) {
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
                classWorkflow.status !== "RESULT_BROADCASTED" &&
                classWorkflow.status !== "COMMENTS_GENERATED" &&
                classWorkflow.status !== "READY_FOR_ADMIN_REVIEW"
            ) {
                return NextResponse.json(
                    { error: "Broadcast class result before generating comments." },
                    { status: 400 }
                );
            }

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

            if (blockers > 0) {
                return NextResponse.json(
                    { error: "All student reports must be admin-approved before publishing." },
                    { status: 400 }
                );
            }

            const publishedAt = new Date();
            const downloadExpiresAt = plusDays(publishedAt, 3);

            const [updatedClassWorkflow] = await prisma.$transaction([
                prisma.classReportWorkflow.update({
                    where: { id: classWorkflow.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt,
                        publishedById: userId,
                        unpublishedAt: null,
                        unpublishedById: null,
                    },
                }),
                prisma.studentReportWorkflow.updateMany({
                    where: { classReportWorkflowId: classWorkflow.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt,
                        downloadExpiresAt,
                    },
                }),
                prisma.reportCard.updateMany({
                    where: { termId, classArmId },
                    data: {
                        isPublished: true,
                        publishedAt,
                    },
                }),
            ]);

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

            const [updatedClassWorkflow] = await prisma.$transaction([
                prisma.classReportWorkflow.update({
                    where: { id: classWorkflow.id },
                    data: {
                        status: "UNPUBLISHED",
                        unpublishedAt: new Date(),
                        unpublishedById: userId,
                    },
                }),
                prisma.studentReportWorkflow.updateMany({
                    where: { classReportWorkflowId: classWorkflow.id },
                    data: {
                        status: "UNPUBLISHED",
                        publishedAt: null,
                        downloadExpiresAt: null,
                    },
                }),
                prisma.reportCard.updateMany({
                    where: { termId, classArmId },
                    data: {
                        isPublished: false,
                        publishedAt: null,
                    },
                }),
            ]);

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

