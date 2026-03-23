/**
 * TypeScript types for local-first data models
 */

// ============ LESSON TYPES ============

// ============ STUDIO TYPES (Slide-based Lesson Builder) ============

export type LessonSection =
  | 'pre-lesson'
  | 'induction'
  | 'introduction'
  | 'content'
  | 'summary'
  | 'evaluation'
  | 'assignment'
  | 'thumbnail';

export type SlideAnimation =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'bounce';

export type ContentBlockType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'quiz'
  | 'assignment'
  | 'embed'
  | 'file';

export interface SlideElement {
  id: string;
  type: ContentBlockType;
  data:
    | TextBlockData
    | ImageBlockData
    | VideoBlockData
    | AudioBlockData
    | QuizBlockData
    | AssignmentBlockData
    | EmbedBlockData
    | FileBlockData;

  // Canvas position (% of slide width/height, 0–100)
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number; // degrees

  // Timeline timing (seconds from slide start)
  startTime: number; // default 0
  endTime: number;   // default = slide.duration

  // Animation
  animateIn?: SlideAnimation;
  animateInDuration?: number;  // ms, default 300
  animateOut?: SlideAnimation;
  animateOutDuration?: number; // ms, default 300

  // Style overrides
  opacity?: number;       // 0–1
  borderRadius?: number;  // px
  shadow?: boolean;
  background?: string;    // CSS color
  locked?: boolean;       // prevents accidental moves
}

export interface SlideBackground {
  type: 'color' | 'image' | 'gradient';
  color?: string;
  imageUrl?: string;
  gradient?: string; // CSS gradient string
}

export interface LessonSlide {
  id: string;
  sceneType: LessonSection;
  title?: string;
  order: number;

  // Playback
  duration: number;       // seconds; 0 = manual advance
  autoAdvance?: boolean;

  // Visual
  background?: SlideBackground;
  transition?: 'none' | 'fade' | 'slide-left' | 'slide-right';
  transitionDuration?: number; // ms

  elements: SlideElement[];
  notes?: string;        // speaker/teacher notes
  narrationUrl?: string; // auto-play audio narration for this slide
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  // New slide-based model
  slides?: LessonSlide[];
  // Legacy block model (kept for backward-compat migration)
  content: ContentBlock[];
  subjectId: string;
  classArmIds: string[];
  createdById: string;
  createdAt: number;
  updatedAt: number;
  isPublished: boolean;
  publishedAt?: number;
  assignedTo: string[]; // Student IDs or 'all'
  attachments: LessonAttachment[];
  isDownloaded: boolean;
  isPinned: boolean;
  // SOW-linked fields (auto-populated from Scheme of Work)
  sowWeekId?: string;
  sowLessonContent?: string;
  sowObjectives?: string;
  sowSdgNumbers?: number[];
  priorKnowledge?: string;
  thumbnailUrl?: string;
  referenceMaterials?: LessonReferenceMaterial[];
}

export interface LessonReferenceMaterial {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'YOUTUBE' | 'FILE' | 'GOOGLE_DRIVE';
  title: string;
  url?: string;
  fileKey?: string;
  description?: string;
  sortOrder?: number;
  source: 'scheme_of_work';
  addedAt: number;
}

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  order: number;
  /** Which lesson phase this block belongs to */
  lessonSection?: 'induction' | 'introduction' | 'content' | 'summary' | 'evaluation' | 'assignment';
  /** Per-objective content tracking (Lesson Contents section) */
  objectiveIndex?: number;
  objectiveTab?: string;
  aiTag?: string;
  /** Layout / column grouping */
  layoutGroup?: string;           // UUID shared by all blocks in the same row
  layoutColumn?: number;          // 0-based column index within the group
  layoutTotalColumns?: number;    // total columns in this layout group (2 or 3)
  layoutColumnWidth?: number;     // percentage width of this column (e.g. 50, 35, 65)
  layoutRole?: 'audio-avatar';    // marks an image block as a circular speaker avatar
  data:
  | TextBlockData
  | ImageBlockData
  | VideoBlockData
  | AudioBlockData
  | QuizBlockData
  | AssignmentBlockData
  | EmbedBlockData
  | FileBlockData;
}

export interface TextBlockData {
  content: string; // Rich text HTML or markdown
  format?: 'html' | 'markdown' | 'plain';
  fontFamily?: string;
  textColor?: string;
  fontSize?: number;   // px override (applied as wrapper style)
  textAlign?: 'left' | 'center' | 'right';
}

export interface ImageBlockData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface VideoBlockData {
  url: string;
  thumbnail?: string;
  duration?: number;
  caption?: string;
}

