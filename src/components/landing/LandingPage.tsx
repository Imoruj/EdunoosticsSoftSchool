"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
    Activity,
    ArrowRight,
    BarChart3,
    BookOpen,
    Brain,
    Check,
    ChevronRight,
    Cpu,
    Crosshair,
    Database,
    Fingerprint,
    GraduationCap,
    HelpCircle,
    LayoutDashboard,
    Layers3,
    Lock,
    LockKeyhole,
    MessageSquareText,
    MonitorSmartphone,
    Network,
    ScanLine,
    School,
    Settings,
    ShieldCheck,
    Sparkles,
    TabletSmartphone,
    TrendingUp,
    User,
    Users,
    UsersRound,
    Wifi,
    Sun,
    Moon,
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
    { num: 24, suffix: "/7", label: "School operations" },
    { num: 99.9, suffix: "%", label: "Cloud uptime target" },
    { num: 1, suffix: " day", label: "Typical onboarding" },
    { num: 360, suffix: "°", label: "Student profile" },
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

const heroWords = ["modern", "Nigerian", "exceptional", "world-class"] as const;

const diPhrases = [
    "See every learner. Lead with clarity.",
    "Know every signal. Act with precision.",
    "One platform. Every student. Total clarity.",
];

function Logo({ compact = false }: { compact?: boolean }) {
    return (
        <Link href="/" aria-label="Edunostics home" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#00A99A', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                    src="/images/brand/logo-mark.png"
                    alt=""
                    aria-hidden="true"
                    style={{ height: compact ? 22 : 28, width: "auto", display: "block", flexShrink: 0, filter: "brightness(0) invert(1)" }}
                />
            </div>
            <span style={{ margin: 0 }}>Edunostics</span>
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
                <div className="side-item side-item--plain"><LayoutDashboard size={15} /><span>Dashboard</span></div>
                <div className="side-item side-item--plain"><BarChart3 size={15} /><span>Insights</span></div>
                <div className="side-item side-item--plain"><User size={15} /><span>My Profile</span></div>
                <div className="side-divider" />
                <div className="side-item side-item--group"><Users size={15} /><span>People</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-item side-item--active"><BookOpen size={15} /><span>Academics</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-item side-item--group"><GraduationCap size={15} /><span>Reports</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-item side-item--group"><School size={15} /><span>School</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-divider" />
                <div className="side-item side-item--plain"><Settings size={15} /><span>Settings</span></div>
                <div className="side-item side-item--plain"><HelpCircle size={15} /><span>Help &amp; Support</span></div>
            </div>
            <div className="console-assess">
                <div className="assess-header">
                    <p className="assess-subtitle">Behaviour &amp; Skills · SS 3 Diligence</p>
                    <p className="assess-title">Affective &amp; Psychomotor</p>
                    <p className="assess-desc">Assess student traits and skills (1–5 Scale)</p>
                </div>
                <div className="assess-filters">
                    {[
                        ["Academic Session", "2025/2026 (Current)"],
                        ["Term", "Third Term"],
                        ["Class", "SS 3 Diligence"],
                    ].map(([label, value]) => (
                        <div className="assess-filter-item" key={label}>
                            <span className="assess-filter-label">{label}</span>
                            <div className="assess-filter-select">
                                <span>{value}</span>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75L5 6.25l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="assess-groups">
                    <div className="assess-student-col" />
                    <div className="assess-group--aff">Affective Traits (1–5)</div>
                    <div className="assess-group--psy">Psychomotor Skills (1–5)</div>
                </div>
                <div className="assess-cols">
                    <div className="assess-student-col">Student</div>
                    <div className="assess-scores-head">
                        {["PUNC.", "NEAT.", "POLIT.", "CREAT.", "H/W", "SPORTS", "DRAW.", "PUB."].map(h => <span key={h}>{h}</span>)}
                    </div>
                </div>
                {([
                    ["Okafor Chukwudi", "KSS/2025/0042", [4,5,3,4,4,3,3,4]],
                    ["Adebayo Fatimah", "KSS/2025/0051", [3,4,3,3,0,0,0,0]],
                    ["Nwosu Emmanuel", "KSS/2025/0038", [3,5,4,3,5,3,3,4]],
                    ["Abara Chidinma", "KSS/2025/0067", [3,4,4,3,3,4,3,3]],
                ] as [string, string, number[]][]).map(([name, id, scores]) => (
                    <div className="assess-row" key={id}>
                        <div className="assess-student">
                            <span>{name}</span>
                            <small>{id}</small>
                        </div>
                        <div className="assess-bubbles">
                            {scores.map((s, i) => (
                                <div key={i} className={`bubble bubble--${s || "empty"}`}>{s || "–"}</div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="assess-footer">
                    <span>Click any rating box to cycle score: 1 → 2 → 3 → 4 → 5 → 1</span>
                    <div className="assess-save">Save</div>
                </div>
            </div>
        </div>
    );
}

function ScoreEntryConsole() {
    const rows = [
        ["Okafor Chukwudi",  "KSS/2025/0042", 12.5, 13.0, 52.0, 77.5, "B2", "Good",      "high"],
        ["Adebayo Fatimah",  "KSS/2025/0051",  9.0, 11.5, 44.3, 64.8, "C4", "Credit",    "mid"],
        ["Nwosu Emmanuel",   "KSS/2025/0038", 14.0, 13.5, 61.0, 88.5, "A1", "Excellent", "top"],
        ["Abara Chidinma",   "KSS/2025/0067", 11.0, 12.0, 48.5, 71.5, "B3", "Good",      "high"],
    ] as [string, string, number, number, number, number, string, string, string][];

    return (
        <div className="console-shell" aria-label="Edunostics score entry preview">
            <div className="console-sidebar">
                <Logo compact />
                <div className="side-item side-item--plain"><LayoutDashboard size={15} /><span>Dashboard</span></div>
                <div className="side-item side-item--plain"><BarChart3 size={15} /><span>Insights</span></div>
                <div className="side-divider" />
                <div className="se-section-label">Academics</div>
                <div className="side-item side-item--active"><Sparkles size={14} /><span>Score Entry</span></div>
                <div className="side-item side-item--sub"><span>Score Reviews</span></div>
                <div className="side-item side-item--sub"><span>Class Progress</span></div>
                <div className="side-item side-item--sub"><span>Broadsheet</span></div>
                <div className="side-divider" />
                <div className="side-item side-item--group"><GraduationCap size={15} /><span>Reports</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-item side-item--group"><School size={15} /><span>School</span><ChevronRight size={11} className="side-chevron" /></div>
                <div className="side-divider" />
                <div className="side-item side-item--plain"><Settings size={15} /><span>Settings</span></div>
                <div className="side-item side-item--plain"><HelpCircle size={15} /><span>Help &amp; Support</span></div>
            </div>
            <div className="console-se">
                {/* Header */}
                <div className="se-header">
                    <div>
                        <p className="se-title">Score Entry</p>
                        <p className="se-subtitle">Record and manage assessment scores</p>
                    </div>
                    <div className="se-actions">
                        <div className="se-action-btn">Download Template</div>
                        <div className="se-action-btn se-action-btn--primary">Save Scores</div>
                    </div>
                </div>
                {/* Filters */}
                <div className="se-filters">
                    {[["Session","2025/2026"],["Term","Third Term"],["Class","SS 3 Diligence"],["Subject","Economics (ECO)"]].map(([lbl,val]) => (
                        <div className="se-filter" key={lbl}>
                            <span className="se-filter-label">{lbl}</span>
                            <div className="se-filter-val">
                                <span>{val}</span>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75L5 6.25l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Approval banner */}
                <div className="se-approval">
                    <span className="se-approved-badge">Approved</span>
                    <span className="se-approval-text">Class teacher has approved these scores.</span>
                    <div className="se-approval-btns">
                        <div className="se-btn se-btn--green">Approve</div>
                        <div className="se-btn se-btn--red">Reject</div>
                        <div className="se-btn se-btn--blue">Broadcast</div>
                    </div>
                </div>
                {/* Enrollment info */}
                <div className="se-enroll">
                    <span>24 of 24 students enrolled in this subject</span>
                    <div className="se-avg">Avg: <strong>70.5</strong> &nbsp; Pass Rate: <strong className="se-pass">100%</strong></div>
                </div>
                {/* Table */}
                <div className="se-table">
                    <div className="se-thead">
                        <span className="se-sn">#</span>
                        <span className="se-stud">Student</span>
                        <span className="se-score">CA1</span>
                        <span className="se-score">CA2</span>
                        <span className="se-score">Exam</span>
                        <span className="se-score se-total-h">Total</span>
                        <span className="se-grade-h">Grade</span>
                        <span className="se-remark">Remark</span>
                    </div>
                    {rows.map(([name, id, ca1, ca2, exam, total, grade, remark, lvl], i) => (
                        <div className="se-row" key={id}>
                            <span className="se-sn se-muted">{i + 1}</span>
                            <div className="se-stud">
                                <span>{name}</span>
                                <small>{id}</small>
                            </div>
                            <span className="se-score se-muted">{ca1}</span>
                            <span className="se-score se-muted">{ca2}</span>
                            <span className="se-score se-muted">{exam}</span>
                            <span className={`se-score se-total-h se-total--${lvl}`}>{total}</span>
                            <span className="se-grade-h">
                                <span className={`se-grade-pill se-grade--${lvl}`}>{grade}</span>
                            </span>
                            <span className="se-remark se-muted">{remark}</span>
                        </div>
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
                    <p style={{ margin: "8px 0 0", color: "var(--text-sec)", fontSize: ".78rem", lineHeight: 1.5 }}>Strong academic pattern with high assessment consistency and engagement signals.</p>
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

function AcademicOrbit() {
    const pos = (angle: number, r: number): React.CSSProperties => {
        const rad = (angle * Math.PI) / 180;
        return {
            top: `calc(50% + ${(-r * Math.cos(rad)).toFixed(2)}px)`,
            left: `calc(50% + ${(r * Math.sin(rad)).toFixed(2)}px)`,
            transform: "translate(-50%, -50%)",
            position: "absolute",
        };
    };
    return (
        <div className="acad-orbit" aria-hidden="true">
            {/* Ring 1 — class level (r=224), teal nodes, rotates CW */}
            <div className="acad-ring acad-r1">
                {[0, 120, 240].map((a) => (
                    <div className="acad-node acad-nc" style={pos(a, 224)} key={a} />
                ))}
            </div>
            {/* Ring 2 — student level (r=288), purple nodes, counter-rotates */}
            <div className="acad-ring acad-r2">
                {[0, 72, 144, 216, 288].map((a) => (
                    <div className="acad-node acad-ns" style={pos(a, 288)} key={a} />
                ))}
            </div>
            {/* Ring 3 — grade signal dots (r=368), gold, slow CW */}
            <div className="acad-ring acad-r3">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <div className="acad-dot" style={pos(a, 368)} key={a} />
                ))}
            </div>
            {/* Central intelligence core */}
            <div className="acad-core">
                <div className="acad-core-inner" />
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

function CapabilityCard({ Icon, title, body }: { Icon: React.ElementType; title: string; body: string }) {
    const cardRef = useRef<HTMLElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const mx = (x / rect.width) * 100;
        const my = (y / rect.height) * 100;
        // Tilt: max ±6 degrees
        const rotateY = ((x / rect.width) - 0.5) * 12;
        const rotateX = ((y / rect.height) - 0.5) * -12;
        card.style.setProperty('--mx', `${mx}%`);
        card.style.setProperty('--my', `${my}%`);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) translateZ(12px)`;
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (!card) return;
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    };

    return (
        <article
            className="capability-card"
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="card-inner">
                <div className="cap-icon">
                    <Icon size={22} aria-hidden="true" />
                </div>
                <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                </div>
            </div>
        </article>
    );
}

function StatCounter({ num, suffix, label }: { num: number; suffix: string; label: string }) {
    const [count, setCount] = useState(0);
    const started = useRef(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                obs.disconnect();
                const duration = 1800;
                const startTime = performance.now();
                const tick = (now: number) => {
                    const t = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - t, 3);
                    setCount(Math.round(eased * num * 10) / 10);
                    if (t < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [num]);

    const display = Number.isInteger(num) ? Math.round(count) : count.toFixed(1);
    return (
        <div className="stat" ref={ref}>
            <strong>{display}{suffix}</strong>
            <span>{label}</span>
        </div>
    );
}

export default function LandingPage() {
    /* ── Hero word-cycle animation ───────────────────────────── */
    const [hwIdx, setHwIdx] = useState(0);
    const [hwPhase, setHwPhase] = useState<"idle" | "exit" | "reset" | "enter">("idle");
    const hwTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const hwRaf = useRef<number>(0);

    useEffect(() => {
        const id = setInterval(() => {
            setHwPhase("exit");
            hwTimer.current = setTimeout(() => {
                setHwIdx((i) => (i + 1) % heroWords.length);
                setHwPhase("reset");
                hwRaf.current = requestAnimationFrame(() => {
                    hwRaf.current = requestAnimationFrame(() => {
                        setHwPhase("enter");
                        hwTimer.current = setTimeout(() => setHwPhase("idle"), 420);
                    });
                });
            }, 340);
        }, 3400);
        return () => {
            clearInterval(id);
            clearTimeout(hwTimer.current);
            cancelAnimationFrame(hwRaf.current);
        };
    }, []);

    /* ── Scroll progress + nav spy ──────────────────────────── */
    const [scrollPct, setScrollPct] = useState(0);
    const [activeSection, setActiveSection] = useState("");

    useEffect(() => {
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            setScrollPct(scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const ids = ["platform", "hardware", "insights", "security", "pricing"];
        const sections = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
        const obs = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
            { rootMargin: "-20% 0px -70% 0px" }
        );
        sections.forEach(s => obs.observe(s));
        return () => obs.disconnect();
    }, []);

    /* ── Deeper-insight typing animation ────────────────────── */
    const [diText, setDiText] = useState("");
    const [diPhraseIdx, setDiPhraseIdx] = useState(0);
    const [diDeleting, setDiDeleting] = useState(false);

    useEffect(() => {
        const full = diPhrases[diPhraseIdx];
        if (!diDeleting && diText === full) {
            const t = setTimeout(() => setDiDeleting(true), 2600);
            return () => clearTimeout(t);
        }
        if (diDeleting && diText === "") {
            setDiPhraseIdx(i => (i + 1) % diPhrases.length);
            setDiDeleting(false);
            return;
        }
        const speed = diDeleting ? 24 : 54;
        const t = setTimeout(() => {
            setDiText(prev =>
                diDeleting ? prev.slice(0, -1) : full.slice(0, prev.length + 1)
            );
        }, speed);
        return () => clearTimeout(t);
    }, [diText, diDeleting, diPhraseIdx]);

    /* ── Scroll-reveal ───────────────────────────────────────── */
    useEffect(() => {
        const targets = document.querySelectorAll<Element>("[data-reveal], [data-reveal-group]");
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in-view");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "0px 0px -40px 0px", threshold: 0 }
        );
        targets.forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, []);

    /* ── Theme toggle ─────────────────────────────────────────── */
    const { theme, toggleTheme } = useTheme();

    return (
        <main className="ed-page">
            <div className="scroll-progress" style={{ transform: `scaleX(${scrollPct / 100})` }} aria-hidden="true" />
            <style>{`
                :root {
                    --aubergine: ${palette.aubergine};
                    --teal: ${palette.teal};
                    --gold: ${palette.gold};
                    --purple: ${palette.purple};
                    --graphite: ${palette.graphite};
                    --cloud: ${palette.cloud};
                    --text-sec: rgba(247,250,250,.58);
                    --text-muted: rgba(247,250,250,.42);
                }
                [data-theme="light"] {
                    --text-sec: rgba(15,23,42,.58);
                    --text-muted: rgba(15,23,42,.42);
                }

                html { scroll-behavior: smooth; }

                .ed-page {
                    min-height: 100vh;
                    padding-top: 72px;
                    background:
                        radial-gradient(circle at 20% 8%, rgba(0,169,154,.22), transparent 25rem),
                        radial-gradient(circle at 82% 12%, rgba(91,45,170,.20), transparent 24rem),
                        linear-gradient(180deg, #08070b 0%, #0d0b12 48%, #09080c 100%);
                    color: var(--cloud);
                    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
                    overflow-x: hidden;
                }

                /* Grain texture — subtle premium material feel */
                .ed-page::after {
                    content: '';
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 999;
                    opacity: .028;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
                    background-size: 200px 200px;
                }

                /* Scroll progress bar */
                .scroll-progress {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 2px;
                    background: linear-gradient(90deg, var(--teal) 0%, #8B6BF2 50%, var(--gold) 100%);
                    transform-origin: left center;
                    z-index: 300;
                    pointer-events: none;
                    will-change: transform;
                }

                /* Nav spy active indicator */
                .nav-links a { position: relative; }
                .nav-links a.nav-active { color: #fff; }
                .nav-links a.nav-active::after {
                    content: '';
                    position: absolute;
                    bottom: -4px; left: 0; right: 0;
                    height: 1.5px;
                    background: var(--teal);
                    border-radius: 999px;
                    animation: nav-ui .22s ease both;
                }
                @keyframes nav-ui {
                    from { transform: scaleX(0); opacity: 0; }
                    to   { transform: scaleX(1); opacity: 1; }
                }

                /* Accessible focus ring — on-brand */
                .ed-page :focus-visible {
                    outline: 2px solid var(--teal);
                    outline-offset: 3px;
                    border-radius: 4px;
                }

                .ed-page * { box-sizing: border-box; }
                .ed-page a { color: inherit; }

                /* ── Scroll-reveal system ────────────────────────────────── */
                /* Elements start invisible + shifted down; JS adds .in-view once visible */
                [data-reveal] {
                    opacity: 0;
                    transform: translateY(28px);
                    transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
                }
                [data-reveal].in-view {
                    opacity: 1;
                    transform: none;
                }
                /* Staggered children — each child delays by its index × 80ms */
                [data-reveal-group] > * {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
                }
                [data-reveal-group].in-view > *:nth-child(1) { opacity:1; transform:none; transition-delay: 0ms;   }
                [data-reveal-group].in-view > *:nth-child(2) { opacity:1; transform:none; transition-delay: 80ms;  }
                [data-reveal-group].in-view > *:nth-child(3) { opacity:1; transform:none; transition-delay: 160ms; }
                [data-reveal-group].in-view > *:nth-child(4) { opacity:1; transform:none; transition-delay: 240ms; }
                [data-reveal-group].in-view > *:nth-child(5) { opacity:1; transform:none; transition-delay: 320ms; }
                [data-reveal-group].in-view > *:nth-child(6) { opacity:1; transform:none; transition-delay: 400ms; }

                /* Hero copy enters from left */
                [data-reveal="left"] {
                    opacity: 0;
                    transform: translateX(-24px);
                    transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
                }
                [data-reveal="left"].in-view { opacity: 1; transform: none; }

                /* Console / visual enters from right */
                [data-reveal="right"] {
                    opacity: 0;
                    transform: translateX(24px);
                    transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
                }
                [data-reveal="right"].in-view { opacity: 1; transform: none; }

                /* Scale-up (stats numbers, CTA panel) */
                [data-reveal="scale"] {
                    opacity: 0;
                    transform: scale(0.96);
                    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
                }
                [data-reveal="scale"].in-view { opacity: 1; transform: none; }

                /* Reduced-motion: skip all animations */
                @media (prefers-reduced-motion: reduce) {
                    [data-reveal], [data-reveal-group] > * {
                        opacity: 1 !important;
                        transform: none !important;
                        transition: none !important;
                    }
                }

                /* ── Hero word-cycle ─────────────────────────────────── */
                .hw-word { display: inline-block; color: var(--teal); }
                .hw-idle,
                .hw-enter {
                    opacity: 1;
                    transform: translateY(0);
                    transition: opacity .42s cubic-bezier(0.22, 1, 0.36, 1),
                                transform .42s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .hw-exit {
                    opacity: 0;
                    transform: translateY(-20px);
                    transition: opacity .28s ease-in, transform .28s ease-in;
                }
                .hw-reset {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: none;
                }
                @media (prefers-reduced-motion: reduce) {
                    .hw-word { transition: none !important; opacity: 1 !important; transform: none !important; }
                }

                /* ── Brand type scale ─────────────────────────────────── */
                /* Satoshi → all headings (h1–h3, hero, section heads) */
                .ed-page h1,
                .ed-page h2,
                .ed-page h3 {
                    font-family: 'Satoshi', 'Manrope', system-ui, sans-serif;
                    font-weight: 700;
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
                .logo-cloud div {
                    font-family: 'Manrope', system-ui, sans-serif;
                }

                .site-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
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

                .brand img {
                    filter: brightness(1.15) saturate(1.25)
                            drop-shadow(0 0 10px rgba(0,169,154,.35))
                            drop-shadow(0 2px 4px rgba(0,0,0,.4));
                    transition: filter .25s ease;
                }
                .brand:hover img {
                    filter: brightness(1.28) saturate(1.4)
                            drop-shadow(0 0 18px rgba(0,169,154,.6))
                            drop-shadow(0 2px 6px rgba(0,0,0,.4));
                }

                .brand span {
                    font-size: 1rem;
                    font-family: 'Satoshi', 'Manrope', system-ui, sans-serif;
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
                    transition: border-color .2s ease, background .2s ease, color .2s ease, transform .2s ease;
                }
                .signin:hover {
                    border-color: rgba(247,250,250,.3);
                    background: rgba(247,250,250,.07);
                    color: #fff;
                    transform: translateY(-1px);
                }
                .signin:active { transform: scale(0.97); }

                .theme-toggle {
                    width: 36px; height: 36px;
                    display: grid; place-items: center;
                    border-radius: 50%;
                    border: 1px solid rgba(247,250,250,.14);
                    background: transparent;
                    color: rgba(247,250,250,.65);
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: border-color .2s ease, background .2s ease, color .2s ease,
                                transform .22s cubic-bezier(0.22,1,0.36,1);
                }
                .theme-toggle:hover {
                    border-color: rgba(247,250,250,.32);
                    background: rgba(247,250,250,.08);
                    color: #fff;
                    transform: rotate(20deg) scale(1.1);
                }
                .theme-toggle:active { transform: scale(0.92); }

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
                    position: relative;
                    overflow: hidden;
                    transition: transform .22s cubic-bezier(0.22,1,0.36,1),
                                box-shadow .22s ease,
                                border-color .2s ease,
                                background .2s ease,
                                color .2s ease;
                }
                /* Icon nudges right on hover */
                .cta svg { transition: transform .22s cubic-bezier(0.22,1,0.36,1); }
                .cta:hover { transform: translateY(-2px); }
                .cta:hover svg { transform: translateX(3px); }
                .cta:active { transform: translateY(0) scale(0.97) !important; box-shadow: none !important; }

                /* Primary — teal consistent with marketing pages */
                .cta.primary { background: #00A99A; color: #fff; }
                .cta.primary::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -80%;
                    width: 50%; height: 100%;
                    background: linear-gradient(105deg, transparent, rgba(255,255,255,.25), transparent);
                    transform: skewX(-18deg);
                    transition: left .52s ease;
                    pointer-events: none;
                }
                .cta.primary:hover {
                    box-shadow: 0 6px 28px rgba(0,169,154,.4), 0 2px 8px rgba(0,169,154,.2);
                }
                .cta.primary:hover::after { left: 140%; }

                /* Ghost — border + subtle fill brightens */
                .cta.ghost { border: 1px solid rgba(247,250,250,.13); color: rgba(247,250,250,.78); }
                .cta.ghost:hover {
                    border-color: rgba(247,250,250,.3);
                    background: rgba(247,250,250,.07);
                    color: rgba(247,250,250,1);
                    box-shadow: 0 4px 18px rgba(0,0,0,.2);
                }

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
                    padding: 51px 0 38px;
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
                    font-size: clamp(2rem, 4.4vw, 4.5rem);
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
                    min-height: 820px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* ── Academic Orbit — animated school data hierarchy ──────── */
                @keyframes acad-cw  { to { transform: rotate( 360deg); } }
                @keyframes acad-ccw { to { transform: rotate(-360deg); } }
                @keyframes acad-pulse {
                    0%,100% { box-shadow: 0 0 40px rgba(0,169,154,.55), 0 0 90px rgba(0,169,154,.22); }
                    50%     { box-shadow: 0 0 72px rgba(0,169,154,.9),  0 0 160px rgba(0,169,154,.38); }
                }
                @keyframes acad-core-spin {
                    to { transform: translate(-50%,-50%) rotate(360deg); }
                }
                @keyframes acad-blink {
                    0%,100% { opacity: .65; transform: translate(-50%,-50%) scale(1); }
                    50%     { opacity: 1;   transform: translate(-50%,-50%) scale(1.14); }
                }
                @keyframes acad-halo {
                    0%,100% { transform: translate(-50%,-50%) scale(1);   opacity: .18; }
                    50%     { transform: translate(-50%,-50%) scale(1.22); opacity: .06; }
                }

                .acad-orbit {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 800px;
                    height: 800px;
                    pointer-events: none;
                    z-index: 1;
                }

                .acad-ring {
                    position: absolute;
                    top: 50%; left: 50%;
                    border-radius: 50%;
                }

                /* r=224 */
                .acad-r1 {
                    width: 448px; height: 448px;
                    margin: -224px 0 0 -224px;
                    border: 1px solid rgba(0,169,154,.38);
                    box-shadow: 0 0 28px rgba(0,169,154,.14), inset 0 0 28px rgba(0,169,154,.07);
                    animation: acad-cw 24s linear infinite;
                }
                /* r=288 */
                .acad-r2 {
                    width: 576px; height: 576px;
                    margin: -288px 0 0 -288px;
                    border: 1px solid rgba(91,45,170,.28);
                    box-shadow: 0 0 22px rgba(91,45,170,.1), inset 0 0 22px rgba(91,45,170,.05);
                    animation: acad-ccw 42s linear infinite;
                }
                /* r=368 */
                .acad-r3 {
                    width: 736px; height: 736px;
                    margin: -368px 0 0 -368px;
                    border: 1px dashed rgba(198,146,20,.18);
                    box-shadow: 0 0 18px rgba(198,146,20,.07);
                    animation: acad-cw 75s linear infinite;
                }

                .acad-node {
                    position: absolute;
                    border-radius: 50%;
                }
                .acad-nc {
                    width: 16px; height: 16px;
                    background: var(--teal);
                    box-shadow: 0 0 20px rgba(0,169,154,1), 0 0 44px rgba(0,169,154,.6), 0 0 80px rgba(0,169,154,.25);
                    animation: acad-blink 2.8s ease-in-out infinite;
                }
                .acad-nc:nth-child(2) { animation-delay: -.9s; }
                .acad-nc:nth-child(3) { animation-delay: -1.8s; }
                .acad-ns {
                    width: 10px; height: 10px;
                    background: #8B6BF2;
                    box-shadow: 0 0 14px rgba(139,107,242,.95), 0 0 30px rgba(139,107,242,.45);
                    animation: acad-blink 3.4s ease-in-out infinite;
                }
                .acad-ns:nth-child(2) { animation-delay: -.68s; }
                .acad-ns:nth-child(3) { animation-delay: -1.36s; }
                .acad-ns:nth-child(4) { animation-delay: -2.04s; }
                .acad-ns:nth-child(5) { animation-delay: -2.72s; }
                .acad-dot {
                    position: absolute;
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: rgba(198,146,20,.9);
                    box-shadow: 0 0 10px rgba(198,146,20,.8), 0 0 20px rgba(198,146,20,.35);
                    animation: acad-blink 4s ease-in-out infinite;
                }

                .acad-core {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%,-50%);
                    width: 54px; height: 54px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 36% 34%, #00A99A 0%, rgba(0,169,154,.35) 58%, transparent 100%);
                    box-shadow: 0 0 50px rgba(0,169,154,.6), 0 0 100px rgba(0,169,154,.25);
                    animation: acad-pulse 3.6s ease-in-out infinite;
                }
                /* spinning inner cross-hair */
                .acad-core-inner {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%,-50%);
                    width: 30px; height: 30px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(247,250,250,.55);
                    border-top-color: transparent;
                    animation: acad-core-spin 2.4s linear infinite;
                }
                /* ambient halo — soft glow behind the console */
                .acad-orbit::before {
                    content: '';
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%,-50%) scale(1);
                    width: 704px; height: 704px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(0,169,154,.09) 0%, rgba(91,45,170,.06) 38%, transparent 65%);
                    animation: acad-halo 7s ease-in-out infinite;
                }


                @media (prefers-reduced-motion: reduce) {
                    .acad-ring, .acad-core, .acad-core-inner,
                    .acad-node, .acad-dot, .acad-orbit::before {
                        animation: none !important;
                        opacity: 1 !important;
                    }
                }

                .console-shell {
                    position: relative;
                    z-index: 2;
                    width: min(800px, 100%);
                    min-height: 500px;
                    display: grid;
                    grid-template-columns: 148px 1fr;
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
                    height: 32px;
                    padding: 0 10px;
                    border-radius: 8px;
                    color: rgba(247,250,250,.52);
                    font-size: .72rem;
                    font-weight: 600;
                    cursor: default;
                }
                .side-item--group { color: rgba(247,250,250,.42); font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
                .side-item--active { background: rgba(99,102,241,.18); color: #818cf8; font-weight: 700; }
                .side-item--sub { padding-left: 26px; height: 26px; font-size: .68rem; color: rgba(247,250,250,.38); }
                .side-chevron { margin-left: auto; opacity: .5; }
                .side-divider { height: 1px; background: rgba(247,250,250,.07); margin: 6px 10px; }
                .se-section-label { font-size: .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(247,250,250,.28); padding: 4px 10px; margin-top: 2px; }

                /* ── Assessment panel ─────────────────────────────────── */
                .console-assess {
                    grid-column: 2;
                    padding: 14px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    overflow: hidden;
                    background: rgba(17,13,23,.92);
                    backdrop-filter: blur(18px);
                }
                .assess-header { margin-bottom: 0; }
                .assess-subtitle { margin: 0 0 2px; font-size: .58rem; color: rgba(247,250,250,.4); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
                .assess-title { margin: 0 0 1px; font-size: .88rem; font-weight: 700; color: #fff; }
                .assess-desc { margin: 0; font-size: .6rem; color: rgba(247,250,250,.38); }

                /* Filter bar (Academic Session / Term / Class) */
                .assess-filters {
                    display: grid; grid-template-columns: repeat(3,1fr); gap: 8px;
                    padding: 9px 10px; border-radius: 8px;
                    border: 1px solid rgba(247,250,250,.08);
                    background: rgba(247,250,250,.03);
                }
                .assess-filter-item { display: flex; flex-direction: column; gap: 4px; }
                .assess-filter-label { font-size: .5rem; color: rgba(247,250,250,.35); font-weight: 600; letter-spacing: .05em; }
                .assess-filter-select {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 4px 8px; border-radius: 5px;
                    border: 1px solid rgba(247,250,250,.12);
                    background: rgba(247,250,250,.05);
                    font-size: .58rem; color: rgba(247,250,250,.75); font-weight: 500;
                }
                .assess-filter-select svg { opacity: .45; flex-shrink: 0; }

                /* Group headers — 184px each = 4 bubbles×40px + 3 gaps×8px */
                .assess-groups { display: flex; align-items: stretch; }
                .assess-groups .assess-student-col { min-width: 108px; width: 108px; flex-shrink: 0; }
                .assess-group--aff, .assess-group--psy {
                    width: 184px; flex-shrink: 0; text-align: center;
                    font-size: .52rem; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .06em; padding: 5px 4px;
                    border-radius: 6px 6px 0 0; white-space: nowrap;
                }
                .assess-group--aff { background: rgba(99,102,241,.15); color: rgba(129,140,248,.9); margin-right: 8px; }
                .assess-group--psy { background: rgba(34,197,94,.1); color: rgba(74,222,128,.85); }

                .assess-cols { display: flex; align-items: center; padding-bottom: 6px; border-bottom: 1px solid rgba(247,250,250,.07); }
                .assess-student-col { width: 108px; flex-shrink: 0; font-size: .52rem; font-weight: 700; color: rgba(247,250,250,.28); text-transform: uppercase; letter-spacing: .05em; }
                .assess-scores-head { display: flex; gap: 8px; }
                .assess-scores-head span { width: 40px; text-align: center; font-size: .5rem; font-weight: 700; color: rgba(247,250,250,.3); text-transform: uppercase; overflow: hidden; }
                .assess-row { display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(247,250,250,.04); }
                .assess-student { width: 108px; flex-shrink: 0; }
                .assess-student span { display: block; font-size: .66rem; font-weight: 600; color: rgba(247,250,250,.82); line-height: 1.25; }
                .assess-student small { display: block; font-size: .52rem; color: rgba(247,250,250,.32); }
                .assess-bubbles { display: flex; gap: 8px; }
                .bubble {
                    width: 40px; height: 40px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: .76rem; font-weight: 700; flex-shrink: 0;
                }
                .bubble--5 { background: rgba(34,197,94,.18); color: #4ade80; border: 1px solid rgba(34,197,94,.28); }
                .bubble--4 { background: rgba(99,102,241,.18); color: #818cf8; border: 1px solid rgba(99,102,241,.28); }
                .bubble--3 { background: rgba(234,179,8,.18); color: #facc15; border: 1px solid rgba(234,179,8,.28); }
                .bubble--empty { background: rgba(247,250,250,.05); color: rgba(247,250,250,.3); border: 1px solid rgba(247,250,250,.1); }
                .assess-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
                .assess-footer span { font-size: .54rem; color: rgba(247,250,250,.28); }
                .assess-save { background: #4f46e5; color: #fff; border-radius: 7px; padding: 5px 14px; font-size: .64rem; font-weight: 700; cursor: pointer; }

                /* ── Report console panel ────────────────────────────── */
                .console-report {
                    grid-column: 2;
                    padding: 14px 16px;
                    display: flex; flex-direction: column; gap: 8px;
                    overflow: hidden;
                    background: rgba(17,13,23,.92);
                    backdrop-filter: blur(18px);
                }
                .rpt-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .rpt-eyebrow { margin: 0 0 2px; font-size: .56rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(247,250,250,.38); }
                .rpt-title { margin: 0; font-size: .88rem; font-weight: 700; color: #fff; }
                .rpt-term-badge { font-size: .52rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: rgba(0,169,154,.14); color: #2dd4bf; border: 1px solid rgba(0,169,154,.22); white-space: nowrap; flex-shrink: 0; }
                .rpt-student-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(247,250,250,.04); border: 1px solid rgba(247,250,250,.07); }
                .rpt-avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(99,102,241,.25); color: #818cf8; font-size: .58rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .rpt-student-info { flex: 1; }
                .rpt-student-info span { display: block; font-size: .66rem; font-weight: 600; color: rgba(247,250,250,.85); }
                .rpt-student-info small { font-size: .5rem; color: rgba(247,250,250,.35); }
                .rpt-overall { font-size: .9rem; font-weight: 800; flex-shrink: 0; }
                .rpt-overall--high { color: #4ade80; }
                .rpt-overall--mid  { color: #818cf8; }
                .rpt-table { display: flex; flex-direction: column; gap: 0; }
                .rpt-thead, .rpt-row { display: flex; align-items: center; padding: 5px 0; }
                .rpt-thead { border-bottom: 1px solid rgba(247,250,250,.08); }
                .rpt-row { border-bottom: 1px solid rgba(247,250,250,.04); }
                .rpt-col-subj { flex: 1; font-size: .6rem; }
                .rpt-thead .rpt-col-subj { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); font-size: .5rem; }
                .rpt-col-num { width: 36px; text-align: center; font-size: .62rem; flex-shrink: 0; }
                .rpt-thead .rpt-col-num { font-size: .5rem; font-weight: 700; text-transform: uppercase; color: rgba(247,250,250,.28); }
                .rpt-col-grade { width: 40px; text-align: center; font-size: .62rem; font-weight: 700; flex-shrink: 0; }
                .rpt-thead .rpt-col-grade { font-size: .5rem; text-transform: uppercase; color: rgba(247,250,250,.28); }
                .rpt-muted { color: rgba(247,250,250,.45); }
                .rpt-total--high { color: #4ade80; font-weight: 700; }
                .rpt-total--mid  { color: #818cf8; font-weight: 700; }
                .rpt-total--low  { color: #facc15; font-weight: 700; }
                .rpt-grade--high { color: #4ade80; }
                .rpt-grade--mid  { color: #818cf8; }
                .rpt-grade--low  { color: #facc15; }
                .rpt-row .rpt-col-subj { color: rgba(247,250,250,.78); }
                .rpt-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
                .rpt-footer span { font-size: .52rem; color: rgba(247,250,250,.28); }
                .rpt-download { background: rgba(0,169,154,.18); color: #2dd4bf; border: 1px solid rgba(0,169,154,.28); border-radius: 7px; padding: 5px 12px; font-size: .62rem; font-weight: 700; cursor: pointer; }

                /* ── Score Entry console panel ─────────────────────────── */
                .console-se {
                    grid-column: 2;
                    padding: 14px 18px;
                    display: flex; flex-direction: column; gap: 8px;
                    overflow: hidden;
                    background: rgba(17,13,23,.92);
                    backdrop-filter: blur(18px);
                }
                .se-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
                .se-title { margin: 0 0 1px; font-size: .88rem; font-weight: 700; color: #fff; }
                .se-subtitle { margin: 0; font-size: .6rem; color: rgba(247,250,250,.38); }
                .se-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: flex-start; }
                .se-action-btn { font-size: .58rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(247,250,250,.14); color: rgba(247,250,250,.62); cursor: default; white-space: nowrap; }
                .se-action-btn--primary { background: #4f46e5; border-color: transparent; color: #fff; }
                .se-filters { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(247,250,250,.08); background: rgba(247,250,250,.03); }
                .se-filter { display: flex; flex-direction: column; gap: 3px; }
                .se-filter-label { font-size: .5rem; color: rgba(247,250,250,.35); font-weight: 600; letter-spacing: .05em; }
                .se-filter-val { display: flex; align-items: center; justify-content: space-between; padding: 4px 7px; border-radius: 5px; border: 1px solid rgba(247,250,250,.12); background: rgba(247,250,250,.05); font-size: .56rem; color: rgba(247,250,250,.75); font-weight: 500; }
                .se-filter-val svg { opacity: .45; flex-shrink: 0; }
                .se-approval { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 7px 10px; border-radius: 8px; background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.18); }
                .se-approved-badge { font-size: .52rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(34,197,94,.18); color: #4ade80; border: 1px solid rgba(34,197,94,.28); white-space: nowrap; flex-shrink: 0; }
                .se-approval-text { font-size: .58rem; color: rgba(247,250,250,.55); flex: 1; }
                .se-approval-btns { display: flex; gap: 5px; margin-left: auto; }
                .se-btn { font-size: .52rem; font-weight: 700; padding: 3px 9px; border-radius: 6px; cursor: default; white-space: nowrap; }
                .se-btn--green { background: rgba(34,197,94,.14); color: #4ade80; border: 1px solid rgba(34,197,94,.24); }
                .se-btn--red   { background: rgba(239,68,68,.14);  color: #f87171; border: 1px solid rgba(239,68,68,.24); }
                .se-btn--blue  { background: rgba(59,130,246,.14); color: #60a5fa; border: 1px solid rgba(59,130,246,.24); }
                .se-enroll { display: flex; justify-content: space-between; align-items: center; font-size: .58rem; color: rgba(247,250,250,.42); }
                .se-avg { font-size: .6rem; color: rgba(247,250,250,.55); }
                .se-avg strong { color: #fff; }
                .se-pass { color: #4ade80 !important; }
                .se-table { display: flex; flex-direction: column; overflow: hidden; }
                .se-thead, .se-row { display: flex; align-items: center; padding: 5px 0; gap: 6px; }
                .se-thead { border-bottom: 1px solid rgba(247,250,250,.09); }
                .se-row { border-bottom: 1px solid rgba(247,250,250,.04); }
                .se-sn { width: 18px; text-align: center; font-size: .52rem; flex-shrink: 0; }
                .se-thead .se-sn { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); }
                .se-stud { flex: 1; min-width: 0; }
                .se-thead .se-stud { font-size: .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); }
                .se-row .se-stud span { display: block; font-size: .65rem; font-weight: 600; color: rgba(247,250,250,.82); line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .se-row .se-stud small { display: block; font-size: .5rem; color: rgba(247,250,250,.32); }
                .se-score { width: 36px; text-align: center; font-size: .6rem; flex-shrink: 0; }
                .se-thead .se-score { font-size: .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); }
                .se-total-h { font-weight: 700; }
                .se-grade-h { width: 40px; text-align: center; flex-shrink: 0; }
                .se-thead .se-grade-h { font-size: .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); }
                .se-grade-pill { display: inline-block; font-size: .58rem; font-weight: 800; padding: 2px 7px; border-radius: 5px; }
                .se-remark { width: 54px; font-size: .58rem; flex-shrink: 0; text-align: right; }
                .se-thead .se-remark { font-size: .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: rgba(247,250,250,.28); }
                .se-muted { color: rgba(247,250,250,.52); }
                .se-total--top  { color: #4ade80; }
                .se-total--high { color: #818cf8; }
                .se-total--mid  { color: #facc15; }
                .se-total--low  { color: #f87171; }
                .se-grade--top  { background: rgba(34,197,94,.15);  color: #4ade80; }
                .se-grade--high { background: rgba(99,102,241,.15); color: #818cf8; }
                .se-grade--mid  { background: rgba(234,179,8,.15);  color: #facc15; }
                .se-grade--low  { background: rgba(239,68,68,.15);  color: #f87171; }

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
                    transition: background .22s ease;
                    cursor: default;
                }
                .stat:hover { background: rgba(0,169,154,.06); }
                .stat strong { display: block; font-size: clamp(1.7rem, 3vw, 2.45rem); line-height: 1; margin-bottom: 8px; }
                .stat span { color: rgba(247,250,250,.48); font-size: .76rem; font-weight: 650; }

                .split-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 52px;
                    align-items: center;
                    padding: 92px 0;
                    border-bottom: 1px solid rgba(247,250,250,.08);
                }
                .section-copy h2,
                .wide-heading h2 {
                    margin: 0;
                    font-size: clamp(1.55rem, 2.2vw, 2.4rem);
                    line-height: 1.12;
                    letter-spacing: -.01em;
                    text-wrap: balance;
                }
                .section-copy p,
                .wide-heading p {
                    margin: 18px 0 0;
                    color: rgba(247,250,250,.58);
                    line-height: 1.72;
                    font-size: .9rem;
                    max-width: 430px;
                }
                .feature-list {
                    display: grid;
                    gap: 18px;
                    margin-top: 30px;
                }
                .feature-list div {
                    display: grid;
                    grid-template-columns: 38px 1fr;
                    gap: 14px;
                    align-items: start;
                    color: rgba(247,250,250,.7);
                    font-size: .84rem;
                    line-height: 1.5;
                }
                .feature-list p {
                    margin: 0;
                    padding-top: 7px;
                }
                .feature-list span {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    color: var(--teal);
                    background: rgba(0,169,154,.1);
                    border: 1px solid rgba(0,169,154,.15);
                }

                .capability-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 16px;
                    padding: 86px 0 100px;
                    perspective: 900px;
                }

                /* ── Capability card — world-class hover system ──────────── */
                .capability-card {
                    --mx: 50%; --my: 50%;
                    position: relative;
                    min-height: 258px;
                    border-radius: 16px;
                    padding: 2px;           /* border-glow via inner bg */
                    display: flex;
                    flex-direction: column;
                    cursor: default;
                    transform-style: preserve-3d;
                    transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0);
                    transition: transform .45s cubic-bezier(0.22,1,0.36,1),
                                box-shadow .45s cubic-bezier(0.22,1,0.36,1);
                    will-change: transform;
                    /* static border-gradient (subtle) */
                    background: linear-gradient(160deg, rgba(0,169,154,.18), rgba(91,45,170,.12), rgba(247,250,250,.06));
                }

                /* Inner fill — the actual card surface */
                .capability-card .card-inner {
                    position: relative;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 20px;
                    border-radius: 14px;
                    overflow: hidden;
                    background:
                        radial-gradient(circle at var(--mx) var(--my), rgba(0,169,154,.06), transparent 55%),
                        radial-gradient(circle at 50% 0%, rgba(247,250,250,.08), transparent 42%),
                        rgba(14, 11, 20, .92);
                    transition: background .35s ease;
                }

                /* Animated spotlight that follows the mouse */
                .capability-card .card-inner::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 14px;
                    opacity: 0;
                    background: radial-gradient(
                        320px circle at var(--mx) var(--my),
                        rgba(0,169,154,.14),
                        transparent 60%
                    );
                    transition: opacity .4s ease;
                    pointer-events: none;
                    z-index: 1;
                }

                /* Shimmer sweep — light bar crossing on hover */
                .capability-card .card-inner::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 60%; height: 100%;
                    background: linear-gradient(
                        105deg,
                        transparent 20%,
                        rgba(0,169,154,.07) 40%,
                        rgba(247,250,250,.08) 50%,
                        rgba(0,169,154,.07) 60%,
                        transparent 80%
                    );
                    transform: skewX(-18deg);
                    transition: left .55s cubic-bezier(0.22,1,0.36,1);
                    pointer-events: none;
                    z-index: 2;
                }

                /* ── Hover state — everything activates ───────────────── */
                .capability-card:hover {
                    transform: perspective(900px) translateY(-8px) translateZ(12px);
                    box-shadow:
                        0 20px 50px rgba(0,0,0,.35),
                        0 8px 25px rgba(0,169,154,.12),
                        0 0 0 1px rgba(0,169,154,.15);
                    /* animate border gradient on hover */
                    background: linear-gradient(160deg, rgba(0,169,154,.45), rgba(91,45,170,.3), rgba(0,169,154,.2));
                }

                .capability-card:hover .card-inner::before {
                    opacity: 1;
                }
                .capability-card:hover .card-inner::after {
                    left: 160%;
                }
                .capability-card:hover .card-inner {
                    background:
                        radial-gradient(circle at var(--mx) var(--my), rgba(0,169,154,.1), transparent 55%),
                        radial-gradient(circle at 50% 0%, rgba(247,250,250,.12), transparent 42%),
                        rgba(14, 11, 20, .88);
                }

                /* Icon — float + glow pulse on hover */
                .capability-card .cap-icon {
                    position: relative;
                    z-index: 3;
                    width: 44px;
                    height: 44px;
                    display: grid;
                    place-items: center;
                    border-radius: 50%;
                    color: var(--teal);
                    background: rgba(0,169,154,.1);
                    border: 1px solid rgba(0,169,154,.08);
                    transition: transform .4s cubic-bezier(0.22,1,0.36,1),
                                background .35s ease,
                                border-color .35s ease,
                                box-shadow .4s ease;
                }
                .capability-card:hover .cap-icon {
                    transform: translateY(-4px) scale(1.08);
                    background: rgba(0,169,154,.2);
                    border-color: rgba(0,169,154,.35);
                    box-shadow:
                        0 0 20px rgba(0,169,154,.4),
                        0 0 50px rgba(0,169,154,.15),
                        0 4px 12px rgba(0,0,0,.3);
                }

                /* Icon glow ring — pulsing halo behind icon on hover */
                .capability-card .cap-icon::after {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(0,169,154,0);
                    transition: border-color .35s ease, transform .35s ease;
                    pointer-events: none;
                }
                .capability-card:hover .cap-icon::after {
                    border-color: rgba(0,169,154,.2);
                    transform: scale(1.15);
                    animation: cap-icon-ring-pulse 2s ease-in-out infinite;
                }
                @keyframes cap-icon-ring-pulse {
                    0%, 100% { transform: scale(1.15); opacity: .7; }
                    50%      { transform: scale(1.3);  opacity: 0; }
                }

                /* Text brightens on hover */
                .capability-card h3 {
                    position: relative;
                    z-index: 3;
                    margin: 34px 0 10px;
                    font-size: .96rem;
                    line-height: 1.2;
                    transition: color .3s ease;
                }
                .capability-card:hover h3 { color: #fff; }

                .capability-card p {
                    position: relative;
                    z-index: 3;
                    margin: 0;
                    color: rgba(247,250,250,.5);
                    font-size: .75rem;
                    line-height: 1.55;
                    transition: color .35s ease;
                }
                .capability-card:hover p { color: rgba(247,250,250,.72); }

                /* Reduce motion */
                @media (prefers-reduced-motion: reduce) {
                    .capability-card,
                    .capability-card .card-inner::before,
                    .capability-card .card-inner::after,
                    .capability-card .cap-icon,
                    .capability-card .cap-icon::after {
                        transition: none !important;
                        animation: none !important;
                    }
                }

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
                    transition: border-color .25s ease, background .25s ease, box-shadow .25s ease;
                }
                .step {
                    transition: transform .25s cubic-bezier(0.22,1,0.36,1);
                    cursor: default;
                }
                .step:hover { transform: translateY(-4px); }
                .step:hover .step-num {
                    border-color: rgba(198,146,20,.4);
                    background: radial-gradient(circle, rgba(198,146,20,.3), rgba(247,250,250,.06));
                    box-shadow: 0 0 18px rgba(198,146,20,.2);
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
                    transition: border-color .2s ease, background .2s ease,
                                color .2s ease, transform .22s cubic-bezier(0.22,1,0.36,1);
                    cursor: default;
                }
                .logo-cloud div:hover {
                    border-color: rgba(0,169,154,.3);
                    background: rgba(0,169,154,.06);
                    color: rgba(247,250,250,.9);
                    transform: translateY(-3px);
                }
                .quote {
                    padding: 34px;
                    border-radius: 18px;
                    border: 1px solid rgba(247,250,250,.1);
                    background: rgba(247,250,250,.04);
                    transition: border-color .25s ease, box-shadow .25s ease, transform .25s cubic-bezier(0.22,1,0.36,1);
                }
                .quote:hover {
                    border-color: rgba(198,146,20,.28);
                    box-shadow: 0 8px 36px rgba(0,0,0,.22), 0 0 0 1px rgba(198,146,20,.08);
                    transform: translateY(-4px);
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
                    font-size: clamp(1.8rem, 3.2vw, 3.6rem);
                    line-height: 1.06;
                    letter-spacing: -.01em;
                    min-height: 2.2em;
                }
                @keyframes di-blink {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0; }
                }
                .di-cursor {
                    display: inline-block;
                    margin-left: 2px;
                    color: var(--teal);
                    font-weight: 300;
                    animation: di-blink 1s step-end infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .di-cursor { animation: none; }
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
                    transition: color .2s ease, border-color .2s ease, gap .2s ease;
                }
                .text-link svg { transition: transform .22s cubic-bezier(0.22,1,0.36,1); }
                .text-link:hover { color: #fff; border-color: rgba(247,250,250,.5); gap: 12px; }
                .text-link:hover svg { transform: translateX(4px); }

                .cta-panel {
                    display: grid;
                    grid-template-columns: .9fr 1.1fr;
                    gap: 44px;
                    align-items: center;
                    padding: 92px 0 68px;
                }
                .cta-panel h2 { margin: 0; font-size: clamp(1.7rem, 3vw, 3.4rem); line-height: 1.08; letter-spacing: -.01em; }
                .cta-actions {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex-wrap: wrap;
                    margin-left: auto;
                }

                .site-footer {
                    border-top: 1px solid rgba(247,250,250,.08);
                    padding: 36px 0 42px;
                }
                .footer-bottom {
                    border-top: 1px solid rgba(247,250,250,.08);
                    margin-top: 48px;
                    padding-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .footer-bottom p { font-size: .72rem; color: rgba(247,250,250,.45); margin: 0; }
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

                /* ── Brand Pillars bar ───────────────────────────────── */
                .brand-pillars {
                    border-top: 1px solid rgba(247,250,250,.08);
                    border-bottom: 1px solid rgba(247,250,250,.08);
                    background: rgba(247,250,250,.02);
                    padding: 0;
                }
                .pillars-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 1px;
                    background: rgba(247,250,250,.06);
                }
                .pillar {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 28px 12px;
                    background: rgba(8,7,11,.85);
                    text-align: center;
                    transition: background .25s ease;
                    cursor: default;
                }
                .pillar:hover {
                    background: rgba(0,169,154,.06);
                }
                .pillar:hover .pillar-icon {
                    border-color: rgba(0,169,154,.35);
                    background: rgba(0,169,154,.12);
                    color: var(--teal);
                    box-shadow: 0 0 18px rgba(0,169,154,.2);
                }
                .pillar-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    color: var(--teal);
                    background: rgba(0,169,154,.08);
                    border: 1px solid rgba(0,169,154,.12);
                    transition: all .3s ease;
                }
                .pillar span {
                    font-family: 'Manrope', system-ui, sans-serif;
                    font-size: .7rem;
                    font-weight: 700;
                    letter-spacing: .1em;
                    text-transform: uppercase;
                    color: rgba(247,250,250,.6);
                    transition: color .25s ease;
                }
                .pillar:hover span {
                    color: rgba(247,250,250,.88);
                }

                @media (max-width: 820px) {
                    .pillars-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 560px) {
                    .pillars-grid { grid-template-columns: repeat(2, 1fr); }
                }

                /* ═══════════════════════════════════════════════════
                   LIGHT MODE  [data-theme="light"]
                   Console shell stays dark intentionally — premium
                   product-UI-on-light-page contrast effect.
                   ═══════════════════════════════════════════════════ */

                /* Page base */
                [data-theme="light"] .ed-page {
                    background:
                        radial-gradient(circle at 20% 8%, rgba(0,169,154,.07), transparent 28rem),
                        radial-gradient(circle at 82% 12%, rgba(91,45,170,.05), transparent 26rem),
                        linear-gradient(180deg, #F4F6FA 0%, #EDF0F7 50%, #F0F3F9 100%);
                    color: #0F172A;
                }
                [data-theme="light"] .ed-page::after { opacity: .013; }

                /* Nav */
                [data-theme="light"] .site-header {
                    background: rgba(244,246,250,.92);
                    border-bottom-color: rgba(15,23,42,.09);
                }
                [data-theme="light"] .brand span { color: #0F172A; }
                [data-theme="light"] .brand img { filter: none; }
                [data-theme="light"] .brand:hover img {
                    filter: brightness(1.06) drop-shadow(0 1px 4px rgba(0,0,0,.12));
                }
                [data-theme="light"] .nav-links { color: rgba(15,23,42,.52); }
                [data-theme="light"] .nav-links a:hover { color: #0F172A; }
                [data-theme="light"] .nav-links a.nav-active { color: #0F172A; }
                [data-theme="light"] .signin {
                    border-color: rgba(15,23,42,.14);
                    color: rgba(15,23,42,.68);
                }
                [data-theme="light"] .signin:hover {
                    border-color: rgba(15,23,42,.28);
                    background: rgba(15,23,42,.06);
                    color: #0F172A;
                }
                [data-theme="light"] .theme-toggle {
                    border-color: rgba(15,23,42,.14);
                    color: rgba(15,23,42,.55);
                }
                [data-theme="light"] .theme-toggle:hover {
                    border-color: rgba(15,23,42,.28);
                    background: rgba(15,23,42,.06);
                    color: #0F172A;
                }

                /* CTAs */
                [data-theme="light"] .cta.primary { background: #00A99A; color: #fff; }
                [data-theme="light"] .cta.primary:hover {
                    box-shadow: 0 6px 28px rgba(0,169,154,.4), 0 2px 8px rgba(0,169,154,.2);
                }
                [data-theme="light"] .cta.ghost {
                    border-color: rgba(15,23,42,.16);
                    color: rgba(15,23,42,.7);
                }
                [data-theme="light"] .cta.ghost:hover {
                    border-color: rgba(15,23,42,.3);
                    background: rgba(15,23,42,.05);
                    color: #0F172A;
                    box-shadow: 0 4px 18px rgba(15,23,42,.09);
                }

                /* Hero */
                [data-theme="light"] .hero-eyebrow { color: rgba(15,23,42,.4); }
                [data-theme="light"] .hero-copy p { color: rgba(15,23,42,.6); }
                [data-theme="light"] .trust-row { color: rgba(15,23,42,.5); }
                [data-theme="light"] .avatar-stack span { border-color: #EDF0F7; }

                /* Orbit rings — boost visibility on light bg */
                [data-theme="light"] .acad-r1 { border-color: rgba(0,169,154,.45); }
                [data-theme="light"] .acad-r2 { border-color: rgba(91,45,170,.34); }
                [data-theme="light"] .acad-r3 { border-color: rgba(198,146,20,.26); }
                [data-theme="light"] .acad-orbit::before {
                    background: radial-gradient(circle, rgba(0,169,154,.13) 0%, rgba(91,45,170,.09) 38%, transparent 65%);
                }

                /* Console shell — light variant */
                [data-theme="light"] .console-shell {
                    border-color: rgba(15,23,42,.1);
                    background: rgba(15,23,42,.06);
                    box-shadow: 0 20px 60px rgba(15,23,42,.1), 0 0 0 1px rgba(15,23,42,.06);
                }
                [data-theme="light"] .console-sidebar,
                [data-theme="light"] .console-main,
                [data-theme="light"] .console-context,
                [data-theme="light"] .console-assess,
                [data-theme="light"] .console-se {
                    background: #fff;
                    backdrop-filter: none;
                }
                [data-theme="light"] .assess-subtitle { color: rgba(15,23,42,.42); }
                [data-theme="light"] .assess-title { color: #0F172A; }
                [data-theme="light"] .assess-desc { color: rgba(15,23,42,.38); }
                [data-theme="light"] .assess-filters { background: rgba(15,23,42,.02); border-color: rgba(15,23,42,.08); }
                [data-theme="light"] .assess-filter-label { color: rgba(15,23,42,.42); }
                [data-theme="light"] .assess-filter-select { background: #fff; border-color: rgba(15,23,42,.14); color: rgba(15,23,42,.75); }
                [data-theme="light"] .assess-group--aff { background: rgba(99,102,241,.1); color: rgba(79,70,229,.88); }
                [data-theme="light"] .assess-group--psy { background: rgba(34,197,94,.09); color: rgba(21,128,61,.82); }
                [data-theme="light"] .assess-student-col,
                [data-theme="light"] .assess-scores-head span { color: rgba(15,23,42,.38); }
                [data-theme="light"] .assess-student span { color: rgba(15,23,42,.85); }
                [data-theme="light"] .assess-student small { color: rgba(15,23,42,.4); }
                [data-theme="light"] .assess-row { border-bottom-color: rgba(15,23,42,.05); }
                [data-theme="light"] .assess-cols { border-bottom-color: rgba(15,23,42,.08); }
                [data-theme="light"] .bubble--5 { background: rgba(34,197,94,.1); color: #16a34a; border-color: rgba(34,197,94,.22); }
                [data-theme="light"] .bubble--4 { background: rgba(99,102,241,.1); color: #4f46e5; border-color: rgba(99,102,241,.22); }
                [data-theme="light"] .bubble--3 { background: rgba(234,179,8,.1); color: #b45309; border-color: rgba(234,179,8,.22); }
                [data-theme="light"] .bubble--empty { background: rgba(15,23,42,.04); color: rgba(15,23,42,.3); border-color: rgba(15,23,42,.08); }
                [data-theme="light"] .assess-footer span { color: rgba(15,23,42,.35); }
                [data-theme="light"] .assess-save { background: #4f46e5; }
                /* Report console — light */
                [data-theme="light"] .console-report { background: #fff; backdrop-filter: none; }
                [data-theme="light"] .rpt-eyebrow { color: rgba(15,23,42,.4); }
                [data-theme="light"] .rpt-title { color: #0F172A; }
                [data-theme="light"] .rpt-term-badge { background: rgba(0,169,154,.08); color: #0d9488; border-color: rgba(0,169,154,.18); }
                [data-theme="light"] .rpt-student-row { background: rgba(15,23,42,.02); border-color: rgba(15,23,42,.08); }
                [data-theme="light"] .rpt-student-info span { color: #0F172A; }
                [data-theme="light"] .rpt-student-info small { color: rgba(15,23,42,.4); }
                [data-theme="light"] .rpt-avatar { background: rgba(99,102,241,.1); color: #4f46e5; }
                [data-theme="light"] .rpt-thead { border-bottom-color: rgba(15,23,42,.1); }
                [data-theme="light"] .rpt-row { border-bottom-color: rgba(15,23,42,.05); }
                [data-theme="light"] .rpt-thead .rpt-col-subj,
                [data-theme="light"] .rpt-thead .rpt-col-num,
                [data-theme="light"] .rpt-thead .rpt-col-grade { color: rgba(15,23,42,.38); }
                [data-theme="light"] .rpt-row .rpt-col-subj { color: rgba(15,23,42,.78); }
                [data-theme="light"] .rpt-muted { color: rgba(15,23,42,.45); }
                [data-theme="light"] .rpt-total--high { color: #16a34a; }
                [data-theme="light"] .rpt-total--mid  { color: #4f46e5; }
                [data-theme="light"] .rpt-total--low  { color: #b45309; }
                [data-theme="light"] .rpt-grade--high { color: #16a34a; }
                [data-theme="light"] .rpt-grade--mid  { color: #4f46e5; }
                [data-theme="light"] .rpt-grade--low  { color: #b45309; }
                [data-theme="light"] .rpt-footer span { color: rgba(15,23,42,.38); }
                [data-theme="light"] .rpt-download { background: rgba(0,169,154,.08); color: #0d9488; border-color: rgba(0,169,154,.18); }
                /* Score Entry console — light */
                [data-theme="light"] .se-title { color: #0F172A; }
                [data-theme="light"] .se-subtitle { color: rgba(15,23,42,.38); }
                [data-theme="light"] .se-action-btn { border-color: rgba(15,23,42,.14); color: rgba(15,23,42,.62); }
                [data-theme="light"] .se-action-btn--primary { background: #4f46e5; border-color: transparent; color: #fff; }
                [data-theme="light"] .se-filters { background: rgba(15,23,42,.02); border-color: rgba(15,23,42,.08); }
                [data-theme="light"] .se-filter-label { color: rgba(15,23,42,.42); }
                [data-theme="light"] .se-filter-val { background: #fff; border-color: rgba(15,23,42,.14); color: rgba(15,23,42,.75); }
                [data-theme="light"] .se-approval { background: rgba(34,197,94,.04); border-color: rgba(34,197,94,.15); }
                [data-theme="light"] .se-approved-badge { background: rgba(34,197,94,.1); color: #16a34a; border-color: rgba(34,197,94,.22); }
                [data-theme="light"] .se-approval-text { color: rgba(15,23,42,.55); }
                [data-theme="light"] .se-btn--green { background: rgba(34,197,94,.08); color: #16a34a; border-color: rgba(34,197,94,.2); }
                [data-theme="light"] .se-btn--red   { background: rgba(239,68,68,.08); color: #dc2626; border-color: rgba(239,68,68,.2); }
                [data-theme="light"] .se-btn--blue  { background: rgba(59,130,246,.08); color: #2563eb; border-color: rgba(59,130,246,.2); }
                [data-theme="light"] .se-enroll { color: rgba(15,23,42,.45); }
                [data-theme="light"] .se-avg { color: rgba(15,23,42,.55); }
                [data-theme="light"] .se-avg strong { color: #0F172A; }
                [data-theme="light"] .se-pass { color: #16a34a !important; }
                [data-theme="light"] .se-thead { border-bottom-color: rgba(15,23,42,.09); }
                [data-theme="light"] .se-row { border-bottom-color: rgba(15,23,42,.05); }
                [data-theme="light"] .se-thead .se-sn,
                [data-theme="light"] .se-thead .se-stud,
                [data-theme="light"] .se-thead .se-score,
                [data-theme="light"] .se-thead .se-grade-h,
                [data-theme="light"] .se-thead .se-remark { color: rgba(15,23,42,.38); }
                [data-theme="light"] .se-row .se-stud span { color: rgba(15,23,42,.85); }
                [data-theme="light"] .se-row .se-stud small { color: rgba(15,23,42,.42); }
                [data-theme="light"] .se-muted { color: rgba(15,23,42,.52); }
                [data-theme="light"] .se-total--top  { color: #16a34a; }
                [data-theme="light"] .se-total--high { color: #4f46e5; }
                [data-theme="light"] .se-total--mid  { color: #b45309; }
                [data-theme="light"] .se-grade--top  { background: rgba(34,197,94,.1);  color: #16a34a; }
                [data-theme="light"] .se-grade--high { background: rgba(99,102,241,.1); color: #4f46e5; }
                [data-theme="light"] .se-grade--mid  { background: rgba(234,179,8,.1);  color: #b45309; }
                [data-theme="light"] .se-section-label { color: rgba(15,23,42,.3); }
                [data-theme="light"] .side-item--sub { color: rgba(15,23,42,.38); }
                [data-theme="light"] .side-item { color: rgba(15,23,42,.52); }
                [data-theme="light"] .side-item--group { color: rgba(15,23,42,.38); }
                [data-theme="light"] .side-item--active { background: rgba(99,102,241,.1); color: #4f46e5; }
                [data-theme="light"] .side-divider { background: rgba(15,23,42,.08); }
                [data-theme="light"] .console-top h3 { color: #0F172A; }
                [data-theme="light"] .sync-pill {
                    border-color: rgba(0,169,154,.28);
                    color: rgba(15,23,42,.65);
                }
                [data-theme="light"] .metric-card {
                    border-color: rgba(15,23,42,.08);
                    background: rgba(15,23,42,.03);
                }
                [data-theme="light"] .metric-card strong { color: #0F172A; }
                [data-theme="light"] .metric-card span { color: rgba(15,23,42,.45); }
                [data-theme="light"] .insight-panel {
                    border-color: rgba(15,23,42,.08);
                    background: linear-gradient(145deg, rgba(0,169,154,.06), rgba(91,45,170,.04));
                }
                [data-theme="light"] .panel-heading { color: rgba(15,23,42,.72); }
                [data-theme="light"] .risk-grid div { background: rgba(15,23,42,.04); }
                [data-theme="light"] .risk-grid span { color: rgba(15,23,42,.48); }
                [data-theme="light"] .context-card {
                    border-color: rgba(15,23,42,.08);
                    background: rgba(15,23,42,.03);
                }
                [data-theme="light"] .context-card p { color: rgba(15,23,42,.48); }
                [data-theme="light"] .context-card strong { color: #0F172A; }
                [data-theme="light"] .context-card span { color: rgba(15,23,42,.48); }
                [data-theme="light"] .context-list div { color: rgba(15,23,42,.58); }
                [data-theme="light"] .acad-core-inner {
                    border-color: rgba(15,23,42,.28);
                    border-top-color: transparent;
                }

                /* Stats band */
                [data-theme="light"] .stats-band {
                    border-top-color: rgba(15,23,42,.08);
                    border-bottom-color: rgba(15,23,42,.08);
                    background: #fff;
                }
                [data-theme="light"] .stats-grid { background: rgba(15,23,42,.06); }
                [data-theme="light"] .stat { background: #fff; }
                [data-theme="light"] .stat:hover { background: rgba(0,169,154,.04); }
                [data-theme="light"] .stat strong { color: #0F172A; }
                [data-theme="light"] .stat span { color: rgba(15,23,42,.45); }

                /* Section dividers */
                [data-theme="light"] .split-section { border-bottom-color: rgba(15,23,42,.07); }
                [data-theme="light"] .insight-split { border-bottom-color: rgba(15,23,42,.07); }
                [data-theme="light"] .work-row { border-bottom-color: rgba(15,23,42,.07); }
                [data-theme="light"] .proof { border-bottom-color: rgba(15,23,42,.07); }
                [data-theme="light"] .deeper-insight { border-bottom-color: rgba(15,23,42,.07); }

                /* Section copy */
                [data-theme="light"] .section-copy p { color: rgba(15,23,42,.6); }
                [data-theme="light"] .wide-heading p { color: rgba(15,23,42,.6); }
                [data-theme="light"] .feature-list div { color: rgba(15,23,42,.68); }
                [data-theme="light"] .feature-list span {
                    color: var(--teal);
                    background: rgba(0,169,154,.08);
                    border-color: rgba(0,169,154,.14);
                }

                /* Capability cards */
                [data-theme="light"] .capability-card {
                    background: linear-gradient(160deg, rgba(0,169,154,.12), rgba(91,45,170,.08), rgba(15,23,42,.05));
                }
                [data-theme="light"] .capability-card .card-inner {
                    background:
                        radial-gradient(circle at var(--mx) var(--my), rgba(0,169,154,.04), transparent 55%),
                        radial-gradient(circle at 50% 0%, rgba(15,23,42,.03), transparent 42%),
                        #fff;
                }
                [data-theme="light"] .capability-card h3 { color: #0F172A; }
                [data-theme="light"] .capability-card p { color: rgba(15,23,42,.52); }
                [data-theme="light"] .capability-card:hover {
                    background: linear-gradient(160deg, rgba(0,169,154,.38), rgba(91,45,170,.25), rgba(0,169,154,.18));
                }
                [data-theme="light"] .capability-card:hover .card-inner {
                    background:
                        radial-gradient(circle at var(--mx) var(--my), rgba(0,169,154,.07), transparent 55%),
                        radial-gradient(circle at 50% 0%, rgba(15,23,42,.04), transparent 42%),
                        #fff;
                }
                [data-theme="light"] .capability-card:hover h3 { color: #0F172A; }
                [data-theme="light"] .capability-card:hover p { color: rgba(15,23,42,.72); }
                [data-theme="light"] .capability-card .card-inner::before {
                    background: radial-gradient(320px circle at var(--mx) var(--my), rgba(0,169,154,.1), transparent 60%);
                }
                [data-theme="light"] .capability-card .card-inner::after {
                    background: linear-gradient(105deg, transparent 20%, rgba(0,169,154,.05) 40%, rgba(255,255,255,.2) 50%, rgba(0,169,154,.05) 60%, transparent 80%);
                }

                /* Cognitive profile */
                [data-theme="light"] .profile-board {
                    border-color: rgba(15,23,42,.09);
                    background: rgba(15,23,42,.05);
                }
                [data-theme="light"] .radar {
                    background:
                        radial-gradient(circle, rgba(15,23,42,.05) 0 1px, transparent 1px 100%),
                        #fff;
                    background-size: 32px 32px;
                }
                [data-theme="light"] .signal-list { background: #fff; }
                [data-theme="light"] .radar-axis { background: rgba(15,23,42,.12); }
                [data-theme="light"] .signal {
                    border-bottom-color: rgba(15,23,42,.07);
                    color: rgba(15,23,42,.62);
                }
                [data-theme="light"] .signal b { color: #0F172A; }

                /* Device stack */
                [data-theme="light"] .device-stack {
                    border-color: rgba(15,23,42,.09);
                    background:
                        radial-gradient(circle at 24% 50%, rgba(0,169,154,.1), transparent 16rem),
                        rgba(255,255,255,.88);
                }
                [data-theme="light"] .device-copy p { color: rgba(15,23,42,.58); }
                [data-theme="light"] .device-tags span {
                    border-color: rgba(15,23,42,.1);
                    color: rgba(15,23,42,.68);
                }

                /* Steps */
                [data-theme="light"] .step h3 { color: #0F172A; }
                [data-theme="light"] .step p { color: rgba(15,23,42,.5); }

                /* Social proof */
                [data-theme="light"] .logo-cloud div {
                    background: #fff;
                    border-color: rgba(15,23,42,.09);
                    color: rgba(15,23,42,.55);
                }
                [data-theme="light"] .logo-cloud div:hover {
                    border-color: rgba(0,169,154,.28);
                    background: rgba(0,169,154,.05);
                    color: rgba(15,23,42,.88);
                }
                [data-theme="light"] .quote {
                    background: #fff;
                    border-color: rgba(15,23,42,.09);
                }
                [data-theme="light"] .quote:hover {
                    border-color: rgba(198,146,20,.28);
                    box-shadow: 0 8px 36px rgba(15,23,42,.09), 0 0 0 1px rgba(198,146,20,.08);
                }
                [data-theme="light"] .quote p { color: rgba(15,23,42,.78); }
                [data-theme="light"] .quote footer { color: rgba(15,23,42,.5); }

                /* Deeper insight */
                [data-theme="light"] .deeper-insight p { color: rgba(15,23,42,.55); }
                [data-theme="light"] .text-link {
                    color: rgba(15,23,42,.6);
                    border-bottom-color: rgba(15,23,42,.2);
                }
                [data-theme="light"] .text-link:hover { color: #0F172A; border-bottom-color: rgba(15,23,42,.48); }

                /* Footer */
                [data-theme="light"] .site-footer { border-top-color: rgba(15,23,42,.08); }
                [data-theme="light"] .footer-grid p { color: rgba(15,23,42,.45); }
                [data-theme="light"] .footer-col h3 { color: rgba(15,23,42,.7); }
                [data-theme="light"] .footer-col a { color: rgba(15,23,42,.42); }
                [data-theme="light"] .footer-col a:hover { color: rgba(15,23,42,.82); }
                [data-theme="light"] .footer-bottom { border-top-color: rgba(15,23,42,.08); }
                [data-theme="light"] .footer-bottom p { color: rgba(15,23,42,.45); }

                /* Brand pillars */
                [data-theme="light"] .brand-pillars {
                    border-top-color: rgba(15,23,42,.08);
                    border-bottom-color: rgba(15,23,42,.08);
                    background: rgba(15,23,42,.02);
                }
                [data-theme="light"] .pillars-grid { background: rgba(15,23,42,.06); }
                [data-theme="light"] .pillar { background: #fff; }
                [data-theme="light"] .pillar:hover { background: rgba(0,169,154,.05); }
                [data-theme="light"] .pillar span { color: rgba(15,23,42,.6); }
                [data-theme="light"] .pillar:hover span { color: rgba(15,23,42,.82); }

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
                    .cta-actions { margin-left: 0; }
                }

                @media (max-width: 820px) {
                    .nav-links { display: none; }
                    .hero-visual { min-height: 520px; }
                    .orb { display: none; }
                    .console-shell {
                        grid-template-columns: 1fr;
                        min-height: 0;
                    }
                    .console-sidebar { display: none; }
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
                    .cta-actions { flex-direction: column; align-items: stretch; }
                }
            `}</style>

            <header className="site-header">
                <div className="nav-wrap">
                    <Logo compact />
                    <nav className="nav-links" aria-label="Primary navigation">
                        {navItems.map((item) => (
                            <a
                                href={`#${item.toLowerCase()}`}
                                key={item}
                                className={activeSection === item.toLowerCase() ? "nav-active" : ""}
                            >{item}</a>
                        ))}
                    </nav>
                    <div className="nav-actions">
                        <button
                            className="theme-toggle"
                            onClick={toggleTheme}
                            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {theme === "dark"
                                ? <Sun size={16} aria-hidden="true" />
                                : <Moon size={16} aria-hidden="true" />
                            }
                        </button>
                        <Link className="signin" href="/auth/login">Sign in</Link>
                        <ArrowButton href="/auth/register">Book demo</ArrowButton>
                    </div>
                </div>
            </header>

            <section className="section hero">
                <div className="hero-copy" data-reveal="left">
                    <p className="hero-eyebrow">Introducing Edunostics</p>
                    <h1>
                        A school technology layer for{" "}
                        <span className={`hw-word hw-${hwPhase}`}>{heroWords[hwIdx]}</span>
                        {" "}secondary education.
                    </h1>
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
                <div className="hero-visual" data-reveal="right">
                    <AcademicOrbit />
                    <ProductConsole />
                </div>
            </section>

            <section className="stats-band">
                <div className="section stats-grid">
                    {stats.map(({ num, suffix, label }) => (
                        <StatCounter key={label} num={num} suffix={suffix} label={label} />
                    ))}
                </div>
            </section>

            <section className="section split-section" id="platform">
                <div className="section-copy" data-reveal="left">
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
                <div data-reveal="right"><ScoreEntryConsole /></div>
            </section>

            <section className="section" id="insights">
                <div className="insight-split">
                    <div className="section-copy" data-reveal="left">
                        <span style={{ color: "var(--teal)", fontSize: ".7rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 20 }}>Intelligence profile</span>
                        <h2 style={{ margin: 0, fontSize: "clamp(1.55rem, 2.2vw, 2.4rem)", lineHeight: 1.12, letterSpacing: "-.01em", textWrap: "balance" }}>Understand each learner before the term slips away.</h2>
                        <p style={{ margin: "22px 0 32px", color: "var(--text-sec)", lineHeight: 1.75, fontSize: ".96rem" }}>
                            Edunostics maps academic performance, conduct, attendance, and engagement into a clear growth profile for school leaders.
                        </p>
                        <ArrowButton href="/auth/register" variant="ghost">Explore profile</ArrowButton>
                    </div>
                    <div data-reveal="right"><CognitiveProfile /></div>
                </div>
            </section>


            <section className="section" id="security">
                <div className="wide-heading" data-reveal="">
                    <h2>Everything secondary schools need to operate with clarity.</h2>
                </div>
                <div className="capability-grid" data-reveal-group="">
                    {capabilities.map(({ icon: Icon, title, body }) => (
                        <CapabilityCard key={title} Icon={Icon} title={title} body={body} />
                    ))}
                </div>
            </section>

            <section className="section work-row" id="how-it-works">
                <div className="section-copy" data-reveal="">
                    <span style={{ color: "var(--teal)", fontSize: ".7rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 16 }}>How it works</span>
                    <h2 style={{ margin: 0, fontSize: "clamp(1.55rem, 2.2vw, 2.4rem)", lineHeight: 1.12, letterSpacing: "-.01em", textWrap: "balance" }}>A better way to manage, assess, report, and improve.</h2>
                    <p style={{ margin: "18px 0 0", color: "var(--text-sec)", lineHeight: 1.75, fontSize: ".96rem" }}>
                        A complete workflow from school setup to parent-ready reports, built around real school operations.
                    </p>
                </div>
                <div className="step-grid" data-reveal-group="">
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
                <div data-reveal="left">
                    <h2>Built for academic rigor. Designed for everyday school teams.</h2>
                    <div className="logo-cloud" aria-label="Audience groups">
                        {["Principals", "Teachers", "Parents", "Students", "Admins", "Proprietors"].map((name) => (
                            <div key={name}>{name}</div>
                        ))}
                    </div>
                </div>
                <blockquote className="quote" data-reveal="right">
                    <Sparkles size={28} color={palette.gold} aria-hidden="true" />
                    <p>
                        "Edunostics feels less like another school app and more like the operating layer that connects our assessments, reports, devices, and decisions."
                    </p>
                    <footer>School administrator, secondary education</footer>
                </blockquote>
            </section>

            <section className="section">
                <div className="deeper-insight" data-reveal="scale">
                    <span>Deeper insight</span>
                    <h2>
                        {diText}
                        <span className="di-cursor" aria-hidden="true">|</span>
                    </h2>
                    <p>
                        Edunostics brings academic records, assessment data, attendance signals, and parent reach into one operating view — so school leaders always know what is happening and what to do next.
                    </p>
                    <a href="#platform" className="text-link">
                        Explore the platform <ArrowRight size={14} aria-hidden="true" />
                    </a>
                </div>
            </section>

            <section className="section cta-panel" id="pricing">
                <div data-reveal="left">
                    <h2>Step into the next era of school technology.</h2>
                </div>
                <div className="cta-actions" data-reveal="right">
                    <ArrowButton href="/auth/register">Request demo</ArrowButton>
                    <ArrowButton href="/contact" variant="ghost">Talk to us</ArrowButton>
                </div>
            </section>

            <section className="brand-pillars" data-reveal-group="">
                <div className="section pillars-grid">
                    {[
                        [Crosshair, "Precise"],
                        [ShieldCheck, "Trusted"],
                        [Brain, "Intelligent"],
                        [School, "School-Ready"],
                        [TrendingUp, "Progressive"],
                        [Lock, "Secure"],
                    ].map(([Icon, label]) => (
                        <div className="pillar" key={label as string}>
                            <div className="pillar-icon">
                                <Icon size={20} aria-hidden="true" />
                            </div>
                            <span>{label as string}</span>
                        </div>
                    ))}
                </div>
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
                        ["Product", ["Overview", "/overview"], ["Assessment", "/assessment"], ["Reports", "/reports"], ["Hardware", "/hardware"]],
                        ["Resources", ["Documentation", "/documentation"], ["Support", "/support"], ["School setup", "/school-setup"], ["Data security", "/data-security"]],
                        ["Company", ["About", "/about"], ["Contact", "/contact"], ["Partners", "/partners"]],
                        ["Legal", ["Privacy", "/privacy"], ["Terms", "/terms"], ["Status", "/status"], ["Security", "/security"]],
                    ].map(([heading, ...pairs]) => (
                        <div className="footer-col" key={heading as string}>
                            <h3>{heading as string}</h3>
                            {(pairs as [string, string][]).map(([label, href]) => (
                                <Link href={href} key={label}>{label}</Link>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="footer-bottom">
                    <p>2026 Edunostics Limited. All rights reserved.</p>
                    <p>Built for secondary education in Nigeria.</p>
                </div>
            </footer>
        </main>
    );
}
