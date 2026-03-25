
import { prisma } from "@/lib/prisma";
import { BroadsheetData, BroadsheetStudent, BroadsheetStudentScore, BroadsheetSubject } from "@/components/reports/broadsheetTypes";
import ReactPDF from "@react-pdf/renderer";
import BroadsheetDocument from "@/components/reports/BroadsheetDocument";
import { resolveTemplateForTerm } from "@/lib/templateResolver";
import React from "react";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals } from "@/lib/assessment-types";

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

export async function generateBroadsheetData(
    classArmId: string,
    termId: string,
    reportType: "halfTerm" | "endOfTerm" = "endOfTerm"
): Promise<BroadsheetData> {
    // 1. Fetch ClassArm with Class and School
    const classArm = await prisma.classArm.findUnique({
        where: { id: classArmId },
        include: {
            class: {
                include: { school: true }
            }
        }
    });

    if (!classArm) throw new Error("Class arm not found");
    const school = classArm.class.school;
    if (!school) throw new Error("School data not found");

    // 2. Fetch BroadsheetConfig
    const dbConfig = await prisma.broadsheetConfig.findUnique({
        where: { schoolId: school.id }
    });

    // 3. Fetch Term with Session and all session terms
    const term = await prisma.term.findUnique({
        where: { id: termId },
        include: {
            session: {
                include: {
                    terms: { orderBy: { termNumber: "asc" } }
                }
            }
        }
    });

    if (!term) throw new Error("Term not found");
    const previousTerms = term.session.terms.filter(t => t.termNumber < term.termNumber);

    // Resolve template via term mappings
    let activeTemplate = dbConfig?.activeTemplate || "standard";
    let resolvedDisplayOptions: any = dbConfig?.displayOptions;

    activeTemplate = await resolveTemplateForTerm({
        prisma,
        schoolId: school.id,
        termId: term.id,
        termNumber: term.termNumber,
        reportType,
        termMappings: (dbConfig as any)?.termMappings,
        fallbackTemplate: activeTemplate,
        classId: classArm.classId,
    });

    // If resolved template is a custom one, load its full config
    const customTemplates = (dbConfig as any)?.customTemplates as Record<string, any> | undefined;
    const baseTemplates = new Set(["standard"]);

    // Guard against stale mappings pointing to removed custom templates.
    if (!customTemplates?.[activeTemplate] && !baseTemplates.has(activeTemplate)) {
        activeTemplate = dbConfig?.activeTemplate || "standard";
    }
    if (!customTemplates?.[activeTemplate] && !baseTemplates.has(activeTemplate)) {
        activeTemplate = "standard";
    }

    const customTemplateEntry = customTemplates?.[activeTemplate];
    if (customTemplateEntry) {
        if (customTemplateEntry.displayOptions) {
            resolvedDisplayOptions = customTemplateEntry.displayOptions;
        }
        if (customTemplateEntry.activeTemplate) {
            activeTemplate = customTemplateEntry.activeTemplate;
        }
    }

    // 4. Fetch students in this class arm for the selected session context
    const students = term.session.isCurrent
        ? await prisma.student.findMany({
            where: { classArmId, isActive: true, schoolId: school.id },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
        })
        : await (async () => {
            const sessionTermIds = term.session.terms.map(t => t.id);
            const [rcStudents, seStudents] = await Promise.all([
                prisma.reportCard.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ["studentId"]
                }),
                prisma.subjectEnrollment.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ["studentId"]
                })
            ]);

            const historicalStudentIds = Array.from(new Set([
                ...rcStudents.map(s => s.studentId),
                ...seStudents.map(s => s.studentId)
            ]));

            if (historicalStudentIds.length === 0) return [];

            return prisma.student.findMany({
                where: {
                    id: { in: historicalStudentIds },
                    schoolId: school.id
                },
                orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
            });
        })();

    if (students.length === 0) {
        // Return empty broadsheet data
        return buildEmptyBroadsheetData(school, term, classArm, reportType, dbConfig, activeTemplate, resolvedDisplayOptions);
    }

    const studentIds = students.map(s => s.id);

    // 5. Fetch subjects/scores/enrollments for this class context
    const [subjectClassArms, allScores, enrollments] = await Promise.all([
        prisma.subjectClassArm.findMany({
            where: { classArmId },
            include: { subject: true },
            orderBy: { subject: { name: "asc" } }
        }),
        prisma.score.findMany({
            where: {
                termId,
                studentId: { in: studentIds }
            },
            include: { subject: true }
        }),
        prisma.subjectEnrollment.findMany({
            where: { classArmId, termId },
            include: { subject: true }
        })
    ]);

    // Build subject list from class assignment + term enrollments + recorded scores
    const subjectMap = new Map<string, BroadsheetSubject>();
    subjectClassArms.forEach(sca => {
        subjectMap.set(sca.subject.id, {
            id: sca.subject.id,
            name: sca.subject.name,
            code: sca.subject.code || undefined
        });
    });
    enrollments.forEach(enrollment => {
        subjectMap.set(enrollment.subject.id, {
            id: enrollment.subject.id,
            name: enrollment.subject.name,
            code: enrollment.subject.code || undefined
        });
    });
    allScores.forEach(score => {
        subjectMap.set(score.subject.id, {
            id: score.subject.id,
            name: score.subject.name,
            code: score.subject.code || undefined
        });
    });

    const subjects: BroadsheetSubject[] = Array.from(subjectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    // Build enrollment lookup: subjectId -> Set of active student IDs
    const subjectsWithEnrollment = new Set(enrollments.map(e => e.subjectId));
    const activeEnrollmentBySubject: Record<string, Set<string>> = {};
    enrollments.filter(e => e.isActive).forEach(e => {
        if (!activeEnrollmentBySubject[e.subjectId]) {
            activeEnrollmentBySubject[e.subjectId] = new Set();
        }
        activeEnrollmentBySubject[e.subjectId].add(e.studentId);
    });

    // 8. Fetch previous term scores (endOfTerm only)
    const prevScores = reportType === "endOfTerm" ? await prisma.score.findMany({
        where: {
            studentId: { in: studentIds },
            termId: { in: previousTerms.map(t => t.id) }
        }
    }) : [];

    // 9. Fetch assessment types and grading rules
    const assessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
        schoolId: school.id,
        classArmId,
    });

    const gradingRules = await prisma.gradingRule.findMany({
        where: { schoolId: school.id },
        orderBy: { maxScore: "desc" }
    });

    // Helper: get grade from total
    const getGrade = (total: number): string => {
        const rule = gradingRules.find(r => total >= r.minScore && total <= r.maxScore);
        return rule ? rule.grade : "-";
    };

    // 10. Group scores by student and subject
    const scoreMap: Record<string, Record<string, typeof allScores[0]>> = {};
    allScores.forEach(score => {
        if (!scoreMap[score.studentId]) scoreMap[score.studentId] = {};
        scoreMap[score.studentId][score.subjectId] = score;
    });

    // Group prev scores by student and subject+term
    const prevScoreMap: Record<string, Record<string, number>> = {};
    prevScores.forEach(score => {
        const key = `${score.studentId}_${score.subjectId}_${score.termId}`;
        prevScoreMap[key] = { total: getEndOfTermScoreMetrics(score, assessmentTypes).adjustedTotal };
    });

    const term1Id = term.session.terms.find(t => t.termNumber === 1)?.id;
    const term2Id = term.session.terms.find(t => t.termNumber === 2)?.id;

    // 11. Build per-subject score arrays for ranking (totals per subject across all students)
    const subjectTotals: Record<string, { studentId: string; value: number }[]> = {};
    subjects.forEach(sub => {
        subjectTotals[sub.id] = [];
    });

    students.forEach(student => {
        subjects.forEach(subject => {
            // Check enrollment
            if (subjectsWithEnrollment.has(subject.id)) {
                if (!activeEnrollmentBySubject[subject.id]?.has(student.id)) {
                    return; // Student not enrolled in this subject
                }
            }

            const score = scoreMap[student.id]?.[subject.id];
            if (score) {
                const value = reportType === "halfTerm"
                    ? (score.ca1.toNumber() + score.ca2.toNumber() + score.ca3.toNumber())
                    : getEndOfTermScoreMetrics(score, assessmentTypes).adjustedTotal;
                subjectTotals[subject.id].push({ studentId: student.id, value });
            }
        });
    });

    // Sort and build competition ranking positions per subject (1, 1, 1, 4)
    const subjectPositions: Record<string, Record<string, number>> = {};
    Object.keys(subjectTotals).forEach(subjectId => {
        const rankings = subjectTotals[subjectId].sort((a, b) => b.value - a.value);
        let currentRank = 0;
        let previousValue: number | null = null;
        subjectPositions[subjectId] = {};

        rankings.forEach((entry, index) => {
            if (previousValue === null || entry.value !== previousValue) {
                currentRank = index + 1;
                previousValue = entry.value;
            }

            subjectPositions[subjectId][entry.studentId] = currentRank;
        });
    });

    // 12. Build student data
    const broadsheetStudents: BroadsheetStudent[] = students.map(student => {
        const studentScores: BroadsheetStudentScore[] = subjects.map(subject => {
            // Check enrollment
            const isEnrolled = !subjectsWithEnrollment.has(subject.id) ||
                activeEnrollmentBySubject[subject.id]?.has(student.id);

            const score = scoreMap[student.id]?.[subject.id];

            if (!score || !isEnrolled) {
                return {
                    subjectId: subject.id,
                    ca1: 0, ca2: 0, ca3: 0, caTotal: 0,
                    exam: 0, total: 0, grade: "-", position: 0,
                    term1Total: reportType === "endOfTerm" ? 0 : undefined,
                    term2Total: reportType === "endOfTerm" ? 0 : undefined,
                };
            }

            const ca1 = score.ca1.toNumber();
            const ca2 = score.ca2.toNumber();
            const ca3 = score.ca3.toNumber();
            const caTotal = ca1 + ca2 + ca3;
            const exam = score.exam.toNumber();
            const endOfTermMetrics = getEndOfTermScoreMetrics(score, assessmentTypes);
            const total = reportType === "halfTerm" ? caTotal : endOfTermMetrics.adjustedTotal;
            const grade = reportType === "halfTerm" ? "-" : getGrade(total);

            const position = subjectPositions[subject.id]?.[student.id] ?? 0;

            // Previous term totals
            let term1Total: number | undefined;
            let term2Total: number | undefined;
            if (reportType === "endOfTerm") {
                if (term1Id) {
                    const key = `${student.id}_${subject.id}_${term1Id}`;
                    term1Total = prevScoreMap[key]?.total || 0;
                }
                if (term2Id) {
                    const key = `${student.id}_${subject.id}_${term2Id}`;
                    term2Total = prevScoreMap[key]?.total || 0;
                }
            }

            return {
                subjectId: subject.id,
                ca1, ca2, ca3, caTotal,
                exam, total, grade, position,
                term1Total, term2Total
            };
        });

        const grandTotal = studentScores.reduce((sum, s) => sum + s.total, 0);
        const subjectCount = studentScores.filter(s => s.total > 0).length;
        const average = subjectCount > 0 ? Number((grandTotal / subjectCount).toFixed(2)) : 0;

        return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            scores: studentScores,
            grandTotal,
            average,
            overallPosition: 0, // Will be calculated below
            subjectCount
        };
    });

    // 13. Calculate overall positions (by grandTotal descending)
    const sortedByTotal = [...broadsheetStudents].sort((a, b) => b.grandTotal - a.grandTotal);
    sortedByTotal.forEach((student, index) => {
        const original = broadsheetStudents.find(s => s.id === student.id);
        if (original) original.overallPosition = index + 1;
    });

    // 14. Filter out subjects with no student scores
    const subjectsWithScores = subjects.filter(sub =>
        broadsheetStudents.some(student =>
            student.scores.some(score => score.subjectId === sub.id && score.total > 0)
        )
    );

    // Remove scores for filtered-out subjects from each student
    const filteredSubjectIds = new Set(subjectsWithScores.map(s => s.id));
    broadsheetStudents.forEach(student => {
        student.scores = student.scores.filter(score => filteredSubjectIds.has(score.subjectId));
    });

    // 15. Build summary
    // For half-term, highest/lowest should be based on CA subtotal (CAT/CA column).
    const summary: Record<string, number[]> = {};
    subjectsWithScores.forEach(sub => { summary[sub.id] = []; });

    broadsheetStudents.forEach(student => {
        student.scores.forEach(score => {
            const val = reportType === "halfTerm" ? score.caTotal : score.total;
            if (val > 0) {
                summary[score.subjectId]?.push(val);
            }
        });
    });

    const highest: Record<string, number> = {};
    const lowest: Record<string, number> = {};
    const studentCountBySubject: Record<string, number> = {};
    subjectsWithScores.forEach(sub => {
        const values = summary[sub.id] || [];
        highest[sub.id] = values.length > 0 ? Math.max(...values) : 0;
        lowest[sub.id] = values.length > 0 ? Math.min(...values) : 0;
        studentCountBySubject[sub.id] = values.length;
    });

    // 16. Build config object
    const config = {
        activeTemplate,
        colorScheme: customTemplateEntry?.colorScheme || dbConfig?.colorScheme || "blue",
        showCA1: customTemplateEntry?.showCA1 ?? dbConfig?.showCA1 ?? true,
        showCA2: customTemplateEntry?.showCA2 ?? dbConfig?.showCA2 ?? true,
        showExam: customTemplateEntry?.showExam ?? dbConfig?.showExam ?? true,
        showSubjectTotal: customTemplateEntry?.showSubjectTotal ?? dbConfig?.showSubjectTotal ?? true,
        showGrade: customTemplateEntry?.showGrade ?? dbConfig?.showGrade ?? true,
        showPosition: customTemplateEntry?.showPosition ?? dbConfig?.showPosition ?? true,
        customTitles: customTemplateEntry?.customTitles || dbConfig?.customTitles || undefined,
        displayOptions: resolvedDisplayOptions || undefined,
    };

    return {
        school: {
            name: school.name,
            address: school.address || "",
            motto: school.motto || undefined,
            logoUrl: school.logoUrl || undefined,
            phone: school.phone || undefined,
            email: school.email || undefined,
        },
        session: { name: term.session.name },
        term: { name: term.name, termNumber: term.termNumber },
        classArm: {
            className: classArm.class.name,
            armName: classArm.armName,
            level: classArm.class.level || undefined,
        },
        reportType,
        assessmentTypes: assessmentTypes.map(at => ({
            name: at.name,
            shortName: at.shortName || undefined,
            maxScore: at.maxScore,
        })),
        subjects: subjectsWithScores,
        students: broadsheetStudents,
        summary: { highest, lowest, studentCount: broadsheetStudents.length, studentCountBySubject },
        config,
        gradingRules: gradingRules.map(r => ({
            grade: r.grade,
            minScore: r.minScore,
            maxScore: r.maxScore,
            remark: r.remark,
        })),
    };
}

