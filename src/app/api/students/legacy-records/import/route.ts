import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals } from "@/lib/assessment-types";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

type ScoreField = "ca1" | "ca2" | "ca3" | "exam";

interface LegacyRow {
    rowNumber: number;
    studentId: string;
    admissionNumber: string;
    scores: Partial<Record<ScoreField, number>>;
    hasScoreData: boolean;
    hasReportCardData: boolean;
    reportCardData: {
        totalScore?: number;
        totalObtainable?: number;
        average?: number;
        classPosition?: number;
        classSize?: number;
        daysPresent?: number;
        daysAbsent?: number;
        totalSchoolDays?: number;
        classTeacherComment?: string;
        principalComment?: string;
        isPublished?: boolean;
    };
}

interface ImportResult {
    status: "saved" | "dry_run" | "validation_error" | "conflict_admin";
    success: number;
    failed: number;
    errors: string[];
    conflictCount?: number;
    affectedStudents?: { name: string; admissionNumber: string }[];
    dryRun: boolean;
    forceOverwrite: boolean;
    atomic: boolean;
}

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

function normalizeHeader(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findColumnIndex(normalizedHeaders: string[], aliases: string[]): number {
    const normalizedAliases = aliases
        .filter(Boolean)
        .map((alias) => normalizeHeader(alias))
        .filter(Boolean);

    return normalizedHeaders.findIndex((header) => {
        return normalizedAliases.some((alias) => header === alias || header.includes(alias));
    });
}

function parseOptionalNumber(
    value: string | undefined,
    rowNumber: number,
    label: string,
    errors: string[],
    min?: number,
    max?: number
): number | undefined {
    if (!value || value.trim() === "") return undefined;
    const parsed = Number(value);
    if (isNaN(parsed)) {
        errors.push(`Row ${rowNumber}: ${label} must be a number`);
        return undefined;
    }
    if (min !== undefined && parsed < min) {
        errors.push(`Row ${rowNumber}: ${label} must be at least ${min}`);
        return undefined;
    }
    if (max !== undefined && parsed > max) {
        errors.push(`Row ${rowNumber}: ${label} must not exceed ${max}`);
        return undefined;
    }
    return parsed;
}

function parseOptionalInteger(
    value: string | undefined,
    rowNumber: number,
    label: string,
    errors: string[],
    min?: number
): number | undefined {
    if (!value || value.trim() === "") return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        errors.push(`Row ${rowNumber}: ${label} must be an integer`);
        return undefined;
    }
    if (min !== undefined && parsed < min) {
        errors.push(`Row ${rowNumber}: ${label} must be at least ${min}`);
        return undefined;
    }
    return parsed;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
    if (!value || value.trim() === "") return undefined;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "published", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "unpublished", "inactive"].includes(normalized)) return false;
    return undefined;
}

function normalizeScoreForRuleScale(total: number, rules: any[]) {
    const maxRuleScore = rules.reduce((max, rule) => Math.max(max, Number(rule.maxScore) || 0), 0);
    if (maxRuleScore <= 50 && total > 50) {
        return Math.round(total / 2);
    }
    return total;
}

