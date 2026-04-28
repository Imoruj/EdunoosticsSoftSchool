'use client';

import React, { useState, useRef } from 'react';
import { Upload, Link2, HardDrive, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import type { ContentBlockType, SlideElement, ImageBlockData, VideoBlockData, AudioBlockData } from '@/lib/db/types';
import type { StudioAction, StudioState } from '../useStudioState';
import { ModalShell } from './TextEditorModal';

interface MediaPickerModalProps {
  insertType: ContentBlockType;
  targetSlideId: string;
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  onClose: () => void;
}

type Tab = 'upload' | 'url' | 'ai';

const TYPE_CONFIG: Record<string, { label: string; accept: string; tabs: Tab[] }> = {
  image: { label: 'Image', accept: 'image/*', tabs: ['upload', 'url', 'ai'] },
  video: { label: 'Video', accept: 'video/*', tabs: ['upload', 'url'] },
  audio: { label: 'Audio', accept: 'audio/*', tabs: ['upload', 'url', 'ai'] },
};

export function MediaPickerModal({ insertType, targetSlideId, state, dispatch, onClose }: MediaPickerModalProps) {
  const cfg = TYPE_CONFIG[insertType] ?? { label: insertType, accept: '*', tabs: ['upload', 'url'] };
  const [tab, setTab] = useState<Tab>(cfg.tabs[0]);
  const [url, setUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiVoice, setAiVoice] = useState('Aoede');
  const [aiScript, setAiScript] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const slide = (state.lesson.slides ?? []).find((s) => s.id === targetSlideId);
  const slideId = targetSlideId;

  function addElement(elementData: any) {
    if (!slide) return;
    const count = slide.elements.length;
    const el: SlideElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: insertType,
      data: elementData,
      x: 10 + (count % 5) * 2,
      y: 10 + (count % 5) * 2,
      width: insertType === 'image' ? 40 : insertType === 'audio' ? 70 : 55,
      height: insertType === 'image' ? 45 : insertType === 'audio' ? 12 : 38,
      zIndex: count + 1,
      startTime: 0,
      endTime: slide.duration ?? 10,
      animateIn: 'fade',
      animateInDuration: 400,
      opacity: 1,
    };
    dispatch({ type: 'ADD_ELEMENT', slideId, element: el });
    onClose();
  }

  // ── Upload handler ────────────────────────────────────────────────────────
  async function handleFileUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const file = files[0];
      const form = new FormData();
      form.append('file', file);
      form.append('type', insertType === 'image' ? 'lesson_image' : insertType === 'audio' ? 'lesson_audio' : 'lesson_file');

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const fileUrl = json.url ?? json.key ?? json.path;

      if (insertType === 'image') {
        addElement({ url: fileUrl, alt: file.name, caption: '' } as ImageBlockData);
      } else if (insertType === 'audio') {
        addElement({ mode: 'upload', url: fileUrl, title: file.name, fileName: file.name, fileType: file.type, fileSize: file.size } as AudioBlockData);
      } else {
        addElement({ url: fileUrl, type: 'generic' });
      }
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── URL insert ────────────────────────────────────────────────────────────
  function insertUrl() {
    if (!url.trim()) return;
    if (insertType === 'image') {
      addElement({ url: url.trim(), alt: '', caption: '' } as ImageBlockData);
    } else if (insertType === 'video') {
      addElement({ url: url.trim(), caption: '' } as VideoBlockData);
    } else if (insertType === 'audio') {
      addElement({ mode: 'upload', url: url.trim(), title: 'Audio' } as AudioBlockData);
    }
  }

  // ── AI Generate ───────────────────────────────────────────────────────────
  async function generateAI() {
    setGenerating(true);
    setError('');
    try {
      if (insertType === 'image') {
        const res = await fetch('/api/lessons/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: aiPrompt,
            lessonTitle: state.lesson.title,
            referenceMaterials: state.lesson.referenceMaterials ?? [],
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { url: imgUrl } = await res.json();
        addElement({ url: imgUrl, alt: aiPrompt, caption: '' } as ImageBlockData);
      } else if (insertType === 'audio') {
        const res = await fetch('/api/lessons/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: aiScript, voiceName: aiVoice }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { url: audioUrl, fileName, fileType } = await res.json();
        addElement({ mode: 'generated', url: audioUrl, title: 'AI Audio', script: aiScript, voiceName: aiVoice, fileName, fileType } as AudioBlockData);
      }
    } catch (e: any) {
      setError(e.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  const VOICES = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck'];
  const tabLabel: Record<Tab, string> = { upload: 'Upload', url: 'URL', ai: 'AI Generate' };

  return (
    <ModalShell title={`Insert ${cfg.label}`} onClose={onClose}>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0 -mt-1 shrink-0">
        {cfg.tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-xs font-medium transition-colors rounded-t"
            style={{
              color: tab === t ? '#1d4ed8' : '#64748b',
              borderBottom: tab === t ? '2px solid #4f46e5' : '2px solid transparent',
            }}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded text-xs text-red-700 bg-red-50 border border-red-200">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <input
            ref={fileRef}
            type="file"
            accept={cfg.accept}
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-3 px-12 py-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors w-full bg-slate-50"
          >
            {uploading ? (
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            ) : (
              <Upload size={32} className="text-slate-500" />
            )}
            <span className="text-sm text-slate-700">
              {uploading ? 'Uploading…' : `Click to select ${cfg.label.toLowerCase()}`}
            </span>
          </button>
        </div>
      )}

      {/* URL tab */}
      {tab === 'url' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-600">{cfg.label} URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && insertUrl()}
              placeholder={insertType === 'video' ? 'https://youtube.com/watch?v=...' : `https://...`}
              className="bg-white text-slate-900 px-3 py-2 rounded border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm"
            />
          </label>
          <button
            onClick={insertUrl}
            disabled={!url.trim()}
            className="self-end flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40 transition-colors"
            style={{ background: '#4f46e5' }}
          >
            <Link2 size={13} />
            Insert
          </button>
        </div>
      )}

      {/* AI Generate tab */}
      {tab === 'ai' && (
        <div className="flex flex-col gap-4">
          {insertType === 'image' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-600">Describe the image (Imagen 3)</span>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="A detailed educational illustration of photosynthesis in a tropical rainforest..."
                  rows={4}
                  className="bg-white text-slate-900 px-3 py-2 rounded border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm resize-none"
                />
              </label>
              <button
                onClick={generateAI}
                disabled={generating || !aiPrompt.trim()}
                className="self-end flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium disabled:opacity-40 transition-colors"
                style={{ background: '#7c3aed', color: '#fff' }}
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? 'Generating…' : 'Generate Image'}
              </button>
            </>
          )}

          {insertType === 'audio' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-600">Voice</span>
                <select
                  value={aiVoice}
                  onChange={(e) => setAiVoice(e.target.value)}
                  className="bg-white text-slate-900 px-3 py-2 rounded border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm"
                >
                  {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Script (Gemini 2.0 TTS)</span>
                <textarea
                  value={aiScript}
                  onChange={(e) => setAiScript(e.target.value)}
                  placeholder="Type the text you want to convert to speech..."
                  rows={5}
                  className="bg-white/5 text-slate-200 px-3 py-2 rounded border border-white/10 outline-none focus:border-indigo-500 text-sm resize-none"
                />
              </label>
              <button
                onClick={generateAI}
                disabled={generating || !aiScript.trim()}
                className="self-end flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium disabled:opacity-40 transition-colors"
                style={{ background: '#7c3aed', color: '#fff' }}
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? 'Generating…' : 'Generate Audio'}
              </button>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
}
