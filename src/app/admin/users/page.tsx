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

interface School {
    id: string;
    name: string;
    branchCode: string | null;
    isHeadBranch: boolean;
    organizationId: string | null;
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

    // Branch assignment modal
    const [branchModal, setBranchModal] = useState<AdminUser | null>(null);
    const [modalSchools, setModalSchools] = useState<School[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSaving, setModalSaving] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchUsers = async (q: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "200" });
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

    const openBranchModal = async (user: AdminUser) => {
        setBranchModal(user);
        setModalLoading(true);
        setSelectedBranchIds(new Set());
        setModalSchools([]);
        try {
            const res = await fetch(`/api/admin/users/${user.id}/branches`);
            if (res.ok) {
                const data = await res.json();
                setModalSchools(data.schools ?? []);
                setSelectedBranchIds(new Set(data.assignedBranchIds ?? []));
            }
        } finally {
            setModalLoading(false);
        }
    };

    const handleToggle = async (user: AdminUser) => {
        if (toggling === user.id) return;

        if (!user.canSwitchBranches) {
            // Turning ON → open branch picker modal
            openBranchModal(user);
        } else {
            // Turning OFF → disable directly, no modal
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: false } : u));
            setToggling(user.id);
            try {
                const res = await fetch(`/api/admin/users/${user.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ canSwitchBranches: false }),
                });
                if (!res.ok) {
                    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: true } : u));
                }
            } catch {
                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, canSwitchBranches: true } : u));
            } finally {
                setToggling(null);
            }
        }
    };

    const toggleBranchSelection = (schoolId: string) => {
        setSelectedBranchIds((prev) => {
            const next = new Set(prev);
            next.has(schoolId) ? next.delete(schoolId) : next.add(schoolId);
            return next;
        });
    };

    const saveBranchAssignments = async () => {
        if (!branchModal || selectedBranchIds.size === 0) return;
        setModalSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${branchModal.id}/branches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchIds: Array.from(selectedBranchIds) }),
            });
            if (res.ok) {
                const data = await res.json();
                setUsers((prev) => prev.map((u) =>
                    u.id === branchModal.id
                        ? { ...u, canSwitchBranches: true, branchCount: data.branchCount ?? selectedBranchIds.size }
                        : u
                ));
                setBranchModal(null);
            }
        } finally {
            setModalSaving(false);
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
                    Toggle <strong>ON</strong> to select which branches a teacher can access — a branch picker will appear.
                    Toggle <strong>OFF</strong> to hide the branch switcher from their dashboard.
                    Changes take effect on the user&apos;s next login.
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
                                            <button
                                                onClick={() => openBranchModal(user)}
                                                title="View / edit branch assignments"
                                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${user.branchCount > 1 ? "bg-primary-100 text-primary-700 hover:bg-primary-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                            >
                                                {user.branchCount}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggle(user)}
                                                disabled={toggling === user.id}
                                                title={user.canSwitchBranches ? "Disable branch switching" : "Enable — select branches"}
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

            {/* Branch Assignment Modal */}
            {branchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Branch Access</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Select the branches <span className="font-semibold text-gray-700">{branchModal.name}</span> can access
                                    </p>
                                </div>
                                <button
                                    onClick={() => setBranchModal(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* School List */}
                        <div className="px-6 py-4 max-h-80 overflow-y-auto">
                            {modalLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />
                                            <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : modalSchools.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No schools available</p>
                            ) : (
                                <div className="space-y-1">
                                    {modalSchools.map((school) => {
                                        const checked = selectedBranchIds.has(school.id);
                                        const isPrimary = school.id === branchModal.schoolId;
                                        return (
                                            <label
                                                key={school.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? "bg-primary-50 hover:bg-primary-100" : "hover:bg-gray-50"}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleBranchSelection(school.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-medium truncate ${checked ? "text-primary-900" : "text-gray-800"}`}>
                                                            {school.name}
                                                        </span>
                                                        {school.isHeadBranch && (
                                                            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                        )}
                                                        {isPrimary && (
                                                            <span className="text-xs text-gray-400 font-normal">(primary)</span>
                                                        )}
                                                    </div>
                                                    {school.branchCode && (
                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">{school.branchCode}</p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                            <p className="text-xs text-gray-500">
                                {selectedBranchIds.size} branch{selectedBranchIds.size !== 1 ? "es" : ""} selected
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setBranchModal(null)}
                                    className="btn-secondary px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveBranchAssignments}
                                    disabled={modalSaving || selectedBranchIds.size === 0}
                                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                                >
                                    {modalSaving ? "Saving…" : "Save & Enable"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
