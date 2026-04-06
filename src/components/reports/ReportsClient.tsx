"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { UserRole } from "@prisma/client";

import ReportCardPreviewModal from "@/components/reports/ReportCardPreviewModal";
import ReportFilters from "./ReportFilters";
import ReportDataTable from "./ReportDataTable";
import BulkGenerateModal from "./BulkGenerateModal";
import CommentDialog from "./CommentDialog";
import { Card } from "@/components/ui/Card";
import type { ReportCardData } from "./types";

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
    teacher: WorkflowUserSummary | null;
    reviewedBy: WorkflowUserSummary | null;
    broadcastedBy: WorkflowUserSummary | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    rejectionReason: string | null;
    lastUpdatedAt: string | null;
    nextAction: string;
    hasWorkflow: boolean;
    componentStatuses?: ScoreBroadcastComponentStatus[];
}

interface ScoreBroadcastSummary {
    expectedSubjects: number;
    broadcastedSubjects: number;
    allBroadcasted: boolean;
    statuses: ScoreBroadcastStatus[];
    pendingSubjects?: ScoreBroadcastStatus[];
    classReviewer?: WorkflowUserSummary | null;
}

interface WorkflowUserSummary {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
}

interface ScoreBroadcastComponentStatus {
    subjectId: string;
    subjectName: string;
    status: string;
    teacher: WorkflowUserSummary | null;
    reviewedBy: WorkflowUserSummary | null;
    broadcastedBy: WorkflowUserSummary | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    rejectionReason: string | null;
    lastUpdatedAt: string | null;
    nextAction: string;
    hasWorkflow: boolean;
}

interface PublishedReportSummary {
    id: string;
    termId: string;
    termName: string;
    termNumber: number;
    sessionId: string;
    sessionName: string;
    studentName?: string;
    average: number | null;
    classPosition: number | null;
    classSize: number | null;
    publishedAt: string;
    className: string;
    reportType: "halfTerm" | "endOfTerm";
    downloadExpiresAt: string | null;
    canDownload: boolean;
}

function readCache<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
        const value = window.localStorage.getItem(key);
        return value ? (JSON.parse(value) as T) : null;
    } catch {
        return null;
    }
}

function writeCache(key: string, value: unknown) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore quota and serialization failures for optional offline cache.
    }
}

function getPublishedReportsCacheKey(user: { id?: string; loginProfileId?: string; loginType?: string } | null | undefined) {
    const principalId = user?.loginProfileId || user?.id || "anonymous";
    return `published-reports:${user?.loginType || "user"}:${principalId}`;
}

function getPublishedReportDataCacheKey(reportCardId: string) {
    return `published-report-data:${reportCardId}`;
}

