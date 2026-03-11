"use client";

import type { Quiz, QuizAttempt } from "@/lib/db/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, AlertCircle, Info } from "lucide-react";

interface QuizResultsProps {
    quiz: Quiz;
    attempt: QuizAttempt;
    onExit: () => void;
}

export function QuizResults({ quiz, attempt, onExit }: QuizResultsProps) {

    const rawScore = typeof attempt.score === "number" ? attempt.score : 0;
    const percentage = Math.max(0, Math.min(100, Math.round(rawScore)));
    const isPassed = attempt.isPassed;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">

            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onExit}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Course
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <h1 className="font-semibold text-gray-900">Results: {quiz.title}</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-10">

                {/* Score Hero Card */}
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative">

                    {/* Decorative background element */}
                    <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>

                    <div className="flex-1 space-y-4 relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                            <Trophy className="w-4 h-4 text-yellow-500" /> Score Overview
                        </div>

                        <h2 className="text-4xl font-bold text-gray-900">
                            {isPassed ? "Congratulations! 🎉" : "Keep practicing! 💪"}
                        </h2>
                        <p className="text-lg text-gray-600">
                            You scored <strong className="text-gray-900">{attempt.earnedPoints}</strong> out of {attempt.totalPoints} points.
                            The passing score for this quiz is {quiz.settings.passingScore}%.
                        </p>
                    </div>

                    <div className="relative shrink-0 flex items-center justify-center z-10">
                        {/* Circular Progress */}
                        <svg className="w-48 h-48 transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="84"
                                stroke="currentColor"
                                strokeWidth="16"
                                fill="transparent"
                                className="text-gray-100"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="84"
                                stroke="currentColor"
                                strokeWidth="16"
                                fill="transparent"
                                strokeDasharray="527" // 2 * PI * 84 = ~527
                                strokeDashoffset={527 - (527 * percentage) / 100}
                                className={isPassed ? "text-green-500 transition-all duration-1000 ease-out" : "text-red-500 transition-all duration-1000 ease-out"}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-extrabold tracking-tight ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                                {percentage}%
                            </span>
                            <span className={`text-sm font-bold uppercase tracking-wider mt-1 ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
                                {isPassed ? 'Passed' : 'Failed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detailed Review Section */}
                {quiz.settings.showResults ? (
                    <div className="mt-12 space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Detailed Review</h3>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                {quiz.questions.length} questions
                            </span>
                        </div>

                        <div className="space-y-6">
                            {quiz.questions.map((question, index) => {
                                const response = attempt.responses.find(r => r.questionId === question.id);
                                // For manual grading questions, they might have 0 points initially but aren't strictly "wrong"
                                const isManualGrading = question.type === 'short_answer' || question.type === 'long_answer';
                                const isCorrect = response?.isCorrect;

                                return (
                                    <div
                                        key={question.id}
                                        className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-colors ${isManualGrading ? 'border-blue-100' : isCorrect ? 'border-green-100' : 'border-red-100'
                                            }`}
                                    >
                                        {/* Status Bar */}
                                        <div className={`px-6 py-3 flex items-center justify-between border-b ${isManualGrading ? 'bg-blue-50 border-blue-100' : isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                                            }`}>
                                            <div className="flex items-center gap-2 font-semibold">
                                                {isManualGrading ? (
                                                    <span className="text-blue-700 flex items-center gap-1.5"><Info className="w-4 h-4" /> Pending Manual Grading</span>
                                                ) : isCorrect ? (
                                                    <span className="text-green-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Correct</span>
                                                ) : (
                                                    <span className="text-red-700 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Incorrect</span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium opacity-80">
                                                {response?.pointsEarned || 0} / {question.points} Points
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 space-y-6">

                                                    {/* Render the question and what the user picked */}
                                                    <div className="pointer-events-none opacity-90">
                                                        {/* We re-use QuestionRenderer but disable it to show what the user selected */}
                                                        <QuestionRenderer
                                                            question={question}
                                                            value={response?.answer}
                                                            onChange={() => { }}
                                                            disabled={true}
                                                        />
                                                    </div>

                                                    {/* Show explanation if available and missed */}
                                                    {!isCorrect && !isManualGrading && question.explanation && (
                                                        <div className="mt-6 p-5 rounded-xl bg-orange-50 border border-orange-100 text-orange-900">
                                                            <h4 className="flex items-center gap-2 font-semibold mb-2">
                                                                <AlertCircle className="w-5 h-5 text-orange-500" /> Explanation
                                                            </h4>
                                                            <p className="text-sm leading-relaxed">{question.explanation}</p>
                                                        </div>
                                                    )}

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mt-12 text-center p-12 bg-white rounded-3xl border border-gray-200">
                        <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Detailed review disabled</h3>
                        <p className="text-gray-500">The instructor has chosen not to display correct answers for this quiz.</p>
                    </div>
                )}

            </main>
        </div>
    );
}
