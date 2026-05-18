import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const values = [
    { title: "School-first thinking", body: "Every product decision starts with the real constraints of Nigerian secondary schools: unreliable internet, limited budgets, and over-stretched staff." },
    { title: "Simplicity as a feature", body: "If a first-year teacher cannot figure it out in five minutes, we have not done our job. Complexity is a bug, not a feature." },
    { title: "Data as a responsibility", body: "Student data is not a product. We treat it with the same care we would want for our own children records." },
    { title: "Trust through transparency", body: "We publish our security practices, communicate incidents honestly, and let schools export their data at any time." },
];

const stats = [
    ["1 day", "Average onboarding time"],
    ["99.9%", "Cloud uptime target"],
    ["Nigeria", "Built specifically for"],
];

export const metadata: Metadata = {
    title: "About Edunostics — Built for Nigerian Secondary Education",
    description: "Edunostics was built to modernise school administration and academic reporting in Nigerian secondary schools. Learn about our mission, team, and values.",
    alternates: { canonical: "https://www.edunostics.com/about" },
    openGraph: { url: "https://www.edunostics.com/about", title: "About Us | Edunostics", description: "Modernising school administration and academic reporting in Nigeria." },
};

export default function AboutPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>About</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 720, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Building the intelligence layer for Nigeria secondary schools.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 580 }}>
                    We started Edunostics because we saw how much time Nigerian school administrators were losing to manual report card generation, paper registers, and disconnected tools and how much student potential was going unseen as a result.
                </p>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
                    <div>
                        <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Our mission</p>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.4rem)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 20px", color: "var(--foreground)" }}>
                            Every learner seen. Every school empowered.
                        </h2>
                        <p style={{ fontSize: ".92rem", color: "var(--muted-foreground)", lineHeight: 1.78, margin: 0 }}>
                            We believe that every secondary school student in Nigeria deserves an institution that truly understands their learning journey. Edunostics gives school leaders the data, tools, and clarity to make that possible.
                        </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {stats.map(([num, label]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                                <span style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.4rem", fontWeight: 700, color: teal }}>{num}</span>
                                <span style={{ fontSize: ".85rem", color: "var(--muted-foreground)" }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ ...wrap, padding: "80px 0" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Our values</p>
                <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 48px", maxWidth: 480, color: "var(--foreground)" }}>What guides every decision we make.</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                    {values.map(({ title, body }) => (
                        <div key={title} style={{ padding: "32px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12 }}>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1rem", fontWeight: 700, color: teal, margin: "0 0 12px" }}>{title}</h3>
                            <p style={{ fontSize: ".88rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--muted)", padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>Join the movement.</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 32 }}>Bring Edunostics to your school and give every student the academic record they deserve.</p>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                            Register your school <ArrowRight size={15} />
                        </Link>
                        <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--card)", color: "var(--foreground)", padding: "14px 30px", borderRadius: 999, fontWeight: 600, fontSize: ".9rem", textDecoration: "none", border: "1px solid var(--border)" }}>
                            Get in touch
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
