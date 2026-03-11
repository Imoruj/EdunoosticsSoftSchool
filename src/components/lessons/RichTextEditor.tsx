/**
 * Rich Text Editor Component
 * Simple HTML editor with formatting controls
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Code,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '200px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const formatButtons = [
    {
      icon: Bold,
      command: 'bold',
      label: 'Bold',
      shortcut: 'Ctrl+B',
    },
    {
      icon: Italic,
      command: 'italic',
      label: 'Italic',
      shortcut: 'Ctrl+I',
    },
    {
      icon: Underline,
      command: 'underline',
      label: 'Underline',
      shortcut: 'Ctrl+U',
    },
    {
      icon: Heading2,
      command: 'formatBlock',
      value: 'h2',
      label: 'Heading',
    },
    {
      icon: List,
      command: 'insertUnorderedList',
      label: 'Bullet List',
    },
    {
      icon: ListOrdered,
      command: 'insertOrderedList',
      label: 'Numbered List',
    },
    {
      icon: Quote,
      command: 'formatBlock',
      value: 'blockquote',
      label: 'Quote',
    },
    {
      icon: Code,
      command: 'formatBlock',
      value: 'pre',
      label: 'Code Block',
    },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {formatButtons.map((btn, index) => (
            <button
              key={index}
              type="button"
              onClick={() => execCommand(btn.command, btn.value)}
              className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
              title={btn.label + (btn.shortcut ? ` (${btn.shortcut})` : '')}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={() => execCommand('undo')}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand('redo')}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-700 hover:text-gray-900"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          p-4 outline-none prose prose-sm max-w-none
          ${isFocused ? 'ring-2 ring-blue-500' : ''}
        `}
        style={{ minHeight }}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