function calculateGrade(total: number, rules: any[]) {
    const normalizedTotal = normalizeScoreForRuleScale(total, rules);
    const rule = rules.find((r) => normalizedTotal >= r.minScore && normalizedTotal <= r.maxScore);
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

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden: Only admins can import legacy records." },
                { status: 403 }
            );
        }

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const subjectId = (formData.get("subjectId") as string) || "";
        const termId = (formData.get("termId") as string) || "";
        const classArmId = (formData.get("classArmId") as string) || "";
        const dryRun = formData.get("dryRun") === "true";
        const forceOverwrite = formData.get("forceOverwrite") === "true";
        const atomic = formData.get("atomic") !== "false";

        if (!file || !subjectId || !termId || !classArmId) {
            return NextResponse.json(
                { error: "file, subjectId, termId, and classArmId are required" },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            return NextResponse.json(
                { error: "Only CSV files are supported" },
                { status: 400 }
            );
        }

        const [subject, classArm, term, allGradingRules, assessmentTypes] = await Promise.all([
            prisma.subject.findFirst({
                where: { id: subjectId, schoolId },
                select: { id: true, name: true },
            }),
            prisma.classArm.findFirst({
                where: { id: classArmId, class: { schoolId } },
                include: { class: { select: { name: true, level: true } } },
            }),
            prisma.term.findFirst({
                where: { id: termId, session: { schoolId } },
                include: { session: { select: { name: true } } },
            }),
            prisma.gradingRule.findMany({
                where: { schoolId },
                orderBy: { minScore: "desc" },
            }),
            getResolvedAssessmentTypesForClassContext(prisma, {
                schoolId,
                classArmId,
            }),
        ]);

        if (!subject || !classArm || !term) {
            return NextResponse.json(
                { error: "Invalid subject, class, or term selection." },
                { status: 400 }
            );
        }

        const category = classLevelToCategory(classArm.class.level);
        const categoryRules = category
            ? allGradingRules.filter((rule) => rule.schoolCategory === category)
            : [];
        const gradingRules = categoryRules.length > 0
            ? categoryRules
            : allGradingRules.filter((rule) => rule.schoolCategory === null);

        const caTypes = assessmentTypes
            .filter((t) => !t.name.toLowerCase().includes("exam"))
            .sort((a, b) => a.order - b.order);
        const examType = assessmentTypes.find((t) => t.name.toLowerCase().includes("exam"));
        const caMaxScores = [
            caTypes[0]?.maxScore ?? 20,
            caTypes[1]?.maxScore ?? 20,
            caTypes[2]?.maxScore ?? 10,
        ];
        const examMaxScore = examType?.maxScore ?? 70;

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
            return NextResponse.json(
                { error: "CSV must include a header row and at least one data row." },
                { status: 400 }
            );
        }

        const headers = parseCSVLine(lines[0]);
        const normalizedHeaders = headers.map((h) => normalizeHeader(h));

        const columnIndexes = {
            admissionNumber: findColumnIndex(normalizedHeaders, ["admission number", "admission no", "admission"]),
            ca1: findColumnIndex(normalizedHeaders, ["ca1", "ca 1", caTypes[0]?.name || ""]),
            ca2: findColumnIndex(normalizedHeaders, ["ca2", "ca 2", caTypes[1]?.name || ""]),
            ca3: findColumnIndex(normalizedHeaders, ["ca3", "ca 3", caTypes[2]?.name || ""]),
            exam: findColumnIndex(normalizedHeaders, ["exam", examType?.name || ""]),
            totalScore: findColumnIndex(normalizedHeaders, ["total score"]),
            totalObtainable: findColumnIndex(normalizedHeaders, ["total obtainable"]),
            average: findColumnIndex(normalizedHeaders, ["average", "avg"]),
            classPosition: findColumnIndex(normalizedHeaders, ["class position", "position"]),
            classSize: findColumnIndex(normalizedHeaders, ["class size"]),
            daysPresent: findColumnIndex(normalizedHeaders, ["days present", "present"]),
            daysAbsent: findColumnIndex(normalizedHeaders, ["days absent", "absent"]),
            totalSchoolDays: findColumnIndex(normalizedHeaders, ["total school days", "school days"]),
            classTeacherComment: findColumnIndex(normalizedHeaders, ["class teacher comment", "teacher comment"]),
            principalComment: findColumnIndex(normalizedHeaders, ["principal comment"]),
            isPublished: findColumnIndex(normalizedHeaders, ["is published", "published"]),
        };

        if (columnIndexes.admissionNumber === -1) {
            return NextResponse.json(
                { error: "CSV must include an Admission Number column." },
                { status: 400 }
            );
        }

        if (
            columnIndexes.ca1 === -1 &&
            columnIndexes.ca2 === -1 &&
            columnIndexes.ca3 === -1 &&
            columnIndexes.exam === -1
        ) {
            return NextResponse.json(
                { error: "CSV must include at least one score column (CA1, CA2, CA3, Exam)." },
                { status: 400 }
            );
        }

        const startIndex = lines[1]?.toLowerCase().includes("required") ? 2 : 1;
        const admissionsInFile: string[] = [];
        for (let i = startIndex; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            const admissionNumber = fields[columnIndexes.admissionNumber]?.trim();
            if (admissionNumber) {
                admissionsInFile.push(admissionNumber);
            }
        }

        const students = await prisma.student.findMany({
            where: {
                schoolId,
                admissionNumber: { in: admissionsInFile },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
            },
        });
        const studentByAdmission = new Map(
            students.map((s) => [s.admissionNumber.toLowerCase(), s])
        );

        const parsedRows: LegacyRow[] = [];
        const errors: string[] = [];

        for (let i = startIndex; i < lines.length; i++) {
            const rowNumber = i + 1;
            const fields = parseCSVLine(lines[i]);
            if (fields.every((field) => !field.trim())) continue;

            const admissionNumber = fields[columnIndexes.admissionNumber]?.trim();
            if (!admissionNumber) {
                errors.push(`Row ${rowNumber}: Admission number is required`);
                continue;
            }

            const student = studentByAdmission.get(admissionNumber.toLowerCase());
            if (!student) {
                errors.push(
                    `Row ${rowNumber}: Student with admission number "${admissionNumber}" was not found`
                );
                continue;
            }

            const scoreErrorsBefore = errors.length;
            const scores: Partial<Record<ScoreField, number>> = {};

            const ca1 = parseOptionalNumber(
                fields[columnIndexes.ca1],
                rowNumber,
                "CA1",
                errors,
                0,
                caMaxScores[0]
            );
            const ca2 = parseOptionalNumber(
                fields[columnIndexes.ca2],
                rowNumber,
                "CA2",
                errors,
                0,
                caMaxScores[1]
            );
            const ca3 = parseOptionalNumber(
                fields[columnIndexes.ca3],
                rowNumber,
                "CA3",
                errors,
                0,
                caMaxScores[2]
            );
            const exam = parseOptionalNumber(
                fields[columnIndexes.exam],
                rowNumber,
                "Exam",
                errors,
                0,
                examMaxScore
            );

            if (ca1 !== undefined) scores.ca1 = ca1;
            if (ca2 !== undefined) scores.ca2 = ca2;
            if (ca3 !== undefined) scores.ca3 = ca3;
            if (exam !== undefined) scores.exam = exam;

            const reportCardData = {
                totalScore: parseOptionalNumber(fields[columnIndexes.totalScore], rowNumber, "Total Score", errors, 0),
                totalObtainable: parseOptionalInteger(fields[columnIndexes.totalObtainable], rowNumber, "Total Obtainable", errors, 0),
                average: parseOptionalNumber(fields[columnIndexes.average], rowNumber, "Average", errors, 0, 100),
                classPosition: parseOptionalInteger(fields[columnIndexes.classPosition], rowNumber, "Class Position", errors, 1),
                classSize: parseOptionalInteger(fields[columnIndexes.classSize], rowNumber, "Class Size", errors, 1),
                daysPresent: parseOptionalInteger(fields[columnIndexes.daysPresent], rowNumber, "Days Present", errors, 0),
                daysAbsent: parseOptionalInteger(fields[columnIndexes.daysAbsent], rowNumber, "Days Absent", errors, 0),
                totalSchoolDays: parseOptionalInteger(fields[columnIndexes.totalSchoolDays], rowNumber, "Total School Days", errors, 0),
                classTeacherComment:
                    columnIndexes.classTeacherComment >= 0
                        ? fields[columnIndexes.classTeacherComment]?.trim() || undefined
                        : undefined,
                principalComment:
                    columnIndexes.principalComment >= 0
                        ? fields[columnIndexes.principalComment]?.trim() || undefined
                        : undefined,
                isPublished:
                    columnIndexes.isPublished >= 0
                        ? parseOptionalBoolean(fields[columnIndexes.isPublished])
                        : undefined,
            };

            const hasScoreData = Object.keys(scores).length > 0;
            const hasReportCardData = Object.values(reportCardData).some((value) => value !== undefined);

            if (!hasScoreData && !hasReportCardData) {
                errors.push(`Row ${rowNumber}: No score or report-card data found`);
                continue;
            }

            if (errors.length > scoreErrorsBefore) {
                continue;
            }

            parsedRows.push({
                rowNumber,
                studentId: student.id,
                admissionNumber: student.admissionNumber,
                scores,
                hasScoreData,
                hasReportCardData,
                reportCardData,
            });
        }

        if (parsedRows.length === 0) {
            const payload: ImportResult = {
                status: "validation_error",
                success: 0,
                failed: errors.length,
                errors,
                dryRun,
                forceOverwrite,
                atomic,
            };
            return NextResponse.json(payload, { status: 400 });
        }

        const uniqueStudentIds = Array.from(new Set(parsedRows.map((row) => row.studentId)));
        const [existingScores, existingReportCards] = await Promise.all([
            prisma.score.findMany({
                where: { studentId: { in: uniqueStudentIds }, subjectId, termId },
                select: { studentId: true, ca1: true, ca2: true, ca3: true, exam: true, total: true },
            }),
            prisma.reportCard.findMany({
                where: { studentId: { in: uniqueStudentIds }, termId },
                select: { studentId: true, id: true },
            }),
        ]);

        const reportCardOverwriteStudentIds = new Set(
            parsedRows
                .filter((row) => row.hasReportCardData)
                .map((row) => row.studentId)
        );

        const conflictStudentIds = new Set<string>([
            ...existingScores.map((score) => score.studentId),
            ...existingReportCards
                .filter((card) => reportCardOverwriteStudentIds.has(card.studentId))
                .map((card) => card.studentId),
        ]);

        if (conflictStudentIds.size > 0 && !forceOverwrite) {
            const conflictStudents = await prisma.student.findMany({
                where: { id: { in: Array.from(conflictStudentIds) } },
                select: { firstName: true, lastName: true, admissionNumber: true },
                orderBy: { lastName: "asc" },
            });

            const payload: ImportResult = {
                status: "conflict_admin",
                success: 0,
                failed: errors.length,
                errors,
                conflictCount: conflictStudentIds.size,
                affectedStudents: conflictStudents.map((student) => ({
                    name: `${student.lastName} ${student.firstName}`,
                    admissionNumber: student.admissionNumber,
                })),
                dryRun,
                forceOverwrite,
                atomic,
            };
            return NextResponse.json(payload, { status: 409 });
        }

        if (dryRun) {
            const payload: ImportResult = {
                status: "dry_run",
                success: parsedRows.length,
                failed: errors.length,
                errors,
                conflictCount: conflictStudentIds.size,
                dryRun,
                forceOverwrite,
                atomic,
            };
            return NextResponse.json(payload);
        }

        if (atomic && errors.length > 0) {
            const payload: ImportResult = {
                status: "validation_error",
                success: 0,
                failed: errors.length,
                errors,
                dryRun,
                forceOverwrite,
                atomic,
            };
            return NextResponse.json(payload, { status: 400 });
        }

        const existingScoreMap = new Map(existingScores.map((score) => [score.studentId, score]));

        const buildOperationsForRow = (row: LegacyRow) => {
            const operations: any[] = [];
            const existingScore = existingScoreMap.get(row.studentId);

            if (row.hasScoreData) {
                const ca1 = row.scores.ca1 ?? (existingScore ? Number(existingScore.ca1) : 0);
                const ca2 = row.scores.ca2 ?? (existingScore ? Number(existingScore.ca2) : 0);
                const ca3 = row.scores.ca3 ?? (existingScore ? Number(existingScore.ca3) : 0);
                const exam = row.scores.exam ?? (existingScore ? Number(existingScore.exam) : 0);

                const totals = calculateEndOfTermScoreTotals({ ca1, ca2, ca3, exam }, assessmentTypes);
                const { grade, remark } = calculateGrade(totals.adjustedTotal, gradingRules);

                operations.push(
                    prisma.score.upsert({
                        where: {
                            studentId_subjectId_termId: {
                                studentId: row.studentId,
                                subjectId,
                                termId,
                            },
                        },
                        update: {
                            ...(row.scores.ca1 !== undefined && { ca1: row.scores.ca1 }),
                            ...(row.scores.ca2 !== undefined && { ca2: row.scores.ca2 }),
                            ...(row.scores.ca3 !== undefined && { ca3: row.scores.ca3 }),
                            ...(row.scores.exam !== undefined && { exam: row.scores.exam }),
                            total: totals.adjustedTotal,
                            grade,
                            remark,
                            updatedById: user.id,
                        },
                        create: {
                            studentId: row.studentId,
                            subjectId,
                            termId,
                            ca1,
                            ca2,
                            ca3,
                            exam,
                            total: totals.adjustedTotal,
                            grade,
                            remark,
                            createdById: user.id,
                            updatedById: user.id,
                        },
                    })
                );
            }

            const reportCardUpdateData: any = {
                classArmId,
                ...(row.reportCardData.totalScore !== undefined && {
                    totalScore: row.reportCardData.totalScore,
                }),
                ...(row.reportCardData.totalObtainable !== undefined && {
                    totalObtainable: row.reportCardData.totalObtainable,
                }),
                ...(row.reportCardData.average !== undefined && {
                    average: row.reportCardData.average,
                }),
                ...(row.reportCardData.classPosition !== undefined && {
                    classPosition: row.reportCardData.classPosition,
                }),
                ...(row.reportCardData.classSize !== undefined && {
                    classSize: row.reportCardData.classSize,
                }),
                ...(row.reportCardData.daysPresent !== undefined && {
                    daysPresent: row.reportCardData.daysPresent,
                }),
                ...(row.reportCardData.daysAbsent !== undefined && {
                    daysAbsent: row.reportCardData.daysAbsent,
                }),
                ...(row.reportCardData.totalSchoolDays !== undefined && {
                    totalSchoolDays: row.reportCardData.totalSchoolDays,
                }),
                ...(row.reportCardData.classTeacherComment !== undefined && {
                    classTeacherComment: row.reportCardData.classTeacherComment,
                }),
                ...(row.reportCardData.principalComment !== undefined && {
                    principalComment: row.reportCardData.principalComment,
                }),
                ...(row.reportCardData.isPublished !== undefined && {
                    isPublished: row.reportCardData.isPublished,
                    publishedAt: row.reportCardData.isPublished ? new Date() : null,
                }),
            };

            const reportCardCreateData: any = {
                studentId: row.studentId,
                termId,
                classArmId,
                ...(row.reportCardData.totalScore !== undefined && {
                    totalScore: row.reportCardData.totalScore,
                }),
                ...(row.reportCardData.totalObtainable !== undefined && {
                    totalObtainable: row.reportCardData.totalObtainable,
                }),
                ...(row.reportCardData.average !== undefined && {
                    average: row.reportCardData.average,
                }),
                ...(row.reportCardData.classPosition !== undefined && {
                    classPosition: row.reportCardData.classPosition,
                }),
                ...(row.reportCardData.classSize !== undefined && {
                    classSize: row.reportCardData.classSize,
                }),
                ...(row.reportCardData.daysPresent !== undefined && {
                    daysPresent: row.reportCardData.daysPresent,
                }),
                ...(row.reportCardData.daysAbsent !== undefined && {
                    daysAbsent: row.reportCardData.daysAbsent,
                }),
                ...(row.reportCardData.totalSchoolDays !== undefined && {
                    totalSchoolDays: row.reportCardData.totalSchoolDays,
                }),
                ...(row.reportCardData.classTeacherComment !== undefined && {
                    classTeacherComment: row.reportCardData.classTeacherComment,
                }),
                ...(row.reportCardData.principalComment !== undefined && {
                    principalComment: row.reportCardData.principalComment,
                }),
                ...(row.reportCardData.isPublished !== undefined && {
                    isPublished: row.reportCardData.isPublished,
                    publishedAt: row.reportCardData.isPublished ? new Date() : null,
                }),
            };

            operations.push(
                prisma.reportCard.upsert({
                    where: {
                        studentId_termId: {
                            studentId: row.studentId,
                            termId,
                        },
                    },
                    update: reportCardUpdateData,
                    create: reportCardCreateData,
                })
            );

            return operations;
        };

        let success = 0;
        let failed = errors.length;
        const writeErrors = [...errors];

        if (atomic) {
            const allOperations = parsedRows.flatMap((row) => buildOperationsForRow(row));
            await prisma.$transaction(allOperations);
            success = parsedRows.length;
        } else {
            for (const row of parsedRows) {
                try {
                    await prisma.$transaction(buildOperationsForRow(row));
                    success += 1;
                } catch (error: any) {
                    failed += 1;
                    writeErrors.push(
                        `Row ${row.rowNumber}: Failed to save records for "${row.admissionNumber}" - ${error.message}`
                    );
                }
            }
        }

        const payload: ImportResult = {
            status: "saved",
            success,
            failed,
            errors: writeErrors,
            dryRun,
            forceOverwrite,
            atomic,
        };

        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("Legacy import error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to import legacy records." },
            { status: 500 }
        );
    }
}

