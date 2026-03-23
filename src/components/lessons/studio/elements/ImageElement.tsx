'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { ImageBlockData } from '@/lib/db/types';

export function ImageElementView({ data }: { data: ImageBlockData }) {
  if (!data?.url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded gap-2">
        <ImageIcon size={24} className="text-slate-300" />
        <span className="text-xs text-slate-400">No image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <img
        src={data.url}
        alt={data.alt ?? ''}
        className="w-full h-full object-cover"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
      {data.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 text-center">
          {data.caption}
        </div>
      )}
    </div>
  );
}
