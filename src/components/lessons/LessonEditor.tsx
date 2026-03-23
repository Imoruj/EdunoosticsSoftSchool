/**
 * Lesson Editor — block-based, phase-guided lesson authoring tool.
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment, ElementType } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus, Type, Image as ImageIcon, Video, Save, Eye, ArrowLeft,
  FileQuestion, Loader2, BookOpen, Target, Globe, ChevronDown,
  ChevronRight, ChevronLeft, Zap, List, FileText, ClipboardList,
  PenSquare, CheckCircle2, Circle, BrainCircuit, ImagePlus, X,
  BookMarked, ExternalLink, Presentation, Volume2, LayoutGrid, Trash2,
} from 'lucide-react';
import type {
  Lesson, ContentBlock,
  TextBlockData, ImageBlockData, VideoBlockData, AudioBlockData,
  QuizBlockData, AssignmentBlockData,
  LessonReferenceMaterial,
} from '@/lib/db/types';
import { TextBlock, ImageBlock, VideoBlock, AudioBlock, QuizBlock, AssignmentBlock } from './ContentBlocks';
import type { LessonAiContext } from './ContentBlocks';
import { LayoutPicker, LAYOUT_TEMPLATES } from './LayoutPicker';
import type { LayoutTemplate } from './LayoutPicker';
import { useLessons } from '@/lib/db/hooks';
import { useRouter } from 'next/navigation';
import { SyncStatus } from '../sync/SyncStatus';
import { TargetAudienceSelector } from '@/components/shared/TargetAudienceSelector';
import { showAppAlert, showAppConfirm } from '@/lib/appMessageBox';
import { normalizeVideoEmbedUrl } from '@/lib/videoEmbed';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SowWeek {
  weekId: string; weekNumber: number; topic: string;
  content: string | null; objectives: string | null;
  waecObjectives: string | null; jambObjectives: string | null;
  igcseObjectives: string | null; sdgNumbers: number[];
  sowId: string; sowTitle: string; termName: string;
  termNumber: number; className: string; sessionName: string;
  references?: SowReference[]; // Populated from approved snapshot
  isFromSnapshot?: boolean;
}

interface NavSection { id: string; label: string; Icon: ElementType; color: string; }
interface LessonEditorProps { lesson?: Lesson; userId: string; }
type LessonSection = ContentBlock['lessonSection'];

interface SowReference {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'YOUTUBE' | 'FILE' | 'GOOGLE_DRIVE';
  title: string;
  url: string | null;
  fileKey: string | null;
  description: string | null;
  sortOrder: number;
}

// ─── Module-level constants (never re-created on render) ──────────────────────

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
};

const NAV_SECTIONS: NavSection[] = [
  { id: 'pre-lesson', label: 'Pre-Lesson',       Icon: BookOpen,      color: 'text-blue-600'   },
  { id: 'induction',     label: 'Lesson Induction',     Icon: Zap,          color: 'text-amber-600'   },
  { id: 'introduction', label: 'Lesson Introduction', Icon: Presentation, color: 'text-sky-600'     },
  { id: 'contents',     label: 'Lesson Contents',     Icon: List,         color: 'text-green-600'   },
  { id: 'summary',    label: 'Lesson Summary',    Icon: FileText,      color: 'text-purple-600' },
  { id: 'evaluation', label: 'Lesson Evaluation', Icon: ClipboardList, color: 'text-rose-600'   },
  { id: 'assignment', label: 'Lesson Assignment', Icon: PenSquare,     color: 'text-indigo-600' },
  { id: 'thumbnail',  label: 'Lesson Thumbnail',  Icon: ImagePlus,     color: 'text-pink-600'   },
];

/** Default data shapes for each block type. */
const BLOCK_DATA_DEFAULTS: Partial<Record<ContentBlock['type'], ContentBlock['data']>> = {
  text:       { content: '', format: 'html' },
  image:      { url: '', alt: '', caption: '' },
  video:      { url: '', caption: '' },
  audio:      { mode: 'upload', title: '', caption: '' } as AudioBlockData,
  quiz:       { quizId: '', quizTitle: '', instructions: '', required: false },
  assignment: { assignmentId: '', assignmentTitle: '', instructions: '', required: false },
};

/** Objectives accordion config — defined outside the component so it's stable. */
const OBJECTIVE_TABS = [
  { key: 'general', label: 'General', headerCls: 'bg-gray-100 border-gray-200',  labelCls: 'text-gray-600',  bodyCls: 'bg-gray-50 border-gray-200 text-gray-700'   },
  { key: 'waec',    label: 'WAEC',    headerCls: 'bg-amber-50 border-amber-200', labelCls: 'text-amber-700', bodyCls: 'bg-amber-50 border-amber-200 text-gray-700'  },
  { key: 'jamb',    label: 'JAMB',    headerCls: 'bg-purple-50 border-purple-200', labelCls: 'text-purple-700', bodyCls: 'bg-purple-50 border-purple-200 text-gray-700' },
  { key: 'igcse',   label: 'IGCSE',   headerCls: 'bg-teal-50 border-teal-200',  labelCls: 'text-teal-700',  bodyCls: 'bg-teal-50 border-teal-200 text-gray-700'    },
] as const;

// ─── Layout-picker side-panel context ────────────────────────────────────────
// Lets AddBlockBar / ChangeLayoutBar open the right-panel picker without prop-drilling.
interface LayoutPickerCtxValue {
  openPicker: (onSelect: (t: LayoutTemplate) => void) => void;
}
const LayoutPickerCtx = createContext<LayoutPickerCtxValue | null>(null);

const REFERENCE_TYPE_LABEL: Record<SowReference['type'], string> = {
  TEXT: 'Text', IMAGE: 'Image', AUDIO: 'Audio',
  YOUTUBE: 'YouTube', FILE: 'File', GOOGLE_DRIVE: 'Drive',
};

const REFERENCE_TYPE_STYLE: Record<SowReference['type'], string> = {
  TEXT:         'bg-gray-100 text-gray-600',
  IMAGE:        'bg-blue-50 text-blue-600',
  AUDIO:        'bg-purple-50 text-purple-600',
  YOUTUBE:      'bg-red-50 text-red-600',
  FILE:         'bg-green-50 text-green-600',
  GOOGLE_DRIVE: 'bg-yellow-50 text-yellow-700',
};

const DocxViewer = dynamic(() => import('@/components/ui/DocxViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 bg-gray-50">
      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  ),
});

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m?.[1] ?? null;
}

function getReferenceSource(reference: SowReference): string | null {
  return reference.fileKey || reference.url;
}

function getReferenceFileName(reference: SowReference, source: string): string {
  const fallback = reference.title.trim() || 'resource';
  const cleaned = (source.split('?')[0] || source).split('#')[0] || source;
  const rawFileName = cleaned.split('/').pop();
  if (!rawFileName) return fallback;

  try {
    return decodeURIComponent(rawFileName);
  } catch {
    return rawFileName;
  }
}

function parseFileNameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

function inferExtensionFromMimeType(mimeType: string | null): string | null {
  if (!mimeType) return null;

  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  const byMimeType: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/csv': '.csv',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
  };

  return byMimeType[normalized] ?? null;
}

function buildOfficeEmbedUrl(source: string): string | null {
  if (typeof window === 'undefined') return null;

  const absoluteSource = source.startsWith('/')
    ? `${window.location.origin}${source}`
    : source;

  if (!/^https?:\/\//i.test(absoluteSource)) return null;

  try {
    const hostname = new URL(absoluteSource).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }
  } catch {
    return null;
  }

  return `https://docs.google.com/gview?url=${encodeURIComponent(absoluteSource)}&embedded=true`;
}

function toLessonReferenceMaterial(reference: SowReference): LessonReferenceMaterial {
  return {
    id: reference.id,
    type: reference.type,
    title: reference.title,
    url: reference.url || undefined,
    fileKey: reference.fileKey || undefined,
    description: reference.description || undefined,
    sortOrder: reference.sortOrder,
    source: 'scheme_of_work',
    addedAt: Date.now(),
  };
}

function toPreviewReference(reference: LessonReferenceMaterial): SowReference {
  return {
    id: reference.id,
    type: reference.type,
    title: reference.title,
    url: reference.url ?? null,
    fileKey: reference.fileKey ?? null,
    description: reference.description ?? null,
    sortOrder: reference.sortOrder ?? 0,
  };
}

function getReferenceTargetSection(activeNavSection: string): LessonSection | null {
  switch (activeNavSection) {
    case 'induction':
    case 'introduction':
    case 'summary':
    case 'evaluation':
    case 'assignment':
      return activeNavSection;
    case 'contents':
      return 'content';
    default:
      return null;
  }
}

