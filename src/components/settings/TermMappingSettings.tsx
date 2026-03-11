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

interface TermMapping {
    [termId: string]: {
        halfTerm: string;
        endOfTerm: string;
    };
}

export default function TermMappingSettings() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [templates, setTemplates] = useState<CustomTemplate[]>([]);
    const [mappings, setMappings] = useState<TermMapping>({});
    const [defaultTemplateId, setDefaultTemplateId] = useState("classic");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsRes, configRes] = await Promise.all([
                    fetch("/api/sessions"),
                    fetch("/api/settings/report-card"),
                ]);

                if (!sessionsRes.ok || !configRes.ok) {
                    throw new Error("Failed to load term mapping settings");
                }

                const sessionsData = await sessionsRes.json();
                const configData = await configRes.json();

                const sessionsList: SessionItem[] = sessionsData.sessions || [];
                setSessions(sessionsList);

                const currentSession = sessionsList.find((s) => s.isCurrent);
                setSelectedSessionId(currentSession?.id || sessionsList[0]?.id || "");

                // Available templates: Base templates + Custom templates
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

    const handleMappingChange = (termId: string, type: "halfTerm" | "endOfTerm", templateId: string) => {
        setMappings(prev => ({
            ...prev,
            [termId]: {
                ...prev[termId],
                [type]: templateId
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/settings/report-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    termMappings: mappings
                }),
            });

            if (res.ok) {
                setShowSuccessModal(true);
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save");
            }
        } catch (error: any) {
            console.error("Error saving terminal mappings:", error);
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
                <p className="text-sm text-gray-500 font-medium">Assign report card templates per session and term.</p>
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
                {terms.map((term) => (
                    <div key={term.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                                {term.termNumber}
                            </div>
                            <h4 className="font-bold text-gray-900">{term.name}</h4>
                        </div>

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
                ))}

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
