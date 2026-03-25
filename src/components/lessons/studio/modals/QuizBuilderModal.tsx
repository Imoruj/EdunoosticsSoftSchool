'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Lesson, QuizBlockData, QuizQuestion, SlideElement, LessonSlide } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';
import { ModalShell } from './TextEditorModal';
import { showAppAlert } from '@/lib/appMessageBox';

type SupportedQuestionType = Extract<QuizQuestion['type'], 'multiple_choice' | 'true_false' | 'short_answer' | 'drag_drop'>;

const QUESTION_TYPES: Array<{ value: SupportedQuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'drag_drop', label: 'Drag & Drop' },
];

interface QuizBuilderModalProps {
  lesson: Lesson;
  slide: LessonSlide;
  element: SlideElement;
  dispatch: React.Dispatch<StudioAction>;
  onClose: () => void;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultQuestionData(type: SupportedQuestionType): QuizQuestion['data'] {
  switch (type) {
    case 'true_false':
      return { correctAnswer: true };
    case 'short_answer':
      return { maxLength: 160, keywords: [] };
    case 'drag_drop':
      return {
        items: [
          { id: uid('item'), content: 'Item 1' },
          { id: uid('item'), content: 'Item 2' },
        ],
        zones: [
          { id: uid('zone'), label: 'Target 1', acceptMultiple: false },
          { id: uid('zone'), label: 'Target 2', acceptMultiple: false },
        ],
        matches: [],
      };
    default:
      return {
        multipleCorrect: false,
        options: [
          { id: uid('opt'), text: 'Option 1', isCorrect: true, order: 0 },
          { id: uid('opt'), text: 'Option 2', isCorrect: false, order: 1 },
          { id: uid('opt'), text: 'Option 3', isCorrect: false, order: 2 },
          { id: uid('opt'), text: 'Option 4', isCorrect: false, order: 3 },
        ],
      };
  }
}

function createQuestion(order: number, type: SupportedQuestionType = 'multiple_choice'): QuizQuestion {
  return {
    id: uid('q'),
    type,
    order,
    questionText: '',
    points: 1,
    explanation: '',
    data: createDefaultQuestionData(type),
  };
}

function normalizeQuestions(questions: QuizQuestion[]) {
  return questions.map((question, index) => ({ ...question, order: index }));
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function MultipleChoiceEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  const options = 'options' in question.data ? question.data.options : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Options</span>
        <button
          onClick={() =>
            onChange((current) => {
              const currentOptions = 'options' in current.data ? current.data.options : [];
              const nextOptions = [
                ...currentOptions,
                { id: uid('opt'), text: `Option ${currentOptions.length + 1}`, isCorrect: false, order: currentOptions.length },
              ];
              return {
                ...current,
                data: { multipleCorrect: false, options: nextOptions },
              };
            })
          }
          className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200"
        >
          <Plus size={11} className="inline mr-1" />
          Add Option
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="grid grid-cols-[20px,1fr,28px] items-center gap-2">
            <input
              type="radio"
              checked={option.isCorrect}
              onChange={() =>
                onChange((current) => {
                  const currentOptions = 'options' in current.data ? current.data.options : [];
                  return {
                    ...current,
                    data: {
                      multipleCorrect: false,
                      options: currentOptions.map((entry) => ({
                        ...entry,
                        isCorrect: entry.id === option.id,
                      })),
                    },
                  };
                })
              }
              className="accent-amber-500"
            />
            <input
              value={option.text}
              onChange={(event) =>
                onChange((current) => {
                  const currentOptions = 'options' in current.data ? current.data.options : [];
                  return {
                    ...current,
                    data: {
                      multipleCorrect: false,
                      options: currentOptions.map((entry) =>
                        entry.id === option.id
                          ? { ...entry, text: event.target.value, order: index }
                          : entry
                      ),
                    },
                  };
                })
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
            />
            <button
              onClick={() =>
                onChange((current) => {
                  const currentOptions = 'options' in current.data ? current.data.options : [];
                  const nextOptions = currentOptions.filter((entry) => entry.id !== option.id);
                  return {
                    ...current,
                    data: {
                      multipleCorrect: false,
                      options: nextOptions.map((entry, optionIndex) => ({
                        ...entry,
                        order: optionIndex,
                      })),
                    },
                  };
                })
              }
              disabled={options.length <= 2}
              className="rounded-md p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
              title="Remove option"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrueFalseEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  const correctAnswer = 'correctAnswer' in question.data ? question.data.correctAnswer : true;

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-2">Correct Answer</span>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'True', value: true },
          { label: 'False', value: false },
        ].map((choice) => (
          <button
            key={choice.label}
            onClick={() => onChange((current) => ({ ...current, data: { correctAnswer: choice.value } }))}
            className="rounded-lg border px-3 py-2 text-sm transition-colors"
            style={{
              color: correctAnswer === choice.value ? '#ffffff' : '#cbd5e1',
              borderColor: correctAnswer === choice.value ? '#10b981' : 'rgba(255,255,255,0.08)',
              background: correctAnswer === choice.value ? '#059669' : 'rgba(255,255,255,0.03)',
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortAnswerEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  const keywords = 'keywords' in question.data ? (question.data.keywords ?? []) : [];
  const maxLength = 'maxLength' in question.data ? question.data.maxLength : 160;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr,110px]">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Keywords</span>
        <input
          value={keywords.join(', ')}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              data: {
                keywords: event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean),
                maxLength,
              },
            }))
          }
          placeholder="scarcity, wants, resources"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Max Length</span>
        <input
          type="number"
          min={20}
          max={500}
          value={maxLength}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              data: {
                keywords,
                maxLength: Math.max(20, Number(event.target.value) || 20),
              },
            }))
          }
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
        />
      </label>
    </div>
  );
}

function DragDropEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  const data = 'items' in question.data ? question.data : { items: [], zones: [], matches: [] };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Items</span>
        <textarea
          value={data.items.map((item) => item.content).join('\n')}
          onChange={(event) => {
            const items = parseLines(event.target.value).map((content, index) => ({
              id: data.items[index]?.id ?? uid('item'),
              content,
            }));
            const zones = items.map((item, index) => ({
              id: data.zones[index]?.id ?? uid('zone'),
              label: data.zones[index]?.label || `Target ${index + 1}`,
              acceptMultiple: data.zones[index]?.acceptMultiple ?? false,
            }));
            const matches = items.map((item, index) => ({
              itemId: item.id,
              zoneId: zones[index].id,
            }));

            onChange((current) => ({
              ...current,
              data: { items, zones, matches },
            }));
          }}
          rows={5}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
          placeholder={`Item 1\nItem 2`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Targets</span>
        <textarea
          value={data.zones.map((zone) => zone.label).join('\n')}
          onChange={(event) => {
            const zoneLabels = parseLines(event.target.value);
            const items = data.items.slice(0, Math.max(data.items.length, zoneLabels.length));
            const zones = zoneLabels.map((label, index) => ({
              id: data.zones[index]?.id ?? uid('zone'),
              label,
              acceptMultiple: data.zones[index]?.acceptMultiple ?? false,
            }));
            const matches = items
              .slice(0, zones.length)
              .map((item, index) => ({ itemId: item.id, zoneId: zones[index].id }));

            onChange((current) => ({
              ...current,
              data: {
                items: items.slice(0, zones.length),
                zones,
                matches,
              },
            }));
          }}
          rows={5}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
          placeholder={`Target 1\nTarget 2`}
        />
      </label>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
  onDelete: () => void;
}) {
  const questionType = question.type as SupportedQuestionType;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-300">Question {index + 1}</span>
        <select
          value={questionType}
          onChange={(event) => {
            const nextType = event.target.value as SupportedQuestionType;
            onChange((current) => ({
              ...current,
              type: nextType,
              data: createDefaultQuestionData(nextType),
            }));
          }}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-400"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value} className="bg-slate-900">
              {type.label}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="ml-auto rounded-md p-2 text-rose-300 hover:bg-rose-500/10 transition-colors"
          title="Delete question"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,90px]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">Question</span>
          <textarea
            value={question.questionText}
            onChange={(event) => onChange((current) => ({ ...current, questionText: event.target.value }))}
            rows={3}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">Points</span>
          <input
            type="number"
            min={1}
            value={question.points}
            onChange={(event) => onChange((current) => ({ ...current, points: Math.max(1, Number(event.target.value) || 1) }))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Explanation</span>
        <textarea
          value={question.explanation || ''}
          onChange={(event) => onChange((current) => ({ ...current, explanation: event.target.value }))}
          rows={2}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
        />
      </label>

      {questionType === 'multiple_choice' && (
        <MultipleChoiceEditor question={question} onChange={onChange} />
      )}
      {questionType === 'true_false' && (
        <TrueFalseEditor question={question} onChange={onChange} />
      )}
      {questionType === 'short_answer' && (
        <ShortAnswerEditor question={question} onChange={onChange} />
      )}
      {questionType === 'drag_drop' && (
        <DragDropEditor question={question} onChange={onChange} />
      )}
    </div>
  );
}

