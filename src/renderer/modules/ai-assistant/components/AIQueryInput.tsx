/**
 * AIQueryInput — search input for the AI clinical assistant.
 *
 * Features:
 * - Free-text query input with keyboard shortcuts
 * - Quick-action buttons for common query types
 * - Search type toggle (hybrid / fulltext / vector)
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Search,
  Send,
  Loader2,
  Sparkles,
  FileText,
  TrendingUp,
  Pill,
  ImagePlus,
  X,
} from 'lucide-react';
import type { AIImageAttachment } from '../types/ai.types';

interface AIQueryInputProps {
  onSubmit: (
    query: string,
    searchType?: 'hybrid' | 'fulltext' | 'vector',
    imageAttachments?: AIImageAttachment[],
  ) => void;
  isLoading?: boolean;
  placeholder?: string;
  showQuickActions?: boolean;
  showSearchType?: boolean;
  className?: string;
}

const QUICK_QUERIES = [
  {
    label: 'Summary',
    icon: FileText,
    query: "Summarise this patient's recent clinical history",
  },
  {
    label: 'Trends',
    icon: TrendingUp,
    query: "What are the trends in this patient's vitals and labs?",
  },
  {
    label: 'Meds',
    icon: Pill,
    query: 'List current medications and check for interactions',
  },
  {
    label: 'Timeline',
    icon: Sparkles,
    query: 'Create a clinical timeline for this patient',
  },
];

const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fileToAttachment(file: File): Promise<AIImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl.startsWith('data:')) {
        reject(new Error('Invalid image payload'));
        return;
      }
      resolve({
        name: file.name,
        mimeType: file.type || 'image/*',
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function AIQueryInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Ask about this patient…',
  showQuickActions = true,
  showSearchType = true,
  className = '',
}: AIQueryInputProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<
    'hybrid' | 'fulltext' | 'vector'
  >('hybrid');
  const [imageAttachments, setImageAttachments] = useState<AIImageAttachment[]>(
    [],
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if ((!trimmed && imageAttachments.length === 0) || isLoading) return;
    onSubmit(
      trimmed || 'Analyze the attached image(s).',
      searchType,
      imageAttachments,
    );
    setQuery('');
    setImageAttachments([]);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [query, searchType, imageAttachments, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleQuickQuery = useCallback(
    (q: string) => {
      if (isLoading) return;
      onSubmit(q, searchType);
    },
    [isLoading, searchType, onSubmit],
  );

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const availableSlots = Math.max(
        0,
        MAX_IMAGE_ATTACHMENTS - imageAttachments.length,
      );
      const acceptedFiles = files
        .filter((file) => file.type.startsWith('image/'))
        .filter((file) => file.size <= MAX_IMAGE_BYTES)
        .slice(0, availableSlots);

      if (acceptedFiles.length === 0) return;

      const converted = await Promise.all(
        acceptedFiles.map((file) => fileToAttachment(file)),
      );
      setImageAttachments((prev) =>
        [...prev, ...converted].slice(0, MAX_IMAGE_ATTACHMENTS),
      );

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    [imageAttachments.length],
  );

  const removeAttachmentAt = useCallback((index: number) => {
    setImageAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Quick Action Buttons */}
      {showQuickActions && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q.label}
              onClick={() => handleQuickQuery(q.query)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
                         bg-blue-50 text-blue-700 hover:bg-blue-100
                         dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50
                         disabled:opacity-50 transition-colors"
            >
              <q.icon className="w-3 h-3" />
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="relative flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-300
                       bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:opacity-50 resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={
            isLoading || imageAttachments.length >= MAX_IMAGE_ATTACHMENTS
          }
          className="p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shrink-0"
          title="Attach image for AI analysis"
        >
          <ImagePlus className="w-4 h-4" />
        </button>

        <button
          onClick={handleSubmit}
          disabled={
            (!query.trim() && imageAttachments.length === 0) || isLoading
          }
          className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700
                     disabled:bg-gray-300 disabled:cursor-not-allowed
                     dark:disabled:bg-gray-600 transition-colors shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageAttachments.map((attachment, index) => (
            <div
              key={`${attachment.name}-${index}`}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <span className="max-w-[180px] truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachmentAt(index)}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                aria-label="Remove image attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Type Toggle */}
      {showSearchType && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400 mr-1">Search:</span>
          {(['hybrid', 'fulltext', 'vector'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-2 py-0.5 rounded-full capitalize transition-colors ${
                searchType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
