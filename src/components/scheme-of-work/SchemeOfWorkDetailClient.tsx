"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { showAppConfirm } from "@/lib/appMessageBox";
import { TermWeeksTable } from "./TermWeeksTable";
import { CollaboratorPanel } from "./CollaboratorPanel";
import { ApprovalPanel } from "./ApprovalPanel";
import { WizardStepBar } from "./WizardStepBar";
import { WizardPhase3Objectives } from "./WizardPhase3Objectives";
import { WizardPhase4References } from "./WizardPhase4References";

type SowStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

interface SdgEntry { id: string; sdgNumber: number; aiSuggested: boolean; approved: boolean }
interface Reference { id: string; type: string; title: string; url: string | null; fileKey: string | null; description: string | null; sortOrder: number }

interface Week {
    id: string;
    weekNumber: number;
    topic: string;
    content: string | null;
    objectives: string | null;
    waecObjectives: string | null;
    jambObjectives: string | null;
    igcseObjectives: string | null;
    objectivesApproved: boolean;
    resources: string | null;
    teachingMethods: string | null;
    assessment: string | null;
    references: Reference[];
    sdgMappings: SdgEntry[];
}

interface SOWTerm {
    id: string;
    termId: string;
    termNumber: number;
    objectives: string | null;
    // Per-term approval fields
    status: SowStatus;
    adminNote: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    term: { id: string; name: string; termNumber: number };
    weeks: Week[];
}

interface SchemeOfWork {
    id: string;
    title: string;
    status: SowStatus;
    adminNote: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    updatedAt: string;
    ownerId: string;
    subject: { id: string; name: string; code: string | null };
    class: { id: string; name: string };
    classArms: { id: string; classArm: { id: string; armName: string } }[];
    session: { id: string; name: string };
    owner: { id: string; firstName: string; lastName: string };
    approvedBy: { id: string; firstName: string; lastName: string } | null;
    terms: SOWTerm[];
    collaborators: { id: string; userId: string; user: { id: string; firstName: string; lastName: string } }[];
}

const STATUS_STYLES: Record<SowStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

// ─── Overview helpers ─────────────────────────────────────────────────────────

const SDG_COLORS: Record<number, string> = {
    1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
    6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
    11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
    16: "#00689D", 17: "#19486A",
};
const SDG_NAMES: Record<number, string> = {
    1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
    5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
    9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
    12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
    15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};
const REF_ICONS: Record<string, string> = {
    TEXT: "🔗", YOUTUBE: "▶", FILE: "📁", GOOGLE_DRIVE: "☁", IMAGE: "🖼", AUDIO: "🎵",
};

function splitObjectives(raw: string): string[] {
    // Split on " - " only when followed by a capital letter or digit to avoid splitting mid-sentence dashes
    const parts = raw.split(/\s+-\s+(?=[A-Z0-9])/);
    return parts.map((s) => s.replace(/^-\s*/, "").trim()).filter(Boolean);
}

function ObjectivesList({ raw }: { raw: string }) {
    let items: string[] = [];
    try {
        const p = JSON.parse(raw);
        items = Array.isArray(p)
            ? p.flatMap((s: string) => splitObjectives(s))
            : splitObjectives(raw);
    } catch {
        items = splitObjectives(raw);
    }
    return (
        <ul className="space-y-1 pl-1">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 leading-relaxed">
                    <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-gray-400" />
                    {item}
                </li>
            ))}
        </ul>
    );
}

