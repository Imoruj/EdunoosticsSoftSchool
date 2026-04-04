/**
 * React Hooks for Local-First Database Operations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  saveEncrypted,
  getEncrypted,
  getAllEncrypted,
  queryEncrypted,
  deleteItem,
  saveUnencrypted,
  getUnencrypted,
  STORES,
  type StoreName,
} from './indexeddb';
import type { Lesson, Quiz, QuizAttempt, Assignment, AssignmentSubmission, LessonProgress, ChatMessage } from './types';

type PublishedEntityType = 'lesson' | 'quiz' | 'assignment';

function mergeEntitiesById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const merged = new Map<string, T>();

  secondary.forEach((item) => {
    merged.set(item.id, item);
  });

  primary.forEach((item) => {
    merged.set(item.id, item);
  });

  return Array.from(merged.values());
}

function isPublishedItemVisibleToStudent(
  item: { isPublished: boolean; assignedTo?: string[] },
  profileId?: string,
  userId?: string
) {
  if (!item.isPublished) {
    return false;
  }

  const assignedTo = Array.isArray(item.assignedTo) ? item.assignedTo : [];
  if (assignedTo.length === 0) {
    return true;
  }

  return (
    assignedTo.includes('all') ||
    (!!profileId && assignedTo.includes(profileId)) ||
    (!!userId && assignedTo.includes(userId))
  );
}

async function fetchPublishedEntities<T>(type: PublishedEntityType): Promise<T[]> {
  const response = await fetch(`/api/lms/published?type=${type}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Failed to fetch published ${type}s`);
  }

  const data = await response.json();

  if (type === 'lesson') return (data.lessons || []) as T[];
  if (type === 'quiz') return (data.quizzes || []) as T[];
  return (data.assignments || []) as T[];
}

async function fetchPublishedEntityById<T>(type: PublishedEntityType, id: string): Promise<T | null> {
  const response = await fetch(`/api/lms/published?type=${type}&id=${encodeURIComponent(id)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Failed to fetch published ${type}`);
  }

  const data = await response.json();
  const items =
    type === 'lesson'
      ? (data.lessons || [])
      : type === 'quiz'
        ? (data.quizzes || [])
        : (data.assignments || []);

  return (items.find((item: { id: string }) => item.id === id) || null) as T | null;
}

async function syncPublishedEntities<T extends { id: string }>(type: PublishedEntityType, items: T[]) {
  if (items.length === 0) {
    return;
  }

  const response = await fetch('/api/lms/published', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: items.map((payload) => ({
        type,
        payload,
      })),
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Failed to sync published ${type}s`);
  }
}

async function deletePublishedEntity(type: PublishedEntityType, id: string) {
  const response = await fetch('/api/lms/published', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, id }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Failed to delete published ${type}`);
  }
}

/**
 * Get current user IDs from session (both user ID and student profile ID)
 */
function useUserIds() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const roles = Array.isArray(user?.roles) ? (user.roles as string[]) : [];

  return {
    userId: session?.user?.id,
    profileId: user?.loginProfileId as string | undefined,
    isStudent: user?.loginType === 'student' || roles.includes('STUDENT'),
  };
}

/**
 * Get current user ID from session
 */
function useUserId() {
  const { userId } = useUserIds();
  return userId;
}

/**
 * Hook for managing lessons
 */
