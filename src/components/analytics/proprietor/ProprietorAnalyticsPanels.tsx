import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Activity, CalendarDays, AlertTriangle } from "lucide-react";
import {
    AcademicAnalytics,
    AttendanceAnalytics,
    buildProprietorQueryString,
    CommunicationAnalytics,
    EnrollmentAnalytics,
    FinanceAnalytics,
    OperationsAnalytics,
    ProprietorExecutiveMetrics,
    ProprietorInsightsSection,
    ResolvedProprietorFilters,
} from "@/lib/analytics/proprietor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { formatCurrency } from "@/lib/utils";

function formatPercentage(value: number | null) {
    return value === null ? "N/A" : `${value}%`;
}

function EmptyState({ message }: { message: string }) {
    return <p className="text-sm text-slate-500 dark:text-gray-400">{message}</p>;
}

function RankingList({
    items,
    emptyMessage,
    formatter,
}: {
    items: Array<{ id: string; label: string; value: number; meta?: string; secondaryValue?: number }>;
    emptyMessage: string;
    formatter?: (value: number, secondaryValue?: number) => string;
}) {
    if (items.length === 0) {
        return <EmptyState message={emptyMessage} />;
    }

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{item.label}</p>
                        {item.meta && <p className="text-xs text-slate-500 dark:text-gray-400">{item.meta}</p>}
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-gray-100 whitespace-nowrap">
                        {formatter ? formatter(item.value, item.secondaryValue) : item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function TrendBars({ points }: { points: AttendanceAnalytics["trend"] }) {
    const visiblePoints = points.slice(-10);

    if (visiblePoints.length === 0 || visiblePoints.every((point) => point.total === 0)) {
        return <EmptyState message="No attendance trend data yet." />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between h-32 px-2 border-b border-slate-100 dark:border-gray-700 pb-2">
                {visiblePoints.map((point) => (
                    <div key={point.key} className="flex flex-col items-center gap-2 group flex-1">
                        <div className="relative w-full h-24 flex items-end justify-center">
                            {/* Hover tooltip */}
                            <div className="absolute -top-8 bg-slate-800 text-white text-[9px] font-medium uppercase tracking-wider py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-md">
                                {point.value}%
                            </div>
                            
                            {/* Subtle background track */}
                            <div className="absolute inset-y-0 w-2 md:w-3 bg-slate-50/50 rounded-full" />
                            
                            {/* Filled bar indicator */}
                            <div
                                className={`relative w-2 md:w-3 rounded-full transition-all duration-300 group-hover:bg-primary-600 ${
                                    point.total > 0 
                                        ? "bg-primary-400"
                                        : "bg-slate-200"
                                }`}
                                style={{ height: `${Math.max(point.value, point.total > 0 ? 4 : 4)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-gray-500 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors uppercase tracking-tight">{point.label}</span>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 text-right pr-2">Displaying last 10 evaluated days.</p>
        </div>
    );
}

function WorkflowWidget({ title, items, empty }: { title: string, items: any[], empty: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-primary-200 hover:shadow transition-all group">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{title}</h4>
            {items.length === 0 ? (
                <EmptyState message={empty} />
            ) : (
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {items.map((item: any) => (
                        <div key={item.status} className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase">{item.label}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-gray-100 mt-0.5">{item.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function GapList({ title, gaps, empty, type }: { title: string, gaps: string[], empty: string, type: 'error' | 'warning' }) {
    const isError = type === 'error';
    const bgClass = isError ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50" : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50";
    const textClass = isError ? "text-rose-900 dark:text-rose-200" : "text-amber-900 dark:text-amber-200";
    const iconColor = isError ? "text-rose-500 dark:text-rose-400" : "text-amber-500 dark:text-amber-400";
    const titleClass = isError ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300";
    
    return (
        <div className={`rounded-xl border p-4 ${bgClass}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${titleClass}`}>{title}</h4>
            {gaps.length === 0 ? (
                <p className={`text-sm ${textClass} opacity-80`}>{empty}</p>
            ) : (
                <ul className="space-y-2.5">
                    {gaps.map((gap, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-sm ${textClass}`}>
                            <svg className={`shrink-0 w-4 h-4 mt-0.5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isError 
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                }
                            </svg>
                            <span className="leading-tight font-medium">{gap}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function UnifiedMetrics({ items }: { items: { label: string, value: string | number }[] }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex divide-x divide-slate-100 dark:divide-gray-700 overflow-hidden">
            {items.map((item, i) => (
                <div key={i} className="flex-1 p-4 text-center hover:bg-slate-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">{item.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-gray-100 leading-none">{item.value}</p>
                </div>
            ))}
        </div>
    );
}

function TwinRankings({
    title1, items1, empty1,
    title2, items2, empty2,
    formatter
}: {
    title1: string, items1: any[], empty1: string,
    title2: string, items2: any[], empty2: string,
    formatter?: (val: number, secondary?: number) => string
}) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-gray-700 overflow-hidden">
            <div className="p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">{title1}</h3>
                <RankingList items={items1} emptyMessage={empty1} formatter={formatter} />
            </div>
            <div className="p-4 bg-slate-50/30 dark:bg-gray-900/30">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">{title2}</h3>
                <RankingList items={items2} emptyMessage={empty2} formatter={formatter} />
            </div>
        </div>
    );
}

export function InsightsSectionNav({
    filters,
    activeSection,
}: {
    filters: ResolvedProprietorFilters;
    activeSection: ProprietorInsightsSection;
}) {
    const sections: Array<{ id: ProprietorInsightsSection; label: string }> = [
        { id: "overview", label: "Overview" },
        { id: "enrollment", label: "Enrollment" },
        { id: "academics", label: "Academics" },
        { id: "attendance", label: "Attendance" },
        { id: "finance", label: "Finance" },
        { id: "operations", label: "Operations" },
        { id: "communication", label: "Communication" },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
                const isActive = section.id === activeSection;
                return (
                    <Link
                        key={section.id}
                        href={`/dashboard/insights${buildProprietorQueryString(filters, section.id)}`}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                                ? "bg-primary-600 text-white"
                                : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:border-primary-200 hover:text-primary-700 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        {section.label}
                    </Link>
                );
            })}
        </div>
    );
}

export function ExecutiveSummaryGrid({ summary }: { summary: ProprietorExecutiveMetrics }) {
    const cards = [
        { label: "Active Students", value: summary.activeStudents.toLocaleString(), accent: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-blue-100 dark:ring-blue-800/50" },
        { label: "Active Teachers", value: summary.activeTeachers.toLocaleString(), accent: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-emerald-100 dark:ring-emerald-800/50" },
        { label: "Attendance Snapshot", value: formatPercentage(summary.attendanceRate), accent: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-amber-100 dark:ring-amber-800/50" },
        { label: "Reports Published", value: formatPercentage(summary.reportPublicationRate), accent: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 ring-violet-100 dark:ring-violet-800/50" },
        { label: "Fee Collection", value: formatPercentage(summary.feeCollectionRate), accent: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 ring-cyan-100 dark:ring-cyan-800/50" },
        { label: "Open Actions", value: summary.openActionItems.toLocaleString(), accent: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-rose-100 dark:ring-rose-800/50" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-gray-600 transition-all flex flex-col justify-between">
                    <div className={`inline-flex self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${card.accent}`}>
                        {card.label}
                    </div>
                    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100">{card.value}</p>
                </div>
            ))}
        </div>
    );
}

export function EnrollmentInsightsCard({ data }: { data: EnrollmentAnalytics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Enrollment & Population</CardTitle>
                <CardDescription>Student population, admissions, and class occupancy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <UnifiedMetrics items={[
                    { label: "Active", value: data.activeStudents },
                    { label: "Inactive", value: data.inactiveStudents },
                    { label: "New", value: data.newAdmissions },
                ]} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">Gender Distribution</h3>
                        <div className="flex gap-4">
                            {data.genderDistribution.length === 0 ? <EmptyState message="No gender data" /> : 
                             data.genderDistribution.map((entry) => (
                                <div key={entry.label} className="flex-1 rounded-lg bg-slate-50 dark:bg-gray-700 px-4 py-3 border border-slate-100 dark:border-gray-600 text-center">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 block mb-1">{entry.label}</span>
                                    <span className="text-xl font-bold text-slate-900 dark:text-gray-100">{entry.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">Highest Occupancy</h3>
                        <RankingList
                            items={data.occupancy.slice(0, 5)}
                            emptyMessage="No class occupancy data yet."
                            formatter={(value, secondaryValue) => `${value}/${secondaryValue}`}
                        />
                    </div>
                </div>

                <TwinRankings 
                    title1="Largest Classes" items1={data.largestClasses} empty1="No class data yet."
                    title2="Smallest Classes" items2={data.smallestClasses} empty2="No class data yet."
                />
            </CardContent>
        </Card>
    );
}

export function AcademicHealthCard({ data }: { data: AcademicAnalytics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Academic Health</CardTitle>
                <CardDescription>Score workflow completion, report publishing, and performance ranking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Score Workflow Completion</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-gray-100">{formatPercentage(data.scoreWorkflowCompletionRate)}</span>
                        </div>
                        <Progress value={data.scoreWorkflowCompletionRate || 0} className="h-2" />
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">Reports Published</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-gray-100">
                                {data.publishedReports}/{data.totalReports}
                            </span>
                        </div>
                        <Progress value={data.publishedReportRate || 0} className="h-2" />
                    </div>
                </div>

                <TwinRankings 
                    title1="Strongest Classes" items1={data.strongestClasses} empty1="No class score data yet."
                    title2="Weakest Classes" items2={data.weakestClasses} empty2="No class score data yet."
                    formatter={(value) => `${value}%`}
                />

                <TwinRankings 
                    title1="Strongest Subjects" items1={data.strongestSubjects} empty1="No subject score data yet."
                    title2="Weakest Subjects" items2={data.weakestSubjects} empty2="No subject score data yet."
                    formatter={(value) => `${value}%`}
                />
            </CardContent>
        </Card>
    );
}

export function AttendanceHealthCard({ data }: { data: AttendanceAnalytics }) {
    const rateDiff = (data.attendanceRate ?? 0) - (data.termAverageRate ?? 0);
    const isRateUp = rateDiff >= 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start lg:items-center justify-between pb-2 space-y-0">
                <div>
                    <CardTitle>Attendance & Welfare</CardTitle>
                    <CardDescription>Systemic Health as of {data.snapshotLabel}</CardDescription>
                </div>
                {data.classesMissingAttendance.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {data.classesMissingAttendance.length} <span className="hidden lg:inline">Classes Missing Attendance</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
                
                {/* 1. Executive Snapshot Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:border-slate-300 dark:hover:border-gray-600 transition-all flex flex-col justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">Today's Rate</p>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 leading-none">{formatPercentage(data.attendanceRate)}</span>
                            {data.termAverageRate !== null && (
                                <span className={`flex items-center text-xs font-semibold ${isRateUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isRateUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                                    {Math.abs(rateDiff).toFixed(1)}% vs Term
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:border-slate-300 dark:hover:border-gray-600 transition-all flex flex-col justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">Students Present</p>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 leading-none">{data.presentCount.toLocaleString()}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:border-rose-200 transition-all flex flex-col justify-between group">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2 group-hover:text-rose-600 transition-colors">Total Absent</p>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 leading-none">{data.absentCount.toLocaleString()}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:border-amber-200 transition-all flex flex-col justify-between group">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2 group-hover:text-amber-600 transition-colors">Late Arrivals</p>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 leading-none">{data.lateCount.toLocaleString()}</span>
                    </div>
                </div>

                {/* 2. Systemic Class Performance */}
                <TwinRankings 
                    title1="Highest Attendance Classes (Term)" items1={data.bestClasses} empty1="No class data available yet."
                    title2="Lowest Attendance Classes (Term)" items2={data.worstClasses} empty2="No class data available yet."
                    formatter={(value) => `${value}%`}
                />

                {/* 3. Risk Management Component */}
                <div className="grid gap-4 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-2 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-950/20 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Chronic Absentee Watchlist <span className="opacity-70">(&lt;75% Attendance)</span></h3>
                        </div>
                        
                        <RankingList 
                            items={data.chronicAbsentees.map(s => ({ id: s.id, label: s.name, meta: s.classLabel, value: s.attendanceRate }))} 
                            emptyMessage="No students currently meet the chronic absenteeism threshold." 
                            formatter={v => `${v}%`} 
                        />
                    </div>
                    
                    {/* Small Operational alerts panel if missing classes exist, else placeholder / additional metric */}
                    {data.classesMissingAttendance.length > 0 ? (
                        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Pending Registers</h3>
                            </div>
                            <div className="space-y-2">
                                {data.classesMissingAttendance.slice(0, 5).map((gap, i) => (
                                    <div key={i} className="flex items-start gap-2.5 text-sm text-amber-900 dark:text-amber-200">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                        <span className="leading-tight font-medium">{gap}</span>
                                    </div>
                                ))}
                                {data.classesMissingAttendance.length > 5 && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold pt-1">+{data.classesMissingAttendance.length - 5} more classes</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">All Registers Submitted</h3>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Attendance data is 100% complete for {data.snapshotLabel}.</p>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}

export function FinanceHealthCard({ data }: { data: FinanceAnalytics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Finance Overview</CardTitle>
                <CardDescription>Collections and payment mix for the selected term.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <UnifiedMetrics items={[
                    { label: "Billed", value: formatCurrency(data.billedAmount) },
                    { label: "Collected", value: formatCurrency(data.collectedAmount) },
                    { label: "Outstanding", value: formatCurrency(data.outstandingAmount) },
                ]} />

                <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Collection Rate</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-gray-100">{formatPercentage(data.collectionRate)}</span>
                    </div>
                    <Progress value={data.collectionRate || 0} className="h-2" />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4">Payment Methods</h3>
                    {data.paymentMethods.length === 0 ? (
                        <EmptyState message="No fee payments recorded yet." />
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {data.paymentMethods.map((method) => (
                                <div key={method.label} className="flex-1 min-w-[150px] rounded-lg bg-slate-50 dark:bg-gray-700 px-4 py-3 border border-slate-100 dark:border-gray-600 text-center">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">{method.label}</p>
                                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-gray-100">{formatCurrency(method.amount)}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{method.count} payment(s)</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <TwinRankings 
                    title1="Best Paying Classes" items1={data.bestCollections} empty1="No class collection data yet."
                    title2="Lowest Paying Classes" items2={data.weakestCollections} empty2="No class collection data yet."
                    formatter={(value) => `${value}%`}
                />
            </CardContent>
        </Card>
    );
}

export function OperationsHealthCard({ data }: { data: OperationsAnalytics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Operations & Compliance</CardTitle>
                <CardDescription>Workflow backlog, pending requests, and staffing gaps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Workflows Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700 pb-2">Workflows & Requests</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <WorkflowWidget title="Score Upload Requests" items={data.scoreUploadRequests} empty="No upload workflow data yet." />
                        <WorkflowWidget title="Score Review Workflow" items={data.scoreWorkflows} empty="No score review workflow data yet." />
                        <WorkflowWidget title="Class Report Workflow" items={data.classReportWorkflows} empty="No class report workflow data yet." />
                        <WorkflowWidget title="Student Report Workflow" items={data.studentReportWorkflows} empty="No student report workflow data yet." />
                        <WorkflowWidget title="Scheme Of Work Approval" items={data.schemeOfWorkTerms} empty="No scheme of work approval data yet." />
                        <WorkflowWidget title="Student Change Requests" items={data.studentChangeRequests} empty="No student change request data yet." />
                    </div>
                </div>

                {/* Staffing Gaps Section */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700 pb-2">Staffing & Compliance Alerts</h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <GapList title="Class Teacher Gaps" gaps={data.classTeacherGaps} empty="All visible class arms have class teachers." type="error" />
                        <GapList title="Subject Teacher Gaps" gaps={data.subjectTeacherGaps} empty="No uncovered subject-teacher gaps for the selected filters." type="warning" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function CommunicationHealthCard({ data }: { data: CommunicationAnalytics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Communication Overview</CardTitle>
                <CardDescription>Last 30 days of delivery activity by channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <UnifiedMetrics items={[
                    { label: "Total", value: data.totalMessages },
                    { label: "Sent", value: data.sentMessages },
                    { label: "Failed", value: data.failedMessages },
                    { label: "Success Rate", value: formatPercentage(data.successRate) },
                ]} />

                {data.channels.length === 0 ? (
                    <EmptyState message="No communication records were found in the last 30 days." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.channels.map((channel) => (
                            <div key={channel.channel} className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 group hover:border-primary-200 transition-colors">
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{channel.channel}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-gray-300">Total</span>
                                        <span className="font-bold text-slate-900 dark:text-gray-100">{channel.total}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-gray-300">Sent</span>
                                        <span className="font-bold text-emerald-600">{channel.sent}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-gray-300">Failed</span>
                                        <span className="font-bold text-rose-600">{channel.failed}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-gray-300">Pending</span>
                                        <span className="font-bold text-amber-600">{channel.pending}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
