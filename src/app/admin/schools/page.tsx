"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface School {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    isActive: boolean;
    registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
    registrationRejectionReason: string | null;
    createdAt: string;
    _count: { students: number; users: number };
}

type FilterType = "all" | "active" | "inactive" | "pending";

export default function AdminSchoolsPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actioning, setActioning] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");

    // Signup toggle state
    const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
    const [togglingSignup, setTogglingSignup] = useState(false);

    // Rejection modal state
    const [rejectModal, setRejectModal] = useState<{ schoolId: string; schoolName: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        fetch("/api/admin/schools")
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => { setSchools(d); setLoading(false); })
            .catch(() => setLoading(false));

        fetch("/api/admin/platform-settings")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => d && setSignupEnabled(d.signupEnabled))
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

    const toggleActive = async (school: School) => {
        setActioning(school.id);
        try {
            const res = await fetch("/api/admin/schools", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId: school.id, isActive: !school.isActive }),
            });
            if (res.ok) {
                const updated = await res.json();
                setSchools((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
            }
        } finally {
            setActioning(null);
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
                const updated = await res.json();
                setSchools((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
            }
        } finally {
            setActioning(null);
        }
    };

    const openRejectModal = (school: School) => {
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
                const updated = await res.json();
                setSchools((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
            }
        } finally {
            setActioning(null);
            setRejectModal(null);
        }
    };

    const filtered = schools
        .filter((s) => {
            if (filter === "pending") return s.registrationStatus === "PENDING";
            if (filter === "active") return s.isActive && s.registrationStatus === "APPROVED";
            if (filter === "inactive") return !s.isActive && s.registrationStatus !== "PENDING";
            return true;
        })
        .filter((s) =>
            `${s.name} ${s.email ?? ""} ${s.city ?? ""} ${s.state ?? ""}`.toLowerCase().includes(search.toLowerCase())
        );

    const pendingCount = schools.filter((s) => s.registrationStatus === "PENDING").length;
    const activeCount = schools.filter((s) => s.isActive && s.registrationStatus === "APPROVED").length;
    const inactiveCount = schools.filter((s) => !s.isActive && s.registrationStatus !== "PENDING").length;

    const statusBadge = (school: School) => {
        if (school.registrationStatus === "PENDING") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    Pending
                </span>
            );
        }
        if (school.registrationStatus === "REJECTED") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Rejected
                </span>
            );
        }
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${school.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${school.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                {school.isActive ? "Active" : "Inactive"}
            </span>
        );
    };

    const actionButtons = (school: School) => {
        const busy = actioning === school.id;

        if (school.registrationStatus === "PENDING") {
            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => approveSchool(school.id)}
                        disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 bg-white transition-colors disabled:opacity-40"
                    >
                        {busy ? "…" : "Approve"}
                    </button>
                    <button
                        onClick={() => openRejectModal(school)}
                        disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-colors disabled:opacity-40"
                    >
                        Reject
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                <Link
                    href={`/admin/schools/${school.id}/features`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 bg-white transition-colors"
                >
                    Features
                </Link>
                {school.registrationStatus === "REJECTED" ? (
                    <button
                        onClick={() => approveSchool(school.id)}
                        disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 bg-white transition-colors disabled:opacity-40"
                    >
                        {busy ? "…" : "Approve"}
                    </button>
                ) : (
                    <button
                        onClick={() => toggleActive(school)}
                        disabled={busy}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${school.isActive
                            ? "border-red-200 text-red-600 hover:bg-red-50 bg-white"
                            : "border-green-200 text-green-700 hover:bg-green-50 bg-white"
                            }`}
                    >
                        {busy ? "…" : school.isActive ? "Deactivate" : "Activate"}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Signup Toggle Banner */}
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${signupEnabled === false ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${signupEnabled === false ? "bg-orange-100" : "bg-green-100"}`}>
                        <svg className={`w-5 h-5 ${signupEnabled === false ? "text-orange-600" : "text-green-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">New School Registrations</p>
                        <p className="text-xs text-gray-500">
                            {signupEnabled === null
                                ? "Loading..."
                                : signupEnabled
                                    ? "Public registration is currently open. New schools can sign up."
                                    : "Public registration is disabled. New schools cannot sign up."}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleSignup}
                    disabled={togglingSignup || signupEnabled === null}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${signupEnabled ? "bg-green-500" : "bg-gray-300"}`}
                    role="switch"
                    aria-checked={signupEnabled ?? false}
                >
                    <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${signupEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                </button>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">All Schools</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {loading ? "Loading…" : `${schools.length} school${schools.length !== 1 ? "s" : ""} on this platform`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search schools..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <Link
                        href="/auth/register"
                        target="_blank"
                        className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add School
                    </Link>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
                {([
                    { key: "all", label: "All", count: schools.length },
                    { key: "pending", label: "Pending", count: pendingCount },
                    { key: "active", label: "Active", count: activeCount },
                    { key: "inactive", label: "Inactive", count: inactiveCount },
                ] as const).map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === key
                            ? key === "pending"
                                ? "bg-orange-500 text-white"
                                : "bg-primary-600 text-white"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        {label}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                            {loading ? "…" : count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Pending approval alert */}
            {pendingCount > 0 && filter !== "pending" && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm text-orange-800">
                        <span className="font-semibold">{pendingCount} school{pendingCount !== 1 ? "s" : ""}</span> pending approval.{" "}
                        <button onClick={() => setFilter("pending")} className="underline font-medium">View pending</button>
                    </p>
                </div>
            )}

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3">School</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-center">Students</th>
                            <th className="px-6 py-3 text-center">Users</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-14 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-500">No schools found</p>
                                        <p className="text-xs text-gray-400">Try adjusting your search or filter</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((school) => (
                                <tr key={school.id} className={`hover:bg-gray-50 transition-colors ${school.registrationStatus === "PENDING" ? "bg-orange-50/40" : ""}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${school.registrationStatus === "PENDING" ? "bg-orange-100 border border-orange-200" : "bg-primary-50 border border-primary-100"}`}>
                                                <span className={`font-bold text-sm ${school.registrationStatus === "PENDING" ? "text-orange-700" : "text-primary-700"}`}>
                                                    {school.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{school.name}</p>
                                                <p className="text-xs text-gray-400">{school.id.slice(0, 8)}…</p>
                                                {school.registrationStatus === "REJECTED" && school.registrationRejectionReason && (
                                                    <p className="text-xs text-red-500 mt-0.5">Reason: {school.registrationRejectionReason}</p>
                                                )}
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
                                    <td className="px-6 py-4 text-center font-semibold text-gray-700">{school._count.students}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{school._count.users}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(school.createdAt).toLocaleDateString("en-NG", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-6 py-4">{statusBadge(school)}</td>
                                    <td className="px-6 py-4">{actionButtons(school)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
