interface RecentSchool {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    createdAt: string;
    isActive: boolean;
    _count: { students: number; users: number; classes: number; subjects: number };
}

interface SchoolBreakdown {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    _count: { students: number; users: number; classes: number; subjects: number; gradingRules: number };
}

interface Stats {
    totalSchools: number;
    activeSchools: number;
    totalStudents: number;
    totalUsers: number;
    totalClasses: number;
    totalSubjects: number;
    totalScores: number;
    recentSchools: RecentSchool[];
    schoolBreakdown: SchoolBreakdown[];
}

interface AdminStatsOverviewProps {
    stats: Stats | null;
    loading: boolean;
}

export default function AdminStatsOverview({ stats, loading }: AdminStatsOverviewProps) {
    const statCards = [
        {
            label: "Total Schools",
            value: stats?.totalSchools ?? 0,
            sub: `${stats?.activeSchools ?? 0} active`,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            iconBg: "bg-blue-50", iconColor: "text-blue-600", border: "border-blue-100",
        },
        {
            label: "Total Students",
            value: stats?.totalStudents ?? 0,
            sub: "Across all schools",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            iconBg: "bg-purple-50", iconColor: "text-purple-600", border: "border-purple-100",
        },
        {
            label: "Platform Users",
            value: stats?.totalUsers ?? 0,
            sub: "Admins, teachers & staff",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            iconBg: "bg-orange-50", iconColor: "text-orange-600", border: "border-orange-100",
        },
        {
            label: "Total Classes",
            value: stats?.totalClasses ?? 0,
            sub: "All class groups",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            iconBg: "bg-cyan-50", iconColor: "text-cyan-600", border: "border-cyan-100",
        },
        {
            label: "Total Subjects",
            value: stats?.totalSubjects ?? 0,
            sub: "Across all schools",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            iconBg: "bg-indigo-50", iconColor: "text-indigo-600", border: "border-indigo-100",
        },
        {
            label: "Score Entries",
            value: stats?.totalScores ?? 0,
            sub: "Total scores recorded",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            ),
            iconBg: "bg-green-50", iconColor: "text-green-600", border: "border-green-100",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {statCards.map((card) => (
                <div key={card.label} className={`card p-5 border ${card.border}`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                            <span className={card.iconColor}>{card.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? (
                                    <span className="inline-block w-14 h-7 bg-gray-100 animate-pulse rounded" />
                                ) : (
                                    card.value.toLocaleString()
                                )}
                            </p>
                            <p className="text-sm font-medium text-gray-600">{card.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{loading ? "…" : card.sub}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
