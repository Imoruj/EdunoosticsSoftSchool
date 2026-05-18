import Link from "next/link";
import { BarChart3, BookOpen, Cpu, Database, MessageSquareText, ShieldCheck, ArrowRight } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const features = [
    { Icon: BookOpen, title: "Assessment engine", body: "Record continuous assessments, examination scores, behavior, and attendance in a single verified student record." },
    { Icon: BarChart3, title: "Live analytics", body: "Track class trends, subject performance gaps, grade distributions, and at-risk signals before term ends." },
    { Icon: Database, title: "Academic record vault", body: "Maintain multi-year student histories that are searchable, exportable, and ready for transcripts at any time." },
    { Icon: MessageSquareText, title: "Parent communication", body: "Deliver report cards, fee notices, and academic updates through verified school-to-parent channels." },
    { Icon: Cpu, title: "Smart hardware", body: "Classroom terminals, badge readers, and ID systems that connect physical school operations to the platform." },
    { Icon: ShieldCheck, title: "Role-based access", body: "Principals, admins, teachers, parents, and students each see exactly what they need and nothing more." },
];

const stats = [
    { num: "1 day", label: "Typical onboarding" },
    { num: "360", label: "Degree student profile" },
    { num: "99.9%", label: "Cloud uptime target" },
    { num: "24/7", label: "School operations" },
];

export default function OverviewPage() {
    return (
        <div>
            {/* Hero */}
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Product overview</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 700, margin: "0 0 24px", color: "var(--foreground)" }}>
                    The complete operating system for secondary schools.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    Edunostics unifies assessment, reporting, analytics, parent communication, and hardware into one trusted platform. Purpose-built for the Nigerian secondary school.
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                        Book a demo <ArrowRight size={15} />
                    </Link>
                    <Link href="/documentation" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--muted)", color: "var(--foreground)", padding: "13px 26px", borderRadius: 999, fontWeight: 600, fontSize: ".88rem", textDecoration: "none", border: "1px solid var(--border)" }}>
                        Read the docs
                    </Link>
                </div>
            </section>

            {/* Stats */}
            <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "40px 0", backgroundColor: "var(--muted)" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32 }}>
                    {stats.map(({ num, label }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                            <p style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.2rem)", fontWeight: 700, color: teal, margin: "0 0 6px" }}>{num}</p>
                            <p style={{ fontSize: ".75rem", color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ ...wrap, padding: "80px 0" }}>
                <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2.2rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-.015em", maxWidth: 500, margin: "0 0 56px", color: "var(--foreground)" }}>
                    Everything a modern school needs in one place.
                </h2>
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

            {/* CTA */}
            <section style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--muted)", padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.4rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>Ready to see it in action?</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 36, fontSize: ".96rem" }}>Book a demo and we will walk your school through the full platform.</p>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Book a school demo <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
