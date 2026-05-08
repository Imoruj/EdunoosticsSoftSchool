'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Download, X, MoreVertical,
  Pencil, Copy, Trash2, ExternalLink, Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Lesson } from '@/lib/db/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LessonCardProps {
  lesson: Lesson;
  isTeacher?: boolean;
  onDownload?: (lessonId: string) => void;
  onUnpin?: (lessonId: string) => void;
  onPin?: (lessonId: string) => void;
  onDelete?: (lessonId: string) => void;
  onDuplicate?: (lessonId: string) => void;
  onRename?: (lessonId: string, title: string) => void;
}

export function LessonCard({
  lesson,
  isTeacher,
  onDownload,
  onUnpin,
  onPin,
  onDelete,
  onDuplicate,
  onRename,
}: LessonCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(lesson.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [menuOpen]);

  // Focus rename input when opened
  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  // Reset delete confirm after 3s if not acted on
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  function submitRename() {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== lesson.title) onRename?.(lesson.id, trimmed);
    setRenaming(false);
  }

  const slideCount = lesson.slides?.length ?? lesson.content?.length ?? 0;

  return (
    <div className="group border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
      <div className="flex items-center gap-4 p-4">
        {/* Icon — clicks navigate to lesson */}
        <button
          onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
          className="flex items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-950/30 rounded-lg shrink-0 hover:bg-blue-100 transition-colors"
        >
          <BookOpen className="w-7 h-7 text-blue-600" />
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !renaming && router.push(`/dashboard/lessons/${lesson.id}`)}
        >
          {renaming ? (
            /* Inline rename input */
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameRef}
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') { setRenameVal(lesson.title); setRenaming(false); }
                }}
                className="flex-1 font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-500 outline-none bg-transparent text-sm"
                autoFocus
              />
              <button onClick={submitRename} className="p-1 text-green-600 hover:text-green-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setRenameVal(lesson.title); setRenaming(false); }} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 transition-colors">
              {lesson.title}
            </h3>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
            {lesson.description || 'No description'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Updated {formatDistanceToNow(lesson.updatedAt, { addSuffix: true })}</span>
            {slideCount > 0 && (
              <>
                <span>•</span>
                <span>{slideCount} {lesson.slides ? 'slides' : 'blocks'}</span>
              </>
            )}
          </div>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            lesson.isPublished
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {lesson.isPublished ? 'Published' : 'Draft'}
          </span>

          {/* Offline controls */}
          {lesson.isDownloaded || lesson.isPinned ? (
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full flex items-center gap-1">
                <Download className="w-3 h-3" />Offline
              </span>
              {lesson.isPinned && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUnpin?.(lesson.id); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Remove from offline"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload?.(lesson.id); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />Save Offline
            </button>
          )}

          {/* ⋮ More actions (teacher only) */}
          {isTeacher && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg py-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Open */}
                  <MenuItem
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    label="Open lesson"
                    onClick={() => { setMenuOpen(false); router.push(`/dashboard/lessons/${lesson.id}`); }}
                  />

                  {/* Edit in studio */}
                  <MenuItem
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    label="Edit in Studio"
                    onClick={() => { setMenuOpen(false); router.push(`/dashboard/lessons/create?lessonId=${lesson.id}`); }}
                  />

                  {/* Rename */}
                  <MenuItem
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    label="Rename"
                    onClick={() => { setMenuOpen(false); setRenameVal(lesson.title); setRenaming(true); }}
                  />

                  {/* Duplicate */}
                  {onDuplicate && (
                    <MenuItem
                      icon={<Copy className="w-3.5 h-3.5" />}
                      label="Duplicate"
                      onClick={() => { setMenuOpen(false); onDuplicate(lesson.id); }}
                    />
                  )}

                  <div className="h-px my-1 mx-2 bg-gray-200 dark:bg-gray-700" />

                  {/* Delete */}
                  {onDelete && (
                    confirmDelete ? (
                      <button
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                        onClick={() => { setMenuOpen(false); setConfirmDelete(false); onDelete(lesson.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />Confirm delete
                      </button>
                    ) : (
                      <MenuItem
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        label="Delete"
                        danger
                        onClick={() => setConfirmDelete(true)}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600'
          : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-100'
      }`}
      onClick={onClick}
    >
      {icon}{label}
    </button>
  );
}

export function LessonCardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 animate-pulse">
      <div className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}
