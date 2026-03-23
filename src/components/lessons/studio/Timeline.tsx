'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import type { LessonSlide, SlideElement } from '@/lib/db/types';
import type { StudioAction, StudioState } from './useStudioState';

interface TimelineProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  activeSlide: LessonSlide | null;
}

const ROW_H = 26;
const RULER_H = 20;
const LEFT_W = 120;
const SNAP = 0.25;

function snap(v: number) { return Math.round(v / SNAP) * SNAP; }
function fmt(s: number) { const m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`; }

const TYPE_COLOR: Record<string, string> = {
  text: '#6366f1', image: '#06b6d4', video: '#8b5cf6',
  audio: '#10b981', quiz: '#f59e0b', embed: '#64748b', assignment: '#f97316',
};

export function Timeline({ state, dispatch, activeSlide }: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const rafRef = useRef<number>(0);

  const slide = activeSlide;
  const duration = slide?.duration ?? 10;
  const playing = state.playing;
  const playhead = state.playhead;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(100, el.offsetWidth - LEFT_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Playback RAF
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      dispatch({ type: 'SCRUB', time: Math.min(state.playhead + dt, duration) });
      if (state.playhead + dt >= duration) { dispatch({ type: 'PAUSE' }); dispatch({ type: 'SCRUB', time: duration }); return; }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration]); // eslint-disable-line

  const pxPerSec = width / duration;
  function timeToX(t: number) { return LEFT_W + t * pxPerSec; }
  function xToTime(x: number) { return snap(Math.max(0, Math.min(duration, (x - LEFT_W) / pxPerSec))); }

  // Playhead drag
  const phDrag = useRef(false);
  function onPhDown(e: React.MouseEvent) {
    e.preventDefault();
    phDrag.current = true;
    dispatch({ type: 'PAUSE' });
    const move = (ev: MouseEvent) => {
      if (!phDrag.current || !svgRef.current) return;
      dispatch({ type: 'SCRUB', time: xToTime(ev.clientX - svgRef.current.getBoundingClientRect().left) });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', () => { phDrag.current = false; window.removeEventListener('mousemove', move); }, { once: true });
  }

  // Bar drag
  type BarDrag = { id: string; mode: 'move' | 'left' | 'right'; startX: number; origStart: number; origEnd: number };
  const barDrag = useRef<BarDrag | null>(null);

  function onBarDown(e: React.PointerEvent, el: SlideElement, mode: BarDrag['mode']) {
    if (!slide) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    barDrag.current = { id: el.id, mode, startX: e.clientX, origStart: el.startTime, origEnd: el.endTime };
    dispatch({ type: 'SELECT_ELEMENT', elementId: el.id });
  }

  function onBarMove(e: React.PointerEvent, el: SlideElement) {
    if (!barDrag.current || barDrag.current.id !== el.id || !slide) return;
    const dt = (e.clientX - barDrag.current.startX) / pxPerSec;
    if (barDrag.current.mode === 'move') {
      const len = barDrag.current.origEnd - barDrag.current.origStart;
      const ns = snap(Math.max(0, Math.min(duration - len, barDrag.current.origStart + dt)));
      dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: el.id, patch: { startTime: ns, endTime: ns + len } });
    } else if (barDrag.current.mode === 'left') {
      const ns = snap(Math.max(0, Math.min(barDrag.current.origEnd - SNAP, barDrag.current.origStart + dt)));
      dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: el.id, patch: { startTime: ns } });
    } else {
      const ne = snap(Math.max(barDrag.current.origStart + SNAP, Math.min(duration, barDrag.current.origEnd + dt)));
      dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: el.id, patch: { endTime: ne } });
    }
  }

  if (!slide) {
    return (
      <div className="flex items-center justify-center shrink-0 text-slate-400 text-xs"
        style={{ height: 140, background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        Select a slide to see its timeline
      </div>
    );
  }

  const elements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
  const totalH = RULER_H + elements.length * ROW_H + 4;

  const step = duration <= 10 ? 1 : duration <= 30 ? 2 : 5;
  const marks: number[] = [];
  for (let t = 0; t <= duration; t += step) marks.push(t);

  const LABELS: Record<string, string> = { text: 'Text', image: 'Image', video: 'Video', audio: 'Audio', quiz: 'Quiz', embed: 'Embed', assignment: 'Assignment' };

  return (
    <div className="flex flex-col shrink-0" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 shrink-0" style={{ height: 36, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => { dispatch({ type: 'SCRUB', time: 0 }); dispatch({ type: 'PAUSE' }); }}
          className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <SkipBack size={12} />
        </button>
        <button onClick={() => playing ? dispatch({ type: 'PAUSE' }) : dispatch({ type: 'PLAY' })}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium text-white transition-colors"
          style={{ background: playing ? '#7c3aed' : '#4f46e5' }}>
          {playing ? <Pause size={11} /> : <Play size={11} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="text-[11px] tabular-nums text-slate-500">{fmt(playhead)} / {fmt(duration)}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400">snap {SNAP}s</span>
      </div>

      {/* SVG */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden" style={{ maxHeight: 120 }}>
        <svg ref={svgRef} width={LEFT_W + width} height={totalH} className="select-none block">
          {/* Track backgrounds */}
          {elements.map((el, i) => (
            <rect key={el.id + 'bg'} x={LEFT_W} y={RULER_H + i * ROW_H} width={width} height={ROW_H}
              fill={i % 2 === 0 ? '#f1f5f9' : '#f8fafc'} />
          ))}

          {/* Ruler */}
          <rect x={LEFT_W} y={0} width={width} height={RULER_H} fill="#f1f5f9" />
          {marks.map((t) => (
            <g key={t}>
              <line x1={timeToX(t)} y1={RULER_H - 4} x2={timeToX(t)} y2={RULER_H} stroke="#4f46e5" strokeWidth={1} opacity={0.4} />
              <text x={timeToX(t) + 2} y={RULER_H - 5} fontSize={8} fill="#94a3b8" fontFamily="monospace">{t}s</text>
            </g>
          ))}

          {/* Label column */}
          {elements.map((el, i) => {
            const y = RULER_H + i * ROW_H;
            const active = state.selectedElementId === el.id;
            return (
              <g key={el.id + 'lbl'}>
                <rect x={0} y={y} width={LEFT_W} height={ROW_H} fill={active ? '#eef2ff' : '#f8fafc'} />
                <text x={10} y={y + ROW_H / 2 + 3.5} fontSize={10} fill={active ? '#4f46e5' : '#94a3b8'} fontFamily="system-ui,sans-serif">
                  {LABELS[el.type] ?? el.type} {i + 1}
                </text>
                <line x1={0} y1={y + ROW_H} x2={LEFT_W + width} y2={y + ROW_H} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
              </g>
            );
          })}

          {/* Element bars */}
          {elements.map((el, i) => {
            const y = RULER_H + i * ROW_H;
            const bx = timeToX(el.startTime);
            const bw = Math.max(6, (el.endTime - el.startTime) * pxPerSec);
            const active = state.selectedElementId === el.id;
            const color = TYPE_COLOR[el.type] ?? '#6366f1';
            const opacity = active ? 0.85 : 0.5;
            return (
              <g key={el.id + 'bar'}>
                <rect x={bx} y={y + 5} width={bw} height={ROW_H - 10} rx={3}
                  fill={color} fillOpacity={opacity} style={{ cursor: 'move' }}
                  onPointerDown={(e) => onBarDown(e, el, 'move')}
                  onPointerMove={(e) => onBarMove(e, el)}
                  onPointerUp={() => { barDrag.current = null; }} />
                <rect x={bx} y={y + 5} width={5} height={ROW_H - 10} rx={2}
                  fill={color} fillOpacity={Math.min(1, opacity + 0.2)} style={{ cursor: 'ew-resize' }}
                  onPointerDown={(e) => onBarDown(e, el, 'left')}
                  onPointerMove={(e) => onBarMove(e, el)}
                  onPointerUp={() => { barDrag.current = null; }} />
                <rect x={bx + bw - 5} y={y + 5} width={5} height={ROW_H - 10} rx={2}
                  fill={color} fillOpacity={Math.min(1, opacity + 0.2)} style={{ cursor: 'ew-resize' }}
                  onPointerDown={(e) => onBarDown(e, el, 'right')}
                  onPointerMove={(e) => onBarMove(e, el)}
                  onPointerUp={() => { barDrag.current = null; }} />
              </g>
            );
          })}

          {/* Playhead */}
          <line x1={timeToX(playhead)} y1={0} x2={timeToX(playhead)} y2={totalH} stroke="#ef4444" strokeWidth={1} opacity={0.7} />
          <rect x={timeToX(playhead) - 5} y={0} width={10} height={RULER_H}
            fill="#ef4444" fillOpacity={0.9} rx={2} style={{ cursor: 'ew-resize' }}
            onMouseDown={onPhDown} />
        </svg>
      </div>
    </div>
  );
}
