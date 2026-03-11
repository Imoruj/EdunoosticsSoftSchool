"use client";

import { useMemo } from "react";
import { useQuizAttempts, useSubmissions, useQuizzes, useAssignments } from "@/lib/db/hooks";
import { CheckCircle2, Clock, Trophy, Target } from "lucide-react";

export function GradesSummary() {
    const { attempts } = useQuizAttempts();
    const { submissions } = useSubmissions();
    const { quizzes } = useQuizzes();
    const { assignments } = useAssignments();

    const stats = useMemo(() => {
        let totalScoreEarned = 0;
        let totalScorePossible = 0;

        // Quiz stats
        let quizzesPassed = 0;
        const completedAttempts = attempts.filter(a => a.completedAt);
        completedAttempts.forEach(attempt => {
            totalScoreEarned += attempt.earnedPoints;
            totalScorePossible += attempt.totalPoints;
            if (attempt.isPassed) quizzesPassed++;
        });

        // Assignment stats
        let assignmentsGraded = 0;
        let pendingAssignments = 0;
        submissions.forEach(sub => {
            // Find the parent assignment to get maxScore
            const assignment = assignments.find(a => a.id === sub.assignmentId);

            if (sub.status === 'graded' && sub.score !== undefined && assignment) {
                totalScoreEarned += sub.score;
                totalScorePossible += assignment.maxScore;
                assignmentsGraded++;
            } else if (sub.status === 'submitted' || sub.status === 'late' || sub.status === 'draft') {
                pendingAssignments++;
            }
        });

        const averageGrade = totalScorePossible > 0
            ? Math.round((totalScoreEarned / totalScorePossible) * 100)
            : 0;

        return {
            averageGrade,
            tasksCompleted: completedAttempts.length + assignmentsGraded,
            quizzesPassed,
            pendingAssignments
        };
    }, [attempts, submissions, assignments]);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Average Grade Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Trophy className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Overall Average</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900">{stats.averageGrade}%</h3>
                    </div>
                </div>
            </div>

            {/* Tasks Completed Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900">{stats.tasksCompleted}</h3>
                        <span className="text-xs text-gray-500">Quizzes & Assignments</span>
                    </div>
                </div>
            </div>

            {/* Quizzes Passed Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Quizzes Passed</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900">{stats.quizzesPassed}</h3>
                        <span className="text-xs text-gray-500">of {stats.tasksCompleted > 0 ? Object.keys(attempts).length : 0} attempts</span>
                    </div>
                </div>
            </div>

            {/* Pending Work Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Pending Grades & Work</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900">{stats.pendingAssignments}</h3>
                        <span className="text-xs text-gray-500">Active assignments</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
