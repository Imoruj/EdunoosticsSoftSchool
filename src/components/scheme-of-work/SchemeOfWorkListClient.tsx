"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SowStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

interface SchemeOfWork {
    id: string;
    title: string;
    status: SowStatus;
    submittedAt: string | null;
    approvedAt: string | null;
    updatedAt: string;
    subject: { id: string; name: string; code: string | null };
    classArm: { id: string; armName: string; class: { name: string } };
    session: { id: string; name: string };
    owner: { id: string; firstName: string; lastName: string };
    _count: { collaborators: number; terms: number };
}

const STATUS_STYLES: Record<SowStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

export function SchemeOfWorkListClient() {
    const { data: session } = useSession();
    const router = useRouter();
    const user = session?.user as any;
    const roles: string[] = user?.roles || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const isStudent = roles.includes("STUDENT") || user?.loginType === "student";

    const [schemesOfWork, setSchemesOfWork] = useState<SchemeOfWork[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<SowStatus | "">("");
    const [sessionFilter, setSessionFilter] = useState("");
    const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch { /* ignore */ }
    }, []);

    const fetchSOWs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit: "50" });
            if (statusFilter) params.set("status", statusFilter);
            if (sessionFilter) params.set("sessionId", sessionFilter);

            const res = await fetch(`/api/scheme-of-work?${params}`);
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setSchemesOfWork(data.schemesOfWork || []);

            if (isAdmin) {
                const pendingRes = await fetch("/api/scheme-of-work?status=SUBMITTED&limit=100");
                if (pendingRes.ok) {
                    const pendingData = await pendingRes.json();
                    setPendingCount(pendingData.pagination?.total || 0);
                }
            }
        } catch (e: any) {
            setError(e.message || "Failed to load schemes of work");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, sessionFilter, isAdmin]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        fetchSOWs();
    }, [fetchSOWs]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scheme of Work</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isStudent
                            ? "View approved curriculum plans for your subjects"
                            : "Create and manage subject curriculum plans"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && pendingCount > 0 && (
                        <button
                            onClick={() => setStatusFilter("SUBMITTED")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg hover:bg-yellow-100"
                        >
                            <span className="w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {pendingCount}
                            </span>
                            Pending Review
                        </button>
                    )}
                    {!isStudent && (
                        <Link
                            href="/dashboard/scheme-of-work/create"
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Scheme
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                    <option value="">All Sessions</option>
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                {!isStudent && (
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SowStatus | "")}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-44" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-red-600 text-sm">{error}</p>
                    <button onClick={fetchSOWs} className="mt-3 text-sm text-primary-600 hover:underline">Retry</button>
                </div>
            ) : schemesOfWork.length === 0 ? (
                <div className="text-center py-16">
                    <svg className="mx-auto w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-gray-700 font-medium mb-1">No schemes of work found</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        {isStudent ? "No approved schemes available yet." : "Create your first scheme of work to get started."}
                    </p>
                    {!isStudent && (
                        <Link href="/dashboard/scheme-of-work/create" className="text-sm text-primary-600 font-medium hover:underline">
                            Create Scheme of Work
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schemesOfWork.map((sow) => (
                        <button
                            key={sow.id}
                            onClick={() => router.push(`/dashboard/scheme-of-work/${sow.id}`)}
                            className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[sow.status]}`}>
                                    {sow.status}
                                </span>
                                <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{sow.title}</h3>
                            <p className="text-xs text-gray-500 mb-3">{sow.session.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>{sow.subject.name}</span>
                                <span>·</span>
                                <span>{sow.classArm.class.name} {sow.classArm.armName}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                <span>{sow.owner.firstName} {sow.owner.lastName}</span>
                                <span>{sow._count.collaborators > 0 ? `+${sow._count.collaborators} collaborator${sow._count.collaborators > 1 ? "s" : ""}` : ""}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
