/**
 * Lesson Card Component
 * Displays a single lesson with download/offline controls
 */

'use client';

import { BookOpen, Download, X, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Lesson } from '@/lib/db/types';
import Link from 'next/link';

interface LessonCardProps {
  lesson: Lesson;
  onDownload?: (lessonId: string) => void;
  onUnpin?: (lessonId: string) => void;
  onPin?: (lessonId: string) => void;
}

export function LessonCard({ lesson, onDownload, onUnpin, onPin }: LessonCardProps) {
  return (
    <Link href={`/dashboard/lessons/${lesson.id}`}>
      <div className="group border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white">
        <div className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 bg-blue-50 rounded-lg flex-shrink-0">
            <BookOpen className="w-7 h-7 text-blue-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {lesson.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
              {lesson.description || 'No description'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>
                Updated {formatDistanceToNow(lesson.updatedAt, { addSuffix: true })}
              </span>
              {lesson.content.length > 0 && (
                <>
                  <span>•</span>
                  <span>{lesson.content.length} blocks</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Published badge */}
            {lesson.isPublished ? (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Published
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                Draft
              </span>
            )}

            {/* Download/Offline controls */}
            {lesson.isDownloaded || lesson.isPinned ? (
              <div className="flex items-center gap-1">
                <div className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>Offline</span>
                </div>
                {lesson.isPinned && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onUnpin?.(lesson.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Remove from offline"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDownload?.(lesson.id);
                }}
                className="px-3 py-1.5 border border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Offline</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function LessonCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg bg-white animate-pulse">
      <div className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-200 rounded-full" />
          <div className="h-7 w-28 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
