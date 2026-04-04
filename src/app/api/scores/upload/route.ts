import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createUserNotification, createUserNotifications, getSchoolAdminUserIds } from "@/lib/userNotifications";
import { calculateEndOfTermScoreTotals } from "@/lib/assessment-types";
import {
    recomputeCompositeParentScores,
    resolveSubjectScoreProfile,
} from "@/lib/composite-subjects";

// CSV line parser that handles quoted values
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Grade calculation helper
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

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const subjectId = formData.get("subjectId") as string;
        const termId = formData.get("termId") as string;
        const classArmId = formData.get("classArmId") as string;
        const forceOverwrite = formData.get("forceOverwrite") === "true";

        if (!file || !subjectId || !termId || !classArmId) {
            return NextResponse.json(
                { error: "File, subjectId, termId, and classArmId are required" },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            return NextResponse.json(
                { error: "Only CSV files are accepted" },
                { status: 400 }
            );
        }

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: { teacherId: userId, subjectId, classArmId }
            });
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: userId }
            });
            if (!isSubjectTeacher && !isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        // Read and parse CSV
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
            return NextResponse.json(
                { error: "CSV file must have a header row and at least one data row" },
                { status: 400 }
            );
        }

        // Parse header to detect columns
        const headerFields = parseCSVLine(lines[0]);
        const admissionIdx = headerFields.findIndex(h =>
            h.toLowerCase().includes("admission")
        );
        if (admissionIdx === -1) {
            return NextResponse.json(
                { error: "CSV must contain an 'Admission Number' column" },
                { status: 400 }
            );
        }

        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId },
            include: { session: { select: { id: true } } },
        });

        if (!selectedTerm?.session?.id) {
            return NextResponse.json({ error: "Invalid term" }, { status: 400 });
        }

        const resolvedProfile = await resolveSubjectScoreProfile(prisma, {
            schoolId,
            sessionId: selectedTerm.session.id,
            subjectId,
            classArmId,
        });

        if (resolvedProfile.context.mode === "COMPOSITE_PARENT") {
            return NextResponse.json(
                { error: "Composite parent subjects are calculated from component subjects and cannot receive direct uploads." },
                { status: 400 }
            );
        }

        const assessmentTypes = resolvedProfile.assessmentTypes;

        const caTypes = assessmentTypes
            .filter(t => !t.name.toLowerCase().includes("exam"))
            .sort((a, b) => a.order - b.order);
        const examType = assessmentTypes.find(t => t.name.toLowerCase().includes("exam"));

        // Map header columns to score fields
        // Match by checking if header contains the assessment type name (case-insensitive)
        const columnMap: { index: number; field: string; maxScore: number }[] = [];
        for (let i = 0; i < headerFields.length; i++) {
            const header = headerFields[i].toLowerCase();
            if (caTypes[0] && header.includes(caTypes[0].name.toLowerCase())) {
                columnMap.push({ index: i, field: "ca1", maxScore: caTypes[0].maxScore });
            } else if (caTypes[1] && header.includes(caTypes[1].name.toLowerCase())) {
                columnMap.push({ index: i, field: "ca2", maxScore: caTypes[1].maxScore });
            } else if (caTypes[2] && header.includes(caTypes[2].name.toLowerCase())) {
                columnMap.push({ index: i, field: "ca3", maxScore: caTypes[2].maxScore });
            } else if (examType && header.includes(examType.name.toLowerCase())) {
                columnMap.push({ index: i, field: "exam", maxScore: examType.maxScore });
            }
        }

        if (columnMap.length === 0) {
            return NextResponse.json(
                { error: "No score columns detected in CSV header. Column headers must match your assessment type names (e.g., CA1, CA2, Exam)." },
                { status: 400 }
            );
        }

        // Fetch enrolled students for matching
        const enrollmentCount = await prisma.subjectEnrollment.count({
            where: { subjectId, classArmId, termId },
        });
        const hasEnrollments = enrollmentCount > 0;

        let studentFilter: any = { classArmId, isActive: true, schoolId };
        if (hasEnrollments) {
            const enrolledIds = await prisma.subjectEnrollment.findMany({
                where: { subjectId, classArmId, termId, isActive: true },
                select: { studentId: true },
            });
            studentFilter.id = { in: enrolledIds.map(e => e.studentId) };
        }

        const students = await prisma.student.findMany({ where: studentFilter });
        const studentByAdmission = new Map(
            students.map(s => [s.admissionNumber.toLowerCase(), s])
        );

        // Parse data rows
        const errors: string[] = [];
        const parsedScores: { studentId: string; admissionNumber: string; ca1?: number; ca2?: number; ca3?: number; exam?: number }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            if (fields.every(f => !f)) continue; // skip empty rows

            const admissionNumber = fields[admissionIdx]?.trim();
            if (!admissionNumber) {
                errors.push(`Row ${i + 1}: Missing admission number`);
                continue;
            }

            const student = studentByAdmission.get(admissionNumber.toLowerCase());
            if (!student) {
                errors.push(`Row ${i + 1}: Admission number "${admissionNumber}" not found in enrolled students`);
                continue;
            }

            const scoreEntry: any = { studentId: student.id, admissionNumber };
            let rowHasError = false;

            for (const col of columnMap) {
                const rawValue = fields[col.index]?.trim();
                if (!rawValue || rawValue === "") {
                    // Empty cell - skip this field (don't override)
                    continue;
                }

                const numValue = Number(rawValue);
                if (isNaN(numValue)) {
                    errors.push(`Row ${i + 1}: Invalid score value "${rawValue}" for ${col.field}. Must be a number.`);
                    rowHasError = true;
                    break;
                }
                if (numValue < 0 || numValue > col.maxScore) {
                    errors.push(`Row ${i + 1}: Score ${numValue} out of range for ${col.field}. Must be between 0 and ${col.maxScore}.`);
                    rowHasError = true;
                    break;
                }

                scoreEntry[col.field] = numValue;
            }

            if (!rowHasError) {
                parsedScores.push(scoreEntry);
            }
        }

        if (parsedScores.length === 0) {
            return NextResponse.json({
                status: "error",
                message: "No valid scores found in the uploaded file",
                errors,
            }, { status: 400 });
        }

        // Check for existing non-zero scores
        const studentIds = parsedScores.map(s => s.studentId);
        const existingScores = await prisma.score.findMany({
            where: {
                studentId: { in: studentIds },
                subjectId,
                termId,
            },
            include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
        });

        // Find conflicts: existing scores with any non-zero values in the fields being uploaded
        const uploadedFields = columnMap.map(c => c.field);
        const conflictScores = existingScores.filter(s => {
            return uploadedFields.some(field => {
                const val = Number((s as any)[field]);
                return val > 0;
            });
        });

        const hasConflicts = conflictScores.length > 0;

        if (hasConflicts && !forceOverwrite) {
            if (isAdmin) {
                // Return conflict info so frontend can show confirmation dialog
                const affectedStudents = conflictScores.map(s => ({
                    name: `${s.student.lastName} ${s.student.firstName}`,
                    admissionNumber: s.student.admissionNumber,
                }));
                return NextResponse.json({
                    status: "conflict_admin",
                    conflictCount: conflictScores.length,
                    affectedStudents,
                    totalScores: parsedScores.length,
                    errors,
                    message: `${conflictScores.length} student(s) already have scores. Do you want to override them?`,
                });
            } else {
                // Teacher: create approval request
                const request = await prisma.scoreUploadRequest.create({
                    data: {
                        uploaderId: userId,
                        subjectId,
                        termId,
                        classArmId,
                        schoolId,
                        scoreData: parsedScores,
                        fileName: file.name,
                        studentCount: parsedScores.length,
                        conflictCount: conflictScores.length,
                    },
                });

                const [adminIds, classArmInfo, subjectInfo, termInfo] = await Promise.all([
                    getSchoolAdminUserIds(schoolId, userId || undefined),
                    prisma.classArm.findUnique({
                        where: { id: classArmId },
                        select: {
                            armName: true,
                            class: { select: { name: true } },
                        },
                    }),
                    prisma.subject.findUnique({
                        where: { id: subjectId },
                        select: { name: true },
                    }),
                    prisma.term.findUnique({
                        where: { id: termId },
                        select: { name: true },
                    }),
                ]);

                const className = classArmInfo ? `${classArmInfo.class.name} ${classArmInfo.armName}` : "this class";
                await createUserNotifications(adminIds, {
                    schoolId,
                    type: "APPROVAL_REQUESTED",
                    title: "Score Upload Needs Approval",
                    message: `${(user as any).name || "A teacher"} submitted ${subjectInfo?.name || "subject"} scores for ${className}${termInfo?.name ? ` (${termInfo.name})` : ""}.`,
                    href: "/dashboard/scores/upload-requests",
                    metadata: {
                        requestId: request.id,
                        termId,
                        classArmId,
                        subjectId,
                    },
                });

                return NextResponse.json({
                    status: "pending_approval",
                    requestId: request.id,
                    conflictCount: conflictScores.length,
                    totalScores: parsedScores.length,
                    errors,
                    message: "Existing scores detected. Your upload has been sent to the admin for approval.",
                });
            }
        }

        // Save scores directly (no conflicts, or admin force override)
        const [allGradingRules, classArmWithLevel] = await Promise.all([
            prisma.gradingRule.findMany({
                where: { schoolId },
                orderBy: { minScore: "desc" },
            }),
            prisma.classArm.findFirst({
                where: { id: classArmId, class: { schoolId } },
                include: { class: { select: { level: true } } },
            }),
        ]);

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

        const scoreOps = parsedScores.map(scoreEntry => {
                // Fetch existing score to merge with (for partial uploads)
                const existing = existingScores.find(s => s.studentId === scoreEntry.studentId);
                const ca1 = scoreEntry.ca1 ?? (existing ? Number(existing.ca1) : 0);
                const ca2 = scoreEntry.ca2 ?? (existing ? Number(existing.ca2) : 0);
                const ca3 = scoreEntry.ca3 ?? (existing ? Number(existing.ca3) : 0);
                const exam = scoreEntry.exam ?? (existing ? Number(existing.exam) : 0);
                const totals = calculateEndOfTermScoreTotals({ ca1, ca2, ca3, exam }, assessmentTypes);

                const { grade, remark } = calculateGrade(totals.adjustedTotal, gradingRules);

                return prisma.score.upsert({
                    where: {
                        studentId_subjectId_termId: {
                            studentId: scoreEntry.studentId,
                            subjectId,
                            termId,
                        },
                    },
                    update: {
                        ...(scoreEntry.ca1 !== undefined && { ca1: scoreEntry.ca1 }),
                        ...(scoreEntry.ca2 !== undefined && { ca2: scoreEntry.ca2 }),
                        ...(scoreEntry.ca3 !== undefined && { ca3: scoreEntry.ca3 }),
                        ...(scoreEntry.exam !== undefined && { exam: scoreEntry.exam }),
                        total: totals.adjustedTotal,
                        grade,
                        remark,
                        isDerived: false,
                        derivedFromCompositeConfigId: null,
                        updatedById: userId,
                    },
                    create: {
                        studentId: scoreEntry.studentId,
                        subjectId,
                        termId,
                        ca1: ca1,
                        ca2: ca2,
                        ca3: ca3,
                        exam: exam,
                        total: totals.adjustedTotal,
                        grade,
                        remark,
                        isDerived: false,
                        derivedFromCompositeConfigId: null,
                        createdById: userId,
                        updatedById: userId,
                    },
                });
            });

        const uniqueStudentIds = Array.from(new Set(parsedScores.map((score) => score.studentId)));
        const reportCardOps = uniqueStudentIds.map((studentId) =>
            prisma.reportCard.upsert({
                where: {
                    studentId_termId: {
                        studentId,
                        termId,
                    },
                },
                update: {
                    classArmId,
                },
                create: {
                    studentId,
                    termId,
                    classArmId,
                },
            })
        );

        await prisma.$transaction([
            ...scoreOps,
            ...reportCardOps,
        ]);

        if (
            resolvedProfile.context.mode === "COMPOSITE_COMPONENT" &&
            resolvedProfile.context.config?.id
        ) {
            await recomputeCompositeParentScores(prisma, {
                schoolId,
                sessionId: selectedTerm.session.id,
                classArmId,
                termId,
                compositeConfigId: resolvedProfile.context.config.id,
                studentIds: uniqueStudentIds,
                actorUserId: userId,
            });
        }

        const [subjectTeacherAssignment, classArmInfo, subjectInfo] = await Promise.all([
            prisma.teacherSubject.findFirst({
                where: { subjectId, classArmId },
                select: { teacherId: true },
            }),
            prisma.classArm.findUnique({
                where: { id: classArmId },
                select: {
                    classTeacherId: true,
                    armName: true,
                    class: { select: { name: true } },
                },
            }),
            prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true },
            }),
        ]);

        const classTeacherId = classArmInfo?.classTeacherId || null;
        const subjectTeacherId =
            subjectTeacherAssignment?.teacherId ||
            (!isAdmin && userId ? userId : null);

        const workflowStatus = isAdmin ? "APPROVED" : "PENDING_REVIEW";
        const scoreWorkflow = await prisma.scoreSheetWorkflow.upsert({
            where: {
                termId_classArmId_subjectId: {
                    termId,
                    classArmId,
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
                classArmId,
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
                    note: isAdmin
                        ? "Scores uploaded and auto-approved by admin."
                        : "Scores uploaded and submitted for class teacher review.",
                    metadata: {
                        termId,
                        classArmId,
                        subjectId,
                        studentCount: parsedScores.length,
                    },
                },
            });
        }

        if (!isAdmin && classTeacherId && classTeacherId !== userId) {
            const className = classArmInfo ? `${classArmInfo.class.name} ${classArmInfo.armName}` : "this class";
            await createUserNotification({
                userId: classTeacherId,
                schoolId,
                type: "SCORE_SUBMITTED",
                title: "Score Submitted For Review",
                message: `${(user as any).name || "A teacher"} uploaded ${subjectInfo?.name || "subject"} scores for ${className}.`,
                href: buildScoreReviewHref({
                    workflowId: scoreWorkflow.id,
                    termId,
                    classArmId,
                    subjectId,
                }),
                metadata: {
                    termId,
                    classArmId,
                    subjectId,
                    workflowId: scoreWorkflow.id,
                },
            });
        }

        return NextResponse.json({
            status: "saved",
            success: parsedScores.length,
            failed: errors.length,
            errors,
            message: `Successfully uploaded scores for ${parsedScores.length} student(s).`,
        });

    } catch (error: any) {
        console.error("Error uploading scores:", error);
        return NextResponse.json(
            { error: "Failed to upload scores" },
            { status: 500 }
        );
    }
}

