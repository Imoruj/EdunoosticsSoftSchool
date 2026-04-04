
import { prisma } from "@/lib/prisma";
import { ReportCardData } from "@/components/reports/types";
import ReactPDF from "@react-pdf/renderer";
import ReportCardDocument from "@/components/reports/ReportCardDocument";
import { resolveTemplateForTerm, resolveClassArmOverride } from "@/lib/templateResolver";
import React from "react";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals, getAssessmentTypeForField, getAssessmentTypeSummary } from "@/lib/assessment-types";
import { scaleAttendanceSummaryToPoints } from "@/lib/attendance-points";
import { normalizeSignatureSource } from "@/lib/signature-images";

const SCHOOL_TIMEZONE = "Africa/Lagos";

function getScoreFieldNumber(value: { toNumber?: () => number } | number | null | undefined) {
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value || 0);
}

function getHalfTermSummaryFromScores(
    scores: Array<{ ca1: { toNumber: () => number } }>,
    assessmentTypes: Array<{ id: string; name: string; maxScore: number; order: number; includeInTotal?: boolean }>
) {
    const ca1Type = getAssessmentTypeForField(assessmentTypes, "ca1");
    const maxPerSubject = Number(ca1Type?.maxScore) > 0 ? Number(ca1Type.maxScore) : 10;
    const totalScore = scores.reduce((acc, curr) => acc + curr.ca1.toNumber(), 0);
    const n = scores.length;
    const totalObtainable = n * maxPerSubject;
    const average = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;
    return { totalScore, totalObtainable, average };
}

function getEndOfTermScoreMetrics(score: {
    ca1?: { toNumber?: () => number } | number | null;
    ca2?: { toNumber?: () => number } | number | null;
    ca3?: { toNumber?: () => number } | number | null;
    exam?: { toNumber?: () => number } | number | null;
}, assessmentTypes: Array<{ id: string; name: string; maxScore: number; order: number; includeInTotal?: boolean }>) {
    const values = {
        ca1: getScoreFieldNumber(score.ca1),
        ca2: getScoreFieldNumber(score.ca2),
        ca3: getScoreFieldNumber(score.ca3),
        exam: getScoreFieldNumber(score.exam),
    };

    return {
        ...values,
        ...calculateEndOfTermScoreTotals(values, assessmentTypes),
    };
}

function normalizeScoreForRuleScale(total: number, rules: Array<{ maxScore: number }>) {
    const maxRuleScore = rules.reduce((max, rule) => Math.max(max, Number(rule.maxScore) || 0), 0);
    if (maxRuleScore <= 50 && total > 50) {
        return Math.round(total / 2);
    }
    return total;
}

function calculateGrade(total: number, rules: Array<{ minScore: number; maxScore: number; grade: string; remark: string }>) {
    const normalizedTotal = normalizeScoreForRuleScale(total, rules);
    const rule = rules.find((item) => normalizedTotal >= item.minScore && normalizedTotal <= item.maxScore);
    if (rule) {
        return { grade: rule.grade, remark: rule.remark };
    }
    return { grade: "-", remark: "-" };
}

function roundToSingleDecimal(value: number | undefined) {
    if (value === undefined || !Number.isFinite(value)) {
        return value;
    }

    return Number(value.toFixed(1));
}

function normalizeReportCardData(report: ReportCardData): ReportCardData {
    return {
        ...report,
        academic: {
            ...report.academic,
            subjects: report.academic.subjects.map((subject) => ({
                ...subject,
                ca: roundToSingleDecimal(subject.ca) ?? subject.ca,
                ca1: roundToSingleDecimal(subject.ca1),
                ca2: roundToSingleDecimal(subject.ca2),
                ca3: roundToSingleDecimal(subject.ca3),
                exam: roundToSingleDecimal(subject.exam),
                total: roundToSingleDecimal(subject.total) ?? subject.total,
                cumulativeTotal1: roundToSingleDecimal(subject.cumulativeTotal1),
                cumulativeTotal2: roundToSingleDecimal(subject.cumulativeTotal2),
                subjectClassAverage: roundToSingleDecimal(subject.subjectClassAverage),
                subjectLowestScore: roundToSingleDecimal(subject.subjectLowestScore),
                subjectHighestScore: roundToSingleDecimal(subject.subjectHighestScore),
            })),
            summary: {
                ...report.academic.summary,
                totalScore: roundToSingleDecimal(report.academic.summary.totalScore) ?? report.academic.summary.totalScore,
                totalObtainable: roundToSingleDecimal(report.academic.summary.totalObtainable) ?? report.academic.summary.totalObtainable,
                average: roundToSingleDecimal(report.academic.summary.average) ?? report.academic.summary.average,
            },
        },
    };
}

function toSchoolDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: SCHOOL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "00";
    const day = parts.find((part) => part.type === "day")?.value ?? "00";

    return `${year}-${month}-${day}`;
}

function fromSchoolDateKey(dateKey: string) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function getTodaySchoolDate() {
    return fromSchoolDateKey(toSchoolDateKey(new Date()));
}

function resolveAttendanceWindowEndDate(termStartDate: Date, termEndDate: Date, lastMarkedDate: Date | null) {
    const termStartKey = toSchoolDateKey(termStartDate);
    const termEndKey = toSchoolDateKey(termEndDate);

    if (lastMarkedDate) {
        const lastMarkedKey = toSchoolDateKey(lastMarkedDate);
        if (lastMarkedKey < termStartKey) return fromSchoolDateKey(termStartKey);
        if (lastMarkedKey > termEndKey) return fromSchoolDateKey(termEndKey);
        return fromSchoolDateKey(lastMarkedKey);
    }

    if (toSchoolDateKey(getTodaySchoolDate()) > termEndKey) {
        return fromSchoolDateKey(termEndKey);
    }

    return null;
}

async function getClosedSchoolDates(schoolId: string, startDate: Date, endDate: Date) {
    const closedDays = await prisma.publicHoliday.findMany({
        where: {
            schoolId,
            date: { gte: startDate, lte: endDate },
        },
        select: { date: true },
    });

    return closedDays.map((day) => day.date);
}

