import { calculateEndOfTermScoreTotals, getAssessmentTypeForField, mapAssessmentTypesToScoreFields, AssessmentTypeLike } from "@/lib/assessment-types";

export { getAssessmentTypeForField };

export function getScoreFieldNumber(value: { toNumber?: () => number } | number | null | undefined): number {
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value || 0);
}

export function getScoreValuesFromRecord(scoreValues: unknown): Record<string, number> {
    if (!scoreValues || typeof scoreValues !== "object" || Array.isArray(scoreValues)) return {};
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(scoreValues as Record<string, unknown>)) {
        result[k] = Number(v ?? 0);
    }
    return result;
}

export function getHalfTermSummaryFromScores(
    scores: Array<{ scoreValues?: unknown }>,
    assessmentTypes: AssessmentTypeLike[]
) {
    const ca1Type = getAssessmentTypeForField(assessmentTypes, "ca1");
    const maxPerSubject = Number(ca1Type?.maxScore) > 0 ? Number(ca1Type?.maxScore) : 10;
    const totalScore = scores.reduce((acc, curr) => {
        const sv = getScoreValuesFromRecord(curr.scoreValues);
        return acc + (sv["ca1"] ?? 0);
    }, 0);
    const n = scores.length;
    const totalObtainable = n * maxPerSubject;
    const average = totalObtainable > 0 ? (totalScore / totalObtainable) * 100 : 0;
    return { totalScore, totalObtainable, average };
}

export function getEndOfTermScoreMetrics(
    score: { scoreValues?: unknown },
    assessmentTypes: AssessmentTypeLike[]
) {
    const mappedTypes = mapAssessmentTypesToScoreFields(assessmentTypes);
    const rawSv = getScoreValuesFromRecord(score.scoreValues);
    const values: Record<string, number> = {};
    for (const at of mappedTypes) {
        values[at.field] = rawSv[at.field] ?? 0;
    }

    return {
        ...values,
        ...calculateEndOfTermScoreTotals(values, assessmentTypes),
    };
}

export function buildActiveEnrollmentLookup(enrollments: Array<{ studentId: string; subjectId: string; isActive: boolean }>) {
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

export function isStudentIncludedInSubjectStats(
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
