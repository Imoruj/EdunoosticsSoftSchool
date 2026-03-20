"use client";

import { useState } from "react";

interface SdgEntry { sdgNumber: number; aiSuggested: boolean; approved: boolean }
interface Reference { id: string; type: string; title: string; url: string | null; fileKey: string | null; description: string | null }

interface Week {
    id: string;
    weekNumber: number;
    topic: string;
    content: string | null;
    objectives: string | null;
    waecObjectives: string | null;
    jambObjectives: string | null;
    igcseObjectives: string | null;
    objectiveSegments?: unknown;
    objectivesApproved: boolean;
    references: Reference[];
    sdgMappings: SdgEntry[];
}

interface SOWTerm {
    id: string;
    termNumber: number;
    term: { id: string; name: string; termNumber: number };
    weeks: Week[];
}

interface Props {
    terms: SOWTerm[];
    canEdit: boolean;
    onWeekUpdated: (weekId: string, updates: Partial<Week>) => void;
    onOpenTerm?: (termNumber: number) => void;
}

type Section = "objectives" | "waecObjectives" | "jambObjectives" | "igcseObjectives";

const SECTION_LABELS: Record<Section, { label: string; badge: string; color: string }> = {
    objectives: { label: "Harmonised Objectives", badge: "Harmonised", color: "bg-blue-100 text-blue-800" },
    waecObjectives: { label: "WAEC Exam Content", badge: "WAEC", color: "bg-green-100 text-green-800" },
    jambObjectives: { label: "JAMB / UTME Content", badge: "JAMB", color: "bg-purple-100 text-purple-800" },
    igcseObjectives: { label: "Cambridge IGCSE Content", badge: "IGCSE", color: "bg-orange-100 text-orange-800" },
};

