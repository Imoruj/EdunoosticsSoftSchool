"use client";

import { useState } from "react";

type SowStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface TermApprovalState {
    termId: string;
    termNumber: number;
    termName: string;
    status: SowStatus;
    adminNote: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    weekCount: number;
}

interface Props {
    sowId: string;
    terms: TermApprovalState[];
    isAdmin: boolean;
    isOwner: boolean;
    onTermStatusChange: (termId: string, status: SowStatus, adminNote: string | null) => void;
}

const STATUS_BADGE: Record<SowStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-700",
};

function TermRow({ term, isAdmin, isOwner, onStatusChange }: {
    term: TermApprovalState;
    isAdmin: boolean;
    isOwner: boolean;
    onStatusChange: (status: SowStatus, adminNote: string | null) => void;
}) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectNote, setRejectNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const call = async (path: string, body?: object) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/terms/${term.termId}/${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${path}`);
            return data;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        const data = await call("submit");
        if (data) onStatusChange("SUBMITTED", null);
    };

    const handleApprove = async () => {
        const data = await call("approve", {});
        if (data) onStatusChange("APPROVED", null);
    };

    const handleReject = async () => {
        if (!rejectNote.trim()) { setError("Reason is required"); return; }
        const data = await call("reject", { adminNote: rejectNote });
        if (data) {
            onStatusChange("REJECTED", rejectNote);
            setShowRejectForm(false);
            setRejectNote("");
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Term header row */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm font-semibold text-gray-800 truncate">{term.termName}</span>
                    <span className="text-xs text-gray-400">{term.weekCount} week{term.weekCount !== 1 ? "s" : ""}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[term.status]}`}>
                    {term.status}
                </span>
            </div>

            <div className="px-4 py-3 space-y-2.5">
                {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
                )}

                {/* Rejection note */}
                {term.adminNote && term.status === "REJECTED" && (
                    <div className="bg-red-50 border border-red-200 rounded p-2.5">
                        <p className="text-[11px] font-semibold text-red-700 mb-0.5">Rejection reason</p>
                        <p className="text-xs text-red-800 whitespace-pre-line">{term.adminNote}</p>
                    </div>
                )}

                {/* Approval note */}
                {term.adminNote && term.status === "APPROVED" && (
                    <div className="bg-green-50 border border-green-200 rounded p-2.5">
                        <p className="text-[11px] font-semibold text-green-700 mb-0.5">Approval note</p>
                        <p className="text-xs text-green-800 whitespace-pre-line">{term.adminNote}</p>
                    </div>
                )}

                {/* Approved state */}
                {term.status === "APPROVED" && (
                    <div className="flex items-center gap-1.5 text-green-700 text-xs">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approved — snapshot saved for lesson building
                        {term.approvedAt && (
                            <span className="text-gray-400 ml-1">
                                · {new Date(term.approvedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                )}

                {/* Owner: submit button (DRAFT / REJECTED) */}
                {isOwner && (term.status === "DRAFT" || term.status === "REJECTED") && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || term.weekCount === 0}
                        title={term.weekCount === 0 ? "Add weeks before submitting" : undefined}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? "Submitting…" : "Submit Term for Review"}
                    </button>
                )}

                {/* Owner: re-submit after edits (APPROVED) */}
                {isOwner && term.status === "APPROVED" && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || term.weekCount === 0}
                        title="Request admin re-review of updated week content"
                        className="w-full px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                        {loading ? "Submitting…" : "Request Re-review"}
                    </button>
                )}

                {/* Awaiting review */}
                {term.status === "SUBMITTED" && !isAdmin && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2.5">
                        Awaiting admin review.
                        {term.submittedAt && (
                            <span className="ml-1 text-yellow-500">Submitted {new Date(term.submittedAt).toLocaleDateString()}</span>
                        )}
                    </p>
                )}

                {/* Admin: approve / reject */}
                {isAdmin && term.status === "SUBMITTED" && (
                    <>
                        {!showRejectForm ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? "…" : "Approve"}
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    rows={2}
                                    placeholder="Reason for rejection (required)…"
                                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowRejectForm(false); setRejectNote(""); setError(null); }}
                                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={loading || !rejectNote.trim()}
                                        className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                                    >
                                        {loading ? "…" : "Confirm Reject"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Draft with no weeks */}
                {term.status === "DRAFT" && term.weekCount === 0 && (
                    <p className="text-xs text-gray-400">Add weeks to this term before submitting.</p>
                )}
            </div>
        </div>
    );
}

export function ApprovalPanel({ sowId: _sowId, terms, isAdmin, isOwner, onTermStatusChange }: Props) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div>
                <h3 className="font-semibold text-gray-900 text-sm">Review & Approval</h3>
                <p className="text-xs text-gray-400 mt-0.5">Each term is reviewed and approved independently.</p>
            </div>

            {terms.length === 0 ? (
                <p className="text-xs text-gray-400">No terms added yet.</p>
            ) : (
                <div className="space-y-2.5">
                    {terms.map((term) => (
                        <TermRow
                            key={term.termId}
                            term={term}
                            isAdmin={isAdmin}
                            isOwner={isOwner}
                            onStatusChange={(status, note) => onTermStatusChange(term.termId, status, note)}
                        />
                    ))}
                </div>
            )}

            {isAdmin && terms.some((t) => t.status === "APPROVED") && (
                <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                    Approved terms are frozen for lesson building. Teachers may still edit the live version.
                </p>
            )}
        </div>
    );
}
