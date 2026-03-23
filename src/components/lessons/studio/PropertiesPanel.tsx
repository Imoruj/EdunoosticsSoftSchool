'use client';

import React from 'react';
import { Layers, Users } from 'lucide-react';
import type { StudioAction, StudioState } from './useStudioState';
import type { LessonSlide, SlideElement } from '@/lib/db/types';
import { SlideProperties } from './panels/SlideProperties';
import { ElementProperties } from './panels/ElementProperties';
import { TargetAudienceSelector } from '@/components/shared/TargetAudienceSelector';

interface PropertiesPanelProps {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  activeSlide: LessonSlide | null;
  selectedElement: SlideElement | null;
}

export function PropertiesPanel({ state, dispatch, activeSlide, selectedElement }: PropertiesPanelProps) {
  const panel = state.rightPanel;

  return (
    <aside
      className="flex flex-col overflow-hidden shrink-0"
      style={{ width: 260, background: '#ffffff', borderLeft: '1px solid #e2e8f0' }}
    >
      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <Tab active={panel === 'slide'} icon={<Layers size={11} />} label="Slide" onClick={() => dispatch({ type: 'SET_RIGHT_PANEL', panel: 'slide' })} />
        <Tab active={panel === 'audience'} icon={<Users size={11} />} label="Audience" onClick={() => dispatch({ type: 'SET_RIGHT_PANEL', panel: 'audience' })} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {panel === 'slide' ? (
          selectedElement && activeSlide ? (
            <ElementProperties element={selectedElement} slideId={activeSlide.id} slideDuration={activeSlide.duration ?? 10} dispatch={dispatch} />
          ) : activeSlide ? (
            <SlideProperties slide={activeSlide} dispatch={dispatch} />
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-xs">No slide selected</div>
          )
        ) : (
          <div className="p-3">
            <TargetAudienceSelector
              subjectId={state.lesson.subjectId}
              classArmIds={state.lesson.classArmIds}
              assignedTo={state.lesson.assignedTo}
              onSubjectChange={(id) => dispatch({ type: 'UPDATE_LESSON_META', patch: { subjectId: id } })}
              onClassArmsChange={(ids) => dispatch({ type: 'UPDATE_LESSON_META', patch: { classArmIds: ids } })}
              onAssignedToChange={(ids) => dispatch({ type: 'UPDATE_LESSON_META', patch: { assignedTo: ids } })}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function Tab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] transition-colors"
      style={{
        color: active ? '#4f46e5' : '#94a3b8',
        borderBottom: active ? '1.5px solid #4f46e5' : '1.5px solid transparent',
      }}
    >
      {icon}{label}
    </button>
  );
}
