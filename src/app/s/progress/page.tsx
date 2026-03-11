"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { GradesSummary } from "@/components/analytics/student/GradesSummary";
import { ProgressChart } from "@/components/analytics/student/ProgressChart";
import { RecentActivityList } from "@/components/analytics/student/RecentActivityList";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";

export default function StudentProgressDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated" || (session?.user?.roles && !session.user.roles.includes("STUDENT"))) {
            router.push("/dashboard"); // Kick out non-students
        }
    }, [status, session, router]);

    if (status === "loading" || !session?.user?.id) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

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
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">My Progress</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Track your grades, assignments, and learning history.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <SyncStatus />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Dashboard Layout */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* KPI Row (Row 1) */}
                <GradesSummary />

                {/* Chart & Activity Feed (Row 2) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Visuals: Chart */}
                    <div className="lg:col-span-2 flex flex-col min-h-[400px]">
                        <ProgressChart />
                    </div>

                    {/* Sidebar: Activity */}
                    <div className="lg:col-span-1">
                        <RecentActivityList />
                    </div>

                </div>

            </main>
        </div>
    );
}
