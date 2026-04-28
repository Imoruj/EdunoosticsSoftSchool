'use client';

import React from 'react';
import type { LessonSlide, SlideElement } from '@/lib/db/types';

interface SlideThumbnailProps {
  slide: LessonSlide;
  fullSize?: boolean;
}

/** Lightweight scaled-down preview of a slide's elements */
export function SlideThumbnail({ slide }: SlideThumbnailProps) {
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
      {[...slide.elements].sort((a, b) => a.zIndex - b.zIndex).map((el) => (
        <ElementPreview key={el.id} element={el} />
      ))}
    </div>
  );
}

function ElementPreview({ element }: { element: SlideElement }) {
  const elBg = element.background && element.background !== 'transparent' ? element.background : undefined;

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
    background: elBg,
  };

  switch (element.type) {
    case 'text': {
      const lineColor = elBg ? contrastColor(elBg) : '#334155';
      return (
        <div style={style}>
          <TextBars color={lineColor} />
        </div>
      );
    }

    case 'image': {
      const data = element.data as { url?: string };
      if (data?.url) {
        return (
          <div style={style}>
            <img src={data.url} alt="" className="w-full h-full object-cover" />
          </div>
        );
      }
      return (
        <div style={{ ...style, background: '#e2e8f0' }} className="flex items-center justify-center">
          <ImageIcon />
        </div>
      );
    }

    case 'video':
      return (
        <div style={{ ...style, background: '#1e293b' }} className="flex items-center justify-center">
          <PlayIcon />
        </div>
      );

    case 'audio':
      return (
        <div style={{ ...style, background: '#1e1b4b' }} className="flex items-center justify-center gap-[1px]">
          {[2, 4, 3, 5, 2].map((h, i) => (
            <div key={i} style={{ width: 1, height: h, background: 'rgba(165,180,252,0.85)', borderRadius: 1 }} />
          ))}
        </div>
      );

    case 'quiz':
      return (
        <div style={{ ...style, background: '#fef3c7', border: '0.5px solid #fbbf24' }} className="flex flex-col items-start justify-center gap-[2px] px-[5%]">
          <div style={{ height: 2, width: '70%', background: '#f59e0b', borderRadius: 1, opacity: 0.8 }} />
          <div style={{ height: 1.5, width: '50%', background: '#f59e0b', borderRadius: 1, opacity: 0.5 }} />
          <div style={{ height: 1.5, width: '50%', background: '#f59e0b', borderRadius: 1, opacity: 0.5 }} />
        </div>
      );

    default:
      return <div style={{ ...style, background: '#f1f5f9' }} />;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shows 2-3 horizontal bars suggesting text content */
function TextBars({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-[2px] px-[6%]">
      <div style={{ height: 2, background: color, opacity: 0.75, borderRadius: 1 }} />
      <div style={{ height: 1.5, width: '80%', background: color, opacity: 0.5, borderRadius: 1 }} />
      <div style={{ height: 1.5, width: '55%', background: color, opacity: 0.35, borderRadius: 1 }} />
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" opacity={0.4}>
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="#64748b" strokeWidth="2" />
      <circle cx="5.5" cy="5.5" r="1.5" fill="#64748b" />
      <path d="M1 12 5 8l3 3 2-2 5 5" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <div style={{
      width: 0, height: 0,
      borderStyle: 'solid',
      borderWidth: '3px 0 3px 5px',
      borderColor: 'transparent transparent transparent rgba(255,255,255,0.6)',
    }} />
  );
}

/** Returns a light or dark color for text on top of `bg` */
function contrastColor(bg: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(bg)) return '#334155';
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? 'rgba(255,255,255,0.85)' : '#334155';
}
