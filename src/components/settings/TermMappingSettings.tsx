"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import SuccessModal from "@/components/ui/SuccessModal";

interface Term {
    id: string;
    name: string;
    termNumber: number;
}

interface SessionItem {
    id: string;
    name: string;
    isCurrent: boolean;
    terms: Term[];
}

interface CustomTemplate {
    id: string;
    name: string;
}

interface ClassItem {
    id: string;
    name: string;
}

interface ClassOverride {
    halfTerm: string;
    endOfTerm: string;
}

interface TermMapping {
    [termId: string]: {
        halfTerm: string;
        endOfTerm: string;
        classOverrides?: {
            [classId: string]: ClassOverride;
        };
    };
}

export default function TermMappingSettings() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [templates, setTemplates] = useState<CustomTemplate[]>([]);
    const [mappings, setMappings] = useState<TermMapping>({});
    const [defaultTemplateId, setDefaultTemplateId] = useState("classic");
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [addingOverrideForTerm, setAddingOverrideForTerm] = useState<string | null>(null);
    const [pendingClassId, setPendingClassId] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsRes, configRes, classesRes] = await Promise.all([
                    fetch("/api/sessions"),
                    fetch("/api/settings/report-card"),
                    fetch("/api/classes"),
                ]);

                if (!sessionsRes.ok || !configRes.ok) {
                    throw new Error("Failed to load term mapping settings");
                }

                const sessionsData = await sessionsRes.json();
                const configData = await configRes.json();
                const classesData = classesRes.ok ? await classesRes.json() : { classes: [] };

                const sessionsList: SessionItem[] = sessionsData.sessions || [];
                setSessions(sessionsList);

                const currentSession = sessionsList.find((s) => s.isCurrent);
                setSelectedSessionId(currentSession?.id || sessionsList[0]?.id || "");

                const baseTemplates = [
                    { id: "classic", name: "Nigerian Standard (Classic)" },
                    { id: "modern", name: "Modern Professional" },
                    { id: "minimal", name: "Minimalist Clean" },
                ];

                const customOnes = Object.entries(configData.customTemplates || {}).map(([key, t]: [string, any]) => ({
                    id: t?.id || key,
                    name: t?.name || "Custom Template"
                }));

                const deduped = [...baseTemplates, ...customOnes].filter(
                    (template, index, arr) => arr.findIndex((t) => t.id === template.id) === index
                );

                setTemplates(deduped);
                setMappings(configData.termMappings || {});
                setDefaultTemplateId(configData.activeTemplate || "classic");

                const fetchedClasses: ClassItem[] = (classesData.classes || []).map((cls: any) => ({
                    id: cls.id,
                    name: cls.name,
                }));
                setClasses(fetchedClasses);

            } catch (error) {
                console.error("Error fetching term mapping data:", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const selectedSession = sessions.find((session) => session.id === selectedSessionId);
    const terms = selectedSession?.terms || [];

    const getClassName = (classId: string): string => {
        return classes.find((c) => c.id === classId)?.name ?? classId;
    };

    const handleMappingChange = (termId: string, type: "halfTerm" | "endOfTerm", templateId: string) => {
        setMappings(prev => ({
            ...prev,
            [termId]: { ...prev[termId], [type]: templateId }
        }));
    };

    const handleClassOverrideChange = (
        termId: string,
        classId: string,
        type: "halfTerm" | "endOfTerm",
        templateId: string
    ) => {
        setMappings(prev => ({
            ...prev,
            [termId]: {
                ...prev[termId],
                classOverrides: {
                    ...(prev[termId]?.classOverrides || {}),
                    [classId]: {
                        ...(prev[termId]?.classOverrides?.[classId] || {
                            halfTerm: prev[termId]?.halfTerm || defaultTemplateId,
                            endOfTerm: prev[termId]?.endOfTerm || defaultTemplateId,
                        }),
                        [type]: templateId,
                    },
                },
            }
        }));
    };

    const handleAddClassOverride = (termId: string) => {
        if (!pendingClassId) return;
        if (mappings[termId]?.classOverrides?.[pendingClassId]) {
            setAddingOverrideForTerm(null);
            setPendingClassId("");
            return;
        }
        setMappings(prev => ({
            ...prev,
            [termId]: {
                ...prev[termId],
                classOverrides: {
                    ...(prev[termId]?.classOverrides || {}),
                    [pendingClassId]: {
                        halfTerm: prev[termId]?.halfTerm || defaultTemplateId,
                        endOfTerm: prev[termId]?.endOfTerm || defaultTemplateId,
                    },
                },
            }
        }));
        setAddingOverrideForTerm(null);
        setPendingClassId("");
    };

    const handleRemoveClassOverride = (termId: string, classId: string) => {
        setMappings(prev => {
            const overrides = { ...(prev[termId]?.classOverrides || {}) };
            delete overrides[classId];
            return { ...prev, [termId]: { ...prev[termId], classOverrides: overrides } };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/settings/report-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ termMappings: mappings }),
            });

            if (res.ok) {
                setShowSuccessModal(true);
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save");
            }
        } catch (error: any) {
            console.error("Error saving term mappings:", error);
            toast.error(error.message || "Failed to save mappings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="card p-8 space-y-8 animate-fadeIn">
            <div>
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Report Template Mapping</h3>
                <p className="text-sm text-gray-500 font-medium">Assign report card templates per session and term. Add class-specific overrides to use a different template for individual classes.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Academic Session</label>
                    <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all shadow-sm"
                    >
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.name} {session.isCurrent ? "(Current)" : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-6">
                {terms.map((term) => {
                    const overrides = mappings[term.id]?.classOverrides || {};
                    const overrideEntries = Object.entries(overrides);
                    const usedClassIds = new Set(Object.keys(overrides));
                    const availableClasses = classes.filter((c) => !usedClassIds.has(c.id));

                    return (
                        <div key={term.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-5">
                            {/* Term header */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                                    {term.termNumber}
                                </div>
                                <h4 className="font-bold text-gray-900">{term.name}</h4>
                            </div>

                            {/* Default Templates */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-1">Default Templates (All Classes)</p>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Half Term (Mid-Term)</label>
                                        <select
                                            value={mappings[term.id]?.halfTerm || defaultTemplateId}
                                            onChange={(e) => handleMappingChange(term.id, "halfTerm", e.target.value)}
                                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all shadow-sm"
                                        >
                                            {templates.map(tmpl => (
                                                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">End of Term</label>
                                        <select
                                            value={mappings[term.id]?.endOfTerm || defaultTemplateId}
                                            onChange={(e) => handleMappingChange(term.id, "endOfTerm", e.target.value)}
                                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all shadow-sm"
                                        >
                                            {templates.map(tmpl => (
                                                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Class-Specific Overrides */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Class-Specific Overrides</p>
                                    {availableClasses.length > 0 && addingOverrideForTerm !== term.id && (
                                        <button
                                            onClick={() => {
                                                setAddingOverrideForTerm(term.id);
                                                setPendingClassId(availableClasses[0]?.id || "");
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-600 border-2 border-primary-200 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Override
                                        </button>
                                    )}
                                </div>

                                {/* Add override row */}
                                {addingOverrideForTerm === term.id && (
                                    <div className="flex items-center gap-3 p-3 bg-primary-50 border-2 border-primary-200 rounded-xl">
                                        <select
                                            value={pendingClassId}
                                            onChange={(e) => setPendingClassId(e.target.value)}
                                            className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all"
                                        >
                                            {availableClasses.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAddClassOverride(term.id)}
                                            className="px-4 py-2 bg-primary-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-primary-700 transition-all"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => { setAddingOverrideForTerm(null); setPendingClassId(""); }}
                                            className="px-3 py-2 text-gray-400 hover:text-gray-700 text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {/* Existing override rows */}
                                {overrideEntries.length > 0 ? (
                                    <div className="space-y-2">
                                        {overrideEntries.map(([classId, override]) => (
                                            <div key={classId} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-100 rounded-xl">
                                                <div className="w-32 shrink-0">
                                                    <span className="text-xs font-black text-gray-700 leading-tight block">{getClassName(classId)}</span>
                                                    <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest">Override</span>
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Half Term</label>
                                                        <select
                                                            value={override.halfTerm}
                                                            onChange={(e) => handleClassOverrideChange(term.id, classId, "halfTerm", e.target.value)}
                                                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all"
                                                        >
                                                            {templates.map(tmpl => (
                                                                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">End of Term</label>
                                                        <select
                                                            value={override.endOfTerm}
                                                            onChange={(e) => handleClassOverrideChange(term.id, classId, "endOfTerm", e.target.value)}
                                                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary-500 transition-all"
                                                        >
                                                            {templates.map(tmpl => (
                                                                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveClassOverride(term.id, classId)}
                                                    title="Remove override"
                                                    className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-1">
                                        No overrides — all classes use the default template above.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {terms.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No terms found for this session.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    disabled={saving || terms.length === 0 || !selectedSessionId}
                    className="px-8 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {saving ? "SAVING..." : "SAVE MAPPINGS"}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Mappings Saved!"
                message="Your report template assignments have been updated for the selected session terms."
            />
        </div>
    );
}
