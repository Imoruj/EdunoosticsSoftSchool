import Link from "next/link";
import { ArrowRight, Database, Eye, Key, Lock, RefreshCw, Shield } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const pillars = [
    { Icon: Lock, title: "Encryption at rest and in transit", body: "All student data is encrypted using AES-256 at rest. Every connection to Edunostics is secured via TLS 1.3, preventing interception at any point." },
    { Icon: Key, title: "Role-based access control", body: "Each user role has precisely scoped data access. Teachers only see the classes and subjects they are assigned to. Parents only see their own children." },
    { Icon: Eye, title: "Audit logs", body: "Every data change including score edits, report approvals, and account modifications is logged with a timestamp and user identity for full accountability." },
    { Icon: Database, title: "Automated backups", body: "Data is backed up automatically every 24 hours across geographically redundant storage. Recovery point objectives are measured in hours, not days." },
    { Icon: RefreshCw, title: "Data retention controls", body: "Schools control how long student data is retained. Records can be exported in full at any time before deletion, ensuring no data is ever held hostage." },
    { Icon: Shield, title: "Penetration testing", body: "Edunostics undergoes regular third-party security assessments. Identified vulnerabilities are remediated on a strict timeline before any deployment." },
];

const commitments = [
    "We will never sell your school data to any third party.",
    "We will notify you within 72 hours of any confirmed data incident.",
    "You can export all your data at any time, in full, at no charge.",
    "Student records are stored on servers with physical access controls.",
    "Staff and vendor access to production data requires written authorisation.",
    "Security patches are applied within 48 hours of critical vulnerability disclosure.",
];

export default function DataSecurityPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Data security</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 700, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Your school data, protected at every layer.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    Edunostics is built with a security-first architecture. Student records, assessment data, and parent communications are protected with enterprise-grade security controls.
                </p>
                <Link href="/security" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                    View security overview <ArrowRight size={15} />
                </Link>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {pillars.map(({ Icon, title, body }) => (
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
                    <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Our commitments</p>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 40px", color: "var(--foreground)" }}>What we promise every school.</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }}>
                        {commitments.map(item => (
                            <div key={item} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <p style={{ fontSize: ".88rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.5rem,2.2vw,2rem)", fontWeight: 700, margin: "0 0 12px", color: "var(--foreground)" }}>Have a security question?</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 32 }}>Contact our security team directly for compliance documentation, penetration test reports, or data processing agreements.</p>
                    <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Contact security team <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
