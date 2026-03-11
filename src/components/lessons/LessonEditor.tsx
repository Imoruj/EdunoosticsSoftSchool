/**
 * Lesson Editor Component
 * Block-based lesson editor with drag-and-drop reordering
 */

'use client';

import { useState } from 'react';
import {
  Plus,
  Type,
  Image as ImageIcon,
  Video,
  Save,
  Eye,
  ArrowLeft,
  FileQuestion,
  ClipboardList,
} from 'lucide-react';
import type {
  Lesson,
  ContentBlock,
  TextBlockData,
  ImageBlockData,
  VideoBlockData,
  QuizBlockData,
  AssignmentBlockData,
} from '@/lib/db/types';
import { TextBlock, ImageBlock, VideoBlock, QuizBlock, AssignmentBlock } from './ContentBlocks';
import { useLessons } from '@/lib/db/hooks';
import { useRouter } from 'next/navigation';
import { SyncStatus } from '../sync/SyncStatus';
import { TargetAudienceSelector } from '@/components/shared/TargetAudienceSelector';
import { showAppAlert } from '@/lib/appMessageBox';
import { normalizeVideoEmbedUrl } from '@/lib/videoEmbed';

interface LessonEditorProps {
  lesson?: Lesson;
  userId: string;
}

export function LessonEditor({ lesson, userId }: LessonEditorProps) {
  const router = useRouter();
  const { saveLesson } = useLessons();

  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [subjectId, setSubjectId] = useState(lesson?.subjectId || '');
  const [classArmIds, setClassArmIds] = useState<string[]>(lesson?.classArmIds || []);
  const [assignedTo, setAssignedTo] = useState<string[]>(lesson?.assignedTo || []);
  const [blocks, setBlocks] = useState<ContentBlock[]>(lesson?.content || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: `block_${Date.now()}`,
      type,
      order: blocks.length,
      data:
        type === 'text'
          ? { content: '', format: 'html' }
          : type === 'image'
            ? { url: '', alt: '', caption: '' }
            : type === 'quiz'
              ? { quizId: '', quizTitle: '', instructions: '', required: false }
              : type === 'assignment'
                ? { assignmentId: '', assignmentTitle: '', instructions: '', required: false }
                : { url: '', caption: '' },
    };

    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updatedBlock: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
  };

  const deleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      await showAppAlert('Please enter a lesson title.', { title: 'Missing Information', variant: 'warning' });
      return;
    }

    if (!subjectId || classArmIds.length === 0) {
      await showAppAlert('Please select a subject and at least one class arm.', { title: 'Missing Information', variant: 'warning' });
      return;
    }

    setIsSaving(true);

    try {
      const lessonData: Lesson = {
        id: lesson?.id || `lesson_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        content: blocks,
        subjectId,
        classArmIds,
        createdById: userId,
        createdAt: lesson?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isPublished: publish,
        publishedAt: publish ? Date.now() : lesson?.publishedAt,
        assignedTo,
        attachments: [],
        isDownloaded: true,
        isPinned: false,
      };

      await saveLesson(lessonData);

      await showAppAlert(publish ? 'Lesson published!' : 'Lesson saved as draft!', {
        title: 'Success!',
        variant: 'success',
        confirmText: 'Continue',
      });
      router.push('/dashboard/lessons');
    } catch (error) {
      console.error('Error saving lesson:', error);
      await showAppAlert('Error saving lesson. Check console for details.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isPreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Preview Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsPreview(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Editor
              </button>
              <span className="text-sm text-gray-500">Preview Mode</span>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title || 'Untitled Lesson'}</h1>
            {description && <p className="text-gray-600 mb-6">{description}</p>}

            <div className="space-y-6">
              {blocks.map((block) => (
                <div key={block.id}>
                  {block.type === 'text' && (
                    (() => {
                      const data = block.data as TextBlockData;
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: data.content }}
                        />
                      );
                    })()
                  )}
                  {block.type === 'image' && (
                    (() => {
                      const data = block.data as ImageBlockData;
                      return (
                        <div className="space-y-2">
                          <img
                            src={data.url}
                            alt={data.alt || 'Image'}
                            className="max-w-full h-auto rounded-lg"
                          />
                          {data.caption && (
                            <p className="text-sm text-gray-600 text-center italic">
                              {data.caption}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}
                  {block.type === 'video' && (
                    (() => {
                      const data = block.data as VideoBlockData;
                      return (
                        <div className="space-y-2">
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <iframe
                              src={normalizeVideoEmbedUrl(data.url)}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          {data.caption && (
                            <p className="text-sm text-gray-600 text-center italic">
                              {data.caption}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}
                  {block.type === 'quiz' && (
                    (() => {
                      const data = block.data as QuizBlockData;
                      return (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                          <p className="text-sm text-blue-700 font-semibold">Lesson Quiz</p>
                          <p className="text-base text-blue-900 mt-1">
                            {data.quizTitle || 'Linked Quiz'}
                          </p>
                          {data.instructions && (
                            <p className="text-sm text-blue-800 mt-1">{data.instructions}</p>
                          )}
                          {data.required && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 mt-2">
                              Required
                            </span>
                          )}
                        </div>
                      );
                    })()
                  )}
                  {block.type === 'assignment' && (
                    (() => {
                      const data = block.data as AssignmentBlockData;
                      return (
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                          <p className="text-sm text-indigo-700 font-semibold">Lesson Assignment</p>
                          <p className="text-base text-indigo-900 mt-1">
                            {data.assignmentTitle || 'Linked Assignment'}
                          </p>
                          {data.instructions && (
                            <p className="text-sm text-indigo-800 mt-1">{data.instructions}</p>
                          )}
                          {data.required && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 mt-2">
                              Required
                            </span>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/lessons')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {lesson ? 'Edit Lesson' : 'Create Lesson'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <SyncStatus />
              <button
                onClick={() => setIsPreview(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Main Editor Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title & Description */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter lesson title..."
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the lesson..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Content Blocks */}
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={block.id}>
                {block.type === 'text' && (
                  <TextBlock
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                )}
                {block.type === 'image' && (
                  <ImageBlock
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                )}
                {block.type === 'video' && (
                  <VideoBlock
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                )}
                {block.type === 'quiz' && (
                  <QuizBlock
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                )}
                {block.type === 'assignment' && (
                  <AssignmentBlock
                    block={block}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                )}
              </div>
            ))}

            {/* Add Block Buttons */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Add Content Block:</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => addBlock('text')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Type className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => addBlock('image')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  Image
                </button>
                <button
                  onClick={() => addBlock('video')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Video
                </button>
                <button
                  onClick={() => addBlock('quiz')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileQuestion className="w-4 h-4" />
                  Quiz
                </button>
              </div>
            </div>

            {blocks.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <Plus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No content blocks yet</p>
                <p className="text-sm text-gray-500">
                  Add text, images, videos, or quizzes to build your lesson
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Target Audience</h2>
            <TargetAudienceSelector
              subjectId={subjectId}
              classArmIds={classArmIds}
              assignedTo={assignedTo}
              onSubjectChange={setSubjectId}
              onClassArmsChange={setClassArmIds}
              onAssignedToChange={setAssignedTo}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
