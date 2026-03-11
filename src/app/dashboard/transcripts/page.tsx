"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import TranscriptPreviewModal from "@/components/transcripts/TranscriptPreviewModal";
import { TranscriptData } from "@/components/transcripts/types";

interface StudentResult {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    className: string;
    isActive: boolean;
    photoUrl?: string;
}

export default function TranscriptsPage() {
    const { data: sessionData } = useSession();
    const roles: string[] = (sessionData?.user as any)?.roles || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<StudentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/students?search=${encodeURIComponent(searchQuery)}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                const list = (data.students || []).map((s: any) => ({
                    id: s.id,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    admissionNumber: s.admissionNumber,
                    className: s.classArm ? `${s.classArm.class.name} ${s.classArm.armName}` : "Unassigned",
                    isActive: s.isActive,
                    photoUrl: s.photoUrl,
                }));
                setStudents(list);
                if (list.length === 0) {
                    setError("No students found matching your search.");
                }
            } else {
                setError("Failed to search students.");
            }
        } catch (err) {
            console.error("Search error:", err);
            setError("An error occurred while searching.");
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (studentId: string) => {
        setSelectedStudentId(studentId);
        setLoadingPreview(true);
        setError("");
        try {
            const res = await fetch("/api/transcripts/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });
            if (res.ok) {
                const data = await res.json();
                setTranscriptData(data);
                setShowPreview(true);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to generate transcript data.");
            }
        } catch (err) {
            console.error("Preview error:", err);
            setError("Failed to load transcript preview.");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleDownload = async (studentId: string) => {
        setDownloadingId(studentId);
        setDownloading(true);
        setError("");
        try {
            const res = await fetch(`/api/transcripts/generate?studentId=${studentId}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Failed to generate transcript" }));
                throw new Error(err.error);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Transcript_${studentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error("Download error:", err);
            setError(err.message || "Failed to download transcript.");
        } finally {
            setDownloading(false);
            setDownloadingId(null);
        }
    };

    const handleModalDownload = () => {
        if (selectedStudentId) {
            handleDownload(selectedStudentId);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Transcripts</h1>
                <p className="text-gray-500 mt-1">Generate academic transcripts showing complete student records across all sessions</p>
            </div>

            {/* Search Card */}
            <div className="card p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Student
                </label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="input pl-10 w-full"
                            placeholder="Enter student name or admission number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !searchQuery.trim()}
                        className="btn-primary px-6"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Searching...
                            </div>
                        ) : (
                            "Search"
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Results Table */}
            {students.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm text-gray-600">
                            Found <span className="font-semibold">{students.length}</span> student{students.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Class</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                                                {student.lastName[0]}{student.firstName[0]}
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {student.lastName} {student.firstName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{student.admissionNumber}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{student.className}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            student.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                        }`}>
                                            {student.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => handlePreview(student.id)}
                                                disabled={loadingPreview && selectedStudentId === student.id}
                                                className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
                                            >
                                                {loadingPreview && selectedStudentId === student.id ? (
                                                    <span className="flex items-center gap-1">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                                                        Loading...
                                                    </span>
                                                ) : (
                                                    "Preview"
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDownload(student.id)}
                                                disabled={downloading && downloadingId === student.id}
                                                className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                                            >
                                                {downloading && downloadingId === student.id ? (
                                                    <span className="flex items-center gap-1">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                                        Generating...
                                                    </span>
                                                ) : (
                                                    "Download PDF"
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty state when no search yet */}
            {students.length === 0 && !loading && !error && (
                <div className="card p-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-600 mb-1">Search for a Student</h3>
                    <p className="text-sm text-gray-400">Enter a student name or admission number above to generate their academic transcript</p>
                </div>
            )}

            {/* Preview Modal */}
            <TranscriptPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                data={transcriptData}
                onDownload={handleModalDownload}
                downloading={downloading}
            />
        </div>
    );
}
