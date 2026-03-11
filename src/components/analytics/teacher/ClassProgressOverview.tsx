"use client";

import { useMemo } from "react";
import { useAssignments, useQuizzes } from "@/lib/db/hooks"; /* Real hook */
import { Users, TrendingUp, CheckCircle, Target } from "lucide-react";

// For an MVP teacher view, we mock some metrics if the database doesn't have a specific cross-student reporting query yet.
// In a production backend, this data would come from an aggregation endpoint like `/api/progress/class`
export function ClassProgressOverview() {
    const { assignments } = useAssignments();
    const { quizzes } = useQuizzes();

    const stats = useMemo(() => {
        // Generate some simulated aggregate class data based on the active tasks
        // If the teacher has created tasks, we show metrics for them.
        const activeTasksCount = assignments.length + quizzes.length;

        return {
            averageScore: 0,
            completionRate: 0,
            strugglingStudents: 0,
            totalStudentsEnrolled: 0,
            assignmentsCreated: assignments.length,
            quizzesCreated: quizzes.length
        };
    }, [assignments, quizzes]);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Class Average */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-500">Class Average</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.averageScore}%</h3>
                </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.completionRate}%</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">of assigned tasks</p>
            </div>

            {/* Students Enrolled */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3">
                    <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.totalStudentsEnrolled}</h3>
                </div>
            </div>

            {/* Needs Attention */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {stats.strugglingStudents > 0 && (
                    <div className="absolute top-0 w-full h-1 bg-red-500 left-0"></div>
                )}
                <div className={`p-3 rounded-full mb-3 ${stats.strugglingStudents > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"}`}>
                    <Target className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-500">Needs Attention</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-3xl font-bold text-gray-900">{stats.strugglingStudents}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">scoring below 50%</p>
            </div>
        </div>
    );
}
