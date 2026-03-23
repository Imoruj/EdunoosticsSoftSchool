'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { QuizBlockData } from '@/lib/db/types';

export function QuizElementView({ data }: { data: QuizBlockData }) {
  const q = data?.embeddedQuiz?.questions?.[0];

  return (
    <div
      className="w-full h-full flex flex-col px-4 py-3 rounded overflow-hidden"
      style={{ background: '#fffbeb', border: '1.5px solid #f59e0b' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle size={14} className="text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-700">
          {data?.quizTitle ?? 'Quiz'}
        </span>
        {data?.embeddedQuiz?.questions?.length ? (
          <span className="ml-auto text-xs text-amber-500">
            {data.embeddedQuiz.questions.length} Q
          </span>
        ) : null}
      </div>

      {q ? (
        <p className="text-xs text-slate-700 line-clamp-2">{q.questionText}</p>
      ) : (
        <p className="text-xs text-slate-400 italic">Double-click to add questions…</p>
      )}

      {q?.data && 'options' in q.data && (
        <div className="mt-2 space-y-1">
          {(q.data as any).options?.slice(0, 3).map((opt: any) => (
            <div key={opt.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={`w-2.5 h-2.5 rounded-full border ${opt.isCorrect ? 'bg-amber-400 border-amber-400' : 'border-slate-300'}`} />
              <span className="truncate">{opt.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
