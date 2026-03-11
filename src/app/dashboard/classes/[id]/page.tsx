"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { showAppConfirm } from "@/lib/appMessageBox";

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

            fetchClassDetails();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete arm");
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2.5 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200 shadow-sm hover:shadow">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{cls.name} Details</h1>
                        <p className="text-slate-500 mt-1 font-medium">{cls.level.replace("_", " ")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => setShowEditClassModal(true)}>Edit Class</Button>
                    <Button onClick={() => setShowAddArmModal(true)}>Add Arm</Button>
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
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-500 text-sm font-medium">Total Arms</span>
                                <span className="font-bold text-slate-900">{cls.arms.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-500 text-sm font-medium">Total Students</span>
                                <span className="font-bold text-slate-900">
                                    {cls.arms.reduce((a, b) => a + b._count.students, 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-500 text-sm font-medium">Total Subjects</span>
                                <span className="font-bold text-slate-900">{cls.classSubjects.length}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Subjects</h3>
                        <div className="space-y-2">
                            {cls.classSubjects.length > 0 ? (
                                cls.classSubjects.map(({ subject }) => (
                                    <div key={subject.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                                {subject.code}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{subject.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                            {subject.category}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 italic py-2">No subjects assigned</p>
                            )}
                        </div>
                        <Link href="/dashboard/subjects" className="w-full mt-6 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 font-bold hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 group">
                            Manage Subjects
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </Card>
                </div>

                {/* Arms & Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-slate-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Class Arms</h3>
                            <Button variant="secondary" size="sm" onClick={() => setShowAddArmModal(true)} className="text-xs h-8 px-3">
                                Add New Arm
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Arm Name</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Class Teacher</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-center">Students</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cls.arms.map((arm) => (
                                        <TableRow key={arm.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-sm border border-slate-200">
                                                        {arm.armName.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{cls.name} {arm.armName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                {arm.classTeacher ? (
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {arm.classTeacher.firstName} {arm.classTeacher.lastName}
                                                        </p>
                                                        <p className="text-xs text-slate-400 font-medium">{arm.classTeacher.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium italic bg-slate-50 px-2 py-1 rounded border border-slate-100">No teacher assigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                                    {arm._count.students} students
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                                                    <Link
                                                        href={`/dashboard/students?classId=${cls.id}&armId=${arm.id}`}
                                                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/10 transition-all"
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
                                                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                                                        title="Arm Settings"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    <Card className="text-center py-12 bg-white border border-dashed border-slate-200 shadow-none overflow-hidden hover:border-slate-300 transition-all">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h4 className="text-slate-900 font-bold tracking-tight">Coming Soon</h4>
                        <p className="text-slate-500 text-sm mt-1 max-w-[200px] mx-auto">Detailed student list and assessment tracking will be available here.</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push("/dashboard/students")}
                            className="mt-6 font-bold text-xs"
                        >
                            View All Students
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Edit Class Modal */}
            {showEditClassModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditClassModal(false)} />
                        <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                                <h3 className="text-xl font-bold text-slate-900">Edit Class</h3>
                                <button onClick={() => setShowEditClassModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateClass} className="p-6 space-y-6 bg-white">
                                <Input
                                    name="name"
                                    label="Class Name *"
                                    defaultValue={cls.name}
                                    required
                                />
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">Level *</label>
                                    <select name="level" defaultValue={cls.level} className="w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border border-slate-300" required>
                                        <option value="NURSERY">Nursery</option>
                                        <option value="PRIMARY">Primary</option>
                                        <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                                        <option value="SENIOR_SECONDARY">Senior Secondary</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <Button variant="secondary" onClick={() => setShowEditClassModal(false)} disabled={submitting}>Cancel</Button>
                                    <Button type="submit" isLoading={submitting}>Save Changes</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {/* Add Arm Modal */}
            {showAddArmModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddArmModal(false)} />
                        <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                                <h3 className="text-xl font-bold text-slate-900">Add Arm to {cls.name}</h3>
                                <button onClick={() => setShowAddArmModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleAddArm} className="p-6 space-y-6 bg-white">
                                <Input
                                    name="arms"
                                    label="Arm Names (comma separated) *"
                                    placeholder="e.g., D, E, F"
                                    required
                                    autoFocus
                                />
                                <p className="text-[10px] text-slate-400 font-medium bg-slate-50 p-2 rounded border border-slate-100">
                                    Enter names for the new arms you want to add.
                                </p>
                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <Button variant="secondary" onClick={() => setShowAddArmModal(false)} disabled={submitting}>Cancel</Button>
                                    <Button type="submit" isLoading={submitting}>Add Arm(s)</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {/* Edit Arm Modal */}
            {showEditArmModal && selectedArm && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} />
                        <Card className="relative w-full max-w-md shadow-2xl overflow-hidden border-slate-200">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                                <h3 className="text-xl font-bold text-slate-900">Edit Arm: {selectedArm.armName}</h3>
                                <button onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateArm} className="p-6 space-y-6 bg-white">
                                <Input
                                    name="armName"
                                    label="Arm Name *"
                                    defaultValue={selectedArm.armName}
                                    required
                                />
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">Class Teacher</label>
                                    <select name="classTeacherId" defaultValue={selectedArm.classTeacherId || ""} className="w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border border-slate-300">
                                        <option value="">No Teacher Assigned</option>
                                        {teachers.map(teacher => (
                                            <option key={teacher.id} value={teacher.id}>
                                                {teacher.firstName} {teacher.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <button type="button" onClick={() => handleDeleteArm(selectedArm.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1 group">
                                        <svg className="w-3.5 h-3.5 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Arm
                                    </button>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" onClick={() => { setShowEditArmModal(false); setSelectedArm(null); }} disabled={submitting}>Cancel</Button>
                                        <Button type="submit" isLoading={submitting}>Save Changes</Button>
                                    </div>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
