import Link from "next/link";

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
    schoolBreakdown: SchoolBreakdown[];
}

interface SchoolBreakdownTableProps {
    stats: Stats | null;
    loading: boolean;
}

export default function SchoolBreakdownTable({ stats, loading }: SchoolBreakdownTableProps) {
    const topSchool = stats?.schoolBreakdown?.reduce(
        (a, b) => (a._count.students > b._count.students ? a : b),
        stats.schoolBreakdown[0]
    );

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                    <h3 className="font-semibold text-gray-900">School-by-School Breakdown</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Detailed analytics per school</p>
                </div>
                <Link
                    href="/admin/schools"
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                >
                    Manage
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3">School</th>
                            <th className="px-6 py-3 text-center">Students</th>
                            <th className="px-6 py-3 text-center">Users</th>
                            <th className="px-6 py-3 text-center">Classes</th>
                            <th className="px-6 py-3 text-center">Subjects</th>
                            <th className="px-6 py-3 text-center">Grading Rules</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : !stats?.schoolBreakdown?.length ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                                    No schools registered yet.
                                </td>
                            </tr>
                        ) : (
                            stats.schoolBreakdown.map((school) => {
                                const isTop = topSchool?.id === school.id && stats.schoolBreakdown.length > 1;
                                return (
                                    <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                                                    <span className="text-primary-700 font-bold text-sm">
                                                        {school.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                                        {school.name}
                                                        {isTop && (
                                                            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded font-medium">
                                                                Top
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-gray-800">{school._count.students.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">{school._count.users}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{school._count.classes}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{school._count.subjects}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{school._count.gradingRules}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {new Date(school.createdAt).toLocaleDateString("en-NG", {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${school.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${school.isActive ? "bg-green-500" : "bg-red-500"}`} />
                                                {school.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {!loading && stats?.schoolBreakdown && stats.schoolBreakdown.length > 1 && (
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-700 text-sm">
                                <td className="px-6 py-3">Totals ({stats.schoolBreakdown.length} schools)</td>
                                <td className="px-6 py-3 text-center">{stats.totalStudents.toLocaleString()}</td>
                                <td className="px-6 py-3 text-center">{stats.totalUsers}</td>
                                <td className="px-6 py-3 text-center">{stats.totalClasses}</td>
                                <td className="px-6 py-3 text-center">{stats.totalSubjects}</td>
                                <td className="px-6 py-3 text-center">
                                    {stats.schoolBreakdown.reduce((sum, s) => sum + s._count.gradingRules, 0)}
                                </td>
                                <td className="px-6 py-3" colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
