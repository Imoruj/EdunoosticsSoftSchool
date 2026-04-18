import Link from "next/link";

export default function AdminWelcomeBanner() {
    return (
        <div className="card border-0 bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold mb-1">Welcome, Super Admin 👋</h2>
                    <p className="text-primary-100 text-sm">
                        Here&apos;s what&apos;s happening across all schools on the Edunostics platform today.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <Link
                        href="/admin/schools"
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                        Manage Schools
                    </Link>
                </div>
            </div>
        </div>
    );
}
