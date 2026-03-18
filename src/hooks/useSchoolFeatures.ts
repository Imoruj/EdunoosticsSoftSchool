"use client";

import { useState, useEffect } from "react";
import type { FeatureFlags } from "@/lib/getSchoolFeatures";

const DEFAULT_FEATURES: FeatureFlags = {
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

let cache: { features: FeatureFlags; fetchedAt: number } | null = null;
let inFlight: Promise<FeatureFlags> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function useSchoolFeatures(): { features: FeatureFlags; loading: boolean } {
    const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
                if (mounted) {
                    setFeatures(cache.features);
                    setLoading(false);
                }
                return;
            }

            try {
                if (!inFlight) {
                    inFlight = fetch("/api/school/features")
                        .then(async (res) => {
                            if (!res.ok) throw new Error("Failed");
                            const data = await res.json();
                            return data.features as FeatureFlags;
                        })
                        .finally(() => {
                            inFlight = null;
                        });
                }
                const f = await inFlight;
                cache = { features: f, fetchedAt: Date.now() };
                if (mounted) setFeatures(f);
            } catch {
                if (mounted) setFeatures(DEFAULT_FEATURES);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    return { features, loading };
}
