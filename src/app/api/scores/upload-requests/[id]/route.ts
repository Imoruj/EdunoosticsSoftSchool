import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createUserNotification, getSchoolAdminUserIds } from "@/lib/userNotifications";
import { publishNotificationRefresh } from "@/lib/realtimeNotifications";
import { calculateEndOfTermScoreTotals, mapAssessmentTypesToScoreFields } from "@/lib/assessment-types";
import {
    recomputeCompositeParentScores,
    resolveSubjectScoreProfile,
} from "@/lib/composite-subjects";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// Grade calculation helper
function normalizeScoreForRuleScale(total: number, rules: any[]) {
    const maxRuleScore = rules.reduce((max, rule) => Math.max(max, Number(rule.maxScore) || 0), 0);
    if (maxRuleScore <= 50 && total > 50) {
        return Math.round(total / 2);
    }
    return total;
}

function calculateGrade(total: number, rules: any[]) {
    const normalizedTotal = Math.round(normalizeScoreForRuleScale(total, rules) * 10) / 10;
    const rule = rules.find(r => normalizedTotal >= Number(r.minScore) && normalizedTotal <= Number(r.maxScore));
    if (rule) return { grade: rule.grade, remark: rule.remark };
    return { grade: "-", remark: "-" };
}

function classLevelToCategory(level: string | undefined | null): string | null {
    if (!level) return null;
    if (level === "PRIMARY" || level === "NURSERY") return "PRIMARY";
    if (level === "JUNIOR_SECONDARY") return "JUNIOR_SECONDARY";
    if (level === "SENIOR_SECONDARY") return "SENIOR_SECONDARY";
    return null;
}

