import Link from "next/link";

const features = [
    {
        title: "Automated Report Cards",
        description:
            "Generate polished report cards with automatic grade computation, class positions, and teacher comments.",
        tone: "bg-primary-100 text-primary-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
        ),
    },
    {
        title: "Nigerian Grading System",
        description:
            "Support WAEC-style A1-F9 grading with configurable CA and exam ratios for different school policies.",
        tone: "bg-emerald-100 text-emerald-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
            </svg>
        ),
    },
    {
        title: "Multi-Role Access",
        description:
            "Separate portals for administrators, teachers, parents, and students with role-based permissions.",
        tone: "bg-amber-100 text-amber-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-1a4 4 0 00-5.9-3.5M9 20H4v-1a4 4 0 015.9-3.5M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
            </svg>
        ),
    },
    {
        title: "Parent Notifications",
        description:
            "Notify families when results are ready and keep communication organized across the academic term.",
        tone: "bg-fuchsia-100 text-fuchsia-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"
                />
            </svg>
        ),
    },
    {
        title: "Holistic Assessment",
        description:
            "Capture psychomotor and affective traits alongside academic performance in one workflow.",
        tone: "bg-cyan-100 text-cyan-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                />
            </svg>
        ),
    },
    {
        title: "Fee and Records Tracking",
        description:
            "Keep fee status, student records, and academic reports aligned without moving between disconnected tools.",
        tone: "bg-rose-100 text-rose-700",
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        ),
    },
];

const stats = [
    { label: "Schools onboarded", value: "500+" },
    { label: "Report cards generated", value: "50k+" },
    { label: "Roles supported", value: "4" },
];

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_24%),linear-gradient(180deg,#1e3a8a_0%,#172554_48%,#020617_100%)]">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-15" />
                <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-24">
                    <nav className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur md:px-6">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-primary-700 shadow-lg shadow-blue-950/30">
                                E
                            </div>
                            <div>
                                <p className="text-lg font-semibold tracking-tight text-white">Edunostics</p>
                                <p className="text-xs text-slate-300">Report Card Management</p>
                            </div>
                        </Link>

                        <div className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
                            <Link href="#features" className="transition hover:text-white">
                                Features
                            </Link>
                            <Link href="#pricing" className="transition hover:text-white">
                                Pricing
                            </Link>
                            <Link href="#contact" className="transition hover:text-white">
                                Contact
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/auth/login"
                                className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                                Login
                            </Link>
                            <Link
                                href="/auth/register"
                                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-slate-100"
                            >
                                Get Started
                            </Link>
                        </div>
                    </nav>

                    <div className="grid gap-12 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-20">
                        <div className="max-w-3xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                Trusted by 500+ Nigerian schools
                            </div>

                            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                                Modern report card software built for Nigerian school operations.
                            </h1>

                            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                                Manage CA and exam grading, psychomotor and affective assessments, parent access,
                                and polished report generation from one system without the spreadsheet chaos.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
                                >
                                    Start Free Trial
                                </Link>
                                <Link
                                    href="#features"
                                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/10"
                                >
                                    Explore Features
                                </Link>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                {stats.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur"
                                    >
                                        <p className="text-2xl font-semibold text-white">{stat.value}</p>
                                        <p className="mt-1 text-sm text-slate-300">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
                            <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-card">
                                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">This Term</p>
                                        <h2 className="text-xl font-semibold">Report Card Overview</h2>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                                        Live
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Grade processing</span>
                                            <span className="font-semibold text-slate-900">92%</span>
                                        </div>
                                        <div className="mt-3 h-2 rounded-full bg-slate-200">
                                            <div className="h-2 w-[92%] rounded-full bg-primary-600" />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <p className="text-sm text-slate-500">Students</p>
                                            <p className="mt-2 text-3xl font-semibold">1,248</p>
                                            <p className="mt-2 text-sm text-emerald-600">+12% this session</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <p className="text-sm text-slate-500">Parents reached</p>
                                            <p className="mt-2 text-3xl font-semibold">97%</p>
                                            <p className="mt-2 text-sm text-primary-700">SMS and email enabled</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 p-4">
                                        <div className="mb-3 flex items-center justify-between text-sm">
                                            <span className="font-medium text-slate-900">Assessment coverage</span>
                                            <span className="text-slate-500">Affective, psychomotor, CA, exams</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {[
                                                { label: "Continuous Assessment", width: "w-[88%]" },
                                                { label: "Examinations", width: "w-[96%]" },
                                                { label: "Psychomotor Skills", width: "w-[82%]" },
                                            ].map((item) => (
                                                <div key={item.label}>
                                                    <div className="mb-1 flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">{item.label}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-slate-200">
                                                        <div className={`h-2 rounded-full bg-cyan-500 ${item.width}`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-700">Features</p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Everything needed to manage report cards without the clutter.
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-600">
                            The homepage styling is now structured around clear spacing, stable containers, and
                            responsive cards so the sections stop colliding as the screen size changes.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {features.map((feature) => (
                            <article
                                key={feature.title}
                                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover"
                            >
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.tone}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="mt-5 text-xl font-semibold text-slate-900">{feature.title}</h3>
                                <p className="mt-3 text-base leading-7 text-slate-600">{feature.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pricing" className="border-y border-slate-200 bg-white py-20">
                <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-700">Pricing</p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                            Start with a guided setup and scale per school.
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-slate-600">
                            The pricing section exists now so the navigation does not point to dead anchors. You can
                            replace this with your actual commercial plans when ready.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-primary-200 bg-primary-50 p-8 text-slate-900 shadow-card">
                        <p className="text-sm font-medium text-primary-700">Starter rollout</p>
                        <p className="mt-3 text-4xl font-semibold">Custom</p>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                            Setup, onboarding, and report template configuration based on school size.
                        </p>
                        <Link
                            href="/auth/register"
                            className="mt-6 inline-flex rounded-full bg-primary-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-800"
                        >
                            Request Access
                        </Link>
                    </div>
                </div>
            </section>

            <section id="contact" className="bg-slate-950 py-20 text-white">
                <div className="mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Ready to modernize report cards for your school?
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                        Cleaned up styling, improved section flow, and responsive spacing are in place. The next step
                        is plugging in your real demo, pricing, and contact channels.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href="/auth/register"
                            className="inline-flex rounded-full bg-cyan-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
                        >
                            Create Account
                        </Link>
                        <Link
                            href="/auth/login"
                            className="inline-flex rounded-full border border-white/20 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/10"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/10 bg-slate-950 py-8 text-slate-400">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-sm sm:px-6 md:flex-row lg:px-8">
                    <p>(c) 2026 Edunostics. Designed for Nigerian schools.</p>
                    <p>Report cards, grading, and school communication in one workflow.</p>
                </div>
            </footer>
        </main>
    );
}
