import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Laptop } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const partnerTypes = [
    {
        Icon: Building2,
        title: "Technology partners",
        desc: "Hardware manufacturers, device distributors, and software vendors who want to integrate with the Edunostics platform or co-market to Nigerian secondary schools.",
        benefits: ["API access and technical documentation", "Co-marketing opportunities", "Joint go-to-market support", "Revenue sharing on referrals"],
    },
    {
        Icon: Laptop,
        title: "Reseller partners",
        desc: "Education consultants, IT firms, and school software distributors who want to offer Edunostics to their school clients across Nigeria.",
        benefits: ["Competitive margin on subscriptions", "Sales training and certification", "Branded sales materials", "Dedicated partner support"],
    },
    {
        Icon: GraduationCap,
        title: "Academic and NGO partners",
        desc: "Universities, education foundations, and non-profits working to improve secondary education outcomes in Nigeria and West Africa.",
        benefits: ["Research data collaboration", "Subsidised school access", "Pilot programme support", "Joint grant applications"],
    },
];

export const metadata: Metadata = {
    title: "Partner with Edunostics — Schools, Resellers & Technology Partners",
    description: "Join the Edunostics partner network. We work with schools, education technology resellers, and system integrators across Nigeria.",
    alternates: { canonical: "https://www.edunostics.com/partners" },
    openGraph: { url: "https://www.edunostics.com/partners", title: "Partners | Edunostics", description: "Schools, resellers, and technology partners across Nigeria." },
};

export default function PartnersPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Partners</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 680, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Grow with Edunostics.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    We are building the education technology infrastructure for Nigerian secondary schools. We are looking for partners who share that mission, whether you are a hardware company, a reseller, or an academic institution.
                </p>
                <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Apply to partner <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {partnerTypes.map(({ Icon, title, desc, benefits }) => (
                        <div key={title} style={{ padding: "36px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <Icon size={20} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".86rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: "0 0 24px" }}>{desc}</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {benefits.map(b => (
                                    <div key={b} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke={teal} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </div>
                                        <span style={{ fontSize: ".84rem", color: "var(--muted-foreground)" }}>{b}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>Interested in partnering?</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 32 }}>Send us a brief introduction and we will be in touch within two business days.</p>
                    <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Email partnership team <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
