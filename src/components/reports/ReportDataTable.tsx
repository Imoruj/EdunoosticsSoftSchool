import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { formatScore } from "./scoreFormatting";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Download } from "lucide-react";

interface StudentReportSummary {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classArmName: string;
    average?: number;
    position?: number;
    classSize?: number;
    published: boolean;
    workflowStatus?: string | null;
    adminReviewNote?: string | null;
}

interface ReportDataTableProps {
    students: StudentReportSummary[];
    selectedStudentIds: string[];
    handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelectStudent: (studentId: string) => void;
    onOpenComment: (student: StudentReportSummary) => void;
    isAdmin: boolean;
    isClassTeacher: boolean;
    workflowBusyAction?: string | null;
    commentEnabled: boolean;
    onClassApproveStudent: (student: StudentReportSummary) => void;
    onAdminApproveStudent: (student: StudentReportSummary) => void;
    onAdminRejectStudent: (student: StudentReportSummary) => void;
    loading?: boolean;
    termId?: string;
    classArmId?: string;
}

export default function ReportDataTable({
    students,
    selectedStudentIds,
    handleSelectAll,
    handleSelectStudent,
    onOpenComment,
    isAdmin,
    isClassTeacher,
    workflowBusyAction,
    commentEnabled,
    onClassApproveStudent,
    onAdminApproveStudent,
    onAdminRejectStudent,
    loading = false,
    termId,
    classArmId,
}: ReportDataTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [exportOpen, setExportOpen] = useState(false);

    const handleExport = (fmt: "csv" | "excel") => {
        if (!termId || !classArmId) return;
        const url = `/api/reports/broadsheet/export?termId=${termId}&classArmId=${classArmId}&format=${fmt}`;
        window.open(url, "_blank");
        setExportOpen(false);
    };
    const itemsPerPage = 20;

    // Reset to first page when student list changes (e.g. filter change)
    React.useEffect(() => {
        setCurrentPage(1);
    }, [students]);

    if (students.length === 0) {
        return null;
    }

    const totalStudents = students.length;
    const totalPages = Math.ceil(totalStudents / itemsPerPage);
    const safeCurrentPage = Math.min(currentPage, totalPages || 1);
    
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalStudents);
    const paginatedStudents = students.slice(startIndex, endIndex);

    return (
        <Card className="overflow-hidden">
            {(termId && classArmId) && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{students.length} student(s)</span>
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen(v => !v)}
                            aria-label="Export broadsheet"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1">
                                <button onClick={() => handleExport("csv")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Download CSV</button>
                                <button onClick={() => handleExport("excel")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Download Excel</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    checked={selectedStudentIds.length === students.length && students.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Admission No</TableHead>
                            <TableHead>Average</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    {loading ? (
                        <TableSkeleton rows={8} cols={6} />
                    ) : (
                    <TableBody>
                        {paginatedStudents.map((student) => (
                            <TableRow key={student.id} className="group/row">
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        checked={selectedStudentIds.includes(student.id)}
                                        onChange={() => handleSelectStudent(student.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 dark:text-gray-100">
                                    {student.lastName} {student.firstName}
                                </TableCell>
                                <TableCell className="text-slate-500 dark:text-gray-400">
                                    {student.admissionNumber}
                                </TableCell>
                                <TableCell className="text-slate-500 dark:text-gray-400 font-mono">
                                    {student.average !== undefined ? `${formatScore(student.average)}%` : "-"}
                                </TableCell>
                                <TableCell>
                                    {student.published ? (
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Published
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-300">
                                            Unpublished
                                        </span>
                                    )}
                                    {student.workflowStatus && (
                                        <span className="ml-2 px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {student.workflowStatus.replaceAll("_", " ")}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onOpenComment(student)}
                                            disabled={!commentEnabled}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-transparent hover:border-slate-200 dark:hover:border-gray-600 transition-all disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-gray-600 disabled:hover:bg-transparent"
                                            title="Add/Edit Comments"
                                        >
                                            Comment
                                        </button>

                                        {isClassTeacher && ["COMMENTS_READY", "ADMIN_REJECTED"].includes(student.workflowStatus || "") && (
                                            <button
                                                onClick={() => onClassApproveStudent(student)}
                                                disabled={workflowBusyAction !== null}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                            >
                                                Approve
                                            </button>
                                        )}

                                        {isAdmin && ["CLASS_APPROVED", "ADMIN_REJECTED"].includes(student.workflowStatus || "") && (
                                            <>
                                                <button
                                                    onClick={() => onAdminApproveStudent(student)}
                                                    disabled={workflowBusyAction !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                                >
                                                    Admin Approve
                                                </button>
                                                <button
                                                    onClick={() => onAdminRejectStudent(student)}
                                                    disabled={workflowBusyAction !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {student.adminReviewNote && (
                                        <p className="mt-1 text-xs text-rose-600 text-right">{student.adminReviewNote}</p>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    )}
                </Table>
            </div>

            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-slate-100 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-gray-600 text-sm font-medium rounded-md text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={safeCurrentPage >= totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-gray-600 text-sm font-medium rounded-md text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-slate-700 dark:text-gray-300">
                            Showing <span className="font-medium">{totalStudents > 0 ? startIndex + 1 : 0}</span> to{" "}
                            <span className="font-medium">{endIndex}</span> of{" "}
                            <span className="font-medium">{totalStudents}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(pageNum => {
                                    return pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - safeCurrentPage) <= 1;
                                })
                                .map((pageNum, idx, array) => {
                                    const showEllipsis = idx > 0 && pageNum - array[idx - 1] > 1;
                                    return (
                                        <React.Fragment key={pageNum}>
                                            {showEllipsis && (
                                                <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-slate-700 dark:text-gray-300">
                                                    ...
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                    safeCurrentPage === pageNum
                                                        ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                                                        : "bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage >= totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </Card>
    );
}
