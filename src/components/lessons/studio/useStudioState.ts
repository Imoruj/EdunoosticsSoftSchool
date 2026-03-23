'use client';

import { useReducer, useCallback } from 'react';
import type {
  Lesson,
  LessonSlide,
  SlideElement,
  LessonSection,
  ContentBlockType,
} from '@/lib/db/types';
import { SECTION_ORDER } from '@/lib/lessons/migrateToSlides';

// ─── State ────────────────────────────────────────────────────────────────────

export interface StudioState {
  lesson: Lesson;
  /** Scene type of currently visible scene */
  activeSceneType: LessonSection;
  /** ID of the slide currently being edited */
  activeSlideId: string | null;
  /** ID of the element currently selected on the canvas */
  selectedElementId: string | null;
  /** Canvas zoom factor (0.5 – 1.5) */
  zoom: number;
  /** Timeline playback state */
  playing: boolean;
  /** Playhead position in seconds */
  playhead: number;
  /** Unsaved changes flag */
  isDirty: boolean;
  /** Undo history (stores full slides array snapshots, max 50) */
  undoStack: LessonSlide[][];
  redoStack: LessonSlide[][];
  /** Which panel is open in the right sidebar when no element is selected */
  rightPanel: 'slide' | 'audience';
  /** Modal visibility */
  modal: StudioModal | null;
}

export type StudioModal =
  | { type: 'text-editor'; elementId: string }
  | { type: 'media-picker'; insertType: ContentBlockType; targetSlideId: string }
  | { type: 'quiz-builder'; elementId: string }
  | { type: 'preview' };

// ─── Actions ─────────────────────────────────────────────────────────────────

