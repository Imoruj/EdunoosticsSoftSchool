export type GradingCategory = "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";
export type GradingPreset = "WAEC";

export interface GradingPresetOption {
    preset: GradingPreset;
    label: string;
}

export interface GradingPresetRule {
    grade: string;
    minScore: number;
    maxScore: number;
    remark: string;
}

const WAEC_SENIOR_RULES: GradingPresetRule[] = [
    { grade: "A1", minScore: 75, maxScore: 100, remark: "Excellent" },
    { grade: "B2", minScore: 70, maxScore: 74, remark: "Very Good" },
    { grade: "B3", minScore: 65, maxScore: 69, remark: "Good" },
    { grade: "C4", minScore: 60, maxScore: 64, remark: "Credit" },
    { grade: "C5", minScore: 55, maxScore: 59, remark: "Credit" },
    { grade: "C6", minScore: 50, maxScore: 54, remark: "Credit" },
    { grade: "D7", minScore: 45, maxScore: 49, remark: "Pass" },
    { grade: "E8", minScore: 40, maxScore: 44, remark: "Pass" },
    { grade: "F9", minScore: 0, maxScore: 39, remark: "Fail" },
];

// Junior WAEC preset based on the provided grading key:
// 80-100 (A), 70-79 (B), 60-69 (C), 50-59 (P), 0-49 (F).
const WAEC_JUNIOR_RULES: GradingPresetRule[] = [
    { grade: "A", minScore: 80, maxScore: 100, remark: "Excellent" },
    { grade: "B", minScore: 70, maxScore: 79, remark: "Good" },
    { grade: "C", minScore: 60, maxScore: 69, remark: "Credit" },
    { grade: "P", minScore: 50, maxScore: 59, remark: "Pass" },
    { grade: "F", minScore: 0, maxScore: 49, remark: "Fail" },
];

const PRESET_RULES: Record<GradingPreset, Partial<Record<GradingCategory, GradingPresetRule[]>>> = {
    WAEC: {
        JUNIOR_SECONDARY: WAEC_JUNIOR_RULES,
        SENIOR_SECONDARY: WAEC_SENIOR_RULES,
    },
};

const PRESET_CATEGORY_MAP: Record<GradingPreset, GradingCategory[]> = {
    WAEC: ["JUNIOR_SECONDARY", "SENIOR_SECONDARY"],
};

export function getPresetLabel(preset: GradingPreset): string {
    if (preset === "WAEC") return "WAEC";
    return "WAEC";
}

export function getPresetOptionsForCategory(category: GradingCategory): GradingPresetOption[] {
    if (category === "JUNIOR_SECONDARY") {
        return [{ preset: "WAEC", label: "Junior WAEC" }];
    }

    if (category === "SENIOR_SECONDARY") {
        return [{ preset: "WAEC", label: "WAEC" }];
    }

    return [];
}

export function isPresetAllowedForCategory(preset: GradingPreset, category: GradingCategory): boolean {
    return PRESET_CATEGORY_MAP[preset].includes(category);
}

export function getGradingPresetRules(preset: GradingPreset, category: GradingCategory): GradingPresetRule[] {
    const rules = PRESET_RULES[preset][category] ?? [];
    return rules.map((rule) => ({ ...rule }));
}
