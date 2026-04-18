'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLessonProgress } from '@/lib/db/hooks';

/**
 * Hook to provide a SCORM 1.2 / 2004 compatible API for Adapt courses.
 * This object is injected into the window parent so the iframe course can find it.
 */
export function useScormApi(lessonId: string) {
  const { progress, updateProgress, markComplete } = useLessonProgress(lessonId);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const initScorm = useCallback(() => {
    const scorm12 = {
      LMSInitialize: () => {
        console.log('[SCORM 1.2] Initialize');
        return "true";
      },
      LMSFinish: () => {
        console.log('[SCORM 1.2] Finish');
        return "true";
      },
      LMSGetValue: (key: string) => {
        console.log('[SCORM 1.2] GetValue:', key);
        if (key === 'cmi.core.student_id') return 'student';
        if (key === 'cmi.core.lesson_status') return progressRef.current?.isCompleted ? 'completed' : 'incomplete';
        if (key === 'cmi.core.score.raw') return String(progressRef.current?.progress || 0);
        return "";
      },
      LMSSetValue: (key: string, value: string) => {
        console.log('[SCORM 1.2] SetValue:', key, value);
        if (key === 'cmi.core.score.raw') {
          updateProgress({ progress: parseInt(value, 10) });
        }
        if (key === 'cmi.core.lesson_status' && (value === 'completed' || value === 'passed')) {
          markComplete();
        }
        return "true";
      },
      LMSCommit: () => "true",
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "No error",
      LMSGetDiagnostic: () => "No error",
    };

    const scorm2004 = {
      Initialize: () => "true",
      Terminate: () => "true",
      GetValue: (key: string) => {
        if (key === 'cmi.completion_status') return progressRef.current?.isCompleted ? 'completed' : 'incomplete';
        if (key === 'cmi.score.raw') return String(progressRef.current?.progress || 0);
        return "";
      },
      SetValue: (key: string, value: string) => {
        if (key === 'cmi.score.raw') {
          updateProgress({ progress: parseInt(value, 10) });
        }
        if (key === 'cmi.completion_status' && value === 'completed') {
          markComplete();
        }
        if (key === 'cmi.success_status' && value === 'passed') {
           markComplete();
        }
        return "true";
      },
      Commit: () => "true",
      GetLastError: () => "0",
      GetErrorString: () => "No error",
      GetDiagnostic: () => "No error",
    };

    // Typical Adapt/SCORM discovery logic:
    // 1. Look for API or API_1484_11 in window or window.parent
    (window as any).API = scorm12;
    (window as any).API_1484_11 = scorm2004;

    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [updateProgress, markComplete]);

  useEffect(() => {
    return initScorm();
  }, [initScorm]);

  return { isReady: !!progress };
}