function buildEmptyBroadsheetData(
    school: any, term: any, classArm: any,
    reportType: "halfTerm" | "endOfTerm",
    dbConfig: any, activeTemplate: string, displayOptions: any
): BroadsheetData {
    return {
        school: {
            name: school.name,
            address: school.address || "",
            motto: school.motto || undefined,
            logoUrl: school.logoUrl || undefined,
        },
        session: { name: term.session.name },
        term: { name: term.name, termNumber: term.termNumber },
        classArm: {
            className: classArm.class.name,
            armName: classArm.armName,
            level: classArm.class.level || undefined,
        },
        reportType,
        assessmentTypes: [],
        subjects: [],
        students: [],
        summary: { highest: {}, lowest: {}, studentCount: 0, studentCountBySubject: {} },
        config: {
            activeTemplate,
            colorScheme: dbConfig?.colorScheme || "blue",
            showCA1: dbConfig?.showCA1 ?? true,
            showCA2: dbConfig?.showCA2 ?? true,
            showExam: dbConfig?.showExam ?? true,
            showSubjectTotal: dbConfig?.showSubjectTotal ?? true,
            showGrade: dbConfig?.showGrade ?? true,
            showPosition: dbConfig?.showPosition ?? true,
            displayOptions,
        },
    };
}

export async function generateBroadsheetStream(data: BroadsheetData): Promise<NodeJS.ReadableStream> {
    return await ReactPDF.renderToStream(
        <BroadsheetDocument data={data} />
    ) as NodeJS.ReadableStream;
}