function ReferenceFilePreview({ reference }: { reference: SowReference }) {
  const source = getReferenceSource(reference);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resolvedFileName, setResolvedFileName] = useState<string | null>(null);
  const [resolvedMimeType, setResolvedMimeType] = useState<string | null>(null);
  const [metadataReady, setMetadataReady] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setResolvedFileName(null);
    setResolvedMimeType(null);
    setMetadataReady(false);
  }, [source]);

  useEffect(() => {
    if (!source) {
      setMetadataReady(true);
      return;
    }

    const metadataSource = source;
    const controller = new AbortController();

    async function resolveFileMetadata() {
      try {
        const response = await fetch(metadataSource, {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const dispositionFileName = parseFileNameFromDisposition(response.headers.get('content-disposition'));
        const mimeType = response.headers.get('content-type');

        if (dispositionFileName) {
          setResolvedFileName(dispositionFileName);
        } else if (mimeType) {
          const inferredExtension = inferExtensionFromMimeType(mimeType);
          if (inferredExtension) {
            const fallbackName = reference.title.trim() || 'resource';
            const hasExtension = /\.[a-z0-9]+$/i.test(fallbackName);
            setResolvedFileName(hasExtension ? fallbackName : `${fallbackName}${inferredExtension}`);
          }
        }

        if (mimeType) {
          setResolvedMimeType(mimeType.split(';')[0].trim().toLowerCase());
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to resolve lesson reference metadata', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setMetadataReady(true);
        }
      }
    }

    resolveFileMetadata();

    return () => controller.abort();
  }, [reference.title, source]);

  if (!source) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <FileText className="w-12 h-12 text-gray-300" />
        <p className="text-sm text-gray-400">No preview available</p>
      </div>
    );
  }

  if (!metadataReady) {
    return (
      <div className="flex items-center justify-center min-h-[20rem]">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  const fileName = resolvedFileName || getReferenceFileName(reference, source);
  const normalizedMimeType = resolvedMimeType || null;
  const isImage = Boolean(normalizedMimeType?.startsWith('image/')) || /\.(jpe?g|png|gif|webp)$/i.test(fileName);
  const isAudio = Boolean(normalizedMimeType?.startsWith('audio/')) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
  const isVideo = Boolean(normalizedMimeType?.startsWith('video/')) || /\.(mp4|webm|mov|m4v)$/i.test(fileName);
  const isPdf = normalizedMimeType === 'application/pdf' || /\.pdf$/i.test(fileName);
  const isDocx = normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(fileName);
  const isText = Boolean(normalizedMimeType?.startsWith('text/')) || /\.(txt|md|csv)$/i.test(fileName);
  const isLegacyOffice = normalizedMimeType === 'application/msword'
    || normalizedMimeType === 'application/vnd.ms-powerpoint'
    || normalizedMimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    || normalizedMimeType === 'application/vnd.ms-excel'
    || normalizedMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || /\.(pptx?|xlsx?|doc)$/i.test(fileName);
  const officeEmbedUrl = isLegacyOffice
    ? buildOfficeEmbedUrl(source)
    : null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <FileText className="w-12 h-12 text-gray-300" />
        <p className="text-sm text-gray-500">Preview unavailable for this file.</p>
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-1.5"
        >
          <ExternalLink className="w-4 h-4" /> Open File
        </a>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative flex items-center justify-center min-h-[20rem]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
        <img
          src={source}
          alt={reference.title}
          className="max-w-full max-h-[60vh] object-contain rounded transition-opacity"
          style={{ opacity: loading ? 0 : 1 }}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <audio controls className="w-full max-w-sm" onCanPlay={() => setLoading(false)} onError={() => setError(true)}>
          <source src={source} />
        </audio>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        <video
          controls
          className="w-full h-full"
          onCanPlay={() => setLoading(false)}
          onError={() => setError(true)}
        >
          <source src={source} />
        </video>
      </div>
    );
  }

  if (isDocx) {
    return (
      <div className="h-[60vh] overflow-hidden rounded border border-gray-100 bg-gray-50">
        <DocxViewer fileUrl={source} onLoad={() => setLoading(false)} />
      </div>
    );
  }

  if (isPdf || isText || officeEmbedUrl) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-gray-100 bg-gray-50">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
        <iframe
          src={officeEmbedUrl || source}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          title={`Preview of ${reference.title}`}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <FileText className="w-12 h-12 text-gray-300" />
      <p className="text-sm text-gray-500">Open this file to view it.</p>
      <a
        href={source}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-1.5"
      >
        <ExternalLink className="w-4 h-4" /> Open File
      </a>
    </div>
  );
}

