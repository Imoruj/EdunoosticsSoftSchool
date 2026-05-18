import Link from "next/link";
import { ArrowRight, Eye, Fingerprint, Key, Lock, RefreshCw, Server, Shield, ShieldCheck } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const pillars = [
    { Icon: Lock, title: "Encryption everywhere", body: "AES-256 encryption at rest. TLS 1.3 for every connection. No data travels or sits unprotected at any layer of our stack." },
    { Icon: Key, title: "Least-privilege access", body: "Every user role has a precise, minimal access scope. Teachers see only their classes. Parents see only their children. No data leaks across accounts." },
    { Icon: Eye, title: "Full audit logging", body: "Every action including score edits, report approvals, logins, and exports is logged with a timestamp and user identity. Nothing happens without a trace." },
    { Icon: Server, title: "Redundant infrastructure", body: "Edunostics runs on geographically distributed cloud infrastructure with automatic failover, load balancing, and a 99.9% uptime target." },
    { Icon: RefreshCw, title: "Daily backups", body: "Automated backups run every 24 hours across redundant storage locations. Recovery point objectives are measured in hours, not days." },
    { Icon: Fingerprint, title: "Multi-factor authentication", body: "Administrators can enforce MFA for all staff accounts. Session tokens are short-lived and invalidated on suspicious activity." },
    { Icon: ShieldCheck, title: "Penetration testing", body: "We engage independent security firms to conduct regular penetration tests. Findings are remediated on a strict timeline before deployment." },
    { Icon: Shield, title: "Vulnerability disclosure", body: "We maintain a responsible disclosure programme. If you discover a security issue, report it to it@edunostics.com for a rapid response." },
];

const practices = [
    "All production code undergoes peer review before deployment",
    "Dependency vulnerabilities are scanned on every commit",
    "Critical patches are applied within 48 hours of disclosure",
    "No student data is used in development or testing environments",
    "Vendor and third-party access requires written authorisation",
    "Security training is mandatory for all Edunostics employees",
    "Incident response drills are conducted quarterly",
    "Infrastructure access requires hardware security keys",
];

export default function SecurityPage() {
    return (
        <div>
            {/* Hero */}
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Security</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 700, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Enterprise-grade security for every school.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    Student data is among the most sensitive information a school holds. We built Edunostics from the ground up with security as a core requirement.
                </p>
                <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    Contact security team <ArrowRight size={15} />
                </Link>
            </section>

            {/* Pillars */}
            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                    {pillars.map(({ Icon, title, body }) => (
                        <div key={title} style={{ padding: "28px 24px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                                <Icon size={17} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: ".95rem", fontWeight: 700, margin: "0 0 10px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".83rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Engineering practices */}
            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
                    <div>
                        <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Engineering practices</p>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.4rem,2vw,1.9rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>Security is baked into how we build.</h2>
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: 0 }}>
                            Our security posture covers infrastructure, engineering practices, code review, and how we respond when something goes wrong.
                        </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {practices.map(p => (
                            <div key={p} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke={teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <p style={{ fontSize: ".86rem", color: "var(--muted-foreground)", lineHeight: 1.65, margin: 0 }}>{p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Disclosure */}
            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Responsible disclosure</p>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>Found a vulnerability?</h2>
                    <p style={{ fontSize: ".92rem", color: "var(--muted-foreground)", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 32px" }}>
                        We take security reports seriously and commit to responding within 24 hours. We will never take legal action against researchers who disclose vulnerabilities in good faith.
                    </p>
                    <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Report a vulnerability <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
