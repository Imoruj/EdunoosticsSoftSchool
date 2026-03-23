'use client';

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { SlideElement, TextBlockData } from '@/lib/db/types';
import type { StudioAction } from '../useStudioState';
import { RichTextEditor } from '@/components/lessons/RichTextEditor';

interface TextEditorModalProps {
  element: SlideElement;
  slideId: string;
  dispatch: React.Dispatch<StudioAction>;
  onClose: () => void;
}

export function TextEditorModal({ element, slideId, dispatch, onClose }: TextEditorModalProps) {
  const data = element.data as TextBlockData;
  const [html, setHtml] = useState(data?.content ?? '');

  function save() {
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId,
      elementId: element.id,
      patch: { data: { ...data, content: html, format: 'html' } as TextBlockData },
    });
    onClose();
  }

  return (
    <ModalShell title="Edit Text" onClose={onClose}>
      <div className="flex-1 overflow-hidden flex flex-col gap-3">
        <RichTextEditor
          content={html}
          onChange={setHtml}
          placeholder="Type your text here…"
          minHeight="300px"
        />
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium text-white transition-colors"
          style={{ background: '#4f46e5' }}
        >
          <Save size={13} />
          Save
        </button>
      </div>
    </ModalShell>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="relative flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: '#1e1b4b',
          border: '1px solid rgba(79,70,229,0.3)',
          width: wide ? 900 : 680,
          maxWidth: '95vw',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
