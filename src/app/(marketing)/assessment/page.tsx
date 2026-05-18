import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Star, TrendingUp, Users } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const features = [
    { Icon: ClipboardList, title: "Continuous assessment tracking", body: "Record CA scores per subject, per class, per term. Supports multiple assessment types including first test, second test, assignment, and project." },
    { Icon: Star, title: "Examination scores", body: "Enter exam scores alongside CA records. The system automatically computes totals, grade letters, and remarks based on your school grading policy." },
    { Icon: Users, title: "Behavior and conduct", body: "Track punctuality, neatness, leadership, and other conduct indicators alongside academic performance for a complete student picture." },
    { Icon: CheckCircle2, title: "Attendance records", body: "Record daily attendance per class. Attendance feeds directly into the student profile and report card, with configurable thresholds and alerts." },
    { Icon: TrendingUp, title: "Performance analytics", body: "Identify at-risk students and academic excellence signals early. View class-level and subject-level performance distributions in real time." },
    { Icon: ArrowRight, title: "Report generation", body: "Convert assessment data into polished report cards, broadsheets, and transcripts with one click, fully formatted for your school branding." },
];

const gradeScale = [
    { grade: "A1", range: "75-100", remark: "Excellent" },
    { grade: "B2", range: "70-74", remark: "Very Good" },
    { grade: "B3", range: "65-69", remark: "Good" },
    { grade: "C4", range: "60-64", remark: "Credit" },
    { grade: "C5", range: "55-59", remark: "Credit" },
    { grade: "C6", range: "50-54", remark: "Credit" },
    { grade: "D7", range: "45-49", remark: "Pass" },
    { grade: "E8", range: "40-44", remark: "Pass" },
    { grade: "F9", range: "0-39", remark: "Fail" },
];

export default function AssessmentPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Assessment</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 700, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Capture every score. Build the complete academic picture.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    From first-term continuous assessment to final examination scores, Edunostics gives every teacher a structured, fast, and accurate way to record student performance.
                </p>
                <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Book a demo <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {features.map(({ Icon, title, body }) => (
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
                    <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Grading system</p>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2.1rem)", fontWeight: 700, margin: "0 0 48px", color: "var(--foreground)" }}>Built around the Nigerian grading scale.</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
                        {gradeScale.map(({ grade, range, remark }) => (
                            <div key={grade} style={{ padding: "20px 24px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
                                <p style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.6rem", fontWeight: 700, color: teal, margin: "0 0 4px" }}>{grade}</p>
                                <p style={{ fontSize: ".78rem", color: "var(--foreground)", margin: "0 0 2px", fontWeight: 600 }}>{range}</p>
                                <p style={{ fontSize: ".75rem", color: "var(--muted-foreground)", margin: 0 }}>{remark}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.4rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>See assessment in action.</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 36, fontSize: ".96rem" }}>Book a demo and watch the full assessment workflow from score entry to report card.</p>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Book a school demo <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
