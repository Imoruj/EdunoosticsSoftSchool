"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignments, useSubmissions } from "@/lib/db/hooks";
import { SubmissionForm } from "./SubmissionForm";
import {
    ArrowLeft, Calendar, Clock, FileWarning, Download,
    BookOpen, ChevronDown, ChevronUp,
    Loader2, AlertCircle, Hash, AlertTriangle, CheckCircle2,
} from "lucide-react";
import dynamic from "next/dynamic";

const DocxViewer = dynamic(() => import("@/components/ui/DocxViewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-40 bg-slate-50">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
    ),
});

interface AssignmentViewProps {
    assignmentId: string;
    studentId: string;
}

const STATUS_CONFIG = {
    graded:    { label: "Graded",      color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
    submitted: { label: "Submitted",   color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-500"    },
    late:      { label: "Late",        color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500"   },
    draft:     { label: "Draft Saved", color: "text-slate-600",   bg: "bg-slate-50",    border: "border-slate-200",   dot: "bg-slate-400"   },
    missing:   { label: "Not Started", color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    dot: "bg-rose-500"    },
} as const;

function formatTimeRemaining(dueDate: Date): { text: string; urgent: boolean } {
    const diff = dueDate.getTime() - Date.now();
    if (diff <= 0) return { text: "Past due", urgent: true };
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(h / 24);
    if (d > 0) return { text: `${d}d ${h % 24}h remaining`, urgent: d < 1 };
    const m = Math.floor((diff / 60_000) % 60);
    return { text: `${h}h ${m}m remaining`, urgent: h < 6 };
}

function getFileLabel(type: string, name: string): string {
    if (type === "application/pdf" || /\.pdf$/i.test(name)) return "PDF";
    if (/\.docx$/i.test(name)) return "DOCX";
    if (/\.doc$/i.test(name))  return "DOC";
    if (/\.pptx$/i.test(name)) return "PPTX";
    if (/\.ppt$/i.test(name))  return "PPT";
    if (/\.xlsx$/i.test(name)) return "XLSX";
    if (/\.xls$/i.test(name))  return "XLS";
    if (type.startsWith("image/")) return "IMG";
    if (type.startsWith("audio/")) return "AUDIO";
    if (type.startsWith("video/")) return "VIDEO";
    return name.split(".").pop()?.toUpperCase().slice(0, 5) ?? "FILE";
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1_048_576) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1_048_576).toFixed(1)} MB`;
}

const LABEL_COLORS: Record<string, string> = {
    PDF:   "bg-rose-50   text-rose-600",
    DOCX:  "bg-blue-50   text-blue-600",
    DOC:   "bg-blue-50   text-blue-600",
    PPTX:  "bg-orange-50 text-orange-600",
    PPT:   "bg-orange-50 text-orange-600",
    XLSX:  "bg-green-50  text-green-600",
    XLS:   "bg-green-50  text-green-600",
    IMG:   "bg-violet-50 text-violet-600",
};

// ── Inline file preview ──────────────────────────────────────────────────────
function InlinePreview({ fileUrl, fileName, fileType }: {
    fileUrl: string; fileName: string; fileType: string;
}) {
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(false);

    const isImage  = fileType.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(fileName);
    const isPdf    = fileType === "application/pdf"  || /\.pdf$/i.test(fileName);
    const isDocx   = /\.docx$/i.test(fileName);
    const isOffice = /\.(pptx?|xlsx?|doc)$/i.test(fileName);
    const embedUrl = (isOffice || (!isImage && !isPdf && !isDocx))
        ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
        : fileUrl;

    if (error) return (
        <div className="py-10 text-center bg-slate-50">
            <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">Preview unavailable for this file type.</p>
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
                <Download className="w-3.5 h-3.5" /> Download to open
            </a>
        </div>
    );

    if (isImage) return (
        <img src={fileUrl} alt={fileName}
            className="w-full max-h-[400px] object-contain bg-slate-50 block"
            onError={() => setError(true)}
        />
    );

    if (isDocx) return (
        <div className="overflow-hidden">
            <DocxViewer fileUrl={fileUrl} onLoad={() => setLoading(false)} />
        </div>
    );

    return (
        <div className="relative bg-slate-50">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50">
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
            )}
            <iframe
                src={embedUrl}
                className="w-full border-0"
                style={{ height: 400, opacity: loading ? 0 : 1, transition: "opacity .15s" }}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
                title={fileName}
                allowFullScreen
            />
        </div>
    );
}

// ── File row with accordion preview + download button ────────────────────────
function FileRow({ att }: {
    att: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number };
}) {
    const [open, setOpen] = useState(false);
    const label      = getFileLabel(att.fileType, att.fileName);
    const badgeClass = LABEL_COLORS[label] ?? "bg-slate-100 text-slate-500";

    return (
        <div className={`rounded-xl border overflow-hidden transition-shadow ${open ? "border-slate-200 shadow-sm" : "border-slate-200"}`}>
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 tracking-wider ${badgeClass}`}>
                    {label}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{att.fileName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatBytes(att.fileSize)}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <a
                        href={att.fileUrl}
                        download={att.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </a>
                    <button
                        onClick={() => setOpen(v => !v)}
                        title={open ? "Collapse preview" : "Preview"}
                        className={`p-2 rounded-lg transition-colors ${
                            open
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t border-slate-100 max-h-[420px] overflow-y-auto">
                    <InlinePreview fileUrl={att.fileUrl} fileName={att.fileName} fileType={att.fileType} />
                </div>
            )}
        </div>
    );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function AssignmentView({ assignmentId, studentId }: AssignmentViewProps) {
    const router = useRouter();
    const { assignments, loading: aLoading }                 = useAssignments();
    const { submissions, saveSubmission, loading: sLoading } = useSubmissions(assignmentId);

    const assignment = useMemo(() => assignments.find(a => a.id === assignmentId), [assignments, assignmentId]);
    const submission = useMemo(() => submissions.find(s => s.studentId === studentId), [submissions, studentId]);
    const loading    = aLoading || sLoading;

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-2">
                <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse mx-auto" />
                <p className="text-sm text-slate-400">Loading…</p>
            </div>
        </div>
    );

    if (!assignment) return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <FileWarning className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">Assignment not found</h2>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
                This assignment doesn't exist or hasn't synced to your device yet.
            </p>
            <button onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                <ArrowLeft className="w-4 h-4" /> Go back
            </button>
        </div>
    );

    const dueDate   = new Date(assignment.dueDate);
    const isPastDue = Date.now() > dueDate.getTime();
    const timeLeft  = formatTimeRemaining(dueDate);
    const canSubmit = !submission ||
        submission.status === "draft" ||
        (isPastDue && assignment.allowLateSubmission &&
            submission.status !== "graded" &&
            submission.status !== "submitted" &&
            submission.status !== "late");

    const statusKey    = (submission?.status ?? "missing") as keyof typeof STATUS_CONFIG;
    const sc           = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.missing;
    const formattedDue = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <div className="bg-[#f8f9fb] min-h-screen pb-16">

            {/* ── Page header ── */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 pt-5 pb-1">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Assignments
                        </button>
                        <span className="text-slate-300 text-xs">/</span>
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 truncate">
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{assignment.title}</span>
                        </span>
                    </div>

                    {/* Title + meta */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 py-5">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                                {assignment.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    Due {formattedDue}
                                </span>
                                <span className={`flex items-center gap-1.5 ${timeLeft.urgent ? "text-rose-500 font-semibold" : ""}`}>
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    {timeLeft.text}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 shrink-0" />
                                    {assignment.maxScore} pts
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {sc.label}
                            </span>
                            {submission?.status === "graded" && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-2.5 text-center">
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Grade</p>
                                    <p className="text-xl font-black text-emerald-700 tabular-nums leading-tight">
                                        {submission.score}
                                        <span className="text-xs font-semibold text-emerald-400">/{assignment.maxScore}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main content ── */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">

                {/* Instructions — full width */}
                <section>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Instructions</p>
                    <div className="bg-white rounded-xl border border-slate-100 px-6 py-5">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {assignment.instructions}
                        </p>
                    </div>
                </section>

                {/* Side-by-side: Reference Materials + Your Work */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* Reference Materials */}
                    <section>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                            Reference Materials
                        </p>
                        {assignment.attachments && assignment.attachments.length > 0 ? (
                            <div className="space-y-2">
                                {assignment.attachments.map(att => (
                                    <FileRow key={att.id} att={att} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-100 px-6 py-8 text-center">
                                <p className="text-sm text-slate-400">No reference materials attached.</p>
                            </div>
                        )}
                    </section>

                    {/* Your Work */}
                    <section>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Your Work</p>

                        {!canSubmit && isPastDue && !assignment.allowLateSubmission && !submission ? (
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-8 text-center">
                                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-rose-900 mb-1">Assignment Missed</h3>
                                <p className="text-sm text-rose-600">
                                    The due date has passed and late submissions are not accepted.
                                </p>
                            </div>
                        ) : (
                            <SubmissionForm
                                assignmentId={assignmentId}
                                studentId={studentId}
                                existingSubmission={submission}
                                onSave={saveSubmission}
                                isPastDue={isPastDue}
                                latePenalty={assignment.lateSubmissionPenalty}
                            />
                        )}
                    </section>
                </div>

                {/* Teacher Feedback — full width */}
                {submission?.feedback && (
                    <section>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Teacher Feedback</p>
                        <div className="bg-white rounded-xl border border-slate-100 px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="text-sm font-semibold text-slate-700">Feedback from your teacher</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {submission.feedback}
                            </p>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
