import { PrismaClient } from "@prisma/client";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals, getAssessmentTypeForField } from "@/lib/assessment-types";
import { formatAttendancePoints } from "@/lib/attendance-points";

export type ReportType = "halfTerm" | "endOfTerm";

export interface ReportCommentConfig {
    maxScorePerSubject: "dynamic" | "fixed100";
    scoreDisplayed: "raw" | "rawOutOf100";
    overallAverage: "normalized" | "direct";
    performanceBand: "normalized" | "direct";
    resitSubjects: "never" | "thirdTermBelow50";
    resitEligibleSubjects: string[];
    focusSubjectPolicy: "lowestNormalized" | "lowestRawNotResit";
}

export interface ReportCommentSubjectDetail {
    name: string;
    rawScore: number;
    percentage: number;
    maxScore: number;
    isResitEligible: boolean;
    isResit: boolean;
}

export interface ReportCommentPayload {
    id: string;
    studentId: string;
    termId: string;
    name: string;
    firstName: string;
    lastName: string;
    gender: string;
    term: string;
    schoolId: string;
    reportType: ReportType;
    termNumber: number;
    average: number;
    position: number;
    attendance: string;
    traits: string;
    affective_traits: Record<string, number>;
    psychomotor_skills: Record<string, number>;
    subjectScores: Record<string, number>;
    subjectPercentages: Record<string, number>;
    subjectDetails: ReportCommentSubjectDetail[];
    focusSubject?: {
        name: string;
        percentage: number;
        rawScore: number;
        maxScore: number;
    };
    resitSubjects: string[];
    includeResitAddendum: boolean;
    reportTypeLabel: string;
    resitDate?: string;
}

interface RawScoreRecord {
    ca1: { toNumber?: () => number } | number | null;
    ca2: { toNumber?: () => number } | number | null;
    ca3: { toNumber?: () => number } | number | null;
    exam: { toNumber?: () => number } | number | null;
    total: { toNumber?: () => number } | number | null;
    subject: {
        id: string;
        name: string;
    };
}

const RESIT_ELIGIBLE_SUBJECTS = [
    "mathematics",
    "english language",
    "chemistry",
    "christian religious studies",
    "physics",
    "literature in english",
    "biology",
];

function toNumber(value: { toNumber?: () => number } | number | null | undefined) {
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return 0;
}

function normalizeName(name: string) {
    return name.trim().toLowerCase();
}

function isResitEligibleSubject(name: string) {
    const normalized = normalizeName(name);
    return RESIT_ELIGIBLE_SUBJECTS.some((eligible) =>
        normalized === eligible || normalized.includes(eligible)
    );
}

