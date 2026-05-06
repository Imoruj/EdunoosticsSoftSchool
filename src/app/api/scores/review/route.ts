import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const SCORE_WORKFLOW_TABLE_HINTS = [
    "ScoreSheetWorkflow",
    "score_sheet_workflow",
];

const VALID_STATUSES = new Set([
    "PENDING_REVIEW",
    "APPROVED",
    "REJECTED",
    "BROADCASTED",
]);

function isMissingPrismaRelationError(error: unknown, relationHints: string[]) {
    if (!error || typeof error !== "object") return false;

    const maybeError = error as {
        code?: string;
        message?: string;
        meta?: { table?: string; column?: string };
    };

    const code = maybeError.code;
    if (code !== "P2021" && code !== "P2022") return false;

    const message = (maybeError.message || "").toLowerCase();
    const metaTable = (maybeError.meta?.table || "").toLowerCase();
    const metaColumn = (maybeError.meta?.column || "").toLowerCase();

    return relationHints.some((hint) => {
        const normalizedHint = hint.toLowerCase();
        return (
            message.includes(normalizedHint) ||
            metaTable.includes(normalizedHint) ||
            metaColumn.includes(normalizedHint)
        );
    });
}

function buildTeacherName(firstName?: string | null, lastName?: string | null) {
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return fullName || "Unknown Teacher";
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
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!schoolId || !userId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Only class teachers or admins can access score review queue." },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const workflowId = searchParams.get("workflowId");
        const statusParam = (searchParams.get("status") || "PENDING_REVIEW").toUpperCase();
        let termId = searchParams.get("termId");

        if (statusParam !== "ALL" && !VALID_STATUSES.has(statusParam)) {
            return NextResponse.json(
                { error: "Invalid status filter." },
                { status: 400 }
            );
        }

        const [currentSession, latestSession] = await Promise.all([
            prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: {
                    id: true,
                    terms: {
                        orderBy: { termNumber: "asc" },
                        select: { id: true, isCurrent: true },
                    },
                },
            }),
            prisma.academicSession.findFirst({
                where: { schoolId },
                orderBy: { startDate: "desc" },
                select: {
                    id: true,
                    terms: {
                        orderBy: { termNumber: "asc" },
                        select: { id: true, isCurrent: true },
                    },
                },
            }),
        ]);

        const assignedSession = currentSession || latestSession;
        const allowedTermIds = new Set((assignedSession?.terms || []).map((term) => term.id));
        const defaultAssignedTermId =
            assignedSession?.terms.find((term) => term.isCurrent)?.id ||
            assignedSession?.terms[0]?.id ||
            null;

        if (!termId) {
            termId = defaultAssignedTermId;
        }

        if (!termId) {
            return NextResponse.json(
                { error: "No active term found. Please configure terms." },
                { status: 400 }
            );
        }

        if (!allowedTermIds.has(termId)) {
            return NextResponse.json(
                { error: "Selected term is outside the active session configured by admin." },
                { status: 403 }
            );
        }

        if (classArmId) {
            const classArm = await prisma.classArm.findFirst({
                where: {
                    id: classArmId,
                    class: { schoolId },
                },
                select: { id: true, classTeacherId: true },
            });

            if (!classArm) {
                return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
            }

            if (!isAdmin && classArm.classTeacherId !== userId) {
                return NextResponse.json({ error: "Unauthorized for this class arm" }, { status: 403 });
            }
        }

        const where: any = {
            schoolId,
            termId,
        };

        if (classArmId) where.classArmId = classArmId;
        if (!isAdmin) where.classTeacherId = userId;
        if (workflowId) where.id = workflowId;
        if (statusParam !== "ALL") where.status = statusParam as any;

        let workflows: any[] = [];
        try {
            workflows = await prisma.scoreSheetWorkflow.findMany({
                where,
                include: {
                    subject: { select: { id: true, name: true } },
                    classArm: {
                        select: {
                            id: true,
                            armName: true,
                            class: { select: { name: true } },
                        },
                    },
                    subjectTeacher: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    reviewedBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
            });
        } catch (workflowError) {
            if (isMissingPrismaRelationError(workflowError, SCORE_WORKFLOW_TABLE_HINTS)) {
                return NextResponse.json({
                    termId,
                    workflows: [],
                    summary: {
                        total: 0,
                        pendingReview: 0,
                        approved: 0,
                        rejected: 0,
                        broadcasted: 0,
                    },
                    warning: "Score workflow tables are not available yet.",
                });
            }
            throw workflowError;
        }

        const normalized = workflows.map((workflow) => ({
            id: workflow.id,
            termId: workflow.termId,
            classArmId: workflow.classArmId,
            subjectId: workflow.subjectId,
            status: workflow.status,
            rejectionReason: workflow.rejectionReason,
            reviewedAt: workflow.reviewedAt,
            broadcastedAt: workflow.broadcastedAt,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            classLabel: `${workflow.classArm.class.name} ${workflow.classArm.armName}`,
            subjectName: workflow.subject.name,
            subjectTeacherName: buildTeacherName(
                workflow.subjectTeacher?.firstName,
                workflow.subjectTeacher?.lastName
            ),
            reviewedByName: workflow.reviewedBy
                ? buildTeacherName(workflow.reviewedBy.firstName, workflow.reviewedBy.lastName)
                : null,
        }));

        const summary = normalized.reduce(
            (acc, item) => {
                acc.total += 1;
                if (item.status === "PENDING_REVIEW") acc.pendingReview += 1;
                if (item.status === "APPROVED") acc.approved += 1;
                if (item.status === "REJECTED") acc.rejected += 1;
                if (item.status === "BROADCASTED") acc.broadcasted += 1;
                return acc;
            },
            {
                total: 0,
                pendingReview: 0,
                approved: 0,
                rejected: 0,
                broadcasted: 0,
            }
        );

        return NextResponse.json({
            termId,
            workflows: normalized,
            summary,
        });
    } catch (error: any) {
        console.error("Error loading score review queue:", error);
        return NextResponse.json(
            { error: "Failed to load score review queue" },
            { status: 500 }
        );
    }
}

