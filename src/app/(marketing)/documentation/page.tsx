import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, GraduationCap, Settings, Users } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const guides = [
    {
        Icon: Settings,
        title: "Getting started",
        desc: "Register your school, configure terms, classes, and subjects, and invite your first teachers.",
        links: ["Register your school", "Configure academic terms", "Create classes and subjects", "Invite teachers and staff"],
    },
    {
        Icon: GraduationCap,
        title: "Admin guide",
        desc: "Complete reference for school administrators managing students, reports, and school settings.",
        links: ["Manage students", "Configure grading policy", "Generate report cards", "Publish and share reports"],
    },
    {
        Icon: Users,
        title: "Teacher guide",
        desc: "How teachers enter scores, take attendance, add remarks, and view class performance.",
        links: ["Enter CA scores", "Record exam scores", "Take attendance", "Add teacher remarks"],
    },
    {
        Icon: BookOpen,
        title: "Parent and student guide",
        desc: "How parents and students access their portal, view results, and download report cards.",
        links: ["Access the parent portal", "View student results", "Download report cards", "Update contact details"],
    },
];

export const metadata: Metadata = {
    title: "Documentation — Edunostics User Guides & API Reference",
    description: "Browse Edunostics documentation for administrators, teachers, and developers. Step-by-step guides, feature references, and integration docs.",
    alternates: { canonical: "https://www.edunostics.com/documentation" },
    openGraph: { url: "https://www.edunostics.com/documentation", title: "Documentation | Edunostics", description: "User guides, feature references, and integration docs." },
};

export default function DocumentationPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Documentation</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 680, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Everything you need to get started.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 540, margin: "0 0 40px" }}>
                    Step-by-step guides for every role, from the school administrator setting up classes to the parent downloading their child report card.
                </p>
                <Link href="/school-setup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Start setup guide <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                    {guides.map(({ Icon, title, desc, links }) => (
                        <div key={title} style={{ padding: "36px 32px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Icon size={18} color={teal} />
                                </div>
                                <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{title}</h3>
                            </div>
                            <p style={{ fontSize: ".85rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: "0 0 24px" }}>{desc}</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {links.map(link => (
                                    <div key={link} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".84rem", color: "var(--muted-foreground)" }}>
                                        <ChevronRight size={14} color={teal} />
                                        <span>{link}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", padding: "60px 0" }}>
                <div style={{ ...wrap, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 8px", color: "var(--foreground)" }}>Can not find what you need?</h2>
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", margin: 0 }}>Our support team is ready to help you with setup, configuration, and troubleshooting.</p>
                    </div>
                    <Link href="/support" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 24px", borderRadius: 999, fontWeight: 700, fontSize: ".86rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                        Contact support <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
