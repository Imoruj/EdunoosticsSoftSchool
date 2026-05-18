import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, MessageCircle } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const contacts = [
    { Icon: Mail, title: "General enquiries", desc: "Questions about Edunostics, pricing, or your school specific needs.", cta: "Send an email", href: "mailto:it@edunostics.com" },
    { Icon: MessageCircle, title: "WhatsApp", desc: "Fastest way to reach us for demos, onboarding support, and urgent issues.", cta: "Chat on WhatsApp", href: "https://wa.me/2349012923408" },
    { Icon: MapPin, title: "Port Harcourt office", desc: "We are based in Port Harcourt, Nigeria. Meetings are available by appointment.", cta: "Get directions", href: "#" },
];

const demoPoints = [
    "30-minute live walkthrough",
    "Tailored to your school grading system",
    "No commitment required",
    "Same-day response on booking requests",
];

export const metadata: Metadata = {
    title: "Contact Edunostics — Book a Demo or Get Support",
    description: "Get in touch with the Edunostics team to book a school demo, request a quote, or ask any questions about our school management platform.",
    alternates: { canonical: "https://www.edunostics.com/contact" },
    openGraph: { url: "https://www.edunostics.com/contact", title: "Contact Us | Edunostics", description: "Book a demo, request a quote, or ask about our platform." },
};

export default function ContactPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Contact</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 600, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Talk to the team.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 500, margin: 0 }}>
                    Whether you are ready to register your school, asking about pricing, or need support, we are available and responsive.
                </p>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {contacts.map(({ Icon, title, desc, cta, href }) => (
                        <div key={title} style={{ padding: "36px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12, display: "flex", flexDirection: "column" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <Icon size={20} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1rem", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".86rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: "0 0 24px", flex: 1 }}>{desc}</p>
                            <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", color: teal, fontSize: ".82rem", fontWeight: 600, textDecoration: "none", padding: "8px 16px", borderRadius: 999, alignSelf: "flex-start" }}>
                                {cta} <ArrowRight size={13} />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
                    <div>
                        <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Book a demo</p>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>See Edunostics live for your school.</h2>
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: "0 0 28px" }}>
                            We will walk you through the full platform including assessment, reporting, parent portal, and hardware, tailored to your school context.
                        </p>
                        <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                            Book a demo <ArrowRight size={15} />
                        </Link>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {demoPoints.map(item => (
                            <div key={item} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <span style={{ fontSize: ".88rem", color: "var(--muted-foreground)" }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
