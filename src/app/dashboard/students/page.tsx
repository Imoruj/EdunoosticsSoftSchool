"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Types for student data
interface ClassArm {
    id: string;
    armName: string;
    class: {
        id: string;
        name: string;
    };
}

interface Student {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    gender: string;
    dateOfBirth?: string;
    classArm: ClassArm;
    parentPhone?: string;
    parentEmail?: string;
    parentName?: string;
    stateOfOrigin?: string;
    address?: string;
    isActive: boolean;
}

interface ClassOption {
    id: string;
    name: string;
    arms: { id: string; armName: string }[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function StudentsPage() {
    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClassArm, setSelectedClassArm] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const router = useRouter();

    // UI state
    const [showAddModal, setShowAddModal] = useState(false);
    const [nextAdmissionNumber, setNextAdmissionNumber] = useState("");
    const [loadingAdmissionNumber, setLoadingAdmissionNumber] = useState(false);
    const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Fetch students from API
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });
            if (searchQuery) params.append("search", searchQuery);
            if (selectedClassArm) params.append("classArmId", selectedClassArm);
            if (selectedGender) params.append("gender", selectedGender);

            const response = await fetch(`/api/students?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch students");

            const data = await response.json();
            setStudents(data.students || []);
            setPagination(data.pagination || pagination);
        } catch (err: any) {
            setError(err.message || "Failed to load students");
            // Keep showing existing data if available
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, searchQuery, selectedClassArm, selectedGender]);

    // Fetch classes for filter dropdown
    const fetchClasses = async () => {
        try {
            const response = await fetch("/api/classes");
            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes || []);
            }
        } catch (err) {
            console.error("Failed to fetch classes:", err);
        }
    };

    // Initial data load
    useEffect(() => {
        fetchClasses();
    }, []);

    // Fetch students when filters change (with debounce for search)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, searchQuery ? 300 : 0); // Debounce search

        return () => clearTimeout(timer);
    }, [fetchStudents, searchQuery]);

    // Get all class arms as flat list for dropdown
    const classArmOptions = classes.flatMap(cls =>
        cls.arms.map(arm => ({
            id: arm.id,
            name: `${cls.name} ${arm.armName}`,
        }))
    );

    // Calculate stats
    const stats = {
        total: pagination.total,
        female: students.filter(s => s.gender === "FEMALE").length,
        male: students.filter(s => s.gender === "MALE").length,
        active: students.filter(s => s.isActive).length,
    };

    // Download CSV Template function
    const downloadCSVTemplate = () => {
        const headers = [
            "First Name",
            "Last Name",
            "Other Names",
            "Admission Number",
            "Gender (MALE/FEMALE)",
            "Date of Birth (YYYY-MM-DD)",
            "Class",
            "State of Origin",
            "Religion",
            "Blood Group",
            "Parent Name",
            "Parent Phone",
            "Parent Email",
            "Address"
        ];

        // Sample row to guide users
        const sampleRow = [
            "John",
            "Doe",
            "Michael",
            "SCH/2024/001",
            "MALE",
            "2012-05-15",
            "Primary 1A",
            "Lagos",
            "Christianity",
            "O+",
            "Mr. John Doe Sr.",
            "08012345678",
            "parent@email.com",
            "123 Sample Street, Lagos"
        ];

        const csvContent = [
            headers.join(","),
            sampleRow.join(","),
            // Empty rows for users to fill
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "student_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data: any = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            otherNames: formData.get("otherNames"),
            gender: formData.get("gender"),
            dateOfBirth: formData.get("dateOfBirth"),
            classArmId: formData.get("classArmId"),
            stateOfOrigin: formData.get("stateOfOrigin"),
            address: formData.get("address"),
            parentName: formData.get("parentName"),
            parentPhone: formData.get("parentPhone"),
            parentEmail: formData.get("parentEmail"),
        };

        if (!selectedStudent) {
            data.admissionNumber = formData.get("admissionNumber") || nextAdmissionNumber;
            data.autoGenerate = autoGenerateEnabled;
        } else {
            data.id = selectedStudent.id;
        }

        try {
            const url = "/api/students";
            const method = selectedStudent ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || `Failed to ${selectedStudent ? 'update' : 'add'} student`);
            }

            setShowAddModal(false);
            setSelectedStudent(null);
            fetchStudents(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async (studentId: string) => {
        if (!studentId) return;

        try {
            const response = await fetch(`/api/students?id=${studentId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setShowDeleteConfirm(null);
                fetchStudents();
            } else {
                alert("Failed to delete student");
            }
        } catch (err) {
            console.error("Error deleting student:", err);
            alert("Error deleting student");
        }
    };

    const handleDelete = (studentId: string) => {
        setOpenActionMenu(null);
        setShowDeleteConfirm(studentId);
    };

    const handleEdit = (studentId: string) => {
        setOpenActionMenu(null);
        const student = students.find(s => s.id === studentId);
        if (student) {
            setSelectedStudent(student);
            setShowAddModal(true);
            setAutoGenerateEnabled(false); // Disable auto-gen for edits usually
            setNextAdmissionNumber(student.admissionNumber);
        }
    };

    const handleToggleStatus = async (studentId: string) => {
        setOpenActionMenu(null);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        try {
            const response = await fetch("/api/students", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: student.id,
                    isActive: !student.isActive
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update status");
            }

            fetchStudents(); // Refresh list
        } catch (err: any) {
            console.error("Error toggling status:", err);
            // Optionally set error state here or show toast
            alert("Error updating student status");
        }
    };

    const handleViewReports = (studentId: string) => {
        setOpenActionMenu(null);
        router.push(`/dashboard/reports?student=${studentId}`);
    };

    const fetchNextAdmissionNumber = async () => {
        setLoadingAdmissionNumber(true);
        try {
            const response = await fetch("/api/students?getNextAdmissionNumber=true");
            if (response.ok) {
                const data = await response.json();
                setNextAdmissionNumber(data.nextAdmissionNumber);
            }
        } catch (error) {
            console.error("Failed to fetch next admission number:", error);
        } finally {
            setLoadingAdmissionNumber(false);
        }
    };

    // Fetch next admission number when modal opens
    useEffect(() => {
        if (showAddModal && autoGenerateEnabled) {
            fetchNextAdmissionNumber();
        }
    }, [showAddModal, autoGenerateEnabled]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                    <p className="text-gray-500 mt-1">Manage student records and information</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSVTemplate}
                        className="btn-secondary flex items-center gap-2"
                        title="Download CSV template with required columns"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import CSV
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Student
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Students</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.female}
                            </p>
                            <p className="text-sm text-gray-500">Female</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.male}
                            </p>
                            <p className="text-sm text-gray-500">Male</p>
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
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.active}
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
                            placeholder="Search by name or admission number..."
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

                    {/* Class Filter */}
                    <select
                        value={selectedClassArm}
                        onChange={(e) => setSelectedClassArm(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="">All Classes</option>
                        {classArmOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>

                    {/* Gender Filter */}
                    <select
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="input w-full md:w-36"
                    >
                        <option value="">All Genders</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Admission No.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Class
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gender
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Parent Phone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">Loading students...</p>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="text-gray-500">No students found</p>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Try adjusting your search or filter criteria
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${student.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-500"
                                                    }`}>
                                                    {student.firstName[0]}{student.lastName[0]}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {student.firstName} {student.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 font-mono">
                                                {student.admissionNumber}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                                {student.classArm.class.name} {student.classArm.armName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === "FEMALE"
                                                ? "bg-pink-100 text-pink-800"
                                                : "bg-blue-100 text-blue-800"
                                                }`}>
                                                {student.gender === "FEMALE" ? "Female" : "Male"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {student.parentPhone}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}>
                                                {student.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/students/${student.id}`}
                                                    className="text-primary-600 hover:text-primary-900"
                                                >
                                                    View
                                                </Link>
                                                <div className="relative">



                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setMenuPosition({
                                                                top: rect.bottom,
                                                                left: rect.right - 192 // Align to right, 192px is w-48
                                                            });
                                                            setOpenActionMenu(openActionMenu === student.id ? null : student.id);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Actions Dropdown (Portal) */}
                {openActionMenu && (() => {
                    const student = students.find(s => s.id === openActionMenu);
                    if (!student) return null;

                    // Safe check for document/body
                    if (typeof document === 'undefined') return null;

                    return createPortal(
                        <>
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setOpenActionMenu(null)}
                            />
                            <div
                                className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] py-1 w-48"
                                style={{ top: menuPosition.top, left: menuPosition.left }}
                            >
                                <button
                                    onClick={() => handleEdit(student.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Student
                                </button>
                                <button
                                    onClick={() => handleViewReports(student.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Reports
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(student.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    {student.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={() => handleDelete(student.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Student
                                </button>
                            </div>
                        </>,
                        document.body
                    );
                })()}

                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                                <span className="font-medium">{pagination.total}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                    disabled={pagination.page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    // Simple pagination logic to show current page and surrounding
                                    let pageNum = i + 1;
                                    if (pagination.totalPages > 5 && pagination.page > 3) {
                                        pageNum = pagination.page - 2 + i;
                                        if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNum
                                                ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => { setShowAddModal(false); setSelectedStudent(null); }} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">{selectedStudent ? "Edit Student" : "Add New Student"}</h3>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedStudent(null); }}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form key={selectedStudent?.id || "new"} onSubmit={handleAddStudent} className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                First Name *
                                            </label>
                                            <input name="firstName" defaultValue={selectedStudent?.firstName} type="text" className="input w-full" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Last Name *
                                            </label>
                                            <input name="lastName" defaultValue={selectedStudent?.lastName} type="text" className="input w-full" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Other Names
                                            </label>
                                            <input name="otherNames" defaultValue={selectedStudent?.otherNames || ""} type="text" className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Gender *
                                            </label>
                                            <select name="gender" defaultValue={selectedStudent?.gender} className="input w-full" required>
                                                <option value="">Select Gender</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Date of Birth *
                                            </label>
                                            <input
                                                name="dateOfBirth"
                                                defaultValue={selectedStudent?.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toISOString().split('T')[0] : ''}
                                                type="date"
                                                className="input w-full"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Admission Number *
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    name="admissionNumber"
                                                    type="text"
                                                    className="input w-full bg-gray-50"
                                                    value={nextAdmissionNumber}
                                                    readOnly={autoGenerateEnabled || !!selectedStudent}
                                                    onChange={(e) => setNextAdmissionNumber(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={fetchNextAdmissionNumber}
                                                    disabled={loadingAdmissionNumber || !autoGenerateEnabled}
                                                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg border border-gray-200"
                                                    title="Refresh Admission Number"
                                                >
                                                    <svg className={`w-5 h-5 ${loadingAdmissionNumber ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between">
                                                {!selectedStudent && (
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={autoGenerateEnabled}
                                                            onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
                                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span className="text-xs text-gray-500">Auto-generate</span>
                                                    </label>
                                                )}
                                                {autoGenerateEnabled && nextAdmissionNumber && !selectedStudent && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Next: {nextAdmissionNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Academic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Class *
                                            </label>
                                            <select name="classArmId" defaultValue={selectedStudent?.classArm.id} className="input w-full" required>
                                                <option value="">Select Class</option>
                                                {classArmOptions.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Info */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Parent/Guardian Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Parent Name *
                                            </label>
                                            <input name="parentName" defaultValue={selectedStudent?.parentName || ""} type="text" className="input w-full" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Phone Number *
                                            </label>
                                            <input name="parentPhone" defaultValue={selectedStudent?.parentPhone || ""} type="tel" className="input w-full" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email Address
                                            </label>
                                            <input name="parentEmail" defaultValue={selectedStudent?.parentEmail || ""} type="email" className="input w-full" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Home Address
                                            </label>
                                            <textarea name="address" defaultValue={selectedStudent?.address || ""} rows={3} className="input w-full"></textarea>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                State of Origin
                                            </label>
                                            <input name="stateOfOrigin" defaultValue={selectedStudent?.stateOfOrigin || ""} type="text" className="input w-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setSelectedStudent(null); }}
                                        className="btn-secondary"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? "Saving..." : (selectedStudent ? "Update Student" : "Add Student")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                            Delete Student?
                        </h3>
                        <p className="text-gray-500 text-center mb-6">
                            This action cannot be undone. All data associated with this student including scores, attendance, and report cards will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmDelete(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete Student
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
