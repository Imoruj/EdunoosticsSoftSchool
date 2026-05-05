"use client";

import { useEffect, useState } from "react";

interface OrgSchool {
    id: string;
    name: string;
    branchCode: string | null;
    isHeadBranch: boolean;
    isActive: boolean;
    logoUrl: string | null;
    _count: { students: number; users: number };
}

interface Org {
    id: string;
    name: string;
    slug: string;
    branches: OrgSchool[];
}

export default function AdminOrganizationsPage() {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [unassigned, setUnassigned] = useState<OrgSchool[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

    // Create org modal
    const [createModal, setCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [saving, setSaving] = useState(false);

    // Assign school modal
    const [assignModal, setAssignModal] = useState<{ orgId: string; orgName: string } | null>(null);
    const [assignSchoolId, setAssignSchoolId] = useState("");
    const [assignBranchCode, setAssignBranchCode] = useState("");
    const [assignIsHead, setAssignIsHead] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // Edit school in org (name, branchCode, isHeadBranch)
    const [editSchool, setEditSchool] = useState<{ school: OrgSchool; orgId: string } | null>(null);
    const [editBranchCode, setEditBranchCode] = useState("");
    const [editIsHead, setEditIsHead] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    const [actioning, setActioning] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/organizations");
            if (res.ok) {
                const data = await res.json();
                setOrgs(data.orgs ?? []);
                setUnassigned(data.unassigned ?? []);
                setExpandedOrgs(new Set((data.orgs ?? []).map((o: Org) => o.id)));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const createOrg = async () => {
        if (!newOrgName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newOrgName.trim() }),
            });
            if (res.ok) {
                setCreateModal(false);
                setNewOrgName("");
                await fetchData();
            }
        } finally {
            setSaving(false);
        }
    };

    const deleteOrg = async (orgId: string) => {
        if (!confirm("Remove this organization? All branches will become unassigned.")) return;
        setActioning(orgId);
        try {
            await fetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" });
            await fetchData();
        } finally {
            setActioning(null);
        }
    };

    const removeSchoolFromOrg = async (orgId: string, schoolId: string) => {
        setActioning(schoolId);
        try {
            await fetch(`/api/admin/organizations/${orgId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, remove: true }),
            });
            await fetchData();
        } finally {
            setActioning(null);
        }
    };

    const openAssign = (org: Org) => {
        setAssignSchoolId("");
        setAssignBranchCode("");
        setAssignIsHead(false);
        setAssignModal({ orgId: org.id, orgName: org.name });
    };

    const confirmAssign = async () => {
        if (!assignModal || !assignSchoolId) return;
        setAssigning(true);
        try {
            await fetch(`/api/admin/organizations/${assignModal.orgId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId: assignSchoolId, branchCode: assignBranchCode, isHeadBranch: assignIsHead }),
            });
            setAssignModal(null);
            await fetchData();
        } finally {
            setAssigning(false);
        }
    };

    const openEditSchool = (school: OrgSchool, orgId: string) => {
        setEditSchool({ school, orgId });
        setEditBranchCode(school.branchCode ?? "");
        setEditIsHead(school.isHeadBranch);
    };

    const saveEditSchool = async () => {
        if (!editSchool) return;
        setEditSaving(true);
        try {
            await fetch(`/api/admin/schools/${editSchool.school.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchCode: editBranchCode, isHeadBranch: editIsHead }),
            });
            setEditSchool(null);
            await fetchData();
        } finally {
            setEditSaving(false);
        }
    };

    const toggleExpand = (orgId: string) => {
        setExpandedOrgs((prev) => {
            const next = new Set(prev);
            next.has(orgId) ? next.delete(orgId) : next.add(orgId);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="space-y-4 max-w-5xl">
                {[1, 2].map((i) => (
                    <div key={i} className="card p-6 animate-pulse">
                        <div className="h-5 bg-gray-100 rounded w-48 mb-3" />
                        <div className="h-4 bg-gray-100 rounded w-72" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Organizations</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Group schools into organizations and designate head branches</p>
                </div>
                <button
                    onClick={() => setCreateModal(true)}
                    className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Organization
                </button>
            </div>

            {/* Orgs */}
            {orgs.length === 0 && (
                <div className="card p-10 text-center">
                    <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-500">No organizations yet</p>
                    <p className="text-xs text-gray-400 mt-1">Create one to group schools together</p>
                </div>
            )}

            {orgs.map((org) => {
                const expanded = expandedOrgs.has(org.id);
                return (
                    <div key={org.id} className="card overflow-hidden">
                        <div
                            className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpand(org.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{org.name}</p>
                                    <p className="text-xs text-gray-400">{org.branches.length} branch{org.branches.length !== 1 ? "es" : ""} · slug: {org.slug}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openAssign(org); }}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 bg-white transition-colors"
                                >
                                    Assign School
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteOrg(org.id); }}
                                    disabled={actioning === org.id}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-colors disabled:opacity-40"
                                >
                                    {actioning === org.id ? "…" : "Delete"}
                                </button>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {expanded && (
                            <div className="border-t border-gray-100">
                                {org.branches.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-gray-400 text-center">No branches assigned yet</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-2">School</th>
                                                <th className="px-6 py-2">Branch Code</th>
                                                <th className="px-6 py-2 text-center">Students</th>
                                                <th className="px-6 py-2 text-center">Users</th>
                                                <th className="px-6 py-2">Type</th>
                                                <th className="px-6 py-2">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {org.branches.map((school) => (
                                                <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900">{school.name}</span>
                                                            {school.isHeadBranch && (
                                                                <span title="Head Branch">
                                                                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500">{school.branchCode ?? <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-6 py-3 text-center text-gray-700 font-semibold">{school._count.students}</td>
                                                    <td className="px-6 py-3 text-center text-gray-600">{school._count.users}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${school.isHeadBranch ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                                            {school.isHeadBranch ? "Head Branch" : "Branch"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => openEditSchool(school, org.id)}
                                                                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => removeSchoolFromOrg(org.id, school.id)}
                                                                disabled={actioning === school.id}
                                                                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-colors disabled:opacity-40"
                                                            >
                                                                {actioning === school.id ? "…" : "Remove"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Unassigned Schools */}
            {unassigned.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-700">Unassigned Schools</p>
                        <p className="text-xs text-gray-400 mt-0.5">These schools are not part of any organization</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white border-b border-gray-100">
                                <th className="px-6 py-2">School</th>
                                <th className="px-6 py-2 text-center">Students</th>
                                <th className="px-6 py-2 text-center">Users</th>
                                <th className="px-6 py-2">Assign To</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {unassigned.map((school) => (
                                <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-900">{school.name}</td>
                                    <td className="px-6 py-3 text-center text-gray-700 font-semibold">{school._count.students}</td>
                                    <td className="px-6 py-3 text-center text-gray-600">{school._count.users}</td>
                                    <td className="px-6 py-3">
                                        {orgs.length === 0 ? (
                                            <span className="text-xs text-gray-400">Create an org first</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {orgs.map((org) => (
                                                    <button
                                                        key={org.id}
                                                        onClick={() => {
                                                            setAssignSchoolId(school.id);
                                                            setAssignBranchCode("");
                                                            setAssignIsHead(false);
                                                            setAssignModal({ orgId: org.id, orgName: org.name });
                                                        }}
                                                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 bg-white transition-colors"
                                                    >
                                                        → {org.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Org Modal */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">New Organization</h3>
                        <p className="text-sm text-gray-500 mb-4">Group multiple school branches under one organization.</p>
                        <input
                            type="text"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="Organization name (e.g. Trinitate International School)"
                            className="input w-full mb-4"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && createOrg()}
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setCreateModal(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                            <button onClick={createOrg} disabled={saving || !newOrgName.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                                {saving ? "Creating…" : "Create Organization"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign School Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Assign School to {assignModal.orgName}</h3>
                        <p className="text-sm text-gray-500 mb-4">Choose a school and configure its role within this organization.</p>

                        <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                        <select
                            value={assignSchoolId}
                            onChange={(e) => setAssignSchoolId(e.target.value)}
                            className="input w-full mb-3"
                        >
                            <option value="">Select a school…</option>
                            {unassigned.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                            type="text"
                            value={assignBranchCode}
                            onChange={(e) => setAssignBranchCode(e.target.value)}
                            placeholder="e.g. TIS-HQ, TIS-NW"
                            className="input w-full mb-3"
                        />

                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <div
                                onClick={() => setAssignIsHead((v) => !v)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${assignIsHead ? "bg-amber-500" : "bg-gray-300"}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${assignIsHead ? "translate-x-5" : "translate-x-0"}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Set as Head Branch</span>
                        </label>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setAssignModal(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                            <button onClick={confirmAssign} disabled={assigning || !assignSchoolId} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                                {assigning ? "Assigning…" : "Assign School"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit School Branch Modal */}
            {editSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Branch — {editSchool.school.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">Update the branch code and head branch designation.</p>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                            type="text"
                            value={editBranchCode}
                            onChange={(e) => setEditBranchCode(e.target.value)}
                            placeholder="e.g. TIS-HQ"
                            className="input w-full mb-3"
                        />

                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <div
                                onClick={() => setEditIsHead((v) => !v)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${editIsHead ? "bg-amber-500" : "bg-gray-300"}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${editIsHead ? "translate-x-5" : "translate-x-0"}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Head Branch</span>
                        </label>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setEditSchool(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                            <button onClick={saveEditSchool} disabled={editSaving} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                                {editSaving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