export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId, profileId, isStudent } = useUserIds();

  const loadLessons = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let data: Lesson[] = [];
      try {
        data = await getAllEncrypted<Lesson>(STORES.LESSONS, userId);
      } catch (encryptionError) {
        // Fallback: try to load unencrypted data
        console.debug('Master key not set up, loading unencrypted lessons:', encryptionError);
        const db = await import('./indexeddb').then(m => m.initLocalDB());
        const transaction = db.transaction([STORES.LESSONS], 'readonly');
        const store = transaction.objectStore(STORES.LESSONS);
        const request = store.getAll();

        data = await new Promise<Lesson[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });

        db.close();
      }

      if (isStudent) {
        try {
          const remoteLessons = await fetchPublishedEntities<Lesson>('lesson');
          const cachedRemoteLessons = data.filter((lesson) => remoteLessons.some((remoteLesson) => remoteLesson.id === lesson.id));
          setLessons(mergeEntitiesById(remoteLessons, cachedRemoteLessons));
          setError(null);
          return;
        } catch (remoteError) {
          console.debug('Failed to fetch published lessons from server, using local cache:', remoteError);
        }

        setLessons(data.filter((lesson) => isPublishedItemVisibleToStudent(lesson, profileId, userId)));
        setError(null);
        return;
      }

      setLessons(data.filter(l =>
        l.createdById === userId ||
        (l.isPublished && (
          l.assignedTo?.includes('all') ||
          l.assignedTo?.includes(userId) ||
          (profileId && l.assignedTo?.includes(profileId))
        ))
      ));
      setError(null);

      const ownedLessons = data.filter((lesson) => lesson.createdById === userId);
      void syncPublishedEntities('lesson', ownedLessons).catch((syncError) => {
        console.error('Failed to sync lessons to published feed:', syncError);
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isStudent, profileId, userId]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const saveLesson = useCallback(
    async (lesson: Lesson) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await saveEncrypted(STORES.LESSONS, lesson, userId);
      } catch (error) {
        // Fallback to unencrypted storage if encryption key is not available
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.LESSONS, lesson);
      }
      await syncPublishedEntities('lesson', [lesson]);
      await loadLessons();
    },
    [userId, loadLessons]
  );

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      await deleteItem(STORES.LESSONS, lessonId);
      await deletePublishedEntity('lesson', lessonId);
      await loadLessons();
    },
    [loadLessons]
  );

  const getLessonsBySubject = useCallback(
    async (subjectId: string) => {
      if (!userId) return [];
      return await queryEncrypted<Lesson>(STORES.LESSONS, 'subjectId', subjectId, userId);
    },
    [userId]
  );

  return {
    lessons,
    loading,
    error,
    saveLesson,
    deleteLesson,
    getLessonsBySubject,
    refresh: loadLessons,
  };
}

/**
 * Hook for a single lesson
 */
export function useLesson(lessonId: string | null) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId, profileId, isStudent } = useUserIds();

  const loadLesson = useCallback(async () => {
    if (!userId || !lessonId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (isStudent) {
        try {
          const publishedLesson = await fetchPublishedEntityById<Lesson>('lesson', lessonId);
          if (publishedLesson) {
            setLesson(publishedLesson);
            setError(null);
            return;
          }
        } catch (remoteError) {
          console.debug('Failed to fetch published lesson from server, using local cache:', remoteError);
        }
      }

      let data: Lesson | null = null;
      try {
        data = await getEncrypted<Lesson>(STORES.LESSONS, lessonId, userId);
      } catch (encryptionError) {
        // Fallback: try to load unencrypted data
        console.debug('Master key not set up, loading unencrypted lesson:', encryptionError);
        data = await getUnencrypted<Lesson>(STORES.LESSONS, lessonId);
      }
      if (isStudent && data && !isPublishedItemVisibleToStudent(data, profileId, userId)) {
        setLesson(null);
      } else {
        setLesson(data);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isStudent, lessonId, profileId, userId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const updateLesson = useCallback(
    async (updates: Partial<Lesson>) => {
      if (!userId || !lesson) throw new Error('Cannot update lesson');

      const updated = { ...lesson, ...updates, updatedAt: Date.now() };
      try {
        await saveEncrypted(STORES.LESSONS, updated, userId);
      } catch (error) {
        // Fallback to unencrypted storage if encryption key is not available
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.LESSONS, updated);
      }
      await syncPublishedEntities('lesson', [updated]);
      setLesson(updated);
    },
    [userId, lesson]
  );

  return {
    lesson,
    loading,
    error,
    updateLesson,
    refresh: loadLesson,
  };
}

/**
 * Hook for managing quizzes
 */
export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId, profileId, isStudent } = useUserIds();

  const loadQuizzes = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let data: Quiz[] = [];
      try {
        data = await getAllEncrypted<Quiz>(STORES.QUIZZES, userId);
      } catch (encryptionError) {
        // Fallback: try to load unencrypted data
        console.debug('Master key not set up, loading unencrypted quizzes:', encryptionError);
        const db = await import('./indexeddb').then(m => m.initLocalDB());
        const transaction = db.transaction([STORES.QUIZZES], 'readonly');
        const store = transaction.objectStore(STORES.QUIZZES);
        const request = store.getAll();

        data = await new Promise<Quiz[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });

        db.close();
      }

      if (isStudent) {
        try {
          const remoteQuizzes = await fetchPublishedEntities<Quiz>('quiz');
          const cachedRemoteQuizzes = data.filter((quiz) => remoteQuizzes.some((remoteQuiz) => remoteQuiz.id === quiz.id));
          setQuizzes(mergeEntitiesById(remoteQuizzes, cachedRemoteQuizzes));
          setError(null);
          return;
        } catch (remoteError) {
          console.debug('Failed to fetch published quizzes from server, using local cache:', remoteError);
        }

        setQuizzes(data.filter((quiz) => isPublishedItemVisibleToStudent(quiz, profileId, userId)));
        setError(null);
        return;
      }

      setQuizzes(data);
      setError(null);

      const ownedQuizzes = data.filter((quiz) => quiz.createdById === userId);
      void syncPublishedEntities('quiz', ownedQuizzes).catch((syncError) => {
        console.error('Failed to sync quizzes to published feed:', syncError);
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isStudent, profileId, userId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const saveQuiz = useCallback(
    async (quiz: Quiz) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await saveEncrypted(STORES.QUIZZES, quiz, userId);
      } catch (error) {
        // Fallback to unencrypted storage if encryption key is not available
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.QUIZZES, quiz);
      }
      await syncPublishedEntities('quiz', [quiz]);
      await loadQuizzes();
    },
    [userId, loadQuizzes]
  );

  const deleteQuiz = useCallback(
    async (quizId: string) => {
      await deleteItem(STORES.QUIZZES, quizId);
      await deletePublishedEntity('quiz', quizId);
      await loadQuizzes();
    },
    [loadQuizzes]
  );

  return {
    quizzes,
    loading,
    error,
    saveQuiz,
    deleteQuiz,
    refresh: loadQuizzes,
  };
}

