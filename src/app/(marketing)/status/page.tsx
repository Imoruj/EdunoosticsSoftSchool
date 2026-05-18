const teal = "#00A99A";
const wrap = { width: "min(1180px, calc(100% - 40px))", margin: "0 auto" } as const;

const services = [
    { name: "Platform dashboard", status: "operational", latency: "84ms" },
    { name: "Assessment and score entry", status: "operational", latency: "91ms" },
    { name: "Report card generation", status: "operational", latency: "120ms" },
    { name: "Parent portal", status: "operational", latency: "76ms" },
    { name: "Authentication service", status: "operational", latency: "62ms" },
    { name: "File storage and exports", status: "operational", latency: "103ms" },
    { name: "Notification delivery", status: "operational", latency: "145ms" },
    { name: "Hardware sync service", status: "operational", latency: "88ms" },
    { name: "Admin panel", status: "operational", latency: "79ms" },
];

const uptime = [
    { period: "Last 24 hours", value: "100%" },
    { period: "Last 7 days", value: "100%" },
    { period: "Last 30 days", value: "99.97%" },
    { period: "Last 90 days", value: "99.94%" },
];

function Dot({ status }: { status: string }) {
    const color = status === "operational" ? teal : status === "degraded" ? "#F59E0B" : "#EF4444";
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />;
}

export default function StatusPage() {
    const allOk = services.every(s => s.status === "operational");
    return (
        <div>
            {/* Hero */}
            <section style={{ ...wrap, padding: "90px 0 60px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <Dot status="operational" />
                    <p style={{ color: teal, fontSize: ".8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
                        {allOk ? "All systems operational" : "Partial degradation"}
                    </p>
                </div>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.02em", margin: "0 0 16px", color: "var(--foreground)" }}>
                    {allOk ? "All systems are running normally." : "We are investigating an issue."}
                </h1>
                <p style={{ fontSize: ".95rem", color: "var(--muted-foreground)", margin: 0 }}>
                    Live monitoring for all Edunostics services.
                </p>
            </section>

            {/* Uptime */}
            <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "36px 0", backgroundColor: "var(--muted)" }}>
                <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
                    {uptime.map(({ period, value }) => (
                        <div key={period} style={{ textAlign: "center" }}>
                            <p style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.8rem", fontWeight: 700, color: teal, margin: "0 0 4px" }}>{value}</p>
                            <p style={{ fontSize: ".74rem", color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{period}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Services */}
            <section style={{ ...wrap, padding: "64px 0 80px" }}>
                <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: ".85rem", fontWeight: 700, margin: "0 0 24px", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted-foreground)" }}>Services</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {services.map(({ name, status, latency }) => (
                        <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 10, gap: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Dot status={status} />
                                <span style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--foreground)" }}>{name}</span>
                            </div>
                            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                <span style={{ fontSize: ".78rem", color: "var(--muted-foreground)", fontFamily: "'Manrope',system-ui,sans-serif" }}>{latency} avg</span>
                                <span style={{
                                    fontSize: ".72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                                    background: status === "operational" ? "rgba(0,169,154,.1)" : "rgba(239,68,68,.1)",
                                    color: status === "operational" ? teal : "#EF4444",
                                    border: `1px solid ${status === "operational" ? "rgba(0,169,154,.2)" : "rgba(239,68,68,.2)"}`,
                                    textTransform: "capitalize",
                                }}>{status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Incidents */}
            <section style={{ backgroundColor: "var(--muted)", borderTop: "1px solid var(--border)", padding: "64px 0" }}>
                <div style={wrap}>
                    <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 28px", color: "var(--foreground)" }}>Recent incidents</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "28px 24px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
                        <Dot status="operational" />
                        <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", margin: 0 }}>No incidents in the past 90 days.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
