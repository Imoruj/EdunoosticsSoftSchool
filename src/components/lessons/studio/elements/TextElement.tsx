'use client';

import React, { useEffect, useId, useRef } from 'react';
import type { TextBlockData } from '@/lib/db/types';

interface TextElementViewProps {
  data: TextBlockData;
  editing?: boolean;
  onEditEnd?: (html: string) => void;
}

export function TextElementView({ data, editing = false, onEditEnd }: TextElementViewProps) {
  const raw = useId();
  const elId = `te-${raw.replace(/:/g, '')}`;
  const contentRef = useRef<HTMLDivElement>(null);

  // When entering edit mode: set innerHTML and focus
  useEffect(() => {
    if (!editing || !contentRef.current) return;
    const html = data?.content ?? '';
    // Only set if content differs to avoid cursor reset on re-render
    if (contentRef.current.innerHTML !== html) {
      contentRef.current.innerHTML = html;
    }
    contentRef.current.focus();
    // Place cursor at end
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch (_) { /* ignore */ }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBlur() {
    if (contentRef.current) {
      onEditEnd?.(contentRef.current.innerHTML);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Esc ends editing; Enter is allowed (new line in rich content)
    if (e.key === 'Escape') {
      contentRef.current?.blur();
    }
    // Prevent canvas shortcuts (Delete, arrows) from firing while typing
    e.stopPropagation();
  }

  // Build CSS override rules for font/color (need !important to beat inline styles)
  const rules: string[] = [];
  if (data?.textColor) {
    rules.push(`#${elId} * { color: ${data.textColor} !important; }`);
  }
  if (data?.fontSize) {
    rules.push(`#${elId} p,#${elId} h1,#${elId} h2,#${elId} h3,#${elId} span,#${elId} li { font-size: ${data.fontSize}px !important; }`);
  }
  if (data?.fontFamily) {
    rules.push(`#${elId} * { font-family: ${data.fontFamily} !important; }`);
  }

  return (
    <div
      id={elId}
      className="w-full h-full overflow-hidden"
      style={{ padding: '8px 10px', textAlign: data?.textAlign ?? 'left' }}
    >
      {rules.length > 0 && <style>{rules.join('\n')}</style>}

      {editing ? (
        /* Inline editable — no dangerouslySetInnerHTML (set via useEffect) */
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ outline: 'none', minHeight: '1em', cursor: 'text', whiteSpace: 'pre-wrap', userSelect: 'text', height: '100%' }}
        />
      ) : (
        /* Read-only render */
        <div
          dangerouslySetInnerHTML={{ __html: data?.content ?? '<p style="color:#94a3b8;font-style:italic">Double-click to edit…</p>' }}
        />
      )}
    </div>
  );
}