function ReferenceCard({ reference: r, onAdd, onPreview }: { reference: SowReference; onAdd?: () => void; onPreview?: () => void }) {
  const source = getReferenceSource(r);
  const badge = (
    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${REFERENCE_TYPE_STYLE[r.type]}`}>
      {REFERENCE_TYPE_LABEL[r.type]}
    </span>
  );

  const actionBtns = (
    <div className="mt-2 flex gap-2">
      {onPreview && (
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add to Lesson
        </button>
      )}
    </div>
  );

  if (r.type === 'YOUTUBE' && r.url) {
    const vid = extractYouTubeId(r.url);
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {vid && (
          <button type="button" onClick={onPreview} className="w-full block relative group">
            <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={r.title} className="w-full h-28 object-cover" />
            {onPreview && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        )}
        <div className="p-3 space-y-1">
          {badge}
          <p className="text-sm font-semibold text-gray-900 leading-tight">{r.title}</p>
          {r.description && <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>}
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <ExternalLink className="w-3 h-3" /> Watch on YouTube
          </a>
          {actionBtns}
        </div>
      </div>
    );
  }

  if (r.type === 'IMAGE' && source) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button type="button" onClick={onPreview} className="w-full block relative group">
          <img src={source} alt={r.title} className="w-full h-28 object-cover" />
          {onPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="w-6 h-6 text-white drop-shadow" />
            </div>
          )}
        </button>
        <div className="p-3 space-y-1">
          {badge}
          <p className="text-sm font-semibold text-gray-900 leading-tight">{r.title}</p>
          {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
          {actionBtns}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        {badge}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{r.title}</p>
          {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>}
          {source && (
            <a href={source} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> Open link
            </a>
          )}
        </div>
      </div>
      {actionBtns}
    </div>
  );
}

function PreviewModal({ reference: r, onClose }: { reference: SowReference | null; onClose: () => void }) {
  if (!r) return null;
  const source = getReferenceSource(r);

  const renderContent = () => {
    if (r.type === 'YOUTUBE' && r.url) {
      const vid = extractYouTubeId(r.url);
      if (vid) {
        return (
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${vid}`}
              className="w-full h-full rounded"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        );
      }
    }

    if (r.type === 'IMAGE' && source) {
      return (
        <div className="flex items-center justify-center">
          <img src={source} alt={r.title} className="max-w-full max-h-[60vh] object-contain rounded" />
        </div>
      );
    }

    if (r.type === 'AUDIO' && source) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <audio controls className="w-full max-w-sm">
            <source src={source} />
          </audio>
        </div>
      );
    }

    if (r.type === 'GOOGLE_DRIVE' && r.url) {
      const embedUrl = r.url.replace('/view', '/preview').replace('/edit', '/preview');
      return (
        <div className="aspect-[4/3] w-full">
          <iframe src={embedUrl} className="w-full h-full rounded" allow="autoplay" />
        </div>
      );
    }

    if (r.type === 'FILE' && source) {
      return <ReferenceFilePreview reference={r} />;
    }

    // TEXT or fallback
    return (
      <div className="p-2">
        {r.description && <p className="text-sm text-gray-700 leading-relaxed">{r.description}</p>}
        {source && (
          <a href={source} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ExternalLink className="w-4 h-4" /> Open link
          </a>
        )}
        {!r.description && !source && <p className="text-sm text-gray-400 text-center py-8">No preview available</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b flex items-center gap-2.5">
          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${REFERENCE_TYPE_STYLE[r.type]}`}>
            {REFERENCE_TYPE_LABEL[r.type]}
          </span>
          <h3 className="text-base font-bold text-gray-900 flex-1 truncate">{r.title}</h3>
          {source && r.type !== 'YOUTUBE' && (
            <a href={source} target="_blank" rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-blue-600">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {renderContent()}
          {r.description && r.type !== 'TEXT' && r.type !== 'AUDIO' && (
            <p className="mt-3 text-xs text-gray-500 border-t pt-3">{r.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared local components ──────────────────────────────────────────────────

function SectionHeader({
  Icon, iconClass, title, done, accentStrip,
}: { Icon: ElementType; iconClass: string; title: string; done: boolean; accentStrip?: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm -mx-6 px-5 pt-4 pb-3 mb-5 border-b border-gray-100 flex items-center gap-3">
      {accentStrip && <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${accentStrip}`} />}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-200 shadow-sm shrink-0`}>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <h2 className="text-sm font-bold text-gray-900 flex-1 leading-tight">{title}</h2>
      {done && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Done</span>
        </div>
      )}
    </div>
  );
}

function SectionNavRow({
  prev, next, onGo,
}: { prev?: string; next?: string; onGo: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
      {prev ? (
        <button type="button" onClick={() => onGo(prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
      ) : <span />}
      {next && (
        <button type="button" onClick={() => onGo(next)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const ADD_BLOCK_LABELS: Partial<Record<ContentBlock['type'], { icon: ElementType; label: string }>> = {
  text:       { icon: Type,         label: 'Text'       },
  image:      { icon: ImageIcon,    label: 'Image'      },
  video:      { icon: Video,        label: 'Video'      },
  audio:      { icon: Volume2,      label: 'Audio'      },
  quiz:       { icon: FileQuestion, label: 'Quiz'       },
  assignment: { icon: PenSquare,    label: 'Assignment' },
};

function AddBlockBar({
  section, allowed, onAdd, onAddLayout, extra,
}: {
  section: LessonSection;
  allowed: ContentBlock['type'][];
  onAdd: (type: ContentBlock['type'], section: LessonSection, extra?: { objectiveIndex?: number; objectiveTab?: string }) => void;
  onAddLayout: (template: LayoutTemplate, section: LessonSection, extra?: { objectiveIndex?: number; objectiveTab?: string }) => void;
  extra?: { objectiveIndex?: number; objectiveTab?: string };
}) {
  const pickerCtx = useContext(LayoutPickerCtx);

  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 whitespace-nowrap hidden sm:block">+ Add</span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {allowed.map((type) => {
            const cfg = ADD_BLOCK_LABELS[type];
            if (!cfg) return null;
            const { icon: BtnIcon, label } = cfg;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAdd(type, section, extra)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 hover:shadow-sm transition-all text-xs font-medium"
              >
                <BtnIcon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
          <div className="w-px bg-gray-200 self-stretch" />
          <button
            type="button"
            onClick={() => pickerCtx?.openPicker((template) => onAddLayout(template, section, extra))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border bg-white border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 hover:shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Layout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Block renderer helper ────────────────────────────────────────────────────

function renderBlock(block: ContentBlock, sharedProps: Parameters<typeof TextBlock>[0], lessonContext?: LessonAiContext) {
  const props = { ...sharedProps, lessonContext };
  if (block.type === 'text')       return <TextBlock       key={block.id} {...props} />;
  if (block.type === 'image')      return <ImageBlock      key={block.id} {...props} />;
  if (block.type === 'video')      return <VideoBlock      key={block.id} {...props} />;
  if (block.type === 'audio')      return <AudioBlock      key={block.id} {...props} />;
  if (block.type === 'quiz')       return <QuizBlock       key={block.id} {...props} />;
  if (block.type === 'assignment') return <AssignmentBlock key={block.id} {...props} />;
  return null;
}

// ─── Layout group container — resizable columns ───────────────────────────────

function LayoutGroupContainer({
  groupBlocks, allBlocks, onUpdate, onDelete, priorKnowledge, lessonContext,
}: {
  groupBlocks: ContentBlock[];
  allBlocks: ContentBlock[];
  onUpdate: (index: number, block: ContentBlock) => void;
  onDelete: (index: number) => void;
  priorKnowledge: string;
  lessonContext?: LessonAiContext;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dividerIdx: number; startX: number; startWidths: number[] } | null>(null);

  const totalCols = groupBlocks[0]?.layoutTotalColumns ?? 2;

  // Build initial widths from block data or equal split
  const getInitialWidths = useCallback((): number[] => {
    const byCol: Record<number, number> = {};
    for (const b of groupBlocks) {
      const col = b.layoutColumn ?? 0;
      if (byCol[col] === undefined && b.layoutColumnWidth !== undefined) {
        byCol[col] = b.layoutColumnWidth;
      }
    }
    const stored = Array.from({ length: totalCols }, (_, i) => byCol[i]);
    if (stored.every((w) => w !== undefined)) return stored as number[];
    const base = Math.floor(100 / totalCols);
    const widths = Array(totalCols).fill(base);
    widths[totalCols - 1] = 100 - base * (totalCols - 1);
    return widths;
  }, [groupBlocks, totalCols]);

  const [colWidths, setColWidths] = useState<number[]>(getInitialWidths);

  // Group blocks by column index
  const blocksByCol = useMemo(() => {
    const map: Record<number, ContentBlock[]> = {};
    for (let c = 0; c < totalCols; c++) map[c] = [];
    for (const b of groupBlocks) map[b.layoutColumn ?? 0]?.push(b);
    return map;
  }, [groupBlocks, totalCols]);

  const saveWidths = useCallback((widths: number[]) => {
    for (const b of groupBlocks) {
      const col = b.layoutColumn ?? 0;
      const newW = widths[col] ?? Math.floor(100 / totalCols);
      if (Math.abs((b.layoutColumnWidth ?? 0) - newW) > 0.5) {
        const idx = allBlocks.indexOf(b);
        if (idx !== -1) onUpdate(idx, { ...b, layoutColumnWidth: newW });
      }
    }
  }, [groupBlocks, allBlocks, onUpdate, totalCols]);

  const handleDeleteGroup = () => {
    // Delete all blocks in this group (reverse order to keep indices stable)
    const indices = groupBlocks.map((b) => allBlocks.indexOf(b)).filter((i) => i !== -1).sort((a, b) => b - a);
    for (const idx of indices) onDelete(idx);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { dividerIdx, startX, startWidths } = dragRef.current;
      const containerW = containerRef.current.offsetWidth;
      const dxPct = ((e.clientX - startX) / containerW) * 100;
      setColWidths(() => {
        const next = [...startWidths];
        const min = 15;
        next[dividerIdx]     = Math.max(min, startWidths[dividerIdx] + dxPct);
        next[dividerIdx + 1] = Math.max(min, startWidths[dividerIdx + 1] - dxPct);
        // Re-normalise to exactly 100%
        const total = next.reduce((s, v) => s + v, 0);
        return next.map((v) => (v / total) * 100);
      });
    };
    const onMouseUp = () => {
      if (dragRef.current) {
        setColWidths((current) => { saveWidths(current); return current; });
        dragRef.current = null;
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [saveWidths]);

  return (
    <div className="group/layout relative border border-dashed border-gray-300 rounded-xl p-1 hover:border-violet-300 transition-colors">
      {/* Delete layout button */}
      <button
        type="button"
        title="Delete entire layout"
        onClick={handleDeleteGroup}
        className="absolute -top-2.5 -right-2.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover/layout:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 shadow"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Column strip */}
      <div ref={containerRef} className="flex w-full select-none">
        {Array.from({ length: totalCols }).map((_, colIdx) => (
          <Fragment key={colIdx}>
            {/* Resize divider between columns */}
            {colIdx > 0 && (
              <div
                className="w-2 shrink-0 cursor-col-resize flex items-center justify-center group/handle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  dragRef.current = { dividerIdx: colIdx - 1, startX: e.clientX, startWidths: [...colWidths] };
                }}
              >
                <div className="w-0.5 h-full bg-gray-200 group-hover/handle:bg-violet-400 transition-colors rounded-full" />
              </div>
            )}

            {/* Column content */}
            <div
              className="min-w-0 space-y-2 p-1"
              style={{ width: `${colWidths[colIdx]}%`, flexShrink: 0 }}
            >
              {(blocksByCol[colIdx] ?? []).map((block) => {
                const idx = allBlocks.indexOf(block);
                const sharedProps = {
                  block,
                  onUpdate: (u: ContentBlock) => onUpdate(idx, u),
                  onDelete: () => onDelete(idx),
                  priorKnowledge,
                };
                return renderBlock(block, sharedProps, lessonContext);
              })}
            </div>
          </Fragment>
        ))}
      </div>

      {/* Width indicator (visible while dragging) */}
      <div className="flex gap-1 mt-1 opacity-0 group-hover/layout:opacity-100 transition-opacity">
        {colWidths.map((w, i) => (
          <span key={i} className="text-[10px] text-gray-400" style={{ width: `${w}%` }}>
            {Math.round(w)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Group blocks by layoutGroup (consecutive) ───────────────────────────────

function groupBlocksForLayout(blocks: ContentBlock[]): Array<ContentBlock | ContentBlock[]> {
  const result: Array<ContentBlock | ContentBlock[]> = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (!block.layoutGroup) {
      result.push(block);
      i++;
    } else {
      const group: ContentBlock[] = [];
      const gid = block.layoutGroup;
      while (i < blocks.length && blocks[i].layoutGroup === gid) {
        group.push(blocks[i]);
        i++;
      }
      // Sort by column within group
      group.sort((a, b) => (a.layoutColumn ?? 0) - (b.layoutColumn ?? 0));
      result.push(group);
    }
  }
  return result;
}

// ─── Change-layout bar (replaces AddBlockBar when section has content) ────────

function ChangeLayoutBar({ onReplace }: { onReplace: (template: LayoutTemplate) => void }) {
  const pickerCtx = useContext(LayoutPickerCtx);
  return (
    <div className="pt-3 border-t border-gray-100">
      <button
        type="button"
        onClick={() => pickerCtx?.openPicker((template) => onReplace(template))}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors border-violet-300 text-violet-700 hover:bg-violet-50"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Change Layout
      </button>
    </div>
  );
}

// ─── Section blocks ───────────────────────────────────────────────────────────

function SectionBlocks({
  sectionBlocks, allBlocks, onUpdate, onDelete, priorKnowledge, lessonContext,
}: {
  sectionBlocks: ContentBlock[];
  allBlocks: ContentBlock[];
  onUpdate: (index: number, block: ContentBlock) => void;
  onDelete: (index: number) => void;
  priorKnowledge: string;
  lessonContext?: LessonAiContext;
}) {
  const grouped = groupBlocksForLayout(sectionBlocks);

  return (
    <div className="space-y-3">
      {grouped.map((item) => {
        if (Array.isArray(item)) {
          return (
            <LayoutGroupContainer
              key={item[0].layoutGroup}
              groupBlocks={item}
              allBlocks={allBlocks}
              onUpdate={onUpdate}
              onDelete={onDelete}
              priorKnowledge={priorKnowledge}
              lessonContext={lessonContext}
            />
          );
        }
        const idx = allBlocks.indexOf(item);
        const sharedProps = {
          block: item,
          onUpdate: (u: ContentBlock) => onUpdate(idx, u),
          onDelete: () => onDelete(idx),
          priorKnowledge,
        };
        return renderBlock(item, sharedProps, lessonContext);
      })}
    </div>
  );
}

function EmptyState({
  icon: Icon, iconClass, title, subtitle, dashed,
}: { icon: ElementType; iconClass: string; title: string; subtitle: string; dashed: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed ${dashed} rounded-2xl text-center`}>
      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3">
        <Icon className={`w-7 h-7 ${iconClass}`} />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">{subtitle}</p>
    </div>
  );
}

