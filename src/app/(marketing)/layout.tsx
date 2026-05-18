import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HeadingReveal } from "@/components/marketing/HeadingReveal";
import { ScrollProgress } from "@/components/marketing/ScrollProgress";

const footerSections = [
    {
        heading: "Product",
        links: [
            { label: "Overview", href: "/overview" },
            { label: "Assessment", href: "/assessment" },
            { label: "Reports", href: "/reports" },
            { label: "Hardware", href: "/hardware" },
        ],
    },
    {
        heading: "Resources",
        links: [
            { label: "Documentation", href: "/documentation" },
            { label: "Support", href: "/support" },
            { label: "School setup", href: "/school-setup" },
            { label: "Data security", href: "/data-security" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
            { label: "Partners", href: "/partners" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Status", href: "/status" },
            { label: "Security", href: "/security" },
        ],
    },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mkt-layout" style={{ minHeight: "100vh", backgroundColor: "var(--background)", color: "var(--foreground)", fontFamily: "'Plus Jakarta Sans', 'Manrope', system-ui, -apple-system, sans-serif" }}>
            <style>{`
                /* ── Dark mode background ─────────────────────────────── */
                .dark .mkt-layout {
                    background:
                        radial-gradient(circle at 15% 6%, rgba(0,169,154,.14), transparent 22rem),
                        radial-gradient(circle at 85% 10%, rgba(91,45,170,.12), transparent 22rem),
                        #09080d;
                }

                /* ── Header ──────────────────────────────────────────── */
                .mkt-header {
                    background: rgba(255,255,255,0.92);
                    border-bottom: 1px solid var(--border);
                }
                .dark .mkt-header { background: rgba(9,8,13,0.92); }

                /* ── Nav / header buttons ─────────────────────────────── */
                .mkt-book-btn {
                    background: #00A99A;
                    color: #fff;
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 8px 18px; border-radius: 999px;
                    font-weight: 700; font-size: .78rem;
                    text-decoration: none; white-space: nowrap;
                    transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s cubic-bezier(.22,1,.36,1);
                }
                .mkt-book-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(0,169,154,.38); }
                .mkt-book-btn:active { transform: translateY(0) scale(.97); box-shadow: none; }
                .mkt-nav-link {
                    text-decoration: none;
                    color: var(--muted-foreground);
                    font-size: .78rem; font-weight: 600;
                    transition: color .18s;
                }
                .mkt-nav-link:hover { color: var(--foreground); }
                .mkt-signin {
                    text-decoration: none;
                    color: var(--muted-foreground);
                    font-size: .78rem; font-weight: 600;
                    transition: color .18s;
                }
                .mkt-signin:hover { color: var(--foreground); }
                .mkt-footer-link {
                    text-decoration: none;
                    font-size: .82rem;
                    color: var(--muted-foreground);
                    transition: color .18s;
                }
                .mkt-footer-link:hover { color: var(--foreground); }

                /* ── Global pill-button hover (all page CTAs) ─────────── */
                .mkt-layout a[style] {
                    transition: transform .22s cubic-bezier(.22,1,.36,1),
                                box-shadow .22s cubic-bezier(.22,1,.36,1),
                                opacity .18s ease !important;
                }
                .mkt-layout a[style]:hover {
                    transform: translateY(-2px) !important;
                }
                .mkt-layout a[style]:active {
                    transform: translateY(0) scale(.97) !important;
                }

                /* ── Heading reveal animation ─────────────────────────── */
                @keyframes mkt-fade-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes mkt-fade-in {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* Pre-hidden via CSS (no flash before JS) */
                .mkt-layout h1,
                .mkt-layout h2,
                .mkt-layout section p {
                    opacity: 0;
                }

                /* Heading reveals — opacity:1 in cascade beats the hide rule (specificity 0-2-1 > 0-1-1)
                   so elements are always visible once .mkt-revealed lands, even if animation fill fails */
                .mkt-layout h1.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-up .72s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }
                .mkt-layout h2.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-up .65s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }

                /* Paragraph reveal */
                .mkt-layout section p.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-in .55s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }

                /* p inside animated cards: parent handles the animation, p must stay visible */
                .mkt-reveal p {
                    opacity: 1 !important;
                    animation: none !important;
                }

                /* ── Generic element reveal (cards, h3, links) ────────── */
                .mkt-reveal {
                    opacity: 0;
                }
                .mkt-reveal.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-in .6s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }

                /* ── Directional split-column reveals ─────────────────── */
                @keyframes mkt-fade-left {
                    from { opacity: 0; transform: translateX(-28px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes mkt-fade-right {
                    from { opacity: 0; transform: translateX(28px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .mkt-reveal--left.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-left .65s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }
                .mkt-reveal--right.mkt-revealed {
                    opacity: 1;
                    animation: mkt-fade-right .65s cubic-bezier(.22,1,.36,1) var(--mkt-delay, 0s) both;
                }
                /* h1/h2/p inside split columns: the column itself carries the animation */
                .mkt-reveal--left h1, .mkt-reveal--left h2, .mkt-reveal--left p,
                .mkt-reveal--right h1, .mkt-reveal--right h2, .mkt-reveal--right p {
                    opacity: 1 !important;
                    animation: none !important;
                }

                @media (max-width: 768px) {
                    .mkt-nav-links { display: none !important; }
                    .mkt-footer-grid { grid-template-columns: 1fr 1fr !important; }
                }
            `}</style>

            {/* Header */}
            <header className="mkt-header" style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 20, backdropFilter: "blur(18px)" }}>
                <div style={{ width: "min(1180px, calc(100% - 40px))", height: 72, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--foreground)" }}>
                        <div style={{ background: "#00A99A", padding: 6, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src="/images/brand/logo-mark.png" alt="" style={{ height: 22, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
                        </div>
                        <span style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1rem", fontWeight: 700, letterSpacing: "-.01em" }}>Edunostics</span>
                    </Link>

                    <nav className="mkt-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
                        {[
                            ["Platform", "/#platform"],
                            ["Hardware", "/hardware"],
                            ["Insights", "/#insights"],
                            ["Security", "/security"],
                            ["Pricing", "/#pricing"],
                        ].map(([label, href]) => (
                            <Link key={label} href={href} className="mkt-nav-link">{label}</Link>
                        ))}
                    </nav>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <ThemeToggle />
                        <Link href="/auth/login" className="mkt-signin">Sign in</Link>
                        <Link href="/auth/register" className="mkt-book-btn">
                            Book demo <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div style={{ paddingTop: 72 }}>
                <ScrollProgress />
                <HeadingReveal />
                {children}
            </div>

            {/* Footer */}
            <footer style={{ borderTop: "1px solid var(--border)", marginTop: 96, padding: "64px 0 40px", backgroundColor: "var(--muted)" }}>
                <div className="mkt-footer-grid" style={{ width: "min(1180px, calc(100% - 40px))", margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: "48px 32px" }}>
                    <div>
                        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--foreground)", marginBottom: 16 }}>
                            <div style={{ background: "#00A99A", padding: 5, borderRadius: 8, display: "flex" }}>
                                <img src="/images/brand/logo-mark.png" alt="" style={{ height: 18, width: "auto", filter: "brightness(0) invert(1)" }} />
                            </div>
                            <span style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: ".9rem", fontWeight: 700 }}>Edunostics</span>
                        </Link>
                        <p style={{ fontSize: ".78rem", lineHeight: 1.7, color: "var(--muted-foreground)", maxWidth: 220, margin: 0 }}>
                            Educational hardware and software technology for secondary schools.
                        </p>
                    </div>

                    {footerSections.map(({ heading, links }) => (
                        <div key={heading}>
                            <h3 style={{ fontSize: ".64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted-foreground)", margin: "0 0 18px", opacity: .7 }}>{heading}</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                                {links.map(({ label, href }) => (
                                    <Link key={label} href={href} className="mkt-footer-link">{label}</Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ width: "min(1180px, calc(100% - 40px))", margin: "48px auto 0", paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontSize: ".72rem", color: "var(--muted-foreground)", margin: 0, opacity: .7 }}>2026 Edunostics Limited. All rights reserved.</p>
                    <p style={{ fontSize: ".72rem", color: "var(--muted-foreground)", margin: 0, opacity: .7 }}>Built for secondary education in Nigeria.</p>
                </div>
            </footer>
        </div>
    );
}
