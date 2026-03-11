"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Mock Student interface for MVP progress table
export interface StudentProgressData {
    id: string;
    name: string;
    avatarUrl?: string;
    averageScore: number;
    completedTasks: number;
    pendingTasks: number;
    lastActive: string;
    trend: "up" | "down" | "flat";
}

interface StudentProgressTableRowProps {
    student: StudentProgressData;
}

export function StudentProgressTableRow({ student }: StudentProgressTableRowProps) {
    // Determine color coding based on score
    let scoreColor = "text-green-600 bg-green-50";
    if (student.averageScore < 50) scoreColor = "text-red-700 bg-red-50";
    else if (student.averageScore < 70) scoreColor = "text-orange-600 bg-orange-50";

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
            <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                        {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            student.name.substring(0, 2).toUpperCase()
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">Active {student.lastActive}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-6 text-center">
                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-sm ${scoreColor}`}>
                    {student.averageScore}%
                </span>
            </td>
            <td className="py-4 px-6">
                <div className="w-full bg-gray-100 rounded-full h-2 mt-1 relative overflow-hidden">
                    <div
                        className="bg-blue-500 h-2 rounded-full absolute left-0 top-0 transition-all duration-500"
                        style={{ width: `${Math.min((student.completedTasks / (student.completedTasks + student.pendingTasks)) * 100, 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                    <span>{student.completedTasks} done</span>
                    <span>{student.pendingTasks} pending</span>
                </div>
            </td>
            <td className="py-4 px-6 text-right">
                {/* We reuse the generic student profile route if we just want a drill down view */}
                <Link
                    href={`/dashboard/students/${student.id}/progress`}
                    className="inline-flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </td>
        </tr>
    );
}
