import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, LayoutGrid, Printer, ScrollText, Sparkles } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const reportTypes = [
    { Icon: FileText, title: "Term report cards", body: "Generate individual student report cards per term with CA scores, exam scores, total, grade, position, class average, remarks, and teacher comments." },
    { Icon: LayoutGrid, title: "Class broadsheets", body: "View and export full-class performance summaries across all subjects. Identify patterns, outliers, and subject-level results at a glance." },
    { Icon: ScrollText, title: "Transcripts", body: "Produce official cumulative academic records spanning multiple sessions and terms, formatted for secondary school leavers and transfer applications." },
    { Icon: Printer, title: "Print-ready output", body: "Every report is print-optimised and digitally shareable. Send directly to parents or print from any device with a single click." },
    { Icon: Sparkles, title: "School branding", body: "Reports carry your school logo, name, address, and stamp. Every document looks like it came directly from your institution." },
    { Icon: ArrowRight, title: "Half-term and end-of-term", body: "Configure different report formats for mid-term and end-of-term cycles, with separate assessment weightings for each period." },
];

const steps = [
    ["01", "Teachers enter scores", "CA and exam scores are captured in the score entry desk per subject and class."],
    ["02", "System computes totals", "Edunostics automatically calculates totals, grade letters, positions, and class averages."],
    ["03", "Principal approves", "Reports pass through a review and approval workflow before they are published."],
    ["04", "Reports are published", "Parents receive PDF reports. Admins can print, download, or share digitally."],
];

export const metadata: Metadata = {
    title: "Academic Report Cards & Broadsheets for Secondary Schools",
    description: "Generate verified term report cards, class broadsheets, academic transcripts, and parent-ready PDFs in seconds with Edunostics.",
    alternates: { canonical: "https://www.edunostics.com/reports" },
    openGraph: { url: "https://www.edunostics.com/reports", title: "Report Cards & Broadsheets | Edunostics", description: "Generate term reports, broadsheets, and transcripts in seconds." },
};

export default function ReportsPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Reports</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 680, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Generate report cards your school can trust.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    From score entry to signed report card, Edunostics automates every step of the reporting cycle so you spend less time on paperwork and more time on learning.
                </p>
                <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Book a demo <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {reportTypes.map(({ Icon, title, body }) => (
                        <div key={title} style={{ padding: "32px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <Icon size={18} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".85rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={wrap}>
                    <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Workflow</p>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2.1rem)", fontWeight: 700, margin: "0 0 48px", maxWidth: 500, color: "var(--foreground)" }}>From scores to signed reports in four steps.</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32 }}>
                        {steps.map(([num, title, body]) => (
                            <div key={num}>
                                <p style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "2rem", fontWeight: 700, color: "var(--border)", margin: "0 0 16px" }}>{num}</p>
                                <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: ".95rem", fontWeight: 700, margin: "0 0 10px", color: "var(--foreground)" }}>{title}</h3>
                                <p style={{ fontSize: ".84rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.4rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>See reports in action.</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 36, fontSize: ".96rem" }}>Watch the complete reporting workflow from score entry to parent-ready output.</p>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Book a school demo <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
