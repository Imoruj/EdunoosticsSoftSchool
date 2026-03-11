"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAssignments, useSubmissions } from "@/lib/db/hooks";
import type { Assignment, AssignmentSubmission } from "@/lib/db/types";
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileText, Download, Save } from "lucide-react";
import { showAppAlert } from "@/lib/appMessageBox";

interface GradingInterfaceProps {
    assignmentId: string;
    teacherId: string;
}

export function GradingInterface({ assignmentId, teacherId }: GradingInterfaceProps) {
    const router = useRouter();

    const { assignments, loading: assignmentLoading } = useAssignments();
    const { submissions, loading: submissionsLoading, saveSubmission } = useSubmissions(assignmentId);

    const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);

    // Grading State
    const [scoreInput, setScoreInput] = useState<string>("");
    const [feedbackInput, setFeedbackInput] = useState<string>("");
    const [savingGrade, setSavingGrade] = useState(false);

    const assignment = useMemo(() =>
        assignments.find(a => a.id === assignmentId),
        [assignments, assignmentId]);

    const handleSelectSubmission = (sub: AssignmentSubmission) => {
        setSelectedSubmission(sub);
        setScoreInput(sub.score?.toString() || "");
        setFeedbackInput(sub.feedback || "");
    };

    const handleSaveGrade = async () => {
        if (!selectedSubmission || !assignment) return;

        const scoreNum = Number(scoreInput);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > assignment.maxScore) {
            await showAppAlert(`Please enter a valid score between 0 and ${assignment.maxScore}.`, {
                title: "Invalid Score",
                variant: "warning",
            });
            return;
        }

        setSavingGrade(true);
        try {
            const updatedSubmission: AssignmentSubmission = {
                ...selectedSubmission,
                score: scoreNum,
                feedback: feedbackInput.trim() || undefined,
                status: "graded",
                gradedAt: Date.now(),
                gradedById: teacherId,
                updatedAt: Date.now()
            };

            await saveSubmission(updatedSubmission);

            // Update local state without waiting for full hook refresh just for UI snappiness
            setSelectedSubmission(updatedSubmission);

        } catch (error) {
            console.error("Failed to save grade:", error);
            await showAppAlert("Failed to save the grade. Please try again.", { variant: "error" });
        } finally {
            setSavingGrade(false);
        }
    };

    if (assignmentLoading || submissionsLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading assignment data...</div>;
    }

    if (!assignment) {
        return <div className="p-8 text-center text-red-500">Assignment not found.</div>;
    }

    // Derived stats
    const totalSubmissions = submissions.length;
    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    const pendingCount = submissions.filter(s => s.status === 'submitted' || s.status === 'late').length;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* Left Sidebar: Submissions List */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">

                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    <h2 className="font-bold text-gray-900 truncate" title={assignment.title}>
                        {assignment.title}
                    </h2>
                    <div className="mt-2 flex gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                            <CheckCircle2 className="w-3 h-3" /> {gradedCount} Graded
                        </span>
                        <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded">
                            <Clock className="w-3 h-3" /> {pendingCount} Pending
                        </span>
                    </div>
                </div>

                {/* List of students */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {submissions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No submissions yet.</p>
                    ) : (
                        submissions.map(sub => {
                            const isSelected = selectedSubmission?.id === sub.id;
                            // In a real app we'd map studentId to student Name. Using partial ID for demo if mock data doesn't have names
                            const studentName = `Student ${sub.studentId.substring(0, 5)}`;

                            let statusBadge = null;
                            if (sub.status === 'graded') {
                                statusBadge = <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Graded</span>;
                            } else if (sub.status === 'late') {
                                statusBadge = <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Late</span>;
                            } else if (sub.status === 'draft') {
                                statusBadge = <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Working</span>;
                            } else {
                                statusBadge = <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Needs Grading</span>;
                            }

                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => handleSelectSubmission(sub)}
                                    className={`
                    w-full text-left p-3 rounded-xl transition-all border
                    ${isSelected
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-gray-900 truncate">{studentName}</span>
                                        {statusBadge}
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between">
                                        <span>
                                            {new Date(sub.updatedAt ?? sub.submittedAt ?? Date.now()).toLocaleDateString()}
                                        </span>
                                        {sub.score !== undefined && (
                                            <span className="font-semibold text-gray-900">{sub.score} / {assignment.maxScore}</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {selectedSubmission ? (
                    <>
                        {/* Student Work View */}
                        <div className="flex-1 overflow-y-auto p-8 relative">
                            <div className="max-w-3xl mx-auto space-y-8 pb-32">

                                {/* Status Callout if Late */}
                                {selectedSubmission.status === 'late' && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-900">
                                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="font-semibold">Submitted Late</h4>
                                            <p className="text-sm mt-1">This assignment was submitted after the due date. {assignment.allowLateSubmission && assignment.lateSubmissionPenalty ? `A ${assignment.lateSubmissionPenalty}% penalty applies.` : ''}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Submitted Text Content */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Student Response</h3>
                                    {selectedSubmission.content ? (
                                        <div className="bg-white rounded-2xl border border-gray-200 p-6 whitespace-pre-wrap text-gray-800 leading-relaxed shadow-sm min-h-[200px]">
                                            {selectedSubmission.content}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 italic">
                                            No text response provided.
                                        </div>
                                    )}
                                </div>

                                {/* Attachments */}
                                {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Attached Files</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedSubmission.attachments.map(att => (
                                                <a
                                                    key={att.id}
                                                    href={att.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                                                >
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{att.fileName}</p>
                                                        <p className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                    <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600 shrink-0" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Grading Sidebar Panel */}
                        <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 md:h-full z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] bottom-0 fixed md:relative h-[50vh] rounded-t-3xl md:rounded-none">
                            <div className="p-6 border-b border-gray-100 hidden md:block">
                                <h3 className="font-bold text-lg text-gray-900">Evaluation</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Score Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Score (out of {assignment.maxScore})
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max={assignment.maxScore}
                                            value={scoreInput}
                                            onChange={(e) => setScoreInput(e.target.value)}
                                            placeholder="e.g. 85"
                                            className="w-full text-2xl font-bold bg-gray-50 border border-gray-300 rounded-xl py-3 pl-4 pr-12 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                            / {assignment.maxScore}
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Teacher Feedback <span className="font-normal text-gray-500">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={feedbackInput}
                                        onChange={(e) => setFeedbackInput(e.target.value)}
                                        placeholder="Leave constructive feedback for the student..."
                                        rows={6}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-800 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-y"
                                    />
                                </div>

                            </div>

                            {/* Action Buttons */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm shrink-0">
                                <button
                                    onClick={handleSaveGrade}
                                    disabled={savingGrade || !scoreInput}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-xl shadow-sm transition-colors text-base"
                                >
                                    {savingGrade ? "Saving..." : "Save Grade & Feedback"}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
                        <div className="w-24 h-24 mb-6 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Submission</h3>
                        <p className="max-w-sm">Choose a student's work from the left sidebar to begin grading or leaving feedback.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
