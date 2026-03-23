'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { SlideElement } from '@/lib/db/types';
import type { StudioAction } from './useStudioState';
import { TextElementView } from './elements/TextElement';
import { ImageElementView } from './elements/ImageElement';
import { VideoElementView } from './elements/VideoElement';
import { AudioElementView } from './elements/AudioElement';
import { QuizElementView } from './elements/QuizElement';
import { EmbedElementView } from './elements/EmbedElement';
import { Lock, Copy, Trash2 } from 'lucide-react';

interface CanvasElementProps {
  element: SlideElement;
  slideId: string;
  isSelected: boolean;
  isPlaying: boolean;
  playhead: number;
  dispatch: React.Dispatch<StudioAction>;
  canvasRef: React.RefObject<HTMLDivElement>;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
};

const MIN_SIZE = 5; // % minimum width/height

export function CanvasElement({
  element,
  slideId,
  isSelected,
  isPlaying,
  playhead,
  dispatch,
  canvasRef,
}: CanvasElementProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
    mode: 'move' | ResizeHandle;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Visibility based on timeline during play
  const isVisible = isPlaying
    ? playhead >= element.startTime && playhead <= element.endTime
    : true;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    opacity: isVisible ? (element.opacity ?? 1) : 0,
    borderRadius: element.borderRadius ?? 0,
    boxShadow: element.shadow ? '0 4px 16px rgba(0,0,0,0.25)' : undefined,
    background: element.background ?? 'transparent',
    cursor: element.locked ? 'not-allowed' : isSelected ? 'move' : 'pointer',
    transition: isPlaying ? `opacity 0.3s ease` : 'none',
    userSelect: 'none',
    overflow: 'visible',
  };

  function canvasSize() {
    const r = canvasRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 960, h: r?.height ?? 540 };
  }

  // ── Pointer drag / resize ─────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent, mode: 'move' | ResizeHandle = 'move') {
    if (element.locked) return;
    e.stopPropagation();
    dispatch({ type: 'SELECT_ELEMENT', elementId: element.id });

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
      origW: element.width,
      origH: element.height,
      mode,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragState.current) return;
    const { w, h } = canvasSize();
    const ds = dragState.current;
    const dx = ((e.clientX - ds.startX) / w) * 100;
    const dy = ((e.clientY - ds.startY) / h) * 100;

    if (ds.mode === 'move') {
      const nx = Math.max(0, Math.min(100 - element.width, ds.origX + dx));
      const ny = Math.max(0, Math.min(100 - element.height, ds.origY + dy));
      dispatch({ type: 'MOVE_ELEMENT', slideId, elementId: element.id, x: nx, y: ny });
      return;
    }

    // Resize logic
    let { origX: x, origY: y, origW: w2, origH: h2 } = ds;
    const handle = ds.mode;

    if (handle.includes('e')) { w2 = Math.max(MIN_SIZE, ds.origW + dx); }
    if (handle.includes('w')) { x = ds.origX + dx; w2 = Math.max(MIN_SIZE, ds.origW - dx); }
    if (handle.includes('s')) { h2 = Math.max(MIN_SIZE, ds.origH + dy); }
    if (handle.includes('n')) { y = ds.origY + dy; h2 = Math.max(MIN_SIZE, ds.origH - dy); }

    // Clamp
    x = Math.max(0, x);
    y = Math.max(0, y);
    w2 = Math.min(100 - x, w2);
    h2 = Math.min(100 - y, h2);

    dispatch({ type: 'RESIZE_ELEMENT', slideId, elementId: element.id, x, y, width: w2, height: h2 });
  }

  function onPointerUp() {
    dragState.current = null;
    window.removeEventListener('pointermove', onPointerMove);
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSelected) return;
    function onKey(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'DELETE_ELEMENT', slideId, elementId: element.id });
      }
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') dispatch({ type: 'MOVE_ELEMENT', slideId, elementId: element.id, x: Math.max(0, element.x - step), y: element.y });
      if (e.key === 'ArrowRight') dispatch({ type: 'MOVE_ELEMENT', slideId, elementId: element.id, x: Math.min(100 - element.width, element.x + step), y: element.y });
      if (e.key === 'ArrowUp') dispatch({ type: 'MOVE_ELEMENT', slideId, elementId: element.id, x: element.x, y: Math.max(0, element.y - step) });
      if (e.key === 'ArrowDown') dispatch({ type: 'MOVE_ELEMENT', slideId, elementId: element.id, x: element.x, y: Math.min(100 - element.height, element.y + step) });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSelected, element.x, element.y, element.width, element.height, slideId, element.id, dispatch]);

  // ── Double-click to edit ──────────────────────────────────────────────────

  function onDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (element.type === 'text') {
      dispatch({ type: 'OPEN_MODAL', modal: { type: 'text-editor', elementId: element.id } });
    } else if (element.type === 'quiz') {
      dispatch({ type: 'OPEN_MODAL', modal: { type: 'quiz-builder', elementId: element.id } });
    }
  }

  // ── Context menu ─────────────────────────────────────────────────────────

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'SELECT_ELEMENT', elementId: element.id });
    setContextMenu(true);
  }

  const selectionColor = '#6366f1';

  return (
    <div
      ref={elRef}
      style={style}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_ELEMENT', elementId: element.id });
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Element content */}
      <ElementContent element={element} slideId={slideId} dispatch={dispatch} />

      {/* Selection ring */}
      {isSelected && !isPlaying && (
        <>
          {/* Border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ outline: `2px solid ${selectionColor}`, outlineOffset: 0, borderRadius: element.borderRadius ?? 0 }}
          />

          {/* Resize handles */}
          {HANDLES.map((handle) => (
            <ResizeHandleEl
              key={handle}
              handle={handle}
              color={selectionColor}
              onPointerDown={(e) => onPointerDown(e, handle)}
            />
          ))}

          {/* Toolbar above element */}
          <div
            className="absolute -top-7 right-0 flex items-center gap-0.5 px-1 py-0.5 rounded z-50"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {element.locked && <Lock size={10} style={{ color: '#94a3b8', margin: '0 2px' }} />}
            <button
              style={{ padding: 3, borderRadius: 3, color: '#64748b' }}
              title="Duplicate"
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_ELEMENT', slideId, elementId: element.id }); }}
            >
              <Copy size={10} />
            </button>
            <button
              style={{ padding: 3, borderRadius: 3, color: '#f87171' }}
              title="Delete"
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171'; }}
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_ELEMENT', slideId, elementId: element.id }); }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          onDuplicate={() => { dispatch({ type: 'DUPLICATE_ELEMENT', slideId, elementId: element.id }); setContextMenu(false); }}
          onDelete={() => { dispatch({ type: 'DELETE_ELEMENT', slideId, elementId: element.id }); setContextMenu(false); }}
          onLock={() => { dispatch({ type: 'UPDATE_ELEMENT', slideId, elementId: element.id, patch: { locked: !element.locked } }); setContextMenu(false); }}
          onBringForward={() => { dispatch({ type: 'UPDATE_ELEMENT', slideId, elementId: element.id, patch: { zIndex: element.zIndex + 1 } }); setContextMenu(false); }}
          onSendBackward={() => { dispatch({ type: 'UPDATE_ELEMENT', slideId, elementId: element.id, patch: { zIndex: Math.max(1, element.zIndex - 1) } }); setContextMenu(false); }}
          onClose={() => setContextMenu(false)}
          locked={!!element.locked}
        />
      )}
    </div>
  );
}

