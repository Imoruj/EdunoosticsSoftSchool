"use client";

import { useState, useEffect, useRef } from "react";
import type { Quiz, QuizAttempt, QuizResponse } from "@/lib/db/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { ArrowLeft, ArrowRight, Clock, Info, CheckCircle2 } from "lucide-react";
import { gradeQuiz } from "@/lib/quiz/grading";
import { useQuizAttempts } from "@/lib/db/hooks";
import { showAppAlert, showAppConfirm } from "@/lib/appMessageBox";

interface QuizPlayerProps {
    quiz: Quiz;
    studentId: string;
    onAttemptComplete: (attempt: QuizAttempt) => void;
    onExit: () => void;
}

export function QuizPlayer({ quiz, studentId, onAttemptComplete, onExit }: QuizPlayerProps) {
    const { saveAttempt } = useQuizAttempts();

    // State
    const [startedAt] = useState(() => Date.now());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | null>(
        quiz.settings.timeLimit ? quiz.settings.timeLimit * 60 : null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Timer logic
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(interval);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeRemaining]);

    const handleAutoSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        await showAppAlert("Time is up! Your quiz has been auto-submitted.", {
            title: "Quiz Timer Ended",
            variant: "warning",
            confirmText: "Submit Now",
        });
        await submitQuiz();
    };

    const handleManualSubmit = async () => {
        if (isSubmitting) return;

        // Check if there are unanswered questions
        const unansweredCount = quiz.questions.length - Object.keys(answers).length;
        if (unansweredCount > 0) {
            if (!(await showAppConfirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`, {
                title: "Submit Quiz",
                variant: "warning",
                confirmText: "Submit",
            }))) {
                return;
            }
        } else {
            if (!(await showAppConfirm("Are you sure you want to submit this quiz?", {
                title: "Submit Quiz",
                variant: "warning",
                confirmText: "Submit",
            }))) {
                return;
            }
        }

        setIsSubmitting(true);
        await submitQuiz();
    };

    const submitQuiz = async () => {
        try {
            // Map answers map to QuizResponse array
            const responses: QuizResponse[] = Object.entries(answers).map(([questionId, value]) => ({
                questionId,
                answer: value,
                pointsEarned: 0 // Grade Quiz logic will fill this
            }));

            // Grade locally
            const attempt = gradeQuiz(quiz, studentId, responses, startedAt);

            // Save to IndexedDB
            await saveAttempt(attempt);

            // Notify parent
            onAttemptComplete(attempt);
        } catch (error) {
            console.error("Failed to submit quiz:", error);
            await showAppAlert("An error occurred while submitting. Please try again.", { variant: "error" });
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const currentQuestion = quiz.questions[currentIndex];

    if (!currentQuestion) return <div>Invalid quiz structure</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={async () => {
                            if (await showAppConfirm("Are you sure you want to exit? Your progress will NOT be saved.", {
                                title: "Exit Quiz",
                                variant: "warning",
                                confirmText: "Exit",
                            })) {
                                onExit();
                            }
                        }}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                    >
                        Exit
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div>
                        <h1 className="font-semibold text-gray-900">{quiz.title}</h1>
                        <p className="text-xs text-gray-500">Question {currentIndex + 1} of {quiz.questions.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {timeRemaining !== null && (
                        <div className={`flex items-center gap-2 font-mono text-lg font-medium px-4 py-2 rounded-lg ${timeRemaining < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
                            }`}>
                            <Clock className="w-5 h-5" />
                            {formatTime(timeRemaining)}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleManualSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Quiz"}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Question Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-12">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                            <div className="flex items-center justify-between mb-6">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide uppercase">
                                    {currentQuestion.type.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-medium text-gray-500">
                                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <QuestionRenderer
                                question={currentQuestion}
                                value={answers[currentQuestion.id]}
                                onChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
                            />

                        </div>

                        {/* Next/Prev Navigation */}
                        <div className="mt-8 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                disabled={currentIndex === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white shadow-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Previous
                            </button>

                            {currentIndex < quiz.questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex(i => Math.min(quiz.questions.length - 1, i + 1))}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 shadow-sm text-white font-medium hover:bg-gray-800 transition-colors"
                                >
                                    Next <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleManualSubmit}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 shadow-sm text-white font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Review & Submit <CheckCircle2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                {/* Sidebar Question Navigator */}
                <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden lg:block shrink-0 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Question Map</h3>

                        <div className="grid grid-cols-5 gap-3">
                            {quiz.questions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "" &&
                                    (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true) &&
                                    (typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? Object.keys(answers[q.id]).length > 0 : true);

                                const isCurrent = idx === currentIndex;

                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`
                      relative flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all
                      ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''}
                      ${isAnswered
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }
                    `}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="w-4 h-4 rounded bg-blue-600"></div> Answered
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="w-4 h-4 rounded bg-gray-200"></div> Unanswered
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl text-blue-900 text-sm">
                                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <p>You can navigate freely between questions. Make sure to review all answers before submitting.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
}
