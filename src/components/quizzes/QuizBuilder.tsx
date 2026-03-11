"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowLeft, Plus, Save, Trash2, ImageIcon, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { useQuizzes } from "@/lib/db/hooks";
import type { Quiz, QuizQuestion } from "@/lib/db/types";
import { TargetAudienceSelector } from "@/components/shared/TargetAudienceSelector";
import { showAppAlert } from "@/lib/appMessageBox";

type QuestionType = QuizQuestion["type"];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the Blanks" },
  { value: "drag_drop", label: "Drag and Drop" },
  { value: "short_answer", label: "Short Answer" },
  { value: "long_answer", label: "Long Answer" },
];

const DEFAULT_SETTINGS: Quiz["settings"] = {
  passingScore: 50,
  shuffleQuestions: false,
  shuffleAnswers: false,
  showResults: true,
  allowRetake: true,
  maxAttempts: 1,
  timeLimit: 20,
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultData(type: QuestionType): QuizQuestion["data"] {
  if (type === "multiple_choice") {
    return {
      multipleCorrect: false,
      options: [
        { id: uid("opt"), text: "", isCorrect: true, order: 0 },
      ],
    };
  }
  if (type === "true_false") return { correctAnswer: true };
  if (type === "fill_blank") {
    return {
      template: "",
      blanks: [{ id: uid("blank"), correctAnswers: [], caseSensitive: false }],
    };
  }
  if (type === "drag_drop") {
    return {
      items: [
        { id: uid("item"), content: "" },
        { id: uid("item"), content: "" },
      ],
      zones: [
        { id: uid("zone"), label: "", acceptMultiple: true },
        { id: uid("zone"), label: "", acceptMultiple: true },
      ],
      matches: [],
    };
  }
  if (type === "short_answer") return { maxLength: 180, keywords: [] };
  return { minLength: 80, maxLength: 1200, rubric: "" };
}

function makeQuestion(type: QuestionType, order: number): QuizQuestion {
  return {
    id: uid("q"),
    type,
    order,
    points: 1,
    questionText: "",
    explanation: "",
    data: defaultData(type),
  };
}

function normalizeOrder(questions: QuizQuestion[]) {
  return questions.map((q, index) => ({ ...q, order: index }));
}

interface QuizBuilderProps {
  quiz?: Quiz;
  userId: string;
}

export function QuizBuilder({ quiz, userId }: QuizBuilderProps) {
  const router = useRouter();
  const { saveQuiz } = useQuizzes();

  const [title, setTitle]           = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [subjectId, setSubjectId]   = useState(quiz?.subjectId ?? "");
  const [classArmIds, setClassArmIds] = useState<string[]>(quiz?.classArmIds ?? []);
  const [assignedTo, setAssignedTo] = useState<string[]>(quiz?.assignedTo ?? []);
  const [settings, setSettings]     = useState(quiz?.settings ?? DEFAULT_SETTINGS);
  const [questions, setQuestions]   = useState<QuizQuestion[]>(
    quiz?.questions?.length ? quiz.questions : [makeQuestion("multiple_choice", 0)]
  );
  const [saving, setSaving] = useState(false);

  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + (q.points || 0), 0), [questions]);

  const updateQuestion = (id: string, updater: (q: QuizQuestion) => QuizQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, makeQuestion(type, prev.length)]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => normalizeOrder(prev.filter((q) => q.id !== id)));
  };

  const save = async (publish: boolean) => {
    if (!title.trim()) {
      await showAppAlert("Quiz title is required.", { title: "Missing Information", variant: "warning" });
      return;
    }
    if (!subjectId || classArmIds.length === 0) {
      await showAppAlert("Please select a subject and at least one class arm.", { title: "Missing Information", variant: "warning" });
      return;
    }
    if (!questions.length) {
      await showAppAlert("Add at least one question.", { title: "Missing Information", variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload: Quiz = {
        id: quiz?.id ?? uid("quiz"),
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId,
        classArmIds,
        lessonId: quiz?.lessonId,
        createdById: quiz?.createdById ?? userId,
        createdAt: quiz?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        isPublished: publish,
        publishedAt: publish ? Date.now() : quiz?.publishedAt,
        assignedTo,
        settings: {
          ...settings,
          passingScore: Math.max(1, Math.min(100, Number(settings.passingScore) || 50)),
          timeLimit: Math.max(1, Number(settings.timeLimit) || 20),
          maxAttempts: Math.max(1, Number(settings.maxAttempts) || 1),
        },
        questions: normalizeOrder(questions).map((q) => ({
          ...q,
          points: Math.max(1, Number(q.points) || 1),
          imageUrl: q.imageUrl || undefined,
        })),
      };

      await saveQuiz(payload);
      router.push("/dashboard/quizzes");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await showAppAlert(`Failed to save quiz: ${errorMessage}`, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/quizzes")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{quiz ? "Edit Quiz" : "Create Quiz"}</h1>
              <p className="text-sm text-gray-500">{questions.length} question{questions.length !== 1 ? "s" : ""} · {totalPoints} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Left: Title + Description + Questions ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Quick Knowledge Check"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the quiz…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, index) => (
                <QuestionCard
                  key={q.id}
                  index={index}
                  question={q}
                  onUpdate={(next) => updateQuestion(q.id, () => next)}
                  onRemove={() => removeQuestion(q.id)}
                />
              ))}
            </div>

            {/* Add Question */}
            <button
              type="button"
              onClick={() => addQuestion("multiple_choice")}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>

          {/* ── Right: Target Audience + Settings ── */}
          <div className="space-y-5">

            {/* Target Audience */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Target Audience</h3>
              <TargetAudienceSelector
                subjectId={subjectId}
                classArmIds={classArmIds}
                assignedTo={assignedTo}
                onSubjectChange={setSubjectId}
                onClassArmsChange={setClassArmIds}
                onAssignedToChange={setAssignedTo}
              />
            </div>

            {/* Quiz Settings */}
            <div className="rounded-xl border bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Quiz Settings</h3>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.passingScore}
                  onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time Limit (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.timeLimit}
                  onChange={(e) => setSettings({ ...settings, timeLimit: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  value={settings.maxAttempts}
                  onChange={(e) => setSettings({ ...settings, maxAttempts: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                {(
                  [
                    ["shuffleQuestions", "Shuffle questions"],
                    ["shuffleAnswers", "Shuffle answer options"],
                    ["showResults", "Show results after submission"],
                    ["allowRetake", "Allow retake"],
                  ] as [keyof typeof settings, string][]
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!settings[key]}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({
  index,
  question,
  onUpdate,
  onRemove,
}: {
  index: number;
  question: QuizQuestion;
  onUpdate: (question: QuizQuestion) => void;
  onRemove: () => void;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "quiz_image");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUpdate({ ...question, imageUrl: url });
    } catch {
      await showAppAlert("Image upload failed. Please try again.", { variant: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Question {index + 1}</span>
          <select
            value={question.type}
            onChange={(e) => {
              const type = e.target.value as QuestionType;
              onUpdate({ ...question, type, data: defaultData(type) });
            }}
            className="text-xs px-2 py-1 border border-gray-300 rounded-lg bg-gray-50"
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt.value} value={qt.value}>{qt.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 ml-1">
            <label className="text-xs text-gray-500">Pts:</label>
            <input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => onUpdate({ ...question, points: Number(e.target.value) || 1 })}
              className="w-12 text-xs px-1 py-1 border border-gray-300 rounded text-center"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Question text */}
      <textarea
        value={question.questionText}
        onChange={(e) => onUpdate({ ...question, questionText: e.target.value })}
        placeholder="Enter your question…"
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      {/* Image */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      {question.imageUrl ? (
        <div className="relative mb-3">
          <img src={question.imageUrl} alt="Question" className="max-h-32 w-full object-contain rounded-lg border" />
          <button
            type="button"
            onClick={() => onUpdate({ ...question, imageUrl: undefined })}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className="text-xs text-blue-600 hover:text-blue-700 mb-3 flex items-center gap-1"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {uploadingImage ? "Uploading…" : "Add image to question"}
        </button>
      )}

      {/* Type-specific fields */}
      <QuestionTypeFields question={question} onUpdate={onUpdate} />

      {/* Explanation — all question types */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Explanation <span className="font-normal text-gray-400">(shown to students after answering)</span>
        </label>
        <textarea
          value={question.explanation ?? ""}
          onChange={(e) => onUpdate({ ...question, explanation: e.target.value })}
          placeholder="Explain why the correct answer is correct…"
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}

// ── Question type fields ──────────────────────────────────────────────────────
function QuestionTypeFields({
  question,
  onUpdate,
}: {
  question: QuizQuestion;
  onUpdate: (question: QuizQuestion) => void;
}) {
  if (question.type === "multiple_choice") {
    const data = question.data as {
      multipleCorrect: boolean;
      options: { id: string; text: string; imageUrl?: string; isCorrect: boolean; order: number }[];
    };

    const handleOptionImageUpload = async (optionId: string, file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "quiz_option_image");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        onUpdate({
          ...question,
          data: { ...data, options: data.options.map((o) => (o.id === optionId ? { ...o, imageUrl: url } : o)) },
        });
      } catch {
        await showAppAlert("Image upload failed. Please try again.", { variant: "error" });
      }
    };

    return (
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Answer Options:</label>
        {data.options.map((option, optIndex) => (
          <div key={option.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={option.isCorrect}
                onChange={() =>
                  onUpdate({
                    ...question,
                    data: { ...data, options: data.options.map((o, i) => ({ ...o, isCorrect: i === optIndex })) },
                  })
                }
                className="w-4 h-4 shrink-0"
              />
              <input
                value={option.text}
                onChange={(e) =>
                  onUpdate({
                    ...question,
                    data: { ...data, options: data.options.map((o) => (o.id === option.id ? { ...o, text: e.target.value } : o)) },
                  })
                }
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  const lines = pasted.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
                  if (lines.length <= 1) return;
                  e.preventDefault();
                  const existing = [...data.options];
                  existing[optIndex] = { ...existing[optIndex], text: lines[0] };
                  const tail = lines.slice(1).map((text, i) => ({
                    id: uid("opt"),
                    text,
                    isCorrect: false,
                    order: existing.length + i,
                  }));
                  onUpdate({ ...question, data: { ...data, options: [...existing, ...tail] } });
                }}
                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              {/* Add image to option */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) handleOptionImageUpload(option.id, file);
                  };
                  input.click();
                }}
                className="p-1 text-gray-400 hover:text-blue-600 shrink-0"
                title="Add image to option"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              {/* Delete option — hidden when only 1 remains */}
              {data.options.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const remaining = data.options.filter((_, i) => i !== optIndex);
                    const hasCorrect = remaining.some((o) => o.isCorrect);
                    const finalOptions = hasCorrect
                      ? remaining
                      : remaining.map((o, i) => ({ ...o, isCorrect: i === 0 }));
                    onUpdate({ ...question, data: { ...data, options: finalOptions } });
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                  title="Delete option"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {option.imageUrl && (
              <div className="relative ml-6">
                <img src={option.imageUrl} alt={option.text} className="max-h-20 rounded border" />
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...question,
                      data: { ...data, options: data.options.map((o) => (o.id === option.id ? { ...o, imageUrl: undefined } : o)) },
                    })
                  }
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newOptions = [...data.options, { id: uid("opt"), text: "", isCorrect: false, order: data.options.length }];
            onUpdate({ ...question, data: { ...data, options: newOptions } });
          }}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add option
        </button>
      </div>
    );
  }

  if (question.type === "true_false") {
    const data = question.data as { correctAnswer: boolean };
    return (
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Correct Answer:</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={data.correctAnswer} onChange={() => onUpdate({ ...question, data: { correctAnswer: true } })} className="w-4 h-4" />
            True
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={!data.correctAnswer} onChange={() => onUpdate({ ...question, data: { correctAnswer: false } })} className="w-4 h-4" />
            False
          </label>
        </div>
      </div>
    );
  }

  if (question.type === "fill_blank") {
    const data = question.data as { template: string; blanks: any[] };
    return (
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Template (use [blank] for fill-in areas):</label>
        <textarea
          value={data.template}
          onChange={(e) => onUpdate({ ...question, data: { ...data, template: e.target.value } })}
          rows={2}
          placeholder="Example: The capital of France is [blank]."
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
        />
      </div>
    );
  }

  if (question.type === "drag_drop") {
    const data = question.data as any;
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 font-medium">Draggable Items:</label>
          <div className="space-y-1.5 mt-1">
            {data.items.map((item: any, i: number) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  value={item.content}
                  onChange={(e) => {
                    const newItems = [...data.items];
                    newItems[i] = { ...newItems[i], content: e.target.value };
                    onUpdate({ ...question, data: { ...data, items: newItems } });
                  }}
                  placeholder={`Item ${i + 1}`}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                {data.items.length > 1 && (
                  <button type="button" onClick={() => onUpdate({ ...question, data: { ...data, items: data.items.filter((_: any, j: number) => j !== i) } })} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => onUpdate({ ...question, data: { ...data, items: [...data.items, { id: uid("item"), content: "" }] } })} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-600 font-medium">Drop Zones:</label>
          <div className="space-y-1.5 mt-1">
            {data.zones.map((zone: any, i: number) => (
              <div key={zone.id} className="flex items-center gap-2">
                <input
                  value={zone.label}
                  onChange={(e) => {
                    const newZones = [...data.zones];
                    newZones[i] = { ...newZones[i], label: e.target.value };
                    onUpdate({ ...question, data: { ...data, zones: newZones } });
                  }}
                  placeholder={`Zone ${i + 1}`}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                {data.zones.length > 1 && (
                  <button type="button" onClick={() => onUpdate({ ...question, data: { ...data, zones: data.zones.filter((_: any, j: number) => j !== i) } })} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => onUpdate({ ...question, data: { ...data, zones: [...data.zones, { id: uid("zone"), label: "", acceptMultiple: true }] } })} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add zone
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 italic">Students will match items to zones when taking the quiz.</p>
      </div>
    );
  }

  if (question.type === "short_answer") {
    const data = question.data as { maxLength: number };
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Max character length:</label>
          <input
            type="number"
            min="10"
            max="500"
            value={data.maxLength || 180}
            onChange={(e) => onUpdate({ ...question, data: { ...data, maxLength: Number(e.target.value) || 180 } })}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 italic">Students will type a short text answer.</p>
      </div>
    );
  }

  // Long Answer
  const data = question.data as { minLength: number; maxLength: number; rubric?: string };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Min length:</label>
          <input type="number" min="10" value={data.minLength || 80} onChange={(e) => onUpdate({ ...question, data: { ...data, minLength: Number(e.target.value) || 80 } })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs text-gray-600">Max length:</label>
          <input type="number" min="50" max="5000" value={data.maxLength || 1200} onChange={(e) => onUpdate({ ...question, data: { ...data, maxLength: Number(e.target.value) || 1200 } })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1" />
        </div>
      </div>
      <p className="text-xs text-gray-500 italic">Students will type a detailed essay-style answer.</p>
    </div>
  );
}
