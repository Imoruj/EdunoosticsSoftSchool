"use client";

import { useSession } from "next-auth/react";
import { AssignmentBuilder } from "@/components/assignments/AssignmentBuilder";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { useAssignments } from "@/lib/db/hooks";

function CreateAssignmentPageFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function CreateAssignmentPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");
  const { assignments, loading: assignmentsLoading } = useAssignments();

  const assignmentToEdit = useMemo(
    () => assignments.find((assignment) => assignment.id === assignmentId),
    [assignments, assignmentId]
  );

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user?.roles && !session.user.roles.some((r: string) => ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(r)))) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading" || !session?.user?.id || (assignmentId && assignmentsLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (assignmentId && !assignmentToEdit) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Assignment not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            The assignment you tried to edit could not be loaded from local storage.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/assignments")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <AssignmentBuilder
      key={assignmentToEdit?.id ?? "new-assignment"}
      assignment={assignmentToEdit}
      userId={session.user.id}
    />
  );
}

export default function CreateAssignmentPage() {
  return (
    <Suspense fallback={<CreateAssignmentPageFallback />}>
      <CreateAssignmentPageContent />
    </Suspense>
  );
}
