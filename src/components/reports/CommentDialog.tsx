"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface CommentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    termId: string;
    classArmId: string;
    reportType: "halfTerm" | "endOfTerm";
    onSaved?: () => void | Promise<void>;
}

export default function CommentDialog({
    isOpen,
    onClose,
    studentId,
    studentName,
    termId,
    classArmId,
    reportType,
    onSaved
}: CommentDialogProps) {
    const [teacherComment, setTeacherComment] = useState("");
    const [principalComment, setPrincipalComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState<null | "classTeacher" | "principal">(null);

    const normalizeComment = (value: unknown) => {
        if (typeof value !== "string") return "";
        // Strip legacy error suffixes that may have been persisted in DB.
        return value.replace(/\s*\(Error:[^)]+\)\s*$/i, "").trim();
    };

    useEffect(() => {
        if (isOpen && studentId && termId) {
            fetchComments();
        }
    }, [isOpen, studentId, termId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/comment?studentId=${studentId}&termId=${termId}&reportType=${reportType}`);
            if (res.ok) {
                const data = await res.json();
                setTeacherComment(normalizeComment(data.teacherComment || data.classTeacherComment));
                setPrincipalComment(normalizeComment(data.principalComment));
            }
        } catch (err) {
            console.error("Failed to fetch comments", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/reports/comment", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId,
                    termId,
                    reportType,
                    teacherComment,
                    principalComment
                })
            });

            if (res.ok) {
                toast.success("Comments saved successfully");
                if (onSaved) {
                    await onSaved();
                }
                onClose();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to save comments");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async (target: "classTeacher" | "principal") => {
        setRegenerating(target);
        try {
            const res = await fetch("/api/reports/workflow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "regenerate_student_comment",
                    classArmId,
                    termId,
                    reportType,
                    studentId,
                    target,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to regenerate comment");
            }

            if (target === "classTeacher") {
                setTeacherComment(normalizeComment(data.generatedComment));
            } else {
                setPrincipalComment(normalizeComment(data.generatedComment));
            }

            if (onSaved) {
                await onSaved();
            }
            toast.success("Comment regenerated");
        } catch (err: any) {
            toast.error(err.message || "Failed to regenerate comment");
        } finally {
            setRegenerating(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Report Comments</h2>
                        <p className="text-sm text-slate-500">{studentName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-sm text-slate-500">Loading comments...</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                        Class Teacher's Comment
                                    </label>
                                    <button
                                        onClick={() => handleRegenerate("classTeacher")}
                                        disabled={regenerating !== null || saving}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400"
                                    >
                                        {regenerating === "classTeacher" ? "Regenerating..." : "Regenerate"}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700"
                                    placeholder="Enter teacher's comment..."
                                    value={teacherComment}
                                    onChange={(e) => setTeacherComment(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                        Principal's Comment
                                    </label>
                                    <button
                                        onClick={() => handleRegenerate("principal")}
                                        disabled={regenerating !== null || saving}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400"
                                    >
                                        {regenerating === "principal" ? "Regenerating..." : "Regenerate"}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700"
                                    placeholder="Enter principal's comment..."
                                    value={principalComment}
                                    onChange={(e) => setPrincipalComment(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        disabled={loading}
                    >
                        Save Comments
                    </Button>
                </div>
            </Card>
        </div>
    );
}
