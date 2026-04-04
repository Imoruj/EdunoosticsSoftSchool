import Link from "next/link";
import { buildProprietorQueryString, ProprietorInsightsSection, ResolvedProprietorFilters } from "@/lib/analytics/proprietor";
import { Card, CardContent } from "@/components/ui/Card";

export function ExecutiveFilterBar({
    action,
    filters,
    section,
    showInsightsLink = false,
}: {
    action: "/dashboard" | "/dashboard/insights";
    filters: ResolvedProprietorFilters;
    section?: ProprietorInsightsSection;
    showInsightsLink?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <form action={action} method="GET" className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto] lg:items-end">
                    {section && <input type="hidden" name="section" value={section} />}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Session</label>
                        <select
                            name="sessionId"
                            defaultValue={filters.selectedSessionId || ""}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {filters.sessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                    {session.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Term</label>
                        <select
                            name="termId"
                            defaultValue={filters.selectedTermId || ""}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {filters.terms.map((term) => (
                                <option key={term.id} value={term.id}>
                                    {term.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Arm</label>
                        <select
                            name="classArmId"
                            defaultValue={filters.selectedClassArmId || ""}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All classes</option>
                            {filters.classArms.map((classArm) => (
                                <option key={classArm.id} value={classArm.id}>
                                    {classArm.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                    >
                        Apply Filters
                    </button>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`${action}${section ? `?section=${section}` : ""}`}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Reset
                        </Link>
                        {showInsightsLink && (
                            <Link
                                href={`/dashboard/insights${buildProprietorQueryString(filters, section)}`}
                                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                            >
                                Open Insights
                            </Link>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
