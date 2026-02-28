import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>

                {/* Gradient Orbs */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>

                {/* Navigation */}
                <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 font-bold text-xl">E</span>
                        </div>
                        <span className="text-white font-semibold text-xl">EduCare</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-white/80 hover:text-white transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-white/80 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <Link href="#contact" className="text-white/80 hover:text-white transition-colors">
                            Contact
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/auth/login"
                            className="text-white hover:text-white/80 transition-colors font-medium"
                        >
                            Login
                        </Link>
                        <Link
                            href="/auth/register"
                            className="bg-white text-primary-600 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </nav>

                {/* Hero Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 lg:pt-32 lg:pb-40">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-white/90 text-sm">Trusted by 500+ Nigerian Schools</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            Modern Report Card
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                Management System
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
                            Streamline your school&apos;s academic records with our comprehensive system designed
                            specifically for Nigerian schools. Generate beautiful report cards in seconds.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/auth/register"
                                className="w-full sm:w-auto bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-lg shadow-white/20"
                            >
                                Start Free Trial
                            </Link>
                            <Link
                                href="#demo"
                                className="w-full sm:w-auto flex items-center justify-center gap-2 text-white border border-white/30 px-8 py-4 rounded-xl font-medium hover:bg-white/10 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                                Watch Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className="bg-gray-50 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Manage Report Cards
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Built specifically for Nigerian schools with support for CA/Exam grading,
                            psychomotor skills, and affective domain assessments.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Automated Report Cards
                            </h3>
                            <p className="text-gray-600">
                                Generate beautiful, customizable report cards with automatic grade computation,
                                positions, and teacher comments.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-success-50 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Nigerian Grading System
                            </h3>
                            <p className="text-gray-600">
                                Full support for WAEC-compatible A1-F9 grading scale with configurable
                                CA/Exam ratios (30/70 or 40/60).
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-warning-50 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Multi-Role Access
                            </h3>
                            <p className="text-gray-600">
                                Separate portals for administrators, teachers, parents, and students
                                with role-based permissions.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                SMS & Email Alerts
                            </h3>
                            <p className="text-gray-600">
                                Instant notifications to parents when report cards are ready,
                                with fee reminders and announcements.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Psychomotor & Affective
                            </h3>
                            <p className="text-gray-600">
                                Track student development beyond academics with psychomotor skills
                                and character trait assessments.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="card p-8 hover:shadow-card-hover transition-shadow">
                            <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Fee Management
                            </h3>
                            <p className="text-gray-600">
                                Track fee payments, generate receipts, and send automated reminders
                                with Paystack integration.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-primary-900 py-20">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Modernize Your School&apos;s Report Cards?
                    </h2>
                    <p className="text-lg text-white/70 mb-8">
                        Join hundreds of Nigerian schools already using EduCare to manage their academic records.
                    </p>
                    <Link
                        href="/auth/register"
                        className="inline-block bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all"
                    >
                        Get Started for Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">E</span>
                            </div>
                            <span className="text-white font-semibold">EduCare</span>
                        </div>
                        <p className="text-sm">
                            © 2026 EduCare. Designed for Nigerian Schools.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
