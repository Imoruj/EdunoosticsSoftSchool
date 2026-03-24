'use client';

import React, { useRef, useState } from 'react';
import { Mic, Upload, Sparkles, Loader2, Play, Pause, Trash2, Square } from 'lucide-react';
import type { Lesson, LessonSlide } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';

interface SlidePropertiesProps {
  slide: LessonSlide;
  dispatch: React.Dispatch<StudioAction>;
  lesson?: Lesson;
}

const TRANSITIONS = ['none', 'fade', 'slide-left', 'slide-right'] as const;
const VOICES = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck'] as const;

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractSlideText(slide: LessonSlide): string {
  return slide.elements
    .filter((el) => el.type === 'text')
    .map((el) => stripHtml((el.data as any)?.content ?? ''))
    .filter(Boolean)
    .join('. ');
}

export function SlideProperties({ slide, dispatch, lesson }: SlidePropertiesProps) {
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

      {/* ── Narration ──────────────────────────────────────────────────────── */}
      <NarrationSection key={slide.id} slide={slide} update={update} lesson={lesson} />

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

// ── Narration Section ──────────────────────────────────────────────────────────

function NarrationSection({ slide, update, lesson }: {
  slide: LessonSlide;
  update: (p: Partial<LessonSlide>) => void;
  lesson?: Lesson;
}) {
  const [enabled, setEnabled] = useState(!!slide.narrationUrl);
  const [tab, setTab] = useState<'upload' | 'record' | 'ai'>('ai');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [voice, setVoice] = useState<typeof VOICES[number]>('Kore');
  // preview = audio ready to listen before committing to slide
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  // committed = audio already saved on slide.narrationUrl
  const [playing, setPlaying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function toggle(on: boolean) {
    setEnabled(on);
    if (!on) {
      update({ narrationUrl: undefined });
      setPreviewUrl(null);
      setError('');
    }
  }

  // ── Upload from device ──────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'lesson_audio');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Upload failed');
      const { fileUrl } = await res.json();
      setPreviewUrl(fileUrl); // preview first; user must click "Add to Slide"
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── Record from microphone ─────────────────────────────────────────────────
  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'narration.webm', { type: 'audio/webm' });
        await handleFileUpload(file);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e: any) {
      setError('Microphone access denied. Allow microphone in browser settings and reload.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  // ── AI generate ────────────────────────────────────────────────────────────
  async function generateNarration() {
    setError('');
    setGenerating(true);
    try {
      // Build a short overview script from lesson metadata (title + description).
      // Fall back to slide text only if no lesson data is available.
      let script = '';
      if (lesson?.title) {
        script = lesson.title;
        if (lesson.description) script += '. ' + lesson.description;
        if (lesson.sowObjectives) script += '. Objectives: ' + lesson.sowObjectives.slice(0, 200);
      } else {
        script = extractSlideText(slide);
      }
      if (!script.trim()) throw new Error('No content found to generate narration');
      const res = await fetch('/api/lessons/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: script.slice(0, 1000), voiceName: voice }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Generation failed');
      const data = await res.json();
      const audioUrl = data.url ?? data.audioUrl;
      if (!audioUrl) throw new Error('No audio URL returned');
      setPreviewUrl(audioUrl); // preview first; user must click "Add to Slide"
    } catch (e: any) {
      setError(e.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // ── Preview player controls ─────────────────────────────────────────────────
  function togglePreviewPlay() {
    if (!previewAudioRef.current) return;
    if (previewPlaying) { previewAudioRef.current.pause(); setPreviewPlaying(false); }
    else { previewAudioRef.current.play(); setPreviewPlaying(true); }
  }

  function commitPreview() {
    if (!previewUrl) return;
    update({ narrationUrl: previewUrl });
    setPreviewUrl(null);
    setPreviewPlaying(false);
  }

  function discardPreview() {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); }
    setPreviewUrl(null);
    setPreviewPlaying(false);
  }

  // ── Committed narration controls ────────────────────────────────────────────
  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">Narration</p>

      {/* Toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer mb-3">
        <div
          onClick={() => toggle(!enabled)}
          className="relative w-8 h-4 rounded-full transition-colors cursor-pointer"
          style={{ background: enabled ? '#4f46e5' : '#cbd5e1' }}
        >
          <div className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all"
            style={{ left: enabled ? '17px' : '2px' }} />
        </div>
        <span className="text-[11px] text-slate-600">{enabled ? 'Narration on' : 'Add narration'}</span>
      </label>

      {enabled && (
        <div className="space-y-2.5">

          {/* ── When preview is ready: replace tab UI with player ── */}
          {previewUrl ? (
            <>
              <audio ref={previewAudioRef} src={previewUrl} onEnded={() => setPreviewPlaying(false)} className="hidden" />
              <p className="text-[10px] text-slate-400 text-center">Audio ready — preview before adding</p>
              {/* Big play button */}
              <button
                onClick={togglePreviewPlay}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-[12px] transition-colors"
                style={{ background: '#7c3aed', color: '#ffffff' }}
              >
                {previewPlaying ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play Preview</>}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={discardPreview}
                  className="flex-1 py-2 rounded-lg text-[11px] font-medium border transition-colors"
                  style={{ color: '#64748b', borderColor: '#e2e8f0', background: '#f8fafc' }}
                >
                  Discard
                </button>
                <button
                  onClick={commitPreview}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-colors"
                  style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                >
                  Add to Slide ✓
                </button>
              </div>
            </>
          ) : slide.narrationUrl ? (
            /* ── Narration already on slide: show only the compact player ── */
            <>
              <audio ref={audioRef} src={slide.narrationUrl} onEnded={() => setPlaying(false)} className="hidden" />
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <button onClick={togglePlay}
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: '#16a34a', color: '#ffffff' }}>
                  {playing ? <Pause size={10} /> : <Play size={10} />}
                </button>
                <span className="text-[10px] text-green-700 flex-1 truncate">Narration added ✓</span>
                <button onClick={() => { update({ narrationUrl: undefined }); setPlaying(false); }}
                  className="text-green-500 hover:text-red-500 transition-colors" title="Remove narration">
                  <Trash2 size={10} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#f1f5f9' }}>
                {([
                  { id: 'upload', label: 'Upload', icon: <Upload size={9} /> },
                  { id: 'record', label: 'Record', icon: <Mic size={9} /> },
                  { id: 'ai',     label: 'AI',     icon: <Sparkles size={9} /> },
                ] as const).map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors"
                    style={{
                      background: tab === id ? '#ffffff' : 'transparent',
                      color: tab === id ? '#4f46e5' : '#64748b',
                      boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* Upload tab */}
              {tab === 'upload' && (
                <div className="space-y-2">
                  <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-60"
                    style={{ color: '#0891b2', borderColor: '#bae6fd', background: '#f0f9ff' }}
                  >
                    {uploading ? <><Loader2 size={11} className="animate-spin" /> Uploading…</> : <><Upload size={11} /> Choose audio file</>}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">MP3, WAV, OGG, M4A, AAC</p>
                </div>
              )}

              {/* Record tab */}
              {tab === 'record' && (
                <div className="space-y-2">
                  {!recording ? (
                    <button onClick={startRecording} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors"
                      style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fff1f2' }}>
                      <Mic size={11} /> Start Recording
                    </button>
                  ) : (
                    <button onClick={stopRecording}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold border animate-pulse"
                      style={{ color: '#dc2626', borderColor: '#dc2626', background: '#fff1f2' }}>
                      <Square size={11} /> Stop & Save
                    </button>
                  )}
                  {uploading && (
                    <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Saving recording…
                    </p>
                  )}
                </div>
              )}

              {/* AI Generate tab */}
              {tab === 'ai' && (
                <div className="space-y-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Voice</span>
                    <select value={voice} onChange={(e) => setVoice(e.target.value as typeof VOICES[number])}
                      className="w-full px-2 py-1.5 rounded text-[11px] text-slate-700 border outline-none focus:border-indigo-400"
                      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                      {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Generates a short lesson overview narration from the lesson title and description.
                  </p>
                  <button onClick={generateNarration} disabled={generating}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-60"
                    style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#faf5ff' }}>
                    {generating ? <><Loader2 size={11} className="animate-spin" /> Generating…</> : <><Sparkles size={11} /> Generate Narration</>}
                  </button>
                </div>
              )}

              {error && <p className="text-[10px] text-red-500 px-1">{error}</p>}
            </>
          )}
        </div>
      )}
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
