
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { createUserNotification } from "@/lib/userNotifications";
import { checkCsrf } from "@/lib/csrf";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals } from "@/lib/assessment-types";

const SCORE_WORKFLOW_TABLE_HINTS = [
    "ScoreSheetWorkflow",
    "score_sheet_workflow",
    "ScoreSheetActionLog",
    "score_sheet_action_log",
];

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

function buildScoreReviewHref(params: {
    workflowId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
}) {
    const search = new URLSearchParams({
        workflowId: params.workflowId,
        termId: params.termId,
        classArmId: params.classArmId,
        subjectId: params.subjectId,
    });
    return `/dashboard/score-reviews?${search.toString()}`;
}

// GET: Fetch scores for a class arm and subject
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId") || searchParams.get("classId");
        const subjectId = searchParams.get("subjectId");
        let termId = searchParams.get("termId");

        const user = session.user as any;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;

        if (!classArmId || !subjectId) {
            return NextResponse.json(
                { error: "Class arm and subject are required" },
                { status: 400 }
            );
        }

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        let isSubjectTeacherForArm = false;
        let isClassTeacherForArm = false;
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            // Check if user is a subject teacher for this assignment
            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: subjectId,
                    classArmId
                }
            });

            // Check if user is the class teacher for this class arm
            const isClassTeacher = await prisma.classArm.findFirst({
                where: {
                    id: classArmId,
                    classTeacherId: userId
                }
            });
            isSubjectTeacherForArm = !!isSubjectTeacher;
            isClassTeacherForArm = !!isClassTeacher;

            if (!isSubjectTeacherForArm && !isClassTeacherForArm) {
                return NextResponse.json({ error: "Unauthorized: You are not assigned to this class/subject" }, { status: 403 });
            }
        } else if (userId) {
            const [subjectAssignment, classAssignment] = await Promise.all([
                prisma.teacherSubject.findFirst({
                    where: { teacherId: userId, subjectId: subjectId, classArmId },
                    select: { id: true },
                }),
                prisma.classArm.findFirst({
                    where: { id: classArmId, classTeacherId: userId },
                    select: { id: true },
                }),
            ]);
            isSubjectTeacherForArm = !!subjectAssignment;
            isClassTeacherForArm = !!classAssignment;
        }

        // Auto-sync current term based on date ranges
        if (schoolId) await syncCurrentTerm(schoolId);

        // If no termId provided, fetch the current active term
        if (!termId) {
            const currentTerm = await prisma.term.findFirst({
                where: {
                    isCurrent: true,
                    session: { schoolId: schoolId }
                },
            });
            termId = currentTerm?.id || null;
        }

        if (!termId) {
            return NextResponse.json(
                { error: "No active term found. Please configure terms." },
                { status: 400 }
            );
        }

        // Determine if the selected term belongs to the current session
        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId! },
            include: { session: { select: { id: true, isCurrent: true } } }
        });
        const isCurrentSession = selectedTerm?.session?.isCurrent ?? true;

        // For past sessions, find students who were in this class arm during that session
        let historicalStudentIds: string[] | null = null;
        if (!isCurrentSession) {
            const sessionTerms = await prisma.term.findMany({
                where: { sessionId: selectedTerm!.session.id },
                select: { id: true }
            });
            const sessionTermIds = sessionTerms.map(t => t.id);

            const [rcStudents, seStudents] = await Promise.all([
                prisma.reportCard.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                }),
                prisma.subjectEnrollment.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                })
            ]);

            historicalStudentIds = Array.from(new Set([
                ...rcStudents.map(s => s.studentId),
                ...seStudents.map(s => s.studentId)
            ]));
        }

        // Fetch all enrollments for this subject/classArm/term in ONE query
        // (replaces 3 separate count + findMany calls)
        const allEnrollments = await prisma.subjectEnrollment.findMany({
            where: { subjectId: subjectId!, classArmId, termId: termId! },
            select: { studentId: true, isActive: true },
        });
        const hasEnrollments = allEnrollments.length > 0;
        const activeEnrollments = allEnrollments.filter(e => e.isActive);
        const activeEnrollmentCount = activeEnrollments.length;

        let studentFilter: any = {
            schoolId: schoolId,
        };

        if (isCurrentSession) {
            // Current session: show all active students currently in the class arm
            studentFilter.classArmId = classArmId;
            studentFilter.isActive = true;
        } else {
            // Past session: only show students with historical records for this class arm
            studentFilter.id = { in: historicalStudentIds! };
        }

        // If enrollments exist, only fetch enrolled (active) students
        if (hasEnrollments) {
            const enrolledIds = activeEnrollments.map(e => e.studentId);

            if (studentFilter.id) {
                // Intersect with existing historical filter
                const existingSet = new Set((studentFilter.id as any).in as string[]);
                studentFilter.id = { in: enrolledIds.filter(id => existingSet.has(id)) };
            } else {
                studentFilter.id = { in: enrolledIds };
            }
        }

        // Fetch students (filtered by enrollment if applicable)
        const students = await prisma.student.findMany({
            where: studentFilter,
            include: {
                scores: {
                    where: {
                        subjectId: subjectId,
                        termId: termId,
                    },
                },
            },
            orderBy: { lastName: "asc" },
        });

        const [assessmentTypes, allGradingRules, classArmWithLevel] = await Promise.all([
            getResolvedAssessmentTypesForClassContext(prisma, {
                schoolId,
                classId: searchParams.get("classId"),
                classArmId,
            }),
            prisma.gradingRule.findMany({
                where: { schoolId },
                orderBy: { minScore: "desc" },
            }),
            prisma.classArm.findUnique({
                where: { id: classArmId },
                select: { class: { select: { level: true } } },
            }),
        ]);

        const category = classLevelToCategory(classArmWithLevel?.class?.level);
        const categoryRules = category
            ? allGradingRules.filter((rule) => rule.schoolCategory === category)
            : [];
        const gradingRules = categoryRules.length > 0
            ? categoryRules
            : allGradingRules.filter((rule) => rule.schoolCategory === null);

        // Map to a cleaner format for the frontend
        const data = students.map((student: any) => {
            const score = student.scores[0]; // Should be only one score per subject/term
            const ca1 = score?.ca1 ? Number(score.ca1) : 0;
            const ca2 = score?.ca2 ? Number(score.ca2) : 0;
            const ca3 = score?.ca3 ? Number(score.ca3) : 0;
            const exam = score?.exam ? Number(score.exam) : 0;
            const totals = calculateEndOfTermScoreTotals({ ca1, ca2, ca3, exam }, assessmentTypes);

            const { grade, remark } = calculateGrade(totals.adjustedTotal, gradingRules);

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                admissionNumber: student.admissionNumber,
                ca1,
                ca2,
                ca3,
                exam,
                total: totals.rawTotal,
                adjustedTotal: totals.adjustedTotal,
                isAdjusted: totals.isAdjusted,
                grade,
                remark,
            };
        });

        // Get total students in class arm for enrollment info
        const totalClassStudents = isCurrentSession
            ? await prisma.student.count({ where: { classArmId, isActive: true, schoolId } })
            : (historicalStudentIds?.length ?? 0);

        let scoreWorkflow: any = null;
        try {
            scoreWorkflow = await prisma.scoreSheetWorkflow.findUnique({
                where: {
                    termId_classArmId_subjectId: {
                        termId: termId!,
                        classArmId,
                        subjectId: subjectId!,
                    },
                },
                select: {
                    id: true,
                    status: true,
                    rejectionReason: true,
                    reviewedAt: true,
                    reviewedById: true,
                    broadcastedAt: true,
                    subjectTeacherId: true,
                    classTeacherId: true,
                },
            });
        } catch (workflowError) {
            if (isMissingPrismaRelationError(workflowError, SCORE_WORKFLOW_TABLE_HINTS)) {
                console.warn("Score workflow tables are missing. Falling back to default status.", workflowError);
            } else {
                throw workflowError;
            }
        }

        const canReview = isAdmin || isClassTeacherForArm;
        const canBroadcast =
            (isAdmin || isSubjectTeacherForArm) &&
            scoreWorkflow?.status === "APPROVED";

        return NextResponse.json({
            students: data,
            assessmentTypes,
            termId: termId,
            hasEnrollments,
            enrolledCount: hasEnrollments ? activeEnrollmentCount : totalClassStudents,
            totalClassStudents,
            workflow: {
                id: scoreWorkflow?.id ?? null,
                status: scoreWorkflow?.status ?? "PENDING_REVIEW",
                rejectionReason: scoreWorkflow?.rejectionReason ?? null,
                reviewedAt: scoreWorkflow?.reviewedAt ?? null,
                broadcastedAt: scoreWorkflow?.broadcastedAt ?? null,
                canReview,
                canBroadcast,
            },
        });

    } catch (error: any) {
        console.error("Error fetching scores:", error);
        return NextResponse.json(
            { error: "Failed to fetch scores" },
            { status: 500 }
        );
    }
}

