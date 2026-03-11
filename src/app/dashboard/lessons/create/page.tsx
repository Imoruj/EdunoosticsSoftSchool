/**
 * Create Lesson Page
 * Page for creating new lessons with the lesson editor
 */

'use client';

import { useSession } from 'next-auth/react';
import { LessonEditor } from '@/components/lessons/LessonEditor';
import { redirect, useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { useLessons } from '@/lib/db/hooks';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  return <LessonEditor lesson={selectedLesson} userId={session.user.id || 'test-user-123'} />;
}

export default function CreateLessonPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CreateLessonContent />
    </Suspense>
  );
}
