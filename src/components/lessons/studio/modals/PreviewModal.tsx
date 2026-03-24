'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import type { Lesson, LessonSlide, SlideElement } from '@/lib/db/types';
import { SECTION_LABEL } from '@/lib/lessons/migrateToSlides';

interface PreviewModalProps {
  lesson: Lesson;
  initialSlideId?: string;
  onClose: () => void;
}

export function PreviewModal({ lesson, initialSlideId, onClose }: PreviewModalProps) {
  const slides = lesson.slides ?? [];
  const initialIndex = Math.max(0, slides.findIndex((entry) => entry.id === initialSlideId));
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const raf = useRef<number>(0);
  const lastTime = useRef<number>(0);

  const slide = slides[currentIdx] ?? null;

  useEffect(() => {
    const nextIndex = Math.max(0, slides.findIndex((entry) => entry.id === initialSlideId));
    setCurrentIdx(nextIndex);
    setPlayhead(0);
    setPlaying(false);
  }, [initialSlideId, slides]);

  const goNext = useCallback(() => {
    setPlayhead(0);
    setPlaying(false);
    setCurrentIdx((i) => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setPlayhead(0);
    setPlaying(false);
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  // Playback loop
  useEffect(() => {
    if (!playing || !slide) return;
    lastTime.current = performance.now();
    function tick(now: number) {
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      setPlayhead((ph) => {
        const next = ph + dt;
        if (next >= slide.duration && slide.autoAdvance) {
          goNext();
          return 0;
        }
        if (next >= slide.duration) {
          setPlaying(false);
          return slide.duration;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, slide, goNext]);

  if (!slide) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: '#000' }}>
        <p className="text-white">No slides to preview</p>
        <button onClick={onClose} className="absolute top-4 right-4 text-white"><X size={20} /></button>
      </div>
    );
  }

  const bg = slide.background;
  const bgStyle: React.CSSProperties = bg
    ? bg.type === 'color' ? { background: bg.color ?? '#fff' }
      : bg.type === 'gradient' ? { background: bg.gradient ?? '#fff' }
      : { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover' }
    : { background: '#fff' };

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 shrink-0" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
          <X size={16} />
        </button>
        <span className="text-sm text-slate-300">{lesson.title}</span>
        <span className="text-xs text-slate-500">
          {SECTION_LABEL[slide.sceneType]} — Slide {currentIdx + 1} / {slides.length}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-slate-500">← → to navigate · Space to play · Esc to close</span>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <div
          className="relative"
          style={{
            aspectRatio: '16/9',
            height: 'min(90vh, calc(100vw * 9/16))',
            ...bgStyle,
          }}
        >
          {[...slide.elements].sort((a, b) => a.zIndex - b.zIndex).map((el) => (
            <PreviewElement key={el.id} element={el} playhead={playhead} />
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 py-4 shrink-0" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <button onClick={goPrev} disabled={currentIdx === 0} className="p-2 rounded text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          style={{ background: '#4f46e5', color: '#fff' }}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={goNext} disabled={currentIdx === slides.length - 1} className="p-2 rounded text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronRight size={20} />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 ml-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIdx(i); setPlayhead(0); setPlaying(false); }}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i === currentIdx ? '#4f46e5' : '#334155' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Animation CSS classes
const ANIM_IN: Record<string, string> = {
  fade: 'preview-anim-fade-in',
  'slide-left': 'preview-anim-slide-left',
  'slide-right': 'preview-anim-slide-right',
  'slide-up': 'preview-anim-slide-up',
  'slide-down': 'preview-anim-slide-down',
  zoom: 'preview-anim-zoom',
  bounce: 'preview-anim-bounce',
};

function PreviewElement({ element, playhead }: { element: SlideElement; playhead: number }) {
  const visible = playhead >= element.startTime && playhead <= element.endTime;
  const justAppeared = Math.abs(playhead - element.startTime) < 0.1;
  const animClass = justAppeared && element.animateIn && element.animateIn !== 'none'
    ? ANIM_IN[element.animateIn] ?? ''
    : '';

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    opacity: visible ? (element.opacity ?? 1) : 0,
    borderRadius: element.borderRadius ?? 0,
    boxShadow: element.shadow ? '0 4px 20px rgba(0,0,0,0.3)' : undefined,
    transition: visible ? 'opacity 0.3s ease' : 'opacity 0.2s ease',
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  const data = element.data as any;

  return (
    <div style={style} className={animClass}>
      {element.type === 'text' && (
        <div
          className="w-full h-full overflow-hidden text-sm leading-relaxed p-3"
          dangerouslySetInnerHTML={{ __html: data?.content ?? '' }}
        />
      )}
      {element.type === 'image' && data?.url && (
        <img src={data.url} alt={data.alt ?? ''} className="w-full h-full object-cover" />
      )}
      {element.type === 'video' && (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <Play size={32} className="text-white/60" />
        </div>
      )}
      {element.type === 'audio' && (
        <div className="w-full h-full bg-indigo-950 flex items-center justify-center text-indigo-300 text-xs">
          {data?.title ?? 'Audio'}
        </div>
      )}
      {element.type === 'quiz' && (
        <div className="w-full h-full bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs font-semibold text-amber-800">{data?.quizTitle ?? 'Quiz'}</p>
        </div>
      )}
    </div>
  );
}