// Helper for Grade Calculation using dynamic rules
function normalizeScoreForRuleScale(total: number, rules: any[]) {
    const maxRuleScore = rules.reduce((max, rule) => Math.max(max, Number(rule.maxScore) || 0), 0);
    if (maxRuleScore <= 50 && total > 50) {
        return Math.round(total / 2);
    }
    return total;
}

function calculateGrade(total: number, rules: any[]) {
    const normalizedTotal = normalizeScoreForRuleScale(total, rules);
    const rule = rules.find(r => normalizedTotal >= r.minScore && normalizedTotal <= r.maxScore);
    if (rule) {
        return { grade: rule.grade, remark: rule.remark };
    }
    return { grade: "-", remark: "-" };
}

// Map ClassLevel enum -> SchoolCategory enum
function classLevelToCategory(level: string | undefined | null): string | null {
    if (!level) return null;
    if (level === "PRIMARY" || level === "NURSERY") return "PRIMARY";
    if (level === "JUNIOR_SECONDARY") return "JUNIOR_SECONDARY";
    if (level === "SENIOR_SECONDARY") return "SENIOR_SECONDARY";
    return null;
}

// POST: Save scores (Bulk Upsert)
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { scores, subjectId, termId, classId, classArmId } = body;
        const targetClassArmId = classArmId || classId;

        if (!scores || !Array.isArray(scores) || !subjectId || !termId || !targetClassArmId) {
            return NextResponse.json(
                { error: "Invalid payload" },
                { status: 400 }
            );
        }

        if (scores.length > 300) {
            return NextResponse.json(
                { error: "Too many scores in a single request (max 300)." },
                { status: 400 }
            );
        }

        const user = session.user as any;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        let isSubjectTeacherForArm = false;
        let isClassTeacherForArm = false;
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: subjectId,
                    classArmId: targetClassArmId
                }
            });
            isSubjectTeacherForArm = !!isSubjectTeacher;

            const isClassTeacher = await prisma.classArm.findFirst({
                where: {
                    id: targetClassArmId,
                    classTeacherId: userId
                }
            });
            isClassTeacherForArm = !!isClassTeacher;

            if (!isSubjectTeacherForArm && !isClassTeacherForArm) {
                return NextResponse.json({ error: "Unauthorized: You are not assigned to this class/subject" }, { status: 403 });
            }
        } else if (userId) {
            const [subjectAssignment, classAssignment] = await Promise.all([
                prisma.teacherSubject.findFirst({
                    where: { teacherId: userId, subjectId, classArmId: targetClassArmId },
                    select: { id: true },
                }),
                prisma.classArm.findFirst({
                    where: { id: targetClassArmId, classTeacherId: userId },
                    select: { id: true },
                }),
            ]);
            isSubjectTeacherForArm = !!subjectAssignment;
            isClassTeacherForArm = !!classAssignment;
        }

        const uniqueStudentIds = Array.from(
            new Set(scores.map((item: any) => item.studentId || item.id).filter(Boolean))
        );
        if (uniqueStudentIds.length === 0) {
            return NextResponse.json({ error: "No student IDs found in payload." }, { status: 400 });
        }

        // Determine if the selected term belongs to the current session
        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId },
            include: { session: { select: { id: true, isCurrent: true } } }
        });
        const isCurrentSession = selectedTerm?.session?.isCurrent ?? true;

        if (isCurrentSession) {
            // Current session: validate students are currently in the class arm
            const studentsInClassCount = await prisma.student.count({
                where: {
                    id: { in: uniqueStudentIds },
                    classArmId: targetClassArmId,
                    schoolId
                }
            });

            if (studentsInClassCount !== uniqueStudentIds.length) {
                return NextResponse.json(
                    { error: "One or more students do not belong to the selected class arm." },
                    { status: 400 }
                );
            }
        } else {
            // Past session: validate students belong to the school
            const studentsInSchoolCount = await prisma.student.count({
                where: {
                    id: { in: uniqueStudentIds },
                    schoolId
                }
            });

            if (studentsInSchoolCount !== uniqueStudentIds.length) {
                return NextResponse.json(
                    { error: "One or more students do not belong to this school." },
                    { status: 400 }
                );
            }
        }

        // Fetch grading rules, assessment types, and class level for this school
        const [allGradingRules, assessmentTypes, classArmWithLevel] = await Promise.all([
            prisma.gradingRule.findMany({
                where: { schoolId },
                orderBy: { minScore: "desc" }
            }),
            getResolvedAssessmentTypesForClassContext(prisma, {
                schoolId,
                classArmId: targetClassArmId,
            }),
            prisma.classArm.findUnique({
                where: { id: targetClassArmId },
                select: { classTeacherId: true, class: { select: { level: true } } },
            }),
        ]);

        // Determine category-specific rules, falling back to school-wide (null category) rules
        const category = classLevelToCategory(classArmWithLevel?.class?.level);
        const categoryRules = category
            ? allGradingRules.filter(r => r.schoolCategory === category)
            : [];
        const gradingRules = categoryRules.length > 0
            ? categoryRules
            : allGradingRules.filter(r => r.schoolCategory === null);

        // Execute queries in a transaction
        // Loop through scores and upsert each one
        const scoreOps = scores.map((item: any) => {
            const ca1 = Number(item.ca1) || 0;
            const ca2 = Number(item.ca2) || 0;
            const ca3 = Number(item.ca3) || 0;
            const exam = Number(item.exam) || 0;
            const totals = calculateEndOfTermScoreTotals({ ca1, ca2, ca3, exam }, assessmentTypes);

            // Use adjusted total for grading
            const { grade, remark } = calculateGrade(totals.adjustedTotal, gradingRules);

            return prisma.score.upsert({
                where: {
                    studentId_subjectId_termId: {
                        studentId: item.studentId || item.id,
                        subjectId: subjectId,
                        termId: termId,
                    },
                },
                update: {
                    ca1,
                    ca2,
                    ca3,
                    exam,
                    total: totals.adjustedTotal,
                    grade,
                    remark,
                    updatedById: userId,
                },
                create: {
                    studentId: item.studentId || item.id,
                    subjectId: subjectId,
                    termId: termId,
                    ca1,
                    ca2,
                    ca3,
                    exam,
                    total: totals.adjustedTotal,
                    grade,
                    remark,
                    createdById: userId,
                    updatedById: userId,
                },
            });
        });

        // Ensure report cards exist for transcript/report rendering, even before comments are added.
        const reportCardOps = uniqueStudentIds.map((studentId) =>
            prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId,
                    },
                },
                update: {
                    classArmId: targetClassArmId,
                },
                create: {
                    studentId,
                    termId,
                    classArmId: targetClassArmId,
                },
            })
        );

        await prisma.$transaction([
            ...scoreOps,
            ...reportCardOps,
        ]);

        // Pre-compute Subject Positions for this class arm
        const allScoresForSubject = await prisma.score.findMany({
            where: {
                subjectId: subjectId,
                termId: termId,
                student: { classArmId: targetClassArmId }
            },
            select: { id: true, total: true }
        });

        // Sort descending by total score
        allScoresForSubject.sort((a, b) => b.total.toNumber() - a.total.toNumber());

        // Prepare updates using competition ranking for ties (1, 1, 1, 4)
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

        // Execute position updates
        if (positionOps.length > 0) {
            await prisma.$transaction(positionOps);
        }

        const subjectTeacherAssignment = await prisma.teacherSubject.findFirst({
            where: {
                subjectId,
                classArmId: targetClassArmId,
            },
            select: { teacherId: true },
        });

        const subjectTeacherId =
            subjectTeacherAssignment?.teacherId ||
            (isSubjectTeacherForArm && userId ? userId : null);
        const classTeacherId = classArmWithLevel?.classTeacherId || null;
        const workflowStatus = isAdmin ? "APPROVED" : "PENDING_REVIEW";
        const workflowNote = isAdmin
            ? "Scores saved and auto-approved by admin."
            : "Scores saved and submitted for class teacher review.";

        let scoreWorkflow: any = null;
        let workflowWarning: string | null = null;
        try {
            scoreWorkflow = await prisma.scoreSheetWorkflow.upsert({
                where: {
                    termId_classArmId_subjectId: {
                        termId,
                        classArmId: targetClassArmId,
                        subjectId,
                    },
                },
                update: {
                    subjectTeacherId,
                    classTeacherId,
                    status: workflowStatus,
                    rejectionReason: null,
                    reviewedAt: isAdmin ? new Date() : null,
                    reviewedById: isAdmin ? userId : null,
                    broadcastedAt: null,
                    broadcastedById: null,
                },
                create: {
                    schoolId,
                    termId,
                    classArmId: targetClassArmId,
                    subjectId,
                    subjectTeacherId,
                    classTeacherId,
                    status: workflowStatus,
                    reviewedAt: isAdmin ? new Date() : null,
                    reviewedById: isAdmin ? userId : null,
                },
            });

            if (userId) {
                await prisma.scoreSheetActionLog.create({
                    data: {
                        workflowId: scoreWorkflow.id,
                        actorId: userId,
                        action: "SAVED",
                        note: workflowNote,
                        metadata: {
                            classArmId: targetClassArmId,
                            subjectId,
                            termId,
                            studentCount: uniqueStudentIds.length,
                        },
                    },
                });
            }

            if (!isAdmin && classTeacherId && classTeacherId !== userId) {
                const [subjectInfo, classArmInfo] = await Promise.all([
                    prisma.subject.findUnique({
                        where: { id: subjectId },
                        select: { name: true },
                    }),
                    prisma.classArm.findUnique({
                        where: { id: targetClassArmId },
                        select: {
                            armName: true,
                            class: { select: { name: true } },
                        },
                    }),
                ]);

                const className = classArmInfo ? `${classArmInfo.class.name} ${classArmInfo.armName}` : "class";
                const actorName = `${(user as any).name || "A teacher"}`;

                await createUserNotification({
                    userId: classTeacherId,
                    schoolId,
                    type: "SCORE_SUBMITTED",
                    title: "Score Submitted For Review",
                    message: `${actorName} submitted ${subjectInfo?.name || "subject"} scores for ${className}.`,
                    href: buildScoreReviewHref({
                        workflowId: scoreWorkflow.id,
                        termId,
                        classArmId: targetClassArmId,
                        subjectId,
                    }),
                    metadata: {
                        classArmId: targetClassArmId,
                        subjectId,
                        termId,
                        workflowId: scoreWorkflow.id,
                    },
                });
            }
        } catch (workflowError) {
            if (isMissingPrismaRelationError(workflowError, SCORE_WORKFLOW_TABLE_HINTS)) {
                workflowWarning = "Scores were saved, but workflow tracking tables are not available yet.";
                console.warn("Score workflow tables are missing. Score save continued without workflow state.", workflowError);
            } else {
                throw workflowError;
            }
        }

        return NextResponse.json({
            message: workflowWarning
                ? "Scores saved successfully. Workflow tracking is temporarily unavailable."
                : "Scores saved successfully",
            warning: workflowWarning ?? undefined,
            workflow: {
                id: scoreWorkflow?.id ?? null,
                status: scoreWorkflow?.status ?? workflowStatus,
                rejectionReason: scoreWorkflow?.rejectionReason ?? null,
                reviewedAt: scoreWorkflow?.reviewedAt ?? null,
                broadcastedAt: scoreWorkflow?.broadcastedAt ?? null,
            },
        });

    } catch (error: any) {
        console.error("Error saving scores:", error);
        return NextResponse.json(
            { error: "Failed to save scores" },
            { status: 500 }
        );
    }
}

