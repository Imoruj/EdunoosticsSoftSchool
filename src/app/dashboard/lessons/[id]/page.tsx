"use client";

import Link from "next/link";
import { useParams, redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, FileQuestion, CheckCircle2, XCircle, ChevronRight, Eye } from "lucide-react";
import { useLesson } from "@/lib/db/hooks";
import { useState } from "react";
import type { ImageBlockData, QuizBlockData, TextBlockData, VideoBlockData, QuizQuestion } from "@/lib/db/types";
import { PreviewModal } from "@/components/lessons/studio/modals/PreviewModal";

export default function LessonDetailsPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params?.id ?? null;
  const { data: session, status } = useSession();
  const { lesson, loading, error } = useLesson(lessonId);
  const [showSlidesPreview, setShowSlidesPreview] = useState(false);
  const isStudent =
    (session?.user as any)?.loginType === "student" ||
    (session?.user as any)?.roles?.includes("STUDENT");

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Lesson not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/lessons"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lessons
          </Link>
          {!isStudent && (
            <Link
              href={`/dashboard/lessons/create?lessonId=${lesson.id}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Lesson
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
              {lesson.description && <p className="mt-2 text-gray-600">{lesson.description}</p>}
            </div>

            {(lesson.slides?.length ?? 0) > 0 && (
              <button
                onClick={() => setShowSlidesPreview(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                View lesson slides
              </button>
            )}
          </div>

          {showSlidesPreview && (
            <PreviewModal lesson={lesson as any} onClose={() => setShowSlidesPreview(false)} />
          )}

          <div className="mt-6 space-y-6">
            {(lesson.content?.length ?? 0) === 0 && (lesson.slides?.length ?? 0) > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This lesson is slide-based. Click <span className="font-semibold">View lesson slides</span> to start.
              </div>
            ) : null}

            {(lesson.content ?? []).map((block) => (
              <div key={block.id}>
                {block.type === "text" && (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: (block.data as TextBlockData).content }}
                  />
                )}

                {block.type === "image" && (
                  <div className="space-y-2">
                    <img
                      src={(block.data as ImageBlockData).url}
                      alt={(block.data as ImageBlockData).alt || "Lesson image"}
                      className="h-auto max-w-full rounded-lg"
                    />
                    {(block.data as ImageBlockData).caption && (
                      <p className="text-center text-sm italic text-gray-600">
                        {(block.data as ImageBlockData).caption}
                      </p>
                    )}
                  </div>
                )}

                {block.type === "video" && (
                  <div className="space-y-2">
                    <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                      <iframe
                        src={(block.data as VideoBlockData).url}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {(block.data as VideoBlockData).caption && (
                      <p className="text-center text-sm italic text-gray-600">
                        {(block.data as VideoBlockData).caption}
                      </p>
                    )}
                  </div>
                )}

                {block.type === "quiz" && (
                  <LessonQuizCard lessonId={lesson.id} data={block.data as QuizBlockData} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonQuizCard({ lessonId, data }: { lessonId: string; data: QuizBlockData }) {
  const [activeTab, setActiveTab] = useState<'embedded' | 'linked'>('embedded');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [showResults, setShowResults] = useState(false);

  const hasEmbeddedQuiz = data.embeddedQuiz && data.embeddedQuiz.questions.length > 0;
  const hasLinkedQuiz = Boolean(data.quizId);

  // If only one type exists, show that directly without tabs
  if (hasEmbeddedQuiz && !hasLinkedQuiz) {
    return <EmbeddedQuizView data={data} />;
  }

  if (!hasEmbeddedQuiz && hasLinkedQuiz) {
    return <LinkedQuizView lessonId={lessonId} data={data} />;
  }

  // Both exist - show tabs
  return (
    <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('embedded')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'embedded'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileQuestion className="inline-block h-4 w-4 mr-2" />
          Lesson Quiz
        </button>
        <button
          onClick={() => setActiveTab('linked')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'linked'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileQuestion className="inline-block h-4 w-4 mr-2" />
          Linked Quiz
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'embedded' ? (
          <EmbeddedQuizView data={data} />
        ) : (
          <LinkedQuizView lessonId={lessonId} data={data} />
        )}
      </div>
    </div>
  );
}

function LinkedQuizView({ lessonId, data }: { lessonId: string; data: QuizBlockData }) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
        <FileQuestion className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{data.quizTitle || "External Quiz"}</h3>
      {data.instructions && <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">{data.instructions}</p>}
      {data.required && (
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 mb-4">
          Required
        </span>
      )}
      {data.quizId ? (
        <Link
          href={`/dashboard/quizzes/${data.quizId}/take?lessonId=${lessonId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Start Quiz
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <p className="text-sm text-gray-500">No quiz linked</p>
      )}
    </div>
  );
}

