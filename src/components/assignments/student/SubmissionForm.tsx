"use client";

import { useState } from "react";
import type { AssignmentSubmission, SubmissionAttachment } from "@/lib/db/types";
import { Save, Send, X, FileText, UploadCloud, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { showAppAlert, showAppConfirm } from "@/lib/appMessageBox";

interface SubmissionFormProps {
    assignmentId: string;
    studentId: string;
    existingSubmission?: AssignmentSubmission | null;
    onSave: (submission: AssignmentSubmission, isFinal: boolean) => Promise<void>;
    isPastDue: boolean;
    latePenalty?: number;
}

function uid(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function SubmissionForm({
    assignmentId, studentId, existingSubmission, onSave, isPastDue, latePenalty,
}: SubmissionFormProps) {
    const [content, setContent] = useState(existingSubmission?.content ?? "");
    const [attachments, setAttachments] = useState<SubmissionAttachment[]>(existingSubmission?.attachments ?? []);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [savingAction, setSavingAction] = useState<"draft" | "submit" | null>(null);

    const isSubmitted = existingSubmission?.status === "submitted" ||
        existingSubmission?.status === "late" ||
        existingSubmission?.status === "graded";

    const hasContent = content.trim().length > 0 || attachments.length > 0;

    const uploadFile = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "submission_attachment");

            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json().catch(() => null) as { url?: string; error?: string } | null;
            if (!res.ok || !data?.url) throw new Error(data?.error ?? "Upload failed");

            setAttachments(prev => [...prev, {
                id: uid("sub_att"),
                fileName: file.name,
                fileUrl: data.url!,
                fileType: file.type || "application/octet-stream",
                fileSize: file.size,
                isEncrypted: false,
            }]);
        } catch (err) {
            await showAppAlert(err instanceof Error ? err.message : "File upload failed. Please try again.", {
                variant: "error",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
        e.currentTarget.value = "";
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await uploadFile(file);
    };

    const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

    const submitWork = async (action: "draft" | "submit") => {
        if (action === "submit" && !hasContent) {
            await showAppAlert("You must provide either some text or attach a file before submitting.", {
                title: "Submission Required",
                variant: "warning",
            });
            return;
        }
        if (action === "submit" && !(await showAppConfirm("Are you sure you want to submit? You won't be able to edit this once submitted.", {
            title: "Submit Assignment",
            variant: "warning",
            confirmText: "Submit",
        }))) {
            return;
        }

        setSavingAction(action);
        const finalStatus = action === "draft" ? "draft" : (isPastDue ? "late" : "submitted");

        try {
            await onSave({
                id: existingSubmission?.id ?? uid("sub"),
                assignmentId,
                studentId,
                content: content.trim() || undefined,
                attachments,
                status: finalStatus,
                createdAt: existingSubmission?.createdAt ?? Date.now(),
                updatedAt: Date.now(),
                submittedAt: action === "submit" ? Date.now() : existingSubmission?.submittedAt,
                isLate: finalStatus === "late",
            }, action === "submit");
        } catch {
            await showAppAlert("Failed to save progress. Please try again.", { variant: "error" });
        } finally {
            setSavingAction(null);
        }
    };

    /* ── Submitted / read-only view ── */
    if (isSubmitted) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900">Your Submission</h3>
                </div>

                {existingSubmission?.content && (
                    <div className="px-6 py-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-b border-slate-100">
                        {existingSubmission.content}
                    </div>
                )}

                {existingSubmission?.attachments && existingSubmission.attachments.length > 0 && (
                    <div className="p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Attached Files</p>
                        <div className="space-y-2">
                            {existingSubmission.attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl">
                                    <div className="p-2 bg-slate-50 text-slate-500 rounded-lg shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{att.fileName}</p>
                                        <p className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <a
                                        href={att.fileUrl}
                                        download={att.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Download"
                                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    /* ── Editable submission form ── */
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">

            {/* Text response */}
            <div className="relative">
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Type your response here…"
                    className="w-full min-h-[220px] px-6 py-5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none resize-none bg-transparent border-b border-slate-100 leading-relaxed"
                />
                {content.length > 0 && (
                    <span className="absolute bottom-3 right-4 text-[11px] text-slate-300 font-medium select-none tabular-nums">
                        {content.length} chars
                    </span>
                )}
            </div>

            {/* Attachments */}
            <div className="px-6 py-5 bg-slate-50/60 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Attachments
                    {attachments.length > 0 && (
                        <span className="text-indigo-500 normal-case font-semibold ml-1">
                            · {attachments.length} file{attachments.length > 1 ? "s" : ""}
                        </span>
                    )}
                </p>

                {attachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl group">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{att.fileName}</p>
                                    <p className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={() => removeAttachment(att.id)}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                    title="Remove"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <input
                    type="file"
                    id="student-file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
                    onChange={handleInputChange}
                    disabled={uploading}
                />
                <label
                    htmlFor="student-file-upload"
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex items-center gap-4 w-full px-5 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all select-none ${
                        dragOver
                            ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                            : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-500"
                    }`}
                >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        dragOver ? "bg-indigo-100 text-indigo-600" : "bg-slate-100"
                    }`}>
                        <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">
                            {uploading ? "Uploading…" : dragOver ? "Drop to attach" : "Click or drag a file here"}
                        </p>
                        <p className="text-xs mt-0.5 opacity-60">PDF, DOCX, Images, etc. up to 10 MB</p>
                    </div>
                </label>
            </div>

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-white">
                {isPastDue && latePenalty ? (
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-100 w-full sm:w-auto">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Late submission — {latePenalty}% penalty applies
                    </div>
                ) : <div />}

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => submitWork("draft")}
                        disabled={savingAction !== null}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all w-full sm:w-auto"
                    >
                        <Save className="w-4 h-4" />
                        {savingAction === "draft" ? "Saving…" : "Save Draft"}
                    </button>
                    <button
                        onClick={() => submitWork("submit")}
                        disabled={savingAction !== null || !hasContent}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all w-full sm:w-auto shadow-sm shadow-indigo-200"
                    >
                        <Send className="w-4 h-4" />
                        {savingAction === "submit" ? "Submitting…" : "Submit Assignment"}
                    </button>
                </div>
            </div>

        </div>
    );
}
