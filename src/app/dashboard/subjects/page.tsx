"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Subject {
    id: string;
    name: string;
    code: string;
    category: string;
    isActive: boolean;
    classIds?: string[];
}

interface ClassOption {
    id: string;
    name: string;
    level: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
    CORE: { bg: "bg-blue-100", text: "text-blue-800" },
    SCIENCE: { bg: "bg-green-100", text: "text-green-800" },
    ARTS: { bg: "bg-purple-100", text: "text-purple-800" },
    COMMERCIAL: { bg: "bg-amber-100", text: "text-amber-800" },
    VOCATIONAL: { bg: "bg-cyan-100", text: "text-cyan-800" },
    LANGUAGE: { bg: "bg-pink-100", text: "text-pink-800" },
};

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [submitting, setSubmitting] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [viewSubject, setViewSubject] = useState<Subject | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [subjectsRes, classesRes] = await Promise.all([
                fetch("/api/subjects"),
                fetch("/api/classes")
            ]);

            if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
            if (!classesRes.ok) throw new Error("Failed to fetch classes");

            const subjectsData = await subjectsRes.json();
            const classesData = await classesRes.json();

            setSubjects(subjectsData.subjects || []);
            setClasses(classesData.classes || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const selectedClassesArray = Array.from(
            (e.currentTarget.elements.namedItem("classIds") as HTMLSelectElement).selectedOptions
        ).map(option => option.value);

        const data: any = {
            name: formData.get("name"),
            code: formData.get("code"),
            category: formData.get("category"),
            classIds: selectedClassesArray,
        };

        if (selectedSubject) {
            data.id = selectedSubject.id;
            data.isActive = selectedSubject.isActive;
        }

        try {
            const url = "/api/subjects";
            const method = selectedSubject ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || `Failed to ${selectedSubject ? 'update' : 'add'} subject`);
            }

            setShowAddModal(false);
            setSelectedSubject(null);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (subject: Subject) => {
        setSelectedSubject(subject);
        setShowAddModal(true);
    };

    const handleView = (subject: Subject) => {
        setViewSubject(subject);
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (!confirm("Are you sure you want to delete this subject?")) return;

        try {
            const response = await fetch(`/api/subjects?id=${subjectId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to delete subject");
            }

            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredSubjects = subjects.filter((subject) => {
        const matchesSearch =
            subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (subject.code && subject.code.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory =
            selectedCategory === "All" || subject.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ["All", "CORE", "SCIENCE", "ARTS", "COMMERCIAL", "VOCATIONAL", "LANGUAGE"];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
                    <p className="text-gray-500 mt-1">Manage subjects and class assignments</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedSubject(null);
                        setShowAddModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subject
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
                            <p className="text-sm text-gray-500">Total Subjects</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {subjects.filter((s) => s.category === "CORE").length}
                            </p>
                            <p className="text-sm text-gray-500">Core Subjects</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {subjects.filter((s) => s.category === "SCIENCE").length}
                            </p>
                            <p className="text-sm text-gray-500">Science Subjects</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {subjects.filter((s) => s.isActive).length}
                            </p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search subjects..."
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

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === "All" ? "All Categories" : cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Subjects Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p>No subjects found. Add your first subject.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubjects.map((subject) => (
                        <div key={subject.id} className="card p-5 hover:shadow-card-hover transition-shadow relative">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                        <span className="text-primary-700 font-bold text-sm">{subject.code}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${categoryColors[subject.category]?.bg || "bg-gray-100"} ${categoryColors[subject.category]?.text || "text-gray-800"}`}>
                                            {subject.category}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteSubject(subject.id)}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                    title="Delete Subject"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    {subject.classIds?.length || 0} classes
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleView(subject)}
                                        className="p-1 text-gray-400 hover:text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                                        title="View Details"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(subject)}
                                        className="p-1 text-gray-400 hover:text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                                        title="Edit Subject"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subject.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                    }`}>
                                    {subject.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View Subject Modal */}
            {viewSubject && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setViewSubject(null)} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{viewSubject.name}</h3>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${categoryColors[viewSubject.category]?.bg || "bg-gray-100"
                                        } ${categoryColors[viewSubject.category]?.text || "text-gray-800"}`}>
                                        {viewSubject.category}
                                    </span>
                                </div>
                                <button onClick={() => setViewSubject(null)} className="text-gray-400 hover:text-gray-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</label>
                                    <p className="text-gray-900 font-medium">{viewSubject.code || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                                    <p className={`font-medium ${viewSubject.isActive ? "text-green-600" : "text-gray-600"}`}>
                                        {viewSubject.isActive ? "Active" : "Inactive"}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                        Assigned Classes
                                    </label>
                                    {viewSubject.classIds && viewSubject.classIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {classes
                                                .filter(c => viewSubject.classIds?.includes(c.id))
                                                .map(c => (
                                                    <span key={c.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                        {c.name}
                                                    </span>
                                                ))
                                            }
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No classes assigned</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => {
                                        handleEdit(viewSubject);
                                        setViewSubject(null);
                                    }}
                                    className="btn-primary"
                                >
                                    Edit Subject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Subject Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => { setShowAddModal(false); setSelectedSubject(null); }} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {selectedSubject ? "Edit Subject" : "Add New Subject"}
                                </h3>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedSubject(null); }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="sr-only">Close</span>
                                </button>
                            </div>

                            <form onSubmit={handleAddSubject} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Name *
                                    </label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={selectedSubject?.name}
                                        className="input w-full"
                                        placeholder="e.g., Mathematics"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Code
                                    </label>
                                    <input
                                        name="code"
                                        type="text"
                                        defaultValue={selectedSubject?.code}
                                        className="input w-full"
                                        placeholder="e.g., MTH"
                                        maxLength={5}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        name="category"
                                        className="input w-full"
                                        required
                                        defaultValue={selectedSubject?.category || ""}
                                    >
                                        <option value="">Select category</option>
                                        <option value="CORE">Core</option>
                                        <option value="SCIENCE">Science</option>
                                        <option value="ARTS">Arts</option>
                                        <option value="COMMERCIAL">Commercial</option>
                                        <option value="VOCATIONAL">Vocational</option>
                                        <option value="LANGUAGE">Language</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assign to Classes
                                    </label>
                                    <select
                                        name="classIds"
                                        className="input w-full h-32"
                                        multiple
                                        defaultValue={selectedSubject?.classIds || []}
                                    >
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name} ({cls.level.replace("_", " ")})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Hold Ctrl/Cmd to select multiple classes
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setSelectedSubject(null); }}
                                        className="btn-secondary"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? "Saving..." : selectedSubject ? "Update Subject" : "Add Subject"}
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
