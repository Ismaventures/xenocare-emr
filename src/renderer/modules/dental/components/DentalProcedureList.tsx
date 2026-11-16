// =============================================================================
// DentalProcedureList Component
// List and manage dental procedures aligned with CreateDentalProcedureDTO types
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  DentalProcedureDTO,
  CreateDentalProcedureDTO,
  DentalProcedureType,
  DentalProcedureCategory,
  AnesthesiaType,
} from '../types/dental.types';

// =============================================================================
// Types
// =============================================================================

interface DentalProcedureListProps {
  patientId: string;
  encounterId: string;
  examId?: string;
  facilityId?: string;
  existingProcedures?: DentalProcedureDTO[];
  onAddProcedure: (procedure: CreateDentalProcedureDTO) => Promise<void>;
  onUpdateProcedure?: (
    procedureId: string,
    updates: Partial<CreateDentalProcedureDTO>,
  ) => Promise<void>;
  onDeleteProcedure?: (procedureId: string) => Promise<void>;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const PROCEDURE_TYPES: {
  value: DentalProcedureType;
  label: string;
  category: DentalProcedureCategory;
}[] = [
  {
    value: 'Scaling_Polishing',
    label: 'Scaling & Polishing',
    category: 'Preventive',
  },
  {
    value: 'Composite_Filling',
    label: 'Composite Filling',
    category: 'Restorative',
  },
  {
    value: 'Amalgam_Filling',
    label: 'Amalgam Filling',
    category: 'Restorative',
  },
  { value: 'GIC_Filling', label: 'GIC Filling', category: 'Restorative' },
  {
    value: 'Simple_Extraction',
    label: 'Simple Extraction',
    category: 'Surgical',
  },
  {
    value: 'Surgical_Extraction',
    label: 'Surgical Extraction',
    category: 'Surgical',
  },
  {
    value: 'Root_Canal',
    label: 'Root Canal Treatment',
    category: 'Endodontic',
  },
  {
    value: 'RCT_Single_Canal',
    label: 'RCT (Single Canal)',
    category: 'Endodontic',
  },
  {
    value: 'RCT_Multi_Canal',
    label: 'RCT (Multi Canal)',
    category: 'Endodontic',
  },
  {
    value: 'Crown_Preparation',
    label: 'Crown Preparation',
    category: 'Prosthodontic',
  },
  { value: 'Bridge_Work', label: 'Bridge Work', category: 'Prosthodontic' },
  {
    value: 'Denture_Impression',
    label: 'Denture Impression',
    category: 'Prosthodontic',
  },
  {
    value: 'Denture_Fitting',
    label: 'Denture Fitting',
    category: 'Prosthodontic',
  },
  { value: 'Pulpotomy', label: 'Pulpotomy', category: 'Endodontic' },
  { value: 'Pulpectomy', label: 'Pulpectomy', category: 'Endodontic' },
  { value: 'Gingivectomy', label: 'Gingivectomy', category: 'Periodontic' },
  { value: 'Flap_Surgery', label: 'Flap Surgery', category: 'Periodontic' },
  { value: 'Splinting', label: 'Splinting', category: 'Restorative' },
  { value: 'Other', label: 'Other', category: 'Surgical' },
];

const ANESTHESIA_TYPES: AnesthesiaType[] = [
  'None',
  'Topical',
  'Local',
  'Block',
  'Sedation',
  'General',
];

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];

const STATUS_OPTIONS = [
  'Planned',
  'Scheduled',
  'In_Progress',
  'Completed',
  'Cancelled',
];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-gray-100 text-gray-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  In_Progress: 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
}

// =============================================================================
// Procedure Form Component
// =============================================================================

interface ProcedureFormProps {
  initialData?: Partial<CreateDentalProcedureDTO>;
  onSave: (data: CreateDentalProcedureDTO) => Promise<void>;
  onCancel: () => void;
  patientId: string;
  encounterId: string;
  examId?: string;
  facilityId?: string;
  isEditing?: boolean;
}

