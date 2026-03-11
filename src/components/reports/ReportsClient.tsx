"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import ReportCardPreviewModal from "@/components/reports/ReportCardPreviewModal";
import ReportFilters from "./ReportFilters";
import ReportDataTable from "./ReportDataTable";
import BulkGenerateModal from "./BulkGenerateModal";
import CommentDialog from "./CommentDialog";
import { Card } from "@/components/ui/Card";

import { Session, ClassArm, Term } from "./types";

interface ReportsClientProps {
    initialSessions: Session[];
    initialClasses: ClassArm[];
    sessionIdsByClassArm: Record<string, string[]>;
}

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
    reportCardId?: string | null;
    workflowStatus?: string | null;
    adminReviewNote?: string | null;
    classTeacherComment?: string | null;
    principalComment?: string | null;
    canDownload?: boolean;
    downloadExpiresAt?: string | null;
}

interface ScoreBroadcastStatus {
    subjectId: string;
    subjectName: string;
    status: string;
}

interface ScoreBroadcastSummary {
    expectedSubjects: number;
    broadcastedSubjects: number;
    allBroadcasted: boolean;
    statuses: ScoreBroadcastStatus[];
    pendingSubjects?: ScoreBroadcastStatus[];
}

function formatWorkflowStatusLabel(status?: string | null) {
    if (!status) return "Pending Review";
    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

export default function ReportsClient({
    initialSessions,
    initialClasses,
    sessionIdsByClassArm
}: ReportsClientProps) {
    const { data: sessionData } = useSession();
    const searchParams = useSearchParams();

    // Role-based logic
    const user = sessionData?.user as any;
    const userRoles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin =
        userRoles.includes("SUPER_ADMIN") ||
        userRoles.includes("SCHOOL_ADMIN");
    const isClassTeacher = userRoles.includes("CLASS_TEACHER");
    const restrictToAssignedScope = !isAdmin && isClassTeacher;
    const isParent = user?.loginType === "parent";
    const isStudent = user?.loginType === "student";

    // State
    const [sessions] = useState<Session[]>(initialSessions);
    const [classes] = useState<ClassArm[]>(initialClasses);

    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [reportType, setReportType] = useState<"halfTerm" | "endOfTerm">("endOfTerm");

    const [students, setStudents] = useState<StudentReportSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
    const [selectedStudentForComment, setSelectedStudentForComment] = useState<StudentReportSummary | null>(null);
    const [classWorkflow, setClassWorkflow] = useState<any | null>(null);
    const [scoreSummary, setScoreSummary] = useState<ScoreBroadcastSummary | null>(null);
    const [workflowBusyAction, setWorkflowBusyAction] = useState<string | null>(null);
    const [rejectingStudent, setRejectingStudent] = useState<StudentReportSummary | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [publishedReports, setPublishedReports] = useState<any[]>([]);
    const [loadingPublishedReports, setLoadingPublishedReports] = useState(false);

    const visibleSessionIds =
        restrictToAssignedScope && selectedClassArmId
            ? (sessionIdsByClassArm[selectedClassArmId] || [])
            : sessions.map((s) => s.id);
    const visibleSessions = sessions.filter((s) => visibleSessionIds.includes(s.id));
    const pendingSubjects: ScoreBroadcastStatus[] =
        scoreSummary?.pendingSubjects ??
        (scoreSummary?.statuses || []).filter((item) => item.status !== "BROADCASTED");

    const refreshReportWorkflow = async (baseStudents?: StudentReportSummary[]) => {
        if (!selectedClassArmId || !selectedTermId) {
            setClassWorkflow(null);
            setScoreSummary(null);
            return;
        }

        const response = await fetch(
            `/api/reports/workflow?classArmId=${selectedClassArmId}&termId=${selectedTermId}&reportType=${reportType}`
        );

        if (!response.ok) {
            setClassWorkflow(null);
            setScoreSummary(null);
            return;
        }

        const data = await response.json();
        setClassWorkflow(data.classWorkflow || null);
        setScoreSummary(data.scoreSummary || null);

        const workflowMap = new Map<string, any>(
            (data.studentWorkflows || []).map((workflow: any) => [workflow.studentId, workflow])
        );

        setStudents((prev) => {
            const source = baseStudents || prev;
            return source.map((student) => {
                const workflow = workflowMap.get(student.id);
                return {
                    ...student,
                    workflowStatus: workflow?.status || null,
                    adminReviewNote: workflow?.adminReviewNote || null,
                    classTeacherComment: workflow?.classTeacherComment || null,
                    principalComment: workflow?.principalComment || null,
                };
            });
        });
    };

    const runWorkflowAction = async (action: string, payload: Record<string, any> = {}) => {
        if (!selectedClassArmId || !selectedTermId) return;

        setWorkflowBusyAction(action);
        try {
            const response = await fetch("/api/reports/workflow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    classArmId: selectedClassArmId,
                    termId: selectedTermId,
                    reportType,
                    ...payload,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Workflow action failed");
            }

            toast.success(data.message || "Workflow updated");
            if (action === "publish_class") {
                setStudents((prev) => prev.map((student) => ({ ...student, published: true })));
            }
            if (action === "unpublish_class") {
                setStudents((prev) => prev.map((student) => ({ ...student, published: false })));
            }
            await refreshReportWorkflow();
        } catch (error: any) {
            toast.error(error.message || "Workflow action failed");
        } finally {
            setWorkflowBusyAction(null);
        }
    };

    // Initial Setup
    useEffect(() => {
        if (isParent || isStudent) return;

        const defaultClassArmId = restrictToAssignedScope ? (classes[0]?.id || "") : "";
        if (defaultClassArmId) {
            setSelectedClassArmId(defaultClassArmId);
        }

        const firstSessionPool =
            restrictToAssignedScope && defaultClassArmId
                ? sessions.filter((s) => (sessionIdsByClassArm[defaultClassArmId] || []).includes(s.id))
                : sessions;

        const defaultSession =
            firstSessionPool.find((s) => s.isCurrent) ||
            firstSessionPool[0];

        if (defaultSession) {
            setSelectedSessionId(defaultSession.id);
            const defaultTerm =
                defaultSession.terms.find((t: Term) => t.isCurrent) ||
                defaultSession.terms[0];
            setSelectedTermId(defaultTerm?.id || "");
        } else {
            setSelectedSessionId("");
            setSelectedTermId("");
        }
    }, [
        isParent,
        isStudent,
        restrictToAssignedScope,
        classes,
        sessions,
        sessionIdsByClassArm
    ]);

    useEffect(() => {
        if (!restrictToAssignedScope || !selectedClassArmId || isParent || isStudent) return;

        const currentSelectedSession = visibleSessions.find((s) => s.id === selectedSessionId);
        if (currentSelectedSession) {
            const termExists = currentSelectedSession.terms.some((t) => t.id === selectedTermId);
            if (!termExists) {
                const defaultTerm =
                    currentSelectedSession.terms.find((t) => t.isCurrent) ||
                    currentSelectedSession.terms[0];
                setSelectedTermId(defaultTerm?.id || "");
            }
            return;
        }

        const nextSession = visibleSessions.find((s) => s.isCurrent) || visibleSessions[0];
        if (!nextSession) {
            setSelectedSessionId("");
            setSelectedTermId("");
            return;
        }

        setSelectedSessionId(nextSession.id);
        const defaultTerm =
            nextSession.terms.find((t) => t.isCurrent) ||
            nextSession.terms[0];
        setSelectedTermId(defaultTerm?.id || "");
    }, [
        restrictToAssignedScope,
        selectedClassArmId,
        selectedSessionId,
        selectedTermId,
        visibleSessions,
        isParent,
        isStudent
    ]);

    // Fetch Students when filters change (for Admin/Teacher)
    useEffect(() => {
        if (isParent || isStudent) return; // parent has own flow

        const fetchStudents = async () => {
            if (!selectedClassArmId || !selectedTermId) {
                setStudents([]);
                setClassWorkflow(null);
                setScoreSummary(null);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/students?classArmId=${selectedClassArmId}&termId=${selectedTermId}&sessionId=${selectedSessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    const studentsList = data.students || [];
                    const mappedStudents: StudentReportSummary[] = studentsList.map((s: any) => {
                        const report = s.reportCards && s.reportCards.length > 0 ? s.reportCards[0] : null;
                        return {
                            id: s.id,
                            firstName: s.firstName,
                            lastName: s.lastName,
                            admissionNumber: s.admissionNumber,
                            classArmName: s.classArm?.armName || "",
                            published: report ? report.isPublished : false,
                            average: report ? report.average : null,
                            reportCardId: report ? report.id : null
                        };
                    });
                    setStudents(mappedStudents);
                    await refreshReportWorkflow(mappedStudents);
                }
            } catch (err) {
                console.error("Failed to fetch students", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
        // clear selections when changing filters
        setSelectedStudentIds([]);
    }, [selectedClassArmId, selectedTermId, selectedSessionId, reportType, isParent, isStudent]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedStudentIds(students.map(s => s.id));
        else setSelectedStudentIds([]);
    };

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handlePreviewSelected = async () => {
        if (selectedStudentIds.length === 0) return;
        setLoadingPreview(true);
        try {
            const res = await fetch("/api/reports/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: selectedStudentIds,
                    termId: selectedTermId,
                    reportType
                })
            });

            if (res.ok) {
                const data = await res.json();
                setPreviewData(data.reports);
                setShowPreviewModal(true);
            } else {
                throw new Error("Failed to fetch report data");
            }
        } catch (err) {
            console.error("Preview error:", err);
            toast.error("Failed to load report preview.");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleOpenComment = (student: StudentReportSummary) => {
        setSelectedStudentForComment(student);
        setIsCommentDialogOpen(true);
    };

    useEffect(() => {
        if (!isParent && !isStudent) return;

        const fetchPublishedReports = async () => {
            setLoadingPublishedReports(true);
            try {
                const studentId = searchParams.get("studentId");
                const query = studentId ? `?studentId=${studentId}` : "";
                const response = await fetch(`/api/reports/published${query}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch published reports");
                }
                const data = await response.json();
                setPublishedReports(data.reportCards || []);
            } catch (error) {
                console.error("Failed to fetch published reports", error);
                setPublishedReports([]);
            } finally {
                setLoadingPublishedReports(false);
            }
        };

        fetchPublishedReports();
    }, [isParent, isStudent, searchParams]);

    if (isParent || isStudent) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
                        <p className="text-slate-500">Published report cards are available here. Downloads expire after 3 days.</p>
                    </div>
                </div>
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-left">Session</th>
                                    <th className="px-4 py-3 text-left">Term</th>
                                    <th className="px-4 py-3 text-left">Class</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPublishedReports ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                            Loading reports...
                                        </td>
                                    </tr>
                                ) : publishedReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                            No published reports available.
                                        </td>
                                    </tr>
                                ) : (
                                    publishedReports.map((report) => (
                                        <tr key={report.id} className="border-t border-slate-100">
                                            <td className="px-4 py-3">{report.sessionName}</td>
                                            <td className="px-4 py-3">{report.termName}</td>
                                            <td className="px-4 py-3">{report.className}</td>
                                            <td className="px-4 py-3">
                                                {report.canDownload ? (
                                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                        Download Available
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                        Download Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => window.open(`/api/reports/published/download?reportCardId=${report.id}`, "_blank")}
                                                    disabled={!report.canDownload}
                                                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${report.canDownload
                                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                                            : "bg-slate-200 text-slate-500 cursor-not-allowed"
                                                        }`}
                                                >
                                                    Download PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
                    <p className="text-slate-500 mt-1">Manage and generate student reports</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Action Buttons */}
                    {selectedStudentIds.length > 0 && (
                        <button
                            onClick={handlePreviewSelected}
                            disabled={loadingPreview}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input hover:bg-slate-100 hover:text-slate-900 h-10 py-2 px-4 shadow-sm disabled:opacity-50"
                        >
                            {loadingPreview ? "Loading..." : `View Selected (${selectedStudentIds.length})`}
                        </button>
                    )}

                    {selectedClassArmId && students.length > 0 && (
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
                        >
                            Generate {selectedStudentIds.length > 0 ? "Selected" : "All"} Reports (ZIP)
                        </button>
                    )}
                </div>
            </div>

            <ReportFilters
                sessions={visibleSessions}
                classes={classes}
                selectedSessionId={selectedSessionId}
                setSelectedSessionId={setSelectedSessionId}
                selectedTermId={selectedTermId}
                setSelectedTermId={setSelectedTermId}
                selectedClassArmId={selectedClassArmId}
                setSelectedClassArmId={setSelectedClassArmId}
                reportType={reportType}
                setReportType={setReportType}
                restrictToAssignedScope={restrictToAssignedScope}
            />

            {selectedClassArmId && selectedTermId && classWorkflow && (
                <Card className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">Class Workflow</span>
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                    {classWorkflow.status?.replaceAll("_", " ")}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Subjects broadcasted: {scoreSummary?.broadcastedSubjects ?? 0}/{scoreSummary?.expectedSubjects ?? 0}
                            </p>
                            {(isAdmin || isClassTeacher) && pendingSubjects.length > 0 && (
                                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                    <p className="text-xs font-medium text-amber-900">
                                        Subjects yet to broadcast ({pendingSubjects.length})
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {pendingSubjects.map((item) => (
                                            <span
                                                key={item.subjectId}
                                                className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900"
                                            >
                                                {item.subjectName}: {formatWorkflowStatusLabel(item.status)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(isAdmin || isClassTeacher) && (
                                <button
                                    onClick={() => runWorkflowAction("broadcast_result")}
                                    disabled={
                                        workflowBusyAction !== null ||
                                        classWorkflow.status !== "WAITING_SUBJECT_BROADCAST" ||
                                        !scoreSummary?.allBroadcasted
                                    }
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${workflowBusyAction === "broadcast_result"
                                            ? "bg-blue-400"
                                            : "bg-blue-600 hover:bg-blue-700"
                                        } disabled:cursor-not-allowed disabled:bg-slate-300`}
                                >
                                    {workflowBusyAction === "broadcast_result" ? "Broadcasting..." : "Broadcast Result"}
                                </button>
                            )}

                            {(isAdmin || isClassTeacher) && (
                                <button
                                    onClick={() => runWorkflowAction("generate_comments")}
                                    disabled={
                                        workflowBusyAction !== null ||
                                        !["RESULT_BROADCASTED", "COMMENTS_GENERATED", "READY_FOR_ADMIN_REVIEW"].includes(classWorkflow.status)
                                    }
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${workflowBusyAction === "generate_comments"
                                            ? "bg-emerald-400"
                                            : "bg-emerald-600 hover:bg-emerald-700"
                                        } disabled:cursor-not-allowed disabled:bg-slate-300`}
                                >
                                    {workflowBusyAction === "generate_comments" ? "Generating..." : "Generate Comments"}
                                </button>
                            )}

                            {isAdmin && classWorkflow.status !== "PUBLISHED" && (
                                <button
                                    onClick={() => runWorkflowAction("publish_class")}
                                    disabled={workflowBusyAction !== null}
                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {workflowBusyAction === "publish_class" ? "Publishing..." : "Publish Result"}
                                </button>
                            )}

                            {isAdmin && classWorkflow.status === "PUBLISHED" && (
                                <button
                                    onClick={() => runWorkflowAction("unpublish_class")}
                                    disabled={workflowBusyAction !== null}
                                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {workflowBusyAction === "unpublish_class" ? "Unpublishing..." : "Unpublish Result"}
                                </button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {loading ? (
                <div className="flex justify-center flex-col items-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading classroom data...</p>
                </div>
            ) : students.length > 0 ? (
                <ReportDataTable
                    students={students}
                    selectedStudentIds={selectedStudentIds}
                    handleSelectAll={handleSelectAll}
                    handleSelectStudent={handleSelectStudent}
                    onOpenComment={handleOpenComment}
                    isAdmin={isAdmin}
                    isClassTeacher={isClassTeacher}
                    workflowBusyAction={workflowBusyAction}
                    commentEnabled={["RESULT_BROADCASTED", "COMMENTS_GENERATED", "READY_FOR_ADMIN_REVIEW", "PUBLISHED", "UNPUBLISHED"].includes(classWorkflow?.status || "")}
                    onClassApproveStudent={(student) => runWorkflowAction("class_approve_student", { studentId: student.id })}
                    onAdminApproveStudent={(student) => runWorkflowAction("admin_review_student", { studentId: student.id, decision: "approve" })}
                    onAdminRejectStudent={(student) => {
                        setRejectingStudent(student);
                        setRejectReason("");
                    }}
                />
            ) : selectedClassArmId ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-slate-500 font-medium">No students found in this class.</p>
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-500 font-medium">Select a Class and Term to view reports.</p>
                </div>
            )}

            {rejectingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h3 className="text-sm font-semibold text-slate-900">Reject Student Report</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {rejectingStudent.lastName} {rejectingStudent.firstName}
                            </p>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter rejection reason"
                                className="w-full min-h-[100px] rounded-md border border-slate-200 p-3 text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                            <button
                                onClick={() => {
                                    setRejectingStudent(null);
                                    setRejectReason("");
                                }}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await runWorkflowAction("admin_review_student", {
                                        studentId: rejectingStudent.id,
                                        decision: "reject",
                                        note: rejectReason,
                                    });
                                    setRejectingStudent(null);
                                    setRejectReason("");
                                }}
                                disabled={!rejectReason.trim() || workflowBusyAction !== null}
                                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Submit Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ReportCardPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                reports={previewData}
            />

            <BulkGenerateModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                classArmId={selectedClassArmId}
                termId={selectedTermId}
                studentIds={selectedStudentIds}
                reportType={reportType}
            />

            {selectedStudentForComment && (
                <CommentDialog
                    isOpen={isCommentDialogOpen}
                    onClose={() => {
                        setIsCommentDialogOpen(false);
                        setSelectedStudentForComment(null);
                    }}
                    studentId={selectedStudentForComment.id}
                    studentName={`${selectedStudentForComment.lastName} ${selectedStudentForComment.firstName}`}
                    termId={selectedTermId}
                    classArmId={selectedClassArmId}
                    reportType={reportType}
                    onSaved={async () => {
                        await refreshReportWorkflow();
                    }}
                />
            )}
        </div>
    );
}
