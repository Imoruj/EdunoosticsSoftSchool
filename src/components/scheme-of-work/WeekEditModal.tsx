"use client";

import { useState } from "react";

interface Week {
    id: string;
    weekNumber: number;
    topic: string;
    content: string | null;
    objectives: string | null;
    resources: string | null;
    teachingMethods: string | null;
    assessment: string | null;
}

interface Props {
    week: Week | null; // null = create mode
    schemeOfWorkTermId: string;
    nextWeekNumber: number;
    onClose: () => void;
    onSaved: (week: Week) => void;
}

export function WeekEditModal({ week, schemeOfWorkTermId, nextWeekNumber, onClose, onSaved }: Props) {
    const isEdit = !!week;
    const [topic, setTopic] = useState(week?.topic || "");
    const [objectives, setObjectives] = useState(week?.objectives || "");
    const [content, setContent] = useState(week?.content || "");
    const [teachingMethods, setTeachingMethods] = useState(week?.teachingMethods || "");
    const [assessment, setAssessment] = useState(week?.assessment || "");
    const [resources, setResources] = useState(week?.resources || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!topic.trim()) { setError("Topic is required"); return; }
        setSaving(true);
        setError(null);
        try {
            const body = { topic, objectives, content, teachingMethods, assessment, resources };
            let res: Response;
            if (isEdit) {
                res = await fetch(`/api/scheme-of-work/weeks/${week.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch("/api/scheme-of-work/weeks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ schemeOfWorkTermId, weekNumber: nextWeekNumber, ...body }),
                });
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            onSaved(data.week);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">
                        {isEdit ? `Edit Week ${week.weekNumber}` : `Add Week ${nextWeekNumber}`}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Title *</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Introduction to Algebra"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objectives</label>
                        <textarea
                            value={objectives}
                            onChange={(e) => setObjectives(e.target.value)}
                            rows={3}
                            placeholder="By the end of this week, students will be able to…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content / Notes</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={5}
                            placeholder="Detailed content, key points, explanations…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Methods</label>
                            <textarea
                                value={teachingMethods}
                                onChange={(e) => setTeachingMethods(e.target.value)}
                                rows={3}
                                placeholder="Lecture, group work, demonstration…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
                            <textarea
                                value={assessment}
                                onChange={(e) => setAssessment(e.target.value)}
                                rows={3}
                                placeholder="Quiz, class exercise, homework…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resources</label>
                        <textarea
                            value={resources}
                            onChange={(e) => setResources(e.target.value)}
                            rows={2}
                            placeholder="Textbook pages, links, materials…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !topic.trim()}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Week"}
                    </button>
                </div>
            </div>
        </div>
    );
}
