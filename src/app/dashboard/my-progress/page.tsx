"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
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
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading" || !session?.user?.id) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="pb-12">
            <OfflineIndicator />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-sm text-gray-500 mt-0.5">Track your grades, assignments, and learning history.</p>
                </div>
                <SyncStatus />
            </div>

            <div className="space-y-8">
                <GradesSummary />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col min-h-[400px]">
                        <ProgressChart />
                    </div>
                    <div className="lg:col-span-1">
                        <RecentActivityList />
                    </div>
                </div>
            </div>
        </div>
    );
}
