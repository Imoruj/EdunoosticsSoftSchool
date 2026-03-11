"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { useQuizzes } from "@/lib/db/hooks";
import type { Quiz, QuizQuestion } from "@/lib/db/types";

type ResponseMap = Record<string, unknown>;

export default function TakeQuizPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lessonId");
  const quizId = params?.id;

  const { data: session, status } = useSession();
  const { quizzes, loading } = useQuizzes();

  const quiz = useMemo(() => quizzes.find((q) => q.id === quizId), [quizzes, quizId]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; passed: boolean } | null>(null);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Quiz not found.
        </div>
      </div>
    );
  }

  const submitQuiz = () => {
    const grading = gradeQuiz(quiz, responses);
    setResult(grading);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href={lessonId ? `/dashboard/lessons/${lessonId}` : "/dashboard/quizzes"}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              quiz.isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {quiz.isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          {quiz.description && <p className="mt-2 text-gray-600">{quiz.description}</p>}
        </div>

        <div className="space-y-4">
          {quiz.questions.map((question, index) => (
            <QuestionRenderer
              key={question.id}
              index={index}
              question={question}
              value={responses[question.id]}
              setValue={(value) => setResponses((prev) => ({ ...prev, [question.id]: value }))}
              disabled={submitted}
            />
          ))}
        </div>

        {!submitted ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={submitQuiz}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Submit Quiz
            </button>
          </div>
        ) : (
          result && (
            <div className="mt-6 rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">Result</h2>
              <p className="mt-2 text-sm text-gray-700">
                Score: <span className="font-semibold">{result.score}</span> / {result.max}
              </p>
              <p className="text-sm text-gray-700">
                Status:{" "}
                <span className={result.passed ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                  {result.passed ? "Passed" : "Not Passed"}
                </span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Objective questions are auto-scored. Short/long answers require teacher review.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({
  index,
  question,
  value,
  setValue,
  disabled,
}: {
  index: number;
  question: QuizQuestion;
  value: unknown;
  setValue: (value: unknown) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Question {index + 1} • {question.points} point{question.points > 1 ? "s" : ""}
      </p>
      <p className="mb-3 text-base font-medium text-gray-900">{question.questionText || "Untitled question"}</p>

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {(question.data as { multipleCorrect: boolean; options: { id: string; text: string }[] }).options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type={(question.data as { multipleCorrect: boolean }).multipleCorrect ? "checkbox" : "radio"}
                name={question.id}
                disabled={disabled}
                checked={Array.isArray(value) ? (value as string[]).includes(option.id) : value === option.id}
                onChange={(e) => {
                  const multiple = (question.data as { multipleCorrect: boolean }).multipleCorrect;
                  if (!multiple) {
                    setValue(option.id);
                    return;
                  }
                  const current = Array.isArray(value) ? (value as string[]) : [];
                  if (e.target.checked) setValue([...current, option.id]);
                  else setValue(current.filter((id) => id !== option.id));
                }}
              />
              {option.text}
            </label>
          ))}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="flex gap-4">
          {["true", "false"].map((label) => (
            <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={question.id}
                disabled={disabled}
                checked={value === (label === "true")}
                onChange={() => setValue(label === "true")}
              />
              {label === "true" ? "True" : "False"}
            </label>
          ))}
        </div>
      )}

      {question.type === "fill_blank" && (
        <div className="space-y-2">
          {((question.data as { blanks: { id: string }[] }).blanks || []).map((blank, idx) => {
            const map = (value as Record<string, string>) || {};
            return (
              <input
                key={blank.id}
                value={map[blank.id] || ""}
                disabled={disabled}
                onChange={(e) => setValue({ ...map, [blank.id]: e.target.value })}
                placeholder={`Blank ${idx + 1}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            );
          })}
        </div>
      )}

      {question.type === "drag_drop" && (
        <div className="space-y-2">
          {((question.data as { items: { id: string; content: string }[] }).items || []).map((item) => {
            const map = (value as Record<string, string>) || {};
            const zones = (question.data as { zones: { id: string; label: string }[] }).zones || [];
            return (
              <div key={item.id} className="grid grid-cols-[1fr_220px] items-center gap-3">
                <span className="text-sm text-gray-700">{item.content}</span>
                <select
                  value={map[item.id] || ""}
                  disabled={disabled}
                  onChange={(e) => setValue({ ...map, [item.id]: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Select zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {(question.type === "short_answer" || question.type === "long_answer") && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          rows={question.type === "long_answer" ? 5 : 3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Type your answer..."
        />
      )}
    </div>
  );
}

function gradeQuiz(quiz: Quiz, responses: ResponseMap) {
  let score = 0;
  let max = 0;

  for (const question of quiz.questions) {
    max += question.points;
    const response = responses[question.id];
    const points = gradeQuestion(question, response);
    score += points;
  }

  const percent = max > 0 ? (score / max) * 100 : 0;
  return { score, max, passed: percent >= quiz.settings.passingScore };
}

function gradeQuestion(question: QuizQuestion, response: unknown) {
  if (question.type === "multiple_choice") {
    const data = question.data as { multipleCorrect: boolean; options: { id: string; isCorrect: boolean }[] };
    const correctIds = data.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
    const selected = Array.isArray(response)
      ? [...(response as string[])].sort()
      : typeof response === "string"
      ? [response]
      : [];
    const isCorrect = correctIds.length === selected.length && correctIds.every((id, idx) => id === selected[idx]);
    return isCorrect ? question.points : 0;
  }

  if (question.type === "true_false") {
    const correct = (question.data as { correctAnswer: boolean }).correctAnswer;
    return response === correct ? question.points : 0;
  }

  if (question.type === "fill_blank") {
    const data = question.data as {
      blanks: { id: string; correctAnswers: string[]; caseSensitive: boolean }[];
    };
    const answers = (response as Record<string, string>) || {};
    if (data.blanks.length === 0) return 0;

    let correctCount = 0;
    for (const blank of data.blanks) {
      const student = (answers[blank.id] || "").trim();
      const matched = blank.correctAnswers.some((answer) => {
        if (blank.caseSensitive) return answer.trim() === student;
        return answer.trim().toLowerCase() === student.toLowerCase();
      });
      if (matched) correctCount += 1;
    }
    return (correctCount / data.blanks.length) * question.points;
  }

  if (question.type === "drag_drop") {
    const data = question.data as { matches: { itemId: string; zoneId: string }[] };
    const map = (response as Record<string, string>) || {};
    if (data.matches.length === 0) return 0;
    let correctCount = 0;
    for (const match of data.matches) {
      if (map[match.itemId] === match.zoneId) correctCount += 1;
    }
    return (correctCount / data.matches.length) * question.points;
  }

  return 0;
}

