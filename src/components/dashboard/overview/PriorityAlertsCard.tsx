import Link from "next/link";
import { buildProprietorQueryString, PriorityAlert, ResolvedProprietorFilters } from "@/lib/analytics/proprietor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const severityStyles: Record<PriorityAlert["severity"], string> = {
    high: "border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200",
    medium: "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
    low: "border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200",
};

export function PriorityAlertsCard({
    alerts,
    filters,
}: {
    alerts: PriorityAlert[];
    filters: ResolvedProprietorFilters;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Priority Alerts</CardTitle>
                <CardDescription>Exceptions that need proprietor attention first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-4 text-sm font-medium text-emerald-900 dark:text-emerald-300">
                        No critical issues detected for the selected filters.
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <Link
                            key={alert.id}
                            href={`/dashboard/insights${buildProprietorQueryString(filters, alert.section)}`}
                            className={`block rounded-2xl border px-4 py-4 transition-transform hover:-translate-y-0.5 ${severityStyles[alert.severity]}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold">{alert.title}</p>
                                    <p className="mt-1 text-sm opacity-90">{alert.description}</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {alert.severity}
                                </span>
                            </div>
                        </Link>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
