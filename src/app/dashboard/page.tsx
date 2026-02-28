import Link from "next/link";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 lg:p-8 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                            Welcome back, Admin! 👋
                        </h1>
                        <p className="text-white/80">
                            Here&apos;s what&apos;s happening with your school today.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/reports"
                        className="inline-flex items-center gap-2 bg-white text-primary-600 px-5 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Reports
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <span className="text-sm text-green-600 font-medium">+5.2%</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">1,234</h3>
                    <p className="text-gray-500 text-sm">Total Students</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <span className="text-sm text-green-600 font-medium">+2</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">45</h3>
                    <p className="text-gray-500 text-sm">Teachers</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">18</h3>
                    <p className="text-gray-500 text-sm">Classes</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-500 font-medium">85%</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">15/18</h3>
                    <p className="text-gray-500 text-sm">Reports Published</p>
                </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/scores"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Enter Scores</span>
                        </Link>

                        <Link
                            href="/dashboard/reports"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Generate Reports</span>
                        </Link>

                        <Link
                            href="/dashboard/attendance"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Mark Attendance</span>
                        </Link>

                        <Link
                            href="/dashboard/students/new"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Add Student</span>
                        </Link>
                    </div>
                </div>

                {/* Score Entry Progress */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Entry Progress</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Primary 1A</span>
                                <span className="text-sm text-gray-500">80%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full" style={{ width: "80%" }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Primary 2A</span>
                                <span className="text-sm text-gray-500">65%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full" style={{ width: "65%" }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">JSS 1A</span>
                                <span className="text-sm text-gray-500">45%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: "45%" }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">SSS 3A</span>
                                <span className="text-sm text-gray-500">100%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                            </div>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/scores"
                        className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium mt-4 hover:text-primary-700"
                    >
                        View all classes
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">
                                <span className="font-medium">Mrs. Adebayo</span> completed score entry for{" "}
                                <span className="font-medium">Mathematics - Primary 6A</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">
                                <span className="font-medium">3 new students</span> were registered in{" "}
                                <span className="font-medium">JSS 1B</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">
                                Report cards for <span className="font-medium">SSS 3</span> have been{" "}
                                <span className="font-medium text-green-600">published</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Yesterday</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
