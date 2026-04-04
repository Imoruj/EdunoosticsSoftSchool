import { Suspense } from "react";
import Link from "next/link";
import {
    AcademicHealthCard,
    AttendanceHealthCard,
    EnrollmentInsightsCard,
    ExecutiveSummaryGrid,
    OperationsHealthCard,
} from "@/components/analytics/proprietor/ProprietorAnalyticsPanels";
import { ExecutiveFilterBar } from "./ExecutiveFilterBar";
import { PriorityAlertsCard } from "./PriorityAlertsCard";
import { DashboardUnavailableCard } from "./DashboardUnavailableCard";
import { RecentActivityAsync } from "./RecentActivityAsync";
import { getProprietorAnalytics, ProprietorAnalyticsFilters } from "@/lib/analytics/proprietor";
import { isTransientPrismaError } from "@/lib/prisma-transient";

function RailSkeleton() {
    return <div className="animate-pulse rounded-2xl border border-slate-100 bg-white h-80" />;
}

export async function ProprietorDashboardAsync({
    schoolId,
    userId,
    searchParams,
}: {
    schoolId: string;
    userId: string;
    searchParams?: ProprietorAnalyticsFilters;
}) {
    try {
        const analytics = await getProprietorAnalytics(searchParams || {}, schoolId);

        return (
            <div className="space-y-6">
                <ExecutiveFilterBar action="/dashboard" filters={analytics.filters} showInsightsLink />

                <ExecutiveSummaryGrid summary={analytics.summary} />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                            <AcademicHealthCard data={analytics.academics} />
                            <AttendanceHealthCard data={analytics.attendance} />
                            <EnrollmentInsightsCard data={analytics.enrollment} />
                            <OperationsHealthCard data={analytics.operations} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <PriorityAlertsCard alerts={analytics.priorityAlerts} filters={analytics.filters} />
                        <Suspense fallback={<RailSkeleton />}>
                            <RecentActivityAsync
                                schoolId={schoolId}
                                userId={userId}
                                isAdmin
                                isTeacher={false}
                            />
                        </Suspense>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-slate-900">Need the full analytics view?</h3>
                                    <p className="text-sm text-slate-600">
                                        Finance, communication, attendance, and operations detail remain available in Insights.
                                    </p>
                                </div>
                                <Link
                                    href="/dashboard/insights"
                                    className="inline-flex shrink-0 items-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
                                >
                                    Open Insights
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Proprietor dashboard temporarily unavailable because the database is busy.", error);

        return (
            <DashboardUnavailableCard
                title="Executive overview unavailable"
                description="The proprietor dashboard could not load because the database connection is temporarily unavailable."
            />
        );
    }
}
