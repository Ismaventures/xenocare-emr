/**
 * TemplateSearchPopover
 *
 * Floating search panel for clinical text templates.
 * Shows shared templates + the doctor's own personal templates.
 * Selecting a template fires onTemplateSelect with the JSONB template_data,
 * which the parent form uses to fill multiple fields at once.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, BookOpen, Star, Plus, X, User, Globe } from 'lucide-react';
import type { ClinicalTextTemplate, TemplateModule } from '../../lib/clinical-text-templates/types';
import {
  searchClinicalTextTemplates,
  recordTemplateUsage,
  createClinicalTextTemplate,
} from '../../lib/clinical-text-templates/api';

interface TemplateSearchPopoverProps {
  templateType: TemplateModule;
  /** Current form values used when saving current content as a template */
  currentValues?: Record<string, string>;
  /** Called when a template is selected and passes the template_data object */
  onTemplateSelect: (templateData: Record<string, string>, templateKey: string) => void;
  /** Narrow to a specific form section, e.g. 'findings', 'nursing_notes' */
  category?: string;
  contextKeywords?: string[];
  className?: string;
  buttonText?: string;
  clearButtonText?: string;
  searchTabLabel?: string;
  saveTabLabel?: string;
  saveActionLabel?: string;
  saveHint?: string;
  hideClearAction?: boolean;
}

type Tab = 'search' | 'save';

