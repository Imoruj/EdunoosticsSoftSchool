export type ScoreFieldKey = string;

export interface AssessmentTypeComponentLike {
    id: string;
    name: string;
    maxScore: number;
    order: number;
}

export interface AssessmentTypeLike {
    id: string;
    name: string;
    shortName?: string | null;
    maxScore: number;
    order: number;
    includeInTotal?: boolean;
    components?: AssessmentTypeComponentLike[];
}

export interface AssessmentTypeField extends AssessmentTypeLike {
    field: ScoreFieldKey;
}

export const MAX_EXAM_ASSESSMENT_TYPES = 1;

export type ScoreFieldValues = Record<string, number>;

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
    let caCount = 0;
    let examAdded = false;

    for (const type of sortedTypes) {
        if (isExamAssessmentType(type)) {
            if (!examAdded) {
                mapped.push({ ...type, field: "exam" });
                examAdded = true;
            }
            continue;
        }

        caCount += 1;
        mapped.push({ ...type, field: `ca${caCount}` });
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
    const examCount = types.filter((type) => isExamAssessmentType(type)).length;
    if (examCount > MAX_EXAM_ASSESSMENT_TYPES) {
        return "You can only use one exam component per class.";
    }

    return null;
}
