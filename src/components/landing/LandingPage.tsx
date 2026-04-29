"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useScrolled(threshold = 50) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > threshold);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, [threshold]);
    return scrolled;
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return reduced;
}

function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("va-revealed");
                    observer.unobserve(el);
                }
            },
            { rootMargin: "0px 0px -40px 0px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

function useCounter(target: number, duration = 1800) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started) {
                    setStarted(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        let frame: ReturnType<typeof setTimeout>;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) frame = setTimeout(() => tick(performance.now()), 16);
        };
        tick(performance.now());
        return () => clearTimeout(frame);
    }, [started, target, duration]);

    return { ref, count };
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icon = {
    Table: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
        </svg>
    ),
    CheckCircle: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
        </svg>
    ),
    Document: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
    ),
    Star: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    ),
    Grid: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
    ),
    Mail: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
    ),
    ArrowRight: () => (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
    ),
    Play: () => (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
    ),
    Users: () => (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
};

// ─── BrowserFrame ─────────────────────────────────────────────────────────────

function BrowserFrame({
    children,
    dark = false,
    className = "",
}: {
    children: React.ReactNode;
    dark?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[14px] overflow-hidden shadow-2xl ${className}`}
            style={{
                border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                background: dark ? "#1e293b" : "#f1f5f9",
            }}
        >
            <div
                className="flex items-center gap-2 px-4"
                style={{
                    height: "36px",
                    background: dark ? "#0f172a" : "#e2e8f0",
                    borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                }}
            >
                <span className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                <div
                    className="flex-1 mx-4 rounded-full flex items-center px-3"
                    style={{
                        height: "20px",
                        background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                        fontSize: "10px",
                        color: dark ? "#64748b" : "#94a3b8",
                    }}
                >
                    app.edunostics.ng
                </div>
            </div>
            <div className="overflow-hidden">{children}</div>
        </div>
    );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const bentoFeatures = [
    {
        id: "score",
        title: "Score Entry",
        description: "Enter CA scores, exams, and projects per subject. Auto-calculates totals and grade boundaries instantly.",
        image: "/images/help/score_entry_table.png",
        imageAlt: "Score entry table showing student names, CA scores, exam scores, and calculated totals per subject",
        accentColor: "#f59e0b",
        icon: "Table" as const,
        gridArea: "score",
    },
    {
        id: "attendance",
        title: "Attendance",
        description: "Track daily and subject-level attendance. Automatic percentage calculation per student.",
        image: "/images/help/dashboard_home.png",
        imageAlt: "Attendance tracking dashboard showing daily and subject attendance records",
        accentColor: "#10b981",
        icon: "CheckCircle" as const,
        gridArea: "attendance",
    },
    {
        id: "reports",
        title: "Report Cards",
        description: "Branded PDF report cards with your school logo. One click — all students, any term.",
        image: "/images/help/report_workflow.png",
        imageAlt: "Report card generation workflow showing preview and PDF export options",
        accentColor: "#0284c7",
        icon: "Document" as const,
        gridArea: "reports",
    },
    {
        id: "holistic",
        title: "Holistic Assessment",
        description: "Psychomotor skills, affective domain, and co-curricular activities graded in one place.",
        image: "/images/help/settings_overview.png",
        imageAlt: "Holistic assessment form showing psychomotor skills and affective domain ratings",
        accentColor: "#8b5cf6",
        icon: "Star" as const,
        gridArea: "holistic",
    },
    {
        id: "broadsheet",
        title: "Broadsheet",
        description: "Full-class performance overview. Export to Excel for analysis and archiving.",
        image: "/images/help/dashboard_home.png",
        imageAlt: "Class broadsheet showing all students with their scores across all subjects",
        accentColor: "#f59e0b",
        icon: "Grid" as const,
        gridArea: "broadsheet",
    },
    {
        id: "comms",
        title: "Communications",
        description: "Send SMS and email updates to parents directly from the platform. 97% delivery rate.",
        image: "/images/help/dashboard_home.png",
        imageAlt: "Communications module showing SMS and email composition and delivery status",
        accentColor: "#10b981",
        icon: "Mail" as const,
        gridArea: "comms",
    },
];

const showcases = [
    {
        sectionNumber: "01",
        numberColor: "#f59e0b",
        label: "Score Entry",
        labelBg: "rgba(245,158,11,0.1)",
        labelColor: "#f59e0b",
        headline: ["Enter scores in", "seconds, not hours."],
        body: "Our intelligently structured score entry grid handles CA, exams, projects, and practicals — all in one view. Grade boundaries auto-apply so you spend zero time on calculation errors.",
        bullets: [
            "Configurable CA components (1–4 sub-scores)",
            "Auto-calculated totals with grade assignments",
            "Bulk CSV import for large classes",
        ],
        bulletAccent: "#0284c7",
        image: "/images/help/score_entry_table.png",
        imageAlt: "Score entry table with CA components, exam column, and auto-calculated totals and grades for each student",
        imageRight: true,
        bgColor: "#ffffff",
    },
    {
        sectionNumber: "02",
        numberColor: "#0284c7",
        label: "Report Cards",
        labelBg: "rgba(2,132,199,0.1)",
        labelColor: "#0284c7",
        headline: ["Beautiful reports,", "zero design work."],
        body: "Every report card is branded, professional, and print-ready — automatically. Customize with your school logo, principal signature, and term commentary. Generate all in one click.",
        bullets: [
            "School-branded PDF with custom logo and header",
            "Per-student comment and principal's remark",
            "Batch generate entire class or individual cards",
        ],
        bulletAccent: "#10b981",
        image: "/images/help/report_workflow.png",
        imageAlt: "Report card generation workflow showing branded preview with school logo, student grades, and PDF export button",
        imageRight: false,
        bgColor: "#f8fafc",
    },
    {
        sectionNumber: "03",
        numberColor: "#8b5cf6",
        label: "Holistic Assessment",
        labelBg: "rgba(139,92,246,0.1)",
        labelColor: "#8b5cf6",
        headline: ["Beyond academics —", "the full picture."],
        body: "Nigerian schools assess more than academics. Edunostics covers psychomotor skills, affective domain, club participation, and behavioural ratings — all structured for NERDC-compliant reporting.",
        bullets: [
            "Psychomotor + affective domain rubrics",
            "Club, sport, and co-curricular activities",
            "Behavioural rating scales per student",
        ],
        bulletAccent: "#8b5cf6",
        image: "/images/help/settings_overview.png",
        imageAlt: "Holistic assessment panel showing psychomotor skill ratings, affective domain checkboxes, and activity participation fields",
        imageRight: true,
        bgColor: "#ffffff",
    },
];

const steps = [
    {
        number: "01",
        title: "Set up your school",
        body: "Add your classes, subjects, and academic calendar. Configure grading scales to match your school's system.",
        color: "#0284c7",
        shadowColor: "rgba(2,132,199,0.3)",
    },
    {
        number: "02",
        title: "Enter scores each term",
        body: "Teachers log scores directly into the grade book. CA components, exams, and holistic ratings — all in one workflow.",
        color: "#8b5cf6",
        shadowColor: "rgba(139,92,246,0.3)",
    },
    {
        number: "03",
        title: "Generate and share reports",
        body: "One click produces branded PDFs for every student. Send to parents via SMS or email — or print for distribution.",
        color: "#10b981",
        shadowColor: "rgba(16,185,129,0.3)",
    },
];

const trustBadges = [
    "Primary Schools",
    "Secondary Schools",
    "JSS Classes",
    "SSS Classes",
    "Private Schools",
    "Mission Schools",
];

// ─── StatCounter ──────────────────────────────────────────────────────────────

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
    const { ref, count } = useCounter(target);
    return (
        <div ref={ref} className="flex flex-col items-center gap-2 text-center">
            <span
                className="font-extrabold leading-none tabular-nums"
                style={{
                    fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                    color: "#f59e0b",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    letterSpacing: "-0.03em",
                }}
            >
                {count.toLocaleString()}{suffix}
            </span>
            <span style={{ color: "#94a3b8", fontSize: "0.9375rem", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                {label}
            </span>
        </div>
    );
}

// ─── Reveal Wrapper ───────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useReveal();
    return (
        <div
            ref={ref}
            className={`va-reveal ${className}`}
            style={{ transitionDelay: delay > 0 ? `${delay}ms` : undefined }}
        >
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
    const scrolled = useScrolled(50);
    const reducedMotion = useReducedMotion();

    return (
        <>
            {/* ─── Global Styles ─────────────────────────────────────────── */}
            <style>{`
                *, *::before, *::after { box-sizing: border-box; }

                .va-font { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

                /* Reveal animation */
                .va-reveal {
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
                }
                .va-revealed {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Keyframes */
                @keyframes va-aurora-drift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes va-float-gentle {
                    0%, 100% { transform: perspective(1200px) rotateX(4deg) translateY(0px); }
                    50% { transform: perspective(1200px) rotateX(4deg) translateY(-10px); }
                }
                @keyframes va-glow-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.85; transform: scale(1.04); }
                }
                @keyframes va-glare-sweep {
                    0% { transform: skewX(-20deg) translateX(-200%); opacity: 0; }
                    10% { opacity: 1; }
                    40% { opacity: 1; }
                    55% { transform: skewX(-20deg) translateX(400%); opacity: 0; }
                    100% { transform: skewX(-20deg) translateX(400%); opacity: 0; }
                }
                @keyframes va-chip-float-a {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes va-chip-float-b {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes va-bar-fill {
                    from { width: 0%; }
                    to { width: 82%; }
                }
                @keyframes va-dot-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                /* Reduced motion — disable everything */
                @media (prefers-reduced-motion: reduce) {
                    .va-reveal {
                        opacity: 1;
                        transform: none;
                        transition: none;
                    }
                    .va-revealed {
                        opacity: 1;
                        transform: none;
                    }
                }

                /* Bento grid template areas */
                @media (min-width: 1024px) {
                    .va-bento-grid {
                        display: grid;
                        grid-template-columns: repeat(12, 1fr);
                        grid-template-rows: auto auto auto;
                        grid-template-areas:
                            "score score score score score score score attendance attendance attendance attendance attendance"
                            "score score score score score score score reports reports reports reports reports"
                            "holistic holistic holistic holistic holistic broadsheet broadsheet broadsheet comms comms comms comms";
                        gap: 1rem;
                    }
                    .va-bento-score      { grid-area: score; }
                    .va-bento-attendance { grid-area: attendance; }
                    .va-bento-reports    { grid-area: reports; }
                    .va-bento-holistic   { grid-area: holistic; }
                    .va-bento-broadsheet { grid-area: broadsheet; }
                    .va-bento-comms      { grid-area: comms; }
                }
                @media (max-width: 1023px) {
                    .va-bento-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.875rem;
                    }
                }
                @media (max-width: 639px) {
                    .va-bento-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Connector line for steps */
                .va-step-connector {
                    display: none;
                }
                @media (min-width: 768px) {
                    .va-step-connector {
                        display: block;
                        flex: 1;
                        height: 1px;
                        border-top: 2px dashed rgba(71,85,105,0.35);
                        margin-top: -2.5rem;
                    }
                }

                /* Focus ring */
                :focus-visible {
                    outline: 2px solid #0284c7;
                    outline-offset: 3px;
                    border-radius: 6px;
                }
            `}</style>

            <div className="va-font" style={{ background: "#ffffff", color: "#0f172a" }}>

                {/* ─── Navbar ─────────────────────────────────────────────── */}
                <header
                    role="banner"
                    className="fixed top-0 left-0 right-0 z-50"
                    style={{
                        background: scrolled ? "rgba(5,13,26,0.88)" : "transparent",
                        backdropFilter: scrolled ? "blur(20px)" : "none",
                        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
                        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
                        transition: "background 200ms ease, border-color 200ms ease",
                    }}
                >
                    <div
                        className="mx-auto flex items-center justify-between"
                        style={{ maxWidth: "1200px", padding: "0 1.5rem", height: "64px" }}
                    >
                        {/* Logo */}
                        <Link href="/" aria-label="Edunostics home" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
                            <span
                                className="flex items-center justify-center font-extrabold text-white"
                                style={{
                                    width: "34px", height: "34px", borderRadius: "9px",
                                    background: "linear-gradient(135deg, #10b981 0%, #0284c7 100%)",
                                    fontSize: "1.125rem", letterSpacing: "-0.02em",
                                }}
                            >
                                E
                            </span>
                            <span
                                className="font-bold"
                                style={{ color: "#ffffff", fontSize: "1.0625rem", letterSpacing: "-0.01em" }}
                            >
                                Edunostics
                            </span>
                        </Link>

                        {/* Nav links */}
                        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
                            {["Features", "Workflow", "Pricing"].map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    style={{
                                        color: "rgba(255,255,255,0.75)",
                                        fontSize: "0.9375rem",
                                        fontWeight: 500,
                                        textDecoration: "none",
                                        transition: "color 150ms ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                                >
                                    {item}
                                </a>
                            ))}
                        </nav>

                        {/* CTAs */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/auth/login"
                                style={{
                                    color: "rgba(255,255,255,0.8)",
                                    fontSize: "0.9375rem",
                                    fontWeight: 500,
                                    textDecoration: "none",
                                    padding: "0.5rem 1rem",
                                    minHeight: "44px",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                Log in
                            </Link>
                            <Link
                                href="/auth/register"
                                style={{
                                    background: "#0284c7",
                                    color: "#ffffff",
                                    fontSize: "0.9375rem",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    padding: "0.5625rem 1.25rem",
                                    borderRadius: "9999px",
                                    minHeight: "44px",
                                    display: "flex",
                                    alignItems: "center",
                                    transition: "background 150ms ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#0369a1")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#0284c7")}
                            >
                                Get started
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ─── Hero ───────────────────────────────────────────────── */}
                <section
                    aria-labelledby="hero-heading"
                    style={{
                        background: "#050D1A",
                        paddingTop: "128px",
                        paddingBottom: "80px",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Aurora mesh */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute", inset: 0, zIndex: 0,
                            background: `
                                radial-gradient(ellipse 80% 60% at 20% 20%, rgba(2,132,199,0.18) 0%, transparent 60%),
                                radial-gradient(ellipse 60% 50% at 80% 30%, rgba(139,92,246,0.15) 0%, transparent 55%),
                                radial-gradient(ellipse 70% 60% at 50% 90%, rgba(16,185,129,0.12) 0%, transparent 55%),
                                radial-gradient(ellipse 50% 40% at 10% 80%, rgba(245,158,11,0.08) 0%, transparent 50%)
                            `,
                            animation: reducedMotion ? "none" : "va-aurora-drift 20s ease-in-out infinite",
                            backgroundSize: "400% 400%",
                        }}
                    />
                    {/* SVG noise texture */}
                    <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03, zIndex: 0 }}>
                        <filter id="va-noise">
                            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
                        </filter>
                        <rect width="100%" height="100%" filter="url(#va-noise)"/>
                    </svg>

                    <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem" }}>
                        {/* Eyebrow badge */}
                        <div className="flex justify-center">
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: "rgba(16,185,129,0.12)",
                                    border: "1px solid rgba(16,185,129,0.25)",
                                    borderRadius: "9999px",
                                    padding: "0.375rem 1rem",
                                    marginBottom: "1.75rem",
                                }}
                            >
                                <span
                                    style={{
                                        width: "7px", height: "7px", borderRadius: "50%",
                                        background: "#10b981",
                                        animation: reducedMotion ? "none" : "va-dot-blink 2s ease-in-out infinite",
                                        flexShrink: 0,
                                    }}
                                />
                                <span style={{
                                    color: "#10b981",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                }}>
                                    Nigeria&apos;s #1 school report platform
                                </span>
                            </div>
                        </div>

                        {/* H1 */}
                        <h1
                            id="hero-heading"
                            className="text-center"
                            style={{
                                fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                lineHeight: 1.08,
                                color: "#ffffff",
                                marginBottom: "1.25rem",
                                maxWidth: "800px",
                                marginLeft: "auto",
                                marginRight: "auto",
                            }}
                        >
                            School reports, built for{" "}
                            <span
                                style={{
                                    background: "linear-gradient(90deg, #38bdf8 0%, #8b5cf6 50%, #10b981 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                }}
                            >
                                excellence.
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p
                            className="text-center"
                            style={{
                                fontSize: "1.125rem",
                                color: "#94a3b8",
                                lineHeight: 1.7,
                                maxWidth: "520px",
                                margin: "0 auto 2rem",
                            }}
                        >
                            The complete report card management platform for Nigerian schools — from score entry to branded PDF delivery.
                        </p>

                        {/* CTA row */}
                        <div className="flex flex-wrap justify-center gap-3" style={{ marginBottom: "2.5rem" }}>
                            <Link
                                href="/auth/register"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: "#0284c7",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    fontSize: "1rem",
                                    padding: "0.75rem 1.75rem",
                                    borderRadius: "9999px",
                                    textDecoration: "none",
                                    minHeight: "48px",
                                    transition: "background 150ms ease, transform 150ms ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#0369a1";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#0284c7";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                Start free <Icon.ArrowRight />
                            </Link>
                            <a
                                href="#workflow"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: "rgba(255,255,255,0.08)",
                                    color: "#e2e8f0",
                                    fontWeight: 500,
                                    fontSize: "1rem",
                                    padding: "0.75rem 1.75rem",
                                    borderRadius: "9999px",
                                    textDecoration: "none",
                                    minHeight: "48px",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    transition: "background 150ms ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                            >
                                <Icon.Play /> Watch demo
                            </a>
                        </div>

                        {/* Social proof chips */}
                        <div className="flex flex-wrap justify-center gap-3" style={{ marginBottom: "3.5rem" }}>
                            {[
                                { label: "500+ Schools" },
                                { label: "50k+ Reports" },
                                { label: "97% Parent reach" },
                            ].map(({ label }) => (
                                <div
                                    key={label}
                                    style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "9999px",
                                        padding: "0.375rem 1rem",
                                        color: "#cbd5e1",
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        backdropFilter: "blur(8px)",
                                    }}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Hero browser mockup */}
                        <div style={{ position: "relative", maxWidth: "960px", margin: "0 auto" }}>
                            {/* Glow behind frame */}
                            <div
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    inset: "-20px",
                                    background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(2,132,199,0.25) 0%, transparent 70%)",
                                    animation: reducedMotion ? "none" : "va-glow-pulse 4s ease-in-out infinite",
                                    borderRadius: "32px",
                                    pointerEvents: "none",
                                }}
                            />

                            {/* Floating frame wrapper */}
                            <div
                                style={{
                                    animation: reducedMotion ? "none" : "va-float-gentle 6s ease-in-out infinite",
                                    position: "relative",
                                }}
                            >
                                <BrowserFrame dark>
                                    <div style={{ position: "relative", overflow: "hidden" }}>
                                        <img
                                            src="/images/help/dashboard_home.png"
                                            alt="Edunostics dashboard showing class overview, recent activity, and navigation sidebar"
                                            style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                                        />
                                        {/* Glare sweep */}
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                                                animation: reducedMotion ? "none" : "va-glare-sweep 8s 1s ease-in-out infinite",
                                                pointerEvents: "none",
                                            }}
                                        />
                                    </div>
                                </BrowserFrame>

                                {/* Grade chip (left) */}
                                <div
                                    aria-hidden="true"
                                    className="hidden lg:block"
                                    style={{
                                        position: "absolute",
                                        bottom: "12%",
                                        left: "-4%",
                                        background: "rgba(15,23,42,0.88)",
                                        backdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "14px",
                                        padding: "0.875rem 1rem",
                                        minWidth: "148px",
                                        animation: reducedMotion ? "none" : "va-chip-float-a 7s 1s ease-in-out infinite",
                                        zIndex: 10,
                                    }}
                                >
                                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        Class Avg.
                                    </div>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22d3ee", lineHeight: 1, marginBottom: "0.5rem" }}>
                                        82.4%
                                    </div>
                                    <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                height: "100%",
                                                background: "linear-gradient(90deg, #0284c7, #22d3ee)",
                                                borderRadius: "9999px",
                                                animation: reducedMotion ? "none" : "va-bar-fill 1.6s 0.5s ease-out both",
                                                width: "82%",
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Students chip (right) */}
                                <div
                                    aria-hidden="true"
                                    className="hidden lg:block"
                                    style={{
                                        position: "absolute",
                                        top: "18%",
                                        right: "-4%",
                                        background: "rgba(15,23,42,0.88)",
                                        backdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "14px",
                                        padding: "0.875rem 1rem",
                                        animation: reducedMotion ? "none" : "va-chip-float-b 8s 2.5s ease-in-out infinite",
                                        zIndex: 10,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{
                                            width: "30px", height: "30px", borderRadius: "50%",
                                            background: "linear-gradient(135deg, #10b981, #0284c7)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            color: "white",
                                        }}>
                                            <Icon.Users />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                                                1,240
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                                                Students enrolled
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Trust Strip ────────────────────────────────────────── */}
                <section
                    aria-label="Trusted by schools across Nigeria"
                    style={{
                        background: "#ffffff",
                        borderTop: "1px solid #e2e8f0",
                        borderBottom: "1px solid #e2e8f0",
                        padding: "1.5rem 1.5rem",
                    }}
                >
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: "#94a3b8",
                                marginRight: "0.5rem",
                                whiteSpace: "nowrap",
                            }}>
                                Trusted across Nigeria
                            </span>
                            {trustBadges.map((badge) => (
                                <span
                                    key={badge}
                                    style={{
                                        background: "#f1f5f9",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "9999px",
                                        padding: "0.3125rem 0.875rem",
                                        fontSize: "0.8125rem",
                                        fontWeight: 500,
                                        color: "#475569",
                                    }}
                                >
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Bento Feature Grid ─────────────────────────────────── */}
                <section
                    id="features"
                    aria-labelledby="features-heading"
                    style={{ background: "#f8fafc", padding: "6rem 1.5rem" }}
                >
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        <Reveal>
                            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                                <span style={{
                                    display: "inline-block",
                                    background: "rgba(2,132,199,0.1)",
                                    color: "#0284c7",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    borderRadius: "9999px",
                                    padding: "0.3125rem 0.875rem",
                                    marginBottom: "1rem",
                                }}>
                                    Everything you need
                                </span>
                                <h2
                                    id="features-heading"
                                    style={{
                                        fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                                        fontWeight: 700,
                                        letterSpacing: "-0.02em",
                                        color: "#0f172a",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    One platform. Every workflow.
                                </h2>
                                <p style={{ color: "#475569", fontSize: "1.0625rem", maxWidth: "480px", margin: "0 auto", lineHeight: 1.65 }}>
                                    Built specifically for Nigerian schools — from JSS to SSS, private to mission.
                                </p>
                            </div>
                        </Reveal>

                        <div className="va-bento-grid">
                            {bentoFeatures.map((feature, i) => {
                                const IconComp = Icon[feature.icon];
                                return (
                                    <Reveal key={feature.id} delay={i * 80} className={`va-bento-${feature.id}`}>
                                        <article
                                            style={{
                                                background: "#ffffff",
                                                borderRadius: "1.25rem",
                                                overflow: "hidden",
                                                height: "100%",
                                                border: "1px solid #e2e8f0",
                                                transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
                                                display: "flex",
                                                flexDirection: "column",
                                                borderTop: `3px solid ${feature.accentColor}`,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "translateY(-3px)";
                                                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            <div style={{ flex: 1, overflow: "hidden", minHeight: "160px", maxHeight: "240px" }}>
                                                <img
                                                    src={feature.image}
                                                    alt={feature.imageAlt}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                                                />
                                            </div>
                                            <div style={{ padding: "1.25rem" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                                    <span style={{ color: feature.accentColor }}>
                                                        <IconComp />
                                                    </span>
                                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                                                        {feature.title}
                                                    </h3>
                                                </div>
                                                <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                                                    {feature.description}
                                                </p>
                                            </div>
                                        </article>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ─── Feature Showcases ──────────────────────────────────── */}
                {showcases.map((s, idx) => (
                    <section
                        key={s.sectionNumber}
                        id={idx === 0 ? "workflow" : undefined}
                        aria-labelledby={`showcase-heading-${s.sectionNumber}`}
                        style={{ background: s.bgColor, padding: "5rem 1.5rem", position: "relative", overflow: "hidden" }}
                    >
                        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: s.imageRight ? "row" : "row-reverse",
                                    alignItems: "center",
                                    gap: "4rem",
                                    flexWrap: "wrap",
                                }}
                            >
                                {/* Text */}
                                <div style={{ flex: 1, minWidth: "280px" }}>
                                    <Reveal>
                                        {/* Oversized section number */}
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                fontSize: "8rem",
                                                fontWeight: 800,
                                                color: s.numberColor,
                                                opacity: 0.1,
                                                lineHeight: 1,
                                                marginBottom: "-2rem",
                                                letterSpacing: "-0.05em",
                                                userSelect: "none",
                                            }}
                                        >
                                            {s.sectionNumber}
                                        </div>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                background: s.labelBg,
                                                color: s.labelColor,
                                                fontSize: "0.75rem",
                                                fontWeight: 500,
                                                letterSpacing: "0.12em",
                                                textTransform: "uppercase",
                                                borderRadius: "9999px",
                                                padding: "0.3125rem 0.875rem",
                                                marginBottom: "1.25rem",
                                            }}
                                        >
                                            {s.label}
                                        </span>
                                        <h2
                                            id={`showcase-heading-${s.sectionNumber}`}
                                            style={{
                                                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                                                fontWeight: 700,
                                                letterSpacing: "-0.02em",
                                                color: "#0f172a",
                                                lineHeight: 1.2,
                                                marginBottom: "1rem",
                                            }}
                                        >
                                            {s.headline[0]}<br />{s.headline[1]}
                                        </h2>
                                        <p style={{ color: "#475569", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.75rem", maxWidth: "480px" }}>
                                            {s.body}
                                        </p>
                                        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {s.bullets.map((bullet) => (
                                                <li key={bullet} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                                                    <span style={{ color: s.bulletAccent, marginTop: "2px", flexShrink: 0 }}>
                                                        <Icon.CheckCircle />
                                                    </span>
                                                    <span style={{ color: "#334155", fontSize: "0.9375rem", lineHeight: 1.6 }}>{bullet}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            href="/auth/register"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.375rem",
                                                color: s.labelColor,
                                                fontWeight: 600,
                                                fontSize: "0.9375rem",
                                                textDecoration: "none",
                                                transition: "gap 150ms ease",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.gap = "0.625rem")}
                                            onMouseLeave={(e) => (e.currentTarget.style.gap = "0.375rem")}
                                        >
                                            Get started <Icon.ArrowRight />
                                        </Link>
                                    </Reveal>
                                </div>

                                {/* Visual */}
                                <div style={{ flex: 1, minWidth: "280px" }}>
                                    <Reveal delay={120}>
                                        <BrowserFrame>
                                            <img
                                                src={s.image}
                                                alt={s.imageAlt}
                                                style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                                            />
                                        </BrowserFrame>
                                    </Reveal>
                                </div>
                            </div>
                        </div>
                    </section>
                ))}

                {/* ─── Stats Strip ────────────────────────────────────────── */}
                <section
                    aria-label="Platform statistics"
                    style={{
                        background: "#050D1A",
                        padding: "5rem 1.5rem",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Subtle aurora */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute", inset: 0,
                            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(2,132,199,0.12) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }}
                    />
                    <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                            <StatCounter target={500} suffix="+" label="Schools nationwide" />
                            <StatCounter target={50000} suffix="+" label="Reports generated" />
                            <StatCounter target={97} suffix="%" label="Parent delivery rate" />
                            <StatCounter target={12} suffix="+" label="States covered" />
                        </div>
                    </div>
                </section>

                {/* ─── How It Works ───────────────────────────────────────── */}
                <section
                    id="workflow"
                    aria-labelledby="workflow-heading"
                    style={{ background: "#ffffff", padding: "6rem 1.5rem" }}
                >
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        <Reveal>
                            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
                                <span style={{
                                    display: "inline-block",
                                    background: "rgba(139,92,246,0.1)",
                                    color: "#8b5cf6",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    borderRadius: "9999px",
                                    padding: "0.3125rem 0.875rem",
                                    marginBottom: "1rem",
                                }}>
                                    Simple process
                                </span>
                                <h2
                                    id="workflow-heading"
                                    style={{
                                        fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                                        fontWeight: 700,
                                        letterSpacing: "-0.02em",
                                        color: "#0f172a",
                                    }}
                                >
                                    Up and running in a day.
                                </h2>
                            </div>
                        </Reveal>

                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "2rem" }}>
                            {steps.map((step, i) => (
                                <React.Fragment key={step.number}>
                                    <div style={{ flex: 1, minWidth: "220px" }}>
                                    <Reveal delay={i * 100}>
                                        <div style={{ textAlign: "center", padding: "0 1rem" }}>
                                            <div
                                                style={{
                                                    width: "56px", height: "56px",
                                                    borderRadius: "9999px",
                                                    background: step.color,
                                                    boxShadow: `0 0 0 8px ${step.shadowColor}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    margin: "0 auto 1.25rem",
                                                    color: "#ffffff",
                                                    fontSize: "1rem",
                                                    fontWeight: 800,
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                {step.number}
                                            </div>
                                            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.625rem" }}>
                                                {step.title}
                                            </h3>
                                            <p style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.65, maxWidth: "260px", margin: "0 auto" }}>
                                                {step.body}
                                            </p>
                                        </div>
                                    </Reveal>
                                    </div>
                                    {i < steps.length - 1 && <div className="va-step-connector" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Pricing ────────────────────────────────────────────── */}
                <section
                    id="pricing"
                    aria-labelledby="pricing-heading"
                    style={{ background: "#f8fafc", padding: "6rem 1.5rem" }}
                >
                    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                        <Reveal>
                            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                                <span style={{
                                    display: "inline-block",
                                    background: "rgba(16,185,129,0.1)",
                                    color: "#10b981",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    borderRadius: "9999px",
                                    padding: "0.3125rem 0.875rem",
                                    marginBottom: "1rem",
                                }}>
                                    Pricing
                                </span>
                                <h2
                                    id="pricing-heading"
                                    style={{
                                        fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                                        fontWeight: 700,
                                        letterSpacing: "-0.02em",
                                        color: "#0f172a",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    One plan. Everything included.
                                </h2>
                                <p style={{ color: "#475569", fontSize: "1.0625rem" }}>
                                    Tailored pricing for your school size. No hidden fees.
                                </p>
                            </div>
                        </Reveal>

                        <Reveal delay={80}>
                            <div
                                style={{
                                    background: "#ffffff",
                                    borderRadius: "1.5rem",
                                    border: "2px solid rgba(2,132,199,0.25)",
                                    padding: "2.5rem",
                                    boxShadow: "0 8px 40px rgba(2,132,199,0.08)",
                                }}
                            >
                                <div style={{ marginBottom: "2rem" }}>
                                    <div style={{ fontSize: "1.375rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
                                        School Plan
                                    </div>
                                    <div style={{ color: "#475569", fontSize: "0.9375rem" }}>
                                        Per-term pricing based on student enrolment
                                    </div>
                                </div>

                                <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                                    {[
                                        "Unlimited score entry & report generation",
                                        "Branded PDF reports with school logo",
                                        "Holistic assessment (psychomotor + affective)",
                                        "SMS & email parent communication",
                                        "Class broadsheets & analytics",
                                        "Multi-teacher access with role control",
                                        "Priority support via WhatsApp",
                                    ].map((feature) => (
                                        <div key={feature} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                            <span style={{ color: "#10b981", flexShrink: 0 }}>
                                                <Icon.CheckCircle />
                                            </span>
                                            <span style={{ color: "#334155", fontSize: "0.9375rem" }}>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href="/auth/register"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        background: "#0284c7",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: "1rem",
                                        padding: "0.875rem 1.75rem",
                                        borderRadius: "9999px",
                                        textDecoration: "none",
                                        minHeight: "48px",
                                        transition: "background 150ms ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0369a1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "#0284c7")}
                                >
                                    Request a quote <Icon.ArrowRight />
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ─── CTA ────────────────────────────────────────────────── */}
                <section
                    aria-labelledby="cta-heading"
                    style={{
                        background: "#050D1A",
                        padding: "6rem 1.5rem",
                        position: "relative",
                        overflow: "hidden",
                        textAlign: "center",
                    }}
                >
                    {/* Aurora */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute", inset: 0,
                            background: `
                                radial-gradient(ellipse 70% 60% at 30% 40%, rgba(2,132,199,0.2) 0%, transparent 60%),
                                radial-gradient(ellipse 60% 50% at 70% 60%, rgba(139,92,246,0.15) 0%, transparent 55%)
                            `,
                            pointerEvents: "none",
                        }}
                    />
                    <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative" }}>
                        <Reveal>
                            <h2
                                id="cta-heading"
                                style={{
                                    fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                                    fontWeight: 800,
                                    letterSpacing: "-0.03em",
                                    lineHeight: 1.1,
                                    color: "#ffffff",
                                    marginBottom: "1.25rem",
                                }}
                            >
                                Ready to transform your school&apos;s reporting?
                            </h2>
                            <p style={{ color: "#94a3b8", fontSize: "1.125rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
                                Join 500+ Nigerian schools already using Edunostics to save hours every term and impress parents with professional report cards.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Link
                                    href="/auth/register"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        background: "#0284c7",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: "1rem",
                                        padding: "0.875rem 2rem",
                                        borderRadius: "9999px",
                                        textDecoration: "none",
                                        minHeight: "48px",
                                        transition: "background 150ms ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0369a1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "#0284c7")}
                                >
                                    Get started free <Icon.ArrowRight />
                                </Link>
                                <Link
                                    href="/auth/login"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        background: "rgba(255,255,255,0.08)",
                                        color: "#e2e8f0",
                                        fontWeight: 500,
                                        fontSize: "1rem",
                                        padding: "0.875rem 2rem",
                                        borderRadius: "9999px",
                                        textDecoration: "none",
                                        minHeight: "48px",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        transition: "background 150ms ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                                >
                                    Log in to your school
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ─── Footer ─────────────────────────────────────────────── */}
                <footer
                    role="contentinfo"
                    style={{
                        background: "#030711",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        padding: "3.5rem 1.5rem 2rem",
                    }}
                >
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10" style={{ marginBottom: "3rem" }}>
                            {/* Brand */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                                    <span
                                        style={{
                                            width: "32px", height: "32px", borderRadius: "8px",
                                            background: "linear-gradient(135deg, #10b981, #0284c7)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "1rem", fontWeight: 800, color: "#ffffff",
                                        }}
                                    >
                                        E
                                    </span>
                                    <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "1rem" }}>Edunostics</span>
                                </div>
                                <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: "260px" }}>
                                    Nigeria&apos;s comprehensive report card management system. Built for schools that care about excellence.
                                </p>
                            </div>

                            {/* Platform */}
                            <div>
                                <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
                                    Platform
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                    {["Features", "Pricing", "How it works", "Security"].map((link) => (
                                        <a
                                            key={link}
                                            href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                                            style={{ color: "#64748b", fontSize: "0.9375rem", textDecoration: "none", transition: "color 150ms ease" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                                        >
                                            {link}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Account */}
                            <div>
                                <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
                                    Account
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                    {[
                                        { label: "Log in", href: "/auth/login" },
                                        { label: "Register school", href: "/auth/register" },
                                        { label: "Admin portal", href: "/admin" },
                                    ].map(({ label, href }) => (
                                        <Link
                                            key={label}
                                            href={href}
                                            style={{ color: "#64748b", fontSize: "0.9375rem", textDecoration: "none", transition: "color 150ms ease" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                                        >
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                borderTop: "1px solid rgba(255,255,255,0.06)",
                                paddingTop: "1.5rem",
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "0.75rem",
                            }}
                        >
                            <span style={{ color: "#475569", fontSize: "0.875rem" }}>
                                &copy; {new Date().getFullYear()} Edunostics. All rights reserved.
                            </span>
                            <div style={{ display: "flex", gap: "1.5rem" }}>
                                {["Privacy Policy", "Terms of Service"].map((link) => (
                                    <a
                                        key={link}
                                        href="#"
                                        style={{ color: "#475569", fontSize: "0.875rem", textDecoration: "none", transition: "color 150ms ease" }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                                    >
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
