'use client';

import React from 'react';
import { PlayCircle, Video } from 'lucide-react';
import type { VideoBlockData } from '@/lib/db/types';

function getYtId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function VideoElementView({ data }: { data: VideoBlockData }) {
  const ytId = data?.url ? getYtId(data.url) : null;
  const thumb = data?.thumbnail ?? (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null);

  return (
    <div className="w-full h-full relative bg-slate-900 flex items-center justify-center rounded overflow-hidden">
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover opacity-80" draggable={false} />
      ) : (
        <Video size={32} className="text-slate-600" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <PlayCircle size={40} className="text-white/80 drop-shadow-lg" />
      </div>
      {data?.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 text-center">
          {data.caption}
        </div>
      )}
    </div>
  );
}
