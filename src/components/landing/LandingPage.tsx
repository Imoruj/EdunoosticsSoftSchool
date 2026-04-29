"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Primary:   #1B4332  forest green — authority, growth, non-SaaS-blue
// Gold:      #C9963E  — used once, for pricing highlight only
// Bg warm:   #FAFAF8  — slightly warm white, not clinical
// Text dark: #0A0A0A
// Text body: #374151
// Text mute: #6B7280
// Border:    #E5E7EB
// ─────────────────────────────────────────────────────────────────────────────

function useScrolled(threshold = 80) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > threshold);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, [threshold]);
    return scrolled;
}

function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("revealed");
                    observer.unobserve(el);
                }
            },
            { rootMargin: "0px 0px -48px 0px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

function useCounter(target: number, duration = 1600) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && !started) { setStarted(true); observer.unobserve(el); } },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [started]);
    useEffect(() => {
        if (!started) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setCount(target);
            return;
        }
        let raf: number;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [started, target, duration]);
    return { ref, count };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useReveal();
    return (
        <div ref={ref} className={`lp-reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
            {children}
        </div>
    );
}

// ─── Inline SVG icons (24px, outline, 1.5 stroke) ────────────────────────────
const Icons = {
    Score: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
        </svg>
    ),
    Report: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>
        </svg>
    ),
    Holistic: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    ),
    Sms: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
    ),
    Broadsheet: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
    ),
    Records: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
    ),
    Check: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    ),
    ArrowRight: () => (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
    ),
};

// ─── Feature card data ────────────────────────────────────────────────────────
const features = [
    {
        icon: "Score" as const,
        title: "Score Entry & Grading",
        body: "Enter CA components, exam scores, and projects in a single grid. Grades compute automatically against your school's boundaries — no formulas, no errors.",
    },
    {
        icon: "Report" as const,
        title: "Report Card Generation",
        body: "One click generates branded PDFs for every student in a class. Principal's remarks, teacher comments, and school logo — all included.",
    },
    {
        icon: "Holistic" as const,
        title: "Holistic Assessment",
        body: "NERDC-aligned psychomotor skills, affective domain ratings, and co-curricular activities — structured for Nigerian primary and secondary schools.",
    },
    {
        icon: "Sms" as const,
        title: "Parent Communication",
        body: "Send term results and school notices via SMS or email directly from the platform. Delivery receipts included.",
    },
    {
        icon: "Broadsheet" as const,
        title: "Class Broadsheets",
        body: "Full-class performance tables with subject averages, class positions, and grade distributions. Export to Excel in one click.",
    },
    {
        icon: "Records" as const,
        title: "Academic Records",
        body: "Every student's historical results stored and searchable. Pull any term's report card from any past session instantly.",
    },
];

// ─── Stat counter ─────────────────────────────────────────────────────────────
function Stat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
    const { ref, count } = useCounter(target);
    return (
        <div ref={ref} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(2.25rem, 4vw, 3rem)", color: "#ffffff", lineHeight: 1, marginBottom: "0.5rem" }}>
                {count.toLocaleString()}{suffix}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9375rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                {label}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    const scrolled = useScrolled();

    return (
        <>
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; }

                body { font-family: 'Inter', system-ui, sans-serif; }

                .lp-serif { font-family: 'DM Serif Display', Georgia, serif; }
                .lp-sans  { font-family: 'Inter', system-ui, sans-serif; }

                /* Single reveal animation — opacity + translateY, nothing else */
                .lp-reveal {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.35s ease-out, transform 0.35s ease-out;
                }
                .lp-reveal.revealed {
                    opacity: 1;
                    transform: none;
                }

                @media (prefers-reduced-motion: reduce) {
                    .lp-reveal { opacity: 1; transform: none; transition: none; }
                }

                /* Desktop nav links */
                @media (min-width: 768px) {
                    .md-show { display: block !important; }
                }

                /* Feature grid */
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1px;
                    background: rgba(255,255,255,0.08);
                }
                @media (max-width: 900px) {
                    .feature-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 560px) {
                    .feature-grid { grid-template-columns: 1fr; }
                }

                /* Showcase row */
                .showcase-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 5rem;
                    align-items: center;
                }
                @media (max-width: 860px) {
                    .showcase-row { grid-template-columns: 1fr; gap: 2.5rem; }
                    .showcase-row-reverse { direction: ltr; }
                }

                /* Stat grid */
                .stat-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 3rem;
                }
                @media (max-width: 700px) {
                    .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 2rem; }
                }

                /* Steps row */
                .steps-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2.5rem;
                }
                @media (max-width: 680px) {
                    .steps-row { grid-template-columns: 1fr; gap: 2rem; }
                }

                /* Hero layout */
                .hero-inner {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4rem;
                    align-items: center;
                }
                @media (max-width: 860px) {
                    .hero-inner { grid-template-columns: 1fr; }
                    .hero-screenshot { display: none; }
                }

                /* Focus */
                :focus-visible { outline: 2px solid #1B4332; outline-offset: 3px; border-radius: 4px; }
            `}</style>

            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <header
                role="banner"
                style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                    background: scrolled ? "#ffffff" : "transparent",
                    borderBottom: scrolled ? "1px solid #E5E7EB" : "none",
                    transition: "background 200ms ease, border-color 200ms ease",
                }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Link href="/" aria-label="Edunostics home" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
                        <span style={{
                            width: "32px", height: "32px", borderRadius: "7px",
                            background: "#1B4332",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'DM Serif Display', Georgia, serif",
                            fontSize: "1.125rem", color: "#ffffff", flexShrink: 0,
                        }}>
                            E
                        </span>
                        <span style={{
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 600, fontSize: "1rem",
                            color: scrolled ? "#0A0A0A" : "#ffffff",
                            transition: "color 200ms ease",
                        }}>
                            Edunostics
                        </span>
                    </Link>

                    <nav aria-label="Main navigation" className="lp-sans" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                        {(["Features", "How it works", "Pricing"] as const).map((label) => (
                            <a
                                key={label}
                                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                                style={{
                                    color: scrolled ? "#374151" : "rgba(255,255,255,0.75)",
                                    fontSize: "0.9375rem", fontWeight: 500,
                                    textDecoration: "none", transition: "color 150ms ease",
                                    display: "none",
                                }}
                                className="md-show"
                                onMouseEnter={e => e.currentTarget.style.color = scrolled ? "#0A0A0A" : "#ffffff"}
                                onMouseLeave={e => e.currentTarget.style.color = scrolled ? "#374151" : "rgba(255,255,255,0.75)"}
                            >
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Link
                            href="/auth/login"
                            style={{
                                color: scrolled ? "#374151" : "rgba(255,255,255,0.8)",
                                fontSize: "0.9375rem", fontWeight: 500,
                                textDecoration: "none", padding: "0.5rem 0.875rem",
                                minHeight: "44px", display: "flex", alignItems: "center",
                                transition: "color 150ms ease",
                            }}
                        >
                            Log in
                        </Link>
                        <Link
                            href="/auth/register"
                            style={{
                                background: scrolled ? "#1B4332" : "#ffffff",
                                color: scrolled ? "#ffffff" : "#1B4332",
                                fontSize: "0.9375rem", fontWeight: 600,
                                textDecoration: "none", padding: "0.5rem 1.125rem",
                                borderRadius: "6px", minHeight: "44px",
                                display: "flex", alignItems: "center",
                                transition: "background 150ms ease, color 150ms ease",
                            }}
                            onMouseEnter={e => {
                                if (scrolled) { e.currentTarget.style.background = "#2D6A4F"; }
                                else { e.currentTarget.style.background = "#f0fdf4"; }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = scrolled ? "#1B4332" : "#ffffff";
                                e.currentTarget.style.color = scrolled ? "#ffffff" : "#1B4332";
                            }}
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <section
                aria-labelledby="hero-heading"
                style={{ background: "#1B4332", paddingTop: "120px", paddingBottom: "80px" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
                    <div className="hero-inner">
                        {/* Text column */}
                        <div>
                            <p style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: "0.75rem", fontWeight: 500,
                                letterSpacing: "0.12em", textTransform: "uppercase",
                                color: "#6EE7B7", marginBottom: "1.5rem",
                            }}>
                                School Management System
                            </p>

                            <h1
                                id="hero-heading"
                                className="lp-serif"
                                style={{
                                    fontSize: "clamp(2.75rem, 5vw, 3.75rem)",
                                    fontStyle: "italic",
                                    fontWeight: 400,
                                    lineHeight: 1.1,
                                    color: "#ffffff",
                                    marginBottom: "1.5rem",
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                End-of-term reports your school can be proud of.
                            </h1>

                            <p style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: "1.0625rem", fontWeight: 400,
                                lineHeight: 1.75, color: "rgba(255,255,255,0.65)",
                                maxWidth: "480px", marginBottom: "2.5rem",
                            }}>
                                Edunostics handles score entry, WAEC-aligned grading, holistic assessment, and branded PDF report cards — built specifically for Nigerian primary and secondary schools.
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginBottom: "3rem" }}>
                                <Link
                                    href="/auth/register"
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                        background: "#ffffff", color: "#1B4332",
                                        fontSize: "0.9375rem", fontWeight: 600,
                                        padding: "0.75rem 1.5rem", borderRadius: "6px",
                                        textDecoration: "none", minHeight: "48px",
                                        transition: "background 150ms ease",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                                    onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                                >
                                    Start for free <Icons.ArrowRight />
                                </Link>
                                <a
                                    href="#how-it-works"
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                        color: "rgba(255,255,255,0.75)",
                                        fontSize: "0.9375rem", fontWeight: 500,
                                        padding: "0.75rem 0.25rem",
                                        textDecoration: "none", minHeight: "48px",
                                        borderBottom: "1px solid rgba(255,255,255,0.25)",
                                        transition: "color 150ms ease, border-color 150ms ease",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                                >
                                    See how it works
                                </a>
                            </div>

                            {/* Context line — specific, not generic marketing */}
                            <p style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: "0.8125rem", color: "rgba(255,255,255,0.62)",
                                lineHeight: 1.6,
                            }}>
                                Used by schools across Lagos, Abuja, and Port Harcourt.
                                <br />No setup fee. Cancel any term.
                            </p>
                        </div>

                        {/* Screenshot column */}
                        <div className="hero-screenshot">
                            <div style={{
                                borderRadius: "12px",
                                overflow: "hidden",
                                boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
                            }}>
                                <img
                                    src="/images/help/dashboard_home.png"
                                    alt="Edunostics dashboard showing class list, student scores, and navigation"
                                    style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── School type strip ───────────────────────────────────────── */}
            <div style={{
                background: "#F0FDF4",
                borderBottom: "1px solid #D1FAE5",
                padding: "1rem 2rem",
            }}>
                <div style={{
                    maxWidth: "1200px", margin: "0 auto",
                    display: "flex", flexWrap: "wrap", alignItems: "center",
                    gap: "1.5rem", justifyContent: "center",
                }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#6B7280", fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Works for
                    </span>
                    {["Primary Schools", "Junior Secondary (JSS)", "Senior Secondary (SSS)", "Private Schools", "Mission Schools"].map(s => (
                        <span key={s} style={{ fontSize: "0.875rem", color: "#1B4332", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Features ────────────────────────────────────────────────── */}
            <section
                id="features"
                aria-labelledby="features-heading"
                style={{ background: "#1B4332", padding: "6rem 0" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem", marginBottom: "3.5rem" }}>
                    <Reveal>
                        <h2
                            id="features-heading"
                            className="lp-serif"
                            style={{
                                fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                                fontStyle: "italic", fontWeight: 400,
                                color: "#ffffff", marginBottom: "0.75rem",
                            }}
                        >
                            Everything your school needs, in one place.
                        </h2>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.0625rem", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: "520px" }}>
                            Built around the actual workflow of Nigerian teachers and school administrators — not adapted from a generic template.
                        </p>
                    </Reveal>
                </div>

                <div className="feature-grid" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
                    {features.map((f, i) => {
                        const IconComp = Icons[f.icon];
                        return (
                            <Reveal key={f.title} delay={i * 60}>
                                <div style={{
                                    background: "#152e24",
                                    padding: "2rem",
                                    height: "100%",
                                }}>
                                    <div style={{ color: "#6EE7B7", marginBottom: "1rem" }}>
                                        <IconComp />
                                    </div>
                                    <h3 className="lp-serif" style={{
                                        fontSize: "1.1875rem", fontWeight: 400,
                                        color: "#ffffff", marginBottom: "0.625rem",
                                        lineHeight: 1.3,
                                    }}>
                                        {f.title}
                                    </h3>
                                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9375rem", lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
                                        {f.body}
                                    </p>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* ── Showcase 1: Score entry → Report cards ──────────────────── */}
            <section
                aria-labelledby="showcase-1-heading"
                style={{ background: "#FAFAF8", padding: "7rem 2rem" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div className="showcase-row">
                        <Reveal>
                            <div>
                                <p style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: "0.75rem", fontWeight: 600,
                                    letterSpacing: "0.1em", textTransform: "uppercase",
                                    color: "#1B4332", marginBottom: "1.25rem",
                                }}>
                                    Score Entry
                                </p>
                                <h2
                                    id="showcase-1-heading"
                                    className="lp-serif"
                                    style={{
                                        fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                                        fontStyle: "italic", fontWeight: 400,
                                        color: "#0A0A0A", lineHeight: 1.2,
                                        marginBottom: "1.25rem",
                                    }}
                                >
                                    From score entry to printed report card in minutes.
                                </h2>
                                <p style={{ color: "#374151", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "2rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                    Teachers enter CA 1, CA 2, exam scores, and project marks in a structured grid. Totals calculate instantly. Grade labels — A1 through F9 — assign automatically based on your school&apos;s grading scale.
                                </p>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                                    {[
                                        "Configure up to 4 CA components per subject",
                                        "Automatic position ranking within each class",
                                        "Bulk CSV upload for large enrolments",
                                    ].map(b => (
                                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                            <span style={{ color: "#1B4332", flexShrink: 0, marginTop: "2px" }}><Icons.Check /></span>
                                            <span style={{ color: "#374151", fontSize: "0.9375rem", lineHeight: 1.6 }}>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/auth/register"
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                        color: "#1B4332", fontWeight: 600, fontSize: "0.9375rem",
                                        textDecoration: "none", fontFamily: "'Inter', system-ui, sans-serif",
                                        borderBottom: "1.5px solid #1B4332", paddingBottom: "1px",
                                        transition: "gap 150ms ease",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.gap = "0.75rem"}
                                    onMouseLeave={e => e.currentTarget.style.gap = "0.5rem"}
                                >
                                    Try it free <Icons.ArrowRight />
                                </Link>
                            </div>
                        </Reveal>

                        <Reveal delay={100}>
                            <div style={{
                                borderRadius: "10px", overflow: "hidden",
                                boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 0 0 1px #E5E7EB",
                            }}>
                                <img
                                    src="/images/help/score_entry_table.png"
                                    alt="Score entry table showing student names with columns for CA1, CA2, Exam, Total, and Grade"
                                    style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                                />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── Showcase 2: Report cards ─────────────────────────────────── */}
            <section
                aria-labelledby="showcase-2-heading"
                style={{ background: "#ffffff", padding: "7rem 2rem", borderTop: "1px solid #E5E7EB" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div className="showcase-row showcase-row-reverse" style={{ direction: "rtl" }}>
                        <Reveal>
                            <div style={{ direction: "ltr" }}>
                                <p style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: "0.75rem", fontWeight: 600,
                                    letterSpacing: "0.1em", textTransform: "uppercase",
                                    color: "#1B4332", marginBottom: "1.25rem",
                                }}>
                                    Report Cards
                                </p>
                                <h2
                                    id="showcase-2-heading"
                                    className="lp-serif"
                                    style={{
                                        fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                                        fontStyle: "italic", fontWeight: 400,
                                        color: "#0A0A0A", lineHeight: 1.2,
                                        marginBottom: "1.25rem",
                                    }}
                                >
                                    Branded PDF reports, generated in one click.
                                </h2>
                                <p style={{ color: "#374151", fontSize: "1.0625rem", lineHeight: 1.75, marginBottom: "2rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                    Every report card carries your school&apos;s logo, principal&apos;s signature, and official stamp. Class teacher remarks and subject comments included. Print-ready, or send directly to parents.
                                </p>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                                    {[
                                        "Generate the entire class or individual students",
                                        "Holistic ratings and psychomotor scores included",
                                        "Supports JSS and SSS result slip formats",
                                    ].map(b => (
                                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                            <span style={{ color: "#1B4332", flexShrink: 0, marginTop: "2px" }}><Icons.Check /></span>
                                            <span style={{ color: "#374151", fontSize: "0.9375rem", lineHeight: 1.6 }}>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/auth/register"
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                        color: "#1B4332", fontWeight: 600, fontSize: "0.9375rem",
                                        textDecoration: "none", fontFamily: "'Inter', system-ui, sans-serif",
                                        borderBottom: "1.5px solid #1B4332", paddingBottom: "1px",
                                        transition: "gap 150ms ease",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.gap = "0.75rem"}
                                    onMouseLeave={e => e.currentTarget.style.gap = "0.5rem"}
                                >
                                    Try it free <Icons.ArrowRight />
                                </Link>
                            </div>
                        </Reveal>

                        <Reveal delay={100}>
                            <div style={{
                                borderRadius: "10px", overflow: "hidden",
                                boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 0 0 1px #E5E7EB",
                                direction: "ltr",
                            }}>
                                <img
                                    src="/images/help/report_workflow.png"
                                    alt="Generated report card preview showing student academic performance, holistic ratings, and school branding"
                                    style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                                />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── Stats ───────────────────────────────────────────────────── */}
            <section
                aria-label="Platform scale"
                style={{ background: "#1B4332", padding: "5rem 2rem" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div className="stat-grid">
                        <Stat target={500} suffix="+" label="Schools onboarded" />
                        <Stat target={50000} suffix="+" label="Reports generated" />
                        <Stat target={97} suffix="%" label="Parent SMS delivery rate" />
                        <Stat target={3} suffix=" terms" label="Average time to full adoption" />
                    </div>
                </div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <section
                id="how-it-works"
                aria-labelledby="hiw-heading"
                style={{ background: "#FAFAF8", padding: "7rem 2rem", borderTop: "1px solid #E5E7EB" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <Reveal>
                        <div style={{ marginBottom: "4rem" }}>
                            <h2
                                id="hiw-heading"
                                className="lp-serif"
                                style={{
                                    fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                                    fontStyle: "italic", fontWeight: 400,
                                    color: "#0A0A0A", marginBottom: "0.75rem",
                                }}
                            >
                                Set up once. Use every term.
                            </h2>
                            <p style={{ color: "#6B7280", fontSize: "1.0625rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                Most schools are fully operational within a single day.
                            </p>
                        </div>
                    </Reveal>

                    <div className="steps-row">
                        {[
                            {
                                n: "1",
                                title: "Configure your school",
                                body: "Add your classes, subjects, and grading scale — WAEC 9-point, percentage, or custom. Upload your school logo. Done in under an hour.",
                            },
                            {
                                n: "2",
                                title: "Enter scores each term",
                                body: "Teachers log CA and exam scores per subject. Holistic ratings, attendance, and remarks fill in alongside academic results.",
                            },
                            {
                                n: "3",
                                title: "Generate and distribute",
                                body: "One click generates PDFs for every student. Download as a ZIP, print in the office, or send directly to parent phones via SMS.",
                            },
                        ].map((step, i) => (
                            <Reveal key={step.n} delay={i * 80}>
                                <div style={{ padding: "2rem", background: "#ffffff", borderRadius: "10px", border: "1px solid #E5E7EB", height: "100%" }}>
                                    <div style={{
                                        width: "40px", height: "40px", borderRadius: "50%",
                                        background: "#1B4332", color: "#ffffff",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontFamily: "'DM Serif Display', Georgia, serif",
                                        fontSize: "1.125rem", marginBottom: "1.25rem",
                                    }}>
                                        {step.n}
                                    </div>
                                    <h3 className="lp-serif" style={{ fontSize: "1.1875rem", fontWeight: 400, color: "#0A0A0A", marginBottom: "0.625rem", lineHeight: 1.3 }}>
                                        {step.title}
                                    </h3>
                                    <p style={{ color: "#374151", fontSize: "0.9375rem", lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
                                        {step.body}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ─────────────────────────────────────────────────── */}
            <section
                id="pricing"
                aria-labelledby="pricing-heading"
                style={{ background: "#ffffff", padding: "7rem 2rem", borderTop: "1px solid #E5E7EB" }}
            >
                <div style={{ maxWidth: "560px", margin: "0 auto" }}>
                    <Reveal>
                        <h2
                            id="pricing-heading"
                            className="lp-serif"
                            style={{
                                fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                                fontStyle: "italic", fontWeight: 400,
                                color: "#0A0A0A", marginBottom: "0.75rem",
                            }}
                        >
                            Priced per term, per school.
                        </h2>
                        <p style={{ color: "#6B7280", fontSize: "1.0625rem", fontFamily: "'Inter', system-ui, sans-serif", marginBottom: "2.5rem" }}>
                            No per-student fees. No add-on modules. One flat rate covers your entire school each term.
                        </p>
                    </Reveal>

                    <Reveal delay={80}>
                        <div style={{
                            border: "1px solid #E5E7EB",
                            borderTop: `3px solid #1B4332`,
                            borderRadius: "10px",
                            padding: "2.5rem",
                            background: "#FAFAF8",
                        }}>
                            <div style={{ marginBottom: "2rem" }}>
                                <div className="lp-serif" style={{ fontSize: "1.375rem", color: "#0A0A0A", marginBottom: "0.375rem" }}>
                                    School Plan
                                </div>
                                <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "0.9375rem", color: "#6B7280" }}>
                                    Quoted based on your student count. Transparent pricing, no surprises.
                                </div>
                            </div>

                            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "2rem" }}>
                                {[
                                    "Unlimited report card generation",
                                    "All subjects and classes included",
                                    "Holistic assessment and broadsheets",
                                    "SMS and email parent notifications",
                                    "Multi-staff access with role control",
                                    "WhatsApp and email support",
                                ].map(f => (
                                    <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                        <span style={{ color: "#1B4332", flexShrink: 0 }}><Icons.Check /></span>
                                        <span style={{ color: "#374151", fontSize: "0.9375rem" }}>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/auth/register"
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                                    background: "#1B4332", color: "#ffffff",
                                    fontWeight: 600, fontSize: "0.9375rem",
                                    textDecoration: "none", padding: "0.875rem 1.5rem",
                                    borderRadius: "6px", minHeight: "48px",
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    transition: "background 150ms ease",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#2D6A4F"}
                                onMouseLeave={e => e.currentTarget.style.background = "#1B4332"}
                            >
                                Request a quote <Icons.ArrowRight />
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <section
                aria-labelledby="cta-heading"
                style={{ background: "#1B4332", padding: "7rem 2rem", textAlign: "center" }}
            >
                <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                    <Reveal>
                        <h2
                            id="cta-heading"
                            className="lp-serif"
                            style={{
                                fontSize: "clamp(2.25rem, 4vw, 3.25rem)",
                                fontStyle: "italic", fontWeight: 400,
                                color: "#ffffff", lineHeight: 1.15,
                                marginBottom: "1.25rem",
                            }}
                        >
                            Start this term with Edunostics.
                        </h2>
                        <p style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "1.0625rem", lineHeight: 1.75,
                            marginBottom: "2.5rem",
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                            Join schools across Nigeria that have replaced manual report writing with a system that works. Setup takes less than a day.
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem" }}>
                            <Link
                                href="/auth/register"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                    background: "#ffffff", color: "#1B4332",
                                    fontWeight: 600, fontSize: "0.9375rem",
                                    padding: "0.875rem 1.75rem", borderRadius: "6px",
                                    textDecoration: "none", minHeight: "48px",
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    transition: "background 150ms ease",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                                onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                            >
                                Get started free <Icons.ArrowRight />
                            </Link>
                            <Link
                                href="/auth/login"
                                style={{
                                    display: "inline-flex", alignItems: "center",
                                    color: "rgba(255,255,255,0.7)", fontSize: "0.9375rem", fontWeight: 500,
                                    padding: "0.875rem 1.75rem",
                                    textDecoration: "none", minHeight: "48px",
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    transition: "color 150ms ease",
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                            >
                                Log in to your school
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer
                role="contentinfo"
                style={{ background: "#0A0A0A", borderTop: "1px solid #1a1a1a", padding: "3.5rem 2rem 2.5rem" }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                                <span style={{
                                    width: "30px", height: "30px", borderRadius: "6px",
                                    background: "#1B4332",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontFamily: "'DM Serif Display', Georgia, serif",
                                    fontSize: "1rem", color: "#ffffff",
                                }}>E</span>
                                <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, color: "#ffffff", fontSize: "0.9375rem" }}>Edunostics</span>
                            </div>
                            <p style={{ color: "#9CA3AF", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: "280px", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                Report card management built for Nigerian schools. NERDC-aligned, term-by-term, trusted by administrators and teachers.
                            </p>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: "1.25rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                Platform
                            </div>
                            {["Features", "How it works", "Pricing"].map(l => (
                                <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, "-")}`} style={{ display: "block", color: "#9CA3AF", fontSize: "0.9375rem", textDecoration: "none", marginBottom: "0.625rem", fontFamily: "'Inter', system-ui, sans-serif", transition: "color 150ms ease" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#E5E7EB"}
                                    onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}>{l}</a>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: "1.25rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                                Account
                            </div>
                            {[{ label: "Log in", href: "/auth/login" }, { label: "Register school", href: "/auth/register" }].map(({ label, href }) => (
                                <Link key={label} href={href} style={{ display: "block", color: "#9CA3AF", fontSize: "0.9375rem", textDecoration: "none", marginBottom: "0.625rem", fontFamily: "'Inter', system-ui, sans-serif", transition: "color 150ms ease" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#E5E7EB"}
                                    onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}>{label}</Link>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                        <span style={{ color: "#9CA3AF", fontSize: "0.8125rem", fontFamily: "'Inter', system-ui, sans-serif" }}>
                            &copy; {new Date().getFullYear()} Edunostics. All rights reserved.
                        </span>
                        <div style={{ display: "flex", gap: "1.5rem" }}>
                            {["Privacy Policy", "Terms of Service"].map(l => (
                                <a key={l} href="#" style={{ color: "#9CA3AF", fontSize: "0.8125rem", textDecoration: "none", fontFamily: "'Inter', system-ui, sans-serif", transition: "color 150ms ease" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#E5E7EB"}
                                    onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}>{l}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
