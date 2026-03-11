"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Calendar, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { useAssignments, useSubmissions } from "@/lib/db/hooks";

interface StudentAssignmentsWidgetProps {
    studentId: string;
}

export function StudentAssignmentsWidget({ studentId }: StudentAssignmentsWidgetProps) {
    const { assignments, loading: assignmentsLoading } = useAssignments();
    const { submissions, loading: submissionsLoading } = useSubmissions();

    const loading = assignmentsLoading || submissionsLoading;

    const relevantAssignments = useMemo(() => {
        // Basic sorting and filtering could be expanded if needed
        // Assuming for now assignments returned are ones relevant to the current user structure via hooks
        return [...assignments]
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5); // Just show top 5 upcoming
    }, [assignments]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">My Assignments</h3>
                    <p className="text-sm text-gray-500">Upcoming and active tasks</p>
                </div>
            </div>

            {relevantAssignments.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100 border-dashed">
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-gray-900 font-medium">No active assignments</h4>
                    <p className="text-gray-500 text-sm mt-1">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {relevantAssignments.map((assignment) => {
                        const dueDate = new Date(assignment.dueDate);
                        const isPastDue = Date.now() > dueDate.getTime();
                        const submission = submissions.find(
                            (s) => s.assignmentId === assignment.id && s.studentId === studentId
                        );

                        let statusColor = "bg-gray-100 text-gray-700";
                        let statusText = "Not Started";
                        let StatusIcon = FileText;

                        if (submission) {
                            if (submission.status === "graded") {
                                statusColor = "bg-green-100 text-green-700";
                                statusText = `Graded: ${submission.score}/${assignment.maxScore}`;
                                StatusIcon = CheckCircle2;
                            } else if (submission.status === "submitted" || submission.status === "late") {
                                statusColor = "bg-blue-100 text-blue-700";
                                statusText = "Submitted";
                                StatusIcon = CheckCircle2;
                            } else if (submission.status === "draft") {
                                statusColor = "bg-amber-100 text-amber-700";
                                statusText = "Draft Started";
                            }
                        } else if (isPastDue) {
                            statusColor = "bg-red-100 text-red-700";
                            statusText = "Missed";
                            StatusIcon = AlertTriangle;
                        } else if (dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
                            statusColor = "bg-orange-100 text-orange-700";
                            statusText = "Due Soon";
                            StatusIcon = AlertTriangle;
                        }

                        return (
                            <Link
                                href={`/s/assignments/${assignment.id}`}
                                key={assignment.id}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${statusColor.split(' ')[0]} ${statusColor.split(' ')[1].replace('text-', 'text-opacity-80 text-')}`}>
                                        <StatusIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                                            {assignment.title}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {isPastDue ? 'Due ' : 'Due in '} {formatDistanceToNow(dueDate, { addSuffix: isPastDue })}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span>{assignment.maxScore} pts</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${statusColor}`}>
                                        {statusText}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:border-blue-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
