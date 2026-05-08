"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showAppConfirm } from "@/lib/appMessageBox";

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
    NURSERY: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300" },
    PRIMARY: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300" },
    JUNIOR_SECONDARY: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300" },
    SENIOR_SECONDARY: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300" },
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
        const confirmed = await showAppConfirm("Are you sure you want to delete this arm? This cannot be undone.", {
            title: "Delete Arm",
            variant: "warning",
            confirmText: "Delete",
        });
        if (!confirmed) return;

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
            toast.error(err.message || "Failed to delete arm");
        }
    };

    const handleDeleteClass = async (classId: string) => {
        const confirmed = await showAppConfirm("Are you sure you want to delete this class? This cannot be undone.", {
            title: "Delete Class",
            variant: "warning",
            confirmText: "Delete",
        });
        if (!confirmed) return;

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
            toast.error(err.message || "Failed to delete class");
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Classes</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage class structure and arm assignments</p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Class
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 font-mono text-xs">
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 text-center sm:text-left shadow-sm border-gray-100 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{classes.length}</p>
                </Card>
                <Card className="p-4 text-center sm:text-left shadow-sm border-gray-100 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Arms</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalArms}</p>
                </Card>
                <Card className="p-4 text-center sm:text-left shadow-sm border-gray-100 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalStudents}</p>
                </Card>
                <Card className="p-4 text-center sm:text-left shadow-sm border-gray-100 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Avg per Arm</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalArms > 0 ? Math.round(totalStudents / totalArms) : 0}</p>
                </Card>
            </div>

            {/* Level Filter */}
            <div className="flex gap-2 flex-wrap">
                {["All", "PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"].map((level) => (
                    <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedLevel === level
                            ? "bg-primary-600 text-white shadow-md shadow-primary-200"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                <Card className="text-center py-12 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
                    <p>No classes found. Add your first class.</p>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map((cls) => (
                        <Card key={cls.id} className="overflow-hidden hover:shadow-md transition-shadow group/card">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{cls.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${levelColors[cls.level]?.bg} ${levelColors[cls.level]?.text}`}>
                                            {cls.level.replace("_", " ")}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteClass(cls.id)}
                                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                            title="Delete Class"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide font-medium">
                                    {cls.arms.length} arm{cls.arms.length !== 1 ? "s" : ""} •{" "}
                                    {cls.arms.reduce((a, arm) => a + arm._count.students, 0)} students
                                </p>
                            </div>

                            <div className="p-4 space-y-3 bg-gray-50/30 dark:bg-gray-700/20">
                                {cls.arms.map((arm) => (
                                    <div
                                        key={arm.id}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:border-primary-200 dark:hover:border-primary-700 group/arm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary-100/50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center font-bold text-primary-700 dark:text-primary-300">
                                                {arm.armName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover/arm:text-primary-700 dark:group-hover/arm:text-primary-400 transition-colors">
                                                    {arm.armName}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tight">
                                                    {arm.classTeacher ? `${arm.classTeacher.firstName} ${arm.classTeacher.lastName}` : "No Teacher"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{arm._count.students}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter">students</span>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover/arm:opacity-100 transition-opacity translate-x-2 group-hover/arm:translate-x-0">
                                                <button
                                                    onClick={() => {
                                                        setSelectedArm(arm);
                                                        setShowEditArmModal(true);
                                                    }}
                                                    className="p-1 px-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-md border border-gray-100 dark:border-gray-600 transition-colors"
                                                    title="Edit Arm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteArm(arm.id)}
                                                    className="p-1 px-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-md border border-gray-100 dark:border-gray-600 transition-colors"
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
                                    <div className="text-center py-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                                        <p className="text-xs text-gray-400 dark:text-gray-600 font-medium italic">No arms assigned</p>
                                    </div>
                                )}
                            </div>

                            <div className="px-5 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <Link
                                        href={`/dashboard/classes/${cls.id}`}
                                        className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wider hover:underline underline-offset-4 decoration-2"
                                    >
                                        View Details
                                    </Link>
                                    <button
                                        onClick={() => setSelectedClassForArm(cls)}
                                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Arm
                                    </button>
                                </div>
                            </div>
                        </Card>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100">Add New Class</h3>
                        <button onClick={onClose} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-6 bg-white dark:bg-gray-800">
                        <Input
                            name="name"
                            label="Class Name *"
                            placeholder="e.g., Primary 1, JSS 1"
                            required
                        />
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Level *</label>
                            <select name="level" className="w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" required>
                                <option value="">Select level</option>
                                <option value="NURSERY">Nursery</option>
                                <option value="PRIMARY">Primary</option>
                                <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                                <option value="SENIOR_SECONDARY">Senior Secondary</option>
                            </select>
                        </div>
                        <Input
                            name="arms"
                            label="Arms (comma separated)"
                            placeholder="A, B, C or Science, Arts"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium bg-slate-50 dark:bg-gray-700/50 p-2 rounded border border-slate-100 dark:border-gray-600">
                            Leave empty to add arms later. Use commas to separate multiple arms.
                        </p>
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                            <Button type="submit" isLoading={submitting}>Add Class</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

function AddArmModal({ cls, onClose, onSubmit, submitting }: { cls: Class; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100">Add Arm to {cls.name}</h3>
                        <button onClick={onClose} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-6 bg-white dark:bg-gray-800">
                        <Input
                            name="arms"
                            label="Arm Names (comma separated) *"
                            placeholder="e.g., D, E, F"
                            required
                            autoFocus
                        />
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium bg-slate-50 dark:bg-gray-700/50 p-2 rounded border border-slate-100 dark:border-gray-600">
                            Enter names for the new arms you want to add to this class.
                        </p>
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                            <Button type="submit" isLoading={submitting}>Add Arm(s)</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

function EditArmModal({ arm, teachers, onClose, onSubmit, onDelete, submitting }: { arm: ClassArm; teachers: Teacher[]; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onDelete: () => void; submitting: boolean }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100">Edit Arm: {arm.armName}</h3>
                        <button onClick={onClose} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={onSubmit} className="p-6 space-y-6 bg-white dark:bg-gray-800">
                        <Input
                            name="armName"
                            label="Arm Name *"
                            defaultValue={arm.armName}
                            required
                        />
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Class Teacher</label>
                            <select name="classTeacherId" defaultValue={arm.classTeacherId || ""} className="w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                                <option value="">No Teacher Assigned</option>
                                {teachers.map(teacher => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.firstName} {teacher.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-gray-700">
                            <button type="button" onClick={onDelete} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1 group">
                                <svg className="w-3.5 h-3.5 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Arm
                            </button>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                                <Button type="submit" isLoading={submitting}>Save Changes</Button>
                            </div>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
