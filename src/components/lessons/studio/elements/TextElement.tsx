'use client';

import React from 'react';
import type { TextBlockData } from '@/lib/db/types';

export function TextElementView({ data }: { data: TextBlockData }) {
  return (
    <div
      className="w-full h-full overflow-hidden text-sm leading-relaxed"
      style={{ padding: '8px 10px' }}
      dangerouslySetInnerHTML={{ __html: data?.content ?? '<p>Double-click to edit text…</p>' }}
    />
  );
}
