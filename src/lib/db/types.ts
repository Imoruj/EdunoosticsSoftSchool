/**
 * TypeScript types for local-first data models
 */

// ============ LESSON TYPES ============

export interface Lesson {
  id: string;
  title: string;
  description?: string;
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
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'quiz' | 'assignment' | 'embed' | 'file';
  order: number;
  /** Which lesson phase this block belongs to */
  lessonSection?: 'induction' | 'content' | 'summary' | 'evaluation' | 'assignment';
  /** Per-objective content tracking (Lesson Contents section) */
  objectiveIndex?: number;
  objectiveTab?: string;
  data:
  | TextBlockData
  | ImageBlockData
  | VideoBlockData
  | QuizBlockData
  | AssignmentBlockData
  | EmbedBlockData
  | FileBlockData;
}

export interface TextBlockData {
  content: string; // Rich text HTML or markdown
  format?: 'html' | 'markdown' | 'plain';
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

export interface QuizBlockData {
  quizId?: string; // Optional: for linking to external quiz
  quizTitle?: string;
  instructions?: string;
  required?: boolean;
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