/**
 * Hook for managing quiz attempts
 */
export function useQuizAttempts(quizId?: string) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userId = useUserId();

  const loadAttempts = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let data: QuizAttempt[] = [];
      try {
        if (quizId) {
          data = await queryEncrypted<QuizAttempt>(STORES.QUIZ_ATTEMPTS, 'quizId', quizId, userId);
        } else {
          data = await getAllEncrypted<QuizAttempt>(STORES.QUIZ_ATTEMPTS, userId);
        }
      } catch (encryptionError) {
        console.debug('Master key not set up, loading unencrypted attempts:', encryptionError);
        const db = await import('./indexeddb').then(m => m.initLocalDB());
        const transaction = db.transaction([STORES.QUIZ_ATTEMPTS], 'readonly');
        const store = transaction.objectStore(STORES.QUIZ_ATTEMPTS);

        let request;
        if (quizId) {
          const index = store.index('quizId');
          request = index.getAll(quizId);
        } else {
          request = store.getAll();
        }

        data = await new Promise<QuizAttempt[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });

        db.close();
      }

      // Filter strictly by the current user to prevent cross-contamination
      const userAttempts = data.filter(a => a.studentId === userId);
      setAttempts(userAttempts);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, quizId]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  const saveAttempt = useCallback(
    async (attempt: QuizAttempt) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await saveEncrypted(STORES.QUIZ_ATTEMPTS, attempt, userId);
      } catch (error) {
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.QUIZ_ATTEMPTS, attempt);
      }
      await loadAttempts();
    },
    [userId, loadAttempts]
  );

  return {
    attempts,
    loading,
    error,
    saveAttempt,
    refresh: loadAttempts,
  };
}

/**
 * Hook for managing assignments
 */
export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId, profileId, isStudent } = useUserIds();

  const loadAssignments = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let data: Assignment[] = [];
      try {
        data = await getAllEncrypted<Assignment>(STORES.ASSIGNMENTS, userId);
      } catch (encryptionError) {
        console.debug('Master key not set up, loading unencrypted assignments:', encryptionError);
        const db = await import('./indexeddb').then(m => m.initLocalDB());
        const transaction = db.transaction([STORES.ASSIGNMENTS], 'readonly');
        const store = transaction.objectStore(STORES.ASSIGNMENTS);
        const request = store.getAll();

        data = await new Promise<Assignment[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });

        db.close();
      }

      if (isStudent) {
        try {
          const remoteAssignments = await fetchPublishedEntities<Assignment>('assignment');
          const cachedRemoteAssignments = data.filter((assignment) =>
            remoteAssignments.some((remoteAssignment) => remoteAssignment.id === assignment.id)
          );
          setAssignments(mergeEntitiesById(remoteAssignments, cachedRemoteAssignments));
          setError(null);
          return;
        } catch (remoteError) {
          console.debug('Failed to fetch published assignments from server, using local cache:', remoteError);
        }

        setAssignments(data.filter((assignment) => isPublishedItemVisibleToStudent(assignment, profileId, userId)));
        setError(null);
        return;
      }

      setAssignments(data);
      setError(null);

      const ownedAssignments = data.filter((assignment) => assignment.createdById === userId);
      void syncPublishedEntities('assignment', ownedAssignments).catch((syncError) => {
        console.error('Failed to sync assignments to published feed:', syncError);
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isStudent, profileId, userId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const saveAssignment = useCallback(
    async (assignment: Assignment) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await saveEncrypted(STORES.ASSIGNMENTS, assignment, userId);
      } catch (error) {
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.ASSIGNMENTS, assignment);
      }
      await syncPublishedEntities('assignment', [assignment]);
      await loadAssignments();
    },
    [userId, loadAssignments]
  );

  const deleteAssignment = useCallback(
    async (assignmentId: string) => {
      await deleteItem(STORES.ASSIGNMENTS, assignmentId);
      await deletePublishedEntity('assignment', assignmentId);
      await loadAssignments();
    },
    [loadAssignments]
  );

  return {
    assignments,
    loading,
    error,
    saveAssignment,
    deleteAssignment,
    refresh: loadAssignments,
  };
}

