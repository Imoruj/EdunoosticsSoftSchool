'use client';

import { Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { useLessons } from '@/lib/db/hooks';
import { LessonCard, LessonCardSkeleton } from '@/components/lessons/LessonCard';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { SyncStatus } from '@/components/sync/SyncStatus';
import type { Lesson } from '@/lib/db/types';

export default function LessonsPage() {
  const { data: session, status } = useSession();
  const { lessons, loading, error, deleteLesson, saveLesson } = useLessons();

  const isStudent =
    (session?.user as any)?.loginType === 'student' ||
    (session?.user as any)?.roles?.includes('STUDENT');
  const studentProfileId = (session?.user as any)?.loginProfileId as string | undefined;
  const studentUserId = (session?.user as any)?.id as string | undefined;

  const visibleLessons = useMemo(() => {
    if (!isStudent) return lessons;
    const sid = studentProfileId || studentUserId;
    return lessons.filter(
      (l) =>
        l.isPublished &&
        (
          !Array.isArray(l.assignedTo) ||
          l.assignedTo.length === 0 ||
          l.assignedTo.includes('all') ||
          (sid && l.assignedTo.includes(sid))
        )
    );
  }, [lessons, isStudent, studentProfileId, studentUserId]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (lessonId: string) => {
    await deleteLesson(lessonId);
  }, [deleteLesson]);

  const handleDuplicate = useCallback(async (lessonId: string) => {
    const original = lessons.find((l) => l.id === lessonId);
    if (!original) return;
    const copy: Lesson = {
      ...original,
      id: `lesson-${Date.now()}`,
      title: `${original.title} (copy)`,
      isPublished: false,
      publishedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveLesson(copy);
  }, [lessons, saveLesson]);

  const handleRename = useCallback(async (lessonId: string, title: string) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    await saveLesson({ ...lesson, title, updatedAt: Date.now() });
  }, [lessons, saveLesson]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <LessonCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isStudent ? 'My Lessons' : 'Lessons'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isStudent
                  ? 'Lessons assigned to you by your teachers.'
                  : 'Manage and access your lesson content'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatus />
              {!isStudent && (
                <Link
                  href="/dashboard/lessons/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Lesson
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">Error loading lessons: {error.message}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <LessonCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && visibleLessons.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isStudent ? 'No lessons assigned yet' : 'No lessons yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isStudent
                ? 'Published lessons assigned to you will appear here.'
                : 'Get started by creating your first lesson'}
            </p>
            {!isStudent && (
              <Link
                href="/dashboard/lessons/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Lesson
              </Link>
            )}
          </div>
        )}

        {!loading && !error && visibleLessons.length > 0 && (
          <div className="space-y-3">
            {visibleLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                isTeacher={!isStudent}
                onDownload={(id) => console.log('Download', id)}
                onUnpin={(id) => console.log('Unpin', id)}
                onDelete={!isStudent ? handleDelete : undefined}
                onDuplicate={!isStudent ? handleDuplicate : undefined}
                onRename={!isStudent ? handleRename : undefined}
              />
            ))}
          </div>
        )}

        {/* Stats — teachers only */}
        {!isStudent && !loading && !error && visibleLessons.length > 0 && (
          <div className="mt-8 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-600">Total Lessons</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{lessons.length}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {lessons.filter((l) => l.isPublished).length}
              </p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-600">Saved Offline</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {lessons.filter((l) => l.isDownloaded || l.isPinned).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
