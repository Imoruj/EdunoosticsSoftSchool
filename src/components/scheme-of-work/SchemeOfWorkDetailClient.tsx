"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TermWeeksTable } from "./TermWeeksTable";
import { CollaboratorPanel } from "./CollaboratorPanel";
import { ApprovalPanel } from "./ApprovalPanel";

type SowStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

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

interface SOWTerm {
    id: string;
    termId: string;
    termNumber: number;
    objectives: string | null;
    term: { id: string; name: string; termNumber: number };
    weeks: Week[];
}

interface SchemeOfWork {
    id: string;
    title: string;
    status: SowStatus;
    adminNote: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    updatedAt: string;
    ownerId: string;
    subject: { id: string; name: string; code: string | null };
    classArm: { id: string; armName: string; class: { name: string } };
    session: { id: string; name: string };
    owner: { id: string; firstName: string; lastName: string };
    approvedBy: { id: string; firstName: string; lastName: string } | null;
    terms: SOWTerm[];
    collaborators: { id: string; userId: string; user: { id: string; firstName: string; lastName: string } }[];
}

const STATUS_STYLES: Record<SowStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

export function SchemeOfWorkDetailClient({ id }: { id: string }) {
    const { data: authSession } = useSession();
    const router = useRouter();
    const user = authSession?.user as any;
    const roles: string[] = user?.roles || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const isStudent = roles.includes("STUDENT") || user?.loginType === "student";

    const [sow, setSow] = useState<SchemeOfWork | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");

    const fetchSOW = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`);
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Failed to load");
            }
            const data = await res.json();
            setSow(data.schemeOfWork);
            setTitleValue(data.schemeOfWork.title);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchSOW(); }, [fetchSOW]);

    const isOwner = sow?.ownerId === user?.id;
    const isCollaborator = sow?.collaborators.some((c) => c.userId === user?.id) ?? false;
    const canEdit = (isAdmin || isOwner || isCollaborator) &&
        (sow?.status === "DRAFT" || sow?.status === "REJECTED");

    const handleWeeksChange = (termId: string, weeks: Week[]) => {
        if (!sow) return;
        setSow({
            ...sow,
            terms: sow.terms.map((t) => t.id === termId ? { ...t, weeks } : t),
        });
    };

    const handleStatusChange = (status: string, adminNote: string | null) => {
        if (!sow) return;
        setSow({ ...sow, status: status as SowStatus, adminNote });
    };

    const handleSaveTitle = async () => {
        if (!titleValue.trim() || !sow) return;
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: titleValue }),
            });
            if (res.ok) {
                setSow({ ...sow, title: titleValue.trim() });
                setEditingTitle(false);
            }
        } catch { /* ignore */ }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this scheme of work? This cannot be undone.")) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`, { method: "DELETE" });
            if (res.ok) router.push("/dashboard/scheme-of-work");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-64 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !sow) {
        return (
            <div className="p-6 max-w-6xl mx-auto text-center py-16">
                <p className="text-red-600 mb-3">{error || "Scheme of work not found"}</p>
                <button onClick={() => router.back()} className="text-sm text-primary-600 hover:underline">Go back</button>
            </div>
        );
    }

    const sortedTerms = [...sow.terms].sort((a, b) => a.termNumber - b.termNumber);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Back */}
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[sow.status]}`}>
                            {sow.status}
                        </span>
                        <span className="text-xs text-gray-400">{sow.subject.name} · {sow.classArm.class.name} {sow.classArm.armName} · {sow.session.name}</span>
                    </div>

                    {editingTitle && canEdit ? (
                        <div className="flex items-center gap-2">
                            <input
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                className="text-xl font-bold border-b-2 border-primary-500 outline-none bg-transparent w-full"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                            />
                            <button onClick={handleSaveTitle} className="text-xs text-primary-600 font-medium hover:underline shrink-0">Save</button>
                            <button onClick={() => { setEditingTitle(false); setTitleValue(sow.title); }} className="text-xs text-gray-400 hover:underline shrink-0">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h1 className="text-xl font-bold text-gray-900 leading-snug">{sow.title}</h1>
                            {canEdit && (
                                <button
                                    onClick={() => setEditingTitle(true)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity shrink-0"
                                    title="Edit title"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                        By {sow.owner.firstName} {sow.owner.lastName}
                        {sow.approvedBy && ` · Approved by ${sow.approvedBy.firstName} ${sow.approvedBy.lastName}`}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {(isOwner || isAdmin) && (
                        <button
                            onClick={() => setShowCollaborators(!showCollaborators)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {sow.collaborators.length > 0 ? `${sow.collaborators.length} Collaborator${sow.collaborators.length > 1 ? "s" : ""}` : "Add Collaborators"}
                        </button>
                    )}
                    {(isOwner || isAdmin) && sow.status === "DRAFT" && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {deleting ? "Deleting…" : "Delete"}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Term tabs */}
                    {sortedTerms.length > 0 ? (
                        <>
                            <div className="flex border-b border-gray-200">
                                {sortedTerms.map((term, i) => (
                                    <button
                                        key={term.id}
                                        onClick={() => setActiveTab(i)}
                                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                            activeTab === i
                                                ? "border-primary-600 text-primary-600"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {term.term.name || `Term ${term.termNumber}`}
                                        <span className="ml-1.5 text-xs text-gray-400">({term.weeks.length} wks)</span>
                                    </button>
                                ))}
                            </div>

                            {sortedTerms.map((term, i) => (
                                <div key={term.id} className={activeTab !== i ? "hidden" : ""}>
                                    <TermWeeksTable
                                        termId={term.termId}
                                        termName={term.term.name || `Term ${term.termNumber}`}
                                        schemeOfWorkTermId={term.id}
                                        weeks={term.weeks}
                                        canEdit={canEdit}
                                        onWeeksChange={(weeks) => handleWeeksChange(term.id, weeks)}
                                    />
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-gray-400 text-sm">
                                No terms found. Ensure the selected session has terms configured.
                            </p>
                        </div>
                    )}
                </div>

                {/* Sidebar panels */}
                <div className="space-y-4">
                    <ApprovalPanel
                        sowId={sow.id}
                        status={sow.status}
                        adminNote={sow.adminNote}
                        isAdmin={isAdmin}
                        isOwner={isOwner}
                        onStatusChange={handleStatusChange}
                    />

                    {showCollaborators && (
                        <CollaboratorPanel sowId={sow.id} isOwner={isOwner || isAdmin} />
                    )}

                    {/* Info card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Subject</span>
                            <span className="font-medium text-gray-800">{sow.subject.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Class</span>
                            <span className="font-medium text-gray-800">{sow.classArm.class.name} {sow.classArm.armName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Session</span>
                            <span className="font-medium text-gray-800">{sow.session.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Weeks</span>
                            <span className="font-medium text-gray-800">
                                {sow.terms.reduce((s, t) => s + t.weeks.length, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
