'use client';

import React, { useRef } from 'react';
import type { LessonSlide } from '@/lib/db/types';
import type { StudioAction, StudioState } from './useStudioState';
import { CanvasElement } from './CanvasElement';

interface SlideCanvasProps {
  slide: LessonSlide | null;
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
}

export function SlideCanvas({ slide, state, dispatch }: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const bg = slide?.background;
  const bgStyle: React.CSSProperties = bg
    ? bg.type === 'color'   ? { background: bg.color ?? '#ffffff' }
      : bg.type === 'gradient' ? { background: bg.gradient ?? '#ffffff' }
      : { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover' }
    : { background: '#ffffff' };

  if (!slide) {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: '#dde3ea' }}>
        <p className="text-neutral-600 text-sm">Select a slide to edit</p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center w-full h-full overflow-hidden"
      style={{ background: '#dde3ea' }}
    >
      <div
        style={{
          transform: `scale(${state.zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.12s ease',
        }}
      >
        {/* 960×540 canvas */}
        <div
          ref={containerRef}
          className="relative select-none"
          style={{
            width: 960,
            height: 540,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
            ...bgStyle,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: 'SELECT_ELEMENT', elementId: null }); }}
        >
          {/* Subtle grid guides */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
            <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 4" />
            <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 4" />
            <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 4" />
            <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 4" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#94a3b8" strokeWidth={0.5} />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#94a3b8" strokeWidth={0.5} />
          </svg>

          {[...slide.elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => (
              <CanvasElement
                key={el.id}
                element={el}
                slideId={slide.id}
                isSelected={state.selectedElementId === el.id}
                isPlaying={state.playing}
                playhead={state.playhead}
                dispatch={dispatch}
                canvasRef={containerRef}
              />
            ))}

          {slide.elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-300 text-sm font-light">Use the toolbar above to add content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