// PATCH: Approve or reject an upload request
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const activeSchoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { action, rejectionReason } = await req.json();

        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
        }

        const request = await prisma.scoreUploadRequest.findUnique({
            where: { id: id },
        });

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (request.schoolId !== activeSchoolId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (request.status !== "PENDING") {
            return NextResponse.json(
                { error: `This request has already been ${request.status.toLowerCase()}` },
                { status: 400 }
            );
        }

        if (action === "reject") {
            const adminIds = await getSchoolAdminUserIds(request.schoolId);
            const updated = await prisma.scoreUploadRequest.update({
                where: { id: id },
                data: {
                    status: "REJECTED",
                    reviewedAt: new Date(),
                    reviewedById: user.id,
                    rejectionReason: rejectionReason || null,
                },
            });

            if (request.uploaderId !== user.id) {
                await createUserNotification({
                    userId: request.uploaderId,
                    schoolId: request.schoolId,
                    type: "SCORE_REJECTED",
                    title: "Score Upload Rejected",
                    message: `Your score upload request was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
                    href: "/dashboard/scores",
                    metadata: {
                        requestId: request.id,
                        termId: request.termId,
                        classArmId: request.classArmId,
                        subjectId: request.subjectId,
                        rejectionReason: rejectionReason || null,
                    },
                });
            }

            publishNotificationRefresh(adminIds);
            return NextResponse.json({ request: updated, message: "Request rejected" });
        }

        // Approve: apply scores
        const scoreData = request.scoreData as any[];
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        const selectedTerm = await prisma.term.findUnique({
            where: { id: request.termId },
            include: { session: { select: { id: true } } },
        });

        if (!selectedTerm?.session?.id) {
            return NextResponse.json({ error: "Invalid term on upload request." }, { status: 400 });
        }

        const [allGradingRules, resolvedProfile, classArmWithLevel] = await Promise.all([
            prisma.gradingRule.findMany({
                where: { schoolId },
                orderBy: { minScore: "desc" },
            }),
            resolveSubjectScoreProfile(prisma, {
                schoolId,
                sessionId: selectedTerm.session.id,
                subjectId: request.subjectId,
                classArmId: request.classArmId,
            }),
            prisma.classArm.findFirst({
                where: { id: request.classArmId, class: { schoolId } },
                include: { class: { select: { level: true } } },
            }),
        ]);
        const assessmentTypes = resolvedProfile.assessmentTypes;

        if (resolvedProfile.context.mode === "COMPOSITE_PARENT") {
            return NextResponse.json(
                { error: "Composite parent subjects are calculated from component subjects and cannot receive direct uploads." },
                { status: 400 }
            );
        }

        if (!classArmWithLevel) {
            return NextResponse.json(
                { error: "Invalid class arm for this school." },
                { status: 400 }
            );
        }

        const category = classLevelToCategory(classArmWithLevel.class.level);
        const categoryRules = category
            ? allGradingRules.filter((rule) => rule.schoolCategory === category)
            : [];
        const gradingRules = categoryRules.length > 0
            ? categoryRules
            : allGradingRules.filter((rule) => rule.schoolCategory === null);

        // Fetch existing scores to merge partial uploads
        const studentIds = scoreData.map((s: any) => s.studentId);
        const existingScores = await prisma.score.findMany({
            where: {
                studentId: { in: studentIds },
                subjectId: request.subjectId,
                termId: request.termId,
            },
        });

        const approvalMappedTypes = mapAssessmentTypesToScoreFields(assessmentTypes);

        const upsertOps = scoreData.map((entry: any) => {
            const existing = existingScores.find(s => s.studentId === entry.studentId);
            const existingSv = (existing?.scoreValues ?? {}) as Record<string, unknown>;
            const scoreValues: Record<string, number> = {};
            for (const at of approvalMappedTypes) {
                const uploaded = entry[at.field];
                scoreValues[at.field] = uploaded !== undefined
                    ? Number(uploaded)
                    : Number(existingSv[at.field] ?? 0);
            }
            const exam = scoreValues["exam"] ?? 0;
            const totals = calculateEndOfTermScoreTotals(scoreValues, assessmentTypes);

            const { grade, remark } = calculateGrade(totals.adjustedTotal, gradingRules);

            return prisma.score.upsert({
                where: {
                    studentId_subjectId_termId: {
                        studentId: entry.studentId,
                        subjectId: request.subjectId,
                        termId: request.termId,
                    },
                },
                update: {
                    scoreValues,
                    total: totals.adjustedTotal,
                    grade,
                    remark,
                    isDerived: false,
                    derivedFromCompositeConfigId: null,
                    updatedById: user.id,
                },
                create: {
                    studentId: entry.studentId,
                    subjectId: request.subjectId,
                    termId: request.termId,
                    scoreValues,
                    total: totals.adjustedTotal,
                    grade,
                    remark,
                    isDerived: false,
                    derivedFromCompositeConfigId: null,
                    createdById: user.id,
                    updatedById: user.id,
                },
            });
        });

        const uniqueStudentIds = Array.from(new Set(scoreData.map((entry: any) => entry.studentId)));
        const reportCardOps = uniqueStudentIds.map((studentId) =>
            prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId: request.termId,
                    },
                },
                update: {
                    classArmId: request.classArmId,
                },
                create: {
                    studentId,
                    termId: request.termId,
                    classArmId: request.classArmId,
                },
            })
        );

        // Execute all upserts + status update in a transaction
        await prisma.$transaction([
            ...upsertOps,
            ...reportCardOps,
            prisma.scoreUploadRequest.update({
                where: { id: id },
                data: {
                    status: "APPROVED",
                    reviewedAt: new Date(),
                    reviewedById: user.id,
                },
            }),
        ]);

        if (
            resolvedProfile.context.mode === "COMPOSITE_COMPONENT" &&
            resolvedProfile.context.config?.id
        ) {
            await recomputeCompositeParentScores(prisma, {
                schoolId,
                sessionId: selectedTerm.session.id,
                classArmId: request.classArmId,
                termId: request.termId,
                compositeConfigId: resolvedProfile.context.config.id,
                studentIds: uniqueStudentIds,
                actorUserId: user.id,
            });
        }

        const adminIds = await getSchoolAdminUserIds(schoolId);

        const classArmInfo = await prisma.classArm.findUnique({
            where: { id: request.classArmId },
            select: {
                classTeacherId: true,
                armName: true,
                class: { select: { name: true } },
            },
        });

        const workflow = await prisma.scoreSheetWorkflow.upsert({
            where: {
                termId_classArmId_subjectId: {
                    termId: request.termId,
                    classArmId: request.classArmId,
                    subjectId: request.subjectId,
                },
            },
            update: {
                subjectTeacherId: request.uploaderId,
                classTeacherId: classArmInfo?.classTeacherId || null,
                status: "APPROVED",
                rejectionReason: null,
                reviewedAt: new Date(),
                reviewedById: user.id,
                broadcastedAt: null,
                broadcastedById: null,
            },
            create: {
                schoolId,
                termId: request.termId,
                classArmId: request.classArmId,
                subjectId: request.subjectId,
                subjectTeacherId: request.uploaderId,
                classTeacherId: classArmInfo?.classTeacherId || null,
                status: "APPROVED",
                reviewedAt: new Date(),
                reviewedById: user.id,
            },
        });

        await prisma.scoreSheetActionLog.create({
            data: {
                workflowId: workflow.id,
                actorId: user.id,
                action: "APPROVED",
                note: "Score upload request approved by admin.",
                metadata: {
                    requestId: request.id,
                    termId: request.termId,
                    classArmId: request.classArmId,
                    subjectId: request.subjectId,
                },
            },
        });

        if (request.uploaderId !== user.id) {
            const className = classArmInfo ? `${classArmInfo.class.name} ${classArmInfo.armName}` : "this class";
            await createUserNotification({
                userId: request.uploaderId,
                schoolId,
                type: "SCORE_APPROVED",
                title: "Score Upload Approved",
                message: `Your uploaded scores for ${request.subjectId} in ${className} were approved by admin.`,
                href: "/dashboard/scores",
                metadata: {
                    requestId: request.id,
                    workflowId: workflow.id,
                    termId: request.termId,
                    classArmId: request.classArmId,
                    subjectId: request.subjectId,
                },
            });
        }

        publishNotificationRefresh(adminIds);

        // Pre-compute Subject Positions
        const allScoresForSubject = await prisma.score.findMany({
            where: {
                subjectId: request.subjectId,
                termId: request.termId,
                student: { classArmId: request.classArmId }
            },
            select: { id: true, total: true }
        });

        allScoresForSubject.sort((a, b) => b.total.toNumber() - a.total.toNumber());

        let currentRank = 0;
        let previousTotal: string | null = null;
        const positionOps = allScoresForSubject.map((score, index) => {
            const totalKey = score.total.toString();
            if (previousTotal === null || totalKey !== previousTotal) {
                currentRank = index + 1;
                previousTotal = totalKey;
            }

            return prisma.score.update({
                where: { id: score.id },
                data: { subjectPosition: currentRank }
            });
        });

        if (positionOps.length > 0) {
            await prisma.$transaction(positionOps);
        }
        return NextResponse.json({
            message: `Scores approved and applied for ${scoreData.length} student(s).`,
            appliedCount: scoreData.length,
        });

    } catch (error: any) {
        console.error("Error processing upload request:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

// GET: Get a single upload request with details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const activeSchoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const request = await prisma.scoreUploadRequest.findUnique({
            where: { id: id },
            include: {
                uploader: { select: { firstName: true, lastName: true, email: true } },
                subject: { select: { name: true, code: true } },
                term: {
                    select: {
                        name: true,
                        session: { select: { name: true } },
                    },
                },
                classArm: {
                    select: {
                        armName: true,
                        class: { select: { name: true } },
                    },
                },
                reviewedBy: { select: { firstName: true, lastName: true } },
            },
        });

        if (!request || request.schoolId !== activeSchoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ request });
    } catch (error: any) {
        console.error("Error fetching upload request:", error);
        return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
    }
}
