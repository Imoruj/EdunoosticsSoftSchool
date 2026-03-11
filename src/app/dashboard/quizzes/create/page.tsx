"use client";

import { useMemo, Suspense } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { QuizBuilder } from "@/components/quizzes/QuizBuilder";
import { useQuizzes } from "@/lib/db/hooks";

export const dynamic = 'force-dynamic';

function CreateQuizContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");
  const { quizzes } = useQuizzes();

  const selectedQuiz = useMemo(() => {
    if (!quizId) return undefined;
    return quizzes.find((quiz) => quiz.id === quizId);
  }, [quizId, quizzes]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600">Loading quiz builder...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/auth/login");
  }

  return <QuizBuilder quiz={selectedQuiz} userId={session.user.id || "test-user-123"} />;
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CreateQuizContent />
    </Suspense>
  );
}

