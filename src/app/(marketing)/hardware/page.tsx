import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, Fingerprint, MonitorSmartphone, Network, ScanLine, Wifi } from "lucide-react";

const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const products = [
    { Icon: MonitorSmartphone, title: "Classroom terminals", body: "Wall-mounted and desk terminals that give teachers instant access to attendance, score entry, and student records from the classroom without a laptop needed.", tag: "Available" },
    { Icon: ScanLine, title: "Student ID badges", body: "Smart NFC-enabled student cards for identity verification, access control, library check-in, and attendance tracking with a single tap.", tag: "Available" },
    { Icon: Fingerprint, title: "Biometric check-in", body: "Fingerprint and face recognition stations at school gates and common areas, capturing arrival times directly into the platform.", tag: "Coming soon" },
    { Icon: Cpu, title: "Device management console", body: "Monitor, update, and manage every Edunostics hardware device from one central admin console. Real-time status, alerts, and remote diagnostics.", tag: "Available" },
    { Icon: Network, title: "Offline-first architecture", body: "Hardware devices continue to record data even when internet connectivity is interrupted. All data syncs automatically when the connection is restored.", tag: "Available" },
    { Icon: Wifi, title: "Live sync dashboard", body: "Every device action including badge scans, score entries, and check-ins appears instantly in the platform dashboard with a live sync indicator.", tag: "Available" },
];

export const metadata: Metadata = {
    title: "Smart School Hardware — ID Cards, Terminals & Attendance Devices",
    description: "Edunostics-compatible hardware including student ID card systems, biometric attendance terminals, and classroom touchpoints built for Nigerian secondary schools.",
    alternates: { canonical: "https://www.edunostics.com/hardware" },
    openGraph: { url: "https://www.edunostics.com/hardware", title: "School Hardware | Edunostics", description: "ID cards, biometric terminals, and classroom touchpoints." },
};

export default function HardwarePage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 70px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Hardware</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2.2rem,4vw,3.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-.02em", maxWidth: 700, margin: "0 0 24px", color: "var(--foreground)" }}>
                    Smart hardware built for the secondary school environment.
                </h1>
                <p style={{ fontSize: "1.05rem", color: "var(--muted-foreground)", lineHeight: 1.78, maxWidth: 560, margin: "0 0 40px" }}>
                    Edunostics hardware connects physical school operations including attendance, identity, access, and communication directly into the platform. No more paper registers or manual tracking.
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "13px 26px", borderRadius: 999, fontWeight: 700, fontSize: ".88rem", textDecoration: "none" }}>
                        Request hardware demo <ArrowRight size={15} />
                    </Link>
                    <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--muted)", color: "var(--foreground)", padding: "13px 26px", borderRadius: 999, fontWeight: 600, fontSize: ".88rem", textDecoration: "none", border: "1px solid var(--border)" }}>
                        Contact sales
                    </Link>
                </div>
            </section>

            <section style={{ ...wrap, padding: "0 0 80px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {products.map(({ Icon, title, body, tag }) => (
                        <div key={title} style={{ padding: "32px 28px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 12, position: "relative" }}>
                            {tag === "Coming soon" && (
                                <span style={{ position: "absolute", top: 20, right: 20, background: "rgba(91,45,170,.12)", border: "1px solid rgba(91,45,170,.25)", color: "#7c5cbf", fontSize: ".65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".06em" }}>Coming soon</span>
                            )}
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <Icon size={18} color={teal} />
                            </div>
                            <h3 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--foreground)" }}>{title}</h3>
                            <p style={{ fontSize: ".85rem", color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "64px 0" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
                    <div>
                        <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 16px" }}>Seamless integration</p>
                        <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.4rem,2vw,2rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>Hardware and software. One unified experience.</h2>
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", lineHeight: 1.75, margin: 0 }}>
                            Every Edunostics hardware device is natively connected to the platform. No third-party bridge, no manual data export, and no sync delays. What happens in the school is reflected in the dashboard instantly.
                        </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {["Plug-and-play device setup", "Automatic firmware updates", "Centralised device management", "Zero data loss on connectivity drop", "Full audit trail per device"].map(item => (
                            <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,169,154,.1)", border: "1px solid rgba(0,169,154,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <span style={{ fontSize: ".88rem", color: "var(--muted-foreground)" }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "80px 0" }}>
                <div style={{ ...wrap, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(1.6rem,2.5vw,2.4rem)", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>Bring smart hardware to your school.</h2>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: 36, fontSize: ".96rem" }}>Talk to our team about hardware availability, pricing, and installation for your school.</p>
                    <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: teal, color: "#fff", padding: "14px 30px", borderRadius: 999, fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>
                        Contact our team <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