function EmbeddedQuizView({ data }: { data: QuizBlockData }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [showResults, setShowResults] = useState(false);

  if (!data.embeddedQuiz || data.embeddedQuiz.questions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No quiz questions available</p>
      </div>
    );
  }

  const questions = data.embeddedQuiz.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleAnswer = (answer: any) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answer
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const userAnswer = selectedAnswers[idx];
      if (!userAnswer) return;

      if (q.type === 'multiple_choice' && q.data) {
        const mcData = q.data as any;
        if (mcData.multipleCorrect) {
          const correctIds = mcData.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
          const userIds = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
          if (JSON.stringify(correctIds.sort()) === JSON.stringify(userIds.sort())) {
            correct++;
          }
        } else {
          const correctOption = mcData.options.find((o: any) => o.isCorrect);
          if (correctOption && userAnswer === correctOption.id) {
            correct++;
          }
        }
      } else if (q.type === 'true_false' && q.data) {
        const tfData = q.data as any;
        if (userAnswer === tfData.correctAnswer) {
          correct++;
        }
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  if (showResults) {
    const score = calculateScore();
    const passed = data.embeddedQuiz.passingScore ? score.percentage >= data.embeddedQuiz.passingScore : true;

    return (
      <div className="text-center py-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          passed ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {passed ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {passed ? 'Congratulations!' : 'Keep Practicing!'}
        </h3>
        <p className="text-lg text-gray-600 mb-6">
          You scored {score.correct} out of {score.total} ({score.percentage}%)
        </p>
        {data.embeddedQuiz.passingScore && (
          <p className="text-sm text-gray-500 mb-6">
            Passing score: {data.embeddedQuiz.passingScore}%
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setShowResults(false);
              setCurrentQuestionIndex(0);
              setSelectedAnswers({});
            }}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Retake Quiz
          </button>
          {data.embeddedQuiz.showResults && (
            <button
              onClick={() => setShowResults(false)}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Review Answers
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}% Complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentQuestion.questionText}</h3>
        {currentQuestion.imageUrl && (
          <img
            src={currentQuestion.imageUrl}
            alt="Question"
            className="w-full max-w-md mx-auto rounded-lg mb-4"
          />
        )}

        <QuestionInput
          question={currentQuestion}
          value={selectedAnswers[currentQuestionIndex]}
          onChange={handleAnswer}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex gap-2">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                idx === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : selectedAnswers[idx]
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <button
          onClick={handleNext}
          disabled={!selectedAnswers[currentQuestionIndex]}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: QuizQuestion; value: any; onChange: (val: any) => void }) {
  if (question.type === 'multiple_choice' && question.data) {
    const mcData = question.data as any;
    const options = mcData.options || [];

    return (
      <div className="space-y-3">
        {options.map((option: any) => (
          <label
            key={option.id}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              mcData.multipleCorrect
                ? (value || []).includes(option.id)
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                : value === option.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type={mcData.multipleCorrect ? 'checkbox' : 'radio'}
              checked={mcData.multipleCorrect ? (value || []).includes(option.id) : value === option.id}
              onChange={() => {
                if (mcData.multipleCorrect) {
                  const current = value || [];
                  if (current.includes(option.id)) {
                    onChange(current.filter((id: string) => id !== option.id));
                  } else {
                    onChange([...current, option.id]);
                  }
                } else {
                  onChange(option.id);
                }
              }}
              className="mt-1 h-4 w-4 text-blue-600"
            />
            <div className="flex-1">
              <p className="text-gray-900">{option.text}</p>
              {option.imageUrl && (
                <img src={option.imageUrl} alt="Option" className="mt-2 max-w-xs rounded" />
              )}
            </div>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'true_false') {
    return (
      <div className="space-y-3">
        {[true, false].map((bool) => (
          <label
            key={String(bool)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              value === bool ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              checked={value === bool}
              onChange={() => onChange(bool)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-lg font-medium text-gray-900">{bool ? 'True' : 'False'}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'short_answer') {
    const saData = question.data as any;
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={saData?.maxLength || 180}
        placeholder="Type your answer here..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        rows={4}
      />
    );
  }

  if (question.type === 'drag_drop') {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Drag and drop questions are not yet supported in lesson quizzes</p>
      </div>
    );
  }

  return <div className="text-gray-500">Unsupported question type</div>;
}

