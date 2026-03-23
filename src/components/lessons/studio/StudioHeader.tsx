'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Save, Eye, Upload, CheckCircle2, Loader2, Undo2, Redo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { StudioAction, StudioState } from './useStudioState';

interface StudioHeaderProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => void;
  saving: boolean;
}

export function StudioHeader({ state, dispatch, onSave, onPublish, onPreview, saving }: StudioHeaderProps) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(state.lesson.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.select();
  }, [editingTitle]);

  function commitTitle() {
    const t = titleDraft.trim() || 'Untitled Lesson';
    dispatch({ type: 'UPDATE_LESSON_TITLE', title: t });
    setTitleDraft(t);
    setEditingTitle(false);
  }

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <header
      className="flex items-center gap-2 px-4 shrink-0 select-none"
      style={{ height: 48, background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}
    >
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/lessons')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors shrink-0 pr-3 mr-1"
        style={{ borderRight: '1px solid #e2e8f0' }}
      >
        <ChevronLeft size={14} />
        Lessons
      </button>

      {/* Title */}
      {editingTitle ? (
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTitle();
            if (e.key === 'Escape') { setTitleDraft(state.lesson.title); setEditingTitle(false); }
          }}
          className="text-sm font-medium text-slate-900 px-2 py-0.5 rounded border border-indigo-400 outline-none w-56"
          style={{ background: '#f8fafc' }}
        />
      ) : (
        <button
          onClick={() => setEditingTitle(true)}
          className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate max-w-[220px]"
          title="Rename lesson"
        >
          {state.lesson.title || 'Untitled Lesson'}
        </button>
      )}

      {/* Save indicator */}
      {saving ? (
        <Loader2 size={11} className="animate-spin text-indigo-500 ml-1" />
      ) : state.isDirty ? (
        <span className="text-amber-500 text-xs ml-1" title="Unsaved changes">●</span>
      ) : (
        <CheckCircle2 size={11} className="text-emerald-500 ml-1" />
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Btn onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={13} />
        </Btn>
        <Btn onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={13} />
        </Btn>
      </div>

      <div className="w-px h-4 mx-2 bg-slate-200" />

      <button
        onClick={onPreview}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
      >
        <Eye size={13} />
        Preview
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40 border border-slate-200"
      >
        <Save size={13} />
        Save
      </button>

      <button
        onClick={onPublish}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all disabled:opacity-40 ml-1"
        style={{ background: '#4f46e5' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#4338ca')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#4f46e5')}
      >
        <Upload size={13} />
        Publish
      </button>
    </header>
  );
}

function Btn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
