import Link from "next/link";
import { ArrowRight, BookOpen, Mail, MessageCircle } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const channels = [
    { Icon: Mail, title: "Email support", desc: "Send us a detailed message and we will respond within one business day. Best for billing, account issues, and non-urgent queries.", action: "it@edunostics.com", href: "mailto:it@edunostics.com" },
    { Icon: MessageCircle, title: "WhatsApp", desc: "Chat with our support team directly. Fastest response for setup assistance, urgent issues, and quick how-to questions.", action: "Chat on WhatsApp", href: "/contact" },
    { Icon: BookOpen, title: "Documentation", desc: "Browse step-by-step guides for every role including admin, teacher, parent, and student. Most answers are already there.", action: "Browse docs", href: "/documentation" },
];

const faqs = [
    { q: "How do I add teachers to my school?", a: "Go to Settings, then Staff Management and click Add staff member. Enter the teacher name, email, and assigned subjects. They will receive a login invitation automatically." },
    { q: "How do I generate a report card?", a: "After all scores have been entered for a term, go to Reports and click Generate Reports. Select the class and term, review the preview, then click Publish. Parents are notified automatically." },
    { q: "Can parents view results on their phone?", a: "Yes. Parents log in to the parent portal at your school Edunostics URL. They can view results, download PDFs, and receive notifications when new reports are published." },
    { q: "What happens if I enter a wrong score?", a: "Scores can be corrected anytime before the principal approves the report. After approval, corrections require admin override, which is logged for audit purposes." },
    { q: "Can I configure a custom grading scale?", a: "Yes. Edunostics supports custom grading scales per school. Go to Settings then Grading Policy to configure your score ranges, grade letters, and remarks." },
    { q: "Is there a mobile app?", a: "The platform is fully mobile-responsive and works on any modern smartphone browser. Dedicated native apps are on our product roadmap." },
];

export default function SupportPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Support</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 620, margin: "0 0 24px", color: "var(--foreground)" }}>
                    We are here when you need us.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 520, margin: 0 }}>
                    Whether you are setting up your school for the first time or troubleshooting a report card issue, our team is available to help.
                </p>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {channels.map(({ Icon, title, desc, action, href }) => (
                        <div key={title} style={{ padding: "36px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12, display: "flex", flexDirection: "column" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <Icon size={20} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".86rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: "0 0 24px", flex: 1 }}>{desc}</p>
                            <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", color: teal, fontSize: ".82rem", fontWeight: 600, textDecoration: "none", padding: "8px 16px", borderRadius: 999, alignSelf: "flex-start" }}>
                                {action} <ArrowRight size={13} />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={wrap}>
                    <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>FAQ</p>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 48px", color: "var(--foreground)" }}>Common questions answered.</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 32 }}>
                        {faqs.map(({ q, a }) => (
                            <div key={q} style={{ borderLeft: `2px solid rgba(0,169,154,.35)`, paddingLeft: 24 }}>
                                <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: ".95rem", fontWeight: 700, margin: "0 0 10px", color: "var(--foreground)" }}>{q}</h3>
                                <p style={{ fontSize: ".85rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: 0 }}>{a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>Still need help?</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 32, fontSize: ".96rem" }}>Our team responds to all support requests within one business day.</p>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="https://wa.me/2349012923408" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                            Chat on WhatsApp <ArrowRight size={15} />
                        </Link>
                        <Link href="mailto:it@edunostics.com" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--card)", color: "var(--foreground)", padding: "14px 30px", borderRadius: 999, fontWeight: 600, fontSize: ".9rem", textDecoration: "none", border: "1px solid var(--border)" }}>
                            Email support
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
