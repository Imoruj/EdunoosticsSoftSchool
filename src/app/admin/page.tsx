"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentSchool {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    createdAt: string;
    isActive: boolean;
    _count: { students: number; users: number; classes: number; subjects: number };
}

interface SchoolBreakdown {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    _count: { students: number; users: number; classes: number; subjects: number; gradingRules: number };
}

interface Stats {
    totalSchools: number;
    activeSchools: number;
    totalStudents: number;
    totalUsers: number;
    totalClasses: number;
    totalSubjects: number;
    totalScores: number;
    recentSchools: RecentSchool[];
    schoolBreakdown: SchoolBreakdown[];
}

interface PendingSchool {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    createdAt: string;
    registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
    registrationRejectionReason: string | null;
    _count: { students: number; users: number };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    // Platform settings
    const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
    const [togglingSignup, setTogglingSignup] = useState(false);

    // Pending schools
    const [pendingSchools, setPendingSchools] = useState<PendingSchool[]>([]);
    const [actioning, setActioning] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ schoolId: string; schoolName: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { setStats(d); setLoading(false); })
            .catch(() => setLoading(false));

        fetch("/api/admin/platform-settings")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => d && setSignupEnabled(d.signupEnabled))
            .catch(() => {});

        fetch("/api/admin/schools")
            .then((r) => r.ok ? r.json() : [])
            .then((d: PendingSchool[]) => setPendingSchools(d.filter((s) => s.registrationStatus === "PENDING")))
            .catch(() => {});
    }, []);

    const toggleSignup = async () => {
        if (signupEnabled === null) return;
        setTogglingSignup(true);
        try {
            const res = await fetch("/api/admin/platform-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signupEnabled: !signupEnabled }),
            });
            if (res.ok) {
                const d = await res.json();
                setSignupEnabled(d.signupEnabled);
            }
        } finally {
            setTogglingSignup(false);
        }
    };

    const approveSchool = async (schoolId: string) => {
        setActioning(schoolId);
        try {
            const res = await fetch("/api/admin/schools", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, action: "approve" }),
            });
            if (res.ok) {
                setPendingSchools((prev) => prev.filter((s) => s.id !== schoolId));
                setStats((prev) => prev ? { ...prev, totalSchools: prev.totalSchools, activeSchools: prev.activeSchools + 1 } : prev);
            }
        } finally {
            setActioning(null);
        }
    };

    const openRejectModal = (school: PendingSchool) => {
        setRejectionReason("");
        setRejectModal({ schoolId: school.id, schoolName: school.name });
    };

    const confirmReject = async () => {
        if (!rejectModal) return;
        setActioning(rejectModal.schoolId);
        try {
            const res = await fetch("/api/admin/schools", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId: rejectModal.schoolId, action: "reject", rejectionReason }),
            });
            if (res.ok) {
                setPendingSchools((prev) => prev.filter((s) => s.id !== rejectModal.schoolId));
            }
        } finally {
            setActioning(null);
            setRejectModal(null);
        }
    };

    const statCards = [
        {
            label: "Total Schools",
            value: stats?.totalSchools ?? 0,
            sub: `${stats?.activeSchools ?? 0} active`,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            iconBg: "bg-blue-50", iconColor: "text-blue-600", border: "border-blue-100",
        },
        {
            label: "Total Students",
            value: stats?.totalStudents ?? 0,
            sub: "Across all schools",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            iconBg: "bg-purple-50", iconColor: "text-purple-600", border: "border-purple-100",
        },
        {
            label: "Platform Users",
            value: stats?.totalUsers ?? 0,
            sub: "Admins, teachers & staff",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            iconBg: "bg-orange-50", iconColor: "text-orange-600", border: "border-orange-100",
        },
        {
            label: "Total Classes",
            value: stats?.totalClasses ?? 0,
            sub: "All class groups",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            iconBg: "bg-cyan-50", iconColor: "text-cyan-600", border: "border-cyan-100",
        },
        {
            label: "Total Subjects",
            value: stats?.totalSubjects ?? 0,
            sub: "Across all schools",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            iconBg: "bg-indigo-50", iconColor: "text-indigo-600", border: "border-indigo-100",
        },
        {
            label: "Score Entries",
            value: stats?.totalScores ?? 0,
            sub: "Total scores recorded",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            ),
            iconBg: "bg-green-50", iconColor: "text-green-600", border: "border-green-100",
        },
    ];

    const topSchool = stats?.schoolBreakdown?.reduce(
        (a, b) => (a._count.students > b._count.students ? a : b),
        stats.schoolBreakdown[0]
    );

    return (
        <div className="space-y-8 max-w-7xl">
            {/* Welcome Banner */}
            <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Welcome, Super Admin 👋</h2>
                        <p className="text-primary-100 text-sm">
                            Here&apos;s what&apos;s happening across all schools on the Edunostics platform today.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            href="/admin/schools"
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                            </svg>
                            Manage Schools
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── PLATFORM CONTROLS ROW ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Signup Toggle Card */}
                <div className={`card p-5 border-2 ${signupEnabled === false ? "border-orange-200 bg-orange-50" : "border-green-100 bg-green-50"}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${signupEnabled === false ? "bg-orange-100" : "bg-green-100"}`}>
                                <svg className={`w-6 h-6 ${signupEnabled === false ? "text-orange-600" : "text-green-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">New School Registrations</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {signupEnabled === null
                                        ? "Loading…"
                                        : signupEnabled
                                            ? "Registration page is open. New schools can sign up."
                                            : "Registration is closed. New schools cannot sign up."}
                                </p>
                                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${signupEnabled === false ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                    {signupEnabled === null ? "…" : signupEnabled ? "OPEN" : "CLOSED"}
                                </span>
                            </div>
                        </div>
                        {/* Toggle switch */}
                        <button
                            onClick={toggleSignup}
                            disabled={togglingSignup || signupEnabled === null}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 mt-0.5 ${signupEnabled ? "bg-green-500" : "bg-gray-300"}`}
                            role="switch"
                            aria-checked={signupEnabled ?? false}
                            title={signupEnabled ? "Click to disable signup" : "Click to enable signup"}
                        >
                            <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${signupEnabled ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>

                {/* Pending Registrations Summary Card */}
                <div className={`card p-5 border-2 ${pendingSchools.length > 0 ? "border-orange-200 bg-orange-50" : "border-gray-100"}`}>
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${pendingSchools.length > 0 ? "bg-orange-100" : "bg-gray-100"}`}>
                            <svg className={`w-6 h-6 ${pendingSchools.length > 0 ? "text-orange-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">Pending Approvals</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {pendingSchools.length > 0
                                    ? `${pendingSchools.length} school registration${pendingSchools.length !== 1 ? "s" : ""} awaiting your review`
                                    : "No pending school registrations"}
                            </p>
                            {pendingSchools.length > 0 && (
                                <Link href="/admin/schools?filter=pending" className="inline-block mt-2 text-xs font-semibold text-orange-700 underline underline-offset-2">
                                    View all pending →
                                </Link>
                            )}
                        </div>
                        {pendingSchools.length > 0 && (
                            <span className="text-2xl font-bold text-orange-600">{pendingSchools.length}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── PENDING REGISTRATIONS TABLE ── */}
            {pendingSchools.length > 0 && (
                <div className="card overflow-hidden border-2 border-orange-100">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-orange-100 bg-orange-50">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            <h3 className="font-semibold text-gray-900">
                                Pending School Registrations
                            </h3>
                            <span className="ml-1 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                {pendingSchools.length}
                            </span>
                        </div>
                        <Link href="/admin/schools" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                            View all schools →
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-3">School</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Registered</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-50">
                                {pendingSchools.map((school) => {
                                    const busy = actioning === school.id;
                                    return (
                                        <tr key={school.id} className="bg-orange-50/30 hover:bg-orange-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                                                        <span className="text-orange-700 font-bold text-sm">
                                                            {school.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{school.name}</p>
                                                        <p className="text-xs text-gray-400">{school.id.slice(0, 8)}…</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                <p>{school.email ?? "—"}</p>
                                                <p className="text-xs text-gray-400">{school.phone ?? ""}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {[school.city, school.state].filter(Boolean).join(", ") || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {new Date(school.createdAt).toLocaleDateString("en-NG", {
                                                    day: "numeric", month: "short", year: "numeric",
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => approveSchool(school.id)}
                                                        disabled={busy}
                                                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                                                    >
                                                        {busy ? (
                                                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(school)}
                                                        disabled={busy}
                                                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-colors disabled:opacity-40"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {statCards.map((card) => (
                    <div key={card.label} className={`card p-5 border ${card.border}`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                                <span className={card.iconColor}>{card.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? (
                                        <span className="inline-block w-14 h-7 bg-gray-100 animate-pulse rounded" />
                                    ) : (
                                        card.value.toLocaleString()
                                    )}
                                </p>
                                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{loading ? "…" : card.sub}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* School-by-School Breakdown */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-semibold text-gray-900">School-by-School Breakdown</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Detailed analytics per school</p>
                    </div>
                    <Link
                        href="/admin/schools"
                        className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                    >
                        Manage
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-3">School</th>
                                <th className="px-6 py-3 text-center">Students</th>
                                <th className="px-6 py-3 text-center">Users</th>
                                <th className="px-6 py-3 text-center">Classes</th>
                                <th className="px-6 py-3 text-center">Subjects</th>
                                <th className="px-6 py-3 text-center">Grading Rules</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : !stats?.schoolBreakdown?.length ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                                        No schools registered yet.
                                    </td>
                                </tr>
                            ) : (
                                stats.schoolBreakdown.map((school) => {
                                    const isTop = topSchool?.id === school.id && stats.schoolBreakdown.length > 1;
                                    return (
                                        <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                                                        <span className="text-primary-700 font-bold text-sm">
                                                            {school.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                                            {school.name}
                                                            {isTop && (
                                                                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded font-medium">
                                                                    Top
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-semibold text-gray-800">{school._count.students.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">{school._count.users}</td>
                                            <td className="px-6 py-4 text-center text-gray-600">{school._count.classes}</td>
                                            <td className="px-6 py-4 text-center text-gray-600">{school._count.subjects}</td>
                                            <td className="px-6 py-4 text-center text-gray-600">{school._count.gradingRules}</td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {new Date(school.createdAt).toLocaleDateString("en-NG", {
                                                    day: "numeric", month: "short", year: "numeric",
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${school.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${school.isActive ? "bg-green-500" : "bg-red-500"}`} />
                                                    {school.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {!loading && stats?.schoolBreakdown && stats.schoolBreakdown.length > 1 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-700 text-sm">
                                    <td className="px-6 py-3">Totals ({stats.schoolBreakdown.length} schools)</td>
                                    <td className="px-6 py-3 text-center">{stats.totalStudents.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-center">{stats.totalUsers}</td>
                                    <td className="px-6 py-3 text-center">{stats.totalClasses}</td>
                                    <td className="px-6 py-3 text-center">{stats.totalSubjects}</td>
                                    <td className="px-6 py-3 text-center">
                                        {stats.schoolBreakdown.reduce((sum, s) => sum + s._count.gradingRules, 0)}
                                    </td>
                                    <td className="px-6 py-3" colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Registration</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            You are rejecting <span className="font-semibold text-gray-700">{rejectModal.schoolName}</span>. Optionally provide a reason that the school admin will see when they attempt to log in.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection (optional)"
                            rows={3}
                            className="input w-full resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRejectModal(null)}
                                className="btn-secondary px-4 py-2 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={actioning === rejectModal.schoolId}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {actioning === rejectModal.schoolId ? "Rejecting…" : "Reject Registration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