export interface AudioBlockData {
  mode: 'generated' | 'upload';
  title?: string;
  caption?: string;
  script?: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface QuizBlockData {
  quizId?: string; // Optional: for linking to external quiz
  quizTitle?: string;
  instructions?: string;
  required?: boolean;
  aiSettings?: {
    selectedQuestionTypes?: Array<'multiple_choice' | 'true_false' | 'drag_drop' | 'short_answer'>;
  };
  // Embedded quiz data (for inline quizzes)
  embeddedQuiz?: {
    questions: QuizQuestion[];
    passingScore?: number;
    showResults?: boolean;
  };
}

export interface AssignmentBlockData {
  assignmentId?: string;
  assignmentTitle?: string;
  instructions?: string;
  required?: boolean;
  dueDate?: number;
}

export interface EmbedBlockData {
  url: string;
  type: 'youtube' | 'vimeo' | 'generic';
  embedCode?: string;
}

export interface FileBlockData {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface LessonAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isEncrypted: boolean;
  iv?: string; // For encrypted files
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  studentId: string;
  isCompleted: boolean;
  completedAt?: number;
  lastAccessedAt: number;
  progress: number; // 0-100
}

// ============ QUIZ TYPES ============

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  classArmIds: string[];
  lessonId?: string;
  createdById: string;
  createdAt: number;
  updatedAt: number;
  isPublished: boolean;
  publishedAt?: number;
  assignedTo: string[];
  questions: QuizQuestion[];
  settings: QuizSettings;
}

export interface QuizSettings {
  timeLimit?: number; // minutes
  passingScore: number; // percentage
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  allowRetake: boolean;
  maxAttempts?: number;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'drag_drop' | 'short_answer' | 'long_answer' | 'true_false';
  order: number;
  questionText: string;
  imageUrl?: string; // Optional image for the question
  points: number;
  explanation?: string;
  data: MCQData | FillBlankData | DragDropData | ShortAnswerData | LongAnswerData | TrueFalseData;
}

export interface MCQData {
  options: QuizOption[];
  multipleCorrect: boolean;
}

export interface QuizOption {
  id: string;
  text: string;
  imageUrl?: string; // Optional image for the option
  isCorrect: boolean;
  order: number;
}

export interface FillBlankData {
  template: string; // Text with [blank] placeholders
  blanks: {
    id: string;
    correctAnswers: string[];
    caseSensitive: boolean;
  }[];
}

export interface DragDropData {
  items: DraggableItem[];
  zones: DropZone[];
  matches: { itemId: string; zoneId: string }[];
}

export interface DraggableItem {
  id: string;
  content: string;
  imageUrl?: string;
}

export interface DropZone {
  id: string;
  label: string;
  acceptMultiple: boolean;
}

export interface ShortAnswerData {
  maxLength: number;
  keywords?: string[]; // For auto-grading hints
}

export interface LongAnswerData {
  minLength: number;
  maxLength: number;
  rubric?: string;
}

export interface TrueFalseData {
  correctAnswer: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: number;
  completedAt?: number;
  responses: QuizResponse[];
  score?: number;
  totalPoints: number;
  earnedPoints: number;
  isPassed: boolean;
}

export interface QuizResponse {
  questionId: string;
  answer: any; // Type depends on question type
  isCorrect?: boolean;
  pointsEarned: number;
}

// ============ ASSIGNMENT TYPES ============

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions: string;
  subjectId: string;
  classArmIds: string[];
  lessonId?: string;
  createdById: string;
  createdAt: number;
  updatedAt: number;
  dueDate: number;
  maxScore: number;
  isPublished: boolean;
  publishedAt?: number;
  assignedTo: string[];
  attachments: AssignmentAttachment[];
  allowLateSubmission: boolean;
  lateSubmissionPenalty?: number; // percentage
}

export interface AssignmentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string;
  attachments: SubmissionAttachment[];
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
  status: 'draft' | 'submitted' | 'late' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  gradedAt?: number;
  gradedById?: string;
  isLate?: boolean;
}

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isEncrypted: boolean;
  iv?: string;
}

// ============ CHAT/MESSAGE TYPES ============

export interface ChatStream {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
  classArmId?: string;
  createdById: string;
  createdAt: number;
  isActive: boolean;
  participants: string[]; // User IDs
}

export interface ChatMessage {
  id: string;
  streamId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  sentAt: number;
  isEdited: boolean;
  editedAt?: number;
  readBy: string[]; // User IDs who have read
  encryptedKeys: Record<string, any>; // Per-recipient encryption
}

// ============ SYNC TYPES ============

export interface SyncQueueItem {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'message' | 'submission';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  data: any;
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  retryCount: number;
  error?: string;
}

export interface SyncMetadata {
  userId: string;
  deviceId: string;
  lastSyncAt: number;
  vectorClock: Record<string, number>; // For CRDT conflict resolution
}

// ============ OFFLINE/STORAGE TYPES ============

export interface OfflineAsset {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment';
  entityId: string;
  downloadedAt: number;
  size: number;
  isPinned: boolean;
}

export interface StorageStats {
  usage: number;
  quota: number;
  percentage: number;
  byType: {
    lessons: number;
    quizzes: number;
    assignments: number;
    media: number;
    other: number;
  };
}
