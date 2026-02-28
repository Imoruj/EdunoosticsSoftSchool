"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
}

interface ClassArm {
    id: string;
    name: string;
    armName: string;
    classTeacherId?: string | null;
    _count: { students: number };
    classTeacher?: {
        firstName: string;
        lastName: string;
    } | null;
}

interface Class {
    id: string;
    name: string;
    level: string;
    arms: ClassArm[];
}

const levelColors: Record<string, { bg: string; text: string }> = {
    NURSERY: { bg: "bg-purple-100", text: "text-purple-800" },
    PRIMARY: { bg: "bg-blue-100", text: "text-blue-800" },
    JUNIOR_SECONDARY: { bg: "bg-amber-100", text: "text-amber-800" },
    SENIOR_SECONDARY: { bg: "bg-green-100", text: "text-green-800" },
};

export default function ClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState("All");
    const [submitting, setSubmitting] = useState(false);
    const [selectedClassForArm, setSelectedClassForArm] = useState<Class | null>(null);

    // Arm Edit states
    const [showEditArmModal, setShowEditArmModal] = useState(false);
    const [selectedArm, setSelectedArm] = useState<ClassArm | null>(null);

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/classes");
            if (!response.ok) throw new Error("Failed to fetch classes");
            const data = await response.json();
            setClasses(data.classes || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load classes");
        } finally {
            setLoading(false);
        }
    }, []);

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
        fetchClasses();
        fetchTeachers();
    }, [fetchClasses, fetchTeachers]);

    const handleAddClass = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const armsString = formData.get("arms") as string;
        const arms = armsString ? armsString.split(",").map(a => a.trim()).filter(Boolean) : [];

        const data = {
            name: formData.get("name"),
            level: formData.get("level"),
            arms,
        };

        try {
            const response = await fetch("/api/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to add class");
            }

            setShowAddModal(false);
            fetchClasses();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddArm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedClassForArm) return;
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const armsString = formData.get("arms") as string;
        const arms = armsString ? armsString.split(",").map(a => a.trim()).filter(Boolean) : [];

        if (arms.length === 0) {
            setError("Please provide at least one arm name");
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: selectedClassForArm.name,
                    level: selectedClassForArm.level,
                    arms,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to add arm");
            }

            setSelectedClassForArm(null);
            fetchClasses();
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
            fetchClasses();
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

            fetchClasses();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteClass = async (classId: string) => {
        if (!confirm("Are you sure you want to delete this class? This cannot be undone.")) return;

        try {
            const response = await fetch(`/api/classes?id=${classId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to delete class");
            }

            fetchClasses();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredClasses =
        selectedLevel === "All"
            ? classes
            : classes.filter((c) => c.level === selectedLevel);

    const totalStudents = classes.reduce(
        (acc, cls) => acc + cls.arms.reduce((a, arm) => a + arm._count.students, 0),
        0
    );

    const totalArms = classes.reduce((acc, cls) => acc + cls.arms.length, 0);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
                    <p className="text-gray-500 mt-1">Manage class structure and arm assignments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Class
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 font-mono text-xs">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 text-center sm:text-left shadow-sm border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
                </div>
                <div className="card p-4 text-center sm:text-left shadow-sm border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Arms</p>
                    <p className="text-2xl font-bold text-gray-900">{totalArms}</p>
                </div>
                <div className="card p-4 text-center sm:text-left shadow-sm border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
                <div className="card p-4 text-center sm:text-left shadow-sm border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Avg per Arm</p>
                    <p className="text-2xl font-bold text-gray-900">{totalArms > 0 ? Math.round(totalStudents / totalArms) : 0}</p>
                </div>
            </div>

            {/* Level Filter */}
            <div className="flex gap-2 flex-wrap">
                {["All", "PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"].map((level) => (
                    <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedLevel === level
                            ? "bg-primary-600 text-white shadow-md shadow-primary-200"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                            }`}
                    >
                        {level === "All" ? "All Levels" : level.replace("_", " ")}
                    </button>
                ))}
            </div>

            {/* Classes Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredClasses.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                    <p>No classes found. Add your first class.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map((cls) => (
                        <div key={cls.id} className="card overflow-hidden hover:shadow-md transition-shadow group/card">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${levelColors[cls.level]?.bg} ${levelColors[cls.level]?.text}`}>
                                            {cls.level.replace("_", " ")}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteClass(cls.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Class"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-medium">
                                    {cls.arms.length} arm{cls.arms.length !== 1 ? "s" : ""} •{" "}
                                    {cls.arms.reduce((a, arm) => a + arm._count.students, 0)} students
                                </p>
                            </div>

                            <div className="p-4 space-y-3 bg-gray-50/30">
                                {cls.arms.map((arm) => (
                                    <div
                                        key={arm.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-primary-200 group/arm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-100/50 rounded-xl flex items-center justify-center font-bold text-primary-700">
                                                {arm.armName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover/arm:text-primary-700 transition-colors">
                                                    {arm.armName}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                                                    {arm.classTeacher ? `${arm.classTeacher.firstName} ${arm.classTeacher.lastName}` : "No Teacher"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-bold text-gray-900">{arm._count.students}</span>
                                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">students</span>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover/arm:opacity-100 transition-opacity translate-x-2 group-hover/arm:translate-x-0">
                                                <button
                                                    onClick={() => {
                                                        setSelectedArm(arm);
                                                        setShowEditArmModal(true);
                                                    }}
                                                    className="p-1 px-1.5 bg-gray-50 hover:bg-primary-50 text-gray-400 hover:text-primary-600 rounded-md border border-gray-100 transition-colors"
                                                    title="Edit Arm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteArm(arm.id)}
                                                    className="p-1 px-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md border border-gray-100 transition-colors"
                                                    title="Delete Arm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cls.arms.length === 0 && (
                                    <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                        <p className="text-xs text-gray-400 font-medium italic">No arms assigned</p>
                                    </div>
                                )}
                            </div>

                            <div className="px-5 py-3 bg-white border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <Link
                                        href={`/dashboard/classes/${cls.id}`}
                                        className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wider hover:underline underline-offset-4 decoration-2"
                                    >
                                        View Details
                                    </Link>
                                    <button
                                        onClick={() => setSelectedClassForArm(cls)}
                                        className="text-xs text-gray-400 hover:text-gray-900 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Arm
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showAddModal && <AddClassModal onClose={() => setShowAddModal(false)} onSubmit={handleAddClass} submitting={submitting} />}
            {selectedClassForArm && <AddArmModal cls={selectedClassForArm} onClose={() => setSelectedClassForArm(null)} onSubmit={handleAddArm} submitting={submitting} />}
            {showEditArmModal && selectedArm && <EditArmModal arm={selectedArm} teachers={teachers} onClose={() => { setShowEditArmModal(false); setSelectedArm(null); }} onSubmit={handleUpdateArm} onDelete={() => handleDeleteArm(selectedArm.id)} submitting={submitting} />}
        </div>
    );
}

function AddClassModal({ onClose, onSubmit, submitting }: { onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Add New Class</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl font-light">&times;</button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Class Name *</label>
                            <input name="name" type="text" className="input w-full" placeholder="e.g., Primary 1, JSS 1" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Level *</label>
                            <select name="level" className="input w-full" required>
                                <option value="">Select level</option>
                                <option value="NURSERY">Nursery</option>
                                <option value="PRIMARY">Primary</option>
                                <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                                <option value="SENIOR_SECONDARY">Senior Secondary</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Arms (comma separated)</label>
                            <input name="arms" type="text" className="input w-full" placeholder="A, B, C or Science, Arts" />
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">Leave empty to add arms later</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-6">
                            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
                            <button type="submit" className="btn-primary px-8" disabled={submitting}>{submitting ? "Adding..." : "Add Class"}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function AddArmModal({ cls, onClose, onSubmit, submitting }: { cls: Class; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Add Arm to {cls.name}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl font-light">&times;</button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Arm Names (comma separated) *</label>
                            <input name="arms" type="text" className="input w-full" placeholder="e.g., D, E, F" required autoFocus />
                            <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Enter names for the new arms you want to add.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-6">
                            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
                            <button type="submit" className="btn-primary px-8" disabled={submitting}>{submitting ? "Adding..." : "Add Arm(s)"}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function EditArmModal({ arm, teachers, onClose, onSubmit, onDelete, submitting }: { arm: ClassArm; teachers: Teacher[]; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onDelete: () => void; submitting: boolean }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Edit Arm: {arm.armName}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl font-light">&times;</button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Arm Name *</label>
                            <input name="armName" type="text" defaultValue={arm.armName} className="input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Class Teacher</label>
                            <select name="classTeacherId" defaultValue={arm.classTeacherId || ""} className="input w-full">
                                <option value="">No Teacher Assigned</option>
                                {teachers.map(teacher => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.firstName} {teacher.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                            <button type="button" onClick={onDelete} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Arm
                            </button>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
