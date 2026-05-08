import Link from "next/link";

interface PlatformControlsProps {
    signupEnabled: boolean | null;
    darkModeEnabled: boolean | null;
    togglingSignup: boolean;
    togglingDarkMode: boolean;
    toggleSignup: () => void;
    toggleDarkMode: () => void;
    pendingSchoolsCount: number;
}

export default function PlatformControls({
    signupEnabled,
    darkModeEnabled,
    togglingSignup,
    togglingDarkMode,
    toggleSignup,
    toggleDarkMode,
    pendingSchoolsCount,
}: PlatformControlsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Signup Toggle Card */}
            <div className={`card p-5 border-2 ${signupEnabled === false ? "border-orange-200 bg-orange-50" : "border-green-100 bg-green-50"}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${signupEnabled === false ? "bg-orange-100" : "bg-green-100"}`}>
                            <svg className={`w-6 h-6 ${signupEnabled === false ? "text-orange-600" : "text-green-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">New School Registrations</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {signupEnabled === null
                                    ? "Loading…"
                                    : signupEnabled
                                        ? "Registration page is open. New schools can sign up."
                                        : "Registration is closed. New schools cannot sign up."}
                            </p>
                            <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${signupEnabled === false ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                {signupEnabled === null ? "…" : signupEnabled ? "OPEN" : "CLOSED"}
                            </span>
                        </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                        onClick={toggleSignup}
                        disabled={togglingSignup || signupEnabled === null}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 mt-0.5 ${signupEnabled ? "bg-green-500" : "bg-gray-300"}`}
                        role="switch"
                        aria-checked={signupEnabled ?? false}
                        title={signupEnabled ? "Click to disable signup" : "Click to enable signup"}
                    >
                        <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${signupEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
            </div>

            {/* Dark Mode Toggle Card */}
            <div className={`card p-5 border-2 ${darkModeEnabled === false ? "border-gray-200 bg-gray-50" : "border-blue-100 bg-blue-50"}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${darkModeEnabled === false ? "bg-gray-100" : "bg-blue-100"}`}>
                            <svg className={`w-6 h-6 ${darkModeEnabled === false ? "text-gray-500" : "text-blue-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">Dark Mode</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {darkModeEnabled === null
                                    ? "Loading..."
                                    : darkModeEnabled
                                        ? "Users can switch the dashboard between light and dark mode."
                                        : "Dark mode is disabled. Dashboards stay in light mode."}
                            </p>
                            <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${darkModeEnabled === false ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
                                {darkModeEnabled === null ? "..." : darkModeEnabled ? "ENABLED" : "DISABLED"}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        disabled={togglingDarkMode || darkModeEnabled === null}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 mt-0.5 ${darkModeEnabled ? "bg-blue-500" : "bg-gray-300"}`}
                        role="switch"
                        aria-checked={darkModeEnabled ?? false}
                        title={darkModeEnabled ? "Click to disable dark mode" : "Click to enable dark mode"}
                    >
                        <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${darkModeEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
            </div>

            {/* Pending Registrations Summary Card */}
            <div className={`card p-5 border-2 ${pendingSchoolsCount > 0 ? "border-orange-200 bg-orange-50" : "border-gray-100"}`}>
                <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${pendingSchoolsCount > 0 ? "bg-orange-100" : "bg-gray-100"}`}>
                        <svg className={`w-6 h-6 ${pendingSchoolsCount > 0 ? "text-orange-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">Pending Approvals</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {pendingSchoolsCount > 0
                                ? `${pendingSchoolsCount} school registration${pendingSchoolsCount !== 1 ? "s" : ""} awaiting your review`
                                : "No pending school registrations"}
                        </p>
                        {pendingSchoolsCount > 0 && (
                            <Link href="/admin/schools?filter=pending" className="inline-block mt-2 text-xs font-semibold text-orange-700 underline underline-offset-2">
                                View all pending →
                            </Link>
                        )}
                    </div>
                    {pendingSchoolsCount > 0 && (
                        <span className="text-2xl font-bold text-orange-600">{pendingSchoolsCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