// ─── Resize Handle ────────────────────────────────────────────────────────────

function ResizeHandleEl({
  handle,
  color,
  onPointerDown,
}: {
  handle: ResizeHandle;
  color: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const SIZE = 7;
  const HALF = SIZE / 2;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    background: '#fff',
    border: `1.5px solid ${color}`,
    borderRadius: 1.5,
    cursor: HANDLE_CURSOR[handle],
    zIndex: 10,
    // Position based on handle name
    ...(handle.includes('n') ? { top: -HALF } : handle.includes('s') ? { bottom: -HALF } : { top: `calc(50% - ${HALF}px)` }),
    ...(handle.includes('w') ? { left: -HALF } : handle.includes('e') ? { right: -HALF } : { left: `calc(50% - ${HALF}px)` }),
  };

  return (
    <div
      style={posStyle}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
    />
  );
}

// ─── Element Content Renderer ─────────────────────────────────────────────────

function ElementContent({
  element,
  slideId,
  dispatch,
}: {
  element: SlideElement;
  slideId: string;
  dispatch: React.Dispatch<StudioAction>;
}) {
  const data = element.data as any;

  switch (element.type) {
    case 'text':
      return <TextElementView data={data} />;
    case 'image':
      return <ImageElementView data={data} />;
    case 'video':
      return <VideoElementView data={data} />;
    case 'audio':
      return <AudioElementView data={data} />;
    case 'quiz':
      return <QuizElementView data={data} />;
    case 'embed':
      return <EmbedElementView data={data} />;
    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded text-slate-500 text-xs">
          {element.type}
        </div>
      );
  }
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({
  onDuplicate,
  onDelete,
  onLock,
  onBringForward,
  onSendBackward,
  onClose,
  locked,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onClose: () => void;
  locked: boolean;
}) {
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener('pointerdown', h);
    return () => window.removeEventListener('pointerdown', h);
  }, [onClose]);

  const item = 'flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-700 hover:text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors';

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden shadow-lg py-1"
      style={{ background: '#ffffff', border: '1px solid #e2e8f0', minWidth: 156 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={item} onClick={onDuplicate}><Copy size={10} /> Duplicate</div>
      <div className={item} onClick={onLock}><Lock size={10} /> {locked ? 'Unlock' : 'Lock'}</div>
      <div className={item} onClick={onBringForward}>Bring Forward</div>
      <div className={item} onClick={onSendBackward}>Send Backward</div>
      <div className="h-px my-1" style={{ background: '#e2e8f0' }} />
      <div className={`${item} !text-red-500 hover:!text-red-600`} onClick={onDelete}><Trash2 size={10} /> Delete</div>
    </div>
  );
}
