"use client";

import { useMemo } from "react";
import { useQuizAttempts, useSubmissions, useAssignments } from "@/lib/db/hooks";

export function ProgressChart() {
    const { attempts } = useQuizAttempts();
    const { submissions } = useSubmissions();
    const { assignments } = useAssignments();

    // Combine quiz attempts and graded submissions, sort by date, take last 10
    const chartData = useMemo(() => {
        const dataPoints: { id: string; name: string; score: number; date: number; type: 'quiz' | 'assignment' }[] = [];

        // Add graded assignments
        submissions.forEach(sub => {
            if (sub.status === 'graded' && sub.score !== undefined) {
                const assignment = assignments.find(a => a.id === sub.assignmentId);
                if (assignment && assignment.maxScore > 0) {
                    dataPoints.push({
                        id: sub.id,
                        name: assignment.title.length > 15 ? assignment.title.substring(0, 15) + "..." : assignment.title,
                        score: Math.round((sub.score / assignment.maxScore) * 100),
                        date: sub.gradedAt || sub.updatedAt,
                        type: 'assignment'
                    });
                }
            }
        });

        // Add completed quiz attempts
        attempts.forEach(attempt => {
            if (attempt.completedAt && attempt.totalPoints > 0) {
                dataPoints.push({
                    id: attempt.id,
                    name: "Quiz attempt", // In a real scenario we'd query the quiz title, but we omit here for simplicity
                    score: Math.round((attempt.earnedPoints / attempt.totalPoints) * 100),
                    date: attempt.completedAt,
                    type: 'quiz'
                });
            }
        });

        // Sort chronologically and take oldest first to show progression
        const sorted = dataPoints.sort((a, b) => a.date - b.date).slice(-10);
        return sorted;
    }, [attempts, submissions, assignments]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white border text-center text-sm py-16 text-gray-400 border-gray-200 rounded-2xl p-6">
                No grades recorded yet. Complete quizzes and assignments to see your progress chart!
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Performance Trends</h3>

            {/* Custom CSS Bar Chart */}
            <div className="flex-1 flex items-end gap-2 sm:gap-4 mt-auto min-h-[200px] pb-6 relative">
                {/* Y-axis lines */}
                <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none opacity-20 z-0">
                    <div className="border-t border-gray-400 w-full"></div>
                    <div className="border-t border-gray-400 w-full"></div>
                    <div className="border-t border-gray-400 w-full"></div>
                    <div className="border-t border-gray-400 w-full"></div>
                </div>

                {chartData.map((point) => (
                    <div key={point.id} className="relative flex flex-col items-center flex-1 z-10 group cursor-default">

                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap pointer-events-none">
                            {point.name}: {point.score}%
                        </div>

                        {/* Bar */}
                        <div
                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ease-out ${point.type === 'quiz' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            style={{ height: `${Math.max(point.score, 5)}%` }} // Ensure min height for 0%
                        >
                        </div>
                        {/* Label Base */}
                        <div className="text-[10px] text-gray-400 mt-2 rotate-45 origin-left truncate w-full text-center">
                            {point.score}%
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500"></div> Quizzes</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Assignments</div>
            </div>
        </div>
    );
}
