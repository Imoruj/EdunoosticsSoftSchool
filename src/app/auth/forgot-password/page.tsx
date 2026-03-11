import Link from "next/link";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Forgot password?</h1>
                <p className="text-gray-600 text-center mb-6">
                    Password reset is handled by your school administrator. Contact your admin with your registered account details to reset access.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/auth/login"
                        className="block w-full text-center btn-primary py-3"
                    >
                        Back to sign in
                    </Link>
                    <Link
                        href="/auth/register"
                        className="block w-full text-center py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Register a new school
                    </Link>
                </div>
            </div>
        </div>
    );
}
