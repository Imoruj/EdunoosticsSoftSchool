"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAssignments } from "@/lib/db/hooks";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { StudentAssignmentsPanel } from "@/components/assignments/student/StudentAssignmentsPanel";

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const { assignments, loading, error, deleteAssignment } = useAssignments();
  const isStudent = (session?.user as any)?.loginType === "student" || (session?.user as any)?.roles?.includes("STUDENT");
  const studentProfileId = (session?.user as any)?.loginProfileId as string | undefined;
  const studentUserId = (session?.user as any)?.id as string | undefined;

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

  if (isStudent && (!studentProfileId || !studentUserId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">Student profile not available</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your student session is missing the profile information required to load assignments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isStudent && studentProfileId && studentUserId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator />

        <div className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
              <p className="mt-1 text-sm text-gray-600">Open, submitted, and graded assignments assigned to you.</p>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatus />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <StudentAssignmentsPanel
            studentProfileId={studentProfileId}
            studentUserId={studentUserId}
            title="Assigned Work"
            description="All published assignments targeted to your student profile."
            emptyTitle="No assignments assigned"
            emptyDescription="Your teachers have not assigned any published work to you yet."
          />
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
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="mt-1 text-sm text-gray-600">Create and manage assignment tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <Link
              href="/dashboard/assignments/create"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Assignment
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load assignments: {error.message}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border bg-white" />
            ))}
          </div>
        )}

        {!loading && assignments.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No assignments yet</h2>
            <p className="mt-1 text-sm text-gray-600">Create your first assignment for students.</p>
            <Link
              href="/dashboard/assignments/create"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Assignment
            </Link>
          </div>
        )}

        {!loading && assignments.length > 0 && (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{assignment.description || "No description"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-gray-100 px-2 py-1">
                        Due {formatDistanceToNow(assignment.dueDate, { addSuffix: true })}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-1">Max {assignment.maxScore}</span>
                      <span
                        className={`rounded px-2 py-1 font-semibold ${
                          assignment.isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {assignment.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/assignments/create?assignmentId=${assignment.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteAssignment(assignment.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
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
