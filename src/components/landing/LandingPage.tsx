"use client";

import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BarChart3,
    BookOpen,
    Check,
    ChevronRight,
    Cpu,
    Database,
    Fingerprint,
    GraduationCap,
    Layers3,
    LockKeyhole,
    MessageSquareText,
    MonitorSmartphone,
    Network,
    ScanLine,
    School,
    ShieldCheck,
    Sparkles,
    TabletSmartphone,
    UsersRound,
    Wifi,
} from "lucide-react";

const palette = {
    aubergine: "#24142F",
    teal: "#00A99A",
    gold: "#C69214",
    purple: "#5B2DAA",
    graphite: "#202426",
    cloud: "#F7FAFA",
};

const navItems = ["Platform", "Hardware", "Insights", "Security", "Pricing"];

const stats = [
    ["24/7", "School operations"],
    ["99.9%", "Cloud uptime target"],
    ["1 day", "Typical onboarding"],
    ["360°", "Student profile"],
];

const capabilities = [
    {
        icon: ScanLine,
        title: "Assessment diagnostics",
        body: "Capture CA, exams, behavior, attendance, and teacher remarks in one verified student record.",
    },
    {
        icon: TabletSmartphone,
        title: "Smart school hardware",
        body: "Device badges, classroom terminals, ID workflows, and future-ready hardware touchpoints.",
    },
    {
        icon: BarChart3,
        title: "Live performance analytics",
        body: "See class trends, subject gaps, grade distributions, and intervention signals before term ends.",
    },
    {
        icon: MessageSquareText,
        title: "Parent communication",
        body: "Send report cards, notices, balances, and progress updates through structured school channels.",
    },
    {
        icon: Database,
        title: "Academic record vault",
        body: "Keep multi-year student histories searchable, secure, and ready for transcripts or transfers.",
    },
    {
        icon: ShieldCheck,
        title: "Role-based governance",
        body: "Principals, admins, teachers, parents, and students each get the access they need.",
    },
];

const profileSignals = [
    ["Academic mastery", "82%"],
    ["Attendance stability", "94%"],
    ["Behavior trend", "76%"],
    ["STEM readiness", "68%"],
    ["Parent engagement", "89%"],
];

const steps = [
    ["01", "Connect the school", "Configure classes, subjects, terms, roles, devices, and grading policy."],
    ["02", "Capture every signal", "Teachers and hardware touchpoints feed scores, attendance, conduct, and notes."],
    ["03", "Diagnose progress", "Leadership sees risk patterns, excellence signals, and class-level comparisons."],
    ["04", "Publish with confidence", "Generate verified reports, broadsheets, transcripts, and parent updates."],
];

function Logo({ compact = false }: { compact?: boolean }) {
    return (
        <Link href="/" aria-label="Edunostics home" className="brand">
            {/* Real logo mark from brand kit — transparent PNG, coloured elements pop on dark */}
            <img
                src="/images/brand/logo-mark.png"
                alt=""
                aria-hidden="true"
                style={{ height: compact ? 32 : 42, width: "auto", display: "block" }}
            />
            <span>Edunostics</span>
        </Link>
    );
}

function ArrowButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
    return (
        <Link href={href} className={`cta ${variant}`}>
            <span>{children}</span>
            <ArrowRight size={16} aria-hidden="true" />
        </Link>
    );
}

