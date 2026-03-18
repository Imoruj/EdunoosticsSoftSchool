"use client";

import { useState, useRef, useCallback } from "react";

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
    week: Week | null;
    schemeOfWorkTermId: string;
    nextWeekNumber: number;
    onClose: () => void;
    onSaved: (week: Week) => void;
}

// Numbered textarea: shows line numbers on the left, synced scroll
function NumberedTextarea({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    const lines = value === "" ? [""] : value.split("\n");
    const lineCount = lines.length;

    const syncScroll = useCallback(() => {
        if (textareaRef.current && gutterRef.current) {
            gutterRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }, []);

    return (
        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 bg-white">
            {/* Line number gutter */}
            <div
                ref={gutterRef}
                className="select-none overflow-hidden shrink-0 bg-gray-50 border-r border-gray-200 text-right"
                style={{ width: lineCount >= 100 ? 44 : 36 }}
                aria-hidden
            >
                {Array.from({ length: lineCount }, (_, i) => (
                    <div
                        key={i}
                        className="text-xs text-gray-400 font-mono leading-6 pr-2"
                        style={{ height: 24 }}
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={syncScroll}
                placeholder={placeholder}
                rows={10}
                spellCheck
                className="flex-1 resize-none px-3 py-0 text-sm text-gray-900 leading-6 outline-none bg-transparent placeholder:text-gray-400"
                style={{ lineHeight: "24px" }}
            />
        </div>
    );
}

export function WeekEditModal({ week, schemeOfWorkTermId, nextWeekNumber, onClose, onSaved }: Props) {
    const isEdit = !!week;
    const [topic, setTopic] = useState(week?.topic || "");
    const [content, setContent] = useState(week?.content || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!topic.trim()) { setError("Topic is required"); return; }
        setSaving(true);
        setError(null);
        try {
            const body = { topic, content };
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Content / Notes
                            <span className="ml-2 font-normal text-gray-400 text-xs">Each line is numbered — paste freely</span>
                        </label>
                        <NumberedTextarea
                            value={content}
                            onChange={setContent}
                            placeholder="Type or paste content here. Each line will be numbered automatically."
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
