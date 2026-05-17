import Link from "next/link";

export default function ForgotPasswordPage() {
    return (
        <main className="ed-page min-h-screen flex items-center justify-center p-6">
            <div className="ed-glass-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 relative">
                {/* Brand accent bar */}
                <div className="h-1.5 bg-gradient-to-r from-[#00A99A] to-[#008f82]" />
                <div className="p-8">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                        <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                    </Link>
                </div>

                <div className="w-14 h-14 bg-[#00A99A] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#00A99A]/30">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 font-['Satoshi',sans-serif]">Forgot password?</h1>
                <p className="text-gray-600 dark:text-white/60 text-center mb-6 font-['Manrope',sans-serif]">
                    Password reset is handled by your school administrator. Contact your admin with your registered account details to reset access.
                </p>

                <div className="space-y-3 font-['Manrope',sans-serif]">
                    <Link
                        href="/auth/login"
                        className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-all bg-gradient-to-r from-[#00A99A] to-[#008f82] hover:from-[#00bdae] hover:to-[#00A99A] shadow-lg shadow-[#00A99A]/20"
                    >
                        Back to sign in
                    </Link>
                    <Link
                        href="/auth/register"
                        className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:text-white transition-all bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
                    >
                        Register a new school
                    </Link>
                </div>
                </div>
            </div>
        </main>
    );
}
