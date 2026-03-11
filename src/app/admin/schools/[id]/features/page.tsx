"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { FeatureFlags } from "@/lib/getSchoolFeatures";

interface FeatureToggleItem {
    key: keyof FeatureFlags;
    label: string;
    description: string;
}

const FEATURES: FeatureToggleItem[] = [
    { key: "studentsEnabled", label: "Students", description: "Manage student records and profiles" },
    { key: "teachersEnabled", label: "Teachers", description: "Manage teacher accounts and assignments" },
    { key: "scoreEntryEnabled", label: "Score Entry", description: "Allow score entry for subjects" },
    { key: "scoreReviewsEnabled", label: "Score Reviews", description: "Review and approve submitted scores" },
    { key: "subjectsEnabled", label: "Subjects", description: "Manage school subjects" },
    { key: "lessonsEnabled", label: "Lessons", description: "Lesson notes and materials" },
    { key: "quizzesEnabled", label: "Quizzes", description: "Student quizzes and assessments" },
    { key: "assignmentsEnabled", label: "Assignments", description: "Class assignments management" },
    { key: "classesEnabled", label: "Classes", description: "Manage class arms and sessions" },
    { key: "broadsheetEnabled", label: "Broadsheet", description: "View class broadsheets" },
    { key: "transcriptsEnabled", label: "Transcripts", description: "Student academic transcripts" },
    { key: "reportCardsEnabled", label: "Report Cards", description: "Generate and publish report cards" },
    { key: "legacyRecordsEnabled", label: "Historical Records", description: "Legacy/historical student records" },
    { key: "uploadRequestsEnabled", label: "Upload Requests", description: "Bulk score upload requests" },
    { key: "attendanceEnabled", label: "Attendance", description: "Track student attendance" },
    { key: "behaviourEnabled", label: "Behaviour & Skills", description: "Affective traits and psychomotor skills" },
    { key: "communicationEnabled", label: "Communication", description: "SMS and email messaging" },
    { key: "feesEnabled", label: "Fees", description: "Fee structures and payment tracking" },
    { key: "settingsEnabled", label: "Settings", description: "School configuration and settings" },
];

const GROUP_LABELS: Record<string, string> = {
    studentsEnabled: "People", teachersEnabled: "People",
    scoreEntryEnabled: "Academics", scoreReviewsEnabled: "Academics",
    subjectsEnabled: "Academics", lessonsEnabled: "Academics",
    quizzesEnabled: "Academics", assignmentsEnabled: "Academics",
    classesEnabled: "Academics", broadsheetEnabled: "Academics",
    transcriptsEnabled: "Academics",
    reportCardsEnabled: "Reports", legacyRecordsEnabled: "Reports",
    uploadRequestsEnabled: "Reports",
    attendanceEnabled: "School", behaviourEnabled: "School",
    communicationEnabled: "School", feesEnabled: "School",
    settingsEnabled: "General",
};

export default function SchoolFeaturesPage() {
    const params = useParams();
    const schoolId = params.id as string;

    const [features, setFeatures] = useState<FeatureFlags | null>(null);
    const [schoolName, setSchoolName] = useState("School");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/schools/${schoolId}/features`).then(r => r.json()),
            fetch(`/api/admin/schools`).then(r => r.json()),
        ]).then(([featData, schoolsData]) => {
            setFeatures(featData.features);
            const school = (schoolsData.schools ?? []).find((s: any) => s.id === schoolId);
            if (school) setSchoolName(school.name);
        }).catch(() => setError("Failed to load features")).finally(() => setLoading(false));
    }, [schoolId]);

    const toggle = useCallback((key: keyof FeatureFlags) => {
        setFeatures(prev => prev ? { ...prev, [key]: !prev[key] } : prev);
    }, []);

    const save = async () => {
        if (!features) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/schools/${schoolId}/features`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(features),
            });
            if (!res.ok) throw new Error("Save failed");
            setSavedAt(new Date());
        } catch {
            setError("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Group features by section
    const grouped: Record<string, FeatureToggleItem[]> = {};
    for (const feat of FEATURES) {
        const group = GROUP_LABELS[feat.key] ?? "Other";
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(feat);
    }

    const groupOrder = ["People", "Academics", "Reports", "School", "General"];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feature Controls</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Toggle features on or off for <span className="font-medium text-gray-700">{schoolName}</span>.
                        Disabled features are hidden from all admin and teacher users at that school.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {savedAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Saved {savedAt.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={save}
                        disabled={saving || !features}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors shadow-sm"
                    >
                        {saving ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4M4 12h4m8 0h4" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Feature Groups */}
            {features && groupOrder.map(groupName => {
                const items = grouped[groupName];
                if (!items?.length) return null;
                const allOn = items.every(i => features[i.key]);
                const anyOn = items.some(i => features[i.key]);
                return (
                    <div key={groupName} className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{groupName}</h2>
                            <button
                                onClick={() => {
                                    const newVal = !allOn;
                                    setFeatures(prev => {
                                        if (!prev) return prev;
                                        const update = { ...prev };
                                        items.forEach(i => { update[i.key] = newVal; });
                                        return update;
                                    });
                                }}
                                className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                            >
                                {allOn ? "Disable All" : "Enable All"}
                            </button>
                        </div>

                        {/* Feature Rows */}
                        <div className="divide-y divide-gray-100">
                            {items.map(feat => {
                                const isOn = features[feat.key];
                                return (
                                    <div key={feat.key} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className={`text-sm font-medium ${isOn ? "text-gray-800" : "text-gray-400"}`}>
                                                {feat.label}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">{feat.description}</p>
                                        </div>
                                        {/* Toggle Switch */}
                                        <button
                                            onClick={() => toggle(feat.key)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isOn ? "bg-primary-600" : "bg-gray-200"}`}
                                            role="switch"
                                            aria-checked={isOn}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
