"use client";

import { useQuizzes, useQuizAttempts } from "@/lib/db/hooks";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { QuizPlayer } from "@/components/quizzes/player/QuizPlayer";
import { QuizResults } from "@/components/quizzes/player/QuizResults";
import { ArrowLeft, Loader2, AlertTriangle, FileWarning } from "lucide-react";

export default function TakeQuizPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = params.id as string;
    const { data: session } = useSession();
    const studentId = session?.user?.id;

    const { quizzes, loading: quizzesLoading } = useQuizzes();
    const { attempts, loading: attemptsLoading } = useQuizAttempts(quizId);

    const [activeAttempt, setActiveAttempt] = useState<any>(null); // For displaying results immediately after completion

    const quiz = useMemo(() => quizzes.find((q) => q.id === quizId), [quizzes, quizId]);

    // Sort attempts newest first
    const sortedAttempts = useMemo(() => {
        return [...attempts].sort((a, b) => b.completedAt! - a.completedAt!);
    }, [attempts]);

    const loading = quizzesLoading || attemptsLoading;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="font-medium animate-pulse">Loading quiz data...</p>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <FileWarning className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz not found</h2>
                <p className="text-gray-500 max-w-md mb-8">
                    The quiz you are looking for does not exist or has been removed. It may not have synced to your device yet.
                </p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>
        );
    }

    const maxAttempts = quiz.settings.maxAttempts || 1;
    const hasExceededAttempts = sortedAttempts.length >= maxAttempts;
    const latestAttempt = sortedAttempts[0];

    // If user just finished the quiz, show them the results directly
    if (activeAttempt) {
        return (
            <QuizResults
                quiz={quiz}
                attempt={activeAttempt}
                onExit={() => router.push('/dashboard')}
            />
        );
    }

    // If they haven't started yet and have attempts exhausted, show latest attempt results
    if (hasExceededAttempts && !quiz.settings.allowRetake) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-2xl mx-auto px-6 pt-20">
                    <div className="bg-white rounded-3xl p-10 shadow-sm border border-orange-200 text-center">
                        <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Maximum attempts reached</h2>
                        <p className="text-gray-600 mb-8">
                            You have already taken this quiz {sortedAttempts.length} time{sortedAttempts.length !== 1 ? 's' : ''}.
                            The instructor has restricted the maximum number of attempts.
                        </p>

                        {latestAttempt && (
                            <button
                                onClick={() => setActiveAttempt(latestAttempt)}
                                className="inline-flex justify-center w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition"
                            >
                                View Latest Result
                            </button>
                        )}
                        <button
                            onClick={() => router.back()}
                            className="mt-4 sm:mt-0 sm:ml-4 inline-flex justify-center w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-8 py-3 rounded-xl transition"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Otherwise, start the quiz player!
    if (studentId) {
        return (
            <QuizPlayer
                quiz={quiz}
                studentId={studentId}
                onAttemptComplete={(attempt) => setActiveAttempt(attempt)}
                onExit={() => router.back()}
            />
        );
    }

    return <div>Please log in to take this quiz.</div>;
}