const EXAM_SECTIONS: Section[] = ["waecObjectives", "jambObjectives", "igcseObjectives"];

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function WeekObjectivesCard({
    week,
    canEdit,
    onUpdated,
}: {
    week: Week;
    canEdit: boolean;
    onUpdated: (updates: Partial<Week>) => void;
}) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<Record<Section, string>>({
        objectives: week.objectives ?? "",
        waecObjectives: week.waecObjectives ?? "",
        jambObjectives: week.jambObjectives ?? "",
        igcseObjectives: week.igcseObjectives ?? "",
    });
    const [approved, setApproved] = useState(week.objectivesApproved);
    const [generating, setGenerating] = useState(false);
    const [harmonising, setHarmonising] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [genSuccess, setGenSuccess] = useState(false);

    // Per-section search state
    const [sectionSearch, setSectionSearch] = useState<Record<Section, string>>({
        objectives: "", waecObjectives: "", jambObjectives: "", igcseObjectives: "",
    });
    const [sectionSearchOpen, setSectionSearchOpen] = useState<Partial<Record<Section, boolean>>>({});
    const [sectionGenerating, setSectionGenerating] = useState<Partial<Record<Section, boolean>>>({});
    const [syllabusWarnings, setSyllabusWarnings] = useState<Partial<Record<Section, string>>>({});
    const [syllabusRefs, setSyllabusRefs] = useState<Partial<Record<Section, string>>>({});
    const [syllabusVerified, setSyllabusVerified] = useState<Partial<Record<Section, boolean>>>({});
    const [verificationNotes, setVerificationNotes] = useState<Partial<Record<Section, string>>>({});

    const canHarmonise = EXAM_SECTIONS.filter((s) => values[s].trim()).length >= 2;
    const hasContent = [...EXAM_SECTIONS, "objectives" as Section].some((s) => values[s].trim());
    const statusLabel = approved ? "Approved" : hasContent ? "AI Generated" : "Pending";
    const statusColor = approved
        ? "bg-green-100 text-green-700"
        : hasContent
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-500";

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        setGenSuccess(false);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/generate-objectives`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            setValues({
                objectives: data.objectives,
                waecObjectives: data.waecObjectives,
                jambObjectives: data.jambObjectives,
                igcseObjectives: data.igcseObjectives,
            });
            setApproved(false);
            setGenSuccess(true);
            setOpen(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateSection = async (section: Section) => {
        setSectionGenerating((prev) => ({ ...prev, [section]: true }));
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/generate-objectives`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    section,
                    syllabusQuery: sectionSearch[section] || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");
            // Store syllabus verification result
            setSyllabusWarnings((prev) => ({ ...prev, [section]: data.syllabusWarning || "" }));
            setSyllabusRefs((prev) => ({ ...prev, [section]: data.syllabusRef || "" }));
            setSyllabusVerified((prev) => ({ ...prev, [section]: data.syllabusVerified === true }));
            setVerificationNotes((prev) => ({ ...prev, [section]: data.verificationNote || "" }));
            if (data[section]) {
                setValues((v) => ({ ...v, [section]: data[section] }));
                setApproved(false);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSectionGenerating((prev) => ({ ...prev, [section]: false }));
        }
    };

    const handleHarmonise = async () => {
        setHarmonising(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/generate-objectives`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    section: "objectives",
                    waecObjectives: values.waecObjectives,
                    jambObjectives: values.jambObjectives,
                    igcseObjectives: values.igcseObjectives,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Harmonisation failed");
            if (data.objectives) {
                setValues((v) => ({ ...v, objectives: data.objectives }));
                setApproved(false);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setHarmonising(false);
        }
    };

    const handleSave = async (markApproved: boolean) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/objectives`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, objectivesApproved: markApproved }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            const updatedWeek = data.week as Week;
            const nextValues = {
                objectives: updatedWeek.objectives ?? "",
                waecObjectives: updatedWeek.waecObjectives ?? "",
                jambObjectives: updatedWeek.jambObjectives ?? "",
                igcseObjectives: updatedWeek.igcseObjectives ?? "",
            };
            setValues(nextValues);
            setApproved(updatedWeek.objectivesApproved);
            onUpdated({
                ...nextValues,
                objectivesApproved: updatedWeek.objectivesApproved,
                objectiveSegments: updatedWeek.objectiveSegments,
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${approved ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-white"}`}>
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                        W{week.weekNumber}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{week.topic}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                    {/* Content preview */}
                    {week.content && (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 max-h-20 overflow-y-auto">
                            <span className="font-medium text-gray-600">Content: </span>
                            {week.content}
                        </div>
                    )}

                    {/* Generate All button */}
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {generating ? (
                                    <><SpinnerIcon className="w-4 h-4" /> Generating...</>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate All with AI
                                    </>
                                )}
                            </button>
                            {genSuccess && <span className="text-xs text-violet-600 font-medium">AI generated - review and approve below</span>}
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                    )}

                    {/* Harmonised Objectives */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-700">Harmonised Objectives</label>
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Harmonised</span>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={handleHarmonise}
                                    disabled={harmonising || !canHarmonise}
                                    title={!canHarmonise ? "Generate at least 2 exam board objectives first" : "Harmonise objectives with AI"}
                                    className={`ml-auto flex items-center gap-1 text-xs font-medium transition-colors ${canHarmonise ? "text-violet-600 hover:text-violet-700" : "text-gray-400 cursor-not-allowed"}`}
                                >
                                    {harmonising ? (
                                        <><SpinnerIcon className="w-3.5 h-3.5" /> Harmonising...</>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Harmonise with AI
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {!canHarmonise && canEdit && (
                            <p className="text-[11px] text-amber-600">Generate objectives for at least 2 exam boards below to enable harmonisation.</p>
                        )}
                        <p className="text-[11px] text-gray-400">AI-synthesised from WAEC, JAMB, and IGCSE objectives.</p>
                        <textarea
                            rows={4}
                            value={values.objectives}
                            onChange={(e) => { setValues((v) => ({ ...v, objectives: e.target.value })); setApproved(false); }}
                            readOnly={!canEdit}
                            placeholder={canEdit ? (canHarmonise ? "Click 'Harmonise with AI' above" : "Generate exam board objectives first") : "No content yet"}
                            className="w-full text-sm leading-6 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none bg-white read-only:bg-gray-50 read-only:text-gray-500 placeholder-gray-300"
                        />
                    </div>

                    {/* 3 exam board sections */}
                    {EXAM_SECTIONS.map((key) => {
                        const { label, badge, color } = SECTION_LABELS[key];
                        const isSearchOpen = !!sectionSearchOpen[key];
                        const isSectionGenerating = !!sectionGenerating[key];
                        const syllabusWarning = syllabusWarnings[key] || "";
                        const syllabusRef = syllabusRefs[key] || "";
                        const isVerified = syllabusVerified[key] === true;
                        const verificationNote = verificationNotes[key] || "";
                        return (
                            <div key={key} className="space-y-1">
                                {/* Section header row */}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold text-gray-700">{label}</label>
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>{badge}</span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setSectionSearchOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                                            title="Search syllabus and generate for this section"
                                            className={`ml-auto flex items-center gap-1 text-xs font-medium transition-colors ${isSearchOpen ? "text-violet-600" : "text-gray-400 hover:text-violet-600"}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                            </svg>
                                            {isSearchOpen ? "Close" : "Search & Generate"}
                                        </button>
                                    )}
                                </div>

                                {/* Collapsible search + per-section generate panel */}
                                {canEdit && isSearchOpen && (
                                    <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                                        <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={sectionSearch[key]}
                                            onChange={(e) => setSectionSearch((prev) => ({ ...prev, [key]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === "Enter" && !isSectionGenerating) handleGenerateSection(key); }}
                                            placeholder={`Syllabus topic or section reference for ${badge} (optional)`}
                                            className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateSection(key)}
                                            disabled={isSectionGenerating}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
                                        >
                                            {isSectionGenerating ? (
                                                <><SpinnerIcon className="w-3 h-3" /> Researching & Verifying...</>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    Generate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Syllabus not found warning */}
                                {syllabusWarning && (
                                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.539-1.333-3.308 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            {syllabusWarning}
                                            {canEdit && <span className="block mt-0.5 text-amber-600 font-medium">Use the search field above to provide the correct syllabus section reference, then try again.</span>}
                                        </p>
                                    </div>
                                )}

                                {/* Syllabus ref + verification status */}
                                {syllabusRef && !syllabusWarning && syllabusRef !== "general classroom" && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-green-700">
                                            <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Syllabus ref: <span className="font-medium">{syllabusRef}</span></span>
                                            {isVerified && (
                                                <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                    AI Verified
                                                </span>
                                            )}
                                        </div>
                                        {!isVerified && verificationNote && (
                                            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                                                <svg className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span><span className="font-medium">Reviewer note:</span> {verificationNote}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="text-[11px] text-gray-400">
                                    One objective per line for cleaner storage and filtering.
                                </p>
                                <textarea
                                    rows={4}
                                    value={values[key]}
                                    onChange={(e) => { setValues((v) => ({ ...v, [key]: e.target.value })); setApproved(false); }}
                                    readOnly={!canEdit}
                                    placeholder={canEdit ? "Generate with AI or enter one line per objective" : "No content yet"}
                                    className="w-full text-sm leading-6 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none bg-white read-only:bg-gray-50 read-only:text-gray-500 placeholder-gray-300"
                                />
                            </div>
                        );
                    })}

                    {/* Save/Approve actions */}
                    {canEdit && (
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={() => handleSave(false)}
                                disabled={saving}
                                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                {saving ? "Saving..." : "Save Draft"}
                            </button>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={saving || !hasContent}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve & Save
                            </button>
                            {approved && (
                                <span className="text-xs text-green-600 font-medium ml-1">Approved</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function WizardPhase3Objectives({ terms, canEdit, onWeekUpdated, onOpenTerm }: Props) {
    const allWeeks = terms.flatMap((t) => t.weeks);

    if (allWeeks.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 text-sm">No weeks found. Go back to Step 2 and add weeks first.</p>
            </div>
        );
    }

    const approvedCount = allWeeks.filter((w) => w.objectivesApproved).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Week Objectives</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        AI generates objectives for each week. Review, edit, and approve.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800">{approvedCount}/{allWeeks.length}</span>
                    <p className="text-xs text-gray-400">weeks approved</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: allWeeks.length ? `${(approvedCount / allWeeks.length) * 100}%` : "0%" }}
                />
            </div>

            {terms.map((term) => (
                <div key={term.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {term.term.name || `Term ${term.termNumber}`}
                        <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">
                            ({term.weeks.length} week{term.weeks.length !== 1 ? "s" : ""})
                        </span>
                    </h3>
                    {term.weeks.length === 0 ? (
                        onOpenTerm ? (
                            <button
                                type="button"
                                onClick={() => onOpenTerm(term.termNumber)}
                                className="w-full text-left pl-2 pr-3 py-3 rounded-xl border border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
                            >
                                <p className="text-xs text-gray-400 italic">No weeks in this term</p>
                                <p className="text-xs font-medium text-primary-600 mt-1">Click to add weeks for {term.term.name || `Term ${term.termNumber}`}</p>
                            </button>
                        ) : (
                            <p className="text-xs text-gray-400 italic pl-2">No weeks in this term</p>
                        )
                    ) : (
                        <div className="space-y-2">
                            {[...term.weeks]
                                .sort((a, b) => a.weekNumber - b.weekNumber)
                                .map((week) => (
                                    <WeekObjectivesCard
                                        key={week.id}
                                        week={week}
                                        canEdit={canEdit}
                                        onUpdated={(updates) => onWeekUpdated(week.id, updates)}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
