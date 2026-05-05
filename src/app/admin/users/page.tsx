"use client";

import { useEffect, useState } from "react";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    roles: string[];
    isActive: boolean;
    canSwitchBranches: boolean;
    schoolId: string | null;
    schoolName: string | null;
    branchCount: number;
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    SCHOOL_ADMIN: "Admin",
    PROPRIETOR: "Proprietor",
    CLASS_TEACHER: "Class Teacher",
    SUBJECT_TEACHER: "Subject Teacher",
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchUsers = async (q: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "50" });
            if (q) params.set("search", q);
            const res = await fetch(`/api/admin/users?${params}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users ?? []);
                setTotal(data.total ?? 0);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(debouncedSearch); }, [debouncedSearch]);

    const toggleSwitch = async (user: AdminUser) => {
        if (toggling === user.id) return;
        const next = !user.canSwitchBranches;
        // Optimistic
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: next } : u));
        setToggling(user.id);
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ canSwitchBranches: next }),
            });
            if (!res.ok) {
                // Revert on failure
                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: !next } : u));
            }
        } catch {
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: !next } : u));
        } finally {
            setToggling(null);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Staff Users</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {loading ? "Loading…" : `${total} staff member${total !== 1 ? "s" : ""} across all schools`}
                    </p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-60"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                    The <strong>Branch Switching</strong> toggle controls whether a teacher can use the branch dropdown in their dashboard header.
                    Disabling it hides the switcher even if they are assigned to multiple branches.
                    Changes take effect on the user's next login.
                </p>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">School</th>
                            <th className="px-6 py-3">Role(s)</th>
                            <th className="px-6 py-3 text-center">Branches</th>
                            <th className="px-6 py-3 text-center">Branch Switching</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-14 text-center">
                                    <p className="text-sm font-medium text-gray-500">No users found</p>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => {
                                const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                                                    <span className="text-primary-700 font-semibold text-xs">{initials}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.schoolName ?? <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map((role) => (
                                                    <span key={role} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                                                        {ROLE_LABELS[role] ?? role}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${user.branchCount > 1 ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                                                {user.branchCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleSwitch(user)}
                                                disabled={toggling === user.id}
                                                title={user.canSwitchBranches ? "Disable branch switching" : "Enable branch switching"}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${user.canSwitchBranches ? "bg-primary-600" : "bg-gray-300"}`}
                                                role="switch"
                                                aria-checked={user.canSwitchBranches}
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${user.canSwitchBranches ? "translate-x-5" : "translate-x-0"}`} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