export default function TemplateSearchPopover({
  templateType,
  currentValues = {},
  onTemplateSelect,
  category,
  contextKeywords = [],
  className = '',
  buttonText = 'Use Templates',
  clearButtonText = 'Cancel Template',
  searchTabLabel = 'Use Templates',
  saveTabLabel = 'Save as Template',
  saveActionLabel,
  saveHint,
  hideClearAction = false,
}: TemplateSearchPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [templates, setTemplates] = useState<ClinicalTextTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save-tab state
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveKeywords, setSaveKeywords] = useState('');
  const [saveAsShared, setSaveAsShared] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const normalizedContextKeywords = contextKeywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  const hasCurrentValues = Object.values(currentValues).some(
    value => typeof value === 'string' && value.trim().length > 0,
  );
  const resolvedButtonText =
    buttonText === 'Fill All Fields' || buttonText === 'Fill Template' || buttonText === 'Templates'
      ? 'Use Templates'
      : buttonText;

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

  // Load on open
  useEffect(() => {
    if (!isOpen) return;
    load('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchClinicalTextTemplates(templateType, q, category);
      setTemplates(results);
    } catch {
      setError('Could not load templates');
    } finally {
      setIsLoading(false);
    }
  }, [templateType, category]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), 300);
  }, [load]);

  const handleSelect = useCallback(async (tpl: ClinicalTextTemplate) => {
    onTemplateSelect(tpl.template_data, tpl.template_key);
    setIsOpen(false);
    recordTemplateUsage(tpl.id).catch(() => {});
  }, [onTemplateSelect]);

  const handleClear = useCallback(() => {
    const clearedValues = Object.fromEntries(
      Object.keys(currentValues).map((key) => [key, '']),
    ) as Record<string, string>;

    onTemplateSelect(clearedValues, '__template_clear__');
    setIsOpen(false);
  }, [currentValues, onTemplateSelect]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await createClinicalTextTemplate({
        module: templateType,
        category,
        display_name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        template_data: currentValues,
        search_keywords: saveKeywords.split(',').map(k => k.trim()).filter(Boolean),
        is_shared: saveAsShared,
      });
      setSaveSuccess(true);
      setSaveName('');
      setSaveDesc('');
      setSaveKeywords('');
      setSaveAsShared(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setTab('search');
        load('');
      }, 1500);
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  }, [saveName, saveDesc, saveKeywords, saveAsShared, currentValues, templateType, category, load]);

  // Filter shared vs personal for display tabs
  const sharedTemplates = templates.filter(t => t.is_shared);
  const myTemplates = templates.filter(t => t.is_mine);
  const allVisible = [...myTemplates, ...sharedTemplates.filter(t => !t.is_mine)];
  const matchesContext = (template: ClinicalTextTemplate) => {
    if (normalizedContextKeywords.length === 0) {
      return false;
    }

    const searchableText = [
      template.display_name,
      template.description ?? '',
      template.template_key,
      ...(template.search_keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return normalizedContextKeywords.some((keyword) => searchableText.includes(keyword));
  };
  const orderedVisible =
    normalizedContextKeywords.length > 0 && query.trim().length === 0
      ? [...allVisible].sort((left, right) => Number(matchesContext(right)) - Number(matchesContext(left)))
      : allVisible;

  return (
    <div className={`relative inline-flex ${className}`} ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all hover:shadow-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
        title="Use reusable clinic templates"
      >
        <BookOpen className="h-3.5 w-3.5" />
        {resolvedButtonText}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[440px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-3 py-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTab('search')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === 'search' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="h-3 w-3 inline mr-1" />
                {searchTabLabel}
              </button>
              <button
                type="button"
                onClick={() => setTab('save')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === 'save' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                {saveTabLabel}
              </button>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* SEARCH TAB */}
          {tab === 'search' && (
            <div>
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by keyword, condition, or procedure..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-sm text-red-600">{error}</div>
                ) : orderedVisible.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">No templates found</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords or save a new shared or personal template</p>
                  </div>
                ) : (
                  <ul>
                    {orderedVisible.map(tpl => (
                      <li key={tpl.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(tpl)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex-shrink-0">
                              {tpl.is_mine ? (
                                <span title="My personal template"><User className="h-3.5 w-3.5 text-emerald-500" /></span>
                              ) : (
                                <span title="Shared template"><Globe className="h-3.5 w-3.5 text-blue-400" /></span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-sm font-semibold text-gray-900 truncate">{tpl.display_name}</span>
                                {tpl.my_usage_count > 0 && (
                                  <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    {tpl.my_usage_count}x
                                  </span>
                                )}
                              </div>
                              {tpl.description && (
                                <p className="text-xs text-gray-500 line-clamp-1">{tpl.description}</p>
                              )}
                              {tpl.search_keywords && tpl.search_keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tpl.search_keywords.slice(0, 4).map((kw, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{kw}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500">
                    <Globe className="h-3 w-3 inline mr-1 text-blue-400" />Shared &nbsp;
                    <User className="h-3 w-3 inline mr-1 text-emerald-500" />My templates
                  </p>
                  {hasCurrentValues && !hideClearAction && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <X className="h-3 w-3" />
                      {clearButtonText}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">{orderedVisible.length} template{orderedVisible.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* SAVE TAB */}
          {tab === 'save' && (
            <div className="p-4 space-y-3">
              {saveSuccess ? (
                <div className="p-4 text-center text-emerald-600 text-sm font-semibold">
                  {saveAsShared ? 'Template saved to the shared library.' : 'Template saved to your personal library.'}
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    {saveHint ||
                      'Save the current form content as a reusable template. Shared templates are searchable by other clinicians.'}
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Template name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder="e.g. Normal chest X-ray"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Short description (optional)</label>
                    <input
                      type="text"
                      value={saveDesc}
                      onChange={e => setSaveDesc(e.target.value)}
                      placeholder="e.g. For adult PA chest with no findings"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Search keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={saveKeywords}
                      onChange={e => setSaveKeywords(e.target.value)}
                      placeholder="e.g. normal, chest, clear"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsShared}
                      onChange={e => setSaveAsShared(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-gray-700">Share with other clinicians</div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {saveAsShared
                          ? 'This template will be searchable and reusable across clinicians.'
                          : 'Only you will be able to search and reuse this template.'}
                      </p>
                    </div>
                  </label>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!saveName.trim() || isSaving}
                    className="w-full py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
                  >
                    {isSaving
                      ? 'Saving...'
                      : saveActionLabel ||
                        (saveAsShared
                          ? 'Save Shared Template'
                          : 'Save Personal Template')}
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
