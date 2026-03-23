'use client';

/**
 * LayoutPicker
 * Inline panel that lets teachers choose a multi-column content layout.
 * Each layout template defines columns; each column contains 1-2 block slots.
 * The teacher fills in the content of each block after insertion.
 */

import React from 'react';
import type { ContentBlock } from '@/lib/db/types';

// ── Template definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  blocks: Array<{
    type: ContentBlock['type'];
    role?: 'audio-avatar';
  }>;
  defaultWidth: number; // percentage
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  columns: ColumnDef[];
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'text',
    name: 'Text Only',
    description: 'Full-width text block',
    columns: [{ blocks: [{ type: 'text' }], defaultWidth: 100 }],
  },
  {
    id: 'image',
    name: 'Image Only',
    description: 'Full-width image block',
    columns: [{ blocks: [{ type: 'image' }], defaultWidth: 100 }],
  },
  {
    id: 'video',
    name: 'Video Only',
    description: 'Full-width video block',
    columns: [{ blocks: [{ type: 'video' }], defaultWidth: 100 }],
  },
  {
    id: 'audio',
    name: 'Audio Only',
    description: 'Full-width audio block',
    columns: [{ blocks: [{ type: 'audio' }], defaultWidth: 100 }],
  },
  {
    id: 'text-image',
    name: 'Text + Image',
    description: 'Text left, image right — resize the divider',
    columns: [
      { blocks: [{ type: 'text' }],  defaultWidth: 55 },
      { blocks: [{ type: 'image' }], defaultWidth: 45 },
    ],
  },
  {
    id: 'image-text',
    name: 'Image + Text',
    description: 'Image left, text right — resize the divider',
    columns: [
      { blocks: [{ type: 'image' }], defaultWidth: 45 },
      { blocks: [{ type: 'text' }],  defaultWidth: 55 },
    ],
  },
  {
    id: 'text-image-text',
    name: 'Text | Image | Text',
    description: 'Three-column layout — all resizable',
    columns: [
      { blocks: [{ type: 'text' }],  defaultWidth: 33 },
      { blocks: [{ type: 'image' }], defaultWidth: 34 },
      { blocks: [{ type: 'text' }],  defaultWidth: 33 },
    ],
  },
  {
    id: 'audio-avatar',
    name: 'Audio + Avatar',
    description: 'Circular speaker photo + audio player',
    columns: [
      { blocks: [{ type: 'image', role: 'audio-avatar' }], defaultWidth: 30 },
      { blocks: [{ type: 'audio' }],                       defaultWidth: 70 },
    ],
  },
  {
    id: 'avatar-audio-text',
    name: 'Audio + Text',
    description: 'Speaker avatar & audio on left, text on right',
    columns: [
      { blocks: [{ type: 'image', role: 'audio-avatar' }, { type: 'audio' }], defaultWidth: 35 },
      { blocks: [{ type: 'text' }],                                            defaultWidth: 65 },
    ],
  },
  {
    id: 'audio-text-image',
    name: 'Audio + Text + Image',
    description: 'Three-column: speaker audio, text, image',
    columns: [
      { blocks: [{ type: 'image', role: 'audio-avatar' }, { type: 'audio' }], defaultWidth: 25 },
      { blocks: [{ type: 'text' }],                                            defaultWidth: 50 },
      { blocks: [{ type: 'image' }],                                           defaultWidth: 25 },
    ],
  },
];

// ── Preview cell colours per block type ──────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  text:  'bg-blue-200',
  image: 'bg-green-200',
  video: 'bg-red-200',
  audio: 'bg-purple-200',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TemplatePreview({ template }: { template: LayoutTemplate }) {
  return (
    <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden">
      {template.columns.map((col, ci) => (
        <div
          key={ci}
          className="flex flex-col gap-0.5 min-w-0"
          style={{ flex: col.defaultWidth }}
        >
          {col.blocks.map((b, bi) => (
            <div
              key={bi}
              className={`flex-1 min-h-0 ${TYPE_COLOR[b.type] ?? 'bg-gray-200'} ${
                b.role === 'audio-avatar' ? 'rounded-full' : 'rounded-sm'
              } flex items-center justify-center`}
            >
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-wide leading-none">
                {b.role === 'audio-avatar' ? '👤' : b.type[0].toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LayoutPickerProps {
  onSelect: (template: LayoutTemplate) => void;
  onClose: () => void;
  /** When true, renders without the outer card frame (for embedding in a side panel). */
  noFrame?: boolean;
}

export function LayoutPicker({ onSelect, onClose, noFrame }: LayoutPickerProps) {
  const inner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Choose a Layout</p>
          <p className="text-xs text-gray-500 mt-0.5">Pick a structure — you fill in the content</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
        {[
          { label: 'Text',  color: 'bg-blue-200'   },
          { label: 'Image', color: 'bg-green-200'  },
          { label: 'Video', color: 'bg-red-200'    },
          { label: 'Audio', color: 'bg-purple-200' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
            <span className={`w-3 h-3 rounded-sm ${color} inline-block`} />
            {label}
          </span>
        ))}
      </div>

      {/* Grid of templates */}
      <div className={`grid gap-2 ${noFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
        {LAYOUT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => { onSelect(template); onClose(); }}
            className="flex flex-col gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-all group text-left"
          >
            <TemplatePreview template={template} />
            <div>
              <p className="text-xs font-medium text-gray-800 group-hover:text-violet-700 leading-tight">
                {template.name}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  if (noFrame) return <>{inner}</>;
  return (
    <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg animate-in slide-in-from-top-1 duration-150">
      {inner}
    </div>
  );
}
