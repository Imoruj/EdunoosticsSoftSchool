'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import type { AudioBlockData } from '@/lib/db/types';

export function AudioElementView({ data }: { data: AudioBlockData }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!audioRef.current || !data?.url) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  return (
    <div
      className="w-full h-full flex items-center gap-3 px-4 rounded"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}
    >
      {data?.url && (
        <audio ref={audioRef} src={data.url} onEnded={() => setPlaying(false)} />
      )}

      <button
        onClick={toggle}
        className="shrink-0 w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-colors"
      >
        {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{data?.title ?? 'Audio Track'}</p>
        {data?.caption && <p className="text-xs text-indigo-300 truncate">{data.caption}</p>}
      </div>

      {/* Waveform decoration */}
      <div className="flex items-center gap-px opacity-60">
        {[3, 6, 4, 8, 5, 7, 3, 6, 4, 5].map((h, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-indigo-300"
            style={{ height: h * 2, animation: playing ? `pulse 0.${(i % 4) + 3}s ease-in-out infinite alternate` : 'none' }}
          />
        ))}
      </div>

      <Volume2 size={14} className="text-indigo-300 shrink-0" />
    </div>
  );
}