function formatWorkflowStatusLabel(status?: string | null) {
    if (!status) return "Pending Review";
    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function formatWorkflowDate(value?: string | null) {
    if (!value) return "Not yet recorded";

    return new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getWorkflowStatusTone(status?: string | null) {
    switch (status) {
        case "BROADCASTED":
            return {
                pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
                dot: "bg-emerald-500",
            };
        case "APPROVED":
            return {
                pill: "bg-blue-50 text-blue-700 border-blue-200",
                dot: "bg-blue-500",
            };
        case "REJECTED":
            return {
                pill: "bg-rose-50 text-rose-700 border-rose-200",
                dot: "bg-rose-500",
            };
        default:
            return {
                pill: "bg-amber-50 text-amber-700 border-amber-200",
                dot: "bg-amber-500",
            };
    }
}

function getSubjectPreviewMeta(subject: ScoreBroadcastStatus) {
    if (subject.componentStatuses?.length) {
        const assignedComponents = subject.componentStatuses.filter((item) => item.teacher).length;
        return `${assignedComponents}/${subject.componentStatuses.length} component teachers assigned`;
    }

    return subject.teacher?.name || "No teacher assigned";
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
        userRoles.includes("SCHOOL_ADMIN") ||
        userRoles.includes("PROPRIETOR");
    const isClassTeacher = userRoles.includes("CLASS_TEACHER");
    const restrictToAssignedScope = !isAdmin && isClassTeacher;
    const isParent = user?.loginType === "parent";
    const isStudent =
        user?.loginType === "student" || userRoles.includes(UserRole.STUDENT);

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
    const [selectedWorkflowSubjectId, setSelectedWorkflowSubjectId] = useState<string | null>(null);
    const [rejectingStudent, setRejectingStudent] = useState<StudentReportSummary | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [publishedReports, setPublishedReports] = useState<PublishedReportSummary[]>([]);
    const [loadingPublishedReports, setLoadingPublishedReports] = useState(false);
    const [loadingPublishedPreviewId, setLoadingPublishedPreviewId] = useState<string | null>(null);
    const [previewModalTitle, setPreviewModalTitle] = useState("Report Card Preview");
    const [adminTestMode, setAdminTestMode] = useState(false);

    const visibleSessionIds =
        restrictToAssignedScope && selectedClassArmId
            ? (sessionIdsByClassArm[selectedClassArmId] || [])
            : sessions.map((s) => s.id);
    const visibleSessions = sessions.filter((s) => visibleSessionIds.includes(s.id));
    const pendingSubjects: ScoreBroadcastStatus[] =
        scoreSummary?.pendingSubjects ??
        (scoreSummary?.statuses || []).filter((item) => item.status !== "BROADCASTED");
    const selectedWorkflowSubject =
        scoreSummary?.statuses.find((item) => item.subjectId === selectedWorkflowSubjectId) || null;
    const awaitingReviewCount = (scoreSummary?.statuses || []).filter((item) =>
        item.status === "PENDING_REVIEW" || item.status === "REJECTED"
    ).length;
    const readyToBroadcastCount = (scoreSummary?.statuses || []).filter((item) => item.status === "APPROVED").length;
    const workflowStats = [
        { label: "Awaiting review", value: awaitingReviewCount },
        { label: "Ready to broadcast", value: readyToBroadcastCount },
        { label: "Broadcasted", value: scoreSummary?.broadcastedSubjects ?? 0 },
    ];

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

    useEffect(() => {
        if (!selectedWorkflowSubjectId) return;

        const stillExists = (scoreSummary?.statuses || []).some(
            (item) => item.subjectId === selectedWorkflowSubjectId
        );

        if (!stillExists) {
            setSelectedWorkflowSubjectId(null);
        }
    }, [scoreSummary, selectedWorkflowSubjectId]);

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
                    ...(adminTestMode ? { adminOverride: true } : {}),
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
                        const averageValue = report ? (typeof report.average === "object" && report.average !== null && typeof report.average.toNumber === "function"
                            ? report.average.toNumber()
                            : Number(report.average)
                        ) : null;

                        return {
                            id: s.id,
                            firstName: s.firstName,
                            lastName: s.lastName,
                            admissionNumber: s.admissionNumber,
                            classArmName: s.classArm?.armName || "",
                            published: report ? report.isPublished : false,
                            average: Number.isFinite(averageValue) ? averageValue : null,
                            position: report ? report.classPosition ?? null : null,
                            reportCardId: report ? report.id : null,
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
                setPreviewModalTitle("Report Card Preview");
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

    const handleOpenPublishedReport = async (report: PublishedReportSummary) => {
        const cachedKey = getPublishedReportDataCacheKey(report.id);
        const cachedReport = readCache<ReportCardData>(cachedKey);

        setLoadingPublishedPreviewId(report.id);
        try {
            const response = await fetch(`/api/reports/published/data?reportCardId=${encodeURIComponent(report.id)}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch report preview");
            }

            const data = await response.json();
            if (!data?.report) {
                throw new Error("Report preview data is unavailable");
            }

            writeCache(cachedKey, data.report);
            setPreviewData([data.report]);
            setPreviewModalTitle(`${report.sessionName} ${report.termName} Report`);
            setShowPreviewModal(true);
        } catch (error) {
            if (cachedReport) {
                toast("Showing saved offline copy of this report.");
                setPreviewData([cachedReport]);
                setPreviewModalTitle(`${report.sessionName} ${report.termName} Report`);
                setShowPreviewModal(true);
            } else {
                console.error("Failed to open published report preview", error);
                toast.error("Unable to open this report right now.");
            }
        } finally {
            setLoadingPublishedPreviewId(null);
        }
    };

    useEffect(() => {
        if (!isParent && !isStudent) return;

        const studentId = searchParams.get("studentId");
        const cacheKey = `${getPublishedReportsCacheKey(user)}:${studentId || "self"}`;
        const cachedReports = readCache<PublishedReportSummary[]>(cacheKey);
        if (cachedReports && cachedReports.length > 0) {
            setPublishedReports(cachedReports);
        }

        const fetchPublishedReports = async () => {
            setLoadingPublishedReports(true);
            try {
                const query = studentId ? `?studentId=${studentId}` : "";
                const response = await fetch(`/api/reports/published${query}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch published reports");
                }
                const data = await response.json();
                const reports = (data.reportCards || []) as PublishedReportSummary[];
                setPublishedReports(reports);
                writeCache(cacheKey, reports);
            } catch (error) {
                console.error("Failed to fetch published reports", error);
                if (!cachedReports) {
                    setPublishedReports([]);
                }
            } finally {
                setLoadingPublishedReports(false);
            }
        };

        fetchPublishedReports();
    }, [isParent, isStudent, searchParams, user]);

    if (isParent || isStudent) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
                        <p className="text-slate-500">
                            All published report cards are available here. View and print inside the portal.
                        </p>
                    </div>
                </div>
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {isParent && <th className="px-4 py-3 text-left">Student</th>}
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
                                        <td colSpan={isParent ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                                            Loading reports...
                                        </td>
                                    </tr>
                                ) : publishedReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={isParent ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                                            No published reports available.
                                        </td>
                                    </tr>
                                ) : (
                                    publishedReports.map((report) => (
                                        <tr key={report.id} className="border-t border-slate-100">
                                            {isParent && <td className="px-4 py-3">{report.studentName || "Ward"}</td>}
                                            <td className="px-4 py-3">{report.sessionName}</td>
                                            <td className="px-4 py-3">{report.termName}</td>
                                            <td className="px-4 py-3">{report.className}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                    View & Print Ready
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenPublishedReport(report)}
                                                        disabled={loadingPublishedPreviewId === report.id}
                                                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {loadingPublishedPreviewId === report.id ? "Opening..." : "View / Print"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <ReportCardPreviewModal
                    isOpen={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    reports={previewData as any}
                    title={previewModalTitle}
                />
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
                <Card className="p-5">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                        <div className="space-y-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-900">Class Workflow</span>
                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                            {classWorkflow.status?.replaceAll("_", " ")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Track subject review and broadcasting before publishing the class result.
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 lg:min-w-[320px]">
                                    {workflowStats.map((item) => (
                                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                                {item.label}
                                            </p>
                                            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Subjects awaiting completion ({pendingSubjects.length})
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Click any subject to inspect assigned teacher, review status, and workflow history.
                                        </p>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500">
                                        Broadcasted {scoreSummary?.broadcastedSubjects ?? 0} of {scoreSummary?.expectedSubjects ?? 0}
                                    </p>
                                </div>

                                {pendingSubjects.length > 0 ? (
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                        {pendingSubjects.map((item) => {
                                            const tone = getWorkflowStatusTone(item.status);

                                            return (
                                                <button
                                                    key={item.subjectId}
                                                    type="button"
                                                    onClick={() => setSelectedWorkflowSubjectId(item.subjectId)}
                                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{item.subjectName}</p>
                                                            <p className="mt-1 text-xs text-slate-500">{getSubjectPreviewMeta(item)}</p>
                                                        </div>
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone.pill}`}>
                                                            {formatWorkflowStatusLabel(item.status)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className={`h-2 w-2 rounded-full ${tone.dot}`}></span>
                                                            <span>{item.nextAction}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-primary-700">View details</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                                        All subjects have been broadcasted for this class.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-4">
                                <p className="text-sm font-semibold text-slate-900">Workflow actions</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Actions unlock as review and subject broadcasting progress.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {isAdmin && (
                                    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-amber-900">Admin Testing Mode</p>
                                                <p className="mt-0.5 text-xs text-amber-700">
                                                    Bypass workflow gates to test comments, publishing, and student visibility.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={adminTestMode}
                                                onClick={() => setAdminTestMode((prev) => !prev)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                                    adminTestMode ? "bg-amber-500" : "bg-slate-300"
                                                }`}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                        adminTestMode ? "translate-x-5" : "translate-x-0"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(isAdmin || isClassTeacher) && (
                                    <button
                                        onClick={() => runWorkflowAction("broadcast_result")}
                                        disabled={
                                            workflowBusyAction !== null ||
                                            (!adminTestMode && (
                                                classWorkflow.status !== "WAITING_SUBJECT_BROADCAST" ||
                                                !scoreSummary?.allBroadcasted
                                            ))
                                        }
                                        className="flex w-full flex-col rounded-xl bg-blue-600 px-4 py-3 text-left text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <span className="text-sm font-semibold">
                                            {workflowBusyAction === "broadcast_result" ? "Broadcasting..." : "Broadcast Result"}
                                        </span>
                                        <span className="mt-1 text-xs text-blue-100">
                                            {adminTestMode ? "Admin override: bypasses broadcast requirement." : "Available when every subject has been broadcasted."}
                                        </span>
                                    </button>
                                )}

                                {(isAdmin || isClassTeacher) && (
                                    <button
                                        onClick={() => runWorkflowAction("generate_comments")}
                                        disabled={
                                            workflowBusyAction !== null ||
                                            (!adminTestMode && !["RESULT_BROADCASTED", "COMMENTS_GENERATED", "READY_FOR_ADMIN_REVIEW"].includes(classWorkflow.status))
                                        }
                                        className="flex w-full flex-col rounded-xl bg-emerald-600 px-4 py-3 text-left text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <span className="text-sm font-semibold">
                                            {workflowBusyAction === "generate_comments" ? "Generating..." : "Generate Comments"}
                                        </span>
                                        <span className="mt-1 text-xs text-emerald-100">
                                            {adminTestMode ? "Admin override: bypasses broadcast requirement." : "Generate or refresh teacher and principal comments for the class."}
                                        </span>
                                    </button>
                                )}

                                {isAdmin && classWorkflow.status !== "PUBLISHED" && (
                                    <button
                                        onClick={() => runWorkflowAction("publish_class")}
                                        disabled={workflowBusyAction !== null}
                                        className="flex w-full flex-col rounded-xl bg-indigo-600 px-4 py-3 text-left text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <span className="text-sm font-semibold">
                                            {workflowBusyAction === "publish_class" ? "Publishing..." : "Publish Class"}
                                        </span>
                                        <span className="mt-1 text-xs text-indigo-100">
                                            {adminTestMode ? "Admin override: auto-approves and publishes all." : "Publish report cards for the selected class only (students + parents)."}
                                        </span>
                                    </button>
                                )}

                                {isAdmin && classWorkflow.status === "PUBLISHED" && (
                                    <button
                                        onClick={() => runWorkflowAction("unpublish_class")}
                                        disabled={workflowBusyAction !== null}
                                        className="flex w-full flex-col rounded-xl bg-rose-600 px-4 py-3 text-left text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <span className="text-sm font-semibold">
                                            {workflowBusyAction === "unpublish_class" ? "Unpublishing..." : "Unpublish Class"}
                                        </span>
                                        <span className="mt-1 text-xs text-rose-100">
                                            Remove published access for the selected class only while keeping workflow history intact.
                                        </span>
                                    </button>
                                )}
                            </div>
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

            {selectedWorkflowSubject && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4">
                    <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
                        <div className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        {selectedWorkflowSubject.subjectName}
                                    </h3>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getWorkflowStatusTone(selectedWorkflowSubject.status).pill}`}>
                                        {formatWorkflowStatusLabel(selectedWorkflowSubject.status)}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                    {selectedWorkflowSubject.nextAction}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedWorkflowSubjectId(null)}
                                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="space-y-5">
                                {selectedWorkflowSubject.componentStatuses?.length ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <div className="mb-3">
                                            <p className="text-sm font-semibold text-slate-900">Component subjects</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                This parent subject is tracked through its component subject workflows.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedWorkflowSubject.componentStatuses.map((component) => (
                                                <div
                                                    key={component.subjectId}
                                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {component.subjectName}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {component.teacher?.name || "No teacher assigned"}
                                                            </p>
                                                        </div>
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getWorkflowStatusTone(component.status).pill}`}>
                                                            {formatWorkflowStatusLabel(component.status)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                        <div>
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                Teacher contact
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-700">
                                                                {component.teacher?.email || "No email on file"}
                                                            </p>
                                                            <p className="text-sm text-slate-700">
                                                                {component.teacher?.phone || "No phone on file"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                Latest activity
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-700">
                                                                {component.broadcastedAt
                                                                    ? `Broadcasted ${formatWorkflowDate(component.broadcastedAt)}`
                                                                    : component.reviewedAt
                                                                        ? `Reviewed ${formatWorkflowDate(component.reviewedAt)}`
                                                                        : "No workflow activity yet"}
                                                            </p>
                                                            <p className="text-sm text-slate-500">{component.nextAction}</p>
                                                        </div>
                                                    </div>

                                                    {component.rejectionReason && (
                                                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                                            {component.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Subject teacher
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-900">
                                                {selectedWorkflowSubject.teacher?.name || "No teacher assigned"}
                                            </p>
                                            <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                <p>{selectedWorkflowSubject.teacher?.email || "No email on file"}</p>
                                                <p>{selectedWorkflowSubject.teacher?.phone || "No phone on file"}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Class reviewer
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-slate-900">
                                                {scoreSummary?.classReviewer?.name || "No class teacher assigned"}
                                            </p>
                                            <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                <p>{scoreSummary?.classReviewer?.email || "No email on file"}</p>
                                                <p>{scoreSummary?.classReviewer?.phone || "No phone on file"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-slate-900">Workflow activity</p>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Reviewed by
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-slate-900">
                                                {selectedWorkflowSubject.reviewedBy?.name || "Not reviewed yet"}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {formatWorkflowDate(selectedWorkflowSubject.reviewedAt)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Broadcasted by
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-slate-900">
                                                {selectedWorkflowSubject.broadcastedBy?.name || "Not broadcasted yet"}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {formatWorkflowDate(selectedWorkflowSubject.broadcastedAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedWorkflowSubject.rejectionReason && (
                                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                                                Rejection note
                                            </p>
                                            <p className="mt-2 text-sm text-rose-700">
                                                {selectedWorkflowSubject.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        Next action
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {selectedWorkflowSubject.nextAction}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        Last updated
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-900">
                                        {formatWorkflowDate(selectedWorkflowSubject.lastUpdatedAt)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Workflow record {selectedWorkflowSubject.hasWorkflow ? "exists" : "has not been created yet"}.
                                    </p>
                                </div>

                                {!selectedWorkflowSubject.componentStatuses?.length && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Subject workflow
                                        </p>
                                        <p className="mt-2 text-sm text-slate-700">
                                            {selectedWorkflowSubject.teacher
                                                ? "Teacher assignment is in place."
                                                : "A teacher must be assigned before this subject can move smoothly through the workflow."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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
                title={previewModalTitle}
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