function summarizeSchoolCalendar(startDate: Date, endDate: Date | null, closedDates: Date[] = []) {
    if (!endDate || endDate < startDate) {
        return {
            totalSchoolDays: 0,
            closedDates,
        };
    }

    const closedDateKeys = new Set(closedDates.map((day) => toSchoolDateKey(day)));
    const normalizedStart = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
    ));
    const normalizedEnd = new Date(Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate()
    ));

    let totalSchoolDays = 0;
    for (const currentDate = new Date(normalizedStart); currentDate <= normalizedEnd; currentDate.setUTCDate(currentDate.getUTCDate() + 1)) {
        const dayOfWeek = currentDate.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (closedDateKeys.has(toSchoolDateKey(currentDate))) continue;
        totalSchoolDays += 1;
    }

    return {
        totalSchoolDays,
        closedDates,
    };
}

// Helper to calculate attendance if not stored
async function getAttendanceStats(studentId: string, startDate: Date, endDate: Date | null, closedDates: Date[] = []) {
    if (!endDate || endDate < startDate) {
        return { presentCount: 0, absentCount: 0, recordCount: 0 };
    }

    const dateFilter = {
        gte: startDate,
        lte: endDate,
        ...(closedDates.length ? { notIn: closedDates } : {}),
    };

    const groupedCounts = await prisma.attendance.groupBy({
        by: ["status"],
        where: {
            studentId,
            date: dateFilter,
        },
        _count: { status: true },
    });

    let presentCount = 0;
    let absentCount = 0;
    let recordCount = 0;

    groupedCounts.forEach((row) => {
        const count = row._count.status;
        recordCount += count;

        if (row.status === "PRESENT" || row.status === "LATE") {
            presentCount += count;
            return;
        }

        absentCount += count;
    });

    return { presentCount, absentCount, recordCount };
}

function buildAttendanceSummary(params: {
    storedDaysPresent: number | null | undefined;
    storedDaysAbsent: number | null | undefined;
    storedTotalSchoolDays: number | null | undefined;
    computedTotalSchoolDays: number;
    stats: { presentCount: number; absentCount: number; recordCount: number };
}) {
    const {
        storedDaysPresent,
        storedDaysAbsent,
        storedTotalSchoolDays,
        computedTotalSchoolDays,
        stats,
    } = params;

    if (stats.recordCount > 0) {
        const daysPresent = Math.min(stats.presentCount, computedTotalSchoolDays);
        const daysAbsent = Math.min(
            computedTotalSchoolDays,
            Math.max(stats.absentCount, computedTotalSchoolDays - daysPresent)
        );

        return scaleAttendanceSummaryToPoints({
            daysPresent,
            daysAbsent,
            totalSchoolDays: computedTotalSchoolDays,
        });
    }

    return scaleAttendanceSummaryToPoints({
        daysPresent: storedDaysPresent ?? 0,
        daysAbsent: storedDaysAbsent ?? 0,
        totalSchoolDays: storedTotalSchoolDays ?? computedTotalSchoolDays,
    });
}

function buildActiveEnrollmentLookup(enrollments: Array<{ studentId: string; subjectId: string; isActive: boolean }>) {
    const subjectsWithEnrollment = new Set<string>();
    const activeEnrollmentBySubject: Record<string, Set<string>> = {};

    enrollments.forEach((enrollment) => {
        subjectsWithEnrollment.add(enrollment.subjectId);

        if (!enrollment.isActive) {
            return;
        }

        if (!activeEnrollmentBySubject[enrollment.subjectId]) {
            activeEnrollmentBySubject[enrollment.subjectId] = new Set<string>();
        }

        activeEnrollmentBySubject[enrollment.subjectId].add(enrollment.studentId);
    });

    return { subjectsWithEnrollment, activeEnrollmentBySubject };
}

function isStudentIncludedInSubjectStats(
    subjectId: string,
    studentId: string,
    subjectsWithEnrollment: Set<string>,
    activeEnrollmentBySubject: Record<string, Set<string>>
) {
    if (!subjectsWithEnrollment.has(subjectId)) {
        return true;
    }

    return activeEnrollmentBySubject[subjectId]?.has(studentId) ?? false;
}

function getSubjectRank(subjectScores: number[], studentScoreValue: number) {
    if (subjectScores.length === 0) {
        return undefined;
    }

    return subjectScores.filter((score) => score > studentScoreValue).length + 1;
}

