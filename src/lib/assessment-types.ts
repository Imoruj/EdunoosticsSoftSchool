export type ScoreFieldKey = "ca1" | "ca2" | "ca3" | "exam";

export interface AssessmentTypeLike {
    id: string;
    name: string;
    shortName?: string | null;
    maxScore: number;
    order: number;
    includeInTotal?: boolean;
}

export interface AssessmentTypeField extends AssessmentTypeLike {
    field: ScoreFieldKey;
}

export const MAX_CLASS_SPECIFIC_ASSESSMENT_TYPES = 4;
export const MAX_CONTINUOUS_ASSESSMENT_TYPES = 3;
export const MAX_EXAM_ASSESSMENT_TYPES = 1;

export interface ScoreFieldValues {
    ca1?: number;
    ca2?: number;
    ca3?: number;
    exam?: number;
}

export interface EndOfTermScoreTotals {
    rawTotal: number;
    countedTotal: number;
    adjustedTotal: number;
    excludedTotal: number;
    includedMaxScore: number;
    isAdjusted: boolean;
}

export function sortAssessmentTypes<T extends { order: number }>(types: T[]): T[] {
    return [...types].sort((a, b) => a.order - b.order);
}

export function isExamAssessmentType(typeOrName: { name: string } | string) {
    const name = typeof typeOrName === "string" ? typeOrName : typeOrName.name;
    return name.trim().toLowerCase().includes("exam");
}

export function countsTowardTotal(type: { includeInTotal?: boolean }) {
    return type.includeInTotal !== false;
}

export function mapAssessmentTypesToScoreFields<T extends AssessmentTypeLike>(types: T[]): Array<T & { field: ScoreFieldKey }> {
    const sortedTypes = sortAssessmentTypes(types);
    const mapped: Array<T & { field: ScoreFieldKey }> = [];
    let continuousAssessmentCount = 0;
    let examAdded = false;

    for (const type of sortedTypes) {
        if (isExamAssessmentType(type)) {
            if (!examAdded) {
                mapped.push({ ...type, field: "exam" });
                examAdded = true;
            }
            continue;
        }

        if (continuousAssessmentCount >= MAX_CONTINUOUS_ASSESSMENT_TYPES) {
            continue;
        }

        const field: ScoreFieldKey =
            continuousAssessmentCount === 0
                ? "ca1"
                : continuousAssessmentCount === 1
                    ? "ca2"
                    : "ca3";

        mapped.push({ ...type, field });
        continuousAssessmentCount += 1;
    }

    return mapped;
}

export function getAssessmentTypeForField<T extends AssessmentTypeLike>(types: T[], field: ScoreFieldKey) {
    return mapAssessmentTypesToScoreFields(types).find((type) => type.field === field);
}

export function getScoreFieldValue(values: ScoreFieldValues, field: ScoreFieldKey) {
    return Number(values[field] || 0);
}

export function getAssessmentTypeSummary<T extends AssessmentTypeLike>(types: T[]) {
    const mappedTypes = mapAssessmentTypesToScoreFields(types);
    const includedTypes = mappedTypes.filter((type) => countsTowardTotal(type));
    const excludedTypes = mappedTypes.filter((type) => !countsTowardTotal(type));

    const totalMaxScore = mappedTypes.reduce((sum, type) => sum + (type.maxScore || 0), 0);
    const countedMaxScore = includedTypes.reduce((sum, type) => sum + (type.maxScore || 0), 0);
    const excludedMaxScore = excludedTypes.reduce((sum, type) => sum + (type.maxScore || 0), 0);

    return {
        mappedTypes,
        includedTypes,
        excludedTypes,
        totalMaxScore,
        countedMaxScore,
        excludedMaxScore,
    };
}

export function calculateEndOfTermScoreTotals(values: ScoreFieldValues, types: AssessmentTypeLike[]): EndOfTermScoreTotals {
    const { mappedTypes, includedTypes } = getAssessmentTypeSummary(types);

    const rawTotal = mappedTypes.reduce((sum, type) => sum + getScoreFieldValue(values, type.field), 0);
    const countedTotal = includedTypes.reduce((sum, type) => sum + getScoreFieldValue(values, type.field), 0);
    const excludedTotal = rawTotal - countedTotal;
    const includedMaxScore = includedTypes.reduce((sum, type) => sum + (type.maxScore || 0), 0);

    const includedContinuousAssessments = includedTypes.filter((type) => type.field !== "exam");
    const countedExamScore = includedTypes
        .filter((type) => type.field === "exam")
        .reduce((sum, type) => sum + getScoreFieldValue(values, type.field), 0);

    let missedMax = 0;
    if (countedExamScore > 0) {
        includedContinuousAssessments.forEach((type) => {
            if (getScoreFieldValue(values, type.field) === 0) {
                missedMax += type.maxScore || 0;
            }
        });
    }

    const obtainable = includedMaxScore - missedMax;
    let adjustedTotal = countedTotal;
    if (missedMax > 0 && obtainable > 0 && countedTotal > 0) {
        adjustedTotal = Math.round((countedTotal / obtainable) * includedMaxScore);
    }

    return {
        rawTotal,
        countedTotal,
        adjustedTotal,
        excludedTotal,
        includedMaxScore,
        isAdjusted: missedMax > 0 && countedTotal > 0,
    };
}

export function validateAssessmentTypeCollection(types: Array<Pick<AssessmentTypeLike, "name">>) {
    if (types.length > MAX_CLASS_SPECIFIC_ASSESSMENT_TYPES) {
        return `You can only use up to ${MAX_CLASS_SPECIFIC_ASSESSMENT_TYPES} score components per class.`;
    }

    const continuousAssessmentCount = types.filter((type) => !isExamAssessmentType(type)).length;
    if (continuousAssessmentCount > MAX_CONTINUOUS_ASSESSMENT_TYPES) {
        return `You can only use up to ${MAX_CONTINUOUS_ASSESSMENT_TYPES} continuous-assessment components per class.`;
    }

    const examCount = types.filter((type) => isExamAssessmentType(type)).length;
    if (examCount > MAX_EXAM_ASSESSMENT_TYPES) {
        return "You can only use one exam component per class.";
    }

    return null;
}
