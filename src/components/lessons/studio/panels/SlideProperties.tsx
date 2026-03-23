'use client';

import React from 'react';
import type { LessonSlide } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';

interface SlidePropertiesProps {
  slide: LessonSlide;
  dispatch: React.Dispatch<StudioAction>;
}

const TRANSITIONS = ['none', 'fade', 'slide-left', 'slide-right'] as const;

export function SlideProperties({ slide, dispatch }: SlidePropertiesProps) {
  function update(patch: Partial<LessonSlide>) {
    dispatch({ type: 'UPDATE_SLIDE', slideId: slide.id, patch });
  }

  const bg = slide.background ?? { type: 'color', color: '#ffffff' };

  return (
    <div className="flex flex-col p-4 gap-5 text-xs overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

      <Section title="Background">
        <div className="flex gap-1 mb-3 p-0.5 rounded-md" style={{ background: '#f1f5f9' }}>
          {(['color', 'gradient', 'image'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ background: { ...bg, type: t } })}
              className="flex-1 py-1 rounded text-center capitalize text-[11px] transition-colors"
              style={{
                background: bg.type === t ? '#4f46e5' : 'transparent',
                color: bg.type === t ? '#fff' : '#64748b',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {bg.type === 'color' && (
          <div className="flex items-center gap-2">
            <input type="color" value={bg.color ?? '#ffffff'}
              onChange={(e) => update({ background: { ...bg, color: e.target.value } })}
              className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
            <input type="text" value={bg.color ?? '#ffffff'}
              onChange={(e) => update({ background: { ...bg, color: e.target.value } })}
              className="flex-1 px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
          </div>
        )}
        {bg.type === 'gradient' && (
          <input type="text" value={bg.gradient ?? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
            onChange={(e) => update({ background: { ...bg, gradient: e.target.value } })}
            placeholder="CSS gradient"
            className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
        )}
        {bg.type === 'image' && (
          <input type="text" value={bg.imageUrl ?? ''}
            onChange={(e) => update({ background: { ...bg, imageUrl: e.target.value } })}
            placeholder="Image URL"
            className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
        )}
      </Section>

      <Section title="Duration & Timing">
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Slide duration</span>
            <span className="text-slate-700 tabular-nums">{slide.duration || 10}s</span>
          </div>
          <input type="range" min={1} max={60} value={slide.duration || 10}
            onChange={(e) => update({ duration: Number(e.target.value) })}
            className="w-full accent-indigo-500" />
        </label>
        <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
          <input type="checkbox" checked={slide.autoAdvance ?? false}
            onChange={(e) => update({ autoAdvance: e.target.checked })}
            className="accent-indigo-500 w-3.5 h-3.5" />
          <span className="text-[11px] text-slate-500">Auto-advance</span>
        </label>
      </Section>

      <Section title="Transition In">
        <div className="grid grid-cols-2 gap-1">
          {TRANSITIONS.map((t) => (
            <button key={t} onClick={() => update({ transition: t })}
              className="py-1.5 px-2 rounded text-center capitalize text-[11px] transition-colors"
              style={{ background: slide.transition === t ? '#4f46e5' : '#f1f5f9', color: slide.transition === t ? '#fff' : '#64748b' }}>
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Speaker Notes">
        <textarea value={slide.notes ?? ''} onChange={(e) => update({ notes: e.target.value })}
          placeholder="Notes for teacher during presentation…"
          rows={4}
          className="w-full px-2.5 py-2 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400 resize-none leading-relaxed"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">{title}</p>
      {children}
    </div>
  );
}