export type StudioAction =
  // Navigation
  | { type: 'SELECT_SCENE'; sceneType: LessonSection }
  | { type: 'SELECT_SLIDE'; slideId: string }
  | { type: 'SELECT_ELEMENT'; elementId: string | null }
  // Slides
  | { type: 'ADD_SLIDE'; sceneType: LessonSection }
  | { type: 'DELETE_SLIDE'; slideId: string }
  | { type: 'DUPLICATE_SLIDE'; slideId: string }
  | { type: 'UPDATE_SLIDE'; slideId: string; patch: Partial<LessonSlide> }
  // Elements
  | { type: 'ADD_ELEMENT'; slideId: string; element: SlideElement }
  | { type: 'DELETE_ELEMENT'; slideId: string; elementId: string }
  | { type: 'DUPLICATE_ELEMENT'; slideId: string; elementId: string }
  | { type: 'UPDATE_ELEMENT'; slideId: string; elementId: string; patch: Partial<SlideElement> }
  | { type: 'MOVE_ELEMENT'; slideId: string; elementId: string; x: number; y: number }
  | { type: 'RESIZE_ELEMENT'; slideId: string; elementId: string; x: number; y: number; width: number; height: number }
  | { type: 'REORDER_ELEMENTS'; slideId: string; elementIds: string[] }
  // Lesson metadata
  | { type: 'UPDATE_LESSON_TITLE'; title: string }
  | { type: 'UPDATE_LESSON_META'; patch: Partial<Lesson> }
  // Playback
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SCRUB'; time: number }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // UI
  | { type: 'SET_RIGHT_PANEL'; panel: 'slide' | 'audience' }
  | { type: 'OPEN_MODAL'; modal: StudioModal }
  | { type: 'CLOSE_MODAL' }
  | { type: 'MARK_SAVED' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_UNDO = 50;

function pushUndo(state: StudioState): Pick<StudioState, 'undoStack' | 'redoStack'> {
  const stack = [
    ...(state.undoStack.length >= MAX_UNDO
      ? state.undoStack.slice(1)
      : state.undoStack),
    state.lesson.slides ?? [],
  ];
  return { undoStack: stack, redoStack: [] };
}

function mapSlides(
  slides: LessonSlide[],
  slideId: string,
  fn: (slide: LessonSlide) => LessonSlide
): LessonSlide[] {
  return slides.map((s) => (s.id === slideId ? fn(s) : s));
}

function mapElements(
  slide: LessonSlide,
  elementId: string,
  fn: (el: SlideElement) => SlideElement
): LessonSlide {
  return {
    ...slide,
    elements: slide.elements.map((el) => (el.id === elementId ? fn(el) : el)),
  };
}

function getSlide(state: StudioState): LessonSlide | undefined {
  return (state.lesson.slides ?? []).find((s) => s.id === state.activeSlideId);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    // ── Navigation ──────────────────────────────────────────────────────────
    case 'SELECT_SCENE': {
      const first = (state.lesson.slides ?? []).find(
        (s) => s.sceneType === action.sceneType
      );
      return {
        ...state,
        activeSceneType: action.sceneType,
        activeSlideId: first?.id ?? null,
        selectedElementId: null,
      };
    }

    case 'SELECT_SLIDE':
      return {
        ...state,
        activeSlideId: action.slideId,
        selectedElementId: null,
        playing: false,
        playhead: 0,
      };

    case 'SELECT_ELEMENT':
      return {
        ...state,
        selectedElementId: action.elementId,
        // Auto-switch to Slide tab so element properties are immediately visible
        rightPanel: action.elementId ? 'slide' : state.rightPanel,
      };

    // ── Slides ──────────────────────────────────────────────────────────────
    case 'ADD_SLIDE': {
      const sceneSlides = (state.lesson.slides ?? []).filter(
        (s) => s.sceneType === action.sceneType
      );
      const maxOrder = Math.max(0, ...sceneSlides.map((s) => s.order));
      const newSlide: LessonSlide = {
        id: `slide-${action.sceneType}-${Date.now()}`,
        sceneType: action.sceneType,
        title: `Slide ${sceneSlides.length + 1}`,
        order: maxOrder + 1,
        duration: 10,
        autoAdvance: false,
        background: { type: 'color', color: '#ffffff' },
        transition: 'fade',
        transitionDuration: 400,
        elements: [],
        notes: '',
      };
      return {
        ...state,
        ...pushUndo(state),
        lesson: {
          ...state.lesson,
          slides: [...(state.lesson.slides ?? []), newSlide],
        },
        activeSlideId: newSlide.id,
        isDirty: true,
      };
    }

    case 'DELETE_SLIDE': {
      const remaining = (state.lesson.slides ?? []).filter(
        (s) => s.id !== action.slideId
      );
      const wasActive = state.activeSlideId === action.slideId;
      const nextActive = wasActive
        ? remaining[0]?.id ?? null
        : state.activeSlideId;
      return {
        ...state,
        ...pushUndo(state),
        lesson: { ...state.lesson, slides: remaining },
        activeSlideId: nextActive,
        selectedElementId: null,
        isDirty: true,
      };
    }

    case 'DUPLICATE_SLIDE': {
      const original = (state.lesson.slides ?? []).find(
        (s) => s.id === action.slideId
      );
      if (!original) return state;
      const dup: LessonSlide = {
        ...original,
        id: `slide-${original.sceneType}-${Date.now()}`,
        title: `${original.title ?? 'Slide'} (copy)`,
        order: original.order + 0.5,
        elements: original.elements.map((el) => ({
          ...el,
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })),
      };
      // Re-sort and re-index orders
      const all = [...(state.lesson.slides ?? []), dup].sort(
        (a, b) => a.order - b.order
      );
      all.forEach((s, i) => { s.order = i; });
      return {
        ...state,
        ...pushUndo(state),
        lesson: { ...state.lesson, slides: all },
        activeSlideId: dup.id,
        isDirty: true,
      };
    }

    case 'UPDATE_SLIDE': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) => ({
        ...s,
        ...action.patch,
      }));
      return {
        ...state,
        lesson: { ...state.lesson, slides },
        isDirty: true,
      };
    }

    // ── Elements ─────────────────────────────────────────────────────────────
    case 'ADD_ELEMENT': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, action.element],
      }));
      return {
        ...state,
        ...pushUndo(state),
        lesson: { ...state.lesson, slides },
        selectedElementId: action.element.id,
        isDirty: true,
      };
    }

    case 'DELETE_ELEMENT': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) => ({
        ...s,
        elements: s.elements.filter((el) => el.id !== action.elementId),
      }));
      return {
        ...state,
        ...pushUndo(state),
        lesson: { ...state.lesson, slides },
        selectedElementId:
          state.selectedElementId === action.elementId
            ? null
            : state.selectedElementId,
        isDirty: true,
      };
    }

    case 'DUPLICATE_ELEMENT': {
      const slide = (state.lesson.slides ?? []).find(
        (s) => s.id === action.slideId
      );
      const original = slide?.elements.find((el) => el.id === action.elementId);
      if (!original || !slide) return state;
      const dup: SlideElement = {
        ...original,
        id: `el-${Date.now()}`,
        x: Math.min(original.x + 2, 100 - original.width),
        y: Math.min(original.y + 2, 100 - original.height),
        zIndex: (Math.max(0, ...slide.elements.map((e) => e.zIndex)) + 1),
      };
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, dup],
      }));
      return {
        ...state,
        ...pushUndo(state),
        lesson: { ...state.lesson, slides },
        selectedElementId: dup.id,
        isDirty: true,
      };
    }

    case 'UPDATE_ELEMENT': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) =>
        mapElements(s, action.elementId, (el) => ({ ...el, ...action.patch }))
      );
      return {
        ...state,
        lesson: { ...state.lesson, slides },
        isDirty: true,
      };
    }

    case 'MOVE_ELEMENT': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) =>
        mapElements(s, action.elementId, (el) => ({
          ...el,
          x: action.x,
          y: action.y,
        }))
      );
      return { ...state, lesson: { ...state.lesson, slides }, isDirty: true };
    }

    case 'RESIZE_ELEMENT': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) =>
        mapElements(s, action.elementId, (el) => ({
          ...el,
          x: action.x,
          y: action.y,
          width: action.width,
          height: action.height,
        }))
      );
      return { ...state, lesson: { ...state.lesson, slides }, isDirty: true };
    }

    case 'REORDER_ELEMENTS': {
      const slides = mapSlides(state.lesson.slides ?? [], action.slideId, (s) => {
        const ordered = action.elementIds
          .map((id) => s.elements.find((el) => el.id === id))
          .filter(Boolean) as SlideElement[];
        return { ...s, elements: ordered.map((el, i) => ({ ...el, zIndex: i + 1 })) };
      });
      return { ...state, lesson: { ...state.lesson, slides }, isDirty: true };
    }

    // ── Lesson metadata ──────────────────────────────────────────────────────
    case 'UPDATE_LESSON_TITLE':
      return {
        ...state,
        lesson: { ...state.lesson, title: action.title },
        isDirty: true,
      };

    case 'UPDATE_LESSON_META':
      return {
        ...state,
        lesson: { ...state.lesson, ...action.patch },
        isDirty: true,
      };

    // ── Playback ─────────────────────────────────────────────────────────────
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(2, action.zoom)) };

    case 'PLAY':
      return { ...state, playing: true };

    case 'PAUSE':
      return { ...state, playing: false };

    case 'SCRUB':
      return { ...state, playhead: action.time };

    // ── Undo/Redo ────────────────────────────────────────────────────────────
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [state.lesson.slides ?? [], ...state.redoStack].slice(0, MAX_UNDO),
        lesson: { ...state.lesson, slides: prev },
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[0];
      return {
        ...state,
        redoStack: state.redoStack.slice(1),
        undoStack: [...state.undoStack, state.lesson.slides ?? []],
        lesson: { ...state.lesson, slides: next },
        isDirty: true,
      };
    }

    // ── UI ───────────────────────────────────────────────────────────────────
    case 'SET_RIGHT_PANEL':
      return { ...state, rightPanel: action.panel };

    case 'OPEN_MODAL':
      return { ...state, modal: action.modal };

    case 'CLOSE_MODAL':
      return { ...state, modal: null };

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudioState(lesson: Lesson) {
  const firstSlide = lesson.slides?.[0] ?? null;

  const initialState: StudioState = {
    lesson,
    activeSceneType: (firstSlide?.sceneType ?? SECTION_ORDER[0]) as LessonSection,
    activeSlideId: firstSlide?.id ?? null,
    selectedElementId: null,
    zoom: 0.75,
    playing: false,
    playhead: 0,
    isDirty: false,
    undoStack: [],
    redoStack: [],
    rightPanel: 'slide',
    modal: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const activeSlide = useCallback(
    () => (state.lesson.slides ?? []).find((s) => s.id === state.activeSlideId) ?? null,
    [state.lesson.slides, state.activeSlideId]
  );

  const selectedElement = useCallback(() => {
    const slide = activeSlide();
    if (!slide || !state.selectedElementId) return null;
    return slide.elements.find((el) => el.id === state.selectedElementId) ?? null;
  }, [activeSlide, state.selectedElementId]);

  const slidesForScene = useCallback(
    (sceneType: LessonSection) =>
      (state.lesson.slides ?? [])
        .filter((s) => s.sceneType === sceneType)
        .sort((a, b) => a.order - b.order),
    [state.lesson.slides]
  );

  return { state, dispatch, activeSlide, selectedElement, slidesForScene };
}

export type UseStudioState = ReturnType<typeof useStudioState>;
