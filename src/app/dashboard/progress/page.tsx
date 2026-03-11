"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Search, Filter } from "lucide-react";
import { ClassProgressOverview } from "@/components/analytics/teacher/ClassProgressOverview";
import { StudentProgressTableRow, type StudentProgressData } from "@/components/analytics/teacher/StudentProgressTableRow";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";

export default function TeacherProgressDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Basic RBAC - ensure only teachers and admins can view the class progress page
        if (status === "unauthenticated" || (session?.user?.roles && session.user.roles.includes("STUDENT") && !session.user.roles.includes("SUPER_ADMIN") && !session.user.roles.includes("SCHOOL_ADMIN") && !session.user.roles.includes("CLASS_TEACHER") && !session.user.roles.includes("SUBJECT_TEACHER"))) {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading" || !session?.user?.id) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Student-level breakdown requires a dedicated aggregation endpoint (/api/progress/class).
    // Until that endpoint is implemented, the table renders an empty state.
    const mockStudents: StudentProgressData[] = [];

    const filteredStudents = mockStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <OfflineIndicator />

            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Class Progress</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Monitor student performance and engagement.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <SyncStatus />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Tier 1: Aggregate Class Overview */}
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Overview</h2>
                    <ClassProgressOverview />
                </section>

                {/* Tier 2: Detailed Student Table */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-lg font-bold text-gray-900">Student Breakdown</h2>

                        {/* Toolbar */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-[200px]"
                                />
                            </div>
                            <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Avg. Score</th>
                                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Completion Progress</th>
                                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <StudentProgressTableRow key={student.id} student={student} />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">
                                                Student breakdown coming soon.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