function WeekOverviewRow({ week }: { week: Week }) {
    const [open, setOpen] = useState(false);
    const approvedSdgs = week.sdgMappings.filter((s) => s.approved);
    const hasObj = !!week.objectives;
    const hasWaec = !!week.waecObjectives;
    const hasJamb = !!week.jambObjectives;
    const hasIgcse = !!week.igcseObjectives;
    const hasAny = hasObj || week.references.length > 0 || approvedSdgs.length > 0;

    return (
        <div className={`border rounded-xl overflow-hidden bg-white transition-colors ${open ? "border-primary-200" : "border-gray-100 hover:border-gray-200"}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                    {week.weekNumber}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{week.topic}</span>

                <div className="flex items-center gap-1.5 shrink-0">
                    {hasObj && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">OBJ</span>}
                    {hasWaec && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold">W</span>}
                    {hasJamb && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">J</span>}
                    {hasIgcse && <span className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded font-semibold">I</span>}
                    {week.references.length > 0 && (
                        <span className="text-[10px] text-gray-500 font-medium">{week.references.length} ref{week.references.length !== 1 ? "s" : ""}</span>
                    )}
                    {approvedSdgs.length > 0 && (
                        <div className="flex items-center gap-0.5">
                            {approvedSdgs.slice(0, 5).map((s) => (
                                <div key={s.sdgNumber} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SDG_COLORS[s.sdgNumber] }} title={`SDG ${s.sdgNumber}: ${SDG_NAMES[s.sdgNumber]}`} />
                            ))}
                            {approvedSdgs.length > 5 && <span className="text-[10px] text-gray-400">+{approvedSdgs.length - 5}</span>}
                        </div>
                    )}
                    {!hasAny && <span className="text-[10px] text-gray-300 italic">empty</span>}
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ml-1 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                    {week.content && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Content</p>
                            <p className="text-xs text-gray-600 whitespace-pre-line">{week.content}</p>
                        </div>
                    )}

                    {(hasObj || hasWaec || hasJamb || hasIgcse) && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Objectives</p>
                            {hasObj && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">General</p>
                                    <ObjectivesList raw={week.objectives!} />
                                </div>
                            )}
                            {hasWaec && (
                                <div>
                                    <p className="text-xs font-medium text-amber-700 mb-1">WAEC</p>
                                    <ObjectivesList raw={week.waecObjectives!} />
                                </div>
                            )}
                            {hasJamb && (
                                <div>
                                    <p className="text-xs font-medium text-purple-700 mb-1">JAMB</p>
                                    <ObjectivesList raw={week.jambObjectives!} />
                                </div>
                            )}
                            {hasIgcse && (
                                <div>
                                    <p className="text-xs font-medium text-cyan-700 mb-1">IGCSE</p>
                                    <ObjectivesList raw={week.igcseObjectives!} />
                                </div>
                            )}
                        </div>
                    )}

                    {week.references.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">References</p>
                            <div className="space-y-1.5">
                                {week.references.map((ref) => {
                                    const link = ref.fileKey || ref.url;
                                    return (
                                        <div key={ref.id} className="flex items-center gap-2">
                                            <span className="text-sm shrink-0">{REF_ICONS[ref.type] ?? "🔗"}</span>
                                            {link ? (
                                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 hover:underline truncate">
                                                    {ref.title}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-600 truncate">{ref.title}</span>
                                            )}
                                            {ref.description && <span className="text-xs text-gray-400 truncate">— {ref.description}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {approvedSdgs.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">SDG Mappings</p>
                            <div className="flex flex-wrap gap-1.5">
                                {approvedSdgs.map((entry) => (
                                    <span
                                        key={entry.sdgNumber}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-semibold"
                                        style={{ backgroundColor: SDG_COLORS[entry.sdgNumber] }}
                                    >
                                        {entry.sdgNumber} <span className="opacity-80 font-normal">{SDG_NAMES[entry.sdgNumber]}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasAny && (
                        <p className="text-xs text-gray-400 italic">No content added yet for this week.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

function buildObjectiveLines(raw: string): string[] {
    return raw.split("\n").map((s) => s.replace(/^-\s*/, "").trim()).filter(Boolean);
}

function buildPreviewHTML(sow: SchemeOfWork, term: SOWTerm, weeks: Week[]): string {
    const termName = term.term.name || `Term ${term.termNumber}`;
    const classArms = sow.classArms.length > 0
        ? ` (${sow.classArms.map((ca) => ca.classArm.armName).join(", ")})`
        : "";

    // Stats
    const totalWeeks = weeks.length;
    const weeksWithObj = weeks.filter((w) => w.objectives || w.waecObjectives || w.jambObjectives || w.igcseObjectives).length;
    const completionPct = totalWeeks > 0 ? Math.round((weeksWithObj / totalWeeks) * 100) : 0;
    const totalRefs = weeks.reduce((s, w) => s + w.references.length, 0);
    const totalSdgs = weeks.reduce((s, w) => s + w.sdgMappings.filter((e) => e.approved).length, 0);

    const statsHtml = `
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-num">${totalWeeks}</div><div class="stat-label">Total Weeks</div></div>
    <div class="stat-card">
      <div style="display:flex;align-items:baseline;gap:2px;justify-content:center"><span class="stat-num">${weeksWithObj}</span><span style="font-size:11px;color:#9ca3af">/${totalWeeks}</span></div>
      <div style="display:flex;align-items:center;gap:5px;margin:3px 0"><div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden"><div style="height:4px;background:#3b82f6;width:${completionPct}%"></div></div><span style="font-size:9px;color:#9ca3af">${completionPct}%</span></div>
      <div class="stat-label">With Objectives</div>
    </div>
    <div class="stat-card"><div class="stat-num">${totalRefs}</div><div class="stat-label">References</div></div>
    <div class="stat-card"><div class="stat-num">${totalSdgs}</div><div class="stat-label">SDG Mappings</div></div>
  </div>`;

    const weeksHtml = weeks.map((week) => {
        const content = week.content
            ? `<div class="section"><h4>Content</h4><p class="body-text">${week.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p></div>`
            : "";

        const objItems = (raw: string) => buildObjectiveLines(raw)
            .map((o) => `<li>${o.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`)
            .join("");
        const objSection = (week.objectives || week.waecObjectives || week.jambObjectives || week.igcseObjectives) ? `
            <div class="section">
                <h4>Objectives</h4>
                ${week.objectives ? `<p class="label" style="color:#6b7280">General</p><ul>${objItems(week.objectives)}</ul>` : ""}
                ${week.waecObjectives ? `<p class="label" style="color:#b45309">WAEC</p><ul>${objItems(week.waecObjectives)}</ul>` : ""}
                ${week.jambObjectives ? `<p class="label" style="color:#7e22ce">JAMB</p><ul>${objItems(week.jambObjectives)}</ul>` : ""}
                ${week.igcseObjectives ? `<p class="label" style="color:#0e7490">IGCSE</p><ul>${objItems(week.igcseObjectives)}</ul>` : ""}
            </div>` : "";

        const refSection = week.references.length > 0 ? `
            <div class="section">
                <h4>References</h4>
                <div class="refs">${week.references.map((r) => {
                    const icon = REF_ICONS[r.type] ?? "🔗";
                    const link = r.fileKey || r.url;
                    const titleHtml = link ? `<a href="${link}" target="_blank">${r.title}</a>` : r.title;
                    const desc = r.description ? ` <span class="ref-desc">&mdash; ${r.description}</span>` : "";
                    return `<div class="ref-item"><span class="ref-icon">${icon}</span>${titleHtml}${desc}</div>`;
                }).join("")}</div>
            </div>` : "";

        const sdgs = week.sdgMappings.filter((s) => s.approved);
        const sdgSection = sdgs.length > 0 ? `
            <div class="section">
                <h4>SDG Mappings</h4>
                <div class="sdg-badges">${sdgs.map((s) => `<span class="sdg-badge" style="background-color:${SDG_COLORS[s.sdgNumber]}">${s.sdgNumber} <span style="opacity:.85;font-weight:400">${SDG_NAMES[s.sdgNumber]}</span></span>`).join("")}</div>
            </div>` : "";

        return `
            <div class="week-card">
                <div class="week-header">
                    <span class="week-num">Week ${week.weekNumber}</span>
                    <span class="week-topic">${week.topic}</span>
                </div>
                <div class="week-body">${content}${objSection}${refSection}${sdgSection}</div>
            </div>`;
    }).join("");

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${sow.title} — ${termName}</title><style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:20mm}
  a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
  .doc-header{border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  .doc-header h1{font-size:18px;margin:0 0 4px}
  .doc-header p{margin:2px 0;font-size:11px;color:#555}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}
  .stat-card{background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;padding:10px;text-align:center}
  .stat-num{font-size:20px;font-weight:bold;color:#111;line-height:1.2}
  .stat-label{font-size:9px;color:#9ca3af;margin-top:2px}
  .term-title{font-size:15px;font-weight:bold;margin-bottom:16px;color:#1e3a8a}
  .week-card{border:1px solid #ddd;border-radius:6px;margin-bottom:14px;overflow:hidden;page-break-inside:avoid}
  .week-header{background:#eff6ff;padding:8px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #ddd}
  .week-num{background:#3b82f6;color:white;font-weight:bold;font-size:10px;padding:2px 8px;border-radius:4px;white-space:nowrap}
  .week-topic{font-weight:bold;font-size:13px}
  .week-body{padding:10px 12px}
  .section{margin-bottom:10px}
  .section h4{font-size:9px;text-transform:uppercase;color:#aaa;letter-spacing:.06em;margin:0 0 5px;border-bottom:1px solid #f0f0f0;padding-bottom:3px}
  .section ul{margin:2px 0;padding-left:16px}
  .section ul li{margin-bottom:2px;font-size:11px;line-height:1.5}
  .body-text{font-size:11px;margin:0;line-height:1.5}
  .label{font-size:10px;font-weight:700;margin:6px 0 2px}
  .refs{display:flex;flex-direction:column;gap:3px}
  .ref-item{display:flex;align-items:center;gap:6px;font-size:11px}
  .ref-icon{font-size:13px;flex-shrink:0;line-height:1}
  .ref-desc{color:#999;font-size:10px}
  .sdg-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
  .sdg-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;color:#fff;font-size:10px;font-weight:700}
  @media print{body{padding:10mm}.week-card{page-break-inside:avoid}.stats-grid{page-break-inside:avoid}}
</style></head>
<body>
  <div class="doc-header">
    <h1>${sow.title}</h1>
    <p>${sow.subject.name} &middot; ${sow.class.name}${classArms} &middot; ${sow.session.name}</p>
    <p>By ${sow.owner.firstName} ${sow.owner.lastName}</p>
  </div>
  ${statsHtml}
  <div class="term-title">${termName}</div>
  ${weeksHtml}
</body></html>`;
}

function PreviewWeekCard({ week }: { week: Week }) {
    const approvedSdgs = week.sdgMappings.filter((s) => s.approved);
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                    {week.weekNumber}
                </span>
                <span className="font-semibold text-sm text-gray-800">{week.topic}</span>
            </div>
            <div className="px-4 py-3 space-y-3">
                {week.content && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Content</p>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{week.content}</p>
                    </div>
                )}
                {(week.objectives || week.waecObjectives || week.jambObjectives || week.igcseObjectives) && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Objectives</p>
                        {week.objectives && <div><p className="text-xs font-medium text-gray-500 mb-1">General</p><ObjectivesList raw={week.objectives} /></div>}
                        {week.waecObjectives && <div><p className="text-xs font-medium text-amber-700 mb-1">WAEC</p><ObjectivesList raw={week.waecObjectives} /></div>}
                        {week.jambObjectives && <div><p className="text-xs font-medium text-purple-700 mb-1">JAMB</p><ObjectivesList raw={week.jambObjectives} /></div>}
                        {week.igcseObjectives && <div><p className="text-xs font-medium text-cyan-700 mb-1">IGCSE</p><ObjectivesList raw={week.igcseObjectives} /></div>}
                    </div>
                )}
                {week.references.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">References</p>
                        <div className="space-y-1">
                            {week.references.map((ref) => (
                                <div key={ref.id} className="flex items-center gap-2">
                                    <span className="text-sm shrink-0">{REF_ICONS[ref.type] ?? "🔗"}</span>
                                    <span className="text-xs text-gray-600 truncate">{ref.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {approvedSdgs.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">SDG Mappings</p>
                        <div className="flex flex-wrap gap-1.5">
                            {approvedSdgs.map((entry) => (
                                <span key={entry.sdgNumber} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-semibold" style={{ backgroundColor: SDG_COLORS[entry.sdgNumber] }}>
                                    {entry.sdgNumber} <span className="opacity-80 font-normal">{SDG_NAMES[entry.sdgNumber]}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TermPreviewModal({ sow, term, onClose }: { sow: SchemeOfWork; term: SOWTerm; onClose: () => void }) {
    const weeks = [...term.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const termName = term.term.name || `Term ${term.termNumber}`;

    const totalRefs = weeks.reduce((s, w) => s + w.references.length, 0);
    const totalSdgs = weeks.reduce((s, w) => s + w.sdgMappings.filter((e) => e.approved).length, 0);
    const weeksWithObj = weeks.filter((w) => w.objectives || w.waecObjectives || w.jambObjectives || w.igcseObjectives).length;
    const completionPct = weeks.length > 0 ? Math.round((weeksWithObj / weeks.length) * 100) : 0;

    const [pos, setPos] = useState(() => ({
        x: typeof window !== "undefined" ? Math.max(20, (window.innerWidth - 840) / 2) : 80,
        y: 60,
    }));
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        const onUp = () => setDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [dragging]);

    const openPrintWindow = () => {
        const html = buildPreviewHTML(sow, term, weeks);
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 300);
    };

    const handleDownloadWord = () => {
        const html = buildPreviewHTML(sow, term, weeks);
        const blob = new Blob(["\ufeff", html], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sow.title} - ${termName}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            {/* Click-outside backdrop */}
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

            {/* Floating window */}
            <div
                className="fixed z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200"
                style={{
                    left: pos.x,
                    top: pos.y,
                    width: 840,
                    maxWidth: "calc(100vw - 40px)",
                    height: 600,
                    maxHeight: "calc(100vh - 80px)",
                    resize: "both",
                    overflow: "hidden",
                    minWidth: 420,
                    minHeight: 320,
                }}
            >
                {/* Title bar — drag handle */}
                <div
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 cursor-move select-none shrink-0 rounded-t-2xl"
                    onMouseDown={(e) => {
                        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
                        setDragging(true);
                    }}
                >
                    {/* Grip dots */}
                    <svg className="w-2.5 h-3 text-gray-300 shrink-0" viewBox="0 0 6 10" fill="currentColor">
                        <circle cx="1" cy="1" r="1" /><circle cx="5" cy="1" r="1" />
                        <circle cx="1" cy="5" r="1" /><circle cx="5" cy="5" r="1" />
                        <circle cx="1" cy="9" r="1" /><circle cx="5" cy="9" r="1" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{sow.title}</p>
                        <p className="text-[11px] text-gray-400 leading-tight">{sow.subject.name} · {termName} · {weeks.length} week{weeks.length !== 1 ? "s" : ""}</p>
                    </div>
                    {/* Action buttons — stop drag propagation */}
                    <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={openPrintWindow}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={openPrintWindow}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadWord}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Word
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-0.5" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Close"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
                    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="border-b-2 border-gray-800 pb-4 mb-4">
                            <h1 className="text-lg font-bold text-gray-900">{sow.title}</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {sow.subject.name} · {sow.class.name}
                                {sow.classArms.length > 0 && ` (${sow.classArms.map((ca) => ca.classArm.armName).join(", ")})`}
                                {" · "}{sow.session.name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">By {sow.owner.firstName} {sow.owner.lastName}</p>
                        </div>

                        {/* Stats bar */}
                        <div className="grid grid-cols-4 gap-2.5 mb-5">
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                                <p className="text-xl font-bold text-gray-900 leading-none">{weeks.length}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Total Weeks</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                                <div className="flex items-baseline justify-center gap-0.5">
                                    <p className="text-xl font-bold text-gray-900 leading-none">{weeksWithObj}</p>
                                    <p className="text-xs text-gray-400">/{weeks.length}</p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 mb-0.5">
                                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${completionPct}%` }} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 shrink-0">{completionPct}%</p>
                                </div>
                                <p className="text-[10px] text-gray-400">With Objectives</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                                <p className="text-xl font-bold text-gray-900 leading-none">{totalRefs}</p>
                                <p className="text-[10px] text-gray-400 mt-1">References</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                                <p className="text-xl font-bold text-gray-900 leading-none">{totalSdgs}</p>
                                <p className="text-[10px] text-gray-400 mt-1">SDG Mappings</p>
                            </div>
                        </div>

                        <h2 className="text-sm font-bold text-blue-800 mb-4">{termName}</h2>
                        {weeks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No weeks added for this term.</p>
                        ) : (
                            <div className="space-y-3">
                                {weeks.map((week) => (
                                    <PreviewWeekCard key={week.id} week={week} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export function SchemeOfWorkDetailClient({ id }: { id: string }) {
    const { data: authSession } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get("step");
    const termParam = searchParams.get("term");
    const wizardStep = stepParam === "2" || stepParam === "3" || stepParam === "4"
        ? (parseInt(stepParam) as 2 | 3 | 4)
        : null;

    const user = authSession?.user as any;
    const roles: string[] = user?.roles || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const isStudent = roles.includes("STUDENT") || user?.loginType === "student";

    const [sow, setSow] = useState<SchemeOfWork | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    const fetchSOW = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`);
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Failed to load");
            }
            const data = await res.json();
            setSow(data.schemeOfWork);
            setTitleValue(data.schemeOfWork.title);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchSOW(); }, [fetchSOW]);

    useEffect(() => {
        if (!sow || !termParam) return;

        const requestedTermNumber = Number.parseInt(termParam, 10);
        if (!Number.isInteger(requestedTermNumber)) return;

        const requestedIndex = [...sow.terms]
            .sort((a, b) => a.termNumber - b.termNumber)
            .findIndex((term) => term.termNumber === requestedTermNumber);

        if (requestedIndex >= 0) {
            setActiveTab(requestedIndex);
        }
    }, [sow, termParam]);

    const isOwner = sow?.ownerId === user?.id;
    const isCollaborator = sow?.collaborators.some((c) => c.userId === user?.id) ?? false;
    // Teachers can always edit live SOW data — approved snapshot is separate
    const canEdit = isAdmin || isOwner || isCollaborator;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleWeeksChange = (termId: string, weeks: any[]) => {
        if (!sow) return;
        setSow({
            ...sow,
            terms: sow.terms.map((t) => t.id === termId ? { ...t, weeks } : t),
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleWeekUpdated = (weekId: string, updates: any) => {
        if (!sow) return;
        setSow({
            ...sow,
            terms: sow.terms.map((t) => ({
                ...t,
                weeks: t.weeks.map((w) => w.id === weekId ? { ...w, ...updates } : w),
            })),
        });
    };

    const handleTermStatusChange = (termId: string, status: SowStatus, adminNote: string | null) => {
        if (!sow) return;
        setSow({
            ...sow,
            // Bump SOW-level status when any term is approved (for display badge)
            status: status === "APPROVED" ? "APPROVED" : sow.status,
            terms: sow.terms.map((t) =>
                t.id === termId ? { ...t, status, adminNote } : t
            ),
        });
    };

    const handleSaveTitle = async () => {
        if (!titleValue.trim() || !sow) return;
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: titleValue }),
            });
            if (res.ok) {
                setSow({ ...sow, title: titleValue.trim() });
                setEditingTitle(false);
            }
        } catch { /* ignore */ }
    };

    const handleDelete = async () => {
        const confirmed = await showAppConfirm("Delete this scheme of work? This cannot be undone.", {
            title: "Delete Scheme of Work",
            variant: "warning",
            confirmText: "Delete",
        });
        if (!confirmed) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/scheme-of-work/${id}`, { method: "DELETE" });
            if (res.ok) router.push("/dashboard/scheme-of-work");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-64 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !sow) {
        return (
            <div className="p-6 max-w-6xl mx-auto text-center py-16">
                <p className="text-red-600 mb-3">{error || "Scheme of work not found"}</p>
                <button onClick={() => router.back()} className="text-sm text-primary-600 hover:underline">Go back</button>
            </div>
        );
    }

    const sortedTerms = [...sow.terms].sort((a, b) => a.termNumber - b.termNumber);
    const totalWeeks = sow.terms.reduce((s, t) => s + t.weeks.length, 0);
    const selectedTermIndex = sortedTerms.length === 0 ? 0 : Math.min(activeTab, sortedTerms.length - 1);

    const openTermInWeeksStep = (termNumber: number) => {
        router.push(`/dashboard/scheme-of-work/${id}?step=2&term=${termNumber}`);
    };

    // ── Shared header ────────────────────────────────────────────────────────

    const headerSection = (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[sow.status]}`}>
                        {sow.status}
                    </span>
                    <span className="text-xs text-gray-400">
                        {sow.subject.name} · {sow.class.name}
                        {sow.classArms.length > 0 && ` (${sow.classArms.map((ca) => ca.classArm.armName).join(", ")})`}
                        {" "}· {sow.session.name}
                    </span>
                </div>

                {editingTitle && canEdit ? (
                    <div className="flex items-center gap-2">
                        <input
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            className="text-xl font-bold border-b-2 border-primary-500 outline-none bg-transparent w-full"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                        />
                        <button onClick={handleSaveTitle} className="text-xs text-primary-600 font-medium hover:underline shrink-0">Save</button>
                        <button onClick={() => { setEditingTitle(false); setTitleValue(sow.title); }} className="text-xs text-gray-400 hover:underline shrink-0">Cancel</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group">
                        <h1 className="text-xl font-bold text-gray-900 leading-snug">{sow.title}</h1>
                        {canEdit && (
                            <button
                                onClick={() => setEditingTitle(true)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity shrink-0"
                                title="Edit title"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                    By {sow.owner.firstName} {sow.owner.lastName}
                    {sow.approvedBy && ` · Approved by ${sow.approvedBy.firstName} ${sow.approvedBy.lastName}`}
                </p>
            </div>

            {/* Actions — only in normal view */}
            {!wizardStep && (
                <div className="flex items-center gap-2 shrink-0">
                    {(isOwner || isAdmin) && (
                        <button
                            onClick={() => setShowCollaborators(!showCollaborators)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {sow.collaborators.length > 0 ? `${sow.collaborators.length} Collaborator${sow.collaborators.length > 1 ? "s" : ""}` : "Add Collaborators"}
                        </button>
                    )}
                    {(isOwner || isAdmin) && sow.status === "DRAFT" && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {deleting ? "Deleting…" : "Delete"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    // ── Wizard mode ──────────────────────────────────────────────────────────

    if (wizardStep) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <button onClick={() => router.push(`/dashboard/scheme-of-work/${id}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                </button>

                {headerSection}

                <WizardStepBar sowId={id} currentStep={wizardStep} totalWeeks={totalWeeks} />

                {wizardStep === 2 && (
                    <div className="space-y-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-800">Add Weeks</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Add weekly lesson content for each term. You need at least one week to continue.
                            </p>
                        </div>
                        {sortedTerms.length > 0 ? (
                            <>
                                <div className="flex border-b border-gray-200">
                                    {sortedTerms.map((term, i) => (
                                        <button
                                            key={term.id}
                                            onClick={() => setActiveTab(i)}
                                            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                                activeTab === i
                                                    ? "border-primary-600 text-primary-600"
                                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            {term.term.name || `Term ${term.termNumber}`}
                                            <span className="ml-1.5 text-xs text-gray-400">({term.weeks.length} wks)</span>
                                        </button>
                                    ))}
                                </div>
                                {sortedTerms.map((term, i) => (
                                    <div key={term.id} className={activeTab !== i ? "hidden" : ""}>
                                        <TermWeeksTable
                                            termId={term.termId}
                                            termName={term.term.name || `Term ${term.termNumber}`}
                                            schemeOfWorkTermId={term.id}
                                            weeks={term.weeks}
                                            canEdit={canEdit}
                                            onWeeksChange={(weeks) => handleWeeksChange(term.id, weeks)}
                                        />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-400 text-sm">No terms found. Ensure the selected session has terms configured.</p>
                            </div>
                        )}
                    </div>
                )}

                {wizardStep === 3 && (
                    <WizardPhase3Objectives
                        terms={sortedTerms}
                        canEdit={canEdit}
                        onWeekUpdated={handleWeekUpdated}
                        onOpenTerm={openTermInWeeksStep}
                    />
                )}

                {wizardStep === 4 && (
                    <WizardPhase4References
                        terms={sortedTerms}
                        canEdit={canEdit}
                        onWeekUpdated={handleWeekUpdated}
                        onOpenTerm={openTermInWeeksStep}
                    />
                )}
            </div>
        );
    }

    // ── Normal detail view (Overview) ───────────────────────────────────────

    const allWeeks = sortedTerms.flatMap((t) => t.weeks);
    const totalRefs = allWeeks.reduce((s, w) => s + w.references.length, 0);
    const approvedSdgCount = allWeeks.reduce((s, w) => s + w.sdgMappings.filter((e) => e.approved).length, 0);
    const weeksWithObj = allWeeks.filter((w) => w.objectives).length;
    const completionPct = totalWeeks > 0 ? Math.round((weeksWithObj / totalWeeks) * 100) : 0;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Back */}
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            {headerSection}

            {/* Wizard banner when SOW has no weeks yet */}
            {canEdit && totalWeeks === 0 && (
                <div className="mb-6 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary-800">
                            {totalWeeks === 0 ? "Start building this scheme of work" : "Continue building this scheme of work"}
                        </p>
                        <p className="text-xs text-primary-600 mt-0.5">
                            {totalWeeks === 0
                                ? "Use the wizard to add weeks, objectives, resources, and SDG mappings."
                                : "Add or edit weeks, objectives, references, and SDG mappings via the wizard."}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push(`/dashboard/scheme-of-work/${id}?step=2`)}
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        {totalWeeks === 0 ? "Start Wizard" : "Open Wizard"}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Stats bar */}
            {totalWeeks > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                        <p className="text-2xl font-bold text-gray-900">{totalWeeks}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Total Weeks</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                        <div className="flex items-end gap-1">
                            <p className="text-2xl font-bold text-gray-900">{weeksWithObj}</p>
                            <p className="text-sm text-gray-400 mb-0.5">/{totalWeeks}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${completionPct}%` }} />
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">{completionPct}%</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">With Objectives</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                        <p className="text-2xl font-bold text-gray-900">{totalRefs}</p>
                        <p className="text-xs text-gray-400 mt-0.5">References</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                        <p className="text-2xl font-bold text-gray-900">{approvedSdgCount}</p>
                        <p className="text-xs text-gray-400 mt-0.5">SDG Mappings</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Terms + Week overview cards */}
                <div className="lg:col-span-2 space-y-6">
                    {sortedTerms.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-gray-400 text-sm">No terms found. Ensure the selected session has terms configured.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                {sortedTerms.map((term, i) => (
                                    <button
                                        key={term.id}
                                        type="button"
                                        onClick={() => setActiveTab(i)}
                                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                            selectedTermIndex === i
                                                ? "border-primary-600 bg-primary-50 text-primary-700"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
                                        }`}
                                    >
                                        {term.term.name || `Term ${term.termNumber}`}
                                        <span className="ml-1.5 text-xs text-gray-400">({term.weeks.length} wk{term.weeks.length !== 1 ? "s" : ""})</span>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(true)}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Preview
                                </button>
                            </div>

                            {sortedTerms.map((term, i) => {
                        const sortedWeeks = [...term.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
                        const termRefs = sortedWeeks.reduce((s, w) => s + w.references.length, 0);
                        const termSdgs = sortedWeeks.reduce((s, w) => s + w.sdgMappings.filter((e) => e.approved).length, 0);
                        return (
                            <div key={term.id} className={selectedTermIndex !== i ? "hidden" : ""}>
                                {/* Term header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        {term.term.name || `Term ${term.termNumber}`}
                                    </h3>
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>{sortedWeeks.length} week{sortedWeeks.length !== 1 ? "s" : ""}</span>
                                        {termRefs > 0 && <span>· {termRefs} ref{termRefs !== 1 ? "s" : ""}</span>}
                                        {termSdgs > 0 && <span>· {termSdgs} SDG{termSdgs !== 1 ? "s" : ""}</span>}
                                    </div>
                                </div>

                                {sortedWeeks.length === 0 ? (
                                    canEdit ? (
                                        <button
                                            type="button"
                                            onClick={() => openTermInWeeksStep(term.termNumber)}
                                            className="w-full text-left px-4 py-4 rounded-xl border border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
                                        >
                                            <p className="text-sm font-medium text-gray-700">
                                                {term.term.name || `Term ${term.termNumber}`}
                                            </p>
                                            <p className="text-xs text-gray-400 italic mt-1">No weeks added yet.</p>
                                            <p className="text-xs font-medium text-primary-600 mt-2">Click to add weeks for this term</p>
                                        </button>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic pl-2">No weeks added yet.</p>
                                    )
                                ) : (
                                    <div className="space-y-2">
                                        {sortedWeeks.map((week) => (
                                            <WeekOverviewRow key={week.id} week={week} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                            })}
                        </>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <ApprovalPanel
                        sowId={sow.id}
                        terms={sow.terms.map((t) => ({
                            termId: t.id,
                            termNumber: t.termNumber,
                            termName: t.term.name || `Term ${t.termNumber}`,
                            status: (t.status ?? "DRAFT") as SowStatus,
                            adminNote: t.adminNote ?? null,
                            submittedAt: t.submittedAt ?? null,
                            approvedAt: t.approvedAt ?? null,
                            weekCount: t.weeks.length,
                        }))}
                        isAdmin={isAdmin}
                        isOwner={isOwner}
                        onTermStatusChange={handleTermStatusChange}
                    />

                    {showCollaborators && (
                        <CollaboratorPanel sowId={sow.id} isOwner={isOwner || isAdmin} />
                    )}

                    {/* Info card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Subject</span>
                                <span className="font-medium text-gray-800 text-right">{sow.subject.name}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Class</span>
                                <span className="font-medium text-gray-800 text-right">
                                    {sow.class.name}
                                    {sow.classArms.length > 0 && (
                                        <span className="ml-1 font-normal text-gray-500 text-xs">
                                            ({sow.classArms.map((ca) => ca.classArm.armName).join(", ")})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Session</span>
                                <span className="font-medium text-gray-800 text-right">{sow.session.name}</span>
                            </div>
                            <div className="h-px bg-gray-100" />
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">Weeks</span>
                                <span className="font-medium text-gray-800">{totalWeeks}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">References</span>
                                <span className="font-medium text-gray-800">{totalRefs}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-400 shrink-0">SDG Mappings</span>
                                <span className="font-medium text-gray-800">{approvedSdgCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPreview && sortedTerms[selectedTermIndex] && (
                <TermPreviewModal
                    sow={sow}
                    term={sortedTerms[selectedTermIndex]}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
