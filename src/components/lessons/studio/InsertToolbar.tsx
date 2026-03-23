'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Type, Image, Film, Mic, HelpCircle, Globe, Sparkles, ChevronDown, ZoomOut, ZoomIn } from 'lucide-react';
import type { ContentBlockType, SlideElement, LessonSlide } from '@/lib/db/types';
import type { StudioAction, StudioState } from './useStudioState';

interface InsertToolbarProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  activeSlide: LessonSlide | null;
}

interface InsertOption {
  type: ContentBlockType;
  label: string;
  icon: React.ReactNode;
  defaultData: any;
  defaultWidth: number;
  defaultHeight: number;
}

const INSERT_OPTIONS: InsertOption[] = [
  { type: 'text',  label: 'Text',  icon: <Type size={13} />,       defaultData: { content: '<p>Click to edit…</p>', format: 'html' }, defaultWidth: 40, defaultHeight: 20 },
  { type: 'image', label: 'Image', icon: <Image size={13} />,      defaultData: { url: '', alt: '' },                               defaultWidth: 35, defaultHeight: 40 },
  { type: 'video', label: 'Video', icon: <Film size={13} />,       defaultData: { url: '' },                                        defaultWidth: 50, defaultHeight: 35 },
  { type: 'audio', label: 'Audio', icon: <Mic size={13} />,        defaultData: { mode: 'upload', title: 'Audio' },                 defaultWidth: 60, defaultHeight: 12 },
  { type: 'quiz',  label: 'Quiz',  icon: <HelpCircle size={13} />, defaultData: { quizTitle: 'Quiz', embeddedQuiz: { questions: [], passingScore: 60, showResults: true } }, defaultWidth: 70, defaultHeight: 50 },
  { type: 'embed', label: 'Embed', icon: <Globe size={13} />,      defaultData: { url: '', type: 'generic' },                       defaultWidth: 60, defaultHeight: 40 },
];

function makeElement(opt: InsertOption, count: number, duration: number): SlideElement {
  const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const off = (count % 5) * 2;
  return {
    id, type: opt.type, data: opt.defaultData,
    x: 10 + off, y: 10 + off,
    width: opt.defaultWidth, height: opt.defaultHeight,
    zIndex: count + 1,
    startTime: 0, endTime: duration,
    animateIn: 'fade', animateInDuration: 350, opacity: 1,
  };
}

export function InsertToolbar({ state, dispatch, activeSlide }: InsertToolbarProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aiOpen) return;
    const h = (e: MouseEvent) => { if (!aiRef.current?.contains(e.target as Node)) setAiOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [aiOpen]);

  function insert(opt: InsertOption) {
    if (!activeSlide) return;
    if (['image', 'audio', 'video'].includes(opt.type)) {
      dispatch({ type: 'OPEN_MODAL', modal: { type: 'media-picker', insertType: opt.type, targetSlideId: activeSlide.id } });
      return;
    }
    if (opt.type === 'quiz') {
      const el = makeElement(opt, activeSlide.elements.length, activeSlide.duration);
      dispatch({ type: 'ADD_ELEMENT', slideId: activeSlide.id, element: el });
      dispatch({ type: 'OPEN_MODAL', modal: { type: 'quiz-builder', elementId: el.id } });
      return;
    }
    const el = makeElement(opt, activeSlide.elements.length, activeSlide.duration);
    dispatch({ type: 'ADD_ELEMENT', slideId: activeSlide.id, element: el });
  }

  const zoom = state.zoom;

  return (
    <div
      className="flex items-center px-3 gap-0.5 shrink-0"
      style={{ height: 40, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
    >
      {/* Insert label */}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mr-2">Insert</span>

      {INSERT_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => insert(opt)}
          disabled={!activeSlide}
          title={opt.label}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          onMouseEnter={(e) => { if (activeSlide) e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {opt.icon}
          <span className="hidden md:inline">{opt.label}</span>
        </button>
      ))}

      {/* AI dropdown */}
      <div className="relative ml-1" ref={aiRef}>
        <button
          onClick={() => setAiOpen((o) => !o)}
          disabled={!activeSlide}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors disabled:opacity-30"
          style={{ color: '#7c3aed', background: aiOpen ? 'rgba(139,92,246,0.08)' : 'transparent' }}
          onMouseEnter={(e) => { if (!aiOpen && activeSlide) e.currentTarget.style.background = 'rgba(139,92,246,0.06)'; }}
          onMouseLeave={(e) => { if (!aiOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <Sparkles size={12} />
          AI
          <ChevronDown size={10} />
        </button>

        {aiOpen && (
          <div
            className="absolute top-full left-0 mt-1 z-50 rounded-lg py-1 shadow-lg"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', minWidth: 200 }}
          >
            {[
              { label: 'Generate Text', type: 'text' as ContentBlockType },
              { label: 'Generate Image (Imagen 3)', type: 'image' as ContentBlockType },
              { label: 'Generate Audio (Gemini TTS)', type: 'audio' as ContentBlockType },
            ].map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-left transition-colors"
                onClick={() => {
                  setAiOpen(false);
                  if (!activeSlide) return;
                  dispatch({ type: 'OPEN_MODAL', modal: { type: 'media-picker', insertType: item.type, targetSlideId: activeSlide.id } });
                }}
              >
                <Sparkles size={10} className="text-purple-400" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Zoom */}
      <div className="flex items-center gap-0.5 pl-3" style={{ borderLeft: '1px solid #e2e8f0' }}>
        <button onClick={() => dispatch({ type: 'SET_ZOOM', zoom: zoom - 0.25 })} className="p-1.5 rounded text-slate-400 hover:text-slate-700 transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <ZoomOut size={12} />
        </button>
        <button onClick={() => dispatch({ type: 'SET_ZOOM', zoom: 0.75 })} className="px-2 text-[11px] text-slate-500 hover:text-slate-800 tabular-nums w-10 text-center transition-colors" title="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => dispatch({ type: 'SET_ZOOM', zoom: zoom + 0.25 })} className="p-1.5 rounded text-slate-400 hover:text-slate-700 transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  );
}
