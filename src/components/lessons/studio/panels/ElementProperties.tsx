'use client';

import React from 'react';
import type { SlideElement, SlideAnimation } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';

interface ElementPropertiesProps {
  element: SlideElement;
  slideId: string;
  slideDuration: number;
  dispatch: React.Dispatch<StudioAction>;
}

const ANIMATIONS: SlideAnimation[] = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'bounce'];

const TYPE_COLOR: Record<string, string> = {
  text: '#6366f1', image: '#06b6d4', video: '#8b5cf6',
  audio: '#10b981', quiz: '#f59e0b', embed: '#64748b',
};

export function ElementProperties({ element, slideId, slideDuration, dispatch }: ElementPropertiesProps) {
  function patch(p: Partial<SlideElement>) {
    dispatch({ type: 'UPDATE_ELEMENT', slideId, elementId: element.id, patch: p });
  }

  const color = TYPE_COLOR[element.type] ?? '#6366f1';

  return (
    <div className="flex flex-col p-4 gap-5 text-xs overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize text-white" style={{ background: color }}>{element.type}</span>
      </div>

      {/* Position & Size */}
      <Section title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          {([['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']] as const).map(([label, key]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">{label} %</span>
              <input type="number" min={0} max={100} step={0.5} value={Math.round(element[key] * 10) / 10}
                onChange={(e) => patch({ [key]: Number(e.target.value) })}
                className="px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400 tabular-nums"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
            </label>
          ))}
        </div>
      </Section>

      {/* Timeline Timing */}
      <Section title="Timeline Timing">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Appears at</span><span className="text-slate-700 tabular-nums">{element.startTime.toFixed(2)}s</span>
            </div>
            <input type="range" min={0} max={Math.max(0, slideDuration - 0.5)} step={0.25} value={element.startTime}
              onChange={(e) => { const v = Number(e.target.value); patch({ startTime: v, endTime: Math.max(element.endTime, v + 0.5) }); }}
              className="w-full accent-indigo-500" />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Disappears at</span><span className="text-slate-700 tabular-nums">{element.endTime.toFixed(2)}s</span>
            </div>
            <input type="range" min={element.startTime + 0.5} max={slideDuration} step={0.25} value={element.endTime}
              onChange={(e) => patch({ endTime: Number(e.target.value) })}
              className="w-full accent-indigo-500" />
          </label>
        </div>
      </Section>

      {/* Animation */}
      <Section title="Entrance Animation">
        <select value={element.animateIn ?? 'none'}
          onChange={(e) => patch({ animateIn: e.target.value as SlideAnimation })}
          className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
          {ANIMATIONS.map((a) => <option key={a} value={a} className="bg-neutral-900 capitalize">{a}</option>)}
        </select>
      </Section>

      {/* Style */}
      <Section title="Style">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Opacity</span><span className="text-slate-700 tabular-nums">{Math.round((element.opacity ?? 1) * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={element.opacity ?? 1}
              onChange={(e) => patch({ opacity: Number(e.target.value) })}
              className="w-full accent-indigo-500" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Border radius (px)</span>
            <input type="number" min={0} max={999} value={element.borderRadius ?? 0}
              onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
              className="px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
          </label>
          <div className="flex flex-col gap-2">
            {([['shadow', 'Drop shadow'], ['locked', 'Lock element']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!(element as any)[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  className="accent-indigo-500 w-3.5 h-3.5" />
                <span className="text-[11px] text-slate-500">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Layer */}
      <Section title="Layer">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Z-index</span>
          <input type="number" min={1} value={element.zIndex}
            onChange={(e) => patch({ zIndex: Number(e.target.value) })}
            className="px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }} />
        </label>
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
