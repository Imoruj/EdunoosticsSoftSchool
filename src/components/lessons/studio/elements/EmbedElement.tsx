'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import type { EmbedBlockData } from '@/lib/db/types';

export function EmbedElementView({ data }: { data: EmbedBlockData }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded gap-2">
      <Globe size={20} className="text-slate-400" />
      <p className="text-xs text-slate-500 text-center px-2 truncate max-w-full">{data?.url ?? 'Embedded content'}</p>
    </div>
  );
}
