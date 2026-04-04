import Link from "next/link";
import { buildProprietorQueryString, PriorityAlert, ResolvedProprietorFilters } from "@/lib/analytics/proprietor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const severityStyles: Record<PriorityAlert["severity"], string> = {
    high: "border-rose-200 bg-rose-50 text-rose-900",
    medium: "border-amber-200 bg-amber-50 text-amber-900",
    low: "border-sky-200 bg-sky-50 text-sky-900",
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
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-900">
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
