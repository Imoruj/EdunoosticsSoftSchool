"use client";

import { useState } from "react";
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
            onWeeksChange(weeks.map((w) => (w.id === week.id ? week : w)));
        } else {
            onWeeksChange([...weeks, week]);
        }
        setModalOpen(false);
        setEditingWeek(null);
    };

    const handleDelete = async (weekId: string) => {
        if (!confirm("Delete this week?")) return;
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
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Objectives</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Assessment</th>
                                <th className="px-4 py-3 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedWeeks.map((week) => (
                                <>
                                    <tr
                                        key={week.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === week.id ? null : week.id)}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-700 text-center">
                                            {week.weekNumber}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">{week.topic}</td>
                                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell line-clamp-1">
                                            {week.objectives || <span className="text-gray-300 italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell line-clamp-1">
                                            {week.assessment || <span className="text-gray-300 italic">—</span>}
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
                                    {expandedId === week.id && (
                                        <tr key={`${week.id}-expanded`} className="bg-blue-50/40">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                    {week.objectives && (
                                                        <div>
                                                            <p className="font-semibold text-gray-700 mb-1">Objectives</p>
                                                            <p className="text-gray-600 whitespace-pre-line">{week.objectives}</p>
                                                        </div>
                                                    )}
                                                    {week.content && (
                                                        <div>
                                                            <p className="font-semibold text-gray-700 mb-1">Content / Notes</p>
                                                            <p className="text-gray-600 whitespace-pre-line">{week.content}</p>
                                                        </div>
                                                    )}
                                                    {week.teachingMethods && (
                                                        <div>
                                                            <p className="font-semibold text-gray-700 mb-1">Teaching Methods</p>
                                                            <p className="text-gray-600 whitespace-pre-line">{week.teachingMethods}</p>
                                                        </div>
                                                    )}
                                                    {week.assessment && (
                                                        <div>
                                                            <p className="font-semibold text-gray-700 mb-1">Assessment</p>
                                                            <p className="text-gray-600 whitespace-pre-line">{week.assessment}</p>
                                                        </div>
                                                    )}
                                                    {week.resources && (
                                                        <div className="sm:col-span-2">
                                                            <p className="font-semibold text-gray-700 mb-1">Resources</p>
                                                            <p className="text-gray-600 whitespace-pre-line">{week.resources}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
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
