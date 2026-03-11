"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface UploadRequest {
    id: string;
    status: string;
    scoreData: any[];
    fileName: string | null;
    studentCount: number;
    conflictCount: number;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
    uploader: { firstName: string; lastName: string; email: string };
    subject: { name: string; code: string | null };
    term: { name: string; session: { name: string } };
    classArm: { armName: string; class: { name: string } };
    reviewedBy: { firstName: string; lastName: string } | null;
}

export default function UploadRequestsPage() {
    const { data: sessionData } = useSession();
    const [requests, setRequests] = useState<UploadRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("PENDING");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/scores/upload-requests?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (err) {
            console.error("Failed to fetch requests", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const handleApprove = async (id: string) => {
        setProcessing(id);
        setMessage(null);
        try {
            const res = await fetch(`/api/scores/upload-requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve" }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: data.message });
                fetchRequests();
            } else {
                setMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Failed to approve request" });
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessing(id);
        setMessage(null);
        try {
            const res = await fetch(`/api/scores/upload-requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject", rejectionReason }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: "Request rejected" });
                setRejectId(null);
                setRejectionReason("");
                fetchRequests();
            } else {
                setMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Failed to reject request" });
        } finally {
            setProcessing(null);
        }
    };

    const tabs = [
        { key: "PENDING", label: "Pending" },
        { key: "APPROVED", label: "Approved" },
        { key: "REJECTED", label: "Rejected" },
    ];

    const statusColors: Record<string, string> = {
        PENDING: "bg-amber-100 text-amber-800",
        APPROVED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Score Upload Requests</h1>
                <p className="text-gray-500 mt-1">Review and manage score upload requests from teachers</p>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === tab.key
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No {activeTab.toLowerCase()} requests</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(request => (
                        <div key={request.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Request Header */}
                            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            {request.subject.name} - {request.classArm.class.name} {request.classArm.armName}
                                        </h3>
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${statusColors[request.status]}`}>
                                            {request.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-0.5">
                                        <p>
                                            <span className="font-medium">Uploaded by:</span> {request.uploader.lastName} {request.uploader.firstName}
                                        </p>
                                        <p>
                                            <span className="font-medium">Term:</span> {request.term.session.name} - {request.term.name}
                                        </p>
                                        <p>
                                            <span className="font-medium">Students:</span> {request.studentCount} total, {request.conflictCount} with existing scores
                                        </p>
                                        <p>
                                            <span className="font-medium">Date:</span> {new Date(request.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                        {request.fileName && (
                                            <p><span className="font-medium">File:</span> {request.fileName}</p>
                                        )}
                                        {request.reviewedBy && (
                                            <p>
                                                <span className="font-medium">Reviewed by:</span> {request.reviewedBy.lastName} {request.reviewedBy.firstName}
                                                {request.reviewedAt && ` on ${new Date(request.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                                            </p>
                                        )}
                                        {request.rejectionReason && (
                                            <p className="text-red-600"><span className="font-medium">Reason:</span> {request.rejectionReason}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        {expandedId === request.id ? "Hide Details" : "View Details"}
                                    </button>
                                    {request.status === "PENDING" && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(request.id)}
                                                disabled={processing === request.id}
                                                className={`px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 ${processing === request.id ? "opacity-50" : ""}`}
                                            >
                                                {processing === request.id ? "..." : "Approve"}
                                            </button>
                                            <button
                                                onClick={() => { setRejectId(request.id); setRejectionReason(""); }}
                                                disabled={processing === request.id}
                                                className={`px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 ${processing === request.id ? "opacity-50" : ""}`}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Reject Reason Input */}
                            {rejectId === request.id && (
                                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Enter reason..."
                                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={processing === request.id}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                        >
                                            Confirm Reject
                                        </button>
                                        <button
                                            onClick={() => setRejectId(null)}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Expanded Score Data */}
                            {expandedId === request.id && (
                                <div className="border-t border-gray-200 bg-gray-50 p-5">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Score Data</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-left font-medium text-gray-600">S/N</th>
                                                    <th className="px-3 py-2 text-left font-medium text-gray-600">Admission No.</th>
                                                    {request.scoreData.some((s: any) => s.ca1 !== undefined) && (
                                                        <th className="px-3 py-2 text-center font-medium text-gray-600">CA1</th>
                                                    )}
                                                    {request.scoreData.some((s: any) => s.ca2 !== undefined) && (
                                                        <th className="px-3 py-2 text-center font-medium text-gray-600">CA2</th>
                                                    )}
                                                    {request.scoreData.some((s: any) => s.ca3 !== undefined) && (
                                                        <th className="px-3 py-2 text-center font-medium text-gray-600">CA3</th>
                                                    )}
                                                    {request.scoreData.some((s: any) => s.exam !== undefined) && (
                                                        <th className="px-3 py-2 text-center font-medium text-gray-600">Exam</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {request.scoreData.map((entry: any, idx: number) => (
                                                    <tr key={idx} className="border-t border-gray-200">
                                                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-gray-900">{entry.admissionNumber}</td>
                                                        {request.scoreData.some((s: any) => s.ca1 !== undefined) && (
                                                            <td className="px-3 py-2 text-center">{entry.ca1 ?? "-"}</td>
                                                        )}
                                                        {request.scoreData.some((s: any) => s.ca2 !== undefined) && (
                                                            <td className="px-3 py-2 text-center">{entry.ca2 ?? "-"}</td>
                                                        )}
                                                        {request.scoreData.some((s: any) => s.ca3 !== undefined) && (
                                                            <td className="px-3 py-2 text-center">{entry.ca3 ?? "-"}</td>
                                                        )}
                                                        {request.scoreData.some((s: any) => s.exam !== undefined) && (
                                                            <td className="px-3 py-2 text-center">{entry.exam ?? "-"}</td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