export async function generateReportCardData(
    studentId: string,
    termId: string,
    reportType: "halfTerm" | "endOfTerm" = "endOfTerm",
    useAbsolutePath: boolean = true
): Promise<ReportCardData> {
    // 1. Fetch Student & School Data
    const studentData = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            classArm: {
                include: {
                    class: true
                }
            },
            school: true
        }
    });

    if (!studentData) throw new Error("Student not found");
    const school = studentData.school;
    if (!school) throw new Error("School data not found");

    // Fetch report config + term context
    const [config, term] = await Promise.all([
        prisma.reportCardConfig.findUnique({
            where: { schoolId: school.id }
        }),
        prisma.term.findUnique({
            where: { id: termId },
            include: {
                session: {
                    include: {
                        terms: {
                            orderBy: { termNumber: "asc" }
                        }
                    }
                }
            }
        })
    ]);

    if (!term) throw new Error("Term not found");
    const closedSchoolDates = await getClosedSchoolDates(school.id, term.startDate, term.endDate);

    // Resolve template via mappings with cross-session fallback by term number
    let activeTemplate = config?.activeTemplate || "standard";
    activeTemplate = await resolveTemplateForTerm({
        prisma,
        schoolId: school.id,
        termId: term.id,
        termNumber: term.termNumber,
        reportType,
        termMappings: (config as any)?.termMappings,
        fallbackTemplate: activeTemplate,
        classId: studentData.classArm?.classId ?? null,
    });

    // If resolved template is a custom one, load its full config
    let resolvedCustomLayout: any = undefined;
    let resolvedDisplayOptions: any = undefined;
    const customTemplates = (config as any)?.customTemplates as Record<string, any> | undefined;
    const baseTemplates = new Set(["classic", "modern", "minimal", "professional", "standard"]);

    // Guard against stale mappings pointing to removed custom templates.
    if (!customTemplates?.[activeTemplate] && !baseTemplates.has(activeTemplate)) {
        activeTemplate = config?.activeTemplate || "standard";
    }
    if (!customTemplates?.[activeTemplate] && !baseTemplates.has(activeTemplate)) {
        activeTemplate = "standard";
    }

    const customTemplateEntry = customTemplates?.[activeTemplate];
    if (customTemplateEntry) {
        // Custom template's display options override the global ones
        if (customTemplateEntry.displayOptions) {
            resolvedDisplayOptions = customTemplateEntry.displayOptions;
        }
        // Check for drag-and-drop builder layout inside displayOptions
        if (customTemplateEntry.displayOptions?.customLayout) {
            resolvedCustomLayout = customTemplateEntry.displayOptions.customLayout;
        }
        // Use the custom template's base template for routing (e.g. "classic", "modern")
        if (customTemplateEntry.activeTemplate) {
            activeTemplate = customTemplateEntry.activeTemplate;
        }
    }

    // Map class level to SchoolCategory for grading rule lookup
    const classLevel = studentData.classArm?.class?.level;
    let schoolCategory: string | null = null;
    if (classLevel === "PRIMARY" || classLevel === "NURSERY") schoolCategory = "PRIMARY";
    else if (classLevel === "JUNIOR_SECONDARY") schoolCategory = "JUNIOR_SECONDARY";
    else if (classLevel === "SENIOR_SECONDARY") schoolCategory = "SENIOR_SECONDARY";

    // Fetch all grading rules and assessment types for the school
    const [allGradingRules] = await Promise.all([
        prisma.gradingRule.findMany({
            where: { schoolId: school.id },
            orderBy: { minScore: "desc" }
        })
    ]);

    // Pick category-specific rules; fall back to school-wide (schoolCategory === null) rules
    const categorySpecificRules = schoolCategory
        ? allGradingRules.filter(r => (r as any).schoolCategory === schoolCategory)
        : [];
    const gradingRules = categorySpecificRules.length > 0
        ? categorySpecificRules
        : allGradingRules.filter(r => (r as any).schoolCategory === null);

    // 2. Get previous terms in this session
    const previousTerms = term.session.terms.filter(t => t.termNumber < term.termNumber);

    // 3. Fetch Report Card (Comments & Traits)
    const reportCard = await prisma.reportCard.findUnique({
        where: {
            studentId_termId: {
                studentId,
                termId
            }
        },
        include: {
            classArm: {
                include: {
                    class: true
                }
            },
            affectiveRatings: { include: { trait: true } },
            psychomotorRatings: { include: { skill: true } }
        }
    });

    const effectiveClassArm = reportCard?.classArm || studentData.classArm;
    const effectiveClassArmId = reportCard?.classArmId || studentData.classArmId || null;
    const [assessmentTypes, classTeacherSignatureUrl, normalizedPrincipalSignatureUrl, attendanceWindowEndDate] = await Promise.all([
        getResolvedAssessmentTypesForClassContext(prisma, {
            schoolId: school.id,
            classArmId: effectiveClassArmId,
        }),
        effectiveClassArm?.classTeacherId
            ? prisma.user.findUnique({
                where: { id: effectiveClassArm.classTeacherId },
                select: { signatureUrl: true },
            }).then(async (teacher) => normalizeSignatureSource(teacher?.signatureUrl))
            : Promise.resolve(undefined),
        normalizeSignatureSource(school.principalSignatureUrl),
        effectiveClassArmId
            ? prisma.attendance.aggregate({
                where: {
                    classArmId: effectiveClassArmId,
                    date: {
                        gte: term.startDate,
                        lte: term.endDate,
                    },
                },
                _max: { date: true },
            }).then((result) => resolveAttendanceWindowEndDate(term.startDate, term.endDate, result._max.date ?? null))
            : Promise.resolve(resolveAttendanceWindowEndDate(term.startDate, term.endDate, null)),
    ]);
    const caTypes = assessmentTypes.filter(t => !t.name.toLowerCase().includes("exam"));
    const examType = assessmentTypes.find(t => t.name.toLowerCase().includes("exam"));
    const assessmentSummary = getAssessmentTypeSummary(assessmentTypes);
    const calendarSummary = summarizeSchoolCalendar(term.startDate, attendanceWindowEndDate, closedSchoolDates);

    // 4. Fetch Attendance
    const attendanceStats = await getAttendanceStats(
        studentId,
        term.startDate,
        attendanceWindowEndDate,
        calendarSummary.closedDates
    );
    const attendance = buildAttendanceSummary({
        storedDaysPresent: reportCard?.daysPresent,
        storedDaysAbsent: reportCard?.daysAbsent,
        storedTotalSchoolDays: reportCard?.totalSchoolDays ?? term.totalSchoolDays,
        computedTotalSchoolDays: calendarSummary.totalSchoolDays,
        stats: attendanceStats,
    });

    // 5. Fetch Scores for current term
    const allCurrentScores = await prisma.score.findMany({
        where: {
            studentId,
            termId,
            subject: {
                subjectKind: { not: "COMPOSITE_COMPONENT" }
            }
        },
        include: { subject: true }
    });

    // Filter out subjects the student is not enrolled in
    const classEnrollments = effectiveClassArmId
        ? await prisma.subjectEnrollment.findMany({
            where: {
                termId,
                classArmId: effectiveClassArmId,
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            }
        })
        : [];
    const enrollments = classEnrollments.filter((enrollment) => enrollment.studentId === studentId);

    // Build a set of subject IDs that have enrollment records for this class arm/term
    const subjectsWithEnrollment = new Set(enrollments.map(e => e.subjectId));
    // Build a set of subject IDs the student is actively enrolled in
    const activeEnrolledSubjects = new Set(enrollments.filter(e => e.isActive).map(e => e.subjectId));
    const classEnrollmentLookup = buildActiveEnrollmentLookup(classEnrollments);

    const currentScores = allCurrentScores.filter(score => {
        // If no enrollment records exist for this subject, all students are considered enrolled
        if (!subjectsWithEnrollment.has(score.subjectId)) return true;
        // Otherwise, only include if the student is actively enrolled
        return activeEnrolledSubjects.has(score.subjectId);
    });

    // Fetch previous term scores for cumulative totals (Only for End of Term)
    const prevScores = reportType === "endOfTerm" ? await prisma.score.findMany({
        where: {
            studentId,
            termId: { in: previousTerms.map(t => t.id) },
            subject: {
                subjectKind: { not: "COMPOSITE_COMPONENT" }
            }
        },
        include: { subject: true }
    }) : [];

    // Fetch all scores for this class arm and term to calculate averages and positions
    const allClassScores = effectiveClassArmId
        ? await prisma.score.findMany({
            where: {
                termId,
                student: { classArmId: effectiveClassArmId },
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            }
        })
        : [];

    // Group allClassScores by subjectId
    // For halfTerm: use CA1 only (matches what's shown in half-term report table)
    // For endOfTerm: use full total
    const scoresBySubject: Record<string, number[]> = {};
    allClassScores.forEach(s => {
        if (!isStudentIncludedInSubjectStats(
            s.subjectId,
            s.studentId,
            classEnrollmentLookup.subjectsWithEnrollment,
            classEnrollmentLookup.activeEnrollmentBySubject
        )) {
            return;
        }

        if (!scoresBySubject[s.subjectId]) scoresBySubject[s.subjectId] = [];
        const scoreValue = reportType === "halfTerm"
            ? s.ca1.toNumber()
            : getEndOfTermScoreMetrics(s, assessmentTypes).adjustedTotal;
        scoresBySubject[s.subjectId].push(scoreValue);
    });

    // Helper for ordinals (1st, 2nd, 3rd...)
    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // 6. Construct Data Object
    return normalizeReportCardData({
        student: {
            id: studentData.id,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            otherNames: studentData.otherNames || undefined,
            admissionNumber: studentData.admissionNumber,
            className: effectiveClassArm
                ? `${effectiveClassArm.class.name} ${effectiveClassArm.armName}`
                : "Unassigned",
            gender: studentData.gender,
            dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth.toISOString() : undefined,
            photoUrl: studentData.photoUrl
                ? (studentData.photoUrl.startsWith("http")
                    ? studentData.photoUrl
                    : (useAbsolutePath
                        ? require("path").join(process.cwd(), "public", studentData.photoUrl.startsWith("/") ? studentData.photoUrl.slice(1) : studentData.photoUrl)
                        : studentData.photoUrl))
                : undefined
        },
        school: {
            name: school.name,
            address: school.address || "",
            email: school.email || "",
            phone: school.phone || "",
            logoUrl: school.logoUrl || undefined,
            principalSignatureUrl: normalizedPrincipalSignatureUrl || undefined,
            motto: school.motto || undefined
        },
        term: {
            name: term.name,
            sessionName: term.session.name,
            startDate: term.startDate.toISOString(),
            endDate: term.endDate.toISOString(),
            nextTermStartDate: term.resumptionDate?.toISOString()
        },
        attendance,
        academic: {
            subjects: currentScores.map(s => {
                const term1Score = prevScores.find(ps => ps.subjectId === s.subjectId && ps.termId === term.session.terms.find(t => t.termNumber === 1)?.id);
                const term2Score = prevScores.find(ps => ps.subjectId === s.subjectId && ps.termId === term.session.terms.find(t => t.termNumber === 2)?.id);

                const subjectScores = scoresBySubject[s.subjectId] || [];
                const avg = subjectScores.length > 0 ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0;

                const caTotal = s.ca1.toNumber() + s.ca2.toNumber() + s.ca3.toNumber();
                const endOfTermMetrics = getEndOfTermScoreMetrics(s, assessmentTypes);
                const studentScoreValue = reportType === "halfTerm" ? s.ca1.toNumber() : endOfTermMetrics.adjustedTotal;

                // Rank by the live subject totals for enrolled students in this subject.
                const rank = getSubjectRank(subjectScores, studentScoreValue);
                const minScore = subjectScores.length > 0 ? Math.min(...subjectScores) : 0;
                const maxScore = subjectScores.length > 0 ? Math.max(...subjectScores) : 0;
                const examScore = reportType === "halfTerm" ? undefined : s.exam.toNumber();
                const totalScore = reportType === "halfTerm" ? s.ca1.toNumber() : endOfTermMetrics.adjustedTotal;
                const gradeDetails = reportType === "halfTerm" ? undefined : calculateGrade(endOfTermMetrics.adjustedTotal, gradingRules);

                return {
                    id: s.subjectId,
                    name: s.subject.name,
                    category: s.subject.category,
                    ca: reportType === "halfTerm" ? s.ca1.toNumber() : caTotal,
                    ca1: s.ca1.toNumber(),
                    ca2: s.ca2.toNumber(),
                    ca3: s.ca3.toNumber(),
                    exam: examScore,
                    total: totalScore,
                    cumulativeTotal1: reportType === "halfTerm" ? undefined : (term1Score ? getEndOfTermScoreMetrics(term1Score, assessmentTypes).adjustedTotal : undefined),
                    cumulativeTotal2: reportType === "halfTerm" ? undefined : (term2Score ? getEndOfTermScoreMetrics(term2Score, assessmentTypes).adjustedTotal : undefined),
                    subjectClassAverage: Number(avg.toFixed(1)),
                    subjectPosition: rank ? getOrdinal(rank) : undefined,
                    grade: reportType === "halfTerm" ? undefined : gradeDetails?.grade || "-",
                    remark: reportType === "halfTerm" ? undefined : gradeDetails?.remark || "-",
                    subjectLowestScore: Number(minScore.toFixed(1)),
                    subjectHighestScore: Number(maxScore.toFixed(1))
                };
            }),
            summary: reportType === "halfTerm"
                ? (() => {
                    const h = getHalfTermSummaryFromScores(currentScores, assessmentTypes);
                    return {
                        totalScore: h.totalScore,
                        totalObtainable: h.totalObtainable,
                        average: h.average,
                        classPosition: undefined,
                        classSize: reportCard?.classSize || undefined
                    };
                })()
                : {
                    totalScore: currentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, assessmentTypes).adjustedTotal, 0),
                    totalObtainable: currentScores.length * assessmentSummary.countedMaxScore,
                    average: currentScores.length > 0
                        ? currentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, assessmentTypes).adjustedTotal, 0) / currentScores.length
                        : 0,
                    classPosition: reportCard?.classPosition || undefined,
                    classSize: reportCard?.classSize || undefined
                }
        },
        affective: reportCard?.affectiveRatings.map(r => ({
            name: r.trait.name,
            rating: r.rating
        })) || [],
        psychomotor: reportCard?.psychomotorRatings.map(r => ({
            name: r.skill.name,
            rating: r.rating
        })) || [],
        comments: {
            classTeacher: reportCard?.classTeacherComment || undefined,
            principal: reportCard?.principalComment || undefined,
            promotionStatus: (term.termNumber === 3 && reportType === "endOfTerm")
                ? ((currentScores.length > 0 ? currentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, assessmentTypes).adjustedTotal, 0) / currentScores.length : 0) >= 50
                    ? "PROMOTED TO NEXT CLASS"
                    : "NOT PROMOTED")
                : undefined,
            publishedAt: reportCard?.publishedAt?.toISOString() || undefined
        },
        gradingRules: gradingRules.length > 0 ? gradingRules.map(r => ({
            grade: r.grade,
            minScore: r.minScore,
            maxScore: r.maxScore,
            remark: r.remark
        })) : undefined,
        classTeacherSignatureUrl: classTeacherSignatureUrl || undefined,
        config: config ? {
            activeTemplate: activeTemplate,
            colorScheme: customTemplateEntry?.colorScheme || config.colorScheme,
            showAttendance: customTemplateEntry?.showAttendance ?? config.showAttendance,
            showTraits: customTemplateEntry?.showTraits ?? config.showTraits,
            showSkills: customTemplateEntry?.showSkills ?? config.showSkills,
            showComments: customTemplateEntry?.showComments ?? config.showComments,
            showPhoto: customTemplateEntry?.showPhoto ?? config.showPhoto,
            showPosition: customTemplateEntry?.showPosition ?? config.showPosition,
            showBehaviourGradeKey: customTemplateEntry?.showBehaviourGradeKey ?? (config as any).showBehaviourGradeKey,
            customTitles: customTemplateEntry?.customTitles || config.customTitles || undefined,
            customLayout: resolvedCustomLayout,
            displayOptions: resolvedDisplayOptions || (config as any).displayOptions,
            assessmentTypeNames: assessmentTypes.length > 0 ? {
                ca1: caTypes[0]?.name,
                ca2: caTypes[1]?.name,
                ca3: caTypes[2]?.name,
                exam: examType?.name,
            } : undefined,
        } : undefined,
        reportType
    });
}

