
import { prisma } from "@/lib/prisma";
import { ReportCardData } from "@/components/reports/types";
import ReactPDF from "@react-pdf/renderer";
import ReportCardDocument from "@/components/reports/ReportCardDocument";
import { resolveTemplateForTerm, resolveClassArmOverride } from "@/lib/templateResolver";
import React from "react";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals, getAssessmentTypeSummary } from "@/lib/assessment-types";

const SCHOOL_TIMEZONE = "Africa/Lagos";

function getScoreFieldNumber(value: { toNumber?: () => number } | number | null | undefined) {
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value || 0);
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

async function getSchoolCalendarSummary(schoolId: string, startDate: Date, endDate: Date) {
    const closedDays = await prisma.publicHoliday.findMany({
        where: {
            schoolId,
            date: { gte: startDate, lte: endDate },
        },
        select: { date: true },
    });
    const closedDateKeys = new Set(closedDays.map((day) => toSchoolDateKey(day.date)));
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
        closedDates: closedDays.map((day) => day.date),
    };
}

// Helper to calculate attendance if not stored
async function getAttendanceStats(studentId: string, startDate: Date, endDate: Date, closedDates: Date[] = []) {
    const dateFilter = {
        gte: startDate,
        lte: endDate,
        ...(closedDates.length ? { notIn: closedDates } : {}),
    };

    const presentCount = await prisma.attendance.count({
        where: {
            studentId,
            date: dateFilter,
            status: "PRESENT"
        }
    });
    const absentCount = await prisma.attendance.count({
        where: {
            studentId,
            date: dateFilter,
            status: "ABSENT"
        }
    });
    return { presentCount, absentCount };
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
    const calendarSummary = await getSchoolCalendarSummary(school.id, term.startDate, term.endDate);

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
            orderBy: { maxScore: "desc" }
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
    const assessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
        schoolId: school.id,
        classArmId: effectiveClassArmId,
    });
    const caTypes = assessmentTypes.filter(t => !t.name.toLowerCase().includes("exam"));
    const examType = assessmentTypes.find(t => t.name.toLowerCase().includes("exam"));
    const assessmentSummary = getAssessmentTypeSummary(assessmentTypes);

    // Use report-card class context for historical records, then fallback to student's current class.
    const classTeacherSignatureUrl = effectiveClassArm?.classTeacherId
        ? (await prisma.user.findUnique({ where: { id: effectiveClassArm.classTeacherId }, select: { signatureUrl: true } }))?.signatureUrl || undefined
        : undefined;

    // 4. Fetch Attendance
    let attendance = {
        daysPresent: reportCard?.daysPresent || 0,
        daysAbsent: reportCard?.daysAbsent || 0,
        totalSchoolDays: reportCard?.totalSchoolDays ?? calendarSummary.totalSchoolDays ?? term.totalSchoolDays ?? 0
    };

    if (!reportCard?.daysPresent && !reportCard?.daysAbsent) {
        const stats = await getAttendanceStats(studentId, term.startDate, term.endDate, calendarSummary.closedDates);
        attendance.daysPresent = stats.presentCount;
        attendance.daysAbsent = stats.absentCount;
    }

    // 5. Fetch Scores for current term
    const allCurrentScores = await prisma.score.findMany({
        where: { studentId, termId },
        include: { subject: true }
    });

    // Filter out subjects the student is not enrolled in
    const enrollments = effectiveClassArmId
        ? await prisma.subjectEnrollment.findMany({
            where: {
                studentId,
                termId,
                classArmId: effectiveClassArmId
            }
        })
        : [];

    // Build a set of subject IDs that have enrollment records for this class arm/term
    const subjectsWithEnrollment = new Set(enrollments.map(e => e.subjectId));
    // Build a set of subject IDs the student is actively enrolled in
    const activeEnrolledSubjects = new Set(enrollments.filter(e => e.isActive).map(e => e.subjectId));

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
            termId: { in: previousTerms.map(t => t.id) }
        },
        include: { subject: true }
    }) : [];

    // Fetch all scores for this class arm and term to calculate averages and positions
    const allClassScores = effectiveClassArmId
        ? await prisma.score.findMany({
            where: {
                termId,
                student: { classArmId: effectiveClassArmId }
            }
        })
        : [];

    // Group allClassScores by subjectId
    // For halfTerm: use CA1 only (matches what's shown in half-term report table)
    // For endOfTerm: use full total
    const scoresBySubject: Record<string, number[]> = {};
    allClassScores.forEach(s => {
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
    return {
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
            principalSignatureUrl: school.principalSignatureUrl || undefined,
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

                // Rank calculation (use CA1 for halfTerm, full total for endOfTerm)
                const sorted = [...subjectScores].sort((a, b) => b - a);
                const computedRank = sorted.indexOf(studentScoreValue) + 1;
                const rank = computedRank > 0 ? computedRank : (s.subjectPosition || 0);
                const minScore = subjectScores.length > 0 ? Math.min(...subjectScores) : 0;
                const maxScore = subjectScores.length > 0 ? Math.max(...subjectScores) : 0;
                const examScore = reportType === "halfTerm" ? undefined : s.exam.toNumber();
                const totalScore = reportType === "halfTerm" ? caTotal : endOfTermMetrics.adjustedTotal;
                const gradeDetails = reportType === "halfTerm" ? undefined : calculateGrade(endOfTermMetrics.adjustedTotal, gradingRules);

                return {
                    id: s.subjectId,
                    name: s.subject.name,
                    category: s.subject.category,
                    ca: caTotal,
                    ca1: s.ca1.toNumber(),
                    ca2: s.ca2.toNumber(),
                    ca3: s.ca3.toNumber(),
                    exam: examScore,
                    total: totalScore,
                    cumulativeTotal1: reportType === "halfTerm" ? undefined : (term1Score ? getEndOfTermScoreMetrics(term1Score, assessmentTypes).adjustedTotal : undefined),
                    cumulativeTotal2: reportType === "halfTerm" ? undefined : (term2Score ? getEndOfTermScoreMetrics(term2Score, assessmentTypes).adjustedTotal : undefined),
                    subjectClassAverage: Number(avg.toFixed(1)),
                    subjectPosition: getOrdinal(rank),
                    grade: reportType === "halfTerm" ? undefined : gradeDetails?.grade || "-",
                    remark: reportType === "halfTerm" ? undefined : gradeDetails?.remark || "-",
                    subjectLowestScore: minScore,
                    subjectHighestScore: maxScore
                };
            }),
            summary: {
                totalScore: reportType === "halfTerm"
                    ? currentScores.reduce((acc, curr) => acc + (curr.ca1.toNumber() + curr.ca2.toNumber() + curr.ca3.toNumber()), 0)
                    : currentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, assessmentTypes).adjustedTotal, 0),
                totalObtainable: reportType === "halfTerm"
                    ? (config as any)?.maxCaScore ? currentScores.length * (config as any).maxCaScore : currentScores.length * 30 // Fallback to 30 if not specified
                    : currentScores.length * assessmentSummary.countedMaxScore,
                average: reportType === "halfTerm"
                    ? (currentScores.length > 0 ? currentScores.reduce((acc, curr) => acc + (curr.ca1.toNumber() + curr.ca2.toNumber() + curr.ca3.toNumber()), 0) / currentScores.length : 0)
                    : (currentScores.length > 0 ? currentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, assessmentTypes).adjustedTotal, 0) / currentScores.length : 0),
                classPosition: reportType === "halfTerm" ? undefined : reportCard?.classPosition || undefined,
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
    };
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
    const [config, term, allGradingRules] = await Promise.all([
        prisma.reportCardConfig.findUnique({ where: { schoolId: school.id } }),
        prisma.term.findUnique({
            where: { id: termId },
            include: {
                session: { include: { terms: { orderBy: { termNumber: "asc" } } } }
            }
        }),
        prisma.gradingRule.findMany({
            where: { schoolId: school.id },
            orderBy: { maxScore: "desc" }
        })
    ]);

    if (!term) throw new Error("Term not found");
    const calendarSummary = await getSchoolCalendarSummary(school.id, term.startDate, term.endDate);

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

    // We need to fetch signatures for any class teacher involved
    const classTeacherIds = new Set<string>();
    allReportCards.forEach(rc => { if (rc.classArm?.classTeacherId) classTeacherIds.add(rc.classArm.classTeacherId); });
    studentsData.forEach(s => { if (s.classArm?.classTeacherId) classTeacherIds.add(s.classArm.classTeacherId); });

    const classTeachers = await prisma.user.findMany({
        where: { id: { in: Array.from(classTeacherIds) } },
        select: { id: true, signatureUrl: true }
    });
    const teacherSignatures = new Map(classTeachers.map(t => [t.id, t.signatureUrl]));

    // Fetch Attendances (if missing from Report Card)
    // To do this strictly correct, we'd need to group by student, but we can just fetch all attendances and filter
    const allAttendances = await prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: {
            studentId: { in: studentIds },
            date: {
                gte: term.startDate,
                lte: term.endDate,
                ...(calendarSummary.closedDates.length ? { notIn: calendarSummary.closedDates } : {}),
            }
        },
        _count: { status: true }
    });

    const attendanceMap = new Map<string, { present: number, absent: number }>();
    allAttendances.forEach(a => {
        const studentId = a.studentId;
        if (!attendanceMap.has(studentId)) attendanceMap.set(studentId, { present: 0, absent: 0 });
        if (a.status === "PRESENT") attendanceMap.get(studentId)!.present += a._count.status;
        if (a.status === "ABSENT") attendanceMap.get(studentId)!.absent += a._count.status;
    });

    // Fetch Enrollments & Scores
    const [allCurrentScores, allPrevScores, allClassScores, allEnrollments] = await Promise.all([
        prisma.score.findMany({
            where: { studentId: { in: studentIds }, termId },
            include: { subject: true }
        }),
        reportType === "endOfTerm" && previousTerms.length > 0 ? prisma.score.findMany({
            where: { studentId: { in: studentIds }, termId: { in: previousTerms.map(t => t.id) } },
            include: { subject: true }
        }) : Promise.resolve([]),
        effectiveClassArmIds.length > 0 ? prisma.score.findMany({
            where: { termId, student: { classArmId: { in: effectiveClassArmIds } } }
        }) : Promise.resolve([]),
        effectiveClassArmIds.length > 0 ? prisma.subjectEnrollment.findMany({
            where: { studentId: { in: studentIds }, termId }
        }) : Promise.resolve([])
    ]);

    // Build overall class scores map: classArmId -> subjectId -> number[]
    const scoresByClassAndSubject: Record<string, Record<string, number[]>> = {};
    allClassScores.forEach(s => {
        // Unfortunately standard score relation doesn't contain classArm directly unless included.
        // We might need to match by student's class arm.
        // For accurate class stats, we assume the frontend sends classArmIds we queried for.
        // If s.student?.classArmId was available, we'd map it. Since it isn't, we approximate by filtering
        // class scores in memory if we fetched the student relation. We did not fetch student relation for allClassScores.
        // We'll calculate a global pool per subject and hope it aligns, or we can fetch `student: { select: { classArmId: true } }` in allClassScores.
    });

    // Better approach for class stats: re-fetch allClassScores with student mapping
    const detailedClassScores = effectiveClassArmIds.length > 0 ? await prisma.score.findMany({
        where: { termId, student: { classArmId: { in: effectiveClassArmIds } } },
        include: { student: { select: { classArmId: true } } }
    }) : [];

    detailedClassScores.forEach(s => {
        const cArmId = s.student?.classArmId;
        if (!cArmId) return;
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

        let attendance = {
            daysPresent: reportCard?.daysPresent || 0,
            daysAbsent: reportCard?.daysAbsent || 0,
            totalSchoolDays: reportCard?.totalSchoolDays ?? calendarSummary.totalSchoolDays ?? term.totalSchoolDays ?? 0
        };

        if (!reportCard?.daysPresent && !reportCard?.daysAbsent) {
            const stats = attendanceMap.get(studentData.id) || { present: 0, absent: 0 };
            attendance.daysPresent = stats.present;
            attendance.daysAbsent = stats.absent;
        }

        const studentEnrollments = allEnrollments.filter(e => e.studentId === studentData.id && e.classArmId === effectiveClassArmId);
        const subjectsWithEnrollment = new Set(studentEnrollments.map(e => e.subjectId));
        const activeEnrolledSubjects = new Set(studentEnrollments.filter(e => e.isActive).map(e => e.subjectId));

        const studentCurrentScores = allCurrentScores.filter(s => s.studentId === studentData.id).filter(score => {
            if (!subjectsWithEnrollment.has(score.subjectId)) return true;
            return activeEnrolledSubjects.has(score.subjectId);
        });

        const studentPrevScores = allPrevScores.filter(s => s.studentId === studentData.id);

        const scoresBySubject = effectiveClassArmId ? (scoresByClassAndSubject[effectiveClassArmId] || {}) : {};

        return {
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
                principalSignatureUrl: school.principalSignatureUrl || undefined,
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

                    const sorted = [...subjectScores].sort((a, b) => b - a);
                    const computedRank = sorted.indexOf(studentScoreValue) + 1;
                    const rank = computedRank > 0 ? computedRank : (s.subjectPosition || 0);
                    const minScore = subjectScores.length > 0 ? Math.min(...subjectScores) : 0;
                    const maxScore = subjectScores.length > 0 ? Math.max(...subjectScores) : 0;
                    const examScore = reportType === "halfTerm" ? undefined : s.exam.toNumber();
                    const totalScore = reportType === "halfTerm" ? caTotal : endOfTermMetrics.adjustedTotal;
                    const gradeDetails = reportType === "halfTerm" ? undefined : calculateGrade(endOfTermMetrics.adjustedTotal, studentGradingRules);

                    return {
                        id: s.subjectId,
                        name: s.subject.name,
                        category: s.subject.category,
                        ca: caTotal,
                        ca1: s.ca1.toNumber(),
                        ca2: s.ca2.toNumber(),
                        ca3: s.ca3.toNumber(),
                        exam: examScore,
                        total: totalScore,
                        cumulativeTotal1: reportType === "halfTerm" ? undefined : (term1Score ? getEndOfTermScoreMetrics(term1Score, studentAssessmentTypes).adjustedTotal : undefined),
                        cumulativeTotal2: reportType === "halfTerm" ? undefined : (term2Score ? getEndOfTermScoreMetrics(term2Score, studentAssessmentTypes).adjustedTotal : undefined),
                        subjectClassAverage: Number(avg.toFixed(1)),
                        subjectPosition: getOrdinal(rank),
                        grade: reportType === "halfTerm" ? undefined : gradeDetails?.grade || "-",
                        remark: reportType === "halfTerm" ? undefined : gradeDetails?.remark || "-",
                        subjectLowestScore: minScore,
                        subjectHighestScore: maxScore
                    };
                }),
                summary: {
                    totalScore: reportType === "halfTerm"
                        ? studentCurrentScores.reduce((acc, curr) => acc + (curr.ca1.toNumber() + curr.ca2.toNumber() + curr.ca3.toNumber()), 0)
                        : studentCurrentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, studentAssessmentTypes).adjustedTotal, 0),
                    totalObtainable: reportType === "halfTerm"
                        ? (config as any)?.maxCaScore ? studentCurrentScores.length * (config as any).maxCaScore : studentCurrentScores.length * 30
                        : studentCurrentScores.length * studentAssessmentSummary.countedMaxScore,
                    average: reportType === "halfTerm"
                        ? (studentCurrentScores.length > 0 ? studentCurrentScores.reduce((acc, curr) => acc + (curr.ca1.toNumber() + curr.ca2.toNumber() + curr.ca3.toNumber()), 0) / studentCurrentScores.length : 0)
                        : (studentCurrentScores.length > 0 ? studentCurrentScores.reduce((acc, curr) => acc + getEndOfTermScoreMetrics(curr, studentAssessmentTypes).adjustedTotal, 0) / studentCurrentScores.length : 0),
                    classPosition: reportType === "halfTerm" ? undefined : reportCard?.classPosition || undefined,
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
        };
    });
}


