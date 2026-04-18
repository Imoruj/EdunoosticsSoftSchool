'use client';

import React, { useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Loader2,
  Link2, ImageIcon, Music2, PlayCircle, FileText, Globe, ExternalLink, X,
} from 'lucide-react';

export interface SowReference {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'YOUTUBE' | 'FILE' | 'GOOGLE_DRIVE';
  title: string;
  url: string | null;
  fileKey: string | null;
  description: string | null;
  sortOrder: number;
}

export interface SowWeek {
  weekId: string;
  weekNumber: number;
  topic: string;
  content: string | null;
  objectives: string | null;
  waecObjectives: string | null;
  jambObjectives: string | null;
  igcseObjectives: string | null;
  sdgNumbers: number[];
  sowId: string;
  sowTitle: string;
  termName: string;
  termNumber: number;
  className: string;
  sessionName: string;
  references?: SowReference[];
  isFromSnapshot?: boolean;
}

interface SowWeekPanelProps {
  subjectId: string;
  weeks: SowWeek[];
  loading: boolean;
  selectedWeekId: string;
  onWeekSelect: (weekId: string) => void;
}

const REF_ICON: Record<string, React.ReactNode> = {
  TEXT:         <Link2 size={9} />,
  IMAGE:        <ImageIcon size={9} />,
  AUDIO:        <Music2 size={9} />,
  YOUTUBE:      <PlayCircle size={9} />,
  FILE:         <FileText size={9} />,
  GOOGLE_DRIVE: <Globe size={9} />,
};

const REF_COLOR: Record<string, string> = {
  TEXT:         '#6366f1',
  IMAGE:        '#06b6d4',
  AUDIO:        '#10b981',
  YOUTUBE:      '#ef4444',
  FILE:         '#f59e0b',
  GOOGLE_DRIVE: '#4285f4',
};

export function SowWeekPanel({ subjectId, weeks, loading, selectedWeekId, onWeekSelect }: SowWeekPanelProps) {
  const [openTerms, setOpenTerms] = useState<Set<number>>(new Set([1]));

  function toggleTerm(t: number) {
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Scheme of Work</p>
        {selectedWeekId && (
          <button
            onClick={() => onWeekSelect('')}
            className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={8} /> Clear
          </button>
        )}
      </div>

      {/* Empty / loading states */}
      {!subjectId && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Select a subject above to load SOW weeks.
        </p>
      )}

      {subjectId && loading && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Loader2 size={11} className="animate-spin" />
          Loading approved weeks…
        </div>
      )}

      {subjectId && !loading && weeks.length === 0 && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          No approved Scheme of Work found for this subject.
        </p>
      )}

      {/* Term / week tree */}
      {subjectId && !loading && weeks.length > 0 && (() => {
        const byTerm = weeks.reduce<Record<number, SowWeek[]>>((acc, w) => {
          if (!acc[w.termNumber]) acc[w.termNumber] = [];
          acc[w.termNumber].push(w);
          return acc;
        }, {});
        const termNums = Object.keys(byTerm).map(Number).sort();
        const selectedWeek = weeks.find((w) => w.weekId === selectedWeekId);

        return (
          <>
            <div className="space-y-1.5">
              {termNums.map((tn) => {
                const isOpen = openTerms.has(tn);
                const termWeeks = byTerm[tn];
                return (
                  <div key={tn} className="rounded-md overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                    {/* Term header */}
                    <button
                      className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left"
                      style={{ background: '#f8fafc' }}
                      onClick={() => toggleTerm(tn)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    >
                      {isOpen
                        ? <ChevronDown size={9} className="text-slate-400 shrink-0" />
                        : <ChevronRight size={9} className="text-slate-400 shrink-0" />}
                      <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">
                        {termWeeks[0]?.termName ?? `Term ${tn}`}
                      </span>
                      <span className="text-[9px] text-slate-400">{termWeeks.length}w</span>
                    </button>

                    {/* Weeks list */}
                    {isOpen && (
                      <div className="divide-y" style={{ borderTop: '1px solid #e2e8f0' }}>
                        {termWeeks.map((w) => {
                          const active = w.weekId === selectedWeekId;
                          return (
                            <button
                              key={w.weekId}
                              className="flex items-start gap-2 w-full px-2.5 py-1.5 text-left transition-colors"
                              style={{ background: active ? '#eef2ff' : 'transparent' }}
                              onClick={() => onWeekSelect(active ? '' : w.weekId)}
                              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? '#eef2ff' : 'transparent'; }}
                            >
                              <span
                                className="text-[10px] font-semibold tabular-nums shrink-0 mt-0.5 w-5"
                                style={{ color: active ? '#4f46e5' : '#94a3b8' }}
                              >
                                W{w.weekNumber}
                              </span>
                              <span
                                className="text-[11px] leading-snug"
                                style={{ color: active ? '#3730a3' : '#475569' }}
                              >
                                {w.topic}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected week detail */}
            {selectedWeek && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-1.5">
                  <BookOpen size={10} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-semibold text-indigo-600 leading-snug">
                    Week {selectedWeek.weekNumber}: {selectedWeek.topic}
                  </span>
                </div>

                {selectedWeek.content && (
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-4">
                    {selectedWeek.content}
                  </p>
                )}

                {selectedWeek.objectives && (
                  <div className="rounded-md px-2.5 py-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700 mb-1">Objectives</p>
                    <p className="text-[10px] text-emerald-800 leading-relaxed line-clamp-5">
                      {selectedWeek.objectives}
                    </p>
                  </div>
                )}

                {selectedWeek.references && selectedWeek.references.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Resources ({selectedWeek.references.length})
                    </p>
                    <div className="space-y-1">
                      {selectedWeek.references.map((ref) => {
                        const color = REF_COLOR[ref.type] ?? '#6366f1';
                        const icon = REF_ICON[ref.type];
                        const link = ref.url || (ref.fileKey ? `/api/uploads/${ref.fileKey}` : null);
                        return (
                          <div
                            key={ref.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          >
                            <span
                              className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white"
                              style={{ background: color }}
                            >
                              {icon}
                            </span>
                            <span className="flex-1 text-[11px] text-slate-700 truncate">{ref.title}</span>
                            {link && (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SDGs */}
                {selectedWeek.sdgNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedWeek.sdgNumbers.map((n) => (
                      <span
                        key={n}
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white"
                        style={{ background: '#4f46e5' }}
                      >
                        SDG {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
