'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2 } from 'lucide-react';
import type { LessonSlide, LessonSection } from '@/lib/db/types';
import type { StudioAction, StudioState } from './useStudioState';
import { SECTION_ORDER, SECTION_LABEL } from '@/lib/lessons/migrateToSlides';
import { SlideThumbnail } from './SlideThumbnail';

interface SlidePanelProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  slidesForScene: (s: LessonSection) => LessonSlide[];
  width?: number;
}

const SCENE_DOT: Record<LessonSection, string> = {
  'pre-lesson': '#6366f1',
  induction:    '#8b5cf6',
  introduction: '#06b6d4',
  content:      '#10b981',
  summary:      '#f59e0b',
  evaluation:   '#ef4444',
  assignment:   '#f97316',
  thumbnail:    '#64748b',
};

export function SlidePanel({ state, dispatch, slidesForScene, width = 196 }: SlidePanelProps) {
  const [collapsed, setCollapsed] = useState<Set<LessonSection>>(new Set());

  function toggleScene(scene: LessonSection) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(scene)) next.delete(scene); else next.add(scene);
      return next;
    });
  }

  return (
    <aside
      className="flex flex-col overflow-hidden shrink-0"
      style={{ width, background: '#ffffff', borderRight: '1px solid #e2e8f0' }}
    >
      <div
        className="px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid #e2e8f0' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Slides</p>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {SECTION_ORDER.map((scene) => {
          const slides = slidesForScene(scene);
          const isOpen = !collapsed.has(scene);
          const dot = SCENE_DOT[scene];

          return (
            <div key={scene}>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left"
                onClick={() => toggleScene(scene)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: dot, opacity: 0.7 }} className="shrink-0">
                  {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                <span className="text-[11px] text-slate-600 flex-1 truncate leading-none">{SECTION_LABEL[scene]}</span>
                <span className="text-[9px] text-slate-400">{slides.length}</span>
              </button>

              {isOpen && (
                <div className="px-2.5 pb-2 space-y-1">
                  {slides.map((slide) => (
                    <SlideThumb
                      key={slide.id}
                      slide={slide}
                      isActive={state.activeSlideId === slide.id}
                      onSelect={() => { dispatch({ type: 'SELECT_SCENE', sceneType: scene }); dispatch({ type: 'SELECT_SLIDE', slideId: slide.id }); }}
                      onDuplicate={() => dispatch({ type: 'DUPLICATE_SLIDE', slideId: slide.id })}
                      onDelete={() => dispatch({ type: 'DELETE_SLIDE', slideId: slide.id })}
                    />
                  ))}
                  <button
                    onClick={() => { dispatch({ type: 'ADD_SLIDE', sceneType: scene }); if (collapsed.has(scene)) toggleScene(scene); }}
                    className="flex items-center gap-1 w-full px-1.5 py-1 text-[10px] text-slate-400 hover:text-indigo-600 rounded transition-colors"
                  >
                    <Plus size={9} />Add slide
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SlideThumb({ slide, isActive, onSelect, onDuplicate, onDelete }: {
  slide: LessonSlide; isActive: boolean;
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive) return;
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, [isActive]);

  return (
    <div
      ref={ref}
      className="relative cursor-pointer rounded overflow-hidden"
      style={{ aspectRatio: '16/9', border: isActive ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0', transition: 'border-color 0.15s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div className="w-full h-full relative" style={{ background: '#ffffff' }}>
        <SlideThumbnail slide={slide} />
      </div>
      {hovered && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 rounded text-neutral-300" style={{ background: 'rgba(0,0,0,0.75)' }}><Copy size={8} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded text-red-400" style={{ background: 'rgba(0,0,0,0.75)' }}><Trash2 size={8} /></button>
        </div>
      )}
    </div>
  );
}
