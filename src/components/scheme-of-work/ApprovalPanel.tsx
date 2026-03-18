"use client";

import { useState } from "react";

interface Props {
    sowId: string;
    status: string;
    adminNote: string | null;
    isAdmin: boolean;
    isOwner: boolean;
    onStatusChange: (status: string, adminNote: string | null) => void;
}

export function ApprovalPanel({ sowId, status, adminNote, isAdmin, isOwner, onStatusChange }: Props) {
    const [rejectNote, setRejectNote] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${sowId}/submit`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit");
            onStatusChange("SUBMITTED", null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${sowId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to approve");
            onStatusChange("APPROVED", null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectNote.trim()) { setError("Please provide a reason for rejection"); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${sowId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminNote: rejectNote }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to reject");
            onStatusChange("REJECTED", rejectNote);
            setShowRejectForm(false);
            setRejectNote("");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Review & Approval</h3>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>
            )}

            {/* Admin note from previous rejection */}
            {adminNote && status === "REJECTED" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800 whitespace-pre-line">{adminNote}</p>
                </div>
            )}

            {adminNote && status === "APPROVED" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Approval Note</p>
                    <p className="text-sm text-green-800 whitespace-pre-line">{adminNote}</p>
                </div>
            )}

            {/* Owner: submit button */}
            {isOwner && (status === "DRAFT" || status === "REJECTED") && (
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? "Submitting…" : "Submit for Review"}
                </button>
            )}

            {/* Admin: approve / reject */}
            {isAdmin && status === "SUBMITTED" && (
                <>
                    {!showRejectForm ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? "…" : "Approve"}
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                rows={3}
                                placeholder="Reason for rejection (required)…"
                                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowRejectForm(false); setRejectNote(""); setError(null); }}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={loading || !rejectNote.trim()}
                                    className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                                >
                                    {loading ? "Rejecting…" : "Confirm Reject"}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {status === "APPROVED" && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approved — visible to enrolled students
                </div>
            )}

            {status === "SUBMITTED" && !isAdmin && (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    Awaiting admin review.
                </p>
            )}
        </div>
    );
}
