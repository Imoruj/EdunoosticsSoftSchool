'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Lesson, QuizBlockData, QuizQuestion, SlideElement } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';

type SupportedType = Extract<QuizQuestion['type'], 'multiple_choice' | 'true_false' | 'short_answer' | 'drag_drop'>;

const QTYPES: Array<{ value: SupportedType; label: string; short: string }> = [
  { value: 'multiple_choice', label: 'Multiple Choice', short: 'MC' },
  { value: 'true_false',      label: 'True / False',   short: 'T/F' },
  { value: 'short_answer',    label: 'Short Answer',   short: 'SA' },
  { value: 'drag_drop',       label: 'Drag & Drop',    short: 'DD' },
];

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultData(type: SupportedType): QuizQuestion['data'] {
  if (type === 'true_false')   return { correctAnswer: true };
  if (type === 'short_answer') return { maxLength: 160, keywords: [] };
  if (type === 'drag_drop')    return {
    items: [{ id: `item_${uid()}`, content: 'Item 1' }, { id: `item_${uid()}`, content: 'Item 2' }],
    zones: [{ id: `zone_${uid()}`, label: 'Target 1', acceptMultiple: false }, { id: `zone_${uid()}`, label: 'Target 2', acceptMultiple: false }],
    matches: [],
  };
  return { multipleCorrect: false, options: [
    { id: `opt_${uid()}`, text: 'Option A', isCorrect: true,  order: 0 },
    { id: `opt_${uid()}`, text: 'Option B', isCorrect: false, order: 1 },
    { id: `opt_${uid()}`, text: 'Option C', isCorrect: false, order: 2 },
  ]};
}

function newQuestion(order: number, type: SupportedType = 'multiple_choice'): QuizQuestion {
  return { id: `q_${uid()}`, type, order, questionText: '', points: 1, explanation: '', data: defaultData(type) };
}

interface Props {
  element: SlideElement;
  slideId: string;
  lesson: Lesson;
  dispatch: React.Dispatch<StudioAction>;
}

