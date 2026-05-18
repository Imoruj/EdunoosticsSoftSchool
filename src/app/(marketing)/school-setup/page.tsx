import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const steps = [
    {
        num: "01",
        title: "Register your school",
        desc: "Create an Edunostics account for your school. Enter your school name, address, and administrator details. Your account will be reviewed and activated within 24 hours.",
        tasks: ["School name and contact info", "Administrator email and password", "Acceptance review within 1 business day"],
    },
    {
        num: "02",
        title: "Configure your school structure",
        desc: "Set up your academic calendar, classes, arms, subjects, and grading policy. This takes about 30 to 60 minutes for most schools.",
        tasks: ["Set current session and term", "Create class levels from JSS 1 to SS 3", "Add subjects per class", "Configure grading scale and remarks"],
    },
    {
        num: "03",
        title: "Import students and staff",
        desc: "Add your teachers, students, and parents to the platform. You can import via spreadsheet or add records individually.",
        tasks: ["Add teachers by email", "Import student roster with CSV support", "Assign teachers to subjects and classes", "Set up parent accounts"],
    },
    {
        num: "04",
        title: "Start capturing data",
        desc: "Teachers can now enter scores, take attendance, and add remarks from any device. Data flows directly into the platform.",
        tasks: ["Enter CA and exam scores", "Record daily attendance", "Add teacher and principal remarks", "Preview report cards before publishing"],
    },
    {
        num: "05",
        title: "Publish your first report",
        desc: "Once all data is verified, generate and publish your first set of report cards. Parents receive instant access to their child results.",
        tasks: ["Review class broadsheet", "Approve reports as principal", "Publish to parent portal", "Print physical copies if needed"],
    },
];

export const metadata: Metadata = {
    title: "School Setup Guide — Onboard Your School in One Day",
    description: "A step-by-step guide to getting your secondary school live on Edunostics. Configure classes, subjects, terms, grading policy, and staff roles in one day.",
    alternates: { canonical: "https://www.edunostics.com/school-setup" },
    openGraph: { url: "https://www.edunostics.com/school-setup", title: "School Setup | Edunostics", description: "Get your school live on Edunostics in one day." },
};

export default function SchoolSetupPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>School setup</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 680, margin: "0 0 24px", color: "var(--foreground)" }}>
                    From signup to first report card in under a day.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 540, margin: "0 0 40px" }}>
                    Edunostics is designed for real school teams, not IT specialists. If you can use a smartphone, you can set up Edunostics for your school.
                </p>
                <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Start setup now <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 96px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {steps.map(({ num, title, desc, tasks }, i) => (
                        <div key={num} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 48, padding: "48px 0", borderBottom: i < steps.length - 1 ? "1px solid var(--border)" : "none", alignItems: "start" }}>
                            <div>
                                <p style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "3rem", fontWeight: 700, color: "var(--border)", margin: "0 0 8px", lineHeight: 1 }}>{num}</p>
                                <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: 0, color: teal }}>{title}</h3>
                            </div>
                            <div>
                                <p style={{ fontSize: ".92rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: "0 0 24px" }}>{desc}</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {tasks.map(task => (
                                        <div key={task} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke={teal} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                            <span style={{ fontSize: ".86rem", color: "var(--muted-foreground)" }}>{task}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", padding: "60px 0" }}>
                <div style={{ ...wrap, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 8px", color: "var(--foreground)" }}>Need help with setup?</h2>
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", margin: 0 }}>Our onboarding team will walk your school through every step via WhatsApp or video call at no extra charge.</p>
                    </div>
                    <Link href="/support" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 24px", borderRadius: 999, fontWeight: 700, fontSize: ".86rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                        Get setup support <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
