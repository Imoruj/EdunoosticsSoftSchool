/**
 * Content Block Components
 * Displays different types of content blocks (text, image, video, etc.)
 */

'use client';

import { useState, useRef } from 'react';
import type { HTMLAttributes, ChangeEvent } from 'react';
import Link from 'next/link';
import {
  GripVertical,
  Trash2,
  Edit,
  Check,
  X,
  Image as ImageIcon,
  Video,
  FileQuestion,
  Upload,
  Link as LinkIcon,
  Youtube,
  Plus,
  ClipboardList,
  CalendarClock,
} from 'lucide-react';
import type {
  ContentBlock,
  TextBlockData,
  ImageBlockData,
  VideoBlockData,
  QuizBlockData,
  QuizQuestion,
  AssignmentBlockData,
} from '@/lib/db/types';
import { useAssignments, useQuizzes } from '@/lib/db/hooks';
import { RichTextEditor } from './RichTextEditor';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { showAppAlert } from '@/lib/appMessageBox';
import { normalizeVideoEmbedUrl } from '@/lib/videoEmbed';

interface ContentBlockProps {
  block: ContentBlock;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
}

export function TextBlock({ block, onUpdate, onDelete, dragHandleProps }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState((block.data as TextBlockData).content);

  const handleSave = () => {
    onUpdate({
      ...block,
      data: { ...block.data, content: editContent } as TextBlockData,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent((block.data as TextBlockData).content);
    setIsEditing(false);
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <span className="text-xs font-medium text-gray-600 flex-1">Text Block</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <>
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="Enter text content..."
              minHeight="150px"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: (block.data as TextBlockData).content }}
          />
        )}
      </div>
    </div>
  );
}

