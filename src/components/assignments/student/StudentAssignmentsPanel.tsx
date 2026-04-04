"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, CheckCircle2, ChevronRight, Clock3, FileWarning, PenSquare } from "lucide-react";
import { useAssignments, useSubmissions } from "@/lib/db/hooks";
import type { Assignment, AssignmentSubmission } from "@/lib/db/types";

interface StudentAssignmentsPanelProps {
    studentProfileId: string;
    studentUserId: string;
    studentClassArmId?: string | null;
    limit?: number;
    showViewAll?: boolean;
    title?: string;
    description?: string;
    emptyTitle?: string;
    emptyDescription?: string;
}

function isAssignmentAssignedToStudent(
    assignment: Assignment,
    studentProfileId: string,
    studentUserId: string,
    studentClassArmId?: string | null
) {
    if (!assignment.isPublished) {
        return false;
    }

    if (
        assignment.assignedTo.includes("all") ||
        assignment.assignedTo.includes(studentProfileId) ||
        assignment.assignedTo.includes(studentUserId)
    ) {
        return true;
    }

    // Backward compatibility for older assignments created before explicit student targeting.
    if (assignment.assignedTo.length === 0) {
        if (!studentClassArmId) {
            return true;
        }

        return assignment.classArmIds.includes(studentClassArmId);
    }

    return false;
}

function getAssignmentStatus(
    assignment: Assignment,
    submission?: AssignmentSubmission
) {
    if (submission?.status === "graded") {
        return {
            label: "Graded",
            className: "bg-green-100 text-green-700",
        };
    }

    if (submission?.status === "submitted") {
        return {
            label: "Submitted",
            className: "bg-blue-100 text-blue-700",
        };
    }

    if (submission?.status === "late") {
        return {
            label: "Late Submission",
            className: "bg-orange-100 text-orange-700",
        };
    }

    if (submission?.status === "draft") {
        return {
            label: "Draft Saved",
            className: "bg-slate-100 text-slate-700",
        };
    }

    if (Date.now() > assignment.dueDate && !assignment.allowLateSubmission) {
        return {
            label: "Closed",
            className: "bg-red-100 text-red-700",
        };
    }

    return {
        label: "Open",
        className: "bg-violet-100 text-violet-700",
    };
}

export function StudentAssignmentsPanel({
    studentProfileId,
    studentUserId,
    studentClassArmId,
    limit,
    showViewAll = false,
    title = "Assigned Assignments",
    description = "Assignments given to you by your teachers.",
    emptyTitle = "No assignments yet",
    emptyDescription = "Published assignments assigned to you will appear here.",
}: StudentAssignmentsPanelProps) {
    const { assignments, loading, error } = useAssignments();
    const { submissions, loading: submissionsLoading } = useSubmissions();

    const submissionByAssignmentId = useMemo(() => {
        return submissions
            .filter((submission) => submission.studentId === studentUserId)
            .reduce<Record<string, AssignmentSubmission>>((acc, submission) => {
                acc[submission.assignmentId] = submission;
                return acc;
            }, {});
    }, [submissions, studentUserId]);

    const visibleAssignments = useMemo(() => {
        const filteredAssignments = assignments
            .filter((assignment) => isAssignmentAssignedToStudent(assignment, studentProfileId, studentUserId, studentClassArmId))
            .sort((a, b) => a.dueDate - b.dueDate);

        return typeof limit === "number" ? filteredAssignments.slice(0, limit) : filteredAssignments;
    }, [assignments, studentProfileId, studentUserId, studentClassArmId, limit]);

    if (loading || submissionsLoading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="animate-pulse space-y-4">
                    <div className="h-5 w-48 rounded bg-gray-200" />
                    <div className="h-20 rounded-xl bg-gray-100" />
                    <div className="h-20 rounded-xl bg-gray-100" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
                Failed to load assigned assignments: {error.message}
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                </div>
                {showViewAll && visibleAssignments.length > 0 && (
                    <Link
                        href="/dashboard/assignments"
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        View all
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                )}
            </div>

            {visibleAssignments.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                    <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                    <h4 className="mt-3 text-base font-semibold text-gray-900">{emptyTitle}</h4>
                    <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    {visibleAssignments.map((assignment) => {
                        const submission = submissionByAssignmentId[assignment.id];
                        const status = getAssignmentStatus(assignment, submission);

                        return (
                            <Link
                                key={assignment.id}
                                href={`/dashboard/assignments/${assignment.id}`}
                                className="group flex items-start justify-between gap-4 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="truncate text-base font-semibold text-gray-900">
                                            {assignment.title}
                                        </h4>
                                        {submission?.status === "graded" && (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                        )}
                                    </div>

                                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                        {assignment.description || assignment.instructions}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            Due {formatDistanceToNow(assignment.dueDate, { addSuffix: true })}
                                        </span>
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                                            Max {assignment.maxScore}
                                        </span>
                                        <span className={`rounded-full px-2.5 py-1 font-semibold ${status.className}`}>
                                            {status.label}
                                        </span>
                                        {assignment.attachments.length > 0 && (
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">
                                                {assignment.attachments.length} file{assignment.attachments.length === 1 ? "" : "s"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors group-hover:border-blue-200 group-hover:text-blue-700">
                                    <span className="inline-flex items-center gap-1">
                                        <PenSquare className="h-4 w-4" />
                                        Open
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {showViewAll && visibleAssignments.length === 0 && (
                <div className="mt-4 flex justify-end">
                    <Link
                        href="/dashboard/assignments"
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        Open assignments page
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
            )}
        </section>
    );
}
