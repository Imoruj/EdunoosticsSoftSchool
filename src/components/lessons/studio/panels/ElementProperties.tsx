'use client';

import React, { useState } from 'react';
import { Pencil, ExternalLink, RefreshCw, AlignLeft, AlignCenter, AlignRight, Sparkles, Loader2 } from 'lucide-react';
import type { Lesson, SlideElement, SlideAnimation } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';

interface ElementPropertiesProps {
  element: SlideElement;
  slideId: string;
  slideDuration: number;
  dispatch: React.Dispatch<StudioAction>;
  lesson?: Lesson;
}

const ANIMATIONS: SlideAnimation[] = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'bounce'];

const TYPE_COLOR: Record<string, string> = {
  text: '#6366f1', image: '#06b6d4', video: '#8b5cf6',
  audio: '#10b981', quiz: '#f59e0b', embed: '#64748b',
};

export function ElementProperties({ element, slideId, slideDuration, dispatch, lesson }: ElementPropertiesProps) {
  function patch(p: Partial<SlideElement>) {
    dispatch({ type: 'UPDATE_ELEMENT', slideId, elementId: element.id, patch: p });
  }
  function patchData(d: Record<string, unknown>) {
    patch({ data: { ...(element.data as object), ...d } });
  }

  const color = TYPE_COLOR[element.type] ?? '#6366f1';

  return (
    <div className="flex flex-col p-4 gap-5 text-xs overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize text-white" style={{ background: color }}>
          {element.type}
        </span>
      </div>

      {/* ── Content section (type-specific) ────────────────────────────────── */}
      <ContentSection element={element} patchData={patchData} dispatch={dispatch} slideId={slideId} lesson={lesson} />

      {/* ── Position & Size ──────────────────────────────────────────────────── */}
      <Section title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          {([['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']] as const).map(([label, key]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">{label} %</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={Math.round(element[key] * 10) / 10}
                onChange={(e) => patch({ [key]: Number(e.target.value) })}
                className="px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400 tabular-nums"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
          ))}
        </div>
      </Section>

      {/* ── Timeline Timing ──────────────────────────────────────────────────── */}
      <Section title="Timeline Timing">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Appears at</span>
              <span className="text-slate-700 tabular-nums">{element.startTime.toFixed(2)}s</span>
            </div>
            <input type="range" min={0} max={Math.max(0, slideDuration - 0.5)} step={0.25} value={element.startTime}
              onChange={(e) => { const v = Number(e.target.value); patch({ startTime: v, endTime: Math.max(element.endTime, v + 0.5) }); }}
              className="w-full accent-indigo-500" />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Disappears at</span>
              <span className="text-slate-700 tabular-nums">{element.endTime.toFixed(2)}s</span>
            </div>
            <input type="range" min={element.startTime + 0.5} max={slideDuration} step={0.25} value={element.endTime}
              onChange={(e) => patch({ endTime: Number(e.target.value) })}
              className="w-full accent-indigo-500" />
          </label>
        </div>
      </Section>

      {/* ── Entrance Animation ───────────────────────────────────────────────── */}
      <Section title="Entrance Animation">
        <select
          value={element.animateIn ?? 'none'}
          onChange={(e) => patch({ animateIn: e.target.value as SlideAnimation })}
          className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
        >
          {ANIMATIONS.map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}
        </select>
      </Section>

      {/* ── Style ────────────────────────────────────────────────────────────── */}
      <Section title="Style">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Opacity</span>
              <span className="text-slate-700 tabular-nums">{Math.round((element.opacity ?? 1) * 100)}%</span>
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
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Background color</span>
            <div className="flex items-center gap-2">
              <input type="color" value={element.background && element.background !== 'transparent' ? element.background : '#ffffff'}
                onChange={(e) => patch({ background: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
              <button
                onClick={() => patch({ background: 'transparent' })}
                className="flex-1 px-2 py-1.5 rounded text-[10px] text-slate-500 hover:text-slate-800 border transition-colors text-center"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
              >
                Clear (transparent)
              </button>
            </div>
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

      {/* ── Layer ────────────────────────────────────────────────────────────── */}
      <Section title="Layer">
        <div className="flex items-center gap-2">
          <button onClick={() => patch({ zIndex: element.zIndex + 1 })}
            className="flex-1 py-1.5 rounded text-[11px] text-slate-600 border transition-colors hover:bg-slate-50"
            style={{ borderColor: '#e2e8f0' }}>↑ Forward</button>
          <button onClick={() => patch({ zIndex: Math.max(1, element.zIndex - 1) })}
            className="flex-1 py-1.5 rounded text-[11px] text-slate-600 border transition-colors hover:bg-slate-50"
            style={{ borderColor: '#e2e8f0' }}>↓ Backward</button>
        </div>
        <label className="flex flex-col gap-1 mt-2">
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

// ─── Type-specific Content Sections ──────────────────────────────────────────

function ContentSection({
  element,
  patchData,
  dispatch,
  slideId,
  lesson,
}: {
  element: SlideElement;
  patchData: (d: Record<string, unknown>) => void;
  dispatch: React.Dispatch<StudioAction>;
  slideId: string;
  lesson?: Lesson;
}) {
  const data = element.data as any;
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  async function generateDescription() {
    setGenError('');
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        field: 'description',
        outputFormat: 'outline',
        lessonTitle: lesson?.title,
        weekContent: lesson?.sowLessonContent,
        generalObjectives: lesson?.sowObjectives,
        referenceMaterials: lesson?.referenceMaterials ?? [],
      };
      // If we have a sowWeekId but no references yet, fetch them first
      if (lesson?.sowWeekId && (!lesson.referenceMaterials || lesson.referenceMaterials.length === 0)) {
        try {
          const refs = await fetch(`/api/scheme-of-work/weeks/${lesson.sowWeekId}/references`).then((r) => r.json());
          body.referenceMaterials = refs.references ?? [];
        } catch { /* ignore, proceed without */ }
      }
      const res = await fetch('/api/lessons/generate-pre-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Generation failed');
      const { text } = await res.json();
      if (text) {
        // Convert "- item\n- item" → <ul><li> HTML
        const lines = text.split('\n').map((l: string) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
        const html = lines.length > 1
          ? `<ul style="margin:0;padding-left:1.2em">${lines.map((l: string) => `<li>${l}</li>`).join('')}</ul>`
          : `<p>${lines[0] ?? text}</p>`;
        patchData({ content: html });
      }
    } catch (err: any) {
      setGenError(err.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  switch (element.type) {
    case 'text': {
      // Strip HTML tags for the plain preview
      const plainPreview = (data?.content ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'No content yet';

      const FONTS = [
        { label: 'Default', value: '' },
        { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
        { label: 'Courier New', value: '"Courier New", Courier, monospace' },
        { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
        { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
        { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
      ];

      const ALIGNS: { value: 'left' | 'center' | 'right'; icon: React.ReactNode }[] = [
        { value: 'left',   icon: <AlignLeft size={11} /> },
        { value: 'center', icon: <AlignCenter size={11} /> },
        { value: 'right',  icon: <AlignRight size={11} /> },
      ];

      return (
        <>
          <Section title="Text Content">
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'text-editor', elementId: element.id } })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Pencil size={11} /> Edit Text Content
            </button>

            {/* AI Generate button — only show when SOW context is linked */}
            {lesson?.sowWeekId && (
              <button
                onClick={generateDescription}
                disabled={generating}
                className="mt-1.5 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-60"
                style={{
                  color: generating ? '#7c3aed' : '#7c3aed',
                  borderColor: '#ddd6fe',
                  background: generating ? '#f5f3ff' : '#faf5ff',
                }}
                onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = '#ede9fe'; }}
                onMouseLeave={(e) => { if (!generating) e.currentTarget.style.background = '#faf5ff'; }}
              >
                {generating
                  ? <><Loader2 size={11} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={11} /> Generate with AI (SOW)</>
                }
              </button>
            )}
            {genError && (
              <p className="mt-1 text-[10px] text-red-500 px-1">{genError}</p>
            )}

            {/* Plain-text preview — no HTML rendered */}
            <p className="mt-2 px-2.5 py-2 rounded-md text-[10px] text-slate-500 leading-relaxed line-clamp-3"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              {plainPreview}
            </p>
          </Section>

          <Section title="Text Style">
            {/* Font family + size row */}
            <div className="flex gap-2 mb-2.5">
              <label className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="text-[10px] text-slate-400">Font family</span>
                <select
                  value={data?.fontFamily ?? ''}
                  onChange={(e) => patchData({ fontFamily: e.target.value || undefined })}
                  className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                  style={{ background: '#ffffff', borderColor: '#e2e8f0', fontFamily: data?.fontFamily || 'inherit' }}
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value || 'inherit' }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 w-16 shrink-0">
                <span className="text-[10px] text-slate-400">Size px</span>
                <input
                  type="number" min={6} max={200}
                  value={data?.fontSize ?? ''}
                  onChange={(e) => patchData({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="auto"
                  className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400 tabular-nums"
                  style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                />
              </label>
            </div>

            {/* Text color */}
            <label className="flex flex-col gap-1 mb-2.5">
              <span className="text-[10px] text-slate-400">Text color (overrides all)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data?.textColor ?? '#000000'}
                  onChange={(e) => patchData({ textColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0"
                />
                <input
                  type="text"
                  value={data?.textColor ?? ''}
                  onChange={(e) => patchData({ textColor: e.target.value || undefined })}
                  placeholder="#000000"
                  className="flex-1 px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                  style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                />
                {data?.textColor && (
                  <button
                    onClick={() => patchData({ textColor: undefined })}
                    className="text-[9px] text-slate-400 hover:text-red-500 transition-colors"
                    title="Reset to original colors"
                  >✕</button>
                )}
              </div>
            </label>

            {/* Alignment */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Alignment</span>
              <div className="flex gap-1">
                {ALIGNS.map(({ value, icon }) => (
                  <button
                    key={value}
                    onClick={() => patchData({ textAlign: value })}
                    className="flex-1 flex items-center justify-center py-1.5 rounded border transition-colors"
                    style={{
                      background: (data?.textAlign ?? 'left') === value ? '#4f46e5' : '#f8fafc',
                      borderColor: (data?.textAlign ?? 'left') === value ? '#4f46e5' : '#e2e8f0',
                      color: (data?.textAlign ?? 'left') === value ? '#ffffff' : '#64748b',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </>
      );
    }

    case 'image':
      return (
        <Section title="Image">
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Image URL</span>
              <input
                type="text" value={data?.url ?? ''}
                onChange={(e) => patchData({ url: e.target.value })}
                placeholder="https://…"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Alt text</span>
              <input
                type="text" value={data?.alt ?? ''}
                onChange={(e) => patchData({ alt: e.target.value })}
                placeholder="Describe the image"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'media-picker', insertType: 'image', targetSlideId: slideId } })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-cyan-600 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors"
            >
              <RefreshCw size={10} /> Replace Image
            </button>
          </div>
        </Section>
      );

    case 'video':
      return (
        <Section title="Video">
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Video URL (YouTube / direct)</span>
              <input
                type="text" value={data?.url ?? ''}
                onChange={(e) => patchData({ url: e.target.value })}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            {data?.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700">
                <ExternalLink size={9} /> Open link
              </a>
            )}
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'media-picker', insertType: 'video', targetSlideId: slideId } })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <RefreshCw size={10} /> Replace Video
            </button>
          </div>
        </Section>
      );

    case 'audio':
      return (
        <Section title="Audio">
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Track title</span>
              <input
                type="text" value={data?.title ?? ''}
                onChange={(e) => patchData({ title: e.target.value })}
                placeholder="Audio title"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            {data?.mode === 'url' && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">Audio URL</span>
                <input
                  type="text" value={data?.url ?? ''}
                  onChange={(e) => patchData({ url: e.target.value })}
                  placeholder="https://…/audio.mp3"
                  className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                  style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                />
              </label>
            )}
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'media-picker', insertType: 'audio', targetSlideId: slideId } })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <RefreshCw size={10} /> Replace Audio
            </button>
          </div>
        </Section>
      );

    case 'quiz':
      return (
        <Section title="Quiz">
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Quiz title</span>
              <input
                type="text" value={data?.quizTitle ?? ''}
                onChange={(e) => patchData({ quizTitle: e.target.value })}
                placeholder="Quiz title"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] text-slate-500"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span>{data?.embeddedQuiz?.questions?.length ?? 0} question(s)</span>
              <span className="text-slate-400">Pass: {data?.embeddedQuiz?.passingScore ?? 60}%</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { type: 'quiz-builder', elementId: element.id } })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <Pencil size={10} /> Edit Quiz Questions
            </button>
          </div>
        </Section>
      );

    case 'embed':
      return (
        <Section title="Embed">
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Embed type</span>
              <select
                value={data?.type ?? 'generic'}
                onChange={(e) => patchData({ type: e.target.value })}
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <option value="generic">Generic iframe</option>
                <option value="youtube">YouTube</option>
                <option value="googledoc">Google Doc / Sheet</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">URL</span>
              <input
                type="text" value={data?.url ?? ''}
                onChange={(e) => patchData({ url: e.target.value })}
                placeholder="https://…"
                className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
            {data?.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700">
                <ExternalLink size={9} /> Open link
              </a>
            )}
          </div>
        </Section>
      );

    default:
      return null;
  }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">{title}</p>
      {children}
    </div>
  );
}
