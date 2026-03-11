"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";

type ReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "BROADCASTED";

interface ScoreReviewWorkflow {
    id: string;
    termId: string;
    classArmId: string;
    subjectId: string;
    status: ReviewStatus;
    rejectionReason: string | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    createdAt: string;
    updatedAt: string;
    classLabel: string;
    subjectName: string;
    subjectTeacherName: string;
    reviewedByName: string | null;
}

interface ReviewStudentScore {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
    total: number;
    adjustedTotal?: number;
    grade: string;
    remark: string;
}

interface ReviewTermOption {
    id: string;
    label: string;
    isCurrent: boolean;
}

interface ReviewClassArmOption {
    id: string;
    label: string;
}

interface ReviewAssessmentType {
    id: string;
    name: string;
    maxScore: number;
    order: number;
}

interface ReviewAssessmentColumn {
    id: string;
    label: string;
    maxScore: number;
    field: "ca1" | "ca2" | "ca3" | "exam";
}

interface ScoreReviewDeskProps {
    terms: ReviewTermOption[];
    classArms: ReviewClassArmOption[];
    defaultTermId: string | null;
    assessmentTypes: ReviewAssessmentType[];
}

function formatDateTime(value?: string | null) {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusMeta(status: ReviewStatus) {
    if (status === "PENDING_REVIEW") {
        return {
            label: "Pending Review",
            className: "bg-amber-100 text-amber-800 border border-amber-200",
        };
    }
    if (status === "APPROVED") {
        return {
            label: "Approved",
            className: "bg-green-100 text-green-800 border border-green-200",
        };
    }
    if (status === "REJECTED") {
        return {
            label: "Rejected",
            className: "bg-red-100 text-red-800 border border-red-200",
        };
    }
    return {
        label: "Broadcasted",
        className: "bg-blue-100 text-blue-800 border border-blue-200",
    };
}

export default function ScoreReviewDesk({
    terms,
    classArms,
    defaultTermId,
    assessmentTypes,
}: ScoreReviewDeskProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialQueryRef = useRef<{
        workflowId: string | null;
        classArmId: string | null;
        subjectId: string | null;
        termId: string | null;
    } | null>(null);

    if (!initialQueryRef.current) {
        initialQueryRef.current = {
            workflowId: searchParams.get("workflowId"),
            classArmId: searchParams.get("classArmId"),
            subjectId: searchParams.get("subjectId"),
            termId: searchParams.get("termId"),
        };
    }

    const [selectedTermId, setSelectedTermId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("all");
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

    const [workflows, setWorkflows] = useState<ScoreReviewWorkflow[]>([]);
    const [students, setStudents] = useState<ReviewStudentScore[]>([]);

    const [loadingQueue, setLoadingQueue] = useState(false);
    const [loadingScores, setLoadingScores] = useState(false);
    const [actionLoading, setActionLoading] = useState<null | "approve" | "reject">(null);
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectNote, setRejectNote] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const hasTerms = terms.length > 0;
    const hasClassArms = classArms.length > 0;

    useEffect(() => {
        if (selectedTermId) return;
        const initialTermId = initialQueryRef.current?.termId;
        const validInitialTerm = initialTermId && terms.some((term) => term.id === initialTermId);
        const fallbackTerm = defaultTermId && terms.some((term) => term.id === defaultTermId)
            ? defaultTermId
            : (terms[0]?.id || "");
        setSelectedTermId(validInitialTerm ? initialTermId! : fallbackTerm);
    }, [selectedTermId, terms, defaultTermId]);

    useEffect(() => {
        if (selectedClassArmId !== "all") return;
        const initialClassArmId = initialQueryRef.current?.classArmId;
        const validInitialClass = initialClassArmId && classArms.some((arm) => arm.id === initialClassArmId);
        if (validInitialClass) {
            setSelectedClassArmId(initialClassArmId!);
        }
    }, [selectedClassArmId, classArms]);

    const selectedWorkflow = useMemo(
        () => workflows.find((item) => item.id === selectedWorkflowId) || null,
        [workflows, selectedWorkflowId]
    );

    const fetchQueue = useCallback(async () => {
        if (!selectedTermId) return;

        setLoadingQueue(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                termId: selectedTermId,
                status: "PENDING_REVIEW",
            });
            if (selectedClassArmId !== "all") {
                params.set("classArmId", selectedClassArmId);
            }

            const response = await fetch(`/api/scores/review?${params.toString()}`, {
                cache: "no-store",
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "Failed to load score review queue.");
            }

            const payload = await response.json();
            const nextWorkflows: ScoreReviewWorkflow[] = Array.isArray(payload.workflows) ? payload.workflows : [];
            setWorkflows(nextWorkflows);

            setSelectedWorkflowId((prev) => {
                if (prev && nextWorkflows.some((item) => item.id === prev)) {
                    return prev;
                }

                const initialWorkflowId = initialQueryRef.current?.workflowId;
                if (initialWorkflowId && nextWorkflows.some((item) => item.id === initialWorkflowId)) {
                    initialQueryRef.current = {
                        ...initialQueryRef.current!,
                        workflowId: null,
                    };
                    return initialWorkflowId;
                }

                const initialSubjectId = initialQueryRef.current?.subjectId;
                const initialClassArmId = initialQueryRef.current?.classArmId;
                if (initialSubjectId) {
                    const match = nextWorkflows.find(
                        (item) =>
                            item.subjectId === initialSubjectId &&
                            (!initialClassArmId || item.classArmId === initialClassArmId)
                    );
                    if (match) return match.id;
                }

                return nextWorkflows[0]?.id || null;
            });
        } catch (queueError: any) {
            setWorkflows([]);
            setSelectedWorkflowId(null);
            setError(queueError.message || "Failed to load score review queue.");
        } finally {
            setLoadingQueue(false);
        }
    }, [selectedTermId, selectedClassArmId]);

    const fetchScoresForWorkflow = useCallback(async (workflow: ScoreReviewWorkflow | null) => {
        if (!workflow) {
            setStudents([]);
            return;
        }

        setLoadingScores(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                classArmId: workflow.classArmId,
                subjectId: workflow.subjectId,
                termId: workflow.termId,
            });
            const response = await fetch(`/api/scores?${params.toString()}`, {
                cache: "no-store",
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "Failed to load submitted scores.");
            }

            const payload = await response.json();
            const nextStudents: ReviewStudentScore[] = Array.isArray(payload.students) ? payload.students : [];
            setStudents(nextStudents);
        } catch (scoreError: any) {
            setStudents([]);
            setError(scoreError.message || "Failed to load submitted scores.");
        } finally {
            setLoadingScores(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    useEffect(() => {
        fetchScoresForWorkflow(selectedWorkflow);
    }, [selectedWorkflow, fetchScoresForWorkflow]);

    useEffect(() => {
        if (!selectedTermId) return;
        const params = new URLSearchParams();
        if (selectedTermId) params.set("termId", selectedTermId);
        if (selectedClassArmId !== "all") params.set("classArmId", selectedClassArmId);
        if (selectedWorkflow) {
            params.set("workflowId", selectedWorkflow.id);
            params.set("subjectId", selectedWorkflow.subjectId);
        }
        const query = params.toString();
        router.replace(
            query ? `/dashboard/score-reviews?${query}` : "/dashboard/score-reviews",
            { scroll: false }
        );
    }, [router, selectedTermId, selectedClassArmId, selectedWorkflow]);

    const classAverage = useMemo(() => {
        if (students.length === 0) return "0.0";
        const sum = students.reduce((acc, item) => acc + Number(item.adjustedTotal ?? item.total ?? 0), 0);
        return (sum / students.length).toFixed(1);
    }, [students]);

    const assessmentColumns = useMemo<ReviewAssessmentColumn[]>(() => {
        const sortedTypes = [...assessmentTypes].sort((a, b) => a.order - b.order);
        const columns: ReviewAssessmentColumn[] = [];
        let caCount = 0;
        let examAdded = false;

        for (const type of sortedTypes) {
            const isExamType = type.name.toLowerCase().includes("exam");
            if (isExamType) {
                if (!examAdded) {
                    columns.push({
                        id: type.id,
                        label: type.name,
                        maxScore: type.maxScore,
                        field: "exam",
                    });
                    examAdded = true;
                }
                continue;
            }

            let field: "ca1" | "ca2" | "ca3" | null = null;
            if (caCount === 0) field = "ca1";
            else if (caCount === 1) field = "ca2";
            else if (caCount === 2) field = "ca3";

            if (field) {
                columns.push({
                    id: type.id,
                    label: type.name,
                    maxScore: type.maxScore,
                    field,
                });
            }
            caCount += 1;
        }

        return columns;
    }, [assessmentTypes]);

    const submitReviewAction = useCallback(
        async (action: "approve" | "reject") => {
            if (!selectedWorkflow) return;

            if (action === "reject" && !rejectNote.trim()) {
                setError("Provide a rejection note before rejecting this submission.");
                return;
            }

            setActionLoading(action);
            setError(null);
            setSuccess(null);

            try {
                const response = await fetch("/api/scores/workflow", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        classArmId: selectedWorkflow.classArmId,
                        subjectId: selectedWorkflow.subjectId,
                        termId: selectedWorkflow.termId,
                        action,
                        ...(action === "reject" ? { note: rejectNote.trim() } : {}),
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Failed to update score workflow.");
                }

                setSuccess(payload.message || (action === "approve" ? "Scores approved." : "Scores rejected."));
                setRejectNote("");
                setShowRejectBox(false);
                await fetchQueue();
            } catch (actionError: any) {
                setError(actionError.message || "Failed to update score workflow.");
            } finally {
                setActionLoading(null);
            }
        },
        [selectedWorkflow, rejectNote, fetchQueue]
    );

    if (!hasTerms) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900">Score Review Desk</h1>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    No academic term found. Configure a term first before reviewing scores.
                </div>
            </div>
        );
    }

    if (!hasClassArms) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900">Score Review Desk</h1>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    No class assignment found for this account. Assign a class teacher before reviewing scores.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Score Review Desk</h1>
                <p className="mt-1 text-gray-600">
                    Review submitted subject scores without mixing them with normal score entry selections.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="review-term" className="mb-2 block text-sm font-medium text-gray-700">
                        Term
                    </label>
                    <select
                        id="review-term"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={selectedTermId}
                        onChange={(event) => setSelectedTermId(event.target.value)}
                    >
                        {terms.map((term) => (
                            <option key={term.id} value={term.id}>
                                {term.label}{term.isCurrent ? " (Current)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="review-class-arm" className="mb-2 block text-sm font-medium text-gray-700">
                        Class Arm
                    </label>
                    <select
                        id="review-class-arm"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={selectedClassArmId}
                        onChange={(event) => setSelectedClassArmId(event.target.value)}
                    >
                        <option value="all">All Assigned Classes</option>
                        {classArms.map((classArm) => (
                            <option key={classArm.id} value={classArm.id}>
                                {classArm.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                    {success}
                </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Pending Subject Submissions</h2>
                        <p className="text-sm text-gray-500">
                            Click a subject submission to inspect scores and approve or reject.
                        </p>
                    </div>
                    <button
                        onClick={fetchQueue}
                        disabled={loadingQueue}
                        className={`rounded-lg px-3 py-2 text-sm font-medium ${loadingQueue
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                            }`}
                    >
                        {loadingQueue ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {loadingQueue ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="px-5 py-10 text-center text-gray-500">
                        No pending submissions found for the selected filters.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Submitted By</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workflows.map((workflow) => {
                                const meta = statusMeta(workflow.status);
                                const isSelected = workflow.id === selectedWorkflowId;
                                return (
                                    <TableRow
                                        key={workflow.id}
                                        onClick={() => setSelectedWorkflowId(workflow.id)}
                                        className={`cursor-pointer ${isSelected ? "bg-primary-50" : ""}`}
                                    >
                                        <TableCell className="font-medium text-gray-900">{workflow.subjectName}</TableCell>
                                        <TableCell className="text-gray-600">{workflow.classLabel}</TableCell>
                                        <TableCell className="text-gray-600">{workflow.subjectTeacherName}</TableCell>
                                        <TableCell className="text-gray-500">{formatDateTime(workflow.updatedAt)}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
                                                {meta.label}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {selectedWorkflow && (
                <div className="rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {selectedWorkflow.subjectName} - {selectedWorkflow.classLabel}
                            </h2>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta(selectedWorkflow.status).className}`}>
                                {statusMeta(selectedWorkflow.status).label}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Submitted by {selectedWorkflow.subjectTeacherName} on {formatDateTime(selectedWorkflow.createdAt)}
                        </p>
                        {selectedWorkflow.rejectionReason && (
                            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                Rejection reason: {selectedWorkflow.rejectionReason}
                            </p>
                        )}
                    </div>

                    <div className="border-b border-gray-200 px-5 py-4">
                        <div className="text-sm text-gray-600">
                            Class average: <span className="font-semibold text-gray-900">{classAverage}</span>
                        </div>
                    </div>

                    <div className="px-5 py-4">
                        {loadingScores ? (
                            <div className="flex justify-center py-10">
                                <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary-600" />
                            </div>
                        ) : assessmentColumns.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                No active assessment columns are configured by admin for this school.
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">No score rows found for this submission.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>S/N</TableHead>
                                        <TableHead>Student</TableHead>
                                        {assessmentColumns.map((column) => (
                                            <TableHead key={column.id} className="text-center">
                                                {column.label} ({column.maxScore})
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">Grade</TableHead>
                                        <TableHead>Remark</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student, index) => (
                                        <TableRow key={student.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">
                                                    {student.lastName} {student.firstName}
                                                </div>
                                                <div className="text-xs text-gray-500">{student.admissionNumber}</div>
                                            </TableCell>
                                            {assessmentColumns.map((column) => (
                                                <TableCell key={`${student.id}-${column.id}`} className="text-center">
                                                    {Number((student as any)[column.field] ?? 0)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-semibold">
                                                {student.adjustedTotal ?? student.total}
                                            </TableCell>
                                            <TableCell className="text-center">{student.grade || "-"}</TableCell>
                                            <TableCell>{student.remark || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
                        {showRejectBox && (
                            <div className="w-full md:w-auto md:min-w-[360px]">
                                <Input
                                    value={rejectNote}
                                    onChange={(event) => setRejectNote(event.target.value)}
                                    placeholder="State exactly why this submission is rejected..."
                                    className="text-sm"
                                />
                            </div>
                        )}

                        {selectedWorkflow.status === "PENDING_REVIEW" && (
                            <>
                                {showRejectBox ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowRejectBox(false);
                                                setRejectNote("");
                                            }}
                                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => submitReviewAction("reject")}
                                            disabled={actionLoading !== null || !rejectNote.trim()}
                                            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${actionLoading !== null || !rejectNote.trim()
                                                    ? "cursor-not-allowed bg-red-300"
                                                    : "bg-red-600 hover:bg-red-700"
                                                }`}
                                        >
                                            {actionLoading === "reject" ? "Rejecting..." : "Submit Rejection"}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowRejectBox(true)}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                    >
                                        Reject
                                    </button>
                                )}

                                <button
                                    onClick={() => submitReviewAction("approve")}
                                    disabled={actionLoading !== null}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${actionLoading !== null
                                            ? "cursor-not-allowed bg-green-300"
                                            : "bg-green-600 hover:bg-green-700"
                                        }`}
                                >
                                    {actionLoading === "approve" ? "Approving..." : "Approve"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