export async function buildReportCommentPayload(params: {
    prisma: PrismaClient;
    studentData: {
        id: string;
        studentId: string;
        termId: string;
        name: string;
        firstName: string;
        lastName: string;
        gender: string;
        term: string;
        schoolId: string;
        reportType?: ReportType;
        termNumber?: number;
        attendance?: string;
        traits?: string;
        affective_traits?: Record<string, number>;
        psychomotor_skills?: Record<string, number>;
        average?: number;
        position?: number;
    };
    reportCard?: {
        average?: { toNumber?: () => number } | number | null;
        classPosition?: number | null;
        daysPresent?: number | null;
        totalSchoolDays?: number | null;
    } | null;
    term: { termNumber: number; name: string };
    scores: RawScoreRecord[];
    classArmId?: string | null;
    commentConfig?: ReportCommentConfig;
}): Promise<ReportCommentPayload> {
    const {
        prisma,
        studentData,
        reportCard,
        term,
        scores,
        classArmId,
        commentConfig,
    } = params;

    const reportType: ReportType = studentData.reportType || "endOfTerm";
    const assessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
        schoolId: studentData.schoolId,
        classArmId: classArmId || undefined,
    });

    const ca1Type = getAssessmentTypeForField(assessmentTypes, "ca1");
    const halfTermMaxScore = Number(ca1Type?.maxScore ?? 15);

    const subjectDetails: ReportCommentSubjectDetail[] = scores.map((score) => {
        const rawScore = reportType === "halfTerm"
            ? toNumber(score.ca1)
            : calculateEndOfTermScoreTotals(
                {
                    ca1: toNumber(score.ca1),
                    ca2: toNumber(score.ca2),
                    ca3: toNumber(score.ca3),
                    exam: toNumber(score.exam),
                },
                assessmentTypes
            ).adjustedTotal;

        const maxScore = commentConfig?.maxScorePerSubject === "fixed100" ? 100 : (reportType === "halfTerm" ? halfTermMaxScore : 100);
        const percentage = maxScore > 0 ? Number(((rawScore / maxScore) * 100).toFixed(2)) : 0;

        // Use config for resit eligibility
        const isResitEligible = commentConfig?.resitSubjects === "thirdTermBelow50" &&
            reportType === "endOfTerm" &&
            term.termNumber === 3 &&
            (commentConfig.resitEligibleSubjects || []).some(subject =>
                normalizeName(subject) === normalizeName(score.subject.name) ||
                normalizeName(score.subject.name).includes(normalizeName(subject))
            );
        const isResit = isResitEligible && rawScore < 50;

        return {
            name: score.subject.name,
            rawScore,
            percentage,
            maxScore,
            isResitEligible,
            isResit,
        };
    });

    const subjectScores = Object.fromEntries(subjectDetails.map((detail) => [detail.name, detail.rawScore]));
    const subjectPercentages = Object.fromEntries(subjectDetails.map((detail) => [detail.name, detail.percentage]));
    const resitSubjects = subjectDetails.filter((detail) => detail.isResit).map((detail) => detail.name);

    // Use config for focus subject policy
    let focusSubject;
    if (commentConfig?.focusSubjectPolicy === "lowestRawNotResit") {
        focusSubject = subjectDetails
            .filter((detail) => !detail.isResit)
            .sort((a, b) => a.rawScore - b.rawScore)[0];
    } else {
        // Default: lowestNormalized
        focusSubject = subjectDetails
            .filter((detail) => !detail.isResit && detail.percentage < 60)
            .sort((a, b) => a.percentage - b.percentage)[0];
    }

    // Use config for average calculation
    let average: number;
    if (commentConfig?.overallAverage === "direct") {
        average = subjectDetails.length > 0
            ? Number((subjectDetails.reduce((sum, detail) => sum + detail.percentage, 0) / subjectDetails.length).toFixed(2))
            : 0;
    } else {
        // Default: normalized
        const totalMaxScore = subjectDetails.reduce((sum, detail) => sum + detail.maxScore, 0);
        const totalScore = subjectDetails.reduce((sum, detail) => sum + detail.rawScore, 0);
        average = totalMaxScore > 0 ? Number(((totalScore / totalMaxScore) * 100).toFixed(2)) : 0;
    }

    return {
        ...studentData,
        reportType,
        termNumber: term.termNumber,
        average,
        position: reportCard?.classPosition ?? studentData.position ?? 0,
        attendance: studentData.attendance || (reportCard ? formatAttendancePoints(reportCard.daysPresent ?? 0, reportCard.totalSchoolDays ?? 0) : "N/A"),
        traits: studentData.traits || "",
        affective_traits: studentData.affective_traits || {},
        psychomotor_skills: studentData.psychomotor_skills || {},
        subjectScores,
        subjectPercentages,
        subjectDetails,
        focusSubject: focusSubject
            ? {
                name: focusSubject.name,
                percentage: focusSubject.percentage,
                rawScore: focusSubject.rawScore,
                maxScore: focusSubject.maxScore,
            }
            : undefined,
        resitSubjects,
        includeResitAddendum: commentConfig?.resitSubjects === "thirdTermBelow50" && reportType === "endOfTerm" && term.termNumber === 3 && resitSubjects.length > 0,
        reportTypeLabel: reportType === "halfTerm" ? "half term" : "end of term",
    };
}

