/**
 * Migration utility: converts legacy ContentBlock[] → LessonSlide[]
 * Called transparently when loading a lesson that has content[] but no slides[].
 */

import type { Lesson, LessonSlide, SlideElement, ContentBlock, LessonSection } from '@/lib/db/types';

const SECTION_ORDER: LessonSection[] = [
  'pre-lesson',
  'induction',
  'introduction',
  'content',
  'summary',
  'evaluation',
  'assignment',
  'thumbnail',
];

const SECTION_LABEL: Record<LessonSection, string> = {
  'pre-lesson': 'Pre-Lesson',
  induction: 'Lesson Induction',
  introduction: 'Lesson Introduction',
  content: 'Lesson Contents',
  summary: 'Lesson Summary',
  evaluation: 'Lesson Evaluation',
  assignment: 'Lesson Assignment',
  thumbnail: 'Lesson Thumbnail',
};

/** Map legacy lessonSection string → LessonSection */
function mapSection(s?: string): LessonSection {
  const map: Record<string, LessonSection> = {
    induction: 'induction',
    introduction: 'introduction',
    content: 'content',
    summary: 'summary',
    evaluation: 'evaluation',
    assignment: 'assignment',
  };
  return map[s ?? ''] ?? 'pre-lesson';
}

/** Convert a single legacy ContentBlock to a SlideElement with default positioning */
function blockToElement(block: ContentBlock, index: number, total: number): SlideElement {
  const SLIDE_DEFAULT_DURATION = 10;
  // Stack elements vertically, centred, each taking ~80% width
  const elementHeight = Math.min(70 / Math.max(total, 1), 30);
  const y = 5 + index * (elementHeight + 3);

  return {
    id: block.id,
    type: block.type,
    data: block.data as SlideElement['data'],
    x: 10,
    y,
    width: 80,
    height: elementHeight,
    zIndex: index + 1,
    startTime: 0,
    endTime: SLIDE_DEFAULT_DURATION,
    animateIn: 'fade',
    animateInDuration: 400,
    opacity: 1,
  };
}

/**
 * Migrate a lesson's legacy content[] into slides[].
 * Returns a new Lesson object (does not mutate the original).
 * If lesson.slides already exists, returns the lesson unchanged.
 */
export function migrateToSlides(lesson: Lesson): Lesson {
  if (lesson.slides && lesson.slides.length > 0) return lesson;

  const SLIDE_DEFAULT_DURATION = 10;

  // Group blocks by section
  const grouped: Map<LessonSection, ContentBlock[]> = new Map();
  for (const section of SECTION_ORDER) {
    grouped.set(section, []);
  }

  for (const block of lesson.content ?? []) {
    const section = mapSection(block.lessonSection);
    grouped.get(section)!.push(block);
  }

  const slides: LessonSlide[] = [];
  let slideOrder = 0;

  for (const section of SECTION_ORDER) {
    const blocks = grouped.get(section)!;
    const elements: SlideElement[] = blocks.map((b, i) =>
      blockToElement(b, i, blocks.length)
    );

    slides.push({
      id: `slide-${section}-1`,
      sceneType: section,
      title: SECTION_LABEL[section],
      order: slideOrder++,
      duration: SLIDE_DEFAULT_DURATION,
      autoAdvance: false,
      background: { type: 'color', color: '#ffffff' },
      transition: 'fade',
      transitionDuration: 400,
      elements,
      notes: '',
    });
  }

  return { ...lesson, slides };
}

/** Create a fresh default lesson (no legacy blocks) with 8 empty scenes */
export function createDefaultSlides(): LessonSlide[] {
  return SECTION_ORDER.map((section, i) => ({
    id: `slide-${section}-1`,
    sceneType: section,
    title: SECTION_LABEL[section],
    order: i,
    duration: 10,
    autoAdvance: false,
    background: { type: 'color', color: '#ffffff' },
    transition: 'fade',
    transitionDuration: 400,
    elements: [],
    notes: '',
  }));
}

export { SECTION_ORDER, SECTION_LABEL };
