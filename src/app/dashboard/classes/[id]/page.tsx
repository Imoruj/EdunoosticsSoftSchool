"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
}

interface ClassArm {
    id: string;
    armName: string;
    classTeacherId?: string | null;
    _count: { students: number };
    classTeacher?: {
        firstName: string;
        lastName: string;
        email: string;
    } | null;
}

interface ClassSubject {
    subject: {
        id: string;
        name: string;
        code: string;
        category: string;
    };
}

interface ClassDetails {
    id: string;
    name: string;
    level: string;
    arms: ClassArm[];
    classSubjects: ClassSubject[];
}

export default function ClassDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [cls, setCls] = useState<ClassDetails | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Modal states
    const [showEditClassModal, setShowEditClassModal] = useState(false);
    const [showAddArmModal, setShowAddArmModal] = useState(false);
    const [showEditArmModal, setShowEditArmModal] = useState(false);
    const [selectedArm, setSelectedArm] = useState<ClassArm | null>(null);

    const fetchClassDetails = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/classes/${params.id}`);
            if (!response.ok) throw new Error("Failed to fetch class details");
            const data = await response.json();
            setCls(data.class);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load class details");
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    const fetchTeachers = useCallback(async () => {
        try {
            const response = await fetch("/api/teachers");
            if (response.ok) {
                const data = await response.json();
                setTeachers(data.teachers || []);
            }
        } catch (err) {
            console.error("Error fetching teachers:", err);
        }
    }, []);

    useEffect(() => {
        fetchClassDetails();
        fetchTeachers();
    }, [fetchClassDetails, fetchTeachers]);

    const handleUpdateClass = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            level: formData.get("level"),
        };

        try {
            const response = await fetch(`/api/classes/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to update class");
            }

            setShowEditClassModal(false);
            fetchClassDetails();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddArm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const armsString = formData.get("arms") as string;
        const arms = armsString ? armsString.split(",").map(a => a.trim()).filter(Boolean) : [];

        try {
            const response = await fetch("/api/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: cls?.name,
                    level: cls?.level,
                    arms,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to add arm");
            }

            setShowAddArmModal(false);
            fetchClassDetails();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateArm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedArm) return;
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            armName: formData.get("armName"),
            classTeacherId: formData.get("classTeacherId"),
        };

        try {
            const response = await fetch(`/api/classes/arms/${selectedArm.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to update arm");
            }

            setShowEditArmModal(false);
            setSelectedArm(null);
            fetchClassDetails();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteArm = async (id: string) => {
        if (!confirm("Are you sure you want to delete this arm? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/classes/arms/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to delete arm");
            }

            fetchClassDetails();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error && !cls) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-red-700">{error || "Class not found"}</p>
                <button onClick={() => router.back()} className="mt-4 text-sm font-medium text-red-600 hover:text-red-500 uppercase tracking-wide">
                    &larr; Go Back
                </button>
            </div>
        );
    }

    if (!cls) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{cls.name} Details</h1>
                        <p className="text-gray-500 mt-1">{cls.level.replace("_", " ")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEditClassModal(true)} className="btn-secondary">Edit Class</button>
                    <button onClick={() => setShowAddArmModal(true)} className="btn-primary">Add Arm</button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Statistics & Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Total Arms</span>
                                <span className="font-semibold text-gray-900">{cls.arms.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Total Students</span>
                                <span className="font-semibold text-gray-900">
                                    {cls.arms.reduce((a, b) => a + b._count.students, 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-500">Total Subjects</span>
                                <span className="font-semibold text-gray-900">{cls.classSubjects.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
                        <div className="space-y-2">
                            {cls.classSubjects.length > 0 ? (
                                cls.classSubjects.map(({ subject }) => (
                                    <div key={subject.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center text-[10px] font-bold text-primary-700">
                                                {subject.code}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                                        </div>
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {subject.category}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic py-2">No subjects assigned</p>
                            )}
                        </div>
                        <Link href="/dashboard/subjects" className="w-full mt-4 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center gap-2">
                            Manage Subjects &rarr;
                        </Link>
                    </div>
                </div>

                {/* Arms & Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Class Arms</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Arm Name</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Teacher</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Students</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cls.arms.map((arm) => (
                                        <tr key={arm.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center font-bold text-primary-700 text-sm">
                                                        {arm.armName.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{cls.name} {arm.armName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {arm.classTeacher ? (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {arm.classTeacher.firstName} {arm.classTeacher.lastName}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{arm.classTeacher.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No teacher assigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {arm._count.students} students
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/dashboard/students?classId=${cls.id}&armId=${arm.id}`}
                                                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                                                        title="Manage Students"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedArm(arm);
                                                            setShowEditArmModal(true);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                                                        title="Arm Settings"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <button onClick={() => setShowAddArmModal(true)} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add New Arm
                            </button>
                        </div>
                    </div>

                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h4 className="text-gray-900 font-medium">Coming Soon</h4>
                        <p className="text-gray-500 text-sm mt-1">Detailed student list and assessment tracking will be available here.</p>
                        <button
                            onClick={() => router.push("/dashboard/students")}
                            className="mt-4 text-primary-600 font-medium text-sm hover:underline"
                        >
                            View All Students &rarr;
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Class Modal */}
            {showEditClassModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setShowEditClassModal(false)} />
                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Class</h3>
                                <button onClick={() => setShowEditClassModal(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleUpdateClass} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                                    <input name="name" type="text" defaultValue={cls.name} className="input w-full" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
                                    <select name="level" defaultValue={cls.level} className="input w-full" required>
                                        <option value="NURSERY">Nursery</option>
                                        <option value="PRIMARY">Primary</option>
                                        <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                                        <option value="SENIOR_SECONDARY">Senior Secondary</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                    <button type="button" onClick={() => setShowEditClassModal(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Updating..." : "Save Changes"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Arm Modal */}
            {showAddArmModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setShowAddArmModal(false)} />
                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Add Arm to {cls.name}</h3>
                                <button onClick={() => setShowAddArmModal(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleAddArm} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arm Names (comma separated) *</label>
                                    <input name="arms" type="text" className="input w-full" placeholder="e.g., D, E, F" required autoFocus />
                                    <p className="text-xs text-gray-500 mt-1">Enter names for the new arms you want to add.</p>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                    <button type="button" onClick={() => setShowAddArmModal(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Adding..." : "Add Arm(s)"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Arm Modal */}
            {showEditArmModal && selectedArm && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} />
                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Arm: {selectedArm.armName}</h3>
                                <button onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleUpdateArm} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arm Name *</label>
                                    <input name="armName" type="text" defaultValue={selectedArm.armName} className="input w-full" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
                                    <select name="classTeacherId" defaultValue={selectedArm.classTeacherId || ""} className="input w-full">
                                        <option value="">No Teacher Assigned</option>
                                        {teachers.map(teacher => (
                                            <option key={teacher.id} value={teacher.id}>
                                                {teacher.firstName} {teacher.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <button type="button" onClick={() => handleDeleteArm(selectedArm.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">Delete Arm</button>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} className="btn-secondary" disabled={submitting}>Cancel</button>
                                        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
