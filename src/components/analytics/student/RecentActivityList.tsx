"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSubmissions, useQuizAttempts, useAssignments, useQuizzes } from "@/lib/db/hooks";
import { CheckCircle2, Clock, FileText, Activity } from "lucide-react";
import Link from "next/link";

export function RecentActivityList() {
    const { attempts, loading: loadingAttempts } = useQuizAttempts();
    const { submissions, loading: loadingSub } = useSubmissions();
    const { assignments } = useAssignments();
    const { quizzes } = useQuizzes();

    const activities = useMemo(() => {
        const list: any[] = [];

        // Map Quiz Attempts
        attempts.forEach(attempt => {
            const quiz = quizzes.find(q => q.id === attempt.quizId);
            list.push({
                id: `quiz_attempt_${attempt.id}`,
                title: quiz?.title || "Unknown Quiz",
                type: "quiz",
                status: attempt.completedAt ? "completed" : "in_progress",
                date: attempt.completedAt || attempt.startedAt,
                score: attempt.completedAt ? Math.round((attempt.earnedPoints / attempt.totalPoints) * 100) : null,
                link: `/s/quizzes/${attempt.quizId}`
            });
        });

        // Map Assignment Submissions
        submissions.forEach(sub => {
            const assignment = assignments.find(a => a.id === sub.assignmentId);
            list.push({
                id: `submission_${sub.id}`,
                title: assignment?.title || "Unknown Assignment",
                type: "assignment",
                status: sub.status,
                date: sub.updatedAt || sub.createdAt,
                score: (sub.status === 'graded' && sub.score !== undefined && assignment)
                    ? Math.round((sub.score / assignment.maxScore) * 100)
                    : null,
                link: `/s/assignments/${sub.assignmentId}`
            });
        });

        // Sort by most recent
        return list.sort((a, b) => b.date - a.date).slice(0, 15); // Show last 15
    }, [attempts, submissions, assignments, quizzes]);

    if (loadingAttempts || loadingSub) {
        return <div className="p-8 text-center text-gray-500 animate-pulse bg-white border border-gray-200 rounded-2xl">Loading activity history...</div>;
    }

    if (activities.length === 0) {
        return (
            <div className="bg-white border rounded-2xl p-8 border-gray-200 text-center text-gray-500 flex items-center justify-center flex-col min-h-[300px]">
                <Activity className="w-10 h-10 text-gray-300 mb-4" />
                <p>No recent activity found.</p>
                <p className="text-sm mt-1">Start taking quizzes and assignments to see them here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <Clock className="text-blue-600 w-5 h-5" />
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {activities.map(activity => {
                    // Determine colors and icons based on status
                    let statusColor = "bg-gray-100 text-gray-500";
                    let statusText = "Draft";

                    if (activity.status === 'graded' || activity.status === 'completed') {
                        statusColor = "bg-green-100 text-green-700";
                        statusText = activity.status === 'graded' ? 'Graded' : 'Completed';
                    } else if (activity.status === 'submitted') {
                        statusColor = "bg-blue-100 text-blue-700";
                        statusText = "Turned In";
                    } else if (activity.status === 'late') {
                        statusColor = "bg-red-100 text-red-700";
                        statusText = "Submitted Late";
                    }

                    return (
                        <Link href={activity.link} key={activity.id} className="p-5 hover:bg-gray-50 transition-colors flex items-start gap-4 group">
                            <div className={`p-2 rounded-lg mt-1 shrink-0 ${activity.type === 'quiz' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                {activity.type === 'quiz' ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{activity.title}</p>
                                <p className="text-xs text-gray-500 mt-1 capitalize">
                                    {activity.type} • {formatDistanceToNow(activity.date, { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColor}`}>
                                    {statusText}
                                </span>
                                {activity.score !== null && (
                                    <span className="text-sm font-bold text-gray-900">{activity.score}%</span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
