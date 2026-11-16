/**
 * =============================================================================
 * SavedNotesPopover — Search & reuse previously saved clinical notes
 *
 * Appears as a small popover anchored next to a textarea field.
 * The clinician can search their personal saved notes, click to insert,
 * and save the current textarea content for future reuse.
 *
 * All data is scoped to the logged-in user via RLS.
 * =============================================================================
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, BookOpen, Plus, Trash2, Clock, Star, X } from 'lucide-react';
import {
  ClinicianSavedNote,
  SavedNoteCategory,
  searchSavedNotes,
  fetchRecentNotes,
  createSavedNote,
  recordNoteUsage,
  deleteSavedNote,
  generateNoteTitle,
} from '../../lib/clinician-saved-notes';

interface SavedNotesPopoverProps {
  /** Category for this field (e.g. 'radiology_findings', 'consultation_notes') */
  category: SavedNoteCategory;
  /** Optional subcategory for finer filtering (e.g. 'CT', 'MRI') */
  subcategory?: string;
  /** Current textarea value — used when saving a new note */
  currentValue: string;
  /** Callback to set the textarea value when a note is selected */
  onInsert: (content: string) => void;
  /** Optional className for the trigger button */
  className?: string;
}

export default function SavedNotesPopover({
  category,
  subcategory,
  currentValue,
  onInsert,
  className = '',
}: SavedNotesPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<ClinicianSavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'save'>('search');
  const [saveTitle, setSaveTitle] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Load recent notes on open
  useEffect(() => {
    if (!isOpen) return;
    loadRecent();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, category]);

  const loadRecent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load ALL user's saved notes (no category filter) so every note is visible
      const data = await fetchRecentNotes(null, 30);
      setNotes(data);
    } catch {
      setError('Could not load saved notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Search across ALL user's notes (no category filter)
          const data = await searchSavedNotes(searchQuery, undefined, 20);
          setNotes(data);
        } catch {
          setError('Search failed');
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [],
  );

  const handleSelect = useCallback(
    async (note: ClinicianSavedNote) => {
      onInsert(note.content);
      setIsOpen(false);
      // Record usage in the background
      recordNoteUsage(note.id).catch(() => {});
    },
    [onInsert],
  );

  const handleSave = useCallback(async () => {
    if (!currentValue.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const title = saveTitle.trim() || generateNoteTitle(currentValue);
      await createSavedNote({
        category,
        subcategory,
        title,
        content: currentValue.trim(),
      });
      setSaveTitle('');
      setActiveTab('search');
      await loadRecent();
    } catch {
      setError('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }, [currentValue, saveTitle, category, subcategory, loadRecent]);

  const handleDelete = useCallback(
    async (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await deleteSavedNote(noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch {
        setError('Failed to delete note');
      }
    },
    [],
  );

  return (
    <div className={`relative inline-flex ${className}`} ref={panelRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all hover:shadow-sm
          bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
        title="Search & reuse your saved notes"
      >
        <BookOpen className="h-3.5 w-3.5" />
        My Notes
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header with tabs */}
          <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-3 py-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'search'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="h-3 w-3 inline mr-1" />
                Search Notes
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('save');
                  setSaveTitle(generateNoteTitle(currentValue));
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'save'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Save Current
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search tab */}
          {activeTab === 'search' && (
            <div>
              {/* Search input */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search your saved notes…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Results list */}
              <div className="max-h-[320px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-sm text-red-600">{error}</div>
                ) : notes.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">
                      {query ? 'No matching notes found' : 'No saved notes yet'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {query
                        ? 'Try a different search term'
                        : 'Type your notes and use "Save Current" to build your library'}
                    </p>
                  </div>
                ) : (
                  <ul>
                    {notes.map((note) => (
                      <li key={note.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(note)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {note.title}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {note.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleDelete(note.id, e)}
                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="inline-flex items-center text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                              {note.category.replace(/_/g, ' ')}
                            </span>
                            {note.use_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                <Star className="h-2.5 w-2.5" />
                                Used {note.use_count}×
                              </span>
                            )}
                            {note.last_used_at && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(note.last_used_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Save tab */}
          {activeTab === 'save' && (
            <div className="p-4 space-y-3">
              {!currentValue.trim() ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Type something in the field first, then save it here for reuse.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Note Title
                    </label>
                    <input
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Brief title for this note…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Content Preview
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                      {currentValue.trim()}
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save to My Notes'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
