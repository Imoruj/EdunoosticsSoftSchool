import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
    AcademicHealthCard,
    AttendanceHealthCard,
    CommunicationHealthCard,
    EnrollmentInsightsCard,
    ExecutiveSummaryGrid,
    FinanceHealthCard,
    InsightsSectionNav,
    OperationsHealthCard,
} from "@/components/analytics/proprietor/ProprietorAnalyticsPanels";
import { ExecutiveFilterBar } from "@/components/dashboard/overview/ExecutiveFilterBar";
import { DashboardUnavailableCard } from "@/components/dashboard/overview/DashboardUnavailableCard";
import { PriorityAlertsCard } from "@/components/dashboard/overview/PriorityAlertsCard";
import { authOptions } from "@/lib/auth";
import { getProprietorAnalytics, ProprietorAnalyticsFilters } from "@/lib/analytics/proprietor";
import { isExecutiveViewer } from "@/lib/rbac";
import { isTransientPrismaError } from "@/lib/prisma-transient";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export default async function InsightsPage({
    searchParams,
}: {
    searchParams?: Promise<ProprietorAnalyticsFilters>;
}) {
    const filters = (await searchParams) || {};
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    if (!isExecutiveViewer(session.user)) {
        redirect("/dashboard");
    }

    const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
    if (!schoolId) {
        redirect("/dashboard");
    }

    try {
        const analytics = await getProprietorAnalytics(filters, schoolId);

        const showOverview = analytics.section === "overview";

        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Insights</h1>
                    <p className="text-sm font-medium text-slate-500">
                        Read-only school analytics for proprietor and executive users.
                    </p>
                </div>

                <ExecutiveFilterBar
                    action="/dashboard/insights"
                    filters={analytics.filters}
                    section={analytics.section}
                />

                <InsightsSectionNav filters={analytics.filters} activeSection={analytics.section} />

                <div className="space-y-6">
                    {showOverview && <ExecutiveSummaryGrid summary={analytics.summary} />}
                    {showOverview && (
                        <PriorityAlertsCard alerts={analytics.priorityAlerts} filters={analytics.filters} />
                    )}
                    {analytics.section === "enrollment" && (
                        <EnrollmentInsightsCard data={analytics.enrollment} />
                    )}
                    {analytics.section === "academics" && (
                        <AcademicHealthCard data={analytics.academics} />
                    )}
                    {analytics.section === "attendance" && (
                        <AttendanceHealthCard data={analytics.attendance} />
                    )}
                    {analytics.section === "finance" && (
                        <FinanceHealthCard data={analytics.finance} />
                    )}
                    {analytics.section === "operations" && (
                        <OperationsHealthCard data={analytics.operations} />
                    )}
                    {analytics.section === "communication" && (
                        <CommunicationHealthCard data={analytics.communication} />
                    )}
                </div>
            </div>
        );
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Executive insights temporarily unavailable because the database is busy.", error);

        return (
            <div className="max-w-7xl mx-auto">
                <DashboardUnavailableCard
                    title="Executive insights unavailable"
                    description="The analytics view could not load because the database connection is temporarily unavailable."
                />
            </div>
        );
    }
}