export function InlineQuizBuilder({ element, slideId, lesson, dispatch }: Props) {
  const raw = (element.data as QuizBlockData) ?? {};
  const [quizTitle, setQuizTitle]     = useState(raw.quizTitle ?? 'Quiz');
  const [instructions, setInstructions] = useState(raw.instructions ?? '');
  const [passingScore, setPassingScore] = useState(raw.embeddedQuiz?.passingScore ?? 60);
  const [showResults, setShowResults]   = useState(raw.embeddedQuiz?.showResults ?? true);
  const [questions, setQuestions]       = useState<QuizQuestion[]>(raw.embeddedQuiz?.questions ?? []);
  const [expandedQ, setExpandedQ]       = useState<string | null>(null);
  const [aiOpen, setAiOpen]             = useState(false);
  const [aiTopic, setAiTopic]           = useState(lesson.title ?? '');
  const [aiCount, setAiCount]           = useState(3);
  const [aiTypes, setAiTypes]           = useState<SupportedType[]>(['multiple_choice']);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState('');

  // Push changes to the studio state
  const save = useCallback((nextTitle: string, nextInstructions: string, nextPassing: number, nextShow: boolean, nextQs: QuizQuestion[]) => {
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId,
      elementId: element.id,
      patch: {
        data: {
          quizTitle: nextTitle,
          instructions: nextInstructions,
          embeddedQuiz: { questions: nextQs, passingScore: nextPassing, showResults: nextShow },
        } as QuizBlockData,
      },
    });
  }, [dispatch, slideId, element.id]);

  function commit(patch: {
    title?: string; instructions?: string; passing?: number; show?: boolean; qs?: QuizQuestion[];
  }) {
    const t  = patch.title        ?? quizTitle;
    const i  = patch.instructions ?? instructions;
    const p  = patch.passing      ?? passingScore;
    const s  = patch.show         ?? showResults;
    const qs = patch.qs           ?? questions;
    if (patch.title        !== undefined) setQuizTitle(patch.title);
    if (patch.instructions !== undefined) setInstructions(patch.instructions);
    if (patch.passing      !== undefined) setPassingScore(patch.passing);
    if (patch.show         !== undefined) setShowResults(patch.show);
    if (patch.qs           !== undefined) setQuestions(patch.qs);
    save(t, i, p, s, qs);
  }

  function addQuestion(type: SupportedType) {
    const q = newQuestion(questions.length, type);
    const next = [...questions, q];
    commit({ qs: next });
    setExpandedQ(q.id);
  }

  function removeQuestion(id: string) {
    const next = questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i }));
    commit({ qs: next });
    if (expandedQ === id) setExpandedQ(null);
  }

  function updateQuestion(id: string, updater: (q: QuizQuestion) => QuizQuestion) {
    const next = questions.map((q) => q.id === id ? updater(q) : q);
    commit({ qs: next });
  }

  function toggleAiType(type: SupportedType) {
    setAiTypes((prev) => {
      const has = prev.includes(type);
      if (has && prev.length === 1) return prev;
      return has ? prev.filter((t) => t !== type) : [...prev, type];
    });
  }

  async function generateQuestions() {
    setGenerating(true);
    setGenError('');
    try {
      const res = await fetch('/api/lessons/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim() || undefined,
          weekContent: lesson.sowLessonContent || undefined,
          objectives: lesson.sowObjectives || undefined,
          count: aiCount,
          questionTypes: aiTypes,
          avoidQuestionTexts: questions.map((q) => q.questionText).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      const next = [...questions, ...(data.questions ?? [])].map((q, i) => ({ ...q, order: i }));
      commit({ qs: next });
    } catch (e: any) {
      setGenError(e.message ?? 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-xs">

      {/* ── Quiz settings ── */}
      <div className="flex gap-2">
        <label className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Title</span>
          <input
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            onBlur={() => commit({ title: quizTitle })}
            className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          />
        </label>
        <label className="flex flex-col gap-1 w-14 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pass %</span>
          <input
            type="number" min={1} max={100}
            value={passingScore}
            onChange={(e) => { const v = Math.max(1, Math.min(100, Number(e.target.value) || 60)); setPassingScore(v); }}
            onBlur={() => commit({ passing: passingScore })}
            className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 tabular-nums"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Instructions</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={() => commit({ instructions })}
          rows={2}
          placeholder="Optional instructions for learners…"
          className="px-2 py-1.5 rounded border text-[11px] text-slate-600 outline-none focus:border-indigo-400 resize-none"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
        />
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={showResults}
          onChange={(e) => commit({ show: e.target.checked })}
          className="accent-indigo-500 w-3.5 h-3.5" />
        <span className="text-[11px] text-slate-500">Show results to learners</span>
      </label>

      {/* ── Questions ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Questions ({questions.length})
          </span>
        </div>

        {/* Add question row */}
        <div className="flex flex-wrap gap-1 mb-2">
          {QTYPES.map((t) => (
            <button key={t.value} onClick={() => addQuestion(t.value)}
              className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium border transition-colors"
              style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#6366f1' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <Plus size={9} /> {t.short}
            </button>
          ))}
        </div>

        {questions.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 py-3 border border-dashed rounded"
            style={{ borderColor: '#e2e8f0' }}>
            Add a question or generate with AI
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              expanded={expandedQ === q.id}
              onToggle={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
              onChange={(updater) => updateQuestion(q.id, updater)}
              onDelete={() => removeQuestion(q.id)}
            />
          ))}
        </div>
      </div>

      {/* ── AI Generator (collapsible) ── */}
      <div className="rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
        <button
          onClick={() => setAiOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold transition-colors"
          style={{ color: '#7c3aed', background: aiOpen ? '#faf5ff' : '#ffffff', borderRadius: aiOpen ? '8px 8px 0 0' : 8 }}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={11} /> AI Question Generator
          </span>
          {aiOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {aiOpen && (
          <div className="p-3 flex flex-col gap-2.5 border-t" style={{ borderColor: '#f3f0ff' }}>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Topic / Focus</span>
              <textarea
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                rows={2}
                className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-purple-400 resize-none"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>

            <div className="flex gap-2 items-end">
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] text-slate-400">Count</span>
                <input type="number" min={1} max={10} value={aiCount}
                  onChange={(e) => setAiCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-purple-400 tabular-nums"
                  style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                />
              </label>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Question Types</span>
              <div className="flex flex-wrap gap-1">
                {QTYPES.map((t) => {
                  const active = aiTypes.includes(t.value);
                  return (
                    <button key={t.value} onClick={() => toggleAiType(t.value)}
                      className="px-2 py-1 rounded text-[10px] font-medium border transition-colors"
                      style={{
                        background: active ? '#7c3aed' : '#f8fafc',
                        borderColor: active ? '#7c3aed' : '#e2e8f0',
                        color: active ? '#ffffff' : '#64748b',
                      }}
                    >
                      {t.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={generateQuestions} disabled={generating}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-[11px] font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: '#7c3aed' }}
            >
              {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {generating ? 'Generating…' : 'Generate Questions'}
            </button>

            {genError && (
              <p className="text-[10px] text-red-500 rounded px-2 py-1 border border-red-200 bg-red-50">{genError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question, index, expanded, onToggle, onChange, onDelete,
}: {
  question: QuizQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (updater: (q: QuizQuestion) => QuizQuestion) => void;
  onDelete: () => void;
}) {
  const type = question.type as SupportedType;
  const typeLabel = QTYPES.find((t) => t.value === type)?.short ?? type;
  const preview = question.questionText?.slice(0, 45) || 'Untitled question';

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none"
        style={{ background: expanded ? '#f8fafc' : '#ffffff' }}
        onClick={onToggle}
      >
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
          style={{ background: '#f59e0b', minWidth: 24, textAlign: 'center' }}>
          {typeLabel}
        </span>
        <span className="flex-1 text-[11px] text-slate-600 truncate">{preview}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 rounded text-slate-300 hover:text-red-400 transition-colors shrink-0"
          title="Delete question"
        >
          <Trash2 size={11} />
        </button>
        {expanded ? <ChevronUp size={11} className="text-slate-400 shrink-0" /> : <ChevronDown size={11} className="text-slate-400 shrink-0" />}
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-2.5 pb-3 pt-1 flex flex-col gap-2.5" style={{ borderTop: '1px solid #f1f5f9' }}>
          {/* Type + Points */}
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-[10px] text-slate-400">Type</span>
              <select value={type}
                onChange={(e) => onChange((q) => ({ ...q, type: e.target.value as SupportedType, data: defaultData(e.target.value as SupportedType) }))}
                className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              >
                {QTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 w-14 shrink-0">
              <span className="text-[10px] text-slate-400">Points</span>
              <input type="number" min={1} value={question.points}
                onChange={(e) => onChange((q) => ({ ...q, points: Math.max(1, Number(e.target.value) || 1) }))}
                className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 tabular-nums"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
              />
            </label>
          </div>

          {/* Question text */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Question</span>
            <textarea value={question.questionText} rows={2}
              onChange={(e) => onChange((q) => ({ ...q, questionText: e.target.value }))}
              className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 resize-none"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            />
          </label>

          {/* Type-specific editor */}
          {type === 'multiple_choice' && <MCEditor question={question} onChange={onChange} />}
          {type === 'true_false'      && <TFEditor question={question} onChange={onChange} />}
          {type === 'short_answer'    && <SAEditor question={question} onChange={onChange} />}
          {type === 'drag_drop'       && <DDEditor question={question} onChange={onChange} />}

          {/* Explanation */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Explanation (optional)</span>
            <textarea value={question.explanation || ''} rows={2}
              onChange={(e) => onChange((q) => ({ ...q, explanation: e.target.value }))}
              className="px-2 py-1.5 rounded border text-[11px] text-slate-500 outline-none focus:border-indigo-400 resize-none"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ── Type-specific editors ─────────────────────────────────────────────────────

function MCEditor({ question, onChange }: { question: QuizQuestion; onChange: (u: (q: QuizQuestion) => QuizQuestion) => void }) {
  const options = 'options' in question.data ? question.data.options : [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">Options <span className="text-slate-300">(● = correct)</span></span>
        <button
          onClick={() => onChange((q) => {
            const opts = 'options' in q.data ? q.data.options : [];
            return { ...q, data: { multipleCorrect: false, options: [...opts, { id: `opt_${uid()}`, text: `Option ${opts.length + 1}`, isCorrect: false, order: opts.length }] } };
          })}
          className="text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          + Add
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-1.5">
            <input type="radio" checked={opt.isCorrect} className="accent-amber-500 shrink-0"
              onChange={() => onChange((q) => {
                const opts = 'options' in q.data ? q.data.options : [];
                return { ...q, data: { multipleCorrect: false, options: opts.map((o) => ({ ...o, isCorrect: o.id === opt.id })) } };
              })}
            />
            <input value={opt.text}
              onChange={(e) => onChange((q) => {
                const opts = 'options' in q.data ? q.data.options : [];
                return { ...q, data: { multipleCorrect: false, options: opts.map((o, oi) => oi === i ? { ...o, text: e.target.value } : o) } };
              })}
              className="flex-1 px-2 py-1 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 min-w-0"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            />
            <button disabled={options.length <= 2}
              onClick={() => onChange((q) => {
                const opts = 'options' in q.data ? q.data.options : [];
                return { ...q, data: { multipleCorrect: false, options: opts.filter((_, oi) => oi !== i).map((o, oi) => ({ ...o, order: oi })) } };
              })}
              className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors shrink-0"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TFEditor({ question, onChange }: { question: QuizQuestion; onChange: (u: (q: QuizQuestion) => QuizQuestion) => void }) {
  const correct = 'correctAnswer' in question.data ? question.data.correctAnswer : true;
  return (
    <div className="flex gap-2">
      {[{ label: 'True', val: true }, { label: 'False', val: false }].map(({ label, val }) => (
        <button key={label}
          onClick={() => onChange((q) => ({ ...q, data: { correctAnswer: val } }))}
          className="flex-1 py-1.5 rounded border text-[11px] font-medium transition-colors"
          style={{
            background: correct === val ? '#059669' : '#f8fafc',
            borderColor: correct === val ? '#059669' : '#e2e8f0',
            color: correct === val ? '#ffffff' : '#64748b',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SAEditor({ question, onChange }: { question: QuizQuestion; onChange: (u: (q: QuizQuestion) => QuizQuestion) => void }) {
  const kws = 'keywords' in question.data ? (question.data.keywords ?? []) : [];
  const max = 'maxLength' in question.data ? question.data.maxLength : 160;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Keywords (comma-separated)</span>
        <input value={kws.join(', ')}
          onChange={(e) => onChange((q) => ({ ...q, data: { keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean), maxLength: max } }))}
          className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          placeholder="scarcity, demand, supply"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Max length (chars)</span>
        <input type="number" min={20} max={500} value={max}
          onChange={(e) => onChange((q) => ({ ...q, data: { keywords: kws, maxLength: Math.max(20, Number(e.target.value) || 20) } }))}
          className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 tabular-nums"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
        />
      </label>
    </div>
  );
}

function DDEditor({ question, onChange }: { question: QuizQuestion; onChange: (u: (q: QuizQuestion) => QuizQuestion) => void }) {
  const d = 'items' in question.data ? question.data : { items: [], zones: [], matches: [] };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Items (one per line)</span>
        <textarea rows={3} value={d.items.map((i) => i.content).join('\n')}
          onChange={(e) => {
            const items = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean).map((c, i) => ({ id: d.items[i]?.id ?? `item_${uid()}`, content: c }));
            const zones = items.map((_, i) => ({ id: d.zones[i]?.id ?? `zone_${uid()}`, label: d.zones[i]?.label || `Target ${i + 1}`, acceptMultiple: false }));
            onChange((q) => ({ ...q, data: { items, zones, matches: items.map((item, i) => ({ itemId: item.id, zoneId: zones[i]?.id ?? '' })) } }));
          }}
          className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 resize-none"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          placeholder={"Item 1\nItem 2"}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400">Targets (one per line)</span>
        <textarea rows={3} value={d.zones.map((z) => z.label).join('\n')}
          onChange={(e) => {
            const labels = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
            const zones = labels.map((label, i) => ({ id: d.zones[i]?.id ?? `zone_${uid()}`, label, acceptMultiple: false }));
            onChange((q) => ({ ...q, data: { items: d.items.slice(0, zones.length), zones, matches: d.items.slice(0, zones.length).map((item, i) => ({ itemId: item.id, zoneId: zones[i]?.id ?? '' })) } }));
          }}
          className="px-2 py-1.5 rounded border text-[11px] text-slate-700 outline-none focus:border-indigo-400 resize-none"
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          placeholder={"Target 1\nTarget 2"}
        />
      </label>
    </div>
  );
}