export function QuizBuilderModal({
  lesson,
  slide,
  element,
  dispatch,
  onClose,
}: QuizBuilderModalProps) {
  const currentData = (element.data as QuizBlockData) || {};
  const [draft, setDraft] = useState<QuizBlockData>({
    quizTitle: currentData.quizTitle || 'Knowledge Check',
    instructions: currentData.instructions || '',
    embeddedQuiz: {
      questions: currentData.embeddedQuiz?.questions?.length
        ? currentData.embeddedQuiz.questions
        : [],
      passingScore: currentData.embeddedQuiz?.passingScore ?? 60,
      showResults: currentData.embeddedQuiz?.showResults ?? true,
    },
  });
  const [topic, setTopic] = useState(lesson.title || currentData.quizTitle || '');
  const [aiCount, setAiCount] = useState(3);
  const [selectedTypes, setSelectedTypes] = useState<SupportedQuestionType[]>(['multiple_choice']);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () => normalizeQuestions(draft.embeddedQuiz?.questions || []),
    [draft.embeddedQuiz?.questions]
  );

  function patchDraft(patch: Partial<QuizBlockData>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  function patchEmbeddedQuiz(patch: Partial<NonNullable<QuizBlockData['embeddedQuiz']>>) {
    setDraft((previous) => ({
      ...previous,
      embeddedQuiz: {
        questions: previous.embeddedQuiz?.questions || [],
        passingScore: previous.embeddedQuiz?.passingScore ?? 60,
        showResults: previous.embeddedQuiz?.showResults ?? true,
        ...previous.embeddedQuiz,
        ...patch,
      },
    }));
  }

  function updateQuestion(index: number, updater: (question: QuizQuestion) => QuizQuestion) {
    const nextQuestions = questions.map((question, questionIndex) =>
      questionIndex === index ? updater(question) : question
    );
    patchEmbeddedQuiz({ questions: normalizeQuestions(nextQuestions) });
  }

  function addQuestion(type: SupportedQuestionType) {
    patchEmbeddedQuiz({ questions: [...questions, createQuestion(questions.length, type)] });
  }

  function removeQuestion(index: number) {
    patchEmbeddedQuiz({
      questions: normalizeQuestions(questions.filter((_, questionIndex) => questionIndex !== index)),
    });
  }

  function toggleType(type: SupportedQuestionType) {
    setSelectedTypes((previous) => {
      const exists = previous.includes(type);
      if (exists && previous.length === 1) return previous;
      return exists ? previous.filter((entry) => entry !== type) : [...previous, type];
    });
  }

  async function generateQuestions() {
    if (!topic.trim() && !lesson.sowLessonContent?.trim()) {
      await showAppAlert('Add a topic or attach Scheme of Work context before generating quiz questions.', {
        variant: 'warning',
        title: 'Missing Information',
      });
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/lessons/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          sourceText: lesson.sowLessonContent || undefined,
          weekContent: lesson.sowLessonContent || undefined,
          objectives: lesson.sowObjectives || undefined,
          lessonSection: slide.sceneType,
          count: aiCount,
          questionTypes: selectedTypes,
          avoidQuestionTexts: questions.map((question) => question.questionText.trim()).filter(Boolean),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate quiz questions.');
      }

      patchEmbeddedQuiz({
        questions: normalizeQuestions([...(draft.embeddedQuiz?.questions || []), ...(payload.questions || [])]),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz questions.');
    } finally {
      setGenerating(false);
    }
  }

  function saveQuiz() {
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId: slide.id,
      elementId: element.id,
      patch: {
        data: {
          ...currentData,
          ...draft,
          embeddedQuiz: {
            questions,
            passingScore: Math.max(1, Math.min(100, Number(draft.embeddedQuiz?.passingScore) || 60)),
            showResults: draft.embeddedQuiz?.showResults ?? true,
          },
        } as QuizBlockData,
      },
    });
    onClose();
  }

  return (
    <ModalShell title="Build Quiz" onClose={onClose} wide>
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr,120px]">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Quiz Title</span>
                <input
                  value={draft.quizTitle || ''}
                  onChange={(event) => patchDraft({ quizTitle: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                  placeholder="Knowledge Check"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Passing %</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.embeddedQuiz?.passingScore ?? 60}
                  onChange={(event) => patchEmbeddedQuiz({ passingScore: Number(event.target.value) })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Instructions</span>
              <textarea
                value={draft.instructions || ''}
                onChange={(event) => patchDraft({ instructions: event.target.value })}
                rows={3}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
                placeholder="Explain how learners should answer the questions."
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.embeddedQuiz?.showResults ?? true}
                onChange={(event) => patchEmbeddedQuiz({ showResults: event.target.checked })}
                className="accent-indigo-500"
              />
              Show results to learners
            </label>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Questions</p>
                <p className="text-xs text-slate-500 mt-1">{questions.length} question(s) configured</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => addQuestion(type.value)}
                    className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/20 transition-colors"
                  >
                    <Plus size={12} className="inline mr-1" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                Add a question manually or generate some with AI.
              </div>
            ) : (
              <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    onChange={(updater) => updateQuestion(index, updater)}
                    onDelete={() => removeQuestion(index)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">AI Question Generator</p>
              <p className="text-xs text-slate-500 mt-1">Build questions from the lesson title and Scheme of Work context.</p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Topic / Focus</span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                rows={4}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 resize-none"
                placeholder="E.g. scarcity, choice, and the scope of economics"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Question Count</span>
              <input
                type="number"
                min={1}
                max={10}
                value={aiCount}
                onChange={(event) => setAiCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>

            <div>
              <span className="text-xs text-slate-400">Question Types</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUESTION_TYPES.map((type) => {
                  const active = selectedTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className="rounded-lg border px-3 py-2 text-xs transition-colors"
                      style={{
                        color: active ? '#ffffff' : '#cbd5e1',
                        borderColor: active ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                        background: active ? '#d97706' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={generateQuestions}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#7c3aed' }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? 'Generating…' : 'Generate Questions'}
            </button>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Summary</p>
            <div className="space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Slide:</span> {slide.title || slide.sceneType}</p>
              <p><span className="text-slate-500">Questions:</span> {questions.length}</p>
              <p><span className="text-slate-500">Show Results:</span> {draft.embeddedQuiz?.showResults ? 'Yes' : 'No'}</p>
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={saveQuiz}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: '#4f46e5' }}
        >
          Save Quiz
        </button>
      </div>
    </ModalShell>
  );
}
