import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { formatScore } from "./scoreFormatting";

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
}: ReportDataTableProps) {
    if (students.length === 0) {
        return null;
    }

    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-primary focus:ring-primary"
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
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.id} className="group/row">
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                        checked={selectedStudentIds.includes(student.id)}
                                        onChange={() => handleSelectStudent(student.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">
                                    {student.lastName} {student.firstName}
                                </TableCell>
                                <TableCell className="text-slate-500">
                                    {student.admissionNumber}
                                </TableCell>
                                <TableCell className="text-slate-500 font-mono">
                                    {student.average !== undefined ? `${formatScore(student.average)}%` : "-"}
                                </TableCell>
                                <TableCell>
                                    {student.published ? (
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Published
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                                            title="Add/Edit Comments"
                                        >
                                            Comment
                                        </button>

                                        {isClassTeacher && ["COMMENTS_READY", "ADMIN_REJECTED"].includes(student.workflowStatus || "") && (
                                            <button
                                                onClick={() => onClassApproveStudent(student)}
                                                disabled={workflowBusyAction !== null}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                            >
                                                Approve
                                            </button>
                                        )}

                                        {isAdmin && ["CLASS_APPROVED", "ADMIN_REJECTED"].includes(student.workflowStatus || "") && (
                                            <>
                                                <button
                                                    onClick={() => onAdminApproveStudent(student)}
                                                    disabled={workflowBusyAction !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                                >
                                                    Admin Approve
                                                </button>
                                                <button
                                                    onClick={() => onAdminRejectStudent(student)}
                                                    disabled={workflowBusyAction !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
                </Table>
            </div>
        </Card>
    );
}