export function ImageBlock({ block, onUpdate, onDelete, dragHandleProps }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(block.data as ImageBlockData);
  const [activeTab, setActiveTab] = useState<'upload' | 'drive' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate({ ...block, data: editData });
    setIsEditing(false);
  };

  const handleLocalUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'lesson_image');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setEditData((prev) => ({ ...prev, url, alt: prev.alt || file.name }));
    } catch {
      await showAppAlert('Image upload failed. Please try again.', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const parseDriveImageUrl = (raw: string) => {
    // Supports both /file/d/ID/view and /open?id=ID links
    const m = raw.match(/\/file\/d\/([^/]+)/) || raw.match(/[?&]id=([^&]+)/);
    return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : raw;
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <ImageIcon className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 flex-1">Image Block</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <>
            {/* Source tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
              {([['upload', Upload, 'Device'], ['drive', LinkIcon, 'Google Drive'], ['url', LinkIcon, 'URL']] as const).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {activeTab === 'upload' && (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocalUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">{isUploading ? 'Uploading...' : 'Click to upload image from device'}</span>
                    <span className="text-xs text-gray-400">JPG, PNG, GIF, WEBP supported</span>
                  </button>
                  {editData.url && <p className="text-xs text-green-600 mt-1">✓ Image uploaded successfully</p>}
                </div>
              )}

              {activeTab === 'drive' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Share Link</label>
                  <input
                    type="text"
                    placeholder="Paste Google Drive shareable link..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onBlur={(e) => {
                      const url = parseDriveImageUrl(e.target.value);
                      setEditData((prev) => ({ ...prev, url }));
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Make sure the file is set to "Anyone with the link can view"</p>
                </div>
              )}

              {activeTab === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direct Image URL</label>
                  <input
                    type="text"
                    value={editData.url}
                    onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text (optional)</label>
                <input
                  type="text"
                  value={editData.alt || ''}
                  onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                  placeholder="Describe the image..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={editData.caption || ''}
                  onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                  placeholder="Image caption..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Preview */}
            {editData.url && (
              <div className="mt-3 border rounded-lg overflow-hidden">
                <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50 border-b">Preview</p>
                <img src={editData.url} alt={editData.alt || ''} className="max-h-48 w-full object-contain p-2" />
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {editData.url ? (
              <>
                <img src={editData.url} alt={editData.alt || 'Image'} className="max-w-full h-auto rounded-lg" />
                {editData.caption && <p className="text-sm text-gray-600 text-center italic">{editData.caption}</p>}
              </>
            ) : (
              <div
                className="flex items-center justify-center h-48 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to add image</p>
                  <p className="text-xs mt-1">Upload from device or paste a URL</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoBlock({ block, onUpdate, onDelete, dragHandleProps }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(block.data as VideoBlockData);
  const [activeTab, setActiveTab] = useState<'youtube' | 'drive'>('youtube');
  const [rawInput, setRawInput] = useState(editData.url || '');

  const handleSave = () => {
    const normalizedUrl = normalizeVideoEmbedUrl(rawInput || editData.url || '');
    onUpdate({ ...block, data: { ...editData, url: normalizedUrl } });
    setEditData((prev) => ({ ...prev, url: normalizedUrl }));
    setRawInput(normalizedUrl);
    setIsEditing(false);
  };

  const handleApplyUrl = () => {
    const embed = normalizeVideoEmbedUrl(rawInput);
    setEditData((prev) => ({ ...prev, url: embed }));
    setRawInput(embed);
  };

  const getDriveFileId = (raw: string) => {
    const m = raw.match(/\/file\/d\/([^/]+)/) || raw.match(/[?&]id=([^&]+)/);
    return m?.[1] || null;
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <Video className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 flex-1">Video Block</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <>
            {/* Source tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('youtube')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${activeTab === 'youtube' ? 'bg-white shadow text-red-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                YouTube / Vimeo
              </button>
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${activeTab === 'drive' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Google Drive
              </button>
            </div>

            <div className="space-y-3">
              {activeTab === 'youtube' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube or Vimeo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleApplyUrl}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-300"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Paste a YouTube or Vimeo link and click Apply</p>
                </div>
              )}

              {activeTab === 'drive' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder="Paste Google Drive video link..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleApplyUrl}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-300"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Make sure the file sharing is set to "Anyone with the link"</p>
                  {getDriveFileId(rawInput) && (
                    <p className="text-xs text-green-600 mt-1">✓ Drive file ID detected: {getDriveFileId(rawInput)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={editData.caption || ''}
                  onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                  placeholder="Video caption..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Preview */}
            {editData.url && (
              <div className="mt-3 border rounded-lg overflow-hidden">
                <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50 border-b">Preview</p>
                <div className="aspect-video">
                  <iframe
                    src={normalizeVideoEmbedUrl(editData.url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {editData.url ? (
              <>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src={normalizeVideoEmbedUrl(editData.url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {editData.caption && <p className="text-sm text-gray-600 text-center italic">{editData.caption}</p>}
              </>
            ) : (
              <div
                className="flex items-center justify-center h-48 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <div className="text-center text-gray-400">
                  <Video className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to add video</p>
                  <p className="text-xs mt-1">YouTube, Vimeo, or Google Drive</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to generate unique IDs
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Helper function to create default question data based on type
function createDefaultQuestionData(type: QuizQuestion['type']): QuizQuestion['data'] {
  switch (type) {
    case 'multiple_choice':
      return {
        multipleCorrect: false,
        options: [
          { id: uid('opt'), text: '', isCorrect: true, order: 0 },
        ],
      };
    case 'true_false':
      return { correctAnswer: true };
    case 'drag_drop':
      return {
        items: [
          { id: uid('item'), content: '' },
          { id: uid('item'), content: '' },
        ],
        zones: [
          { id: uid('zone'), label: '', acceptMultiple: true },
          { id: uid('zone'), label: '', acceptMultiple: true },
        ],
        matches: [],
      };
    case 'short_answer':
      return {
        maxLength: 180,
        keywords: [],
      };
    default:
      return { maxLength: 180, keywords: [] };
  }
}

// Helper function to create a default question
function createDefaultQuestion(order: number, type: QuizQuestion['type'] = 'multiple_choice'): QuizQuestion {
  return {
    id: uid('q'),
    type,
    order,
    questionText: '',
    points: 1,
    explanation: '',
    data: createDefaultQuestionData(type),
  };
}

export function QuizBlock({ block, onUpdate, onDelete, dragHandleProps }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quizMode, setQuizMode] = useState<'inline' | 'link'>('inline'); // Default to inline
  const { quizzes } = useQuizzes();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [editData, setEditData] = useState<QuizBlockData>((block.data as QuizBlockData) || {
    quizTitle: '',
    instructions: '',
    required: false,
    embeddedQuiz: {
      questions: [createDefaultQuestion(0)],
      passingScore: 70,
      showResults: true,
    },
  });

  const selectedQuiz = quizzes.find((q) => q.id === editData.quizId);
  const questions = editData.embeddedQuiz?.questions || [];

  const addQuestion = () => {
    setEditData({
      ...editData,
      embeddedQuiz: {
        ...editData.embeddedQuiz!,
        questions: [...questions, createDefaultQuestion(questions.length)],
      },
    });
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setEditData({
      ...editData,
      embeddedQuiz: {
        ...editData.embeddedQuiz!,
        questions: newQuestions,
      },
    });
  };

  const deleteQuestion = (index: number) => {
    setEditData({
      ...editData,
      embeddedQuiz: {
        ...editData.embeddedQuiz!,
        questions: questions.filter((_, i) => i !== index),
      },
    });
  };

  const handleSave = () => {
    onUpdate({ ...block, data: editData });
    setIsEditing(false);
  };

  const handleImageUpload = async (questionIndex: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'quiz_image');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      updateQuestion(questionIndex, { imageUrl: url });
    } catch {
      await showAppAlert('Image upload failed. Please try again.', { variant: 'error' });
    }
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <FileQuestion className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 flex-1">Knowledge Check Quiz</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <>
            {/* Quiz Mode Toggle */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setQuizMode('inline')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${quizMode === 'inline' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
              >
                Create Quiz Here
              </button>
              <button
                onClick={() => setQuizMode('link')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${quizMode === 'link' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
              >
                Link Existing Quiz
              </button>
            </div>

            {quizMode === 'inline' ? (
              <div className="space-y-4">
                {/* Quiz Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title (optional)</label>
                  <input
                    type="text"
                    value={editData.quizTitle || ''}
                    onChange={(e) => setEditData({ ...editData, quizTitle: e.target.value })}
                    placeholder="e.g., Quick Knowledge Check"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">Question {index + 1}</span>
                          <select
                            value={question.type}
                            onChange={(e) => {
                              const newType = e.target.value as QuizQuestion['type'];
                              updateQuestion(index, {
                                type: newType,
                                data: createDefaultQuestionData(newType),
                              });
                            }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="true_false">True / False</option>
                            <option value="drag_drop">Drag & Drop</option>
                            <option value="short_answer">Short Answer</option>
                          </select>
                        </div>
                        {questions.length > 1 && (
                          <button
                            onClick={() => deleteQuestion(index)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        value={question.questionText}
                        onChange={(e) => updateQuestion(index, { questionText: e.target.value })}
                        placeholder="Enter your question..."
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2"
                      />

                      {/* Image Upload */}
                      {question.imageUrl ? (
                        <div className="relative mb-2">
                          <img src={question.imageUrl} alt="Question" className="max-h-32 w-full object-contain rounded border" />
                          <button
                            onClick={() => updateQuestion(index, { imageUrl: undefined })}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleImageUpload(index, e as any);
                            input.click();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Add image to question
                        </button>
                      )}

                      {/* Multiple Choice Options */}
                      {question.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-600">Answer Options:</label>
                          {(question.data as any).options.map((option: any, optIndex: number) => (
                            <div key={option.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={option.isCorrect}
                                  onChange={() => {
                                    const newOptions = (question.data as any).options.map((o: any, i: number) => ({
                                      ...o,
                                      isCorrect: i === optIndex,
                                    }));
                                    updateQuestion(index, {
                                      data: { ...(question.data as any), options: newOptions },
                                    });
                                  }}
                                  className="w-4 h-4"
                                />
                                <input
                                  value={option.text}
                                  onChange={(e) => {
                                    const newOptions = [...(question.data as any).options];
                                    newOptions[optIndex] = { ...newOptions[optIndex], text: e.target.value };
                                    updateQuestion(index, {
                                      data: { ...(question.data as any), options: newOptions },
                                    });
                                  }}
                                  onPaste={(e) => {
                                    const pasted = e.clipboardData.getData('text');
                                    const lines = pasted.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                                    if (lines.length <= 1) return; // single line — let default paste handle it
                                    e.preventDefault();
                                    const existing: any[] = [...(question.data as any).options];
                                    // Fill current slot with first line, append the rest as new options
                                    existing[optIndex] = { ...existing[optIndex], text: lines[0] };
                                    const tail = lines.slice(1).map((text, i) => ({
                                      id: uid('opt'),
                                      text,
                                      isCorrect: false,
                                      order: existing.length + i,
                                    }));
                                    updateQuestion(index, {
                                      data: { ...(question.data as any), options: [...existing, ...tail] },
                                    });
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e: any) => {
                                      const file = e.target?.files?.[0];
                                      if (!file) return;
                                      try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('type', 'quiz_option_image');
                                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                        if (!res.ok) throw new Error('Upload failed');
                                        const { url } = await res.json();
                                        const newOptions = [...(question.data as any).options];
                                        newOptions[optIndex] = { ...newOptions[optIndex], imageUrl: url };
                                        updateQuestion(index, {
                                          data: { ...(question.data as any), options: newOptions },
                                        });
                                      } catch {
                                        await showAppAlert('Image upload failed.', { variant: 'error' });
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="p-1 text-gray-600 hover:text-blue-600"
                                  title="Add image to option"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                                {(question.data as any).options.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const remaining = (question.data as any).options.filter((_: any, i: number) => i !== optIndex);
                                      // If deleted option was correct, mark first remaining as correct
                                      const hasCorrect = remaining.some((o: any) => o.isCorrect);
                                      const finalOptions = hasCorrect ? remaining : remaining.map((o: any, i: number) => ({ ...o, isCorrect: i === 0 }));
                                      updateQuestion(index, {
                                        data: { ...(question.data as any), options: finalOptions },
                                      });
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                    title="Delete option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {option.imageUrl && (
                                <div className="relative ml-6">
                                  <img src={option.imageUrl} alt={option.text} className="max-h-20 rounded border" />
                                  <button
                                    onClick={() => {
                                      const newOptions = [...(question.data as any).options];
                                      newOptions[optIndex] = { ...newOptions[optIndex], imageUrl: undefined };
                                      updateQuestion(index, {
                                        data: { ...(question.data as any), options: newOptions },
                                      });
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newOptions = [...(question.data as any).options, {
                                id: uid('opt'),
                                text: '',
                                isCorrect: false,
                                order: (question.data as any).options.length,
                              }];
                              updateQuestion(index, {
                                data: { ...(question.data as any), options: newOptions },
                              });
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add option
                          </button>
                        </div>
                      )}

                      {/* True/False */}
                      {question.type === 'true_false' && (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-600">Correct Answer:</label>
                          <div className="flex gap-4">
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                checked={(question.data as any).correctAnswer === true}
                                onChange={() => {
                                  updateQuestion(index, {
                                    data: { correctAnswer: true },
                                  });
                                }}
                                className="w-4 h-4"
                              />
                              True
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                checked={(question.data as any).correctAnswer === false}
                                onChange={() => {
                                  updateQuestion(index, {
                                    data: { correctAnswer: false },
                                  });
                                }}
                                className="w-4 h-4"
                              />
                              False
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Drag and Drop */}
                      {question.type === 'drag_drop' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-600 font-medium">Draggable Items:</label>
                            <div className="space-y-1.5 mt-1">
                              {(question.data as any).items.map((item: any, itemIndex: number) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <input
                                    value={item.content}
                                    onChange={(e) => {
                                      const newItems = [...(question.data as any).items];
                                      newItems[itemIndex] = { ...newItems[itemIndex], content: e.target.value };
                                      updateQuestion(index, {
                                        data: { ...(question.data as any), items: newItems },
                                      });
                                    }}
                                    placeholder={`Item ${itemIndex + 1}`}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  {(question.data as any).items.length > 1 && (
                                    <button
                                      onClick={() => {
                                        const newItems = (question.data as any).items.filter((_: any, i: number) => i !== itemIndex);
                                        updateQuestion(index, {
                                          data: { ...(question.data as any), items: newItems },
                                        });
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newItems = [...(question.data as any).items, { id: uid('item'), content: '' }];
                                  updateQuestion(index, {
                                    data: { ...(question.data as any), items: newItems },
                                  });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add item
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 font-medium">Drop Zones:</label>
                            <div className="space-y-1.5 mt-1">
                              {(question.data as any).zones.map((zone: any, zoneIndex: number) => (
                                <div key={zone.id} className="flex items-center gap-2">
                                  <input
                                    value={zone.label}
                                    onChange={(e) => {
                                      const newZones = [...(question.data as any).zones];
                                      newZones[zoneIndex] = { ...newZones[zoneIndex], label: e.target.value };
                                      updateQuestion(index, {
                                        data: { ...(question.data as any), zones: newZones },
                                      });
                                    }}
                                    placeholder={`Zone ${zoneIndex + 1}`}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  {(question.data as any).zones.length > 1 && (
                                    <button
                                      onClick={() => {
                                        const newZones = (question.data as any).zones.filter((_: any, i: number) => i !== zoneIndex);
                                        updateQuestion(index, {
                                          data: { ...(question.data as any), zones: newZones },
                                        });
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newZones = [...(question.data as any).zones, { id: uid('zone'), label: '', acceptMultiple: true }];
                                  updateQuestion(index, {
                                    data: { ...(question.data as any), zones: newZones },
                                  });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add zone
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 italic">Students will match items to zones when taking the quiz.</p>
                        </div>
                      )}

                      {/* Short Answer */}
                      {question.type === 'short_answer' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600">Max character length:</label>
                            <input
                              type="number"
                              min="10"
                              max="500"
                              value={(question.data as any).maxLength || 180}
                              onChange={(e) => {
                                updateQuestion(index, {
                                  data: { ...(question.data as any), maxLength: Number(e.target.value) || 180 },
                                });
                              }}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm ml-2"
                            />
                          </div>
                          <p className="text-xs text-gray-500 italic">Students will type a short text answer.</p>
                        </div>
                      )}

                      {/* Explanation (all question types) */}
                      <div className="pt-2 border-t border-gray-100">
                        <label className="text-xs text-gray-600 font-medium">
                          Explanation <span className="font-normal text-gray-400">(shown to students after answering)</span>
                        </label>
                        <textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                          placeholder="Explain why the correct answer is correct…"
                          rows={2}
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Question Button */}
                <button
                  onClick={addQuestion}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>

                {/* Settings */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editData.embeddedQuiz?.showResults ?? true}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          embeddedQuiz: { ...editData.embeddedQuiz!, showResults: e.target.checked },
                        })
                      }
                    />
                    Show results after submission
                  </label>
                </div>
              </div>
            ) : (
              /* Link Existing Quiz Mode */
              <div className="space-y-3">
                {quizzes.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No quiz available yet.
                    <Link href="/dashboard/quizzes/create" className="ml-2 underline font-medium">
                      Create Quiz
                    </Link>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Quiz</label>
                    <select
                      value={editData.quizId || ''}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const nextQuiz = quizzes.find((q) => q.id === nextId);
                        setEditData({
                          ...editData,
                          quizId: nextId,
                          quizTitle: nextQuiz?.title || '',
                          embeddedQuiz: undefined,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Choose a quiz</option>
                      {quizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Save/Cancel Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Display Mode */
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-900">
              {editData.quizTitle || 'Knowledge Check'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                {editData.embeddedQuiz
                  ? `${editData.embeddedQuiz.questions.length} questions (inline)`
                  : selectedQuiz
                    ? `${selectedQuiz.questions.length} questions (linked)`
                    : 'No quiz configured'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssignmentBlock({ block, onUpdate, onDelete, dragHandleProps }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { assignments } = useAssignments();

  const [editData, setEditData] = useState<AssignmentBlockData>(
    (block.data as AssignmentBlockData) || {
      assignmentId: '',
      assignmentTitle: '',
      instructions: '',
      required: true,
    }
  );

  const selectedAssignment = assignments.find((a) => a.id === editData.assignmentId);

  const handleSave = () => {
    onUpdate({ ...block, data: editData });
    setIsEditing(false);
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <ClipboardList className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 flex-1">Assignment Block</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Assignment</label>
              <select
                value={editData.assignmentId || ''}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const nextAssignment = assignments.find((a) => a.id === nextId);
                  setEditData({
                    ...editData,
                    assignmentId: nextId,
                    assignmentTitle: nextAssignment?.title || '',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Choose an assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Instructions (optional)</label>
              <textarea
                value={editData.instructions || ''}
                onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
                placeholder="e.g., Please complete this assignment by Friday."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editData.required ?? true}
                onChange={(e) => setEditData({ ...editData, required: e.target.checked })}
              />
              Required to Complete Lesson
            </label>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-900">
              {editData.assignmentTitle || 'Assignment Required'}
            </p>
            {editData.instructions && (
              <p className="text-sm text-indigo-800 mt-1">{editData.instructions}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${editData.required ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {editData.required ? 'Required' : 'Optional'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
