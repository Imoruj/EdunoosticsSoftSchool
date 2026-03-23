'use client';

import React from 'react';
import type { LessonSlide, SlideElement } from '@/lib/db/types';

interface SlideThumbnailProps {
  slide: LessonSlide;
  /** If true, renders at full scale inside a 16:9 parent */
  fullSize?: boolean;
}

/** Lightweight scaled-down preview of a slide's elements */
export function SlideThumbnail({ slide, fullSize }: SlideThumbnailProps) {
  const bg = slide.background;
  const bgStyle: React.CSSProperties = bg
    ? bg.type === 'color'
      ? { background: bg.color ?? '#ffffff' }
      : bg.type === 'gradient'
      ? { background: bg.gradient ?? '#ffffff' }
      : { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover' }
    : { background: '#ffffff' };

  return (
    <div className="w-full h-full absolute inset-0 overflow-hidden" style={bgStyle}>
      {slide.elements.map((el) => (
        <ElementPreview key={el.id} element={el} />
      ))}
    </div>
  );
}

function ElementPreview({ element }: { element: SlideElement }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    opacity: element.opacity ?? 1,
    borderRadius: element.borderRadius ?? 2,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  switch (element.type) {
    case 'text': {
      const data = element.data as any;
      return (
        <div style={style} className="flex items-start">
          <div
            className="text-black text-[4px] leading-tight overflow-hidden w-full"
            dangerouslySetInnerHTML={{ __html: data?.content ?? '' }}
          />
        </div>
      );
    }
    case 'image': {
      const data = element.data as any;
      return (
        <div style={{ ...style, background: '#e2e8f0' }}>
          {data?.url && (
            <img
              src={data.url}
              alt=""
              className="w-full h-full object-cover"
              onError={() => {}}
            />
          )}
          {!data?.url && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
          )}
        </div>
      );
    }
    case 'video':
      return (
        <div style={{ ...style, background: '#1e293b' }} className="flex items-center justify-center">
          <div className="w-2 h-2 border-l-4 border-white/60 border-t-2 border-b-2 border-t-transparent border-b-transparent" />
        </div>
      );
    case 'audio':
      return (
        <div style={{ ...style, background: '#1e1b4b' }} className="flex items-center justify-center gap-0.5">
          {[2, 4, 3, 5, 2].map((h, i) => (
            <div key={i} className="w-0.5 rounded-full bg-indigo-300" style={{ height: h }} />
          ))}
        </div>
      );
    case 'quiz':
      return (
        <div style={{ ...style, background: '#fef3c7', border: '1px solid #f59e0b' }} className="flex items-center justify-center">
          <div className="w-3 h-0.5 bg-amber-400 rounded" />
        </div>
      );
    default:
      return (
        <div style={{ ...style, background: '#f1f5f9' }} />
      );
  }
}
