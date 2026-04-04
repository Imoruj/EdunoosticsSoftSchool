"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  CalendarClock,
  FilterX,
  Plus,
  Search,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useAssignments } from "@/lib/db/hooks";
import type { Assignment } from "@/lib/db/types";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { StudentAssignmentsPanel } from "@/components/assignments/student/StudentAssignmentsPanel";

type TeacherClass = {
  id: string;
  name: string;
  arms: { id: string; armName: string }[];
};

type TeacherSubject = {
  id: string;
  name: string;
  code: string;
  classArmIds: string[];
};

type AssignmentStatusFilter = "all" | "published" | "draft";
type AssignmentSortOption = "due-asc" | "updated-desc" | "title-asc";

function getDueState(dueDate: number) {
  const diff = dueDate - Date.now();

  if (diff < 0) {
    return {
      label: "Overdue",
      className: "border border-red-200 bg-red-50 text-red-700",
    };
  }

  if (diff <= 1000 * 60 * 60 * 24 * 3) {
    return {
      label: "Due soon",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (diff <= 1000 * 60 * 60 * 24 * 7) {
    return {
      label: "This week",
      className: "border border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Upcoming",
    className: "border border-slate-200 bg-slate-50 text-slate-700",
  };
}

function getAssignmentSummary(assignment: Assignment) {
  if (assignment.description?.trim()) {
    return assignment.description.trim();
  }

  if (assignment.instructions?.trim()) {
    const compactInstructions = assignment.instructions.replace(/\s+/g, " ").trim();
    return compactInstructions.length > 140
      ? `${compactInstructions.slice(0, 137)}...`
      : compactInstructions;
  }

  return "No description";
}

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const { assignments, loading, error, deleteAssignment } = useAssignments();
  const isStudent =
    (session?.user as any)?.loginType === "student" ||
    (session?.user as any)?.roles?.includes("STUDENT");
  const studentProfileId = (session?.user as any)?.loginProfileId as string | undefined;
  const studentUserId = (session?.user as any)?.id as string | undefined;

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classArmFilter, setClassArmFilter] = useState("all");
  const [sortBy, setSortBy] = useState<AssignmentSortOption>("due-asc");

  useEffect(() => {
    if (status !== "authenticated" || isStudent) {
      return;
    }

    let cancelled = false;

    async function loadMetadata() {
      try {
        setMetadataLoading(true);
        const response = await fetch("/api/teacher/assignments");
        if (!response.ok) {
          throw new Error("Failed to load assignment metadata");
        }

        const data = (await response.json()) as {
          classes?: TeacherClass[];
          subjects?: TeacherSubject[];
        };

        if (!cancelled) {
          setClasses(data.classes ?? []);
          setSubjects(data.subjects ?? []);
        }
      } catch (metadataError) {
        console.error("Failed to load assignment metadata:", metadataError);
        if (!cancelled) {
          setClasses([]);
          setSubjects([]);
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [isStudent, status]);

  const subjectMap = useMemo(() => {
    return new Map(
      subjects.map((subject) => [
        subject.id,
        subject.code ? `${subject.name} (${subject.code})` : subject.name,
      ])
    );
  }, [subjects]);

  const classArmMap = useMemo(() => {
    const map = new Map<string, string>();

    classes.forEach((cls) => {
      cls.arms.forEach((arm) => {
        map.set(arm.id, `${cls.name} ${arm.armName}`);
      });
    });

    return map;
  }, [classes]);

  const classArmOptions = useMemo(() => {
    return classes.flatMap((cls) =>
      cls.arms.map((arm) => ({
        id: arm.id,
        label: `${cls.name} ${arm.armName}`,
      }))
    );
  }, [classes]);

  const filteredAssignments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = assignments.filter((assignment) => {
      const summary = getAssignmentSummary(assignment).toLowerCase();
      const subjectLabel = (subjectMap.get(assignment.subjectId) ?? "Untitled subject").toLowerCase();
      const armLabels = assignment.classArmIds
        .map((classArmId) => classArmMap.get(classArmId) ?? "")
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedQuery.length === 0 ||
        assignment.title.toLowerCase().includes(normalizedQuery) ||
        summary.includes(normalizedQuery) ||
        subjectLabel.includes(normalizedQuery) ||
        armLabels.includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && assignment.isPublished) ||
        (statusFilter === "draft" && !assignment.isPublished);

      const matchesSubject =
        subjectFilter === "all" || assignment.subjectId === subjectFilter;

      const matchesClassArm =
        classArmFilter === "all" || assignment.classArmIds.includes(classArmFilter);

      return matchesSearch && matchesStatus && matchesSubject && matchesClassArm;
    });

    filtered.sort((left, right) => {
      if (sortBy === "updated-desc") {
        return right.updatedAt - left.updatedAt;
      }

      if (sortBy === "title-asc") {
        return left.title.localeCompare(right.title);
      }

      return left.dueDate - right.dueDate;
    });

    return filtered;
  }, [assignments, classArmFilter, classArmMap, searchQuery, sortBy, statusFilter, subjectFilter, subjectMap]);

  const assignmentStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysFromNow = now + 1000 * 60 * 60 * 24 * 7;

    return {
      total: assignments.length,
      published: assignments.filter((assignment) => assignment.isPublished).length,
      drafts: assignments.filter((assignment) => !assignment.isPublished).length,
      dueThisWeek: assignments.filter(
        (assignment) => assignment.dueDate >= now && assignment.dueDate <= sevenDaysFromNow
      ).length,
    };
  }, [assignments]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    subjectFilter !== "all" ||
    classArmFilter !== "all" ||
    sortBy !== "due-asc";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSubjectFilter("all");
    setClassArmFilter("all");
    setSortBy("due-asc");
  };

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
    <div className="min-h-screen bg-slate-50">
      <OfflineIndicator />

      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="mt-1 text-sm text-gray-600">Create, filter, and manage assignment tasks in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <Link
              href="/dashboard/assignments/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total assignments</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{assignmentStats.total}</p>
            <p className="mt-1 text-sm text-slate-500">Everything created for your classes.</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Published</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{assignmentStats.published}</p>
            <p className="mt-1 text-sm text-green-700">Visible to students now.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Drafts</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{assignmentStats.drafts}</p>
            <p className="mt-1 text-sm text-amber-700">Still waiting to be published.</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Due in 7 days</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{assignmentStats.dueThisWeek}</p>
            <p className="mt-1 text-sm text-blue-700">Quick view of urgent work.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, subject, class arm, or summary"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as AssignmentStatusFilter)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Subject</label>
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code ? `${subject.name} (${subject.code})` : subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Class arm</label>
                <select
                  value={classArmFilter}
                  onChange={(event) => setClassArmFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All class arms</option>
                  {classArmOptions.map((classArm) => (
                    <option key={classArm.id} value={classArm.id}>
                      {classArm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sort</label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as AssignmentSortOption)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="due-asc">Due date: nearest first</option>
                  <option value="updated-desc">Recently updated</option>
                  <option value="title-asc">Title: A to Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {filteredAssignments.length} of {assignments.length} assignments
              </span>
              {metadataLoading && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  Loading subject and class filters...
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FilterX className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border bg-white" />
            ))}
          </div>
        )}

        {!loading && assignments.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">No assignments yet</h2>
            <p className="mt-1 text-sm text-slate-600">Create your first assignment for students.</p>
            <Link
              href="/dashboard/assignments/create"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Assignment
            </Link>
          </div>
        )}

        {!loading && assignments.length > 0 && filteredAssignments.length === 0 && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">No assignments match these filters</h2>
            <p className="mt-1 text-sm text-slate-600">Adjust your search or clear the active filters to see more results.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FilterX className="h-4 w-4" />
              Reset filters
            </button>
          </div>
        )}

        {!loading && filteredAssignments.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Assignment list</h2>
                <p className="text-sm text-slate-500">A cleaner view of subject, audience, due date, and publishing state.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredAssignments.map((assignment) => {
                const dueState = getDueState(assignment.dueDate);
                const subjectLabel = subjectMap.get(assignment.subjectId) ?? "Unknown subject";
                const classArmLabels = assignment.classArmIds
                  .map((classArmId) => classArmMap.get(classArmId))
                  .filter((label): label is string => Boolean(label));

                return (
                  <article key={assignment.id} className="px-6 py-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              assignment.isPublished
                                ? "border border-green-200 bg-green-50 text-green-700"
                                : "border border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {assignment.isPublished ? "Published" : "Draft"}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${dueState.className}`}>
                            {dueState.label}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            <BookOpen className="h-3.5 w-3.5" />
                            {subjectLabel}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{assignment.title}</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                          {getAssignmentSummary(assignment)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {classArmLabels.length > 0 ? (
                            classArmLabels.map((label) => (
                              <span
                                key={`${assignment.id}_${label}`}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                <Users className="h-3.5 w-3.5" />
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                              <Users className="h-3.5 w-3.5" />
                              {assignment.classArmIds.length} class arm{assignment.classArmIds.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-4 xl:max-w-sm xl:items-end">
                        <div className="grid gap-3 sm:grid-cols-3 xl:w-full xl:grid-cols-1">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Due
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {format(new Date(assignment.dueDate), "EEE, d MMM yyyy")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(assignment.dueDate), "p")} ·{" "}
                              {formatDistanceToNow(assignment.dueDate, { addSuffix: true })}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Target className="h-3.5 w-3.5" />
                              Max score
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{assignment.maxScore} points</p>
                            <p className="text-xs text-slate-500">
                              {assignment.allowLateSubmission ? "Late submission allowed" : "Late submission blocked"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Users className="h-3.5 w-3.5" />
                              Audience
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {assignment.classArmIds.length} class arm{assignment.classArmIds.length === 1 ? "" : "s"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Updated {formatDistanceToNow(assignment.updatedAt, { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          <Link
                            href={`/dashboard/assignments/create?assignmentId=${assignment.id}`}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteAssignment(assignment.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
