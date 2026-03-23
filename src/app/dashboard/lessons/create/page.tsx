/**
 * Create Lesson Page — Lesson Studio (Articulate Storyline-style editor)
 */

'use client';

import { useSession } from 'next-auth/react';
import { redirect, useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { useLessons } from '@/lib/db/hooks';
import { LessonStudio } from '@/components/lessons/studio/LessonStudio';

export const dynamic = 'force-dynamic';

function CreateLessonContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('lessonId');
  const { lessons, loading } = useLessons();

  const selectedLesson = useMemo(() => {
    if (!lessonId) return undefined;
    return lessons.find((lesson) => lesson.id === lessonId);
  }, [lessonId, lessons]);

  if (status === 'loading' || (lessonId && loading)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#12122a' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading studio…</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/auth/login');
  }

  const isStudent =
    (session?.user as any)?.loginType === 'student' ||
    (session?.user as any)?.roles?.includes('STUDENT');

  if (isStudent) {
    redirect(lessonId ? `/dashboard/lessons/${lessonId}` : '/dashboard/lessons');
  }

  return (
    <LessonStudio
      lesson={selectedLesson}
      userId={session.user.id || 'test-user-123'}
    />
  );
}

export default function CreateLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#12122a' }}>
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreateLessonContent />
    </Suspense>
  );
}
