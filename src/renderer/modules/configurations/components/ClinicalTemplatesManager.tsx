import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, FileText } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  createClinicalTextTemplate,
  deleteClinicalTextTemplate,
  listAllTemplatesForAdmin,
  updateClinicalTextTemplate,
} from '../../../lib/clinical-text-templates/api';
import type {
  ClinicalTextTemplate,
  TemplateModule,
} from '../../../lib/clinical-text-templates/types';

type EditorMode = 'create' | 'edit';

interface TemplateEditorState {
  module: TemplateModule;
  category: string;
  display_name: string;
  description: string;
  search_keywords: string;
  priority: string;
  is_shared: boolean;
  template_data: string;
}

const MODULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Modules' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'ae', label: 'A&E' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'lab', label: 'Lab' },
  { value: 'anc', label: 'ANC' },
  { value: 'dental', label: 'Dental' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
];

function emptyEditorState(): TemplateEditorState {
  return {
    module: 'consultation',
    category: '',
    display_name: '',
    description: '',
    search_keywords: '',
    priority: '0',
    is_shared: true,
    template_data: '{\n  "plan": ""\n}',
  };
}

function toEditorState(template: ClinicalTextTemplate): TemplateEditorState {
  return {
    module: template.module,
    category: template.category ?? '',
    display_name: template.display_name,
    description: template.description ?? '',
    search_keywords: (template.search_keywords ?? []).join(', '),
    priority: String(template.priority ?? 0),
    is_shared: template.is_shared,
    template_data: JSON.stringify(template.template_data ?? {}, null, 2),
  };
}

export default function ClinicalTemplatesManager() {
  const [templates, setTemplates] = useState<ClinicalTextTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [selected, setSelected] = useState<ClinicalTextTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editorState, setEditorState] = useState<TemplateEditorState>(emptyEditorState());
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const rows = await listAllTemplatesForAdmin();
      setTemplates(rows);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Load Failed',
        message: error instanceof Error ? error.message : 'Failed to load templates',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (moduleFilter && template.module !== moduleFilter) return false;
      if (!q) return true;

      return (
        template.display_name.toLowerCase().includes(q) ||
        template.template_key.toLowerCase().includes(q) ||
        (template.description ?? '').toLowerCase().includes(q) ||
        (template.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [templates, query, moduleFilter]);

  const openCreate = () => {
    setEditorMode('create');
    setSelected(null);
    setEditorState(emptyEditorState());
    setEditorOpen(true);
  };

  const openEdit = (template: ClinicalTextTemplate) => {
    setEditorMode('edit');
    setSelected(template);
    setEditorState(toEditorState(template));
    setEditorOpen(true);
  };

  const saveTemplate = async () => {
    let parsedTemplateData: Record<string, string>;

    try {
      const parsed = JSON.parse(editorState.template_data || '{}');
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Template data must be a JSON object of field-value pairs.');
      }
      parsedTemplateData = Object.entries(parsed).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value ?? '');
          return acc;
        },
        {} as Record<string, string>,
      );
    } catch {
      showToast({
        type: 'error',
        title: 'Invalid JSON',
        message: 'Template data must be valid JSON (object format).',
      });
      return;
    }

    const keywords = editorState.search_keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    setSaving(true);
    try {
      if (editorMode === 'create') {
        await createClinicalTextTemplate({
          module: editorState.module,
          category: editorState.category || undefined,
          display_name: editorState.display_name.trim(),
          description: editorState.description.trim() || undefined,
          template_data: parsedTemplateData,
          search_keywords: keywords,
          is_shared: editorState.is_shared,
          priority: Number(editorState.priority || 0),
        });
      } else if (selected) {
        await updateClinicalTextTemplate(selected.id, {
          display_name: editorState.display_name.trim(),
          description: editorState.description.trim() || undefined,
          template_data: parsedTemplateData,
          search_keywords: keywords,
          priority: Number(editorState.priority || 0),
        });
      }

      showToast({
        type: 'success',
        title: editorMode === 'create' ? 'Template Created' : 'Template Updated',
        message: 'Clinical template saved successfully.',
      });

      setEditorOpen(false);
      await loadTemplates();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save template',
      });
    } finally {
      setSaving(false);
    }
  };

  const archiveTemplate = async (template: ClinicalTextTemplate) => {
    try {
      await deleteClinicalTextTemplate(template.id);
      showToast({
        type: 'success',
        title: 'Template Archived',
        message: 'Template has been removed from active results.',
      });
      await loadTemplates();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Archive Failed',
        message: error instanceof Error ? error.message : 'Failed to archive template',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Clinical Templates</h2>
          <p className="text-sm text-gray-500">Manage shared and personal templates across all modules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadTemplates} icon={RefreshCw}>
            Refresh
          </Button>
          <Button onClick={openCreate} icon={Plus}>
            New Template
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[240px]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, key, description, or category..."
            />
          </div>
          <div className="w-full sm:w-[220px]">
            <Select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              options={MODULE_OPTIONS}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">No templates found</p>
            <p className="text-xs text-gray-400 mt-1">Adjust filters or create a new template.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Module</th>
                  <th className="px-4 py-2 text-left font-semibold">Category</th>
                  <th className="px-4 py-2 text-left font-semibold">Scope</th>
                  <th className="px-4 py-2 text-left font-semibold">Usage</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{template.display_name}</div>
                      <div className="text-xs text-gray-500">{template.template_key}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{template.module}</td>
                    <td className="px-4 py-3">{template.category || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          template.is_shared
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {template.is_shared ? 'Shared' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{template.usage_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => archiveTemplate(template)}>
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editorMode === 'create' ? 'Create Clinical Template' : 'Edit Clinical Template'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Module"
              value={editorState.module}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  module: e.target.value as TemplateModule,
                }))
              }
              options={MODULE_OPTIONS.filter((o) => o.value !== '')}
            />
            <Input
              label="Category"
              value={editorState.category}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  category: e.target.value,
                }))
              }
              placeholder="Optional category (e.g. consultation, findings, ward_round)"
            />
          </div>

          <Input
            label="Display Name"
            value={editorState.display_name}
            onChange={(e) =>
              setEditorState((prev) => ({
                ...prev,
                display_name: e.target.value,
              }))
            }
            placeholder="Template name"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={editorState.description}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Optional summary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search Keywords"
              value={editorState.search_keywords}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  search_keywords: e.target.value,
                }))
              }
              placeholder="comma,separated,keywords"
            />
            <Input
              label="Priority"
              type="number"
              value={editorState.priority}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  priority: e.target.value,
                }))
              }
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editorState.is_shared}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  is_shared: e.target.checked,
                }))
              }
            />
            Shared template (visible to all clinicians)
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Data (JSON object)</label>
            <textarea
              rows={10}
              value={editorState.template_data}
              onChange={(e) =>
                setEditorState((prev) => ({
                  ...prev,
                  template_data: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
              placeholder='{"field_name":"Template content"}'
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveTemplate}
              isLoading={saving}
              disabled={!editorState.display_name.trim()}
            >
              {editorMode === 'create' ? 'Create Template' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