// ─── Preview block renderer ───────────────────────────────────────────────────

function PreviewBlock({ block }: { block: ContentBlock }) {
  if (block.type === 'text') {
    const d = block.data as TextBlockData;
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.content }} />;
  }
  if (block.type === 'image') {
    const d = block.data as ImageBlockData;
    return (
      <div className="space-y-2">
        <img src={d.url} alt={d.alt || 'Image'} className="max-w-full h-auto rounded-lg" />
        {d.caption && <p className="text-sm text-gray-600 text-center italic">{d.caption}</p>}
      </div>
    );
  }
  if (block.type === 'video') {
    const d = block.data as VideoBlockData;
    return (
      <div className="space-y-2">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <iframe src={normalizeVideoEmbedUrl(d.url)} className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
        {d.caption && <p className="text-sm text-gray-600 text-center italic">{d.caption}</p>}
      </div>
    );
  }
  if (block.type === 'audio') {
    const d = block.data as AudioBlockData;
    return (
      <div className="space-y-1">
        {d.title && <p className="text-sm font-medium text-gray-800">{d.title}</p>}
        {d.url ? (
          <audio controls className="w-full">
            <source src={d.url} type={d.fileType || 'audio/wav'} />
          </audio>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg text-gray-400 text-sm">
            <Volume2 className="w-4 h-4" /> No audio attached
          </div>
        )}
        {d.caption && <p className="text-xs text-gray-500 italic">{d.caption}</p>}
      </div>
    );
  }
  if (block.type === 'quiz') {
    const d = block.data as QuizBlockData;
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-700 font-semibold">Lesson Quiz</p>
        <p className="text-base text-blue-900 mt-1">{d.quizTitle || 'Linked Quiz'}</p>
        {d.instructions && <p className="text-sm text-blue-800 mt-1">{d.instructions}</p>}
        {d.required && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 mt-2">Required</span>}
      </div>
    );
  }
  if (block.type === 'assignment') {
    const d = block.data as AssignmentBlockData;
    return (
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-sm text-indigo-700 font-semibold">Lesson Assignment</p>
        <p className="text-base text-indigo-900 mt-1">{d.assignmentTitle || 'Linked Assignment'}</p>
        {d.instructions && <p className="text-sm text-indigo-800 mt-1">{d.instructions}</p>}
        {d.required && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 mt-2">Required</span>}
      </div>
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LessonEditor({ lesson, userId }: LessonEditorProps) {
  const router = useRouter();
  const { saveLesson } = useLessons();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle]               = useState(lesson?.title || '');
  const [description, setDescription]   = useState(lesson?.description || '');
  const [priorKnowledge, setPriorKnowledge] = useState(lesson?.priorKnowledge || '');
  const [subjectId, setSubjectId]       = useState(lesson?.subjectId || '');
  const [classId, setClassId]           = useState('');
  const [classArmIds, setClassArmIds]   = useState<string[]>(lesson?.classArmIds || []);
  const [assignedTo, setAssignedTo]     = useState<string[]>(lesson?.assignedTo || []);
  const [blocks, setBlocks]             = useState<ContentBlock[]>(lesson?.content || []);
  const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.thumbnailUrl || '');
  const [subjectName, setSubjectName]   = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [isPreview, setIsPreview]       = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  // ── SOW state ───────────────────────────────────────────────────────────────
  const [sowWeeks, setSowWeeks]               = useState<SowWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId]   = useState(lesson?.sowWeekId || '');
  const [sowLoading, setSowLoading]           = useState(false);
  const [sowLessonContent, setSowLessonContent] = useState(lesson?.sowLessonContent || '');
  const [sowSdgNumbers, setSowSdgNumbers]     = useState<number[]>(lesson?.sowSdgNumbers || []);
  const [sowObjectivesParsed, setSowObjectivesParsed] = useState<
    { general?: string; waec?: string; jamb?: string; igcse?: string }
  >({});
  const [selectedTermNumber, setSelectedTermNumber] = useState<number | null>(null);
  const [openObjectives, setOpenObjectives]   = useState<Set<string>>(new Set(['general']));
  const [openObjectiveSubs, setOpenObjectiveSubs]   = useState<Set<number>>(new Set([0]));
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [sowReferences, setSowReferences]           = useState<SowReference[]>([]);
  const [lessonReferenceMaterials, setLessonReferenceMaterials] = useState<LessonReferenceMaterial[]>(lesson?.referenceMaterials || []);
  const [resourcesLoading, setResourcesLoading]     = useState(false);
  const [previewRef, setPreviewRef]                 = useState<SowReference | null>(null);
  const [generatingField, setGeneratingField]       = useState<'description' | 'priorKnowledge' | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [leftHovered, setLeftHovered]     = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [layoutPickerCallback, setLayoutPickerCallback] = useState<((t: LayoutTemplate) => void) | null>(null);
  const [activeNavSection, setActiveNavSection] = useState('pre-lesson');
  const centerPanelRef = useRef<HTMLDivElement>(null);

  const leftIsExpanded = !leftCollapsed || leftHovered;

  // ── Derived state (memoized) ─────────────────────────────────────────────────
  const blocksBySection = useMemo(() => ({
    induction:    blocks.filter((b) => b.lessonSection === 'induction'),
    introduction: blocks.filter((b) => b.lessonSection === 'introduction'),
    content:      blocks.filter((b) => !b.lessonSection || b.lessonSection === 'content'),
    summary:      blocks.filter((b) => b.lessonSection === 'summary'),
    evaluation:   blocks.filter((b) => b.lessonSection === 'evaluation'),
    assignment:   blocks.filter((b) => b.lessonSection === 'assignment'),
  }), [blocks]);

  const parsedObjectives = useMemo(() => {
    const text = sowObjectivesParsed.general;
    if (!text) return [];
    return text.split('\n').map((l) => l.trim()).filter(Boolean);
  }, [sowObjectivesParsed]);

  const blocksByObjective = useMemo(() => {
    const map: Record<number, ContentBlock[]> = {};
    for (const b of blocksBySection.content) {
      if (b.objectiveTab === 'general' && typeof b.objectiveIndex === 'number') {
        (map[b.objectiveIndex] ??= []).push(b);
      }
    }
    return map;
  }, [blocksBySection.content]);

  const orphanedContentBlocks = useMemo(() =>
    blocksBySection.content.filter((b) =>
      b.objectiveTab === 'general' &&
      typeof b.objectiveIndex === 'number' &&
      b.objectiveIndex >= parsedObjectives.length,
    ),
  [blocksBySection.content, parsedObjectives.length]);

  const freeFormContentBlocks = useMemo(() =>
    blocksBySection.content.filter((b) => typeof b.objectiveIndex !== 'number'),
  [blocksBySection.content]);

  const sectionComplete = useMemo<Record<string, boolean>>(() => ({
    'pre-lesson':  !!selectedWeekId,
    induction:     blocksBySection.induction.length > 0,
    introduction:  blocksBySection.introduction.length > 0,
    contents:      parsedObjectives.length > 0
      ? parsedObjectives.every((_, idx) => (blocksByObjective[idx]?.length ?? 0) > 0)
      : blocksBySection.content.length > 0,
    summary:     blocksBySection.summary.length > 0,
    evaluation:  blocksBySection.evaluation.length > 0,
    assignment:  blocksBySection.assignment.length > 0,
    thumbnail:   !!thumbnailUrl,
  }), [selectedWeekId, blocksBySection, thumbnailUrl, parsedObjectives, blocksByObjective]);

  const availableTerms = useMemo(() =>
    Array.from(
      new Map(sowWeeks.map((w) => [w.termNumber, { termNumber: w.termNumber, termName: w.termName }])).values()
    ).sort((a, b) => a.termNumber - b.termNumber),
  [sowWeeks]);

  const filteredWeeks = useMemo(() =>
    selectedTermNumber
      ? sowWeeks.filter((w) => w.termNumber === selectedTermNumber)
      : availableTerms.length > 0 ? [] : sowWeeks,
  [sowWeeks, selectedTermNumber, availableTerms.length]);

  const groupedWeeks = useMemo(() =>
    filteredWeeks.reduce<Record<string, { label: string; weeks: SowWeek[] }>>((acc, w) => {
      const key = `${w.sowId}-${w.termNumber}`;
      if (!acc[key]) acc[key] = { label: `${w.termName} — ${w.className} — ${w.sessionName}`, weeks: [] };
      acc[key].weeks.push(w);
      return acc;
    }, {}),
  [filteredWeeks]);

  const hasSOWData = useMemo(() =>
    !!(sowLessonContent || sowObjectivesParsed.general || sowObjectivesParsed.waec ||
       sowObjectivesParsed.jamb || sowObjectivesParsed.igcse || sowSdgNumbers.length > 0),
  [sowLessonContent, sowObjectivesParsed, sowSdgNumbers]);

  const lessonAiContext = useMemo((): LessonAiContext => {
    const week = sowWeeks.find((w) => w.weekId === selectedWeekId);
    return {
      lessonTitle:    title || undefined,
      subjectName:    subjectName || undefined,
      className:      week?.className || undefined,
      sowWeekContent: sowLessonContent || undefined,
      sowObjectives:  sowObjectivesParsed.general || undefined,
      referenceMaterials: lessonReferenceMaterials.length > 0 ? lessonReferenceMaterials : undefined,
    };
  }, [title, subjectName, selectedWeekId, sowWeeks, sowLessonContent, sowObjectivesParsed, lessonReferenceMaterials]);

  const addedReferenceIds = useMemo(
    () => new Set(lessonReferenceMaterials.map((reference) => reference.id)),
    [lessonReferenceMaterials],
  );

  const availableSowReferences = useMemo(
    () => sowReferences.filter((reference) => !addedReferenceIds.has(reference.id)),
    [sowReferences, addedReferenceIds],
  );

  // ── Block handlers (stable references) ─────────────────────────────────────
  const addBlockToSection = useCallback((
    type: ContentBlock['type'],
    section: LessonSection,
    extra?: { objectiveIndex?: number; objectiveTab?: string },
  ) => {
    const newBlock: ContentBlock = {
      id: `block_${Date.now()}`,
      type,
      order: 0,
      lessonSection: section,
      ...(extra?.objectiveIndex !== undefined && { objectiveIndex: extra.objectiveIndex }),
      ...(extra?.objectiveTab   !== undefined && { objectiveTab:   extra.objectiveTab   }),
      data: (BLOCK_DATA_DEFAULTS[type] ?? { url: '', caption: '' }) as ContentBlock['data'],
    };
    setBlocks((prev) => [...prev, newBlock]);
  }, []);

  const addLayoutToSection = useCallback((
    template: LayoutTemplate,
    section: LessonSection,
    extra?: { objectiveIndex?: number; objectiveTab?: string },
  ) => {
    const isSingleCol = template.columns.length === 1 && template.columns[0].blocks.length === 1;
    const groupId = isSingleCol ? undefined : `layout_${Date.now()}`;
    const totalCols = template.columns.length;

    const newBlocks: ContentBlock[] = [];
    template.columns.forEach((col, colIdx) => {
      col.blocks.forEach((blockDef) => {
        newBlocks.push({
          id: `block_${Date.now()}_${colIdx}_${newBlocks.length}`,
          type: blockDef.type,
          order: 0,
          lessonSection: section,
          ...(extra?.objectiveIndex !== undefined && { objectiveIndex: extra.objectiveIndex }),
          ...(extra?.objectiveTab   !== undefined && { objectiveTab:   extra.objectiveTab   }),
          ...(groupId !== undefined && {
            layoutGroup: groupId,
            layoutColumn: colIdx,
            layoutTotalColumns: totalCols,
            layoutColumnWidth: col.defaultWidth,
          }),
          ...(blockDef.role && { layoutRole: blockDef.role }),
          data: (BLOCK_DATA_DEFAULTS[blockDef.type] ?? { url: '', caption: '' }) as ContentBlock['data'],
        });
      });
    });
    setBlocks((prev) => [...prev, ...newBlocks]);
  }, []);

  const replaceLayoutInSection = useCallback(async (
    template: LayoutTemplate,
    section: LessonSection,
    extra?: { objectiveIndex?: number; objectiveTab?: string },
  ) => {
    const confirmed = await showAppConfirm('Replace all content in this section with the new layout?', {
      title: 'Change Layout',
      confirmText: 'Replace',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;

    const isSingleCol = template.columns.length === 1 && template.columns[0].blocks.length === 1;
    const groupId = isSingleCol ? undefined : `layout_${Date.now()}`;
    const totalCols = template.columns.length;
    const newBlocks: ContentBlock[] = [];
    template.columns.forEach((col, colIdx) => {
      col.blocks.forEach((blockDef) => {
        newBlocks.push({
          id: `block_${Date.now()}_${colIdx}_${newBlocks.length}`,
          type: blockDef.type,
          order: 0,
          lessonSection: section,
          ...(extra?.objectiveIndex !== undefined && { objectiveIndex: extra.objectiveIndex }),
          ...(extra?.objectiveTab   !== undefined && { objectiveTab:   extra.objectiveTab   }),
          ...(groupId !== undefined && {
            layoutGroup: groupId,
            layoutColumn: colIdx,
            layoutTotalColumns: totalCols,
            layoutColumnWidth: col.defaultWidth,
          }),
          ...(blockDef.role && { layoutRole: blockDef.role }),
          data: (BLOCK_DATA_DEFAULTS[blockDef.type] ?? { url: '', caption: '' }) as ContentBlock['data'],
        });
      });
    });

    setBlocks((prev) => {
      const filtered = prev.filter((b) => {
        if (b.lessonSection !== section) return true;
        if (extra?.objectiveIndex !== undefined) {
          return !(b.objectiveTab === extra.objectiveTab && b.objectiveIndex === extra.objectiveIndex);
        }
        return false;
      });
      return [...filtered, ...newBlocks];
    });
  }, []);

  const updateBlock = useCallback((index: number, updated: ContentBlock) => {
    setBlocks((prev) => { const next = [...prev]; next[index] = updated; return next; });
  }, []);

  const deleteBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Nav / UI handlers ───────────────────────────────────────────────────────
  const scrollToSection = useCallback((sectionId: string) => {
    setActiveNavSection(sectionId);
    centerPanelRef.current?.scrollTo({ top: 0 });
  }, []);

  const openLayoutPicker = useCallback((onSelect: (t: LayoutTemplate) => void) => {
    setLayoutPickerCallback(() => onSelect);
    setRightCollapsed(false);
  }, []);

  const layoutPickerCtxValue = useMemo<LayoutPickerCtxValue>(
    () => ({ openPicker: openLayoutPicker }),
    [openLayoutPicker],
  );

  const toggleObjective = useCallback((key: string) => {
    setOpenObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleObjectiveSub = useCallback((idx: number) => {
    setOpenObjectiveSubs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── SOW handlers ────────────────────────────────────────────────────────────
  const clearSowState = useCallback(() => {
    setSowLessonContent('');
    setSowSdgNumbers([]);
    setSowObjectivesParsed({});
    setOpenObjectiveSubs(new Set([0]));
    setSowReferences([]);
    setShowResourcesPanel(false);
  }, []);

  const handleWeekSelect = useCallback((weekId: string) => {
    setSelectedWeekId(weekId);
    if (!weekId) { setTitle(''); clearSowState(); return; }
    const week = sowWeeks.find((w) => w.weekId === weekId);
    if (!week) return;
    setTitle(`Week ${week.weekNumber}: ${week.topic}`);
    setSowLessonContent(week.content || '');
    setSowSdgNumbers(week.sdgNumbers);
    const parsed = {
      general: week.objectives     || undefined,
      waec:    week.waecObjectives  || undefined,
      jamb:    week.jambObjectives  || undefined,
      igcse:   week.igcseObjectives || undefined,
    };
    setSowObjectivesParsed(parsed);
    setOpenObjectives(new Set(['general']));
    setOpenObjectiveSubs(new Set([0]));
    // Pre-load references from the approved snapshot if available
    if (week.references && week.references.length > 0) {
      setSowReferences(week.references);
    }
  }, [sowWeeks, clearSowState]);

  // ── Add SOW reference as a content block ────────────────────────────────────
  const addBlockFromReference = useCallback((ref: SowReference) => {
    setLessonReferenceMaterials((prev) =>
      prev.some((existing) => existing.id === ref.id)
        ? prev
        : [...prev, toLessonReferenceMaterial(ref)],
    );

    const section = getReferenceTargetSection(activeNavSection);
    if (!section) return;
    let newBlock: ContentBlock;
    if (ref.type === 'YOUTUBE' && ref.url) {
      newBlock = {
        id: `block_${Date.now()}`,
        type: 'video',
        order: 0,
        lessonSection: section,
        data: { url: normalizeVideoEmbedUrl(ref.url) || ref.url, caption: ref.title } as VideoBlockData,
      };
    } else if (ref.type === 'IMAGE' && (ref.url || ref.fileKey)) {
      newBlock = {
        id: `block_${Date.now()}`,
        type: 'image',
        order: 0,
        lessonSection: section,
        data: { url: ref.url || ref.fileKey || '', alt: ref.title, caption: ref.description || '' } as ImageBlockData,
      };
    } else {
      // TEXT, AUDIO, FILE, GOOGLE_DRIVE → text block with a link
      const href = ref.url || ref.fileKey || '';
      const linkHtml = href
        ? `<p><a href="${href}" target="_blank" rel="noopener noreferrer">${ref.title}</a></p>${ref.description ? `<p>${ref.description}</p>` : ''}`
        : `<p>${ref.title}</p>${ref.description ? `<p>${ref.description}</p>` : ''}`;
      newBlock = {
        id: `block_${Date.now()}`,
        type: 'text',
        order: 0,
        lessonSection: section,
        data: { content: linkHtml, format: 'html' } as TextBlockData,
      };
    }
    setBlocks((prev) => [...prev, newBlock]);
  }, [activeNavSection]);

  // ── AI field generation ─────────────────────────────────────────────────────
  const generatePreLessonField = useCallback(async (field: 'description' | 'priorKnowledge') => {
    setGeneratingField(field);
    try {
      const selectedWeek = sowWeeks.find((w) => w.weekId === selectedWeekId);
      const res = await fetch('/api/lessons/generate-pre-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          subjectId,
          lessonTitle: selectedWeek ? `${selectedWeek.topic}` : title,
          weekContent: sowLessonContent || undefined,
          generalObjectives: sowObjectivesParsed.general || undefined,
          className: selectedWeek?.className || undefined,
          referenceMaterials: lessonReferenceMaterials,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) {
        const rawError = typeof data?.error === 'string' ? data.error : '';
        const cleanError = rawError.trim().startsWith('<!DOCTYPE')
          ? 'AI generation failed. Please try again.'
          : rawError || 'Generation failed';
        throw new Error(cleanError);
      }
      if (field === 'description') setDescription(data.text);
      else setPriorKnowledge(data.text);
    } catch (err: any) {
      await showAppAlert(err.message || 'AI generation failed. Please try again.');
    } finally {
      setGeneratingField(null);
    }
  }, [sowWeeks, selectedWeekId, subjectId, title, sowLessonContent, sowObjectivesParsed, lessonReferenceMaterials]);

  // ── Thumbnail ───────────────────────────────────────────────────────────────
  const handleThumbnailUpload = useCallback(async (file: File) => {
    setIsUploadingThumbnail(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'lesson_image');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setThumbnailUrl(data.url);
    } catch {
      await showAppAlert('Failed to upload thumbnail. Please try again.', { variant: 'error' });
    } finally {
      setIsUploadingThumbnail(false);
    }
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (publish = false) => {
    if (!title.trim()) {
      await showAppAlert('Please select a week from the scheme of work.', { title: 'Missing Information', variant: 'warning' });
      return;
    }
    if (!subjectId || classArmIds.length === 0) {
      await showAppAlert('Please select a subject and at least one class arm.', { title: 'Missing Information', variant: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      const objParts: string[] = [];
      if (sowObjectivesParsed.general) objParts.push(`General:\n${sowObjectivesParsed.general}`);
      if (sowObjectivesParsed.waec)    objParts.push(`WAEC:\n${sowObjectivesParsed.waec}`);
      if (sowObjectivesParsed.jamb)    objParts.push(`JAMB:\n${sowObjectivesParsed.jamb}`);
      if (sowObjectivesParsed.igcse)   objParts.push(`IGCSE:\n${sowObjectivesParsed.igcse}`);

      const lessonData: Lesson = {
        id:           lesson?.id || `lesson_${Date.now()}`,
        title:        title.trim(),
        description:  description.trim(),
        priorKnowledge: priorKnowledge.trim() || undefined,
        content:      blocks,
        subjectId,
        classArmIds,
        createdById:  userId,
        createdAt:    lesson?.createdAt || Date.now(),
        updatedAt:    Date.now(),
        isPublished:  publish,
        publishedAt:  publish ? Date.now() : lesson?.publishedAt,
        assignedTo,
        attachments:  [],
        isDownloaded: true,
        isPinned:     false,
        sowWeekId:       selectedWeekId   || undefined,
        sowLessonContent: sowLessonContent || undefined,
        sowObjectives:   objParts.join('\n\n') || undefined,
        sowSdgNumbers:   sowSdgNumbers.length > 0 ? sowSdgNumbers : undefined,
        thumbnailUrl:    thumbnailUrl     || undefined,
        referenceMaterials: lessonReferenceMaterials.length > 0 ? lessonReferenceMaterials : undefined,
      };
      await saveLesson(lessonData);
      await showAppAlert(publish ? 'Lesson published!' : 'Lesson saved as draft!', {
        title: 'Success!', variant: 'success', confirmText: 'Continue',
      });
      router.push('/dashboard/lessons');
    } catch {
      await showAppAlert('Error saving lesson. Check console for details.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [title, subjectId, classArmIds, description, priorKnowledge, blocks, userId,
      lesson, assignedTo, selectedWeekId, sowLessonContent, sowObjectivesParsed,
      sowSdgNumbers, thumbnailUrl, lessonReferenceMaterials, saveLesson, router]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subjectId) {
      setSowWeeks([]);
      if (!lesson?.sowWeekId) { setSelectedWeekId(''); clearSowState(); }
      return;
    }
    setSowLoading(true);
    setSelectedWeekId('');
    clearSowState();
    setSelectedTermNumber(null);
    const params = new URLSearchParams({ subjectId });
    if (classId) params.set('classId', classId);
    fetch(`/api/scheme-of-work/approved-weeks?${params}`)
      .then((r) => r.json())
      .then((data) => setSowWeeks(data.weeks || []))
      .catch(() => setSowWeeks([]))
      .finally(() => setSowLoading(false));
  }, [subjectId, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedWeekId('');
    setTitle('');
    clearSowState();
  }, [selectedTermNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedWeekId) { setSowReferences([]); return; }
    // Check if we already have snapshot references from the week selection
    const week = sowWeeks.find((w) => w.weekId === selectedWeekId);
    if (week?.references && week.references.length > 0) return; // already populated
    // Fallback: fetch live references (non-snapshot weeks or backward-compat)
    setResourcesLoading(true);
    fetch(`/api/scheme-of-work/weeks/${selectedWeekId}/references`)
      .then((r) => r.json())
      .then((data) => setSowReferences(data.references || []))
      .catch(() => setSowReferences([]))
      .finally(() => setResourcesLoading(false));
  }, [selectedWeekId, sowWeeks]);

  // ── Preview mode ─────────────────────────────────────────────────────────────
  if (isPreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button onClick={() => setIsPreview(false)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back to Editor
            </button>
            <span className="text-sm text-gray-500">Preview Mode</span>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title || 'Untitled Lesson'}</h1>
            {description && <p className="text-gray-600 mb-6">{description}</p>}
            <div className="space-y-6">
              {blocks.map((block) => <PreviewBlock key={block.id} block={block} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Editor mode ───────────────────────────────────────────────────────────────
  return (
    <LayoutPickerCtx.Provider value={layoutPickerCtxValue}>
    <div className="fixed bottom-0 right-0 z-10 bg-gray-50 flex flex-col lg:left-64"
      style={{ top: 'var(--dashboard-topbar-height)' }}>

      {/* ── Top header bar ── */}
      <div className="shrink-0 bg-white border-b z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard/lessons')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {lesson ? 'Edit Lesson' : 'Create Lesson'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <button onClick={() => setIsPreview(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={() => handleSave(false)} disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress stepper ── */}
      <div className="shrink-0 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-1">
          {NAV_SECTIONS.map((section) => {
            const done = sectionComplete[section.id];
            const isActive = activeNavSection === section.id;
            return (
              <button key={section.id} type="button" onClick={() => scrollToSection(section.id)}
                className="flex-1 flex flex-col gap-1 min-w-0 group">
                <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  done ? 'bg-emerald-400' : isActive ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-gray-300'
                }`} />
                <span className={`text-[10px] font-medium truncate leading-none transition-colors ${
                  done ? 'text-emerald-500' : isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}>
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex gap-4">

        {/* Left nav */}
        <div
          className={`shrink-0 hidden lg:flex lg:flex-col pt-6 transition-[width] duration-200 ${leftIsExpanded ? 'w-60' : 'w-10'}`}
          onMouseEnter={() => setLeftHovered(true)}
          onMouseLeave={() => setLeftHovered(false)}
        >
          <div className="relative bg-white rounded-xl shadow-sm border overflow-hidden">
            <button type="button" onClick={() => setLeftCollapsed(!leftCollapsed)}
              title={leftCollapsed ? 'Pin panel open' : 'Collapse panel'}
              className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              {leftIsExpanded
                ? <ChevronLeft className="w-3 h-3 text-gray-500" />
                : <ChevronRight className="w-3 h-3 text-gray-500" />}
            </button>
            {!leftIsExpanded ? (
              <div className="flex flex-col items-center pt-10 pb-4 gap-0.5">
                {NAV_SECTIONS.map((s) => (
                  <button key={s.id} type="button" title={s.label}
                    onClick={() => { setLeftCollapsed(false); setActiveNavSection(s.id); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors ${activeNavSection === s.id ? 'bg-blue-50' : ''}`}>
                    <s.Icon className={`w-4 h-4 ${activeNavSection === s.id ? 'text-blue-600' : s.color}`} />
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-gray-50 border-b pr-10">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lesson Phases</p>
                </div>
                <nav className="py-1">
                  {NAV_SECTIONS.map((s, idx) => {
                    const isActive = activeNavSection === s.id;
                    return (
                      <div key={s.id}>
                        {idx > 0 && <div className="mx-4 h-px bg-gray-100" />}
                        <button type="button" onClick={() => scrollToSection(s.id)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <s.Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : s.color}`} />
                          <span className={`text-xs font-semibold flex-1 text-left leading-tight ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                            {s.label}
                          </span>
                          {sectionComplete[s.id]
                            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            : <Circle className="w-3.5 h-3.5 shrink-0 text-gray-300" />}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </>
            )}
          </div>
        </div>

        {/* Center panel */}
        <div ref={centerPanelRef} className="flex-1 min-w-0 overflow-y-auto">
        <div className="space-y-6">

          {/* ── 1. Pre-Lesson ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'pre-lesson' ? { display: 'none' } : {}}>
            <SectionHeader Icon={BookOpen} iconClass="text-blue-600" title="Pre-Lesson" done={sectionComplete['pre-lesson']} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Week (from Scheme of Work) *
                </label>
                {!subjectId ? (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    Select a subject on the right to load available weeks
                  </div>
                ) : sowLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading weeks…
                  </div>
                ) : sowWeeks.length === 0 ? (
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                    No approved scheme of work found for this subject
                  </div>
                ) : availableTerms.length > 0 && !selectedTermNumber ? (
                  <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    Select a term on the right to load that term&apos;s weeks
                  </div>
                ) : (
                  <select value={selectedWeekId} onChange={(e) => handleWeekSelect(e.target.value)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">— Select a week —</option>
                    {Object.entries(groupedWeeks).map(([key, group]) => (
                      <optgroup key={key} label={group.label}>
                        {group.weeks.map((w) => (
                          <option key={w.weekId} value={w.weekId}>Week {w.weekNumber}: {w.topic}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {hasSOWData && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {sowLessonContent && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">Lesson Content</span>
                        <span className="text-xs text-gray-400 ml-auto">from SOW</span>
                      </div>
                      <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {sowLessonContent}
                      </div>
                    </div>
                  )}

                  {(sowObjectivesParsed.general || sowObjectivesParsed.waec || sowObjectivesParsed.jamb || sowObjectivesParsed.igcse) && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">Lesson Objectives</span>
                        <span className="text-xs text-gray-400 ml-auto">from SOW</span>
                      </div>
                      <div className="space-y-1.5">
                        {OBJECTIVE_TABS.map(({ key, label, headerCls, labelCls, bodyCls }) => {
                          const text = sowObjectivesParsed[key as keyof typeof sowObjectivesParsed];
                          if (!text) return null;
                          const isOpen = openObjectives.has(key);
                          return (
                            <div key={key} className="rounded-lg border overflow-hidden">
                              <button type="button" onClick={() => toggleObjective(key)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:brightness-95 transition-colors border-b ${headerCls}`}>
                                {isOpen
                                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                  : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                <span className={`text-xs font-bold uppercase tracking-wide ${labelCls}`}>{label}</span>
                              </button>
                              {isOpen && (
                                <div className={`px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${bodyCls}`}>{text}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sowSdgNumbers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Globe className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-gray-700">SDG Reference</span>
                        <span className="text-xs text-gray-400 ml-auto">from SOW</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sowSdgNumbers.map((n) => (
                          <span key={n} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: SDG_COLORS[n] ?? '#64748b' }}>
                            SDG {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Lesson Description (optional)</label>
                  <button
                    type="button"
                    onClick={() => generatePreLessonField('description')}
                    disabled={generatingField === 'description'}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors border border-violet-200"
                  >
                    {generatingField === 'description'
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                      : <><Zap className="w-3 h-3" /> Generate with AI</>}
                  </button>
                </div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of the lesson…" rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-violet-500" />
                      Prior Knowledge Requirement (optional)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generatePreLessonField('priorKnowledge')}
                    disabled={generatingField === 'priorKnowledge'}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors border border-violet-200"
                  >
                    {generatingField === 'priorKnowledge'
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                      : <><Zap className="w-3 h-3" /> Generate with AI</>}
                  </button>
                </div>
                <textarea value={priorKnowledge} onChange={(e) => setPriorKnowledge(e.target.value)}
                  placeholder="What should students already know before this lesson?"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              {selectedWeekId && (
                <button type="button" onClick={() => setShowResourcesPanel(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <BookMarked className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">Lesson Resources from SOW</span>
                  {resourcesLoading
                    ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    : lessonReferenceMaterials.length > 0
                      ? <span className="text-xs bg-blue-200 text-blue-800 rounded-full px-2 py-0.5 font-bold shrink-0">{lessonReferenceMaterials.length}</span>
                      : sowReferences.length > 0
                        ? <span className="text-xs bg-blue-200 text-blue-800 rounded-full px-2 py-0.5 font-bold shrink-0">{sowReferences.length}</span>
                      : <span className="text-xs text-blue-400 shrink-0">None added</span>}
                </button>
              )}
            </div>
            <SectionNavRow next="induction" onGo={scrollToSection} />
          </section>

          {/* ── 2. Lesson Induction ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'induction' ? { display: 'none' } : {}}>
            <SectionHeader Icon={Zap} iconClass="text-amber-500" title="Lesson Induction" done={sectionComplete.induction} />
            <p className="text-sm text-gray-500 mb-4">Add a pre-lesson activity or quiz to activate prior knowledge and engage students.</p>
            <div className="space-y-4">
              <SectionBlocks sectionBlocks={blocksBySection.induction} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              {blocksBySection.induction.length === 0 ? (
                <>
                  <EmptyState icon={FileQuestion} iconClass="text-amber-400" dashed="border-amber-200 bg-amber-50/50"
                    title="No induction activity yet" subtitle="Add a quiz to assess prior knowledge" />
                  <AddBlockBar section="induction" allowed={['quiz', 'text']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                </>
              ) : (
                <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'induction')} />
              )}
            </div>
            <SectionNavRow prev="pre-lesson" next="introduction" onGo={scrollToSection} />
          </section>

          {/* ── 3. Lesson Introduction ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'introduction' ? { display: 'none' } : {}}>
            <SectionHeader Icon={Presentation} iconClass="text-sky-500" title="Lesson Introduction" done={sectionComplete.introduction} />
            <p className="text-sm text-gray-500 mb-4">Introduce the topic, set the scene, and connect to students&apos; prior knowledge before diving into the main content.</p>
            <div className="space-y-4">
              <SectionBlocks sectionBlocks={blocksBySection.introduction} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              {blocksBySection.introduction.length === 0 ? (
                <>
                  <EmptyState icon={Presentation} iconClass="text-sky-400" dashed="border-sky-200 bg-sky-50/50"
                    title="No introduction yet" subtitle="Add text or an image to introduce the lesson" />
                  <AddBlockBar section="introduction" allowed={['text', 'image', 'video', 'audio']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                </>
              ) : (
                <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'introduction')} />
              )}
            </div>
            <SectionNavRow prev="induction" next="contents" onGo={scrollToSection} />
          </section>

          {/* ── 4. Lesson Contents ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'contents' ? { display: 'none' } : {}}>
            <SectionHeader Icon={List} iconClass="text-green-600" title="Lesson Contents" done={sectionComplete.contents} />

            {/* Per-objective sub-sections */}
            {parsedObjectives.length > 0 ? (
              <div className="space-y-3">
                {parsedObjectives.map((obj, idx) => {
                  const objBlocks = blocksByObjective[idx] ?? [];
                  const isOpen = openObjectiveSubs.has(idx);
                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => toggleObjectiveSub(idx)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                          objBlocks.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                        }`}>{idx + 1}</span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{obj}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {objBlocks.length} {objBlocks.length === 1 ? 'block' : 'blocks'}
                        </span>
                        {objBlocks.length > 0
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 bg-green-50 border border-green-100 rounded p-2 leading-relaxed whitespace-pre-wrap">{obj}</p>
                          <SectionBlocks sectionBlocks={objBlocks} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
                          {objBlocks.length === 0 ? (
                            <>
                              <EmptyState icon={Plus} iconClass="text-green-400" dashed="border-green-200 bg-green-50/30"
                                title="No content yet" subtitle="Add blocks to cover this objective" />
                              <AddBlockBar section="content" allowed={['text', 'image', 'video', 'audio', 'quiz']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection}
                                extra={{ objectiveIndex: idx, objectiveTab: 'general' }} />
                            </>
                          ) : (
                            <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'content', { objectiveIndex: idx, objectiveTab: 'general' })} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback: no objectives set */
              <div className="space-y-4">
                <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  Link a SOW week with objectives to enable per-objective content structure
                </div>
                <SectionBlocks sectionBlocks={freeFormContentBlocks} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
                {freeFormContentBlocks.length === 0 ? (
                  <>
                    <EmptyState icon={Plus} iconClass="text-green-400" dashed="border-green-200 bg-green-50/30"
                      title="No content blocks yet" subtitle="Add text, images, or videos to build your lesson" />
                    <AddBlockBar section="content" allowed={['text', 'image', 'video', 'audio']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                  </>
                ) : (
                  <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'content')} />
                )}
              </div>
            )}

            {/* Unassigned blocks (created before objectives were linked) */}
            {parsedObjectives.length > 0 && freeFormContentBlocks.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Unassigned Blocks</p>
                <p className="text-xs text-amber-600 mb-3">These blocks are not linked to any objective. Edit or delete them as needed.</p>
                <SectionBlocks sectionBlocks={freeFormContentBlocks} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              </div>
            )}

            {/* Orphaned blocks (objectiveIndex out of range after week change) */}
            {orphanedContentBlocks.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Orphaned Blocks</p>
                <p className="text-xs text-red-600 mb-3">These blocks were linked to objectives that no longer exist. Edit or delete them.</p>
                <SectionBlocks sectionBlocks={orphanedContentBlocks} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              </div>
            )}
            <SectionNavRow prev="introduction" next="summary" onGo={scrollToSection} />
          </section>

          {/* ── 4. Lesson Summary ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'summary' ? { display: 'none' } : {}}>
            <SectionHeader Icon={FileText} iconClass="text-purple-600" title="Lesson Summary" done={sectionComplete.summary} />
            <p className="text-sm text-gray-500 mb-4">Summarise the key points covered in this lesson.</p>
            <div className="space-y-4">
              <SectionBlocks sectionBlocks={blocksBySection.summary} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              {blocksBySection.summary.length === 0 ? (
                <>
                  <EmptyState icon={FileText} iconClass="text-purple-300" dashed="border-purple-200 bg-purple-50/30"
                    title="No summary yet" subtitle="Add a text block to summarise the lesson" />
                  <AddBlockBar section="summary" allowed={['text', 'audio']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                </>
              ) : (
                <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'summary')} />
              )}
            </div>
            <SectionNavRow prev="contents" next="evaluation" onGo={scrollToSection} />
          </section>

          {/* ── 5. Lesson Evaluation ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'evaluation' ? { display: 'none' } : {}}>
            <SectionHeader Icon={ClipboardList} iconClass="text-rose-600" title="Lesson Evaluation" done={sectionComplete.evaluation} />
            <p className="text-sm text-gray-500 mb-4">Add evaluation questions or exercises to assess learning outcomes.</p>
            <div className="space-y-4">
              <SectionBlocks sectionBlocks={blocksBySection.evaluation} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              {blocksBySection.evaluation.length === 0 ? (
                <>
                  <EmptyState icon={ClipboardList} iconClass="text-rose-300" dashed="border-rose-200 bg-rose-50/30"
                    title="No evaluation yet" subtitle="Add a quiz or text to evaluate student understanding" />
                  <AddBlockBar section="evaluation" allowed={['quiz', 'text']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                </>
              ) : (
                <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'evaluation')} />
              )}
            </div>
            <SectionNavRow prev="summary" next="assignment" onGo={scrollToSection} />
          </section>

          {/* ── 6. Lesson Assignment ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'assignment' ? { display: 'none' } : {}}>
            <SectionHeader Icon={PenSquare} iconClass="text-indigo-600" title="Lesson Assignment" done={sectionComplete.assignment} />
            <p className="text-sm text-gray-500 mb-4">Attach an assignment or take-home exercise for students.</p>
            <div className="space-y-4">
              <SectionBlocks sectionBlocks={blocksBySection.assignment} allBlocks={blocks} onUpdate={updateBlock} onDelete={deleteBlock} priorKnowledge={priorKnowledge} lessonContext={lessonAiContext} />
              {blocksBySection.assignment.length === 0 ? (
                <>
                  <EmptyState icon={PenSquare} iconClass="text-indigo-300" dashed="border-indigo-200 bg-indigo-50/30"
                    title="No assignment yet" subtitle="Add an assignment for students to complete" />
                  <AddBlockBar section="assignment" allowed={['assignment', 'text']} onAdd={addBlockToSection} onAddLayout={addLayoutToSection} />
                </>
              ) : (
                <ChangeLayoutBar onReplace={(t) => replaceLayoutInSection(t, 'assignment')} />
              )}
            </div>
            <SectionNavRow prev="evaluation" next="thumbnail" onGo={scrollToSection} />
          </section>

          {/* ── 7. Lesson Thumbnail ── */}
          <section className="bg-white rounded-xl shadow-sm border px-6 pb-6 pt-0"
            style={activeNavSection !== 'thumbnail' ? { display: 'none' } : {}}>
            <SectionHeader Icon={ImagePlus} iconClass="text-pink-600" title="Lesson Thumbnail" done={sectionComplete.thumbnail} />
            <p className="text-sm text-gray-500 mb-4">Upload a cover image for this lesson.</p>
            {thumbnailUrl ? (
              <div className="relative group">
                <img src={thumbnailUrl} alt="Lesson thumbnail" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                    Change
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); e.target.value = ''; }} />
                  </label>
                  <button type="button" onClick={() => setThumbnailUrl('')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isUploadingThumbnail ? 'border-pink-300 bg-pink-50/30 cursor-wait' : 'border-pink-200 bg-pink-50/20 hover:bg-pink-50/40 hover:border-pink-300'
              }`}>
                {isUploadingThumbnail ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
                    <p className="text-sm text-pink-600">Uploading…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <ImagePlus className="w-10 h-10 text-pink-300" />
                    <p className="text-sm text-gray-600 font-medium">Click to upload thumbnail</p>
                    <p className="text-xs text-gray-400">JPG, PNG, WEBP or GIF · Max 10 MB</p>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                  disabled={isUploadingThumbnail}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); e.target.value = ''; }} />
              </label>
            )}
            <SectionNavRow prev="assignment" onGo={scrollToSection} />
          </section>

        </div>{/* end space-y-6 */}
        </div>{/* end center scroll */}

        {/* Right sidebar */}
        <div className={`shrink-0 hidden lg:flex lg:flex-col transition-all duration-200 ${rightCollapsed ? 'w-10 overflow-hidden' : layoutPickerCallback ? 'min-w-[300px]' : 'min-w-[220px]'}`}>
          <div className="relative flex-1 bg-white rounded-xl shadow-sm border overflow-y-auto">
            <button type="button" onClick={() => { setRightCollapsed(!rightCollapsed); if (!rightCollapsed) setLayoutPickerCallback(null); }}
              title={rightCollapsed ? 'Expand panel' : 'Collapse panel'}
              className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              {rightCollapsed
                ? <ChevronLeft className="w-3 h-3 text-gray-500" />
                : <ChevronRight className="w-3 h-3 text-gray-500" />}
            </button>
            {rightCollapsed ? (
              <div className="flex flex-col items-center pt-10 pb-4">
                <Target className="w-4 h-4 text-gray-400" />
              </div>
            ) : layoutPickerCallback ? (
              <div className="px-4 pt-10 pb-6">
                <LayoutPicker
                  noFrame
                  onSelect={(template) => { layoutPickerCallback(template); setLayoutPickerCallback(null); }}
                  onClose={() => setLayoutPickerCallback(null)}
                />
              </div>
            ) : (
              <div className="px-5 pt-10 pb-6">
                <h2 className="text-base font-bold text-gray-900 mb-5">Target Audience</h2>
                <TargetAudienceSelector
                  subjectId={subjectId}
                  classArmIds={classArmIds}
                  assignedTo={assignedTo}
                  onSubjectChange={setSubjectId}
                  onSubjectNameChange={setSubjectName}
                  onClassArmsChange={setClassArmIds}
                  onAssignedToChange={setAssignedTo}
                  onClassChange={setClassId}
                  availableTerms={availableTerms}
                  selectedTermNumber={selectedTermNumber}
                  onTermChange={setSelectedTermNumber}
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── SOW Resources floating panel ── */}
      {showResourcesPanel && (
        <div className="fixed z-50 bottom-0 right-0 lg:left-64 flex justify-end"
          style={{ top: 'var(--dashboard-topbar-height)' }}>
          <div className="flex-1 bg-black/20" onClick={() => setShowResourcesPanel(false)} />
          <div className="w-96 bg-white border-l shadow-2xl flex flex-col">
            <div className="shrink-0 px-5 py-4 border-b flex items-center gap-2.5">
              <BookMarked className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="text-base font-bold text-gray-900 flex-1">Lesson Resources</h2>
              {availableSowReferences.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-bold">{availableSowReferences.length}</span>
              )}
              <button type="button" onClick={() => setShowResourcesPanel(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors ml-1">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="shrink-0 px-5 py-2 text-xs text-gray-400 border-b bg-gray-50">
              References added in the Scheme of Work for this week
            </p>
            {lessonReferenceMaterials.length > 0 && (
              <div className="shrink-0 px-5 py-3 border-b bg-blue-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Added To Lesson</p>
                    <p className="text-xs text-blue-600 mt-1">Stored as lesson reference material for AI generation.</p>
                  </div>
                  <span className="text-xs bg-white text-blue-700 rounded-full px-2 py-0.5 font-bold border border-blue-100">
                    {lessonReferenceMaterials.length}
                  </span>
                </div>
                <div className="mt-3 max-h-44 overflow-y-auto space-y-2 pr-1">
                  {lessonReferenceMaterials.map((reference) => (
                    <div key={reference.id} className="rounded-lg border border-blue-100 bg-white px-3 py-2 flex items-start gap-2.5">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${REFERENCE_TYPE_STYLE[reference.type]}`}>
                        {REFERENCE_TYPE_LABEL[reference.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{reference.title}</p>
                        {reference.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{reference.description}</p>
                        )}
                        <p className="text-[11px] text-blue-600 mt-1">Used by AI when generating lesson content.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewRef(toPreviewReference(reference))}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors text-blue-600"
                        title="Preview reference"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {resourcesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <p className="text-sm text-gray-400">Loading resources…</p>
                </div>
              ) : availableSowReferences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BookMarked className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">
                    {lessonReferenceMaterials.length > 0 ? 'All references already added' : 'No resources yet'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {lessonReferenceMaterials.length > 0
                      ? 'The selected references are stored above for this lesson.'
                      : 'Add references in the Scheme of Work for this week'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessonReferenceMaterials.length > 0 && (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Available References</p>
                  )}
                  {availableSowReferences.map((ref) => (
                    <ReferenceCard
                      key={ref.id}
                      reference={ref}
                      onAdd={() => addBlockFromReference(ref)}
                      onPreview={() => setPreviewRef(ref)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reference preview floating window ── */}
      <PreviewModal reference={previewRef} onClose={() => setPreviewRef(null)} />
    </div>
    </LayoutPickerCtx.Provider>
  );
}