export async function generateReportCardStream(data: ReportCardData): Promise<NodeJS.ReadableStream> {
    return await ReactPDF.renderToStream(
        <ReportCardDocument data={data} />
    ) as NodeJS.ReadableStream;
}

export async function bulkGenerateReportCardData(
    studentIds: string[],
    termId: string,
    reportType: "halfTerm" | "endOfTerm" = "endOfTerm",
    useAbsolutePath: boolean = true
): Promise<ReportCardData[]> {
    if (!studentIds.length) return [];

    // 1. Fetch Students & School Data
    const studentsData = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        include: {
            classArm: { include: { class: true } },
            school: true
        }
    });

    if (!studentsData.length) return [];
    const school = studentsData[0].school;
    if (!school) throw new Error("School data not found");

    // Fetch report config + term context + assessment types + grading rules
    const [config, term, allGradingRules, normalizedPrincipalSignatureUrl] = await Promise.all([
        prisma.reportCardConfig.findUnique({ where: { schoolId: school.id } }),
        prisma.term.findUnique({
            where: { id: termId },
            include: {
                session: { include: { terms: { orderBy: { termNumber: "asc" } } } }
            }
        }),
        prisma.gradingRule.findMany({
            where: { schoolId: school.id },
            orderBy: { minScore: "desc" }
        }),
        normalizeSignatureSource(school.principalSignatureUrl),
    ]);

    if (!term) throw new Error("Term not found");
    const closedSchoolDates = await getClosedSchoolDates(school.id, term.startDate, term.endDate);

    // Resolve templates per student/class level
    const baseTemplates = new Set(["classic", "modern", "minimal", "professional", "standard"]);
    let globalActiveTemplate = config?.activeTemplate || "standard";
    globalActiveTemplate = await resolveTemplateForTerm({
        prisma,
        schoolId: school.id,
        termId: term.id,
        termNumber: term.termNumber,
        reportType,
        termMappings: (config as any)?.termMappings,
        fallbackTemplate: globalActiveTemplate,
    });

    let resolvedCustomLayout: any = undefined;
    let resolvedDisplayOptions: any = undefined;
    const customTemplates = (config as any)?.customTemplates as Record<string, any> | undefined;

    if (!customTemplates?.[globalActiveTemplate] && !baseTemplates.has(globalActiveTemplate)) {
        globalActiveTemplate = config?.activeTemplate || "standard";
    }
    if (!customTemplates?.[globalActiveTemplate] && !baseTemplates.has(globalActiveTemplate)) {
        globalActiveTemplate = "standard";
    }

    const customTemplateEntry = customTemplates?.[globalActiveTemplate];
    if (customTemplateEntry) {
        if (customTemplateEntry.displayOptions) resolvedDisplayOptions = customTemplateEntry.displayOptions;
        if (customTemplateEntry.displayOptions?.customLayout) resolvedCustomLayout = customTemplateEntry.displayOptions.customLayout;
        if (customTemplateEntry.activeTemplate) globalActiveTemplate = customTemplateEntry.activeTemplate;
    }

    const previousTerms = term.session.terms.filter(t => t.termNumber < term.termNumber);

    // Fetch all related data in bulk
    const effectiveClassArmIds = Array.from(new Set(studentsData.map(s => s.classArmId).filter(Boolean))) as string[];
    const defaultAssessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
        schoolId: school.id,
    });
    const assessmentTypesByClassArm = new Map<string, typeof defaultAssessmentTypes>();
    await Promise.all(
        effectiveClassArmIds.map(async (classArmId) => {
            const resolvedTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
                schoolId: school.id,
                classArmId,
            });
            assessmentTypesByClassArm.set(classArmId, resolvedTypes);
        })
    );

    // Check if we have historical reports (for class contexts)
    const allReportCards = await prisma.reportCard.findMany({
        where: { studentId: { in: studentIds }, termId },
        include: {
            classArm: { include: { class: true } },
            affectiveRatings: { include: { trait: true } },
            psychomotorRatings: { include: { skill: true } }
        }
    });
    const attendanceClassArmIds = Array.from(new Set([
        ...effectiveClassArmIds,
        ...allReportCards.map((reportCard) => reportCard.classArmId).filter(Boolean),
    ])) as string[];

    // We need to fetch signatures for any class teacher involved
    const classTeacherIds = new Set<string>();
    allReportCards.forEach(rc => { if (rc.classArm?.classTeacherId) classTeacherIds.add(rc.classArm.classTeacherId); });
    studentsData.forEach(s => { if (s.classArm?.classTeacherId) classTeacherIds.add(s.classArm.classTeacherId); });

    const classTeachers = await prisma.user.findMany({
        where: { id: { in: Array.from(classTeacherIds) } },
        select: { id: true, signatureUrl: true }
    });
    const normalizedTeacherSignatures = await Promise.all(
        classTeachers.map(async (teacher) => [teacher.id, await normalizeSignatureSource(teacher.signatureUrl)] as const)
    );
    const teacherSignatures = new Map(normalizedTeacherSignatures);

    const attendanceWindowEndDateByClassArm = new Map<string, Date | null>();
    if (attendanceClassArmIds.length > 0) {
        const maxAttendanceDates = await prisma.attendance.groupBy({
            by: ["classArmId"],
            where: {
                classArmId: { in: attendanceClassArmIds },
                date: {
                    gte: term.startDate,
                    lte: term.endDate,
                },
            },
            _max: { date: true },
        });

        maxAttendanceDates.forEach((row) => {
            attendanceWindowEndDateByClassArm.set(
                row.classArmId,
                resolveAttendanceWindowEndDate(term.startDate, term.endDate, row._max.date ?? null)
            );
        });
    }

    attendanceClassArmIds.forEach((classArmId) => {
        if (!attendanceWindowEndDateByClassArm.has(classArmId)) {
            attendanceWindowEndDateByClassArm.set(
                classArmId,
                resolveAttendanceWindowEndDate(term.startDate, term.endDate, null)
            );
        }
    });

    const calendarSummaryByClassArm = new Map<string, { totalSchoolDays: number; closedDates: Date[] }>();
    attendanceClassArmIds.forEach((classArmId) => {
        calendarSummaryByClassArm.set(
            classArmId,
            summarizeSchoolCalendar(
                term.startDate,
                attendanceWindowEndDateByClassArm.get(classArmId) ?? null,
                closedSchoolDates
            )
        );
    });

    // Fetch Attendances (if missing from Report Card)
    // To do this strictly correct, we'd need to group by student, but we can just fetch all attendances and filter
    const allAttendances = await prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: {
            studentId: { in: studentIds },
            date: {
                gte: term.startDate,
                lte: term.endDate,
                ...(closedSchoolDates.length ? { notIn: closedSchoolDates } : {}),
            }
        },
        _count: { status: true }
    });

    const attendanceMap = new Map<string, { present: number, absent: number, recordCount: number }>();
    allAttendances.forEach(a => {
        const studentId = a.studentId;
        if (!attendanceMap.has(studentId)) attendanceMap.set(studentId, { present: 0, absent: 0, recordCount: 0 });

        const current = attendanceMap.get(studentId)!;
        current.recordCount += a._count.status;

        if (a.status === "PRESENT" || a.status === "LATE") {
            current.present += a._count.status;
            return;
        }

        current.absent += a._count.status;
    });

    // Fetch Enrollments & Scores
    const [allCurrentScores, allPrevScores, detailedClassScores, allEnrollments] = await Promise.all([
        prisma.score.findMany({
            where: {
                studentId: { in: studentIds },
                termId,
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            },
            include: { subject: true }
        }),
        reportType === "endOfTerm" && previousTerms.length > 0 ? prisma.score.findMany({
            where: {
                studentId: { in: studentIds },
                termId: { in: previousTerms.map(t => t.id) },
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            },
            include: { subject: true }
        }) : Promise.resolve([]),
        effectiveClassArmIds.length > 0 ? prisma.score.findMany({
            where: {
                termId,
                student: { classArmId: { in: effectiveClassArmIds } },
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            },
            include: { student: { select: { classArmId: true } } }
        }) : Promise.resolve([]),
        effectiveClassArmIds.length > 0 ? prisma.subjectEnrollment.findMany({
            where: {
                classArmId: { in: effectiveClassArmIds },
                termId,
                subject: {
                    subjectKind: { not: "COMPOSITE_COMPONENT" }
                }
            }
        }) : Promise.resolve([])
    ]);

    const enrollmentLookupByClassArm = new Map<
        string,
        ReturnType<typeof buildActiveEnrollmentLookup>
    >();
    effectiveClassArmIds.forEach((classArmId) => {
        enrollmentLookupByClassArm.set(
            classArmId,
            buildActiveEnrollmentLookup(allEnrollments.filter((enrollment) => enrollment.classArmId === classArmId))
        );
    });

    // Build overall class scores map: classArmId -> subjectId -> number[]
    const scoresByClassAndSubject: Record<string, Record<string, number[]>> = {};
    detailedClassScores.forEach(s => {
        const cArmId = s.student?.classArmId;
        if (!cArmId) return;
        const classEnrollmentLookup = enrollmentLookupByClassArm.get(cArmId);
        if (
            classEnrollmentLookup &&
            !isStudentIncludedInSubjectStats(
                s.subjectId,
                s.studentId,
                classEnrollmentLookup.subjectsWithEnrollment,
                classEnrollmentLookup.activeEnrollmentBySubject
            )
        ) {
            return;
        }

        if (!scoresByClassAndSubject[cArmId]) scoresByClassAndSubject[cArmId] = {};
        if (!scoresByClassAndSubject[cArmId][s.subjectId]) scoresByClassAndSubject[cArmId][s.subjectId] = [];

        const classAssessmentTypes = assessmentTypesByClassArm.get(cArmId) || defaultAssessmentTypes;
        const scoreValue = reportType === "halfTerm"
            ? s.ca1.toNumber()
            : getEndOfTermScoreMetrics(s, classAssessmentTypes).adjustedTotal;
        scoresByClassAndSubject[cArmId][s.subjectId].push(scoreValue);
    });

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Assemble reports
    return studentsData.map(studentData => {
        const reportCard = allReportCards.find(rc => rc.studentId === studentData.id);
        const effectiveClassArm = reportCard?.classArm || studentData.classArm;
        const effectiveClassArmId = reportCard?.classArmId || studentData.classArmId || null;
        const studentAssessmentTypes = effectiveClassArmId
            ? (assessmentTypesByClassArm.get(effectiveClassArmId) || defaultAssessmentTypes)
            : defaultAssessmentTypes;
        const studentCaTypes = studentAssessmentTypes.filter((type) => !type.name.toLowerCase().includes("exam"));
        const studentExamType = studentAssessmentTypes.find((type) => type.name.toLowerCase().includes("exam"));
        const studentAssessmentSummary = getAssessmentTypeSummary(studentAssessmentTypes);

        // Per-student template: check class override first, then fall back to global
        const effectiveClassId = effectiveClassArm?.classId ?? null;
        let studentActiveTemplate = globalActiveTemplate;
        let studentCustomLayout = resolvedCustomLayout;
        let studentDisplayOptions = resolvedDisplayOptions;
        let studentCustomTemplateEntry = customTemplateEntry;
        const armTemplateId = resolveClassArmOverride({
            termId: term.id,
            classId: effectiveClassId,
            reportType,
            termMappings: (config as any)?.termMappings,
        });
        if (armTemplateId && (customTemplates?.[armTemplateId] || baseTemplates.has(armTemplateId))) {
            studentActiveTemplate = armTemplateId;
            studentCustomTemplateEntry = customTemplates?.[armTemplateId];
            if (studentCustomTemplateEntry) {
                studentDisplayOptions = studentCustomTemplateEntry.displayOptions || undefined;
                studentCustomLayout = studentCustomTemplateEntry.displayOptions?.customLayout || undefined;
                if (studentCustomTemplateEntry.activeTemplate) studentActiveTemplate = studentCustomTemplateEntry.activeTemplate;
            } else {
                studentDisplayOptions = (config as any)?.displayOptions;
                studentCustomLayout = undefined;
            }
        }

        const classLevel = effectiveClassArm?.class?.level;
        let schoolCategory: string | null = null;
        if (classLevel === "PRIMARY" || classLevel === "NURSERY") schoolCategory = "PRIMARY";
        else if (classLevel === "JUNIOR_SECONDARY") schoolCategory = "JUNIOR_SECONDARY";
        else if (classLevel === "SENIOR_SECONDARY") schoolCategory = "SENIOR_SECONDARY";

        const categorySpecificRules = schoolCategory ? allGradingRules.filter(r => (r as any).schoolCategory === schoolCategory) : [];
        const studentGradingRules = categorySpecificRules.length > 0 ? categorySpecificRules : allGradingRules.filter(r => (r as any).schoolCategory === null);

        const classTeacherSignatureUrl = effectiveClassArm?.classTeacherId ? teacherSignatures.get(effectiveClassArm.classTeacherId) : undefined;

        const classCalendarSummary = effectiveClassArmId
            ? calendarSummaryByClassArm.get(effectiveClassArmId) ?? { totalSchoolDays: 0, closedDates: closedSchoolDates }
            : { totalSchoolDays: 0, closedDates: closedSchoolDates };
        const attendanceStats = attendanceMap.get(studentData.id) || { present: 0, absent: 0, recordCount: 0 };
        const attendance = buildAttendanceSummary({
            storedDaysPresent: reportCard?.daysPresent,
            storedDaysAbsent: reportCard?.daysAbsent,
            storedTotalSchoolDays: reportCard?.totalSchoolDays ?? term.totalSchoolDays,
            computedTotalSchoolDays: classCalendarSummary.totalSchoolDays,
            stats: {
                presentCount: attendanceStats.present,
                absentCount: attendanceStats.absent,
                recordCount: attendanceStats.recordCount,
            },
        });

        const studentEnrollments = allEnrollments.filter(e => e.studentId === studentData.id && e.classArmId === effectiveClassArmId);
        const subjectsWithEnrollment = new Set(studentEnrollments.map(e => e.subjectId));
        const activeEnrolledSubjects = new Set(studentEnrollments.filter(e => e.isActive).map(e => e.subjectId));

        const studentCurrentScores = allCurrentScores.filter(s => s.studentId === studentData.id).filter(score => {
            if (!subjectsWithEnrollment.has(score.subjectId)) return true;
            return activeEnrolledSubjects.has(score.subjectId);
        });

        const studentPrevScores = allPrevScores.filter(s => s.studentId === studentData.id);

        const scoresBySubject = effectiveClassArmId ? (scoresByClassAndSubject[effectiveClassArmId] || {}) : {};

        return normalizeReportCardData({
            student: {
                id: studentData.id,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                otherNames: studentData.otherNames || undefined,
                admissionNumber: studentData.admissionNumber,
                className: effectiveClassArm ? `${effectiveClassArm.class.name} ${effectiveClassArm.armName}` : "Unassigned",
                gender: studentData.gender,
                dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth.toISOString() : undefined,
                photoUrl: studentData.photoUrl ? (studentData.photoUrl.startsWith("http") ? studentData.photoUrl : (useAbsolutePath ? require("path").join(process.cwd(), "public", studentData.photoUrl.startsWith("/") ? studentData.photoUrl.slice(1) : studentData.photoUrl) : studentData.photoUrl)) : undefined
            },
            school: {
                name: school.name,
                address: school.address || "",
                email: school.email || "",
                phone: school.phone || "",
                logoUrl: school.logoUrl || undefined,
                principalSignatureUrl: normalizedPrincipalSignatureUrl || undefined,
                motto: school.motto || undefined
            },
            term: {
                name: term.name,
                sessionName: term.session.name,
                startDate: term.startDate.toISOString(),
                endDate: term.endDate.toISOString(),
                nextTermStartDate: term.resumptionDate?.toISOString()
            },
            attendance,
            academic: {
                subjects: studentCurrentScores.map(s => {
                    const term1Score = studentPrevScores.find(ps => ps.subjectId === s.subjectId && ps.termId === term.session.terms.find(t => t.termNumber === 1)?.id);
                    const term2Score = studentPrevScores.find(ps => ps.subjectId === s.subjectId && ps.termId === term.session.terms.find(t => t.termNumber === 2)?.id);

                    const subjectScores = scoresBySubject[s.subjectId] || [];
                    const avg = subjectScores.length > 0 ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0;

                    const caTotal = s.ca1.toNumber() + s.ca2.toNumber() + s.ca3.toNumber();
                    const endOfTermMetrics = getEndOfTermScoreMetrics(s, studentAssessmentTypes);
                    const studentScoreValue = reportType === "halfTerm" ? s.ca1.toNumber() : endOfTermMetrics.adjustedTotal;

                    const rank = getSubjectRank(subjectScores, studentScoreValue);
                    const minScore = subjectScores.length > 0 ? Math.min(...subjectScores) : 0;
                    const maxScore = subjectScores.length > 0 ? Math.max(...subjectScores) : 0;
                    const examScore = reportType === "halfTerm" ? undefined : s.exam.toNumber();
                    const totalScore = reportType === "halfTerm" ? s.ca1.toNumber() : endOfTermMetrics.adjustedTotal;
                    const gradeDetails = reportType === "halfTerm" ? undefined : calculateGrade(endOfTermMetrics.adjustedTotal, studentGradingRules);

                    return {
                        id: s.subjectId,
                        name: s.subject.name,
                        category: s.subject.category,
                        ca: reportType === "halfTerm" ? s.ca1.toNumber() : caTotal,
                        ca1: s.ca1.toNumber(),
                        ca2: s.ca2.toNumber(),
                        ca3: s.ca3.toNumber(),
                        exam: examScore,
                        total: totalScore,
                        cumulativeTotal1: reportType === "halfTerm" ? undefined : (term1Score ? getEndOfTermScoreMetrics(term1Score, studentAssessmentTypes).adjustedTotal : undefined),
                        cumulativeTotal2: reportType === "halfTerm" ? undefined : (term2Score ? getEndOfTermScoreMetrics(term2Score, studentAssessmentTypes).adjustedTotal : undefined),
                        subjectClassAverage: Number(avg.toFixed(1)),
                        subjectPosition: rank ? getOrdinal(rank) : undefined,
                        grade: reportType === "halfTerm" ? undefined : gradeDetails?.grade || "-",
                        remark: reportType === "halfTerm" ? undefined : gradeDetails?.remark || "-",
                        subjectLowestScore: Number(minScore.toFixed(1)),
                        subjectHighestScore: Number(maxScore.toFixed(1))
                    };
                }),
                summary: reportType === "halfTerm"
                    ? (() => {
                        const h = getHalfTermSummaryFromScores(studentCurrentScores, studentAssessmentTypes);
                        return {
                            totalScore: h.totalScore,
                            totalObtainable: h.totalObtainable,
                            average: h.average,
                            classPosition: undefined,
                            classSize: reportCard?.classSize || undefined
                        };
                    })()
                    : {
                        totalScore: studentCurrentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, studentAssessmentTypes).adjustedTotal, 0),
                        totalObtainable: studentCurrentScores.length * studentAssessmentSummary.countedMaxScore,
                        average: studentCurrentScores.length > 0
                            ? studentCurrentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, studentAssessmentTypes).adjustedTotal, 0) / studentCurrentScores.length
                            : 0,
                        classPosition: reportCard?.classPosition || undefined,
                        classSize: reportCard?.classSize || undefined
                    }
            },
            affective: reportCard?.affectiveRatings.map(r => ({
                name: r.trait.name,
                rating: r.rating
            })) || [],
            psychomotor: reportCard?.psychomotorRatings.map(r => ({
                name: r.skill.name,
                rating: r.rating
            })) || [],
            comments: {
                classTeacher: reportCard?.classTeacherComment || undefined,
                principal: reportCard?.principalComment || undefined,
                promotionStatus: (term.termNumber === 3 && reportType === "endOfTerm")
                    ? ((studentCurrentScores.length > 0 ? studentCurrentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, studentAssessmentTypes).adjustedTotal, 0) / studentCurrentScores.length : 0) >= 50
                        ? "PROMOTED TO NEXT CLASS"
                        : "NOT PROMOTED")
                    : undefined,
                publishedAt: reportCard?.publishedAt?.toISOString() || undefined
            },
            gradingRules: studentGradingRules.length > 0 ? studentGradingRules.map(r => ({
                grade: r.grade,
                minScore: r.minScore,
                maxScore: r.maxScore,
                remark: r.remark
            })) : undefined,
            classTeacherSignatureUrl: classTeacherSignatureUrl || undefined,
            config: config ? {
                activeTemplate: studentActiveTemplate,
                colorScheme: studentCustomTemplateEntry?.colorScheme || config.colorScheme,
                showAttendance: studentCustomTemplateEntry?.showAttendance ?? config.showAttendance,
                showTraits: studentCustomTemplateEntry?.showTraits ?? config.showTraits,
                showSkills: studentCustomTemplateEntry?.showSkills ?? config.showSkills,
                showComments: studentCustomTemplateEntry?.showComments ?? config.showComments,
                showPhoto: studentCustomTemplateEntry?.showPhoto ?? config.showPhoto,
                showPosition: studentCustomTemplateEntry?.showPosition ?? config.showPosition,
                showBehaviourGradeKey: studentCustomTemplateEntry?.showBehaviourGradeKey ?? (config as any).showBehaviourGradeKey,
                customTitles: studentCustomTemplateEntry?.customTitles || config.customTitles || undefined,
                customLayout: studentCustomLayout,
                displayOptions: studentDisplayOptions || (config as any).displayOptions,
                assessmentTypeNames: studentAssessmentTypes.length > 0 ? {
                    ca1: studentCaTypes[0]?.name,
                    ca2: studentCaTypes[1]?.name,
                    ca3: studentCaTypes[2]?.name,
                    exam: studentExamType?.name,
                } : undefined,
            } : undefined,
            reportType
        });
    });
}


