'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import type { Lesson, LessonSlide, SlideElement } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';
import { ModalShell } from './TextEditorModal';
import { showAppAlert } from '@/lib/appMessageBox';

interface TextGeneratorModalProps {
  lesson: Lesson;
  slide: LessonSlide | null;
  dispatch: React.Dispatch<StudioAction>;
  onClose: () => void;
}

type GeneratorField = 'description' | 'priorKnowledge';
type OutputFormat = 'outline' | 'prose';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(text: string, outputFormat: OutputFormat) {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const isBulletList =
    outputFormat === 'outline' ||
    (lines.length > 1 && lines.every((line) => /^[-•*]\s*/.test(line)));

  if (isBulletList) {
    const items = lines
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join('');

    return `<ul style="margin:0;padding-left:1.2em;line-height:1.7">${items}</ul>`;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 0.85em;line-height:1.7">${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function createTextElement(slide: LessonSlide, html: string): SlideElement {
  const count = slide.elements.length;
  const offset = (count % 5) * 2;

  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'text',
    data: { content: html, format: 'html' },
    x: 10 + offset,
    y: 10 + offset,
    width: 44,
    height: 30,
    zIndex: count + 1,
    startTime: 0,
    endTime: slide.duration ?? 10,
    animateIn: 'fade',
    animateInDuration: 350,
    opacity: 1,
  };
}

function ChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-3 py-2 text-sm transition-colors"
      style={{
        color: active ? '#ffffff' : '#cbd5e1',
        borderColor: active ? '#6366f1' : 'rgba(255,255,255,0.08)',
        background: active ? '#4f46e5' : 'rgba(255,255,255,0.03)',
      }}
    >
      {label}
    </button>
  );
}

export function TextGeneratorModal({
  lesson,
  slide,
  dispatch,
  onClose,
}: TextGeneratorModalProps) {
  const [field, setField] = useState<GeneratorField>('description');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('outline');
  const [instructions, setInstructions] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const previewHtml = useMemo(
    () => textToHtml(generatedText, outputFormat),
    [generatedText, outputFormat]
  );

  async function generateText() {
    if (!lesson.title.trim()) {
      await showAppAlert('Give the lesson a title first so AI has enough context.', {
        title: 'Missing Information',
        variant: 'warning',
      });
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/lessons/generate-pre-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          outputFormat,
          subjectId: lesson.subjectId || undefined,
          lessonTitle: lesson.title,
          weekContent: lesson.sowLessonContent,
          generalObjectives: lesson.sowObjectives,
          referenceMaterials: lesson.referenceMaterials ?? [],
          customInstructions: instructions.trim() || undefined,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate text.');
      }

      setGeneratedText((payload.text || '').trim());
    } catch (err: any) {
      setError(err.message || 'Failed to generate text.');
    } finally {
      setGenerating(false);
    }
  }

  function insertGeneratedText() {
    if (!slide || !generatedText.trim()) return;
    const element = createTextElement(slide, previewHtml);
    dispatch({ type: 'ADD_ELEMENT', slideId: slide.id, element });
    onClose();
  }

  return (
    <ModalShell title="Generate Text with AI" onClose={onClose} wide>
      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Generation Type</p>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={field === 'description'}
                  label="Lesson Points"
                  onClick={() => setField('description')}
                />
                <ChoiceButton
                  active={field === 'priorKnowledge'}
                  label="Prior Knowledge"
                  onClick={() => setField('priorKnowledge')}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Output Style</p>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={outputFormat === 'outline'}
                  label="Bullet List"
                  onClick={() => setOutputFormat('outline')}
                />
                <ChoiceButton
                  active={outputFormat === 'prose'}
                  label="Paragraph"
                  onClick={() => setOutputFormat('prose')}
                />
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Additional Instructions</span>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={6}
                placeholder="E.g. focus on scarcity, choice, and simple real-world examples."
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
              />
            </label>

            <button
              onClick={generateText}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#7c3aed' }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? 'Generating…' : 'Generate Text'}
            </button>

            {error && (
              <p className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Context</p>
            <div className="space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Lesson:</span> {lesson.title || 'Untitled Lesson'}</p>
              <p><span className="text-slate-500">Slide:</span> {slide?.title || slide?.sceneType || 'No slide selected'}</p>
              <p><span className="text-slate-500">References:</span> {lesson.referenceMaterials?.length ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Preview</p>
              <p className="text-xs text-slate-500 mt-1">Generate first, then insert into the current slide.</p>
            </div>
            <button
              onClick={insertGeneratedText}
              disabled={!slide || !generatedText.trim()}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: '#4f46e5' }}
            >
              <Plus size={14} />
              Insert
            </button>
          </div>

          <div className="flex-1 rounded-xl border border-white/10 bg-white p-5 overflow-auto">
            {generatedText.trim() ? (
              <div
                className="text-slate-800 text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Generated text will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
