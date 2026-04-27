'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Pause, Pencil, Play, SkipBack, Unlock } from 'lucide-react';
import type { LessonSlide, SlideElement } from '@/lib/db/types';
import type { StudioAction, StudioState } from './useStudioState';

interface TimelineProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  activeSlide: LessonSlide | null;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (height: number) => void;
}

type TimelineRow =
  | { kind: 'element'; id: string; element: SlideElement; index: number }
  | { kind: 'narration'; id: string };

type BarDrag = {
  id: string;
  mode: 'move' | 'left' | 'right';
  startX: number;
  origStart: number;
  origEnd: number;
};

type ResizeDrag = {
  startX: number;
  startY: number;
  startWidth?: number;
  startHeight?: number;
};

const ROW_H = 34;
const RULER_H = 32;
const DEFAULT_LABEL_W = 176;
const MIN_LABEL_W = 136;
const MAX_LABEL_W = 280;
const DEFAULT_TIMELINE_H = 224;
const MIN_TIMELINE_H = 148;
const MAX_TIMELINE_H = 420;
const SNAP = 0.25;
const PX_PER_SECOND = 92;
const MIN_TRACK_W = 720;
const PLAYHEAD_HIT_W = 16;
const PLAYBACK_STORE_SYNC_MS = 90;

const TYPE_COLOR: Record<string, string> = {
  text: '#6366f1',
  image: '#0891b2',
  video: '#8b5cf6',
  audio: '#059669',
  quiz: '#d97706',
  embed: '#64748b',
  assignment: '#ea580c',
  file: '#475569',
  adapt: '#0f766e',
};

