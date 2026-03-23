/**
 * Content Block Components
 * Displays different types of content blocks (text, image, video, etc.)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Volume2,
  Mic,
  Sparkles,
} from 'lucide-react';
import type {
  ContentBlock,
  TextBlockData,
  ImageBlockData,
  VideoBlockData,
  AudioBlockData,
  QuizBlockData,
  QuizQuestion,
  AssignmentBlockData,
  LessonReferenceMaterial,
} from '@/lib/db/types';
import { useAssignments, useQuizzes } from '@/lib/db/hooks';
import { RichTextEditor } from './RichTextEditor';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { showAppAlert } from '@/lib/appMessageBox';
import { normalizeVideoEmbedUrl } from '@/lib/videoEmbed';

export interface LessonAiContext {
  lessonTitle?: string;
  subjectName?: string;
  className?: string;
  sowWeekContent?: string;
  sowObjectives?: string;
  referenceMaterials?: LessonReferenceMaterial[];
}

interface ContentBlockProps {
  block: ContentBlock;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  priorKnowledge?: string;
  lessonContext?: LessonAiContext;
}

export function TextBlock({ block, onUpdate, onDelete, dragHandleProps, lessonContext }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState((block.data as TextBlockData).content);
  const usesLessonReferenceContext = block.lessonSection === 'introduction';
  const textWordLimit = usesLessonReferenceContext ? 60 : undefined;

  // AI generation state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

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

  const getAutoPrompt = () => {
    if (block.lessonSection === 'introduction') {
      return 'Write a slide-style lesson introduction outline of no more than 60 words. Use 3 to 5 very short outline lines in separate paragraphs, not full explanation. Use the saved lesson references and other lesson context to set the scene, connect to prior knowledge, and preview the lesson.';
    }

    return `Write classroom-ready text for the ${block.lessonSection || 'lesson'} section using the available lesson context.`;
  };

  const generateText = async () => {
    const prompt = usesLessonReferenceContext ? getAutoPrompt() : aiPrompt.trim();
    if (!prompt || aiGenerating) return;
    setAiGenerating(true);
    try {
      const res = await fetch('/api/lessons/generate-text-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lessonSection: block.lessonSection,
          lessonTitle: lessonContext?.lessonTitle,
          subjectName: lessonContext?.subjectName,
          className: lessonContext?.className,
          sowWeekContent: lessonContext?.sowWeekContent,
          sowObjectives: lessonContext?.sowObjectives,
          referenceMaterials: lessonContext?.referenceMaterials,
          maxWords: textWordLimit,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const { html } = await res.json();
      setEditContent(html);
      setShowAiPanel(false);
      setAiPrompt('');
    } catch (e: any) {
      await showAppAlert(e.message || 'Text generation failed. Please try again.', { variant: 'error' });
    } finally {
      setAiGenerating(false);
    }
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
            {/* AI generation panel */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowAiPanel((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate with AI
                {showAiPanel ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {showAiPanel && (
                <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2">
                  <p className="text-xs text-violet-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    {usesLessonReferenceContext
                      ? 'AI will use the saved lesson references, lesson title, and Scheme of Work context to replace this introduction text.'
                      : 'Describe what this text block should cover. The AI will replace the editor content.'}
                  </p>
                  {!usesLessonReferenceContext && (
                    <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    placeholder="e.g. Explain how photosynthesis works in simple terms for SS1 students…"
                    className="w-full px-3 py-2 text-sm border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none bg-white"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateText}
                      disabled={(!usesLessonReferenceContext && !aiPrompt.trim()) || aiGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {aiGenerating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Generate</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAiPanel(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

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

export function ImageBlock({ block, onUpdate, onDelete, dragHandleProps, lessonContext }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(block.data as ImageBlockData);
  const [activeTab, setActiveTab] = useState<'upload' | 'drive' | 'url' | 'ai'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI image generation
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

  const generateImage = async () => {
    if (!aiImagePrompt.trim() || generatingImage) return;
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/lessons/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiImagePrompt.trim(),
          lessonTitle: lessonContext?.lessonTitle,
          subjectName: lessonContext?.subjectName,
          className: lessonContext?.className,
          referenceMaterials: lessonContext?.referenceMaterials,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const { url } = await res.json();
      setEditData((prev) => ({ ...prev, url, alt: prev.alt || aiImagePrompt.trim().slice(0, 80) }));
    } catch (e: any) {
      await showAppAlert(e.message || 'Image generation failed. Please try again.', { variant: 'error' });
    } finally {
      setGeneratingImage(false);
    }
  };

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
              {([
                ['upload', Upload, 'Device'],
                ['drive', LinkIcon, 'Google Drive'],
                ['url', LinkIcon, 'URL'],
                ['ai', Sparkles, 'Generate AI'],
              ] as const).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
                    activeTab === tab
                      ? tab === 'ai'
                        ? 'bg-white shadow text-violet-600'
                        : 'bg-white shadow text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
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

              {activeTab === 'ai' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                    <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-violet-700">
                      Describe the image you want. Imagen 3 will generate a school-appropriate educational illustration.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image description</label>
                    <textarea
                      value={aiImagePrompt}
                      onChange={(e) => setAiImagePrompt(e.target.value)}
                      rows={3}
                      placeholder="e.g. Diagram showing the water cycle with evaporation, condensation, and precipitation labelled"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">{aiImagePrompt.length}/800</p>
                  </div>
                  <button
                    onClick={generateImage}
                    disabled={!aiImagePrompt.trim() || generatingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm rounded-lg transition-colors w-full justify-center"
                  >
                    {generatingImage ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating image…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate with Imagen 3</>
                    )}
                  </button>
                  {editData.url && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Image generated successfully
                    </p>
                  )}
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
              block.layoutRole === 'audio-avatar' ? (
                /* Audio avatar — circular speaker photo */
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-full max-w-[120px] mx-auto aspect-square">
                    <img
                      src={editData.url}
                      alt={editData.alt || 'Speaker'}
                      className="w-full h-full rounded-full object-cover ring-2 ring-violet-200 shadow"
                    />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow">
                      <Volume2 className="w-3 h-3 text-white" />
                    </span>
                  </div>
                  {editData.caption && (
                    <p className="text-xs text-gray-500 text-center font-medium">{editData.caption}</p>
                  )}
                </div>
              ) : (
                <>
                  <img src={editData.url} alt={editData.alt || 'Image'} className="max-w-full h-auto rounded-lg" />
                  {editData.caption && <p className="text-sm text-gray-600 text-center italic">{editData.caption}</p>}
                </>
              )
            ) : (
              <div
                className={`flex items-center justify-center bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                  block.layoutRole === 'audio-avatar' ? 'aspect-square rounded-full' : 'h-48'
                }`}
                onClick={() => setIsEditing(true)}
              >
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    {block.layoutRole === 'audio-avatar' ? 'Add speaker photo' : 'Click to add image'}
                  </p>
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

const MAX_INDUCTION_QUESTIONS = 3;
type AiGeneratableQuestionType = 'multiple_choice' | 'true_false' | 'drag_drop' | 'short_answer';

const AI_GENERATABLE_QUESTION_TYPES: Array<{ type: AiGeneratableQuestionType; label: string }> = [
  { type: 'multiple_choice', label: 'Multiple Choice' },
  { type: 'true_false', label: 'True / False' },
  { type: 'short_answer', label: 'Short Answer' },
  { type: 'drag_drop', label: 'Drag & Drop' },
];

function isAiGeneratableQuestionType(value: string | undefined): value is AiGeneratableQuestionType {
  return AI_GENERATABLE_QUESTION_TYPES.some((entry) => entry.type === value);
}

function sanitizeAiSelectedTypes(
  selected: AiGeneratableQuestionType[] | undefined,
  questions: QuizQuestion[],
): AiGeneratableQuestionType[] {
  const provided = Array.isArray(selected)
    ? selected.filter((type): type is AiGeneratableQuestionType => isAiGeneratableQuestionType(type))
    : [];

  if (provided.length > 0) {
    return Array.from(new Set(provided));
  }

  const derivedFromQuestions = questions
    .map((question) => question.type)
    .filter((type): type is AiGeneratableQuestionType => isAiGeneratableQuestionType(type));

  return Array.from(new Set(derivedFromQuestions)).slice(0, AI_GENERATABLE_QUESTION_TYPES.length).length > 0
    ? Array.from(new Set(derivedFromQuestions)).slice(0, AI_GENERATABLE_QUESTION_TYPES.length)
    : ['multiple_choice'];
}

function getQuestionTypeLabel(type: AiGeneratableQuestionType) {
  switch (type) {
    case 'true_false':
      return 'True / False';
    case 'drag_drop':
      return 'Drag & Drop';
    case 'short_answer':
      return 'Short Answer';
    default:
      return 'Multiple Choice';
  }
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

export function QuizBlock({ block, onUpdate, onDelete, dragHandleProps, priorKnowledge }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quizMode, setQuizMode] = useState<'inline' | 'link'>('inline'); // Default to inline
  const { quizzes } = useQuizzes();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInductionQuiz = block.lessonSection === 'induction';

  const [editData, setEditData] = useState<QuizBlockData>(() => {
    const initialData = ((block.data as QuizBlockData) || {
      quizTitle: '',
      instructions: '',
      required: false,
      embeddedQuiz: {
        questions: [createDefaultQuestion(0)],
        passingScore: 70,
        showResults: true,
      },
    }) as QuizBlockData;

    return {
      ...initialData,
      aiSettings: {
        ...initialData.aiSettings,
        selectedQuestionTypes: sanitizeAiSelectedTypes(
          initialData.aiSettings?.selectedQuestionTypes,
          initialData.embeddedQuiz?.questions || [],
        ),
      },
    };
  });

  // ── AI generation state ────────────────────────────────────────────────────
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [regeneratingQuestionIndex, setRegeneratingQuestionIndex] = useState<number | null>(null);

  // ── Dirty-state tracking ───────────────────────────────────────────────────
  const [hasSaved, setHasSaved] = useState(false);
  const [savedDataJson, setSavedDataJson] = useState('');
  // isDirty: true only after a save has happened AND edits have been made since
  const isDirty = hasSaved && JSON.stringify(editData) !== savedDataJson;

  const selectedQuiz = quizzes.find((q) => q.id === editData.quizId);
  const questions = editData.embeddedQuiz?.questions || [];
  const hasOnlyEmptyQuestion = questions.length === 1 && !questions[0].questionText.trim();
  const effectiveQuestionCount = isInductionQuiz && hasOnlyEmptyQuestion ? 0 : questions.length;
  const remainingInductionSlots = isInductionQuiz
    ? Math.max(MAX_INDUCTION_QUESTIONS - effectiveQuestionCount, 0)
    : 0;
  const aiSelectedTypes = sanitizeAiSelectedTypes(editData.aiSettings?.selectedQuestionTypes, questions);
  const aiSelectedTypeLabels = aiSelectedTypes.map(getQuestionTypeLabel).join(', ');

  useEffect(() => {
    if (!isInductionQuiz) return;

    setEditData((prev) => {
      const embeddedQuiz = prev.embeddedQuiz;
      if (!embeddedQuiz || embeddedQuiz.questions.length <= MAX_INDUCTION_QUESTIONS) {
        return prev;
      }

      return {
        ...prev,
        embeddedQuiz: {
          ...embeddedQuiz,
          questions: embeddedQuiz.questions
            .slice(0, MAX_INDUCTION_QUESTIONS)
            .map((question, index) => ({ ...question, order: index })),
        },
      };
    });
  }, [isInductionQuiz]);

  useEffect(() => {
    if (!isInductionQuiz) return;
    if (remainingInductionSlots > 0 && aiCount > remainingInductionSlots) {
      setAiCount(remainingInductionSlots);
    }
  }, [aiCount, isInductionQuiz, remainingInductionSlots]);

  const addQuestion = () => {
    if (isInductionQuiz && questions.length >= MAX_INDUCTION_QUESTIONS) {
      void showAppAlert('Lesson induction quizzes can contain at most 3 questions.', { variant: 'error' });
      return;
    }

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

  const toggleAiQuestionType = (type: AiGeneratableQuestionType) => {
    const current = aiSelectedTypes;
    const next = current.includes(type)
      ? current.filter((entry) => entry !== type)
      : [...current, type];

    if (next.length === 0) {
      void showAppAlert('Select at least one question type for AI generation.', { variant: 'error' });
      return;
    }

    setEditData({
      ...editData,
      aiSettings: {
        ...editData.aiSettings,
        selectedQuestionTypes: next,
      },
    });
  };

  const handleSave = () => {
    const nextData = isInductionQuiz && editData.embeddedQuiz
      ? {
          ...editData,
          aiSettings: {
            ...editData.aiSettings,
            selectedQuestionTypes: aiSelectedTypes,
          },
          embeddedQuiz: {
            ...editData.embeddedQuiz,
            questions: editData.embeddedQuiz.questions
              .slice(0, MAX_INDUCTION_QUESTIONS)
              .map((question, index) => ({ ...question, order: index })),
          },
        }
      : {
          ...editData,
          aiSettings: {
            ...editData.aiSettings,
            selectedQuestionTypes: aiSelectedTypes,
          },
        };

    onUpdate({ ...block, data: nextData });
    setSavedDataJson(JSON.stringify(nextData));
    setHasSaved(true);
    // Keep isEditing = true so the panel stays open
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

  const requestAiQuestions = async ({
    count,
    questionTypes,
    avoidQuestionTexts = [],
  }: {
    count: number;
    questionTypes: AiGeneratableQuestionType[];
    avoidQuestionTexts?: string[];
  }) => {
    const inductionSource = priorKnowledge?.trim() || '';
    const hasInductionSource = inductionSource.length > 0;
    const topicContext = aiTopic.trim() || editData.quizTitle?.trim() || '';

    if (isInductionQuiz && !hasInductionSource) {
      throw new Error('Generate or enter the Prior Knowledge Requirement first before generating the induction quiz.');
    }

    if (!isInductionQuiz && !topicContext) {
      throw new Error('Please enter a topic or context for the AI to generate questions.');
    }

    if (questionTypes.length === 0) {
      throw new Error('Select at least one question type for AI generation.');
    }

    const res = await fetch('/api/lessons/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: isInductionQuiz ? undefined : topicContext,
        sourceText: isInductionQuiz ? inductionSource : undefined,
        count,
        questionTypes,
        lessonSection: block.lessonSection,
        avoidQuestionTexts,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : { error: await res.text() };
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    return (data.questions || []) as QuizQuestion[];
  };

  const generateQuestions = async () => {
    const requestedCount = isInductionQuiz ? Math.min(aiCount, remainingInductionSlots) : aiCount;

    if (isInductionQuiz && requestedCount < 1) {
      await showAppAlert('Lesson induction quizzes can contain at most 3 questions.', { variant: 'error' });
      return;
    }

    setAiGenerating(true);
    try {
      const generated = await requestAiQuestions({
        count: requestedCount,
        questionTypes: aiSelectedTypes,
        avoidQuestionTexts: questions.map((question) => question.questionText.trim()).filter(Boolean),
      });
      const existingEmpty = questions.length === 1 && !questions[0].questionText.trim();
      const base = existingEmpty ? [] : questions;
      const allowedGenerated = isInductionQuiz
        ? generated.slice(0, Math.max(MAX_INDUCTION_QUESTIONS - base.length, 0))
        : generated;
      const reindexed = allowedGenerated.map((q, i) => ({ ...q, order: base.length + i }));

      if (isInductionQuiz && reindexed.length === 0) {
        await showAppAlert('Lesson induction quizzes can contain at most 3 questions.', { variant: 'error' });
        return;
      }

      setEditData({
        ...editData,
        embeddedQuiz: {
          ...editData.embeddedQuiz!,
          questions: [...base, ...reindexed],
        },
      });
      setShowAiPanel(false);
      setAiTopic('');
    } catch (err: any) {
      await showAppAlert(err.message || 'AI generation failed. Please try again.', { variant: 'error' });
    } finally {
      setAiGenerating(false);
    }
  };

  const regenerateQuestion = async (index: number) => {
    const question = questions[index];
    if (!question || !isAiGeneratableQuestionType(question.type)) {
      await showAppAlert('This question type cannot be regenerated with AI.', { variant: 'error' });
      return;
    }

    setRegeneratingQuestionIndex(index);
    try {
      const generated = await requestAiQuestions({
        count: 1,
        questionTypes: [question.type],
        avoidQuestionTexts: questions
          .map((entry) => entry.questionText.trim())
          .filter(Boolean),
      });

      const replacement = generated[0];
      if (!replacement) {
        throw new Error('No replacement question was generated. Please try again.');
      }

      setEditData((prev) => {
        const embeddedQuiz = prev.embeddedQuiz;
        if (!embeddedQuiz) return prev;

        const nextQuestions = [...embeddedQuiz.questions];
        const current = nextQuestions[index];
        if (!current) return prev;

        nextQuestions[index] = {
          ...replacement,
          id: current.id,
          order: current.order,
        };

        return {
          ...prev,
          embeddedQuiz: {
            ...embeddedQuiz,
            questions: nextQuestions,
          },
        };
      });
    } catch (err: any) {
      await showAppAlert(err.message || 'Failed to regenerate question. Please try again.', { variant: 'error' });
    } finally {
      setRegeneratingQuestionIndex(null);
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
                        <div className="flex items-center gap-2">
                          {isAiGeneratableQuestionType(question.type) && (
                            <button
                              type="button"
                              onClick={() => regenerateQuestion(index)}
                              disabled={aiGenerating || regeneratingQuestionIndex === index}
                              className="inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-800 disabled:opacity-60 disabled:cursor-not-allowed"
                              title={`Regenerate this ${getQuestionTypeLabel(question.type) as string} question`}
                            >
                              {regeneratingQuestionIndex === index
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RotateCcw className="w-3.5 h-3.5" />}
                              <span>Regenerate</span>
                            </button>
                          )}
                          {questions.length > 1 && (
                            <button
                              onClick={() => deleteQuestion(index)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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

                {/* ── AI Generate Panel ── */}
                <div className="rounded-lg border border-violet-200 bg-violet-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAiPanel((p) => !p)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    <Zap className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">Generate Questions with AI</span>
                    {showAiPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAiPanel && (
                    <div className="px-3 pb-3 space-y-2 border-t border-violet-200 pt-3">
                      {isInductionQuiz ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-violet-800 mb-1">
                              Prior Knowledge Requirement source
                            </label>
                            <div className={`w-full rounded-lg border px-2.5 py-2 text-sm whitespace-pre-wrap ${
                              priorKnowledge?.trim()
                                ? 'border-violet-300 bg-white text-gray-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}>
                              {priorKnowledge?.trim()
                                || 'Generate or enter the Prior Knowledge Requirement in the Pre-Lesson section first.'}
                            </div>
                          </div>
                          <p className="text-[11px] text-violet-600">
                            AI will generate a {aiSelectedTypeLabels} mix from this prior knowledge text. Questions stay basic, relatable, and limited to 3 for lesson induction.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-violet-800 mb-1">
                            Topic or context <span className="text-violet-500 font-normal">(what prior knowledge to test)</span>
                          </label>
                          <textarea
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder="e.g. Basic concepts of Economics — scarcity, opportunity cost, demand & supply"
                            rows={2}
                            className="w-full px-2.5 py-1.5 text-sm border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-violet-800 mb-1">Question type mix</label>
                        <div className="flex flex-wrap gap-2">
                          {AI_GENERATABLE_QUESTION_TYPES.map((entry) => {
                            const selected = aiSelectedTypes.includes(entry.type);
                            return (
                              <button
                                key={entry.type}
                                type="button"
                                onClick={() => toggleAiQuestionType(entry.type)}
                                className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                  selected
                                    ? 'border-violet-500 bg-violet-600 text-white'
                                    : 'border-violet-200 bg-white text-violet-700 hover:border-violet-400 hover:bg-violet-100'
                                }`}
                              >
                                {entry.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1 text-[11px] text-violet-500">
                          AI will use a balanced mix from the selected types and keep the questions simple and tied to everyday situations.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-medium text-violet-800 whitespace-nowrap">Questions:</label>
                          {isInductionQuiz && remainingInductionSlots === 0 ? (
                            <span className="text-xs font-semibold text-amber-700">3 of 3 used</span>
                          ) : (
                            <select
                              value={aiCount}
                              onChange={(e) => setAiCount(Number(e.target.value))}
                              className="text-sm px-2 py-1 border border-violet-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                            >
                              {(isInductionQuiz
                                ? Array.from({ length: remainingInductionSlots }, (_, index) => index + 1)
                                : [1, 2, 3, 4, 5, 6, 7, 8]
                              ).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={generateQuestions}
                          disabled={aiGenerating || (isInductionQuiz ? !priorKnowledge?.trim() || remainingInductionSlots === 0 : !aiTopic.trim())}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {aiGenerating
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                            : <><Zap className="w-3.5 h-3.5" /> Generate</>}
                        </button>
                      </div>

                      <p className="text-[11px] text-violet-500">
                        {isInductionQuiz
                          ? 'Generated questions use the Prior Knowledge Requirement and add a simple, real-world warm-up until the 3-question limit is reached.'
                          : 'Generated questions will be basic, real-world, and added to the quiz. You can edit or delete them afterwards.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Question Button */}
                <button
                  onClick={addQuestion}
                  disabled={isInductionQuiz && questions.length >= MAX_INDUCTION_QUESTIONS}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:border-gray-200"
                >
                  <Plus className="w-4 h-4" />
                  {isInductionQuiz && questions.length >= MAX_INDUCTION_QUESTIONS
                    ? 'Maximum 3 Questions Reached'
                    : 'Add Question'}
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
                className={`flex items-center gap-2 px-3 py-1.5 text-white text-sm rounded transition-colors ${
                  isDirty
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Check className="w-4 h-4" />
                {isDirty ? 'Update' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Close
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

// ─── Audio Block ──────────────────────────────────────────────────────────────

const GEMINI_VOICES = [
  { value: 'Aoede',  label: 'Aoede  — warm, clear'      },
  { value: 'Charon', label: 'Charon — deep, authoritative' },
  { value: 'Fenrir', label: 'Fenrir — energetic'         },
  { value: 'Kore',   label: 'Kore   — bright, expressive' },
  { value: 'Puck',   label: 'Puck   — playful, light'    },
] as const;

export function AudioBlock({ block, onUpdate, onDelete, dragHandleProps, lessonContext }: ContentBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<AudioBlockData>(
    (block.data as AudioBlockData) || { mode: 'upload', title: '', caption: '' },
  );
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>(
    editData.mode === 'generated' ? 'ai' : 'upload',
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingScript, setIsSuggestingScript] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate({ ...block, data: editData });
    setIsEditing(false);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'lesson_audio');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setEditData((prev) => ({
        ...prev,
        mode: 'upload',
        url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }));
    } catch {
      await showAppAlert('Audio upload failed. Please try again.', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const generateAudio = async () => {
    if (!editData.script?.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/lessons/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: editData.script.trim(),
          voiceName: editData.voiceName || 'Aoede',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const { url, fileName, fileType } = await res.json();
      setEditData((prev) => ({
        ...prev,
        mode: 'generated',
        url,
        fileName: fileName || 'ai-generated-audio.wav',
        fileType: fileType || 'audio/wav',
      }));
    } catch (e: any) {
      await showAppAlert(e.message || 'Audio generation failed. Please try again.', { variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestScript = async () => {
    if (isSuggestingScript) return;
    const hasContext = lessonContext?.lessonTitle || lessonContext?.sowWeekContent || lessonContext?.sowObjectives || lessonContext?.referenceMaterials?.length;
    const autoPrompt = hasContext
      ? `Write a clear, engaging spoken-audio script for the ${block.lessonSection || 'lesson'} section. It should be suitable for text-to-speech narration — natural, flowing sentences with no markdown, bullet points, or special characters.`
      : 'Write a short spoken-audio narration script for this lesson block. Natural sentences suitable for TTS.';
    setIsSuggestingScript(true);
    try {
      const res = await fetch('/api/lessons/generate-text-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${autoPrompt} Expand the outline slightly and keep the narration between 150 and 220 words.`,
          lessonSection: block.lessonSection,
          lessonTitle: lessonContext?.lessonTitle,
          subjectName: lessonContext?.subjectName,
          className: lessonContext?.className,
          sowWeekContent: lessonContext?.sowWeekContent,
          sowObjectives: lessonContext?.sowObjectives,
          referenceMaterials: lessonContext?.referenceMaterials,
          minWords: 150,
          maxWords: 220,
        }),
      });
      if (!res.ok) throw new Error('Script suggestion failed');
      const { html } = await res.json();
      // Strip HTML tags to get plain text suitable for TTS
      const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      setEditData((prev) => ({ ...prev, script: plain }));
    } catch (e: any) {
      await showAppAlert(e.message || 'Script suggestion failed. Please try again.', { variant: 'error' });
    } finally {
      setIsSuggestingScript(false);
    }
  };

  return (
    <div className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <Volume2 className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 flex-1">Audio Block</span>
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
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
                  activeTab === 'ai' ? 'bg-white shadow text-violet-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate AI
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${
                  activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            <div className="space-y-3">
              {/* AI Generate tab */}
              {activeTab === 'ai' && (
                <>
                  <div className="flex items-start gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                    <Mic className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-violet-700">
                      Type or paste the text you want narrated. Gemini 2.0 Flash will speak it in your chosen voice.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Script <span className="text-gray-400 font-normal">(max 5 000 chars)</span>
                      </label>
                      <button
                        type="button"
                        onClick={suggestScript}
                        disabled={isSuggestingScript}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 disabled:opacity-60 transition-colors"
                      >
                        {isSuggestingScript
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Suggesting…</>
                          : <><Sparkles className="w-3 h-3" /> Suggest from lesson</>}
                      </button>
                    </div>
                    <textarea
                      value={editData.script || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, script: e.target.value }))}
                      rows={5}
                      placeholder="Paste or type the text to be narrated, or click 'Suggest from lesson'…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(editData.script || '').length}/5000
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                    <select
                      value={editData.voiceName || 'Aoede'}
                      onChange={(e) => setEditData((prev) => ({ ...prev, voiceName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {GEMINI_VOICES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={generateAudio}
                    disabled={!editData.script?.trim() || isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm rounded-lg transition-colors w-full justify-center"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating audio…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate Audio</>
                    )}
                  </button>

                  {editData.url && editData.mode === 'generated' && (
                    <div className="mt-2">
                      <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Audio generated
                      </p>
                      <audio controls className="w-full">
                        <source src={editData.url} />
                      </audio>
                    </div>
                  )}
                </>
              )}

              {/* Upload tab */}
              {activeTab === 'upload' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {isUploading ? 'Uploading…' : 'Click to upload audio from device'}
                    </span>
                    <span className="text-xs text-gray-400">MP3, WAV, OGG, M4A, AAC supported</span>
                  </button>
                  {editData.url && editData.mode === 'upload' && (
                    <div className="mt-2">
                      <p className="text-xs text-green-600 mb-1">✓ {editData.fileName || 'Audio uploaded'}</p>
                      <audio controls className="w-full">
                        <source src={editData.url} type={editData.fileType} />
                      </audio>
                    </div>
                  )}
                </>
              )}

              {/* Common fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Audio title…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={editData.caption || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, caption: e.target.value }))}
                  placeholder="Short note about this audio…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Check className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </>
        ) : (
          /* Display mode */
          <div className="space-y-2">
            {editData.url ? (
              <>
                {editData.title && (
                  <p className="text-sm font-medium text-gray-800">{editData.title}</p>
                )}
                <audio controls className="w-full">
                  <source src={editData.url} type={editData.fileType || 'audio/wav'} />
                  Your browser does not support the audio element.
                </audio>
                {editData.caption && (
                  <p className="text-xs text-gray-500 italic">{editData.caption}</p>
                )}
                {editData.mode === 'generated' && (
                  <span className="inline-flex items-center gap-1 text-xs text-violet-600">
                    <Sparkles className="w-3 h-3" /> AI-generated audio
                  </span>
                )}
              </>
            ) : (
              <div
                className="flex items-center justify-center h-24 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <div className="text-center text-gray-400">
                  <Volume2 className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-sm font-medium">Click to add audio</p>
                  <p className="text-xs mt-0.5">Upload file or generate with AI</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
