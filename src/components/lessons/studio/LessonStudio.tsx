'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { Lesson } from '@/lib/db/types';
import { migrateToSlides, createDefaultSlides } from '@/lib/lessons/migrateToSlides';
import { useStudioState } from './useStudioState';
import { StudioHeader } from './StudioHeader';
import { SlidePanel } from './SlidePanel';
import { InsertToolbar } from './InsertToolbar';
import { SlideCanvas } from './SlideCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { Timeline } from './Timeline';
import { TextEditorModal } from './modals/TextEditorModal';
import { MediaPickerModal } from './modals/MediaPickerModal';
import { PreviewModal } from './modals/PreviewModal';
import { useLessons } from '@/lib/db/hooks';

interface LessonStudioProps {
  lesson?: Lesson;
  userId: string;
}

const AUTOSAVE_DELAY = 2000;

export function LessonStudio({ lesson: initialLesson, userId }: LessonStudioProps) {
  const { saveLesson } = useLessons();
  const [saving, setSaving] = React.useState(false);

  // Prepare lesson — migrate or create fresh
  const preparedLesson = React.useMemo<Lesson>(() => {
    if (!initialLesson) {
      return {
        id: `lesson-${Date.now()}`,
        title: 'New Lesson',
        content: [],
        slides: createDefaultSlides(),
        subjectId: '',
        classArmIds: [],
        createdById: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublished: false,
        assignedTo: [],
        attachments: [],
        isDownloaded: false,
        isPinned: false,
      };
    }
    return migrateToSlides(initialLesson);
  }, [initialLesson, userId]);

  const { state, dispatch, activeSlide, selectedElement, slidesForScene } = useStudioState(preparedLesson);

  // Auto-save
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!state.isDirty) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      await handleSave();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(autosaveTimer.current);
  }, [state.lesson, state.isDirty]); // eslint-disable-line

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); dispatch({ type: 'REDO' }); }
      if (ctrl && e.key === 's') { e.preventDefault(); handleSave(); }
      if (ctrl && e.key === '=') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom + 0.25 }); }
      if (ctrl && e.key === '-') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom - 0.25 }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.zoom, dispatch]); // eslint-disable-line

  async function handleSave() {
    setSaving(true);
    try {
      await saveLesson({ ...state.lesson, updatedAt: Date.now() });
      dispatch({ type: 'MARK_SAVED' });
    } catch (e) {
      console.error('Failed to save lesson:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    dispatch({ type: 'UPDATE_LESSON_META', patch: { isPublished: true, publishedAt: Date.now() } });
    await handleSave();
  }

  function handlePreview() {
    dispatch({ type: 'OPEN_MODAL', modal: { type: 'preview' } });
  }

  const curSlide = activeSlide();
  const curElement = selectedElement();

  // ── Render modals ──────────────────────────────────────────────────────────
  function renderModal() {
    const modal = state.modal;
    if (!modal) return null;

    if (modal.type === 'preview') {
      return <PreviewModal lesson={state.lesson} onClose={() => dispatch({ type: 'CLOSE_MODAL' })} />;
    }

    if (modal.type === 'text-editor') {
      const slide = (state.lesson.slides ?? []).find(
        (s) => s.elements.some((el) => el.id === modal.elementId)
      );
      const element = slide?.elements.find((el) => el.id === modal.elementId);
      if (!element || !slide) return null;
      return (
        <TextEditorModal
          element={element}
          slideId={slide.id}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        />
      );
    }

    if (modal.type === 'media-picker') {
      return (
        <MediaPickerModal
          insertType={modal.insertType}
          targetSlideId={modal.targetSlideId}
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        />
      );
    }

    return null;
  }

  return (
    <>
      {/* CSS animations for preview */}
      <style>{ANIMATION_STYLES}</style>

      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ background: '#f8fafc', zIndex: 9999 }}
      >
        {/* ── Header (spans full width) ── */}
        <StudioHeader
          state={state}
          dispatch={dispatch}
          onSave={handleSave}
          onPublish={handlePublish}
          onPreview={handlePreview}
          saving={saving}
        />

        {/* ── Main 3-column body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Slide Panel */}
          <SlidePanel
            state={state}
            dispatch={dispatch}
            slidesForScene={slidesForScene}
          />

          {/* Centre: Canvas + Insert toolbar */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Insert toolbar */}
            <InsertToolbar
              state={state}
              dispatch={dispatch}
              activeSlide={curSlide}
            />

            {/* Canvas */}
            <div className="flex-1 overflow-hidden">
              <SlideCanvas
                slide={curSlide}
                state={state}
                dispatch={dispatch}
              />
            </div>
          </div>

          {/* Right: Properties Panel */}
          <PropertiesPanel
            state={state}
            dispatch={dispatch}
            activeSlide={curSlide}
            selectedElement={curElement}
          />
        </div>

        {/* ── Timeline (spans full width) ── */}
        <Timeline
          state={state}
          dispatch={dispatch}
          activeSlide={curSlide}
        />
      </div>

      {/* Modals */}
      {renderModal()}
    </>
  );
}

// ── Animation keyframes ────────────────────────────────────────────────────────
const ANIMATION_STYLES = `
@keyframes previewFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes previewSlideLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes previewSlideRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes previewSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes previewSlideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes previewZoom {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes previewBounce {
  0% { opacity: 0; transform: scale(0.7); }
  60% { opacity: 1; transform: scale(1.05); }
  100% { transform: scale(1); }
}
.preview-anim-fade-in { animation: previewFadeIn 0.4s ease forwards; }
.preview-anim-slide-left { animation: previewSlideLeft 0.4s ease forwards; }
.preview-anim-slide-right { animation: previewSlideRight 0.4s ease forwards; }
.preview-anim-slide-up { animation: previewSlideUp 0.4s ease forwards; }
.preview-anim-slide-down { animation: previewSlideDown 0.4s ease forwards; }
.preview-anim-zoom { animation: previewZoom 0.4s ease forwards; }
.preview-anim-bounce { animation: previewBounce 0.5s ease forwards; }
`;