const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  quiz: 'Quiz',
  embed: 'Embed',
  assignment: 'Assignment',
  file: 'File',
  adapt: 'Adapt',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number) {
  return Math.round(value / SNAP) * SNAP;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toFixed(1).padStart(4, '0')}`;
}

function getMarks(duration: number) {
  const step = duration <= 10 ? 1 : duration <= 30 ? 2 : duration <= 90 ? 5 : 10;
  const marks: number[] = [];
  for (let t = 0; t <= duration; t += step) marks.push(t);
  if (marks[marks.length - 1] !== duration) marks.push(duration);
  return marks;
}

function getDefaultElementLabel(element: SlideElement, index: number) {
  return `${TYPE_LABEL[element.type] ?? element.type} ${index + 1}`;
}

function getElementLabel(element: SlideElement, index: number) {
  return element.name?.trim() || getDefaultElementLabel(element, index);
}

export function Timeline({
  state,
  dispatch,
  activeSlide,
  height = DEFAULT_TIMELINE_H,
  minHeight = MIN_TIMELINE_H,
  maxHeight = MAX_TIMELINE_H,
  onHeightChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const playheadLineRef = useRef<HTMLDivElement>(null);
  const playheadHandleRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastStoreSyncRef = useRef(0);
  const barDrag = useRef<BarDrag | null>(null);
  const labelResizeDrag = useRef<ResizeDrag | null>(null);
  const heightResizeDrag = useRef<ResizeDrag | null>(null);
  const playheadDragging = useRef(false);
  const [availableTrackWidth, setAvailableTrackWidth] = useState(MIN_TRACK_W);
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_W);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackNameDraft, setTrackNameDraft] = useState('');

  const slide = activeSlide;
  const rawDuration = Number(slide?.duration ?? 10);
  const duration = Math.max(1, rawDuration || 10);
  const playhead = clamp(state.playhead, 0, duration);
  const playing = state.playing;

  const elements = useMemo(
    () => [...(slide?.elements ?? [])].sort((a, b) => a.zIndex - b.zIndex),
    [slide?.elements],
  );

  const rows = useMemo<TimelineRow[]>(() => {
    const elementRows = elements.map<TimelineRow>((element, index) => ({
      kind: 'element',
      id: element.id,
      element,
      index,
    }));
    return slide?.narrationUrl
      ? [...elementRows, { kind: 'narration', id: 'narration' }]
      : elementRows;
  }, [elements, slide?.narrationUrl]);

  const trackWidth = Math.max(MIN_TRACK_W, availableTrackWidth, duration * PX_PER_SECOND);
  const pxPerSecond = trackWidth / duration;
  const marks = useMemo(() => getMarks(duration), [duration]);
  const trackContentHeight = RULER_H + rows.length * ROW_H;

  const timeToX = useCallback((time: number) => clamp(time, 0, duration) * pxPerSecond, [duration, pxPerSecond]);

  const setVisualPlayhead = useCallback((time: number) => {
    const x = timeToX(time);
    if (playheadLineRef.current) {
      playheadLineRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    if (playheadHandleRef.current) {
      playheadHandleRef.current.style.transform = `translate3d(${x - PLAYHEAD_HIT_W / 2}px, 0, 0)`;
    }
  }, [timeToX]);

  const xToTime = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return snap(clamp((clientX - rect.left) / pxPerSecond, 0, duration));
  }, [duration, pxPerSecond]);

  const scrubToClientX = useCallback((clientX: number) => {
    const nextTime = xToTime(clientX);
    playheadRef.current = nextTime;
    setVisualPlayhead(nextTime);
    dispatch({ type: 'PAUSE' });
    dispatch({ type: 'SCRUB', time: nextTime });
  }, [dispatch, setVisualPlayhead, xToTime]);

  useEffect(() => {
    if (playing) {
      playheadRef.current = Math.max(playheadRef.current, playhead);
      return;
    }

    playheadRef.current = playhead;
    setVisualPlayhead(playhead);
  }, [playhead, playing, setVisualPlayhead]);

  useEffect(() => {
    if (state.playhead > duration) {
      dispatch({ type: 'SCRUB', time: duration });
    }
  }, [dispatch, duration, state.playhead]);

  useEffect(() => {
    const track = trackRef.current?.parentElement;
    if (!track) return;

    const observer = new ResizeObserver(([entry]) => {
      setAvailableTrackWidth(Math.max(MIN_TRACK_W, Math.floor(entry.contentRect.width)));
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;

    let last = performance.now();
    lastStoreSyncRef.current = last;
    const tick = (now: number) => {
      const nextTime = Math.min(playheadRef.current + (now - last) / 1000, duration);
      last = now;
      playheadRef.current = nextTime;
      setVisualPlayhead(nextTime);

      const shouldSyncStore = now - lastStoreSyncRef.current >= PLAYBACK_STORE_SYNC_MS || nextTime >= duration;
      if (shouldSyncStore) {
        lastStoreSyncRef.current = now;
        dispatch({ type: 'SCRUB', time: nextTime });
      }

      if (nextTime >= duration) {
        dispatch({ type: 'PAUSE' });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dispatch, duration, playing, setVisualPlayhead]);

  function startPlayheadDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    playheadDragging.current = true;
    scrubToClientX(event.clientX);
  }

  function movePlayhead(event: React.PointerEvent<HTMLDivElement>) {
    if (!playheadDragging.current) return;
    scrubToClientX(event.clientX);
  }

  function stopPlayheadDrag(event: React.PointerEvent<HTMLDivElement>) {
    playheadDragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function beginRenameTrack(element: SlideElement, index: number) {
    setEditingTrackId(element.id);
    setTrackNameDraft(getElementLabel(element, index));
  }

  function commitRenameTrack(element: SlideElement) {
    if (!slide) return;
    const nextName = trackNameDraft.trim();
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId: slide.id,
      elementId: element.id,
      patch: { name: nextName || undefined },
    });
    setEditingTrackId(null);
  }

  function cancelRenameTrack() {
    setEditingTrackId(null);
    setTrackNameDraft('');
  }

  function toggleTrackLock(element: SlideElement) {
    if (!slide) return;
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId: slide.id,
      elementId: element.id,
      patch: { locked: !element.locked },
    });
  }

  function startLabelResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    labelResizeDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: labelWidth,
    };
  }

  function moveLabelResize(event: React.PointerEvent<HTMLDivElement>) {
    const drag = labelResizeDrag.current;
    if (!drag?.startWidth) return;
    setLabelWidth(clamp(drag.startWidth + event.clientX - drag.startX, MIN_LABEL_W, MAX_LABEL_W));
  }

  function stopLabelResize(event: React.PointerEvent<HTMLDivElement>) {
    labelResizeDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function startHeightResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!onHeightChange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    heightResizeDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      startHeight: height,
    };
  }

  function moveHeightResize(event: React.PointerEvent<HTMLDivElement>) {
    const drag = heightResizeDrag.current;
    if (!drag?.startHeight || !onHeightChange) return;
    onHeightChange(clamp(drag.startHeight + drag.startY - event.clientY, minHeight, maxHeight));
  }

  function stopHeightResize(event: React.PointerEvent<HTMLDivElement>) {
    heightResizeDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function startBarDrag(event: React.PointerEvent<HTMLDivElement>, element: SlideElement, mode: BarDrag['mode']) {
    if (!slide) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch({ type: 'SELECT_ELEMENT', elementId: element.id });
    if (element.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    barDrag.current = {
      id: element.id,
      mode,
      startX: event.clientX,
      origStart: element.startTime,
      origEnd: element.endTime,
    };
  }

  function moveBar(event: React.PointerEvent<HTMLDivElement>, element: SlideElement) {
    if (!slide || element.locked || !barDrag.current || barDrag.current.id !== element.id) return;

    const drag = barDrag.current;
    const deltaTime = (event.clientX - drag.startX) / pxPerSecond;

    if (drag.mode === 'move') {
      const length = Math.max(SNAP, drag.origEnd - drag.origStart);
      const nextStart = snap(clamp(drag.origStart + deltaTime, 0, duration - length));
      dispatch({
        type: 'UPDATE_ELEMENT',
        slideId: slide.id,
        elementId: element.id,
        patch: { startTime: nextStart, endTime: nextStart + length },
      });
      return;
    }

    if (drag.mode === 'left') {
      const nextStart = snap(clamp(drag.origStart + deltaTime, 0, drag.origEnd - SNAP));
      dispatch({
        type: 'UPDATE_ELEMENT',
        slideId: slide.id,
        elementId: element.id,
        patch: { startTime: nextStart },
      });
      return;
    }

    const nextEnd = snap(clamp(drag.origEnd + deltaTime, drag.origStart + SNAP, duration));
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId: slide.id,
      elementId: element.id,
      patch: { endTime: nextEnd },
    });
  }

  function stopBarDrag(event: React.PointerEvent<HTMLDivElement>) {
    barDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!slide) {
    return (
      <div
        className="flex shrink-0 items-center justify-center border-t border-slate-200 bg-slate-50 text-xs text-slate-400"
        style={{ height }}
      >
        Select a slide to see its timeline
      </div>
    );
  }

  return (
    <div
      className="relative flex shrink-0 flex-col border-t border-slate-200 bg-white shadow-[0_-1px_0_rgba(15,23,42,0.03)]"
      style={{ height }}
    >
      {onHeightChange && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize timeline"
          tabIndex={0}
          className="group absolute -top-1 left-0 right-0 z-40 h-2 cursor-row-resize"
          onPointerDown={startHeightResize}
          onPointerMove={moveHeightResize}
          onPointerUp={stopHeightResize}
          onPointerCancel={stopHeightResize}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            const delta = (event.shiftKey ? 32 : 16) * (event.key === 'ArrowUp' ? 1 : -1);
            onHeightChange(clamp(height + delta, minHeight, maxHeight));
          }}
        >
          <div className="mx-auto mt-0.5 h-1 w-16 rounded-full bg-slate-200 opacity-0 transition group-hover:opacity-100 group-active:bg-indigo-500 group-active:opacity-100" />
        </div>
      )}

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
        <button
          type="button"
          aria-label="Restart slide"
          onClick={() => {
            playheadRef.current = 0;
            setVisualPlayhead(0);
            dispatch({ type: 'SCRUB', time: 0 });
            dispatch({ type: 'PAUSE' });
          }}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <SkipBack size={15} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (playing) {
              dispatch({ type: 'SCRUB', time: playheadRef.current });
              dispatch({ type: 'PAUSE' });
              return;
            }

            dispatch({ type: 'PLAY' });
          }}
          className="inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? 'Pause' : 'Play'}
        </button>

        <span className="min-w-28 text-sm tabular-nums text-slate-600">
          {formatTime(playhead)} / {formatTime(duration)}
        </span>

        <div className="ml-auto text-xs text-slate-400">snap {SNAP}s</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-0">
          <div className="relative shrink-0 border-r border-slate-200 bg-slate-50" style={{ width: labelWidth }}>
            <div className="flex items-center px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400" style={{ height: RULER_H }}>
              Layers
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize timeline layer labels"
              tabIndex={0}
              className="group absolute right-0 top-0 z-30 h-full w-2 translate-x-1/2 cursor-col-resize"
              onPointerDown={startLabelResize}
              onPointerMove={moveLabelResize}
              onPointerUp={stopLabelResize}
              onPointerCancel={stopLabelResize}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const delta = (event.shiftKey ? 24 : 12) * (event.key === 'ArrowRight' ? 1 : -1);
                setLabelWidth((width) => clamp(width + delta, MIN_LABEL_W, MAX_LABEL_W));
              }}
            >
              <div className="mx-auto h-full w-px bg-transparent transition group-hover:bg-indigo-400 group-active:bg-indigo-500" />
            </div>
            {rows.map((row) => {
              const active = row.kind === 'element' && state.selectedElementId === row.element.id;
              return (
                <div
                  key={`${row.id}-label`}
                  className={`flex w-full items-center gap-1.5 border-t px-2 text-left text-xs transition ${
                    active
                      ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                  style={{ height: ROW_H }}
                >
                  {row.kind === 'element' ? (
                    <>
                      <button
                        type="button"
                        aria-label={row.element.locked ? 'Unlock track' : 'Lock track'}
                        title={row.element.locked ? 'Unlock track' : 'Lock track'}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleTrackLock(row.element);
                        }}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
                          row.element.locked
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {row.element.locked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>

                      {editingTrackId === row.element.id ? (
                        <input
                          autoFocus
                          value={trackNameDraft}
                          onChange={(event) => setTrackNameDraft(event.target.value)}
                          onBlur={() => commitRenameTrack(row.element)}
                          onFocus={(event) => event.currentTarget.select()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitRenameTrack(row.element);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelRenameTrack();
                            }
                          }}
                          className="min-w-0 flex-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none ring-2 ring-indigo-100"
                        />
                      ) : (
                        <button
                          type="button"
                          title="Select track. Double-click to rename."
                          onClick={() => dispatch({ type: 'SELECT_ELEMENT', elementId: row.element.id })}
                          onDoubleClick={() => beginRenameTrack(row.element, row.index)}
                          className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left hover:bg-white/70"
                        >
                          {getElementLabel(row.element, row.index)}
                        </button>
                      )}

                      <button
                        type="button"
                        aria-label="Rename track"
                        title="Rename track"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginRenameTrack(row.element, row.index);
                        }}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={12} />
                      </button>

                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: TYPE_COLOR[row.element.type] ?? TYPE_COLOR.text }}
                      />
                    </>
                  ) : (
                    <span className="truncate px-2 text-slate-500">Narration</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto bg-slate-50">
            <div ref={trackRef} className="relative" style={{ width: trackWidth, height: trackContentHeight }}>
              <div
                className="relative border-b border-slate-200 bg-slate-50"
                style={{ height: RULER_H }}
                onPointerDown={(event) => scrubToClientX(event.clientX)}
              >
                {marks.map((time) => {
                  const left = timeToX(time);
                  return (
                    <div key={time} className="absolute top-0 h-full" style={{ left }}>
                      <div className="absolute bottom-0 h-2 border-l border-indigo-300" />
                      <span className="absolute bottom-2 translate-x-1 font-mono text-[10px] text-slate-400">
                        {time}s
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="relative">
                {rows.map((row, rowIndex) => {
                  const top = rowIndex * ROW_H;
                  if (row.kind === 'narration') {
                    return (
                      <div
                        key={row.id}
                        className="absolute left-0 right-0 border-b border-slate-200 bg-emerald-50/70"
                        style={{ top, height: ROW_H }}
                        onPointerDown={(event) => scrubToClientX(event.clientX)}
                      >
                        <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded bg-emerald-500/35" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-emerald-800">
                          audio narration
                        </span>
                      </div>
                    );
                  }

                  const element = row.element;
                  const active = state.selectedElementId === element.id;
                  const color = TYPE_COLOR[element.type] ?? TYPE_COLOR.text;
                  const start = clamp(element.startTime, 0, duration);
                  const end = clamp(Math.max(element.endTime, start + SNAP), start + SNAP, duration);
                  const left = timeToX(start);
                  const width = Math.max(18, (end - start) * pxPerSecond);
                  const locked = !!element.locked;

                  return (
                    <div
                      key={row.id}
                      className={`absolute left-0 right-0 border-b ${
                        active ? 'border-indigo-100 bg-indigo-50/70' : rowIndex % 2 === 0 ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
                      }`}
                      style={{ top, height: ROW_H }}
                      onPointerDown={(event) => scrubToClientX(event.clientX)}
                    >
                      <div
                        className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm ring-1 ring-black/5"
                        style={{
                          left,
                          width,
                          backgroundColor: color,
                          opacity: locked ? 0.38 : active ? 0.95 : 0.58,
                          cursor: locked ? 'not-allowed' : 'grab',
                          filter: locked ? 'saturate(0.65)' : undefined,
                        }}
                        title={`${getElementLabel(element, row.index)}: ${formatTime(start)} - ${formatTime(end)}${locked ? ' (locked)' : ''}`}
                        onPointerDown={(event) => startBarDrag(event, element, 'move')}
                        onPointerMove={(event) => moveBar(event, element)}
                        onPointerUp={stopBarDrag}
                        onPointerCancel={stopBarDrag}
                      >
                        <div
                          className={`absolute left-0 top-0 h-full w-2 rounded-l-md bg-white/30 ${locked ? 'cursor-not-allowed' : 'cursor-ew-resize'}`}
                          onPointerDown={(event) => startBarDrag(event, element, 'left')}
                          onPointerMove={(event) => moveBar(event, element)}
                          onPointerUp={stopBarDrag}
                          onPointerCancel={stopBarDrag}
                        />
                        <div
                          className={`absolute right-0 top-0 h-full w-2 rounded-r-md bg-white/30 ${locked ? 'cursor-not-allowed' : 'cursor-ew-resize'}`}
                          onPointerDown={(event) => startBarDrag(event, element, 'right')}
                          onPointerMove={(event) => moveBar(event, element)}
                          onPointerUp={stopBarDrag}
                          onPointerCancel={stopBarDrag}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {marks.map((time) => (
                <div
                  key={`${time}-grid`}
                  className="pointer-events-none absolute top-0 border-l border-dashed border-indigo-100"
                  style={{ left: timeToX(time), height: trackContentHeight }}
                />
              ))}

              <div
                ref={playheadLineRef}
                className="absolute top-0 z-20 h-full w-px bg-red-500"
                style={{
                  left: 0,
                  transform: `translate3d(${timeToX(playhead)}px, 0, 0)`,
                  willChange: 'transform',
                }}
              />
              <div
                ref={playheadHandleRef}
                className="absolute top-0 z-30 h-full w-4 cursor-ew-resize"
                style={{
                  left: 0,
                  transform: `translate3d(${timeToX(playhead) - PLAYHEAD_HIT_W / 2}px, 0, 0)`,
                  willChange: 'transform',
                }}
                onPointerDown={startPlayheadDrag}
                onPointerMove={movePlayhead}
                onPointerUp={stopPlayheadDrag}
                onPointerCancel={stopPlayheadDrag}
              >
                <div className="mx-auto h-7 w-3 rounded-b bg-red-500 shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
