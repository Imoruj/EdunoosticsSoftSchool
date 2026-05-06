import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createUserNotification } from "@/lib/userNotifications";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

type WorkflowAction = "approve" | "reject" | "broadcast";

function getClassLabel(className: string | null | undefined, armName: string | null | undefined) {
    return [className, armName].filter(Boolean).join(" ").trim() || "this class";
}

async function getExpectedSubjectIds(classArmId: string, termId: string): Promise<string[]> {
    const [assigned, scored] = await Promise.all([
        prisma.subjectClassArm.findMany({
            where: { classArmId },
            select: { subjectId: true },
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

    const ids = new Set<string>();
    assigned.forEach((item) => ids.add(item.subjectId));
    scored.forEach((item) => ids.add(item.subjectId));
    return Array.from(ids);
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const termId = searchParams.get("termId");
        const subjectId = searchParams.get("subjectId");

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

        const isClassTeacherForArm = classArm.classTeacherId === userId;
        const teacherAssignments = await prisma.teacherSubject.findMany({
            where: {
                teacherId: userId,
                classArmId,
                ...(subjectId ? { subjectId } : {}),
            },
            select: { subjectId: true },
        });
        const assignedSubjectIds = new Set(teacherAssignments.map((item) => item.subjectId));
        const isSubjectTeacherForRequestedSubject = subjectId ? assignedSubjectIds.has(subjectId) : assignedSubjectIds.size > 0;

        if (!isAdmin && !isClassTeacherForArm && !isSubjectTeacherForRequestedSubject) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (subjectId) {
            const workflow = await prisma.scoreSheetWorkflow.findUnique({
                where: {
                    termId_classArmId_subjectId: {
                        termId,
                        classArmId,
                        subjectId,
                    },
                },
                include: {
                    subject: { select: { name: true } },
                    classArm: {
                        select: {
                            armName: true,
                            class: { select: { name: true } },
                        },
                    },
                    reviewedBy: { select: { firstName: true, lastName: true } },
                },
            });

            return NextResponse.json({
                workflow,
                permissions: {
                    canReview: isAdmin || isClassTeacherForArm,
                    canBroadcast: isAdmin || isSubjectTeacherForRequestedSubject,
                },
            });
        }

        const workflowWhere: any = {
            schoolId,
            termId,
            classArmId,
        };

        if (!isAdmin && !isClassTeacherForArm) {
            workflowWhere.subjectId = { in: Array.from(assignedSubjectIds) };
        }

        const workflows = await prisma.scoreSheetWorkflow.findMany({
            where: workflowWhere,
            include: {
                subject: { select: { id: true, name: true } },
                reviewedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { subject: { name: "asc" } },
        });

        const expectedSubjectIds = await getExpectedSubjectIds(classArmId, termId);
        const subjectStatus = expectedSubjectIds.map((id) => {
            const workflow = workflows.find((item) => item.subjectId === id);
            return {
                subjectId: id,
                status: workflow?.status || "PENDING_REVIEW",
                workflowId: workflow?.id || null,
            };
        });
        const broadcastedCount = subjectStatus.filter((item) => item.status === "BROADCASTED").length;

        return NextResponse.json({
            classArm: {
                id: classArm.id,
                name: getClassLabel(classArm.class.name, classArm.armName),
            },
            workflows,
            summary: {
                expectedSubjects: expectedSubjectIds.length,
                broadcastedSubjects: broadcastedCount,
                allBroadcasted: expectedSubjectIds.length > 0 && broadcastedCount === expectedSubjectIds.length,
            },
            permissions: {
                canReview: isAdmin || isClassTeacherForArm,
                canBroadcast: isAdmin || isSubjectTeacherForRequestedSubject,
            },
        });
    } catch (error) {
        console.error("Failed to load score workflow:", error);
        return NextResponse.json({ error: "Failed to load score workflow" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        const body = await req.json();
        const classArmId: string | undefined = body.classArmId;
        const termId: string | undefined = body.termId;
        const subjectId: string | undefined = body.subjectId;
        const action: WorkflowAction | undefined = body.action;
        const note: string | undefined = typeof body.note === "string" ? body.note.trim() : undefined;

        if (!classArmId || !termId || !subjectId || !action) {
            return NextResponse.json(
                { error: "classArmId, termId, subjectId and action are required" },
                { status: 400 }
            );
        }

        if (!["approve", "reject", "broadcast"].includes(action)) {
            return NextResponse.json({ error: "Invalid workflow action" }, { status: 400 });
        }

        if (action === "reject" && !note) {
            return NextResponse.json({ error: "A rejection note is required" }, { status: 400 });
        }

        const [classArm, subject, teacherAssignment] = await Promise.all([
            prisma.classArm.findFirst({
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
            }),
            prisma.subject.findFirst({
                where: { id: subjectId, schoolId },
                select: { id: true, name: true },
            }),
            prisma.teacherSubject.findFirst({
                where: {
                    teacherId: userId,
                    subjectId,
                    classArmId,
                },
                select: { id: true },
            }),
        ]);

        if (!classArm || !subject) {
            return NextResponse.json({ error: "Invalid class arm or subject" }, { status: 404 });
        }

        const isClassTeacherForArm = classArm.classTeacherId === userId;
        const isSubjectTeacherForSubject = !!teacherAssignment;

        if (action === "approve" || action === "reject") {
            if (!isAdmin && !isClassTeacherForArm) {
                return NextResponse.json({ error: "Only class teacher or admin can review scores" }, { status: 403 });
            }
        }

        if (action === "broadcast") {
            if (!isAdmin && !isSubjectTeacherForSubject) {
                return NextResponse.json({ error: "Only subject teacher or admin can broadcast scores" }, { status: 403 });
            }
        }

        const scoreWorkflow = await prisma.scoreSheetWorkflow.findUnique({
            where: {
                termId_classArmId_subjectId: {
                    termId,
                    classArmId,
                    subjectId,
                },
            },
        });

        if (!scoreWorkflow) {
            return NextResponse.json(
                { error: "No score submission found for this subject. Save scores first." },
                { status: 404 }
            );
        }

        if (action === "broadcast" && scoreWorkflow.status !== "APPROVED") {
            return NextResponse.json(
                { error: "Only approved scores can be broadcasted." },
                { status: 400 }
            );
        }

        const classLabel = getClassLabel(classArm.class.name, classArm.armName);
        const actorName = (user.name as string) || "A teacher";

        const { updatedWorkflow } = await prisma.$transaction(async (tx) => {
            let nextStatus = scoreWorkflow.status;
            let actionType: "APPROVED" | "REJECTED" | "BROADCASTED";
            const updateData: any = {};

            if (action === "approve") {
                nextStatus = "APPROVED";
                actionType = "APPROVED";
                updateData.status = "APPROVED";
                updateData.rejectionReason = null;
                updateData.reviewedAt = new Date();
                updateData.reviewedById = userId;
            } else if (action === "reject") {
                nextStatus = "REJECTED";
                actionType = "REJECTED";
                updateData.status = "REJECTED";
                updateData.rejectionReason = note || null;
                updateData.reviewedAt = new Date();
                updateData.reviewedById = userId;
                updateData.broadcastedAt = null;
                updateData.broadcastedById = null;
            } else {
                nextStatus = "BROADCASTED";
                actionType = "BROADCASTED";
                updateData.status = "BROADCASTED";
                updateData.broadcastedAt = new Date();
                updateData.broadcastedById = userId;
            }

            const updated = await tx.scoreSheetWorkflow.update({
                where: { id: scoreWorkflow.id },
                data: updateData,
            });

            await tx.scoreSheetActionLog.create({
                data: {
                    workflowId: scoreWorkflow.id,
                    actorId: userId,
                    action: actionType,
                    note: note || null,
                    metadata: {
                        termId,
                        classArmId,
                        subjectId,
                        nextStatus,
                    },
                },
            });

            return { updatedWorkflow: updated };
        });

        if (action === "approve" && scoreWorkflow.subjectTeacherId && scoreWorkflow.subjectTeacherId !== userId) {
            await createUserNotification({
                userId: scoreWorkflow.subjectTeacherId,
                schoolId,
                type: "SCORE_APPROVED",
                title: "Score Approved",
                message: `${subject.name} scores for ${classLabel} were approved by ${actorName}.`,
                href: "/dashboard/scores",
                metadata: { classArmId, subjectId, termId, workflowId: scoreWorkflow.id },
            });
        }

        if (action === "reject" && scoreWorkflow.subjectTeacherId && scoreWorkflow.subjectTeacherId !== userId) {
            await createUserNotification({
                userId: scoreWorkflow.subjectTeacherId,
                schoolId,
                type: "SCORE_REJECTED",
                title: "Score Rejected",
                message: `${subject.name} scores for ${classLabel} were rejected. ${note || ""}`.trim(),
                href: "/dashboard/scores",
                metadata: {
                    classArmId,
                    subjectId,
                    termId,
                    workflowId: scoreWorkflow.id,
                    note: note || null,
                },
            });
        }

        if (action === "broadcast" && scoreWorkflow.classTeacherId && scoreWorkflow.classTeacherId !== userId) {
            await createUserNotification({
                userId: scoreWorkflow.classTeacherId,
                schoolId,
                type: "SCORE_BROADCASTED",
                title: "Subject Score Broadcasted",
                message: `${subject.name} scores for ${classLabel} were broadcasted by ${actorName}.`,
                href: "/dashboard/reports",
                metadata: { classArmId, subjectId, termId, workflowId: scoreWorkflow.id },
            });
        }

        return NextResponse.json({
            message:
                action === "approve"
                    ? "Scores approved successfully."
                    : action === "reject"
                        ? "Scores rejected successfully."
                        : "Scores broadcasted successfully.",
            workflow: updatedWorkflow,
        });
    } catch (error) {
        console.error("Failed to update score workflow:", error);
        return NextResponse.json({ error: "Failed to update score workflow" }, { status: 500 });
    }
}

