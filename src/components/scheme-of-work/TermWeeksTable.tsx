"use client";

import { Fragment, useState } from "react";
import { showAppConfirm } from "@/lib/appMessageBox";
import { WeekEditModal } from "./WeekEditModal";

interface Week {
    id: string;
    weekNumber: number;
    topic: string;
    content: string | null;
    objectives: string | null;
    resources: string | null;
    teachingMethods: string | null;
    assessment: string | null;
    // wizard-phase fields (optional, for compatibility with SchemeOfWorkDetailClient)
    waecObjectives?: string | null;
    jambObjectives?: string | null;
    igcseObjectives?: string | null;
    objectivesApproved?: boolean;
    references?: unknown[];
    sdgMappings?: unknown[];
}

interface Props {
    termId: string;
    termName: string;
    schemeOfWorkTermId: string;
    weeks: Week[];
    canEdit: boolean;
    onWeeksChange: (weeks: Week[]) => void;
}

export function TermWeeksTable({ termName, schemeOfWorkTermId, weeks, canEdit, onWeeksChange }: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingWeek, setEditingWeek] = useState<Week | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const nextWeekNumber = sortedWeeks.length > 0
        ? Math.max(...sortedWeeks.map((w) => w.weekNumber)) + 1
        : 1;

    const handleSaved = (week: Week) => {
        const exists = weeks.find((w) => w.id === week.id);
        if (exists) {
            // Edit mode — update in place and close
            onWeeksChange(weeks.map((w) => (w.id === week.id ? week : w)));
            setModalOpen(false);
            setEditingWeek(null);
        } else {
            // Add mode — append week but keep modal open for next entry
            onWeeksChange([...weeks, week]);
        }
    };

    const handleDelete = async (weekId: string) => {
        const confirmed = await showAppConfirm("Delete this week?", {
            title: "Delete Week",
            variant: "warning",
            confirmText: "Delete",
        });
        if (!confirmed) return;
        setDeletingId(weekId);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${weekId}`, { method: "DELETE" });
            if (res.ok) {
                onWeeksChange(weeks.filter((w) => w.id !== weekId));
            }
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div>
            {sortedWeeks.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-400 text-sm mb-3">No weeks added for {termName} yet</p>
                    {canEdit && (
                        <button
                            onClick={() => { setEditingWeek(null); setModalOpen(true); }}
                            className="text-sm text-primary-600 font-medium hover:underline"
                        >
                            + Add Week 1
                        </button>
                    )}
                </div>
            ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Wk</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Topic</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Content Preview</th>
                                <th className="px-4 py-3 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedWeeks.map((week) => (
                                <Fragment key={week.id}>
                                    <tr
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === week.id ? null : week.id)}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-700 text-center">
                                            {week.weekNumber}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">{week.topic}</td>
                                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                                            {week.content ? (() => {
                                                const lines = week.content.split("\n").filter(l => l.trim());
                                                const preview = lines.slice(0, 3);
                                                return (
                                                    <div className="space-y-0.5">
                                                        {preview.map((line, i) => (
                                                            <div key={i} className="flex items-baseline gap-1.5 text-xs leading-5">
                                                                <span className="shrink-0 text-gray-300 font-mono">{i + 1}.</span>
                                                                <span className="text-gray-600 line-clamp-1">{line}</span>
                                                            </div>
                                                        ))}
                                                        {lines.length > 3 && (
                                                            <div className="text-xs text-gray-400 italic pl-4">+{lines.length - 3} more…</div>
                                                        )}
                                                    </div>
                                                );
                                            })() : <span className="text-gray-300 italic text-xs">No content yet</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {canEdit && (
                                                <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => { setEditingWeek(week); setModalOpen(true); }}
                                                        className="text-gray-400 hover:text-primary-600"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(week.id)}
                                                        disabled={deletingId === week.id}
                                                        className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedId === week.id && week.content && (
                                        <tr className="bg-blue-50/40">
                                            <td colSpan={5} className="px-6 py-3">
                                                <ol className="text-sm text-gray-700 space-y-0.5 list-none">
                                                    {week.content.split("\n").map((line, i) => (
                                                        <li key={i} className="flex gap-3">
                                                            <span className="shrink-0 w-6 text-right text-gray-400 font-mono text-xs leading-6">{i + 1}.</span>
                                                            <span className="leading-6">{line || <span className="text-gray-300">—</span>}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>

                    {canEdit && (
                        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                            <button
                                onClick={() => { setEditingWeek(null); setModalOpen(true); }}
                                className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Week {nextWeekNumber}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {modalOpen && (
                <WeekEditModal
                    week={editingWeek}
                    schemeOfWorkTermId={schemeOfWorkTermId}
                    nextWeekNumber={nextWeekNumber}
                    onClose={() => { setModalOpen(false); setEditingWeek(null); }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