function ProductConsole() {
    return (
        <div className="console-shell" aria-label="Edunostics platform preview">
            <div className="console-sidebar">
                <Logo compact />
                {[
                    [School, "School"],
                    [UsersRound, "Students"],
                    [BookOpen, "Assessments"],
                    [BarChart3, "Reports"],
                    [Cpu, "Devices"],
                    [LockKeyhole, "Access"],
                ].map(([Icon, label]) => (
                    <div className="side-item" key={label as string}>
                        <Icon size={15} aria-hidden="true" />
                        <span>{label as string}</span>
                    </div>
                ))}
            </div>
            <div className="console-main">
                <div className="console-top">
                    <div>
                        <p>Command Center</p>
                        <h3>Greenfield Secondary School</h3>
                    </div>
                    <div className="sync-pill"><Wifi size={13} /> Live sync</div>
                </div>
                <div className="metric-row">
                    {[
                        ["1,248", "Students"],
                        ["320", "Assessments"],
                        ["96%", "Attendance"],
                    ].map(([value, label]) => (
                        <div className="metric-card" key={label}>
                            <strong>{value}</strong>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
                <div className="insight-panel">
                    <div className="panel-heading">
                        <span>Performance diagnostics</span>
                        <Activity size={16} />
                    </div>
                    <div className="chart-lines">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="risk-grid">
                        <div><b>18</b><span>At-risk learners</span></div>
                        <div><b>42</b><span>STEM accelerators</span></div>
                    </div>
                </div>
            </div>
            <div className="console-context">
                <div className="context-card">
                    <p>Device status</p>
                    <strong>14 active</strong>
                    <span>Classroom terminals online</span>
                </div>
                <div className="context-list">
                    {["JSS 2A mathematics gap", "SS 1 attendance decline", "Report cards ready"].map((item) => (
                        <div key={item}><Check size={13} /><span>{item}</span></div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CognitiveProfile() {
    return (
        <div className="profile-board">
            <div className="radar">
                <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: 0, color: "var(--teal)", fontSize: ".68rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em" }}>Core alignment</p>
                    <p style={{ margin: "8px 0 0", color: "rgba(247,250,250,.6)", fontSize: ".78rem", lineHeight: 1.5 }}>Strong academic pattern with high assessment consistency and engagement signals.</p>
                </div>
                <div className="radar-core" />
                <div className="radar-axis a" />
                <div className="radar-axis b" />
                <div className="radar-axis c" />
            </div>
            <div className="signal-list">
                {profileSignals.map(([label, value]) => (
                    <div className="signal" key={label}>
                        <span>{label}</span>
                        <b>{value}</b>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DeviceStack() {
    return (
        <div className="device-stack">
            <div className="device-terminal">
                <div className="speaker" />
                <div className="device-screen">
                    <img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 28, width: "auto" }} />
                </div>
                <span className="device-light" />
            </div>
            <div className="device-copy">
                <h3>Built for software and the physical school environment.</h3>
                <p>Edunostics can support classroom devices, ID-card workflows, secure staff portals, and parent-facing access from the same operating layer.</p>
                <div className="device-tags">
                    <span><Cpu size={14} /> Device-ready</span>
                    <span><Fingerprint size={14} /> Secure identity</span>
                    <span><Network size={14} /> Connected systems</span>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    return (
        <main className="ed-page">
            <style>{`
                :root {
                    --aubergine: ${palette.aubergine};
                    --teal: ${palette.teal};
                    --gold: ${palette.gold};
                    --purple: ${palette.purple};
                    --graphite: ${palette.graphite};
                    --cloud: ${palette.cloud};
                }

                .ed-page {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at 20% 8%, rgba(0,169,154,.22), transparent 25rem),
                        radial-gradient(circle at 82% 12%, rgba(91,45,170,.20), transparent 24rem),
                        linear-gradient(180deg, #08070b 0%, #0d0b12 48%, #09080c 100%);
                    color: var(--cloud);
                    /* Brand typography: Satoshi (headlines) · Inter (body) · Manrope (UI) */
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    overflow-x: hidden;
                }

                .ed-page * { box-sizing: border-box; }
                .ed-page a { color: inherit; }

                /* ── Brand type scale ─────────────────────────────────── */
                /* Satoshi SemiBold → all headings (h1–h3, hero, section heads) */
                .ed-page h1,
                .ed-page h2,
                .ed-page h3 {
                    font-family: 'Satoshi', 'Inter', system-ui, sans-serif;
                    font-weight: 600;
                }
                /* Manrope Medium → UI chrome (console, metrics, pills, labels) */
                .console-shell,
                .metric-card,
                .sync-pill,
                .side-item,
                .stat,
                .step-num,
                .signal,
                .context-card,
                .context-list,
                .device-tags,
                .logo-cloud div,
                .email-box {
                    font-family: 'Manrope', system-ui, sans-serif;
                }

                .site-header {
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    backdrop-filter: blur(18px);
                    background: rgba(8, 7, 11, .72);
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }

                .nav-wrap {
                    width: min(1180px, calc(100% - 40px));
                    height: 72px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                }

                .brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    text-decoration: none;
                    font-weight: 700;
                    letter-spacing: 0;
                    color: #fff;
                }

                .brand span {
                    font-size: 1rem;
                    font-family: 'Satoshi', 'Inter', system-ui, sans-serif;
                    font-weight: 700;
                    letter-spacing: -.01em;
                }

                .nav-links {
                    display: flex;
                    align-items: center;
                    gap: 28px;
                    color: rgba(247,250,250,.62);
                    font-size: .78rem;
                    font-weight: 600;
                }

                .nav-links a {
                    text-decoration: none;
                    transition: color .18s ease;
                }

                .nav-links a:hover { color: #fff; }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .signin {
                    border: 1px solid rgba(247,250,250,.12);
                    border-radius: 999px;
                    padding: 9px 15px;
                    color: rgba(247,250,250,.76);
                    text-decoration: none;
                    font-size: .78rem;
                    font-weight: 700;
                }

                .cta {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    min-height: 42px;
                    padding: 0 18px;
                    border-radius: 999px;
                    text-decoration: none;
                    font-size: .8rem;
                    font-weight: 800;
                    letter-spacing: 0;
                    white-space: nowrap;
                    transition: transform .18s ease, border-color .18s ease, background .18s ease;
                }

                .cta:hover { transform: translateY(-1px); }
                .cta.primary { background: #fff; color: #130c19; }
                .cta.ghost { border: 1px solid rgba(247,250,250,.13); color: rgba(247,250,250,.78); }

                .section {
                    width: min(1180px, calc(100% - 40px));
                    margin: 0 auto;
                    position: relative;
                }

                .hero {
                    min-height: calc(100vh - 72px);
                    display: grid;
                    grid-template-columns: .78fr 1.22fr;
                    align-items: center;
                    gap: 48px;
                    padding: 60px 0 38px;
                }

                .hero-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    color: rgba(247,250,250,.45);
                    font-size: .72rem;
                    font-weight: 600;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                    margin-bottom: 22px;
                }
                .hero-eyebrow::before {
                    content: '+';
                    color: var(--teal);
                    font-size: .9rem;
                    font-weight: 800;
                }

                .hero-copy h1 {
                    margin: 0;
                    max-width: 560px;
                    font-size: clamp(2.2rem, 4.9vw, 5rem);
                    line-height: .92;
                    letter-spacing: -.01em;
                    font-weight: 700;
                    text-wrap: balance;
                }

                .hero-copy p {
                    max-width: 400px;
                    margin: 24px 0 28px;
                    color: rgba(247,250,250,.58);
                    font-size: .96rem;
                    line-height: 1.78;
                }

                .hero-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

                .trust-row {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-top: 52px;
                    color: rgba(247,250,250,.52);
                    font-size: .76rem;
                    line-height: 1.45;
                }

                .avatar-stack { display: flex; }
                .avatar-stack span {
                    width: 28px;
                    height: 28px;
                    margin-left: -8px;
                    border-radius: 50%;
                    border: 2px solid #08070b;
                    background: linear-gradient(135deg, var(--teal), var(--purple));
                }
                .avatar-stack span:first-child { margin-left: 0; background: linear-gradient(135deg, #fff, var(--gold)); }
                .avatar-stack span:nth-child(3) { background: linear-gradient(135deg, var(--aubergine), var(--teal)); }

                .hero-visual {
                    position: relative;
                    min-height: 640px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* 3-D marble sphere — bright top-left highlight, dark rim, subtle brand tint */
                .orb {
                    position: absolute;
                    left: -22%;      /* bleeds left into text column, matching reference */
                    top: 50%;
                    transform: translateY(-50%);
                    width: 660px;
                    height: 660px;
                    border-radius: 50%;
                    background:
                        radial-gradient(circle at 34% 34%,
                            #ffffff          0%,
                            rgba(230,240,255,.88)  5%,
                            rgba(170,185,230,.55) 16%,
                            rgba(55,42,95,.62)    36%,
                            rgba(14,11,22,.96)    62%,
                            rgba(6,5,10,1)        80%
                        );
                    box-shadow:
                        inset -60px -60px 120px rgba(0,0,0,.75),
                        0 0 280px rgba(91,45,170,.12),
                        0 0 80px  rgba(0,169,154,.08);
                    pointer-events: none;
                    z-index: 1;
                }

                .console-shell {
                    position: relative;
                    z-index: 2;
                    width: min(680px, 100%);
                    min-height: 500px;
                    display: grid;
                    grid-template-columns: 172px 1fr 168px;
                    gap: 1px;
                    overflow: hidden;
                    border: 1px solid rgba(247,250,250,.12);
                    border-radius: 18px;
                    background: rgba(247,250,250,.08);
                    box-shadow: 0 30px 100px rgba(0,0,0,.5);
                }

                .console-sidebar,
                .console-main,
                .console-context {
                    background: rgba(17, 13, 23, .82);
                    backdrop-filter: blur(18px);
                }

                .console-sidebar { padding: 18px 14px; }
                .console-sidebar .brand { margin-bottom: 22px; }
                .console-sidebar .brand span { font-size: .82rem; }

                .side-item {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    height: 36px;
                    padding: 0 10px;
                    border-radius: 10px;
                    color: rgba(247,250,250,.62);
                    font-size: .78rem;
                    font-weight: 650;
                }
                .side-item:nth-child(4) {
                    background: rgba(247,250,250,.08);
                    color: #fff;
                }

                .console-main { padding: 22px; }
                .console-top {
                    display: flex;
                    justify-content: space-between;
                    gap: 18px;
                    align-items: flex-start;
                    margin-bottom: 20px;
                }
                .console-top p {
                    margin: 0 0 6px;
                    color: var(--teal);
                    font-size: .68rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                }
                .console-top h3 { margin: 0; font-size: 1.08rem; line-height: 1.25; }
                .sync-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    height: 28px;
                    padding: 0 10px;
                    border-radius: 999px;
                    border: 1px solid rgba(0,169,154,.26);
                    color: rgba(247,250,250,.75);
                    font-size: .68rem;
                    white-space: nowrap;
                }

                .metric-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 14px;
                }
                .metric-card {
                    min-height: 80px;
                    padding: 14px;
                    border: 1px solid rgba(247,250,250,.09);
                    border-radius: 14px;
                    background: rgba(247,250,250,.04);
                }
                .metric-card strong { display: block; font-size: 1.4rem; margin-bottom: 7px; }
                .metric-card span { color: rgba(247,250,250,.5); font-size: .7rem; font-weight: 700; }

                .insight-panel {
                    border: 1px solid rgba(247,250,250,.1);
                    border-radius: 16px;
                    padding: 16px;
                    background: linear-gradient(145deg, rgba(0,169,154,.08), rgba(91,45,170,.08));
                }
                .panel-heading {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: rgba(247,250,250,.78);
                    font-size: .8rem;
                    font-weight: 800;
                    margin-bottom: 18px;
                }
                .chart-lines { height: 168px; display: grid; align-content: center; gap: 20px; }
                .chart-lines span {
                    display: block;
                    height: 34px;
                    border-radius: 999px;
                    background:
                        linear-gradient(90deg, transparent, rgba(0,169,154,.76), rgba(198,146,20,.75), transparent);
                    clip-path: polygon(0 65%, 14% 42%, 28% 56%, 42% 28%, 58% 46%, 72% 18%, 88% 44%, 100% 30%, 100% 48%, 88% 62%, 72% 38%, 58% 66%, 42% 48%, 28% 76%, 14% 62%, 0 84%);
                    opacity: .8;
                }
                .chart-lines span:nth-child(2) { opacity: .45; transform: translateX(16px); }
                .chart-lines span:nth-child(3) { opacity: .25; transform: translateX(-12px); }
                .risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .risk-grid div {
                    border-radius: 12px;
                    background: rgba(0,0,0,.23);
                    padding: 12px;
                }
                .risk-grid b { display: block; color: var(--gold); font-size: 1.2rem; }
                .risk-grid span { color: rgba(247,250,250,.52); font-size: .68rem; }

                .console-context { padding: 18px 14px; }
                .context-card {
                    border: 1px solid rgba(247,250,250,.1);
                    border-radius: 14px;
                    padding: 14px;
                    background: rgba(247,250,250,.04);
                    margin-bottom: 14px;
                }
                .context-card p { margin: 0 0 8px; color: rgba(247,250,250,.5); font-size: .68rem; }
                .context-card strong { display: block; color: #fff; font-size: 1.25rem; margin-bottom: 4px; }
                .context-card span { color: rgba(247,250,250,.5); font-size: .68rem; line-height: 1.4; }
                .context-list { display: grid; gap: 8px; }
                .context-list div {
                    display: flex;
                    gap: 7px;
                    align-items: flex-start;
                    color: rgba(247,250,250,.62);
                    font-size: .68rem;
                    line-height: 1.35;
                }
                .context-list svg { color: var(--teal); flex: 0 0 auto; margin-top: 1px; }

                .stats-band {
                    border-top: 1px solid rgba(247,250,250,.09);
                    border-bottom: 1px solid rgba(247,250,250,.09);
                    background: rgba(247,250,250,.025);
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1px;
                    background: rgba(247,250,250,.08);
                }
                .stat {
                    padding: 28px 18px;
                    background: rgba(8,7,11,.8);
                }
                .stat strong { display: block; font-size: clamp(1.7rem, 3vw, 2.45rem); line-height: 1; margin-bottom: 8px; }
                .stat span { color: rgba(247,250,250,.48); font-size: .76rem; font-weight: 650; }

                .split-section {
                    display: grid;
                    grid-template-columns: .66fr 1.34fr;
                    gap: 70px;
                    align-items: center;
                    padding: 92px 0;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }
                .section-copy h2,
                .wide-heading h2 {
                    margin: 0;
                    font-size: clamp(2.05rem, 4vw, 4.2rem);
                    line-height: .98;
                    letter-spacing: 0;
                    text-wrap: balance;
                }
                .section-copy p,
                .wide-heading p {
                    margin: 22px 0 0;
                    color: rgba(247,250,250,.58);
                    line-height: 1.75;
                    font-size: .96rem;
                    max-width: 430px;
                }
                .feature-list {
                    display: grid;
                    gap: 12px;
                    margin-top: 30px;
                }
                .feature-list div {
                    display: grid;
                    grid-template-columns: 34px 1fr;
                    gap: 12px;
                    align-items: flex-start;
                    color: rgba(247,250,250,.7);
                    font-size: .84rem;
                    line-height: 1.5;
                }
                .feature-list span {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    color: var(--teal);
                    background: rgba(0,169,154,.1);
                    border: 1px solid rgba(0,169,154,.15);
                }

                .capability-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 12px;
                    padding: 86px 0 100px;
                }
                .capability-card {
                    min-height: 258px;
                    border: 1px solid rgba(247,250,250,.1);
                    border-radius: 14px;
                    padding: 18px;
                    background:
                        radial-gradient(circle at 50% 0%, rgba(247,250,250,.1), transparent 42%),
                        rgba(247,250,250,.035);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .capability-card svg {
                    width: 42px;
                    height: 42px;
                    color: var(--teal);
                    padding: 10px;
                    border-radius: 50%;
                    background: rgba(0,169,154,.1);
                }
                .capability-card h3 { margin: 34px 0 10px; font-size: .96rem; line-height: 1.2; }
                .capability-card p { margin: 0; color: rgba(247,250,250,.5); font-size: .75rem; line-height: 1.55; }

                .insight-split {
                    display: grid;
                    grid-template-columns: .42fr .58fr;
                    gap: 70px;
                    align-items: center;
                    padding: 92px 0;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }

                .profile-board {
                    min-height: 430px;
                    display: grid;
                    grid-template-columns: 1fr .78fr;
                    gap: 1px;
                    overflow: hidden;
                    border: 1px solid rgba(247,250,250,.1);
                    border-radius: 18px;
                    background: rgba(247,250,250,.08);
                }
                .radar,
                .signal-list {
                    background: rgba(247,250,250,.035);
                    padding: 28px;
                }
                .radar {
                    position: relative;
                    display: grid;
                    place-items: center;
                    background:
                        radial-gradient(circle, rgba(247,250,250,.12) 0 1px, transparent 1px 100%),
                        rgba(247,250,250,.035);
                    background-size: 32px 32px;
                }
                .radar-core {
                    width: min(260px, 80%);
                    aspect-ratio: 1;
                    border-radius: 50%;
                    background:
                        conic-gradient(from -30deg, rgba(247,250,250,.1), #fff, rgba(0,169,154,.25), rgba(91,45,170,.5), rgba(198,146,20,.5), rgba(247,250,250,.08)),
                        radial-gradient(circle, rgba(255,255,255,.5), transparent 36%);
                    box-shadow: inset 0 0 40px rgba(0,0,0,.75), 0 0 80px rgba(0,169,154,.18);
                }
                .radar-axis {
                    position: absolute;
                    width: 74%;
                    height: 1px;
                    background: rgba(247,250,250,.15);
                }
                .radar-axis.b { transform: rotate(60deg); }
                .radar-axis.c { transform: rotate(-60deg); }
                .signal-list {
                    display: grid;
                    align-content: center;
                    gap: 12px;
                }
                .signal {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                    padding-bottom: 12px;
                    color: rgba(247,250,250,.64);
                    font-size: .78rem;
                }
                .signal b { color: #fff; }

                .device-stack {
                    min-height: 460px;
                    display: grid;
                    grid-template-columns: .88fr 1.12fr;
                    gap: 44px;
                    align-items: center;
                    padding: 30px;
                    border: 1px solid rgba(247,250,250,.1);
                    border-radius: 18px;
                    background:
                        radial-gradient(circle at 24% 50%, rgba(0,169,154,.2), transparent 18rem),
                        rgba(247,250,250,.035);
                }
                .device-terminal {
                    width: min(330px, 100%);
                    aspect-ratio: 1.24;
                    border-radius: 38px;
                    background: linear-gradient(145deg, #f7fafa, #bdc5c4);
                    margin: 0 auto;
                    position: relative;
                    box-shadow: 0 35px 80px rgba(0,0,0,.42);
                }
                .speaker {
                    position: absolute;
                    top: 34px;
                    left: 34px;
                    width: 88px;
                    height: 54px;
                    background-image: radial-gradient(circle, rgba(36,20,47,.45) 2px, transparent 3px);
                    background-size: 13px 13px;
                }
                .device-screen {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 108px;
                    height: 80px;
                    transform: translate(-50%, -50%);
                    display: grid;
                    place-items: center;
                    border-radius: 16px;
                    background: #17101d;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
                }
                .device-light {
                    position: absolute;
                    right: 40px;
                    top: 50%;
                    width: 13px;
                    height: 13px;
                    border-radius: 50%;
                    background: var(--teal);
                    box-shadow: 0 0 20px rgba(0,169,154,.9);
                }
                .device-copy h3 { margin: 0; font-size: clamp(1.8rem, 3vw, 3.2rem); line-height: 1.02; }
                .device-copy p { color: rgba(247,250,250,.58); line-height: 1.75; max-width: 510px; }
                .device-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
                .device-tags span {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 38px;
                    padding: 0 13px;
                    border-radius: 999px;
                    border: 1px solid rgba(247,250,250,.1);
                    color: rgba(247,250,250,.72);
                    font-size: .78rem;
                    font-weight: 750;
                }
                .device-tags svg { color: var(--teal); }

                .work-row {
                    padding: 92px 0;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }
                .work-row .section-copy {
                    margin-bottom: 52px;
                    max-width: 560px;
                }
                .step-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 22px;
                }
                .step-num {
                    width: 62px;
                    height: 62px;
                    display: grid;
                    place-items: center;
                    margin-bottom: 22px;
                    border-radius: 50%;
                    color: var(--gold);
                    background: radial-gradient(circle, rgba(198,146,20,.22), rgba(247,250,250,.04));
                    border: 1px solid rgba(198,146,20,.18);
                    font-weight: 850;
                }
                .step h3 { margin: 0 0 10px; font-size: .96rem; }
                .step p { margin: 0; color: rgba(247,250,250,.5); font-size: .78rem; line-height: 1.55; }

                .proof {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    gap: 40px;
                    align-items: center;
                    padding: 74px 0;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }
                .proof h2 { margin: 0; max-width: 470px; font-size: clamp(1.8rem, 3vw, 3rem); line-height: 1.05; }
                .logo-cloud {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-top: 28px;
                }
                .logo-cloud div {
                    height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(247,250,250,.08);
                    border-radius: 12px;
                    color: rgba(247,250,250,.55);
                    font-size: .78rem;
                    font-weight: 800;
                }
                .quote {
                    padding: 34px;
                    border-radius: 18px;
                    border: 1px solid rgba(247,250,250,.1);
                    background: rgba(247,250,250,.04);
                }
                .quote p { margin: 0; color: rgba(247,250,250,.78); font-size: 1.18rem; line-height: 1.6; }
                .quote footer { margin-top: 26px; color: rgba(247,250,250,.5); font-size: .8rem; }

                .deeper-insight {
                    padding: 110px 0;
                    text-align: center;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                    max-width: 680px;
                    margin: 0 auto;
                }
                .deeper-insight span {
                    color: var(--teal);
                    font-size: .7rem;
                    font-weight: 850;
                    text-transform: uppercase;
                    letter-spacing: .1em;
                    display: block;
                    margin-bottom: 28px;
                }
                .deeper-insight h2 {
                    margin: 0 0 22px;
                    font-size: clamp(2.6rem, 5vw, 5rem);
                    line-height: .96;
                    letter-spacing: -.01em;
                }
                .deeper-insight p {
                    color: rgba(247,250,250,.55);
                    font-size: .98rem;
                    line-height: 1.78;
                    max-width: 520px;
                    margin: 0 auto 28px;
                }
                .text-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(247,250,250,.65);
                    text-decoration: none;
                    font-size: .84rem;
                    font-weight: 700;
                    border-bottom: 1px solid rgba(247,250,250,.2);
                    padding-bottom: 2px;
                    transition: color .18s ease, border-color .18s ease;
                }
                .text-link:hover { color: #fff; border-color: rgba(247,250,250,.5); }

                .cta-panel {
                    display: grid;
                    grid-template-columns: .9fr 1.1fr;
                    gap: 44px;
                    align-items: center;
                    padding: 92px 0 68px;
                }
                .cta-panel h2 { margin: 0; font-size: clamp(2.3rem, 5vw, 5.2rem); line-height: .96; letter-spacing: 0; }
                .email-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: min(560px, 100%);
                    padding: 8px;
                    margin-left: auto;
                    border-radius: 999px;
                    background: rgba(247,250,250,.07);
                    border: 1px solid rgba(247,250,250,.1);
                }
                .email-box input {
                    flex: 1;
                    min-width: 0;
                    height: 44px;
                    padding: 0 18px;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: #fff;
                    font: inherit;
                    font-size: .85rem;
                }
                .email-box input::placeholder { color: rgba(247,250,250,.4); }
                .email-box .cta { border: 0; }

                .site-footer {
                    border-top: 1px solid rgba(247,250,250,.08);
                    padding: 36px 0 42px;
                }
                .footer-grid {
                    display: grid;
                    grid-template-columns: 1.6fr repeat(4, 1fr);
                    gap: 30px;
                }
                .footer-grid p { color: rgba(247,250,250,.45); font-size: .8rem; line-height: 1.65; max-width: 260px; }
                .footer-col h3 {
                    margin: 0 0 14px;
                    color: rgba(247,250,250,.75);
                    font-size: .78rem;
                }
                .footer-col a {
                    display: block;
                    margin: 9px 0;
                    color: rgba(247,250,250,.42);
                    text-decoration: none;
                    font-size: .78rem;
                }

                @media (max-width: 1060px) {
                    .hero,
                    .split-section,
                    .work-row,
                    .proof,
                    .cta-panel {
                        grid-template-columns: 1fr;
                    }
                    .hero { padding-top: 42px; }
                    .hero-visual { min-height: 560px; }
                    .capability-grid { grid-template-columns: repeat(3, 1fr); }
                    .email-box { margin-left: 0; }
                }

                @media (max-width: 820px) {
                    .nav-links { display: none; }
                    .hero-visual { min-height: auto; }
                    .orb { display: none; }
                    .console-shell {
                        grid-template-columns: 1fr;
                        min-height: 0;
                    }
                    .console-sidebar,
                    .console-context { display: none; }
                    .profile-board,
                    .device-stack,
                    .step-grid,
                    .footer-grid {
                        grid-template-columns: 1fr;
                    }
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .capability-grid { grid-template-columns: repeat(2, 1fr); }
                }

                @media (max-width: 560px) {
                    .nav-wrap,
                    .section { width: min(100% - 28px, 1180px); }
                    .nav-actions .signin { display: none; }
                    .hero-copy h1 { font-size: 3rem; }
                    .hero-copy p { font-size: .94rem; }
                    .metric-row,
                    .risk-grid,
                    .stats-grid,
                    .capability-grid,
                    .logo-cloud {
                        grid-template-columns: 1fr;
                    }
                    .capability-card { min-height: 220px; }
                    .split-section,
                    .work-row,
                    .proof,
                    .cta-panel { padding: 66px 0; }
                    .email-box {
                        align-items: stretch;
                        flex-direction: column;
                        border-radius: 18px;
                    }
                    .email-box .cta { width: 100%; }
                }
            `}</style>

            <header className="site-header">
                <div className="nav-wrap">
                    <Logo compact />
                    <nav className="nav-links" aria-label="Primary navigation">
                        {navItems.map((item) => (
                            <a href={`#${item.toLowerCase()}`} key={item}>{item}</a>
                        ))}
                    </nav>
                    <div className="nav-actions">
                        <Link className="signin" href="/auth/login">Sign in</Link>
                        <ArrowButton href="/auth/register">Book demo</ArrowButton>
                    </div>
                </div>
            </header>

            <section className="section hero">
                <div className="hero-copy">
                    <p className="hero-eyebrow">Introducing Edunostics</p>
                    <h1>A school technology layer for modern secondary education.</h1>
                    <p>
                        Edunostics connects assessment software, academic records, smart hardware touchpoints, and parent communication into one trusted operating system for secondary schools.
                    </p>
                    <div className="hero-actions">
                        <ArrowButton href="/auth/register">Book a school demo</ArrowButton>
                        <ArrowButton href="#platform" variant="ghost">Explore platform</ArrowButton>
                    </div>
                    <div className="trust-row">
                        <div className="avatar-stack" aria-hidden="true"><span /><span /><span /><span /></div>
                        <span>Built for proprietors, principals, teachers, parents, and students.</span>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="orb" aria-hidden="true" />
                    <ProductConsole />
                </div>
            </section>

            <section className="stats-band">
                <div className="section stats-grid">
                    {stats.map(([value, label]) => (
                        <div className="stat" key={label}>
                            <strong>{value}</strong>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section split-section" id="platform">
                <div className="section-copy">
                    <h2>A unified space for school operations, assessment, and growth.</h2>
                    <p>
                        Move beyond disconnected spreadsheets, devices, paper reports, and messaging tools. Edunostics keeps every learner signal connected.
                    </p>
                    <div className="feature-list">
                        {[
                            [Layers3, "Stacked student records across terms, classes, and sessions."],
                            [MonitorSmartphone, "Software portals for administrators, teachers, students, and parents."],
                            [Cpu, "Hardware-ready architecture for classroom devices and school identity systems."],
                            [ShieldCheck, "Secure role controls for every school stakeholder."],
                        ].map(([Icon, text]) => (
                            <div key={text as string}>
                                <span><Icon size={17} /></span>
                                <p>{text as string}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <ProductConsole />
            </section>

            <section className="section" id="insights">
                <div className="insight-split">
                    <div className="section-copy">
                        <span style={{ color: "var(--teal)", fontSize: ".7rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 20 }}>Intelligence profile</span>
                        <h2 style={{ margin: 0, fontSize: "clamp(2.05rem, 4vw, 4.2rem)", lineHeight: .98, letterSpacing: 0, textWrap: "balance" }}>Understand each learner before the term slips away.</h2>
                        <p style={{ margin: "22px 0 32px", color: "rgba(247,250,250,.58)", lineHeight: 1.75, fontSize: ".96rem" }}>
                            Edunostics maps academic performance, conduct, attendance, and engagement into a clear growth profile for school leaders.
                        </p>
                        <ArrowButton href="/auth/register" variant="ghost">Explore profile</ArrowButton>
                    </div>
                    <CognitiveProfile />
                </div>
            </section>

            <section className="section" id="hardware">
                <DeviceStack />
            </section>

            <section className="section" id="security">
                <div className="wide-heading">
                    <h2>Everything secondary schools need to operate with clarity.</h2>
                </div>
                <div className="capability-grid">
                    {capabilities.map(({ icon: Icon, title, body }) => (
                        <article className="capability-card" key={title}>
                            <Icon aria-hidden="true" />
                            <div>
                                <h3>{title}</h3>
                                <p>{body}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section work-row" id="how-it-works">
                <div className="section-copy">
                    <span style={{ color: "var(--teal)", fontSize: ".7rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 16 }}>How it works</span>
                    <h2 style={{ margin: 0, fontSize: "clamp(2.05rem, 4vw, 4.2rem)", lineHeight: .98 }}>A better way to manage, assess, report, and improve.</h2>
                    <p style={{ margin: "18px 0 0", color: "rgba(247,250,250,.58)", lineHeight: 1.75, fontSize: ".96rem" }}>
                        A complete workflow from school setup to parent-ready reports, built around real school operations.
                    </p>
                </div>
                <div className="step-grid">
                    {steps.map(([num, title, body]) => (
                        <div className="step" key={num}>
                            <div className="step-num">{num}</div>
                            <h3>{title}</h3>
                            <p>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section proof">
                <div>
                    <h2>Built for academic rigor. Designed for everyday school teams.</h2>
                    <div className="logo-cloud" aria-label="Audience groups">
                        {["Principals", "Teachers", "Parents", "Students", "Admins", "Proprietors"].map((name) => (
                            <div key={name}>{name}</div>
                        ))}
                    </div>
                </div>
                <blockquote className="quote">
                    <Sparkles size={28} color={palette.gold} aria-hidden="true" />
                    <p>
                        "Edunostics feels less like another school app and more like the operating layer that connects our assessments, reports, devices, and decisions."
                    </p>
                    <footer>School administrator, secondary education</footer>
                </blockquote>
            </section>

            <section className="section">
                <div className="deeper-insight">
                    <span>Deeper insight</span>
                    <h2>See every learner. Lead with clarity.</h2>
                    <p>
                        Edunostics brings academic records, assessment data, attendance signals, and parent reach into one operating view — so school leaders always know what is happening and what to do next.
                    </p>
                    <a href="#platform" className="text-link">
                        Explore the platform <ArrowRight size={14} aria-hidden="true" />
                    </a>
                </div>
            </section>

            <section className="section cta-panel" id="pricing">
                <div>
                    <h2>Step into the next era of school technology.</h2>
                </div>
                <form className="email-box" action="/auth/register">
                    <input aria-label="Work email" placeholder="Enter your school email" type="email" />
                    <button className="cta primary" type="submit">
                        <span>Request demo</span>
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </form>
            </section>

            <footer className="section site-footer">
                <div className="footer-grid">
                    <div>
                        <Logo compact />
                        <p>
                            Educational hardware and software technology for secondary schools. Precise, trusted, intelligent, school-ready, and secure.
                        </p>
                    </div>
                    {[
                        ["Product", "Overview", "Assessment", "Reports", "Hardware"],
                        ["Resources", "Documentation", "Support", "School setup", "Data security"],
                        ["Company", "About", "Contact", "Partners", "Careers"],
                        ["Legal", "Privacy", "Terms", "Status", "Security"],
                    ].map(([heading, ...links]) => (
                        <div className="footer-col" key={heading}>
                            <h3>{heading}</h3>
                            {links.map((link) => <a href="#" key={link}>{link}</a>)}
                        </div>
                    ))}
                </div>
            </footer>
        </main>
    );
}