/**
 * Hook for managing assignment submissions
 */
export function useSubmissions(assignmentId?: string) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userId = useUserId();

  const loadSubmissions = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let data: AssignmentSubmission[] = [];
      try {
        if (assignmentId) {
          data = await queryEncrypted<AssignmentSubmission>(STORES.SUBMISSIONS, 'assignmentId', assignmentId, userId);
        } else {
          data = await getAllEncrypted<AssignmentSubmission>(STORES.SUBMISSIONS, userId);
        }
      } catch (encryptionError) {
        console.debug('Master key not set up, loading unencrypted submissions:', encryptionError);
        const db = await import('./indexeddb').then(m => m.initLocalDB());
        const transaction = db.transaction([STORES.SUBMISSIONS], 'readonly');
        const store = transaction.objectStore(STORES.SUBMISSIONS);

        let request;
        if (assignmentId) {
          const index = store.index('assignmentId');
          request = index.getAll(assignmentId);
        } else {
          request = store.getAll();
        }

        data = await new Promise<AssignmentSubmission[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });

        db.close();
      }

      setSubmissions(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, assignmentId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const saveSubmission = useCallback(
    async (submission: AssignmentSubmission) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await saveEncrypted(STORES.SUBMISSIONS, submission, userId);
      } catch (error) {
        console.debug('Encryption failed, using unencrypted storage:', error);
        await saveUnencrypted(STORES.SUBMISSIONS, submission);
      }
      await loadSubmissions();
    },
    [userId, loadSubmissions]
  );

  return {
    submissions,
    loading,
    error,
    saveSubmission,
    refresh: loadSubmissions,
  };
}

/**
 * Hook for lesson progress tracking
 */
export function useLessonProgress(lessonId: string) {
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  const loadProgress = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const progressId = `${userId}_${lessonId}`;
      const data = await getUnencrypted<LessonProgress>(STORES.PROGRESS, progressId);
      setProgress(data);
    } catch (err) {
      console.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, lessonId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const updateProgress = useCallback(
    async (updates: Partial<LessonProgress>) => {
      if (!userId) return;

      const progressId = `${userId}_${lessonId}`;
      const updated: LessonProgress = {
        id: progressId,
        lessonId,
        studentId: userId,
        isCompleted: false,
        progress: 0,
        lastAccessedAt: Date.now(),
        ...progress,
        ...updates,
      };

      await saveUnencrypted(STORES.PROGRESS, updated);
      setProgress(updated);
    },
    [userId, lessonId, progress]
  );

  const markComplete = useCallback(async () => {
    await updateProgress({
      isCompleted: true,
      completedAt: Date.now(),
      progress: 100,
    });
  }, [updateProgress]);

  return {
    progress,
    loading,
    updateProgress,
    markComplete,
  };
}

/**
 * Hook for chat messages
 */
export function useMessages(streamId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  const loadMessages = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await queryEncrypted<ChatMessage>(
        STORES.MESSAGES,
        'streamId',
        streamId,
        userId
      );
      // Sort by sentAt
      data.sort((a, b) => a.sentAt - b.sentAt);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, streamId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId) throw new Error('User not authenticated');

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36)}`,
        streamId,
        senderId: userId,
        content,
        sentAt: Date.now(),
        isEdited: false,
        readBy: [userId],
        encryptedKeys: {}, // Will be populated during encryption
      };

      await saveEncrypted(STORES.MESSAGES, message, userId);
      await loadMessages();

      return message;
    },
    [userId, streamId, loadMessages]
  );

  return {
    messages,
    loading,
    sendMessage,
    refresh: loadMessages,
  };
}

/**
 * Hook for sync status
 */
export function useSyncStatus() {
  const [syncState, setSyncState] = useState<'offline' | 'synced' | 'syncing' | 'p2p'>('offline');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    // Check online/offline status
    const updateOnlineStatus = () => {
      setSyncState(navigator.onLine ? 'synced' : 'offline');
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return {
    syncState,
    lastSyncAt,
    isOnline: syncState !== 'offline',
  };
}
