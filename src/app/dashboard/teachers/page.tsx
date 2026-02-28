"use client";

import { useState, useEffect, useCallback } from "react";

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    roles: string[];
    isActive: boolean;
    assignedClass: string | null;
    subjects: string[];
}

const roleLabels: Record<string, { label: string; color: string }> = {
    CLASS_TEACHER: { label: "Class Teacher", color: "bg-blue-100 text-blue-800" },
    SUBJECT_TEACHER: { label: "Subject Teacher", color: "bg-indigo-100 text-indigo-800" },
    SCHOOL_ADMIN: { label: "Admin", color: "bg-green-100 text-green-800" },
    SUPER_ADMIN: { label: "Super Admin", color: "bg-purple-100 text-purple-800" },
};

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("All");

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{
        classes: { id: string; name: string }[];
        subjects: { id: string; name: string }[];
    }>({ classes: [], subjects: [] });

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        roles: [] as string[],
        classArmIds: [] as string[],
        subjectIds: [] as string[],
    });

    useEffect(() => {
        if (editingTeacher) {
            setFormData({
                firstName: editingTeacher.firstName,
                lastName: editingTeacher.lastName,
                email: editingTeacher.email,
                phone: editingTeacher.phone || "",
                roles: editingTeacher.roles,
                classArmIds: [],
                subjectIds: [],
            });
            setShowAddModal(true);
        } else {
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                roles: [],
                classArmIds: [],
                subjectIds: [],
            });
        }
    }, [editingTeacher]);

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/teachers");
            if (!response.ok) throw new Error("Failed to fetch teachers");
            const data = await response.json();
            setTeachers(data.teachers || []);
            setMetadata(data.metadata || { classes: [], subjects: [] });
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load teachers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const filteredTeachers = teachers.filter((teacher) => {
        const matchesSearch =
            teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRole === "All" || teacher.roles.includes(selectedRole);
        return matchesSearch && matchesRole;
    });

    // Stats
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.isActive).length;
    const classTeachersCount = teachers.filter(t => t.roles.includes("CLASS_TEACHER")).length;
    const adminsCount = teachers.filter(t => t.roles.includes("SCHOOL_ADMIN")).length;

    const handleToggleStatus = async (teacherId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/teachers/${teacherId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (!response.ok) throw new Error("Failed to update status");

            // Optimistic update
            setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, isActive: !currentStatus } : t));
            setSuccessMessage(`Teacher ${!currentStatus ? "activated" : "deactivated"} successfully`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to toggle status");
        }
    };

    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : "/api/teachers";
            const method = editingTeacher ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to save teacher");

            setSuccessMessage(data.message || `Teacher ${editingTeacher ? "updated" : "added"} successfully`);
            setShowAddModal(false);
            setEditingTeacher(null);
            fetchTeachers(); // Refresh list
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
                    <p className="text-gray-500 mt-1">Manage teaching staff and assignments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Teacher
                </button>
            </div>

            {/* Error / Success Messages */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
                    {successMessage}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalTeachers}</p>
                            <p className="text-sm text-gray-500">Total Staff</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{classTeachersCount}</p>
                            <p className="text-sm text-gray-500">Class Teachers</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{adminsCount}</p>
                            <p className="text-sm text-gray-500">Administrators</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{activeTeachers}</p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10 w-full"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="All">All Roles</option>
                        <option value="CLASS_TEACHER">Class Teacher</option>
                        <option value="SUBJECT_TEACHER">Subject Teacher</option>
                        <option value="SCHOOL_ADMIN">Administrator</option>
                    </select>
                </div>
            </div>

            {/* Teachers Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="card overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${teacher.isActive ? "bg-primary-500" : "bg-gray-400"
                                    }`}>
                                    {teacher.firstName[0]}{teacher.lastName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                                            {teacher.lastName} {teacher.firstName}
                                        </h3>
                                        {!teacher.isActive && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {teacher.roles.map(role => (
                                            <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${roleLabels[role]?.color}`}>
                                                {roleLabels[role]?.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="truncate">{teacher.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{teacher.phone}</span>
                                </div>
                            </div>

                            {teacher.assignedClass && (
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">Assigned:</span>
                                    <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800 text-xs font-medium">
                                        {teacher.assignedClass}
                                    </span>
                                </div>
                            )}

                            <div className="mt-4">
                                <span className="text-xs font-medium text-gray-500">Subjects:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {teacher.subjects.map((subj) => (
                                        <span
                                            key={subj}
                                            className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs"
                                        >
                                            {subj}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => handleToggleStatus(teacher.id, teacher.isActive)}
                                className={`text-sm font-medium ${teacher.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                            >
                                {teacher.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                                onClick={() => setEditingTeacher(teacher)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Teacher Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => { setShowAddModal(false); setEditingTeacher(null); }} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingTeacher ? "Edit Teacher" : "Add New Teacher"}
                                </h3>
                                <button
                                    onClick={() => { setShowAddModal(false); setEditingTeacher(null); }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleAddTeacher} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="input w-full"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="input w-full"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        className="input w-full"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        className="input w-full"
                                        placeholder="08012345678"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role(s) *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        {Object.entries(roleLabels).map(([value, { label }]) => (
                                            <label key={value} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                    checked={formData.roles.includes(value)}
                                                    onChange={(e) => {
                                                        const roles = e.target.checked
                                                            ? [...formData.roles, value]
                                                            : formData.roles.filter(r => r !== value);
                                                        setFormData({ ...formData, roles });
                                                    }}
                                                />
                                                <span className="text-sm text-gray-700">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {formData.roles.includes("CLASS_TEACHER") && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Assign Class(es)</label>
                                        <div className="max-h-32 overflow-y-auto p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                            {metadata.classes.map((cls) => (
                                                <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                                        checked={formData.classArmIds.includes(cls.id)}
                                                        onChange={(e) => {
                                                            const classArmIds = e.target.checked
                                                                ? [...formData.classArmIds, cls.id]
                                                                : formData.classArmIds.filter(id => id !== cls.id);
                                                            setFormData({ ...formData, classArmIds });
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-600">{cls.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.roles.includes("SUBJECT_TEACHER") && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Assign Subject(s)</label>
                                        <div className="max-h-32 overflow-y-auto p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                            {metadata.subjects.map((subj) => (
                                                <label key={subj.id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                                        checked={formData.subjectIds.includes(subj.id)}
                                                        onChange={(e) => {
                                                            const subjectIds = e.target.checked
                                                                ? [...formData.subjectIds, subj.id]
                                                                : formData.subjectIds.filter(id => id !== subj.id);
                                                            setFormData({ ...formData, subjectIds });
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-600">{subj.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setEditingTeacher(null); }}
                                        className="btn-secondary"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={isSaving}>
                                        {isSaving ? "Saving..." : (editingTeacher ? "Save Changes" : "Add Teacher")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