function ProcedureForm({
  initialData,
  onSave,
  onCancel,
  patientId,
  encounterId,
  examId,
  facilityId,
  isEditing = false,
}: ProcedureFormProps) {
  const [formData, setFormData] = useState<Partial<CreateDentalProcedureDTO>>({
    patient_id: patientId,
    encounter_id: encounterId,
    exam_id: examId,
    facility_id: facilityId,
    procedure_type: initialData?.procedure_type || '',
    procedure_category: initialData?.procedure_category || '',
    procedure_description: initialData?.procedure_description || '',
    tooth_numbers: initialData?.tooth_numbers || [],
    surfaces: initialData?.surfaces || [],
    anesthesia_type: initialData?.anesthesia_type || '',
    priority: initialData?.priority || 'Normal',
    fee: initialData?.fee,
    consent_obtained: initialData?.consent_obtained || false,
    pre_procedure_notes: initialData?.pre_procedure_notes || '',
  });

  const [toothInput, setToothInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcedureTypeChange = useCallback((type: string) => {
    const procedureInfo = PROCEDURE_TYPES.find((p) => p.value === type);
    setFormData((prev) => ({
      ...prev,
      procedure_type: type,
      procedure_category: procedureInfo?.category || '',
    }));
  }, []);

  const addToothNumber = useCallback(() => {
    const num = parseInt(toothInput);
    if (num >= 11 && num <= 85 && !formData.tooth_numbers?.includes(num)) {
      setFormData((prev) => ({
        ...prev,
        tooth_numbers: [...(prev.tooth_numbers || []), num].sort(
          (a, b) => a - b,
        ),
      }));
      setToothInput('');
    }
  }, [toothInput, formData.tooth_numbers]);

  const removeToothNumber = useCallback((num: number) => {
    setFormData((prev) => ({
      ...prev,
      tooth_numbers: (prev.tooth_numbers || []).filter((t) => t !== num),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.procedure_type) {
      setError('Please select a procedure type');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        patient_id: patientId,
        encounter_id: encounterId,
        exam_id: examId,
        facility_id: facilityId,
        procedure_type: formData.procedure_type!,
        procedure_category: formData.procedure_category,
        procedure_description: formData.procedure_description,
        tooth_numbers: formData.tooth_numbers,
        surfaces: formData.surfaces,
        anesthesia_type: formData.anesthesia_type,
        priority: formData.priority,
        fee: formData.fee,
        consent_obtained: formData.consent_obtained,
        pre_procedure_notes: formData.pre_procedure_notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [formData, patientId, encounterId, examId, facilityId, onSave]);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      <h4 className="font-medium text-gray-900">
        {isEditing ? 'Edit Procedure' : 'Add Procedure'}
      </h4>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Procedure Type *
          </label>
          <select
            value={formData.procedure_type || ''}
            onChange={(e) => handleProcedureTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select procedure...</option>
            {PROCEDURE_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <input
            type="text"
            value={formData.procedure_category || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tooth Numbers
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={toothInput}
              onChange={(e) => setToothInput(e.target.value)}
              placeholder="e.g., 36"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) =>
                e.key === 'Enter' && (e.preventDefault(), addToothNumber())
              }
            />
            <button
              type="button"
              onClick={addToothNumber}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formData.tooth_numbers && formData.tooth_numbers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tooth_numbers.map((num) => (
                <span
                  key={num}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                >
                  {num}
                  <button
                    type="button"
                    onClick={() => removeToothNumber(num)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anesthesia
          </label>
          <select
            value={formData.anesthesia_type || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                anesthesia_type: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None required</option>
            {ANESTHESIA_TYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority || 'Normal'}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, priority: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fee (₦)
          </label>
          <input
            type="number"
            value={formData.fee ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                fee: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter fee..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description / Notes
          </label>
          <textarea
            value={formData.procedure_description || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                procedure_description: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Additional details..."
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="consent"
            checked={formData.consent_obtained || false}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                consent_obtained: e.target.checked,
              }))
            }
            className="rounded"
          />
          <label htmlFor="consent" className="text-sm text-gray-700">
            Consent obtained
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? 'Update' : 'Add Procedure'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DentalProcedureList({
  patientId,
  encounterId,
  examId,
  facilityId,
  existingProcedures = [],
  onAddProcedure,
  onUpdateProcedure,
  onDeleteProcedure,
  readOnly = false,
}: DentalProcedureListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(
    async (data: CreateDentalProcedureDTO) => {
      await onAddProcedure(data);
      setShowAddForm(false);
    },
    [onAddProcedure],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!onDeleteProcedure) return;
      if (window.confirm('Are you sure you want to delete this procedure?')) {
        await onDeleteProcedure(id);
      }
    },
    [onDeleteProcedure],
  );

  // Calculate totals
  const totals = useMemo(() => {
    let totalFee = 0;
    let completedCount = 0;
    let pendingCount = 0;

    existingProcedures.forEach((p) => {
      if (p.fee) totalFee += p.fee;
      if (p.status === 'Completed') completedCount++;
      else if (p.status !== 'Cancelled') pendingCount++;
    });

    return { totalFee, completedCount, pendingCount };
  }, [existingProcedures]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Procedures</h3>
          <p className="text-sm text-gray-500">
            {existingProcedures.length} procedure(s) • {totals.completedCount}{' '}
            completed • ₦{totals.totalFee.toLocaleString()} total
          </p>
        </div>
        {!readOnly && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Procedure
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <ProcedureForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
          patientId={patientId}
          encounterId={encounterId}
          examId={examId}
          facilityId={facilityId}
        />
      )}

      {/* Procedure List */}
      {existingProcedures.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-gray-200 border-dashed rounded-xl">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No procedures recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {existingProcedures.map((proc) => (
            <div
              key={proc.procedure_id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Procedure Header */}
              <div
                className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleExpanded(proc.procedure_id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {PROCEDURE_TYPES.find(
                        (p) => p.value === proc.procedure_type,
                      )?.label || proc.procedure_type}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {proc.tooth_numbers?.length
                        ? `Teeth: ${proc.tooth_numbers.join(', ')}`
                        : 'No specific teeth'}
                      {proc.procedure_category &&
                        ` • ${proc.procedure_category}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proc.status)}`}
                  >
                    {proc.status?.replace('_', ' ')}
                  </span>
                  {proc.fee && (
                    <span className="text-sm font-medium text-gray-700">
                      ₦{proc.fee.toLocaleString()}
                    </span>
                  )}
                  {expandedIds.has(proc.procedure_id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedIds.has(proc.procedure_id) && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {proc.procedure_description && (
                      <div className="col-span-full">
                        <span className="text-gray-500">Description:</span>{' '}
                        <span className="text-gray-700">
                          {proc.procedure_description}
                        </span>
                      </div>
                    )}
                    {proc.anesthesia_type && (
                      <div>
                        <span className="text-gray-500">Anesthesia:</span>{' '}
                        <span className="text-gray-700">
                          {proc.anesthesia_type}
                        </span>
                      </div>
                    )}
                    {proc.priority && (
                      <div>
                        <span className="text-gray-500">Priority:</span>{' '}
                        <span className="text-gray-700">{proc.priority}</span>
                      </div>
                    )}
                    {proc.procedure_date && (
                      <div>
                        <span className="text-gray-500">Date:</span>{' '}
                        <span className="text-gray-700">
                          {new Date(proc.procedure_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {proc.performer && (
                      <div>
                        <span className="text-gray-500">Performed by:</span>{' '}
                        <span className="text-gray-700">
                          {proc.performer.first_name} {proc.performer.last_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
                      {onUpdateProcedure && (
                        <button
                          onClick={() => setEditingId(proc.procedure_id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                      {onDeleteProcedure && (
                        <button
                          onClick={() => handleDelete(proc.procedure_id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
