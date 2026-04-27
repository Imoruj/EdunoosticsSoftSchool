'use client';

import React, { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
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
import { TextGeneratorModal } from './modals/TextGeneratorModal';
import { useLessons } from '@/lib/db/hooks';
import type { LessonReferenceMaterial, LessonSlide, SlideElement } from '@/lib/db/types';
import type { SowWeek } from './panels/SowWeekPanel';
import { showAppAlert } from '@/lib/appMessageBox';

// ─── Pre-lesson slide factory ────────────────────────────────────────────────

function eid() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeTextEl(
  content: string,
  x: number, y: number, w: number, h: number,
  z: number,
  duration: number,
  extra: Partial<SlideElement> = {}
): SlideElement {
  return {
    id: eid(), type: 'text',
    data: { content, format: 'html' },
    x, y, width: w, height: h,
    zIndex: z,
    startTime: 0, endTime: duration,
    animateIn: 'fade', animateInDuration: 400,
    opacity: 1,
    ...extra,
  };
}

function createPreLessonSlides(week: SowWeek): LessonSlide[] {
  const DUR = 15;
  const sid = (n: number) => `slide-prelesson-${n}-${Date.now()}`;
  const base = { sceneType: 'pre-lesson' as const, autoAdvance: false, background: { type: 'color' as const, color: '#ffffff' }, transition: 'fade' as const, transitionDuration: 400 };

  // ── Slide 1: Title ───────────────────────────────────────────────────────
  const slide1: LessonSlide = {
    ...base,
    id: sid(1), order: 0, duration: DUR,
    elements: [
      makeTextEl(
        `<p style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6366f1;margin:0">WEEK ${week.weekNumber}</p>`,
        5, 8, 40, 8, 1, DUR
      ),
      makeTextEl(
        `<p style="font-size:34px;font-weight:800;color:#0f172a;line-height:1.15;margin:0">${week.topic}</p>`,
        5, 20, 90, 40, 2, DUR, { animateIn: 'slide-up', animateInDuration: 450 }
      ),
      makeTextEl(
        `<p style="font-size:12px;color:#94a3b8;margin:0">${week.className}&ensp;·&ensp;${week.sessionName}&ensp;·&ensp;${week.termName}</p>`,
        5, 63, 90, 8, 3, DUR
      ),
    ],
    notes: '',
  };

  // ── Slide 2: Content + Description ─────────────────────────────────────
  const contentHtml = week.content
    ? week.content.replace(/\n/g, '<br/>')
    : '<em style="color:#94a3b8">No lesson content in SOW.</em>';

  const slide2: LessonSlide = {
    ...base,
    id: sid(2), order: 1, duration: DUR,
    elements: [
      makeTextEl(
        `<p style="font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6366f1;margin:0 0 8px">LESSON CONTENT</p>`
        + `<p style="font-size:13px;color:#1e293b;line-height:1.65;margin:0">${contentHtml}</p>`,
        4, 5, 55, 90, 1, DUR, { animateIn: 'slide-right' }
      ),
      makeTextEl(
        `<p style="font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#d97706;margin:0 0 8px">LESSON DESCRIPTION</p>`
        + `<p style="font-size:12px;color:#92400e;line-height:1.6;margin:0;font-style:italic">Double-click to write, or use Insert → AI → Generate Text to auto-generate a lesson description from the SOW references.</p>`,
        63, 5, 33, 90, 2, DUR,
        { animateIn: 'slide-left', background: '#fffbeb', borderRadius: 8 }
      ),
    ],
    notes: '',
  };

  // ── Slide 3: Objectives + Prior Knowledge ───────────────────────────────
  const objHtml = week.objectives
    ? week.objectives.replace(/\n/g, '<br/>')
    : '<em style="color:#94a3b8">No objectives in SOW.</em>';

  const slide3: LessonSlide = {
    ...base,
    id: sid(3), order: 2, duration: DUR,
    elements: [
      makeTextEl(
        `<p style="font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#059669;margin:0 0 8px">LEARNING OBJECTIVES</p>`
        + `<p style="font-size:13px;color:#1e293b;line-height:1.65;margin:0">${objHtml}</p>`,
        4, 5, 55, 90, 1, DUR, { animateIn: 'slide-right' }
      ),
      makeTextEl(
        `<p style="font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#7c3aed;margin:0 0 8px">LEARNER&apos;S PRIOR KNOWLEDGE</p>`
        + `<p style="font-size:12px;color:#4c1d95;line-height:1.6;margin:0;font-style:italic">Double-click to write, or use Insert → AI → Generate Text to auto-generate prerequisite knowledge from SOW context.</p>`,
        63, 5, 33, 90, 2, DUR,
        { animateIn: 'slide-left', background: '#f5f3ff', borderRadius: 8 }
      ),
    ],
    notes: '',
  };

  return [slide1, slide2, slide3];
}

interface LessonStudioProps {
  lesson?: Lesson;
  userId: string;
}

const AUTOSAVE_DELAY = 2000;
const DEFAULT_SLIDE_PANEL_WIDTH = 220;
const DEFAULT_TIMELINE_HEIGHT = 224;

function clampLayoutValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSlidePanelBounds() {
  if (typeof window === 'undefined') return { min: 168, max: 340 };
  const viewportWidth = window.innerWidth;
  return {
    min: viewportWidth < 820 ? 136 : 168,
    max: Math.min(360, Math.max(190, Math.floor(viewportWidth * 0.32))),
  };
}

function getTimelineHeightBounds() {
  if (typeof window === 'undefined') return { min: 148, max: 380 };
  return {
    min: 148,
    max: Math.min(420, Math.max(190, Math.floor(window.innerHeight * 0.46))),
  };
}

export function LessonStudio({ lesson: initialLesson, userId }: LessonStudioProps) {
  const { saveLesson } = useLessons();
  const [saving, setSaving] = React.useState(false);
  const [slidePanelWidth, setSlidePanelWidth] = React.useState(DEFAULT_SLIDE_PANEL_WIDTH);
  const [timelineHeight, setTimelineHeight] = React.useState(DEFAULT_TIMELINE_HEIGHT);

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

  // ── Narration audio sync ───────────────────────────────────────────────────
  const narrationRef = useRef<HTMLAudioElement | null>(null);

  // ── SOW state ─────────────────────────────────────────────────────────────
  const [sowWeeks, setSowWeeks] = React.useState<SowWeek[]>([]);
  const [sowLoading, setSowLoading] = React.useState(false);
  const [selectedSowWeekId, setSelectedSowWeekId] = React.useState(initialLesson?.sowWeekId ?? '');
  const [sowClassId, setSowClassId] = React.useState('');

  // Fetch approved SOW weeks whenever subject or class changes
  React.useEffect(() => {
    const subjectId = state.lesson.subjectId;
    if (!subjectId) { setSowWeeks([]); return; }
    setSowLoading(true);
    const params = new URLSearchParams({ subjectId });
    if (sowClassId) params.set('classId', sowClassId);
    fetch(`/api/scheme-of-work/approved-weeks?${params}`)
      .then((r) => r.json())
      .then((d) => setSowWeeks(d.weeks ?? []))
      .catch(() => setSowWeeks([]))
      .finally(() => setSowLoading(false));
  }, [state.lesson.subjectId, sowClassId]);

  function handleSowWeekSelect(weekId: string) {
    setSelectedSowWeekId(weekId);
    if (!weekId) {
      // Reset pre-lesson slides to a single empty slide
      const emptyPreLesson: LessonSlide = {
        id: `slide-prelesson-empty-${Date.now()}`,
        sceneType: 'pre-lesson', order: 0, duration: 10, autoAdvance: false,
        background: { type: 'color', color: '#ffffff' }, transition: 'fade', transitionDuration: 400,
        elements: [], notes: '',
      };
      const otherSlides = (state.lesson.slides ?? []).filter((s) => s.sceneType !== 'pre-lesson');
      dispatch({ type: 'UPDATE_LESSON_META', patch: {
        sowWeekId: undefined, sowLessonContent: undefined, sowObjectives: undefined,
        sowSdgNumbers: undefined, referenceMaterials: undefined,
        slides: [emptyPreLesson, ...otherSlides],
      }});
      return;
    }

    const week = sowWeeks.find((w) => w.weekId === weekId);
    if (!week) return;

    const objParts = [
      week.objectives      ? `General:\n${week.objectives}`      : '',
      week.waecObjectives  ? `WAEC:\n${week.waecObjectives}`     : '',
      week.jambObjectives  ? `JAMB:\n${week.jambObjectives}`     : '',
      week.igcseObjectives ? `IGCSE:\n${week.igcseObjectives}`   : '',
    ].filter(Boolean);

    const refs: LessonReferenceMaterial[] = (week.references ?? []).map((r) => ({
      id: r.id, type: r.type, title: r.title,
      url: r.url ?? undefined, fileKey: r.fileKey ?? undefined,
      description: r.description ?? undefined, sortOrder: r.sortOrder,
      source: 'scheme_of_work' as const, addedAt: Date.now(),
    }));

    // Build 3 structured pre-lesson slides
    const preLessonSlides = createPreLessonSlides(week);
    const otherSlides = (state.lesson.slides ?? []).filter((s) => s.sceneType !== 'pre-lesson');

    dispatch({ type: 'UPDATE_LESSON_META', patch: {
      title:              `Week ${week.weekNumber}: ${week.topic}`,
      sowWeekId:          weekId,
      sowLessonContent:   week.content ?? undefined,
      sowObjectives:      objParts.join('\n\n') || undefined,
      sowSdgNumbers:      week.sdgNumbers.length > 0 ? week.sdgNumbers : undefined,
      referenceMaterials: refs.length > 0 ? refs : undefined,
      slides:             [...preLessonSlides, ...otherSlides],
    }});

    // Navigate to first pre-lesson slide
    dispatch({ type: 'SELECT_SCENE', sceneType: 'pre-lesson' });
    dispatch({ type: 'SELECT_SLIDE', slideId: preLessonSlides[0].id });
  }

  // Auto-save
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!state.isDirty) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      await handleSave({ silent: true });
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(autosaveTimer.current);
  }, [state.lesson, state.isDirty]); // eslint-disable-line

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); dispatch({ type: 'REDO' }); }
      if (ctrl && e.key === 's') { e.preventDefault(); handleSave({ silent: true }); }
      if (ctrl && e.key === '=') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom + 0.25 }); }
      if (ctrl && e.key === '-') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom - 0.25 }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.zoom, dispatch]); // eslint-disable-line

  // 1. When narration URL changes (new slide or URL updated): reset audio element
  const narrationUrl = activeSlide()?.narrationUrl ?? null;
  useEffect(() => {
    const audio = narrationRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.src = narrationUrl ?? '';
    audio.load();
  }, [narrationUrl]); // eslint-disable-line

  // 2. Play / pause in sync with timeline
  useEffect(() => {
    const audio = narrationRef.current;
    if (!audio || !narrationUrl) return;
    if (state.playing) {
      // Seek to playhead before starting (handles resume after scrub)
      if (Math.abs(audio.currentTime - state.playhead) > 0.3) {
        audio.currentTime = state.playhead;
      }
      audio.play().catch(() => {}); // ignore autoplay policy errors
    } else {
      audio.pause();
    }
  }, [state.playing]); // eslint-disable-line

  // 3. Scrub: seek audio when playhead changes while paused
  useEffect(() => {
    const audio = narrationRef.current;
    if (!audio || !narrationUrl || state.playing) return;
    audio.currentTime = state.playhead;
  }, [state.playhead]); // eslint-disable-line

  async function persistLesson(nextLesson: Lesson, options?: { silent?: boolean; published?: boolean }) {
    setSaving(true);
    try {
      await saveLesson({ ...nextLesson, updatedAt: Date.now() });
      dispatch({ type: 'MARK_SAVED' });
      if (!options?.silent) {
        toast.success(options?.published ? 'Lesson published successfully.' : 'Draft saved.');
      }
    } catch (e) {
      console.error('Failed to save lesson:', e);
      if (!options?.silent) {
        toast.error('Failed to save lesson.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(options?: { silent?: boolean }) {
    if (!state.lesson.title.trim()) {
      if (!options?.silent) {
        await showAppAlert('Please add a lesson title before saving.', {
          title: 'Missing Information',
          variant: 'warning',
        });
      }
      return;
    }

    await persistLesson(state.lesson, options);
  }

  async function handlePublish() {
    if (!state.lesson.subjectId || state.lesson.classArmIds.length === 0) {
      await showAppAlert('Please select a subject and at least one class arm before publishing.', {
        title: 'Missing Information',
        variant: 'warning',
      });
      return;
    }

    if (!Array.isArray(state.lesson.assignedTo) || state.lesson.assignedTo.length === 0) {
      await showAppAlert('Please select the students to receive this lesson (Audience tab) before publishing.', {
        title: 'Missing Audience',
        variant: 'warning',
      });
      return;
    }

    const publishedAt = state.lesson.publishedAt ?? Date.now();
    const nextLesson: Lesson = {
      ...state.lesson,
      isPublished: true,
      publishedAt,
    };

    dispatch({ type: 'UPDATE_LESSON_META', patch: { isPublished: true, publishedAt } });
    await persistLesson(nextLesson, { published: true });
  }

  function handlePreview() {
    dispatch({ type: 'OPEN_MODAL', modal: { type: 'preview', slideId: activeSlide()?.id } });
  }

  const curSlide = activeSlide();
  const curElement = selectedElement();

  React.useEffect(() => {
    function clampLayoutForViewport() {
      const slideBounds = getSlidePanelBounds();
      const timelineBounds = getTimelineHeightBounds();
      setSlidePanelWidth((width) => clampLayoutValue(width, slideBounds.min, slideBounds.max));
      setTimelineHeight((height) => clampLayoutValue(height, timelineBounds.min, timelineBounds.max));
    }

    clampLayoutForViewport();
    window.addEventListener('resize', clampLayoutForViewport);
    return () => window.removeEventListener('resize', clampLayoutForViewport);
  }, []);

  const setResponsiveTimelineHeight = React.useCallback((height: number) => {
    const bounds = getTimelineHeightBounds();
    setTimelineHeight(clampLayoutValue(height, bounds.min, bounds.max));
  }, []);

  const startSlidePanelResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = slidePanelWidth;

    function onPointerMove(moveEvent: PointerEvent) {
      const bounds = getSlidePanelBounds();
      setSlidePanelWidth(clampLayoutValue(startWidth + moveEvent.clientX - startX, bounds.min, bounds.max));
    }

    function stopResize() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  }, [slidePanelWidth]);

  // ── Render modals ──────────────────────────────────────────────────────────
  function renderModal() {
    const modal = state.modal;
    if (!modal) return null;

    if (modal.type === 'preview') {
      return (
        <PreviewModal
          lesson={state.lesson}
          initialSlideId={modal.slideId}
          onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        />
      );
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

    if (modal.type === 'text-generator') {
      const slide = (state.lesson.slides ?? []).find((entry) => entry.id === modal.targetSlideId) ?? null;
      return (
        <TextGeneratorModal
          lesson={state.lesson}
          slide={slide}
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

    // quiz-builder is now inline in the sidebar — no modal needed

    return null;
  }

  return (
    <>
      {/* CSS animations for preview */}
      <style>{ANIMATION_STYLES}</style>

      {/* Hidden narration audio — synced to timeline playhead */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={narrationRef} preload="auto" style={{ display: 'none' }} />

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
            width={slidePanelWidth}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize slide panel"
            tabIndex={0}
            className="group relative w-1.5 shrink-0 cursor-col-resize bg-white transition hover:bg-indigo-50"
            onPointerDown={startSlidePanelResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              const bounds = getSlidePanelBounds();
              const delta = (event.shiftKey ? 24 : 12) * (event.key === 'ArrowRight' ? 1 : -1);
              setSlidePanelWidth((width) => clampLayoutValue(width + delta, bounds.min, bounds.max));
            }}
          >
            <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition group-hover:bg-indigo-400" />
          </div>

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
            sowWeeks={sowWeeks}
            sowLoading={sowLoading}
            selectedSowWeekId={selectedSowWeekId}
            onSowWeekSelect={handleSowWeekSelect}
            onClassChange={setSowClassId}
          />
        </div>

        {/* ── Timeline (spans full width) ── */}
        <Timeline
          state={state}
          dispatch={dispatch}
          activeSlide={curSlide}
          height={timelineHeight}
          minHeight={getTimelineHeightBounds().min}
          maxHeight={getTimelineHeightBounds().max}
          onHeightChange={setResponsiveTimelineHeight}
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
