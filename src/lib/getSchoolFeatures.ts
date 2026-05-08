import { prisma } from "@/lib/prisma";

export interface FeatureFlags {
    darkModeEnabled: boolean;
    studentsEnabled: boolean;
    teachersEnabled: boolean;
    scoreEntryEnabled: boolean;
    scoreReviewsEnabled: boolean;
    subjectsEnabled: boolean;
    lessonsEnabled: boolean;
    quizzesEnabled: boolean;
    assignmentsEnabled: boolean;
    schemesOfWorkEnabled: boolean;
    classesEnabled: boolean;
    broadsheetEnabled: boolean;
    transcriptsEnabled: boolean;
    reportCardsEnabled: boolean;
    legacyRecordsEnabled: boolean;
    uploadRequestsEnabled: boolean;
    attendanceEnabled: boolean;
    behaviourEnabled: boolean;
    communicationEnabled: boolean;
    feesEnabled: boolean;
    settingsEnabled: boolean;
}

export type SchoolFeatureField = Exclude<keyof FeatureFlags, "darkModeEnabled">;

export const SCHOOL_FEATURE_SELECT = {
    studentsEnabled: true,
    teachersEnabled: true,
    scoreEntryEnabled: true,
    scoreReviewsEnabled: true,
    subjectsEnabled: true,
    lessonsEnabled: true,
    quizzesEnabled: true,
    assignmentsEnabled: true,
    schemesOfWorkEnabled: true,
    classesEnabled: true,
    broadsheetEnabled: true,
    transcriptsEnabled: true,
    reportCardsEnabled: true,
    legacyRecordsEnabled: true,
    uploadRequestsEnabled: true,
    attendanceEnabled: true,
    behaviourEnabled: true,
    communicationEnabled: true,
    feesEnabled: true,
    settingsEnabled: true,
} satisfies Record<SchoolFeatureField, true>;

export const ALL_ENABLED_FEATURES: FeatureFlags = {
    darkModeEnabled: true,
    studentsEnabled: true,
    teachersEnabled: true,
    scoreEntryEnabled: true,
    scoreReviewsEnabled: true,
    subjectsEnabled: true,
    lessonsEnabled: true,
    quizzesEnabled: true,
    assignmentsEnabled: true,
    schemesOfWorkEnabled: true,
    classesEnabled: true,
    broadsheetEnabled: true,
    transcriptsEnabled: true,
    reportCardsEnabled: true,
    legacyRecordsEnabled: true,
    uploadRequestsEnabled: true,
    attendanceEnabled: true,
    behaviourEnabled: true,
    communicationEnabled: true,
    feesEnabled: true,
    settingsEnabled: true,
};

/**
 * Returns the SchoolFeatureControl record for a school.
 * Automatically creates a default record (all features enabled) if none exists.
 */
export async function getSchoolFeatures(schoolId: string): Promise<FeatureFlags> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = prisma as any;

    if (typeof client.schoolFeatureControl?.upsert !== "function") {
        console.warn("[features] schoolFeatureControl model not available, returning defaults");
        return ALL_ENABLED_FEATURES;
    }

    const record = await client.schoolFeatureControl.upsert({
        where: { schoolId },
        update: {},
        create: { schoolId },
        select: SCHOOL_FEATURE_SELECT,
    });

    return record as FeatureFlags;
}

/**
 * Whitelist of writable feature fields.
 */
export const SCHOOL_FEATURE_FIELDS = [
    "studentsEnabled", "teachersEnabled",
    "scoreEntryEnabled", "scoreReviewsEnabled", "subjectsEnabled",
    "lessonsEnabled", "quizzesEnabled", "assignmentsEnabled", "schemesOfWorkEnabled",
    "classesEnabled", "broadsheetEnabled", "transcriptsEnabled",
    "reportCardsEnabled", "legacyRecordsEnabled", "uploadRequestsEnabled",
    "attendanceEnabled", "behaviourEnabled", "communicationEnabled",
    "feesEnabled", "settingsEnabled",
] as const;

/**
 * Picks only known boolean feature fields from any record.
 */
export function extractFeatureFlags(
    raw: Partial<Record<keyof FeatureFlags, unknown>>
): FeatureFlags {
    const features = { ...ALL_ENABLED_FEATURES };
    for (const field of SCHOOL_FEATURE_FIELDS) {
        features[field] = typeof raw[field] === "boolean" ? raw[field] as boolean : true;
    }
    features.darkModeEnabled = typeof raw.darkModeEnabled === "boolean" ? raw.darkModeEnabled : true;
    return features;
}

