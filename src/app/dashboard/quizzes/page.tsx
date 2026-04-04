"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { useQuizzes } from "@/lib/db/hooks";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { SyncStatus } from "@/components/sync/SyncStatus";

export default function QuizzesPage() {
  const { data: session, status } = useSession();
  const { quizzes, loading, error, deleteQuiz } = useQuizzes();

  const isStudent =
    (session?.user as any)?.loginType === "student" ||
    (session?.user as any)?.roles?.includes("STUDENT");
  const studentProfileId = (session?.user as any)?.loginProfileId as string | undefined;
  const studentUserId = (session?.user as any)?.id as string | undefined;

  // For students, show only published quizzes assigned to them
  const visibleQuizzes = useMemo(() => {
    if (!isStudent) return quizzes;
    const sid = studentProfileId || studentUserId;
    return quizzes.filter(
      (q) =>
        q.isPublished &&
        (
          !Array.isArray(q.assignedTo) ||
          q.assignedTo.length === 0 ||
          q.assignedTo.includes("all") ||
          (sid && q.assignedTo.includes(sid))
        )
    );
  }, [quizzes, isStudent, studentProfileId, studentUserId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />

      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isStudent ? "My Quizzes" : "Quizzes"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isStudent
                ? "Quizzes assigned to you by your teachers."
                : "Create and manage local-first quizzes"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            {!isStudent && (
              <Link
                href="/dashboard/quizzes/create"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Quiz
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load quizzes: {error.message}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border bg-white" />
            ))}
          </div>
        )}

        {!loading && visibleQuizzes.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
              <HelpCircle className="h-7 w-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isStudent ? "No quizzes assigned yet" : "No quizzes yet"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {isStudent
                ? "Published quizzes assigned to you by your teachers will appear here."
                : "Create your first quiz to start assessing students."}
            </p>
            {!isStudent && (
              <Link
                href="/dashboard/quizzes/create"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Quiz
              </Link>
            )}
          </div>
        )}

        {!loading && visibleQuizzes.length > 0 && (
          <div className="space-y-3">
            {visibleQuizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{quiz.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{quiz.description || "No description"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-gray-100 px-2 py-1">{quiz.questions.length} questions</span>
                      <span className="rounded bg-gray-100 px-2 py-1">
                        {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points
                      </span>
                      {!isStudent && (
                        <span
                          className={`rounded px-2 py-1 font-semibold ${
                            quiz.isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {quiz.isPublished ? "Published" : "Draft"}
                        </span>
                      )}
                      {quiz.settings?.timeLimit && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                          {quiz.settings.timeLimit} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}/take`}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Take
                    </Link>
                    {!isStudent && (
                      <>
                        <Link
                          href={`/dashboard/quizzes/create?quizId=${quiz.id}`}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteQuiz(quiz.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
