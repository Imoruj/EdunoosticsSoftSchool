"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Particle canvas background ────────────────────────────────────── */
function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;

        interface Particle {
            x: number; y: number; vx: number; vy: number;
            radius: number; opacity: number;
        }
        let particles: Particle[] = [];

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        const init = () => {
            resize();
            particles = [];
            const count = Math.min(Math.floor((canvas.width * canvas.height) / 10000), 110);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    radius: Math.random() * 1.6 + 0.5,
                    opacity: Math.random() * 0.45 + 0.1,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(148,210,255,${p.opacity})`;
                ctx.fill();
            }

            const maxDist = 130;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.18;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(148,210,255,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        init();
        draw();

        const handleResize = () => init();
        window.addEventListener("resize", handleResize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.55 }}
        />
    );
}

/* ─── Browser chrome mockup ─────────────────────────────────────────── */
function BrowserFrame({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_24px_64px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-[1.01]">
            <div className="flex items-center gap-1.5 bg-slate-100 px-4 py-3 border-b border-slate-200">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="ml-3 flex-1 rounded-md bg-white border border-slate-200 px-3 py-1 text-xs text-slate-400">
                    app.edunostics.com/dashboard
                </div>
            </div>
            <img src={src} alt={alt} className="w-full block" />
        </div>
    );
}

/* ─── Animated stat counter ─────────────────────────────────────────── */
function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState(0);
    const triggered = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !triggered.current) {
                triggered.current = true;
                const duration = 1400;
                const steps = 60;
                const interval = duration / steps;
                let step = 0;
                const timer = setInterval(() => {
                    step++;
                    const progress = step / steps;
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.round(eased * value));
                    if (step >= steps) clearInterval(timer);
                }, interval);
            }
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [value]);

    const display = value >= 10000
        ? (count / 1000).toFixed(0) + "k"
        : count.toLocaleString();

    return (
        <div ref={ref} className="text-center">
            <p className="text-5xl sm:text-6xl font-bold text-white tracking-tight tabular-nums">
                {display}{suffix}
            </p>
            <p className="mt-3 text-slate-400 text-sm">{label}</p>
        </div>
    );
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const bentoFeatures = [
    {
        title: "Score Entry",
        description: "Enter CA and exam scores directly or bulk-upload via CSV. Auto-computed totals, grades, and class positions.",
        image: "/images/help/score_entry_table.png",
        accentFrom: "#3B82F6",
        span: "lg:col-span-2",
    },
    {
        title: "Attendance",
        description: "Mark daily attendance with a single tap. Instant class roll-call for teachers.",
        image: "/images/help/attendance_page.png",
        accentFrom: "#10B981",
        span: "lg:col-span-1",
    },
    {
        title: "Report Cards",
        description: "Print-ready, beautifully formatted report cards generated automatically every term.",
        image: "/images/help/reports_list.png",
        accentFrom: "#8B5CF6",
        span: "lg:col-span-1",
    },
    {
        title: "Holistic Assessment",
        description: "Affective and psychomotor traits rated alongside academics — all appear on the final report.",
        image: "/images/help/settings_overview.png",
        accentFrom: "#F43F5E",
        span: "lg:col-span-2",
    },
    {
        title: "Broadsheet",
        description: "Full class-level grade overview for administrators and class teachers.",
        image: "/images/help/dashboard_home.png",
        accentFrom: "#F59E0B",
        span: "lg:col-span-1",
    },
    {
        title: "Parent Communication",
        description: "Notify parents by SMS or email the moment results are published.",
        image: "/images/help/compose_message.png",
        accentFrom: "#06B6D4",
        span: "lg:col-span-2",
    },
];

const showcases = [
    {
        label: "Score Entry",
        headline: "Enter scores for every class in minutes.",
        body: "Upload a CSV or type directly into the grade table. CA components, half-term scores, and exam marks — all in one screen. Totals, grades, and class positions are computed automatically.",
        bullets: ["Bulk CSV upload & manual entry", "Half-term & end-of-term modes", "Real-time grade computation"],
        image: "/images/help/score_entry_table.png",
        imageRight: true,
        badgeColor: "#EFF6FF",
        badgeText: "#2563EB",
        arrowColor: "#2563EB",
    },
    {
        label: "Attendance",
        headline: "Mark attendance in under 60 seconds.",
        body: "One tap per student. Daily records with full historical tracking. Class teachers access their roll-call instantly — no account switching, no extra logins.",
        bullets: ["One-tap daily marking", "Historical attendance records", "Dedicated class teacher portal"],
        image: "/images/help/mark_attendance.png",
        imageRight: false,
        badgeColor: "#ECFDF5",
        badgeText: "#059669",
        arrowColor: "#059669",
    },
    {
        label: "Report Cards",
        headline: "Print-ready report cards. No spreadsheet juggling.",
        body: "Configure your grading template once — scheme, column labels, school logo — then generate reports for the full class with one click. WAEC-style A1–F9 or custom grade bands.",
        bullets: ["Auto-generated class positions", "PDF download & online access", "Parent-accessible report portal"],
        image: "/images/help/report_workflow.png",
        imageRight: true,
        badgeColor: "#F5F3FF",
        badgeText: "#7C3AED",
        arrowColor: "#7C3AED",
    },
    {
        label: "Holistic Assessment",
        headline: "Capture the whole student — not just exam scores.",
        body: "Rate affective traits (punctuality, participation, neatness) and psychomotor skills alongside academic performance. Every rating appears automatically on the final report card.",
        bullets: ["Fully configurable trait categories", "Affective & psychomotor ratings", "Integrated on printed report cards"],
        image: "/images/help/settings_overview.png",
        imageRight: false,
        badgeColor: "#FFF1F2",
        badgeText: "#E11D48",
        arrowColor: "#E11D48",
    },
];

const steps = [
    {
        step: "01",
        title: "Set up your school",
        body: "Add classes, subjects, teachers, and grading rules. Configure your custom report template and branding. Takes about 15 minutes.",
        bg: "#2563EB",
    },
    {
        step: "02",
        title: "Enter scores each term",
        body: "Teachers submit CA and exam marks through the grade table or via CSV upload. Class positions and grades are computed automatically.",
        bg: "#7C3AED",
    },
    {
        step: "03",
        title: "Generate & share reports",
        body: "Print report cards or share a parent-accessible online link with one click. SMS and email notifications are sent automatically.",
        bg: "#0891B2",
    },
];

/* ─── Landing page ───────────────────────────────────────────────────── */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    /* Navbar scroll behavior */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    /* Scroll-reveal IntersectionObserver */
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-visible"); }),
            { threshold: 0.1 }
        );
        const els = document.querySelectorAll(".lp-reveal");
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <style>{`
                @keyframes lp-fade-up {
                    from { opacity: 0; transform: translateY(28px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes lp-orb-pulse {
                    0%, 100% { opacity: 0.18; transform: scale(1); }
                    50%       { opacity: 0.28; transform: scale(1.07); }
                }
                @keyframes lp-dot-pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.35; }
                }
                @keyframes lp-gradient-shift {
                    0%   { background-position: 0%   50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0%   50%; }
                }
                /* Hero mockup — gentle float */
                @keyframes lp-float-a {
                    0%, 100% { transform: translateY(6px); }
                    50%      { transform: translateY(-6px); }
                }
                /* Floating chips — staggered phases */
                @keyframes lp-chip-b {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-7px); }
                }
                @keyframes lp-chip-c {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-9px); }
                }
                /* Glow pulse behind mockup */
                @keyframes lp-glow-pulse {
                    0%, 100% { opacity: 0.45; transform: scale(1); }
                    50%      { opacity: 0.75; transform: scale(1.06); }
                }
                /* Progress bar fill-in */
                @keyframes lp-bar-fill {
                    from { width: 0%; }
                    to   { width: 92%; }
                }
                /* Screen glare sweep */
                @keyframes lp-glare {
                    0%   { transform: translateX(-160%) skewX(-14deg); opacity: 0; }
                    15%  { opacity: 1; }
                    85%  { opacity: 1; }
                    100% { transform: translateX(360%)  skewX(-14deg); opacity: 0; }
                }
                .lp-bar-fill { animation: lp-bar-fill 1.8s 0.5s cubic-bezier(0.4,0,0.2,1) both; }
                .lp-reveal          { opacity: 0; transform: translateY(26px); }
                .lp-reveal.lp-visible { animation: lp-fade-up 0.58s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .lp-d1.lp-visible   { animation-delay: 0.08s; }
                .lp-d2.lp-visible   { animation-delay: 0.16s; }
                .lp-d3.lp-visible   { animation-delay: 0.24s; }
                .lp-d4.lp-visible   { animation-delay: 0.32s; }
                .lp-d5.lp-visible   { animation-delay: 0.40s; }
                .lp-orb             { animation: lp-orb-pulse 7s ease-in-out infinite; }
                .lp-dot             { animation: lp-dot-pulse 2s ease-in-out infinite; }
                .lp-cta-bg {
                    background: linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%);
                    background-size: 200% 200%;
                    animation: lp-gradient-shift 14s ease infinite;
                }
                .lp-card-hover {
                    transition: transform 220ms ease, box-shadow 220ms ease;
                }
                .lp-card-hover:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0,0,0,0.12);
                }
            `}</style>

            <main className="min-h-screen bg-white text-slate-900 antialiased">

                {/* ══ NAVBAR ══════════════════════════════════════════════════ */}
                <header
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                        transition: "background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
                        backgroundColor: scrolled ? "rgba(2,6,23,0.88)" : "transparent",
                        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                        backdropFilter: scrolled ? "blur(16px)" : "none",
                        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.25)" : "none",
                    }}
                >
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <Link href="/" className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-md">
                                    E
                                </div>
                                <span className="text-[15px] font-semibold text-white tracking-tight">Edunostics</span>
                            </Link>

                            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
                                <Link href="#features" className="hover:text-white transition-colors duration-150">Features</Link>
                                <Link href="#how-it-works" className="hover:text-white transition-colors duration-150">How It Works</Link>
                                <Link href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</Link>
                            </nav>

                            <div className="flex items-center gap-2">
                                <Link href="/auth/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2">
                                    Log In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
                                >
                                    Get Started Free
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ══ HERO ════════════════════════════════════════════════════ */}
                <section
                    style={{
                        background: "radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 10%, rgba(6,182,212,0.18) 0%, transparent 45%), linear-gradient(180deg, #020617 0%, #0f172a 60%, #1e3a5f 100%)",
                        position: "relative",
                        overflow: "hidden",
                        paddingTop: "4rem",
                    }}
                >
                    {/* Particle canvas */}
                    <ParticleCanvas />

                    {/* Orbs */}
                    <div className="lp-orb pointer-events-none absolute top-28 left-[15%] h-80 w-80 rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(48px)" }} />
                    <div className="lp-orb pointer-events-none absolute top-40 right-[12%] h-56 w-56 rounded-full"
                        style={{ animationDelay: "3.5s", background: "radial-gradient(circle, rgba(6,182,212,0.45) 0%, transparent 70%)", filter: "blur(40px)" }} />

                    {/* Grid pattern */}
                    <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "url('/grid.svg')", backgroundRepeat: "repeat", opacity: 0.07 }} />

                    <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pt-20 pb-0">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">

                            {/* ── Left: Copy */}
                            <div>
                                {/* Eyebrow */}
                                <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8"
                                    style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                                    <span className="lp-dot h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                    Trusted by 500+ Nigerian schools
                                </div>

                                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] text-white">
                                    The modern report card platform{" "}
                                    <span style={{
                                        background: "linear-gradient(90deg, #67e8f9, #60a5fa)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                    }}>
                                        built for Nigerian schools.
                                    </span>
                                </h1>

                                <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
                                    Manage CA and exam grading, psychomotor and affective assessments, parent access, and polished report generation — all from one system. No spreadsheets.
                                </p>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link
                                        href="/auth/register"
                                        className="inline-flex items-center gap-2 rounded-full text-sm font-bold text-slate-950 transition-colors"
                                        style={{ background: "#67e8f9", padding: "0.875rem 1.75rem", boxShadow: "0 8px 28px rgba(6,182,212,0.28)" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#a5f3fc")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "#67e8f9")}
                                    >
                                        Start for Free
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href="#features"
                                        className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-white transition-colors"
                                        style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", padding: "0.875rem 1.75rem" }}
                                    >
                                        See how it works
                                    </Link>
                                </div>

                                {/* Stats strip */}
                                <div className="mt-12 grid grid-cols-3 gap-3">
                                    {[
                                        { value: "500+", label: "Schools onboarded" },
                                        { value: "50k+", label: "Reports generated" },
                                        { value: "4", label: "User roles" },
                                    ].map((s) => (
                                        <div key={s.label} className="rounded-2xl px-4 py-4 text-center"
                                            style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}>
                                            <p className="text-2xl font-bold text-white">{s.value}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Right: Dashboard preview (animated) */}
                            <div
                                className="relative lg:translate-y-6"
                                style={{ animation: "lp-float-a 6s ease-in-out infinite" }}
                            >
                                {/* Pulsing glow layer behind the frame */}
                                <div
                                    className="pointer-events-none absolute inset-0 rounded-2xl"
                                    style={{
                                        background: "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.35) 0%, transparent 70%)",
                                        filter: "blur(32px)",
                                        animation: "lp-glow-pulse 4s ease-in-out infinite",
                                        zIndex: 0,
                                    }}
                                />

                                {/* Browser chrome */}
                                <div
                                    className="relative rounded-2xl overflow-hidden"
                                    style={{
                                        zIndex: 1,
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
                                    }}
                                >
                                    {/* Title bar */}
                                    <div className="flex items-center gap-1.5 px-4 py-3 border-b"
                                        style={{ background: "#1e293b", borderColor: "rgba(255,255,255,0.08)" }}>
                                        <span className="h-3 w-3 rounded-full" style={{ background: "rgba(248,113,113,0.7)" }} />
                                        <span className="h-3 w-3 rounded-full" style={{ background: "rgba(251,191,36,0.7)" }} />
                                        <span className="h-3 w-3 rounded-full" style={{ background: "rgba(52,211,153,0.7)" }} />
                                        <div className="ml-3 flex-1 rounded-md px-3 py-1 text-xs text-slate-500"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            app.edunostics.com/dashboard
                                        </div>
                                    </div>

                                    {/* Screenshot + glare overlay */}
                                    <div className="relative overflow-hidden">
                                        <img src="/images/help/dashboard_home.png" alt="Edunostics dashboard" className="w-full block" />
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.11) 50%, transparent 62%)",
                                                animation: "lp-glare 6s 1.2s ease-in-out infinite",
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Floating chip — grade processing */}
                                <div
                                    className="absolute -left-6 top-1/3 rounded-2xl px-4 py-3 hidden lg:block"
                                    style={{
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        background: "rgba(15,23,42,0.92)",
                                        backdropFilter: "blur(12px)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                                        animation: "lp-chip-b 7s 1s ease-in-out infinite",
                                        zIndex: 2,
                                    }}
                                >
                                    <p className="text-xs text-slate-400 mb-2">Grade processing</p>
                                    <div className="w-32 h-1.5 rounded-full bg-slate-700">
                                        <div className="lp-bar-fill h-1.5 rounded-full" style={{ background: "#22d3ee" }} />
                                    </div>
                                    <p className="text-xs font-semibold text-white mt-1.5">92% complete</p>
                                </div>

                                {/* Floating chip — students enrolled */}
                                <div
                                    className="absolute -right-4 bottom-20 rounded-2xl px-4 py-3 hidden lg:block"
                                    style={{
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        background: "rgba(15,23,42,0.92)",
                                        backdropFilter: "blur(12px)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                                        animation: "lp-chip-c 8s 2.5s ease-in-out infinite",
                                        zIndex: 2,
                                    }}
                                >
                                    <p className="text-xs text-slate-400">Students enrolled</p>
                                    <p className="text-2xl font-bold text-white mt-1">1,248</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#34d399" }}>+12% this session</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom gradient fade to white */}
                    <div className="relative h-28 mt-12" style={{ background: "linear-gradient(to bottom, transparent, #f8fafc)" }} />
                </section>

                {/* ══ BENTO FEATURE GRID ══════════════════════════════════════ */}
                <section id="features" className="bg-slate-50 pb-24">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                        <div className="lp-reveal text-center mb-14">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#2563EB" }}>
                                Platform · Features
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Every tool a Nigerian school needs<br className="hidden sm:block" /> — in one workflow.
                            </h2>
                            <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                From score entry to parent notifications, every step of academic reporting is covered.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {bentoFeatures.map((f, i) => (
                                <div
                                    key={f.title}
                                    className={`lp-reveal lp-d${Math.min(i + 1, 5)} lp-card-hover ${f.span} rounded-3xl bg-white overflow-hidden group cursor-default`}
                                    style={{
                                        border: "1px solid rgba(0,0,0,0.07)",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    {/* Accent bar */}
                                    <div className="h-1" style={{ background: `linear-gradient(90deg, ${f.accentFrom}, transparent)` }} />

                                    {/* Screenshot thumbnail */}
                                    <div className="overflow-hidden bg-slate-100" style={{ maxHeight: 200 }}>
                                        <img
                                            src={f.image}
                                            alt={f.title}
                                            className="w-full object-cover object-top"
                                            style={{ maxHeight: 200, transition: "transform 500ms ease" }}
                                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                                        />
                                    </div>

                                    <div className="p-6">
                                        <h3 className="font-semibold text-slate-900 text-base">{f.title}</h3>
                                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══ FEATURE SHOWCASES ══════════════════════════════════════ */}
                {showcases.map((s, i) => (
                    <section key={s.label} className={`py-24 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                            <div className="grid lg:grid-cols-2 gap-16 items-center">

                                {/* Text side */}
                                <div className={`lp-reveal ${s.imageRight ? "" : "lg:order-2"}`}>
                                    <span
                                        className="inline-block rounded-full px-3 py-1 text-xs font-semibold mb-5"
                                        style={{ background: s.badgeColor, color: s.badgeText }}
                                    >
                                        {s.label}
                                    </span>
                                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                                        {s.headline}
                                    </h2>
                                    <p className="mt-5 text-lg text-slate-500 leading-relaxed">{s.body}</p>
                                    <ul className="mt-8 space-y-3">
                                        {s.bullets.map((b) => (
                                            <li key={b} className="flex items-center gap-3 text-slate-700 text-sm">
                                                <span
                                                    className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                                                    style={{ background: s.badgeColor }}
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke={s.badgeText} strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </span>
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href="/auth/register"
                                        className="inline-flex items-center gap-2 text-sm font-semibold mt-10 transition-opacity hover:opacity-70"
                                        style={{ color: s.arrowColor }}
                                    >
                                        Get started free
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </Link>
                                </div>

                                {/* Screenshot side */}
                                <div className={`lp-reveal lp-d2 ${s.imageRight ? "" : "lg:order-1"}`}>
                                    <BrowserFrame src={s.image} alt={s.label} />
                                </div>
                            </div>
                        </div>
                    </section>
                ))}

                {/* ══ STATS STRIP ════════════════════════════════════════════ */}
                <section className="py-24" style={{ background: "#020617" }}>
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <div className="lp-reveal text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                Trusted by schools across Nigeria.
                            </h2>
                            <p className="mt-4 text-slate-400 text-lg">Real numbers from real schools using Edunostics.</p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                            <StatCounter value={500} suffix="+" label="Schools onboarded" />
                            <StatCounter value={50000} suffix="+" label="Report cards generated" />
                            <StatCounter value={4} suffix="" label="User roles supported" />
                            <StatCounter value={97} suffix="%" label="Parent reach rate" />
                        </div>
                    </div>
                </section>

                {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
                <section id="how-it-works" className="bg-white py-24">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                        <div className="lp-reveal text-center mb-16">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#2563EB" }}>
                                How It Works
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Set up in a day. Run every term effortlessly.
                            </h2>
                        </div>

                        <div className="relative grid md:grid-cols-3 gap-10">
                            {/* Connector line */}
                            <div className="hidden md:block absolute top-10 h-px bg-slate-200"
                                style={{ left: "calc(16.67% + 1.25rem)", right: "calc(16.67% + 1.25rem)" }} />

                            {steps.map((item, i) => (
                                <div key={item.step} className={`lp-reveal lp-d${i + 1} text-center`}>
                                    <div
                                        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-white text-2xl font-bold mb-6"
                                        style={{
                                            background: item.bg,
                                            boxShadow: `0 8px 28px ${item.bg}40`,
                                        }}
                                    >
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                                    <p className="text-slate-500 leading-relaxed">{item.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══ PRICING ════════════════════════════════════════════════ */}
                <section id="pricing" className="bg-slate-50 py-24">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

                        <div className="lp-reveal text-center mb-14">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#2563EB" }}>
                                Pricing
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                                Transparent pricing that scales with your school.
                            </h2>
                            <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto">
                                No surprise fees. One plan per school, sized to your student population.
                            </p>
                        </div>

                        <div className="max-w-md mx-auto lp-reveal lp-d2">
                            <div className="rounded-3xl bg-white p-10"
                                style={{
                                    border: "2px solid #BFDBFE",
                                    boxShadow: "0 8px 40px rgba(37,99,235,0.10)",
                                }}>
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#2563EB" }}>Custom Plan</p>
                                        <p className="text-5xl font-bold text-slate-900">Custom</p>
                                    </div>
                                    <div className="rounded-2xl px-3 py-1.5 text-sm font-semibold" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                                        Per school
                                    </div>
                                </div>
                                <p className="text-slate-500 leading-relaxed mb-8">
                                    Priced per school based on student population. Includes full setup, onboarding, custom report template configuration, and ongoing support.
                                </p>
                                <ul className="space-y-3 mb-10">
                                    {[
                                        "Unlimited academic sessions & terms",
                                        "Custom report card template design",
                                        "SMS & email parent notifications",
                                        "All 4 user roles included",
                                        "Dedicated onboarding support",
                                    ].map((feat) => (
                                        <li key={feat} className="flex items-center gap-3 text-sm text-slate-700">
                                            <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="#2563EB">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/auth/register"
                                    className="block w-full rounded-full py-3.5 text-center text-sm font-bold text-white transition-colors"
                                    style={{ background: "#2563EB", boxShadow: "0 4px 18px rgba(37,99,235,0.28)" }}
                                >
                                    Request Access →
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ CTA ════════════════════════════════════════════════════ */}
                <section className="lp-cta-bg py-28">
                    <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8 text-center">
                        <div className="lp-reveal">
                            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                                Ready to modernize your<br className="hidden sm:block" /> school's report cards?
                            </h2>
                            <p className="mt-6 text-xl text-slate-400">
                                Join 500+ Nigerian schools already using Edunostics.
                            </p>
                            <div className="mt-10 flex flex-wrap justify-center gap-4">
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center gap-2 rounded-full text-base font-bold text-slate-950 transition-colors"
                                    style={{
                                        background: "#67e8f9",
                                        padding: "1rem 2rem",
                                        boxShadow: "0 8px 28px rgba(6,182,212,0.3)",
                                    }}
                                >
                                    Create Account →
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center gap-2 rounded-full text-base font-medium text-white transition-colors"
                                    style={{
                                        border: "1px solid rgba(255,255,255,0.18)",
                                        background: "rgba(255,255,255,0.05)",
                                        padding: "1rem 2rem",
                                    }}
                                >
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══ FOOTER ══════════════════════════════════════════════════ */}
                <footer style={{ background: "#020617", borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-10">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <Link href="/" className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white">
                                    E
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Edunostics</p>
                                    <p className="text-xs text-slate-600">Built for Nigerian schools</p>
                                </div>
                            </Link>

                            <div className="flex flex-wrap justify-center items-center gap-5 text-sm text-slate-500">
                                <Link href="#features" className="hover:text-slate-300 transition-colors">Features</Link>
                                <span className="text-slate-700">·</span>
                                <Link href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
                                <span className="text-slate-700">·</span>
                                <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Log In</Link>
                                <span className="text-slate-700">·</span>
                                <Link href="/auth/register" className="hover:text-slate-300 transition-colors">Register</Link>
                            </div>

                            <p className="text-xs text-slate-600">© 2026 Edunostics. All rights reserved.</p>
                        </div>
                    </div>
                </footer>

            </main>
        </>
    );
}
