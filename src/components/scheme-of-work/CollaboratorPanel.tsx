"use client";

import { useState, useEffect, useCallback } from "react";

interface Collaborator {
    id: string;
    userId: string;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
}

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface Props {
    sowId: string;
    isOwner: boolean;
}

export function CollaboratorPanel({ sowId, isOwner }: Props) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [search, setSearch] = useState("");
    const [adding, setAdding] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchCollaborators = useCallback(async () => {
        const res = await fetch(`/api/scheme-of-work/${sowId}/collaborators`);
        if (res.ok) {
            const data = await res.json();
            setCollaborators(data.collaborators || []);
        }
    }, [sowId]);

    const fetchTeachers = useCallback(async () => {
        const res = await fetch("/api/teachers?limit=200");
        if (res.ok) {
            const data = await res.json();
            setTeachers(data.teachers || []);
        }
    }, []);

    useEffect(() => {
        fetchCollaborators();
        if (isOwner) fetchTeachers();
    }, [fetchCollaborators, fetchTeachers, isOwner]);

    const handleAdd = async (userId: string) => {
        setAdding(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${sowId}/collaborators`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add");
            setCollaborators((prev) => [...prev, data.collaborator]);
            setSearch("");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userId: string) => {
        setRemovingId(userId);
        try {
            await fetch(`/api/scheme-of-work/${sowId}/collaborators?userId=${userId}`, { method: "DELETE" });
            setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
        } finally {
            setRemovingId(null);
        }
    };

    const collaboratorIds = new Set(collaborators.map((c) => c.userId));
    const filteredTeachers = teachers.filter(
        (t) =>
            !collaboratorIds.has(t.id) &&
            (t.firstName + " " + t.lastName + " " + t.email).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Collaborators
            </h3>

            {error && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>
            )}

            {/* Current collaborators */}
            {collaborators.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No collaborators yet.</p>
            ) : (
                <ul className="space-y-2 mb-4">
                    {collaborators.map((c) => (
                        <li key={c.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-semibold">
                                    {c.user.firstName[0]}{c.user.lastName[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{c.user.firstName} {c.user.lastName}</p>
                                    <p className="text-xs text-gray-400">{c.user.email}</p>
                                </div>
                            </div>
                            {isOwner && (
                                <button
                                    onClick={() => handleRemove(c.userId)}
                                    disabled={removingId === c.userId}
                                    className="text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                                    title="Remove"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Add collaborator */}
            {isOwner && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Add teacher as collaborator</label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {search && filteredTeachers.length > 0 && (
                        <ul className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white max-h-40 overflow-y-auto">
                            {filteredTeachers.slice(0, 8).map((t) => (
                                <li key={t.id}>
                                    <button
                                        onClick={() => handleAdd(t.id)}
                                        disabled={adding}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-semibold shrink-0">
                                            {t.firstName[0]}{t.lastName[0]}
                                        </div>
                                        <div>
                                            <span className="font-medium">{t.firstName} {t.lastName}</span>
                                            <span className="text-gray-400 ml-1 text-xs">· {t.email}</span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {search && filteredTeachers.length === 0 && (
                        <p className="mt-1 text-xs text-gray-400 px-1">No matching teachers found</p>
                    )}
                </div>
            )}
        </div>
    );
}
