"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data
const mockClasses = ["All Classes", "Primary 1A", "Primary 1B", "Primary 2A", "JSS 1A", "SSS 1A"];

const mockReportCards = [
    {
        id: "1",
        student: { firstName: "Adaeze", lastName: "Okonkwo", admissionNumber: "SCH/2024/001" },
        classArm: "Primary 1A",
        average: 78.5,
        position: 1,
        classSize: 35,
        isPublished: true,
        grade: "A1",
    },
    {
        id: "2",
        student: { firstName: "Chinedu", lastName: "Eze", admissionNumber: "SCH/2024/002" },
        classArm: "Primary 1A",
        average: 72.3,
        position: 2,
        classSize: 35,
        isPublished: true,
        grade: "B2",
    },
    {
        id: "3",
        student: { firstName: "Oluwaseun", lastName: "Adeleke", admissionNumber: "SCH/2024/004" },
        classArm: "Primary 1A",
        average: 65.8,
        position: 3,
        classSize: 35,
        isPublished: false,
        grade: "B3",
    },
    {
        id: "4",
        student: { firstName: "Fatima", lastName: "Ibrahim", admissionNumber: "SCH/2024/003" },
        classArm: "Primary 1B",
        average: 58.2,
        position: 5,
        classSize: 32,
        isPublished: false,
        grade: "C5",
    },
    {
        id: "5",
        student: { firstName: "Amara", lastName: "Nwosu", admissionNumber: "SCH/2024/005" },
        classArm: "JSS 1A",
        average: 45.1,
        position: 12,
        classSize: 42,
        isPublished: true,
        grade: "D7",
    },
];

function getGradeColor(grade: string): string {
    const colors: Record<string, string> = {
        A1: "bg-green-100 text-green-800",
        B2: "bg-blue-100 text-blue-800",
        B3: "bg-blue-100 text-blue-800",
        C4: "bg-yellow-100 text-yellow-800",
        C5: "bg-yellow-100 text-yellow-800",
        C6: "bg-yellow-100 text-yellow-800",
        D7: "bg-orange-100 text-orange-800",
        E8: "bg-orange-100 text-orange-800",
        F9: "bg-red-100 text-red-800",
    };
    return colors[grade] || "bg-gray-100 text-gray-800";
}

export default function ReportCardsPage() {
    const [selectedClass, setSelectedClass] = useState("All Classes");
    const [publishFilter, setPublishFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredReports = mockReportCards.filter((report) => {
        const matchesClass =
            selectedClass === "All Classes" || report.classArm === selectedClass;
        const matchesPublish =
            publishFilter === "All" ||
            (publishFilter === "Published" && report.isPublished) ||
            (publishFilter === "Draft" && !report.isPublished);
        const matchesSearch =
            report.student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesPublish && matchesSearch;
    });

    const publishedCount = mockReportCards.filter((r) => r.isPublished).length;
    const draftCount = mockReportCards.filter((r) => !r.isPublished).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
                    <p className="text-gray-500 mt-1">Generate and manage student report cards</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download All
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Reports
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{mockReportCards.length}</p>
                            <p className="text-sm text-gray-500">Total Reports</p>
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
                            <p className="text-2xl font-bold text-gray-900">{publishedCount}</p>
                            <p className="text-sm text-gray-500">Published</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{draftCount}</p>
                            <p className="text-sm text-gray-500">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {(mockReportCards.reduce((acc, r) => acc + r.average, 0) / mockReportCards.length).toFixed(1)}
                            </p>
                            <p className="text-sm text-gray-500">Avg. Score</p>
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
                            placeholder="Search students..."
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
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        {mockClasses.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                    <select
                        value={publishFilter}
                        onChange={(e) => setPublishFilter(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="All">All Status</option>
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                    </select>
                </div>
            </div>

            {/* Reports Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Student
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Class
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Average
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Grade
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Position
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {report.student.lastName} {report.student.firstName}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">
                                                {report.student.admissionNumber}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                            {report.classArm}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-lg font-bold text-gray-900">{report.average.toFixed(1)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getGradeColor(report.grade)}`}>
                                            {report.grade}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {report.position}<sup>{getOrdinal(report.position)}</sup>
                                        </span>
                                        <span className="text-xs text-gray-500"> / {report.classSize}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.isPublished
                                                ? "bg-green-100 text-green-800"
                                                : "bg-amber-100 text-amber-800"
                                            }`}>
                                            {report.isPublished ? "Published" : "Draft"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/dashboard/reports/${report.id}`}
                                                className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                                            >
                                                View
                                            </Link>
                                            <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                                                Download
                                            </button>
                                            {!report.isPublished && (
                                                <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                                                    Publish
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
