// =============================================================================
// XENOCARE EMR - Unified Procedure Checklist Component
// Dynamic checklist enforcement based on procedure classification
// All procedures use the same documentation standard with intelligent N/A marking
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Loader2,
  Save,
  Ban,
  ShieldAlert,
  MessageSquare,
  X,
  Info,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProcedure, useUpdatePreOpChecklist } from '../hooks/useProcedures';
import { useProcedureFromCatalogue } from '../hooks/useProcedureCatalogue';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  ProcedureStatus,
  PreOpChecklist,
} from '../../../types/database.types';
import {
  evaluateChecklist,
  getPhaseProgress,
  validateCanStartProcedure,
  validateCanCompleteProcedure,
  createOverrideRecord,
  applyOverrideToChecklistData,
  deriveProcedureContext,
  type EvaluatedChecklistItem,
  type ChecklistApplicability,
  type ChecklistPhase,
  type ValidationResult,
  type ProcedureContext,
} from '../utils/checklistRulesEngine';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

interface ProcedureChecklistProps {
  procedureId: string;
  status: ProcedureStatus;
  onValidationChange?: (validation: ValidationResult) => void;
  hasDocumentation?: boolean;
}

// Override Modal Component
interface OverrideModalProps {
  isOpen: boolean;
  item: EvaluatedChecklistItem | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Override Required Item
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              You are about to override a required checklist item:
            </p>
            <p className="text-sm text-amber-700 mt-1 font-semibold">
              {item.text}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Override <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              placeholder="Enter clinical justification for overriding this requirement..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This action will be recorded in the audit log.
            </p>
          </div>
        </div>
        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (reason.trim()) {
                onConfirm(reason);
              }
            }}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  );
};

const ProcedureChecklist: React.FC<ProcedureChecklistProps> = ({
  procedureId,
  status,
  onValidationChange,
  hasDocumentation = false,
}) => {
  const { staff } = useAuth();
  const { data: procedure, isLoading: procedureLoading } =
    useProcedure(procedureId);
  const { data: catalogue } = useProcedureFromCatalogue(
    procedure?.catalogue_id || '',
  );
  const updateChecklist = useUpdatePreOpChecklist();

  const [savedChecklistData, setSavedChecklistData] = useState<
    Record<string, any>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    item: EvaluatedChecklistItem | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [customItems, setCustomItems] = useState<EvaluatedChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newItemPhase, setNewItemPhase] = useState<ChecklistPhase>('pre');
  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<
    Record<ChecklistPhase, boolean>
  >({
    pre: true,
    intra: true,
    post: true,
  });

  // Load saved checklist data from procedure
  useEffect(() => {
    if (procedure?.pre_op_checklist) {
      setSavedChecklistData(procedure.pre_op_checklist as Record<string, any>);
      const checklist = procedure.pre_op_checklist as Record<string, any>;
      if (checklist.custom_items && Array.isArray(checklist.custom_items)) {
        setCustomItems(checklist.custom_items);
      }
    }
  }, [procedure]);

  // Derive procedure context for rules engine
  const procedureContext = useMemo<ProcedureContext | null>(() => {
    if (!procedure) return null;
    return deriveProcedureContext(procedure, catalogue);
  }, [procedure, catalogue]);

  // Evaluate checklist with rules engine
  const evaluatedChecklist = useMemo(() => {
    if (!procedure) return [];
    const evaluated = evaluateChecklist(
      procedure,
      catalogue,
      savedChecklistData,
    );
    return [...evaluated, ...customItems];
  }, [procedure, catalogue, savedChecklistData, customItems]);

  // Validate and notify parent
  useEffect(() => {
    if (evaluatedChecklist.length > 0 && onValidationChange) {
      const startValidation = validateCanStartProcedure(evaluatedChecklist);
      const completeValidation = validateCanCompleteProcedure(
        evaluatedChecklist,
        hasDocumentation,
      );
      if (status === 'scheduled' || status === 'pre_op') {
        onValidationChange(startValidation);
      } else if (status === 'in_progress') {
        onValidationChange(completeValidation);
      }
    }
  }, [evaluatedChecklist, hasDocumentation, status, onValidationChange]);

  // Save checklist to database
  const saveChecklist = useCallback(async () => {
    if (!procedureId) return;
    const checklistData: Record<string, any> = { ...savedChecklistData };
    if (customItems.length > 0) {
      checklistData.custom_items = customItems;
    }
    try {
      await updateChecklist.mutateAsync({
        procedureId,
        checklist: checklistData as PreOpChecklist,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save checklist:', error);
    }
  }, [procedureId, savedChecklistData, customItems, updateChecklist]);

  // Auto-save when items change
  useEffect(() => {
    if (hasUnsavedChanges) {
      const debounceTimer = setTimeout(() => {
        saveChecklist();
      }, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [hasUnsavedChanges, saveChecklist]);

  // Toggle checklist item
  const toggleItem = useCallback(
    (item: EvaluatedChecklistItem) => {
      const userName = staff
        ? `${staff.first_name} ${staff.last_name}`
        : 'Current User';
      const now = new Date().toISOString();
      const newCompleted = !item.completed;

      if (item.id.startsWith('custom-')) {
        setCustomItems((prev) =>
          prev.map((ci) =>
            ci.id === item.id
              ? {
                  ...ci,
                  completed: newCompleted,
                  completedBy: newCompleted ? userName : undefined,
                  completedAt: newCompleted ? now : undefined,
                }
              : ci,
          ),
        );
      } else {
        setSavedChecklistData((prev) => ({
          ...prev,
          [item.key]: newCompleted,
          [`${item.key}_by`]: newCompleted ? userName : undefined,
          [`${item.key}_at`]: newCompleted ? now : undefined,
        }));
      }
      setHasUnsavedChanges(true);
    },
    [staff],
  );

  // Handle override confirmation
  const handleOverrideConfirm = useCallback(
    (reason: string) => {
      if (!overrideModal.item || !staff?.id) return;
      const staffId = staff.id; // Type narrowing for TypeScript
      const userName = `${staff.first_name} ${staff.last_name}`;
      const override = createOverrideRecord(
        overrideModal.item,
        'not_applicable',
        reason,
        staffId,
        userName,
      );
      setSavedChecklistData((prev) =>
        applyOverrideToChecklistData(prev, override),
      );
      setHasUnsavedChanges(true);
      setOverrideModal({ isOpen: false, item: null });
    },
    [overrideModal.item, staff],
  );

  // Add custom item
  const addCustomItem = useCallback(() => {
    if (!newItemText.trim()) return;
    const newItem: EvaluatedChecklistItem = {
      id: `custom-${Date.now()}`,
      key: `custom_${Date.now()}`,
      phase: newItemPhase,
      text: newItemText,
      applicability: 'optional',
      completed: false,
    };
    setCustomItems((prev) => [...prev, newItem]);
    setNewItemText('');
    setShowAddItem(false);
    setHasUnsavedChanges(true);
  }, [newItemText, newItemPhase]);

  const getPhaseItems = useCallback(
    (phase: ChecklistPhase) => {
      return evaluatedChecklist.filter((item) => item.phase === phase);
    },
    [evaluatedChecklist],
  );

  const getApplicabilityColor = (applicability: ChecklistApplicability) => {
    switch (applicability) {
      case 'required':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'optional':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'not_applicable':
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const phases: {
    id: ChecklistPhase;
    label: string;
    description: string;
    activeStatus: ProcedureStatus[];
    color: string;
  }[] = [
    {
      id: 'pre',
      label: 'Pre-Procedure',
      description: 'Complete before starting the procedure',
      activeStatus: ['scheduled', 'pre_op'],
      color: 'blue',
    },
    {
      id: 'intra',
      label: 'Intra-Procedure',
      description: 'Complete during the procedure',
      activeStatus: ['in_progress'],
      color: 'amber',
    },
    {
      id: 'post',
      label: 'Post-Procedure',
      description: 'Complete after the procedure',
      activeStatus: ['in_progress', 'completed'],
      color: 'green',
    },
  ];

  const togglePhase = (phase: ChecklistPhase) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  if (procedureLoading) {
    return <SkeletonList count={5} hasAvatar={false} />;
  }

  const isReadOnly = status === 'completed' || status === 'cancelled';

  return (
    <div className="space-y-6">
      {procedureContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">
                Checklist Rules Applied
              </p>
              <p className="text-sm text-blue-600 mt-1">
                <span className="font-medium">Classification:</span>{' '}
                {procedureContext.procedureClass} procedure
                <span className="font-medium ml-2">Setting:</span>{' '}
                {procedureContext.careSetting}
                <span className="font-medium ml-2">Risk:</span>{' '}
                {procedureContext.riskLevel}
                <span className="font-medium ml-2">Anesthesia:</span>{' '}
                {procedureContext.anesthesiaType}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Required items are enforced based on procedure classification.
                N/A items are auto-marked and will not block progression.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {updateChecklist.isPending && (
            <>
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <span className="text-blue-600">Saving...</span>
            </>
          )}
          {!updateChecklist.isPending && hasUnsavedChanges && (
            <>
              <Save className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600">Unsaved changes</span>
            </>
          )}
          {!updateChecklist.isPending && !hasUnsavedChanges && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-600">All changes saved</span>
            </>
          )}
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </button>
        )}
      </div>

      {showAddItem && !isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <select
              value={newItemPhase}
              onChange={(e) =>
                setNewItemPhase(e.target.value as ChecklistPhase)
              }
              className="px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
            >
              <option value="pre">Pre-Procedure</option>
              <option value="intra">Intra-Procedure</option>
              <option value="post">Post-Procedure</option>
            </select>
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter checklist item..."
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm"
            />
            <button
              onClick={addCustomItem}
              disabled={!newItemText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {phases.map((phase) => {
        const items = getPhaseItems(phase.id);
        const progress = getPhaseProgress(evaluatedChecklist, phase.id);
        const isActive = phase.activeStatus.includes(status);
        const isExpanded = expandedPhases[phase.id];
        const requiredIncomplete = items.filter(
          (i) =>
            i.applicability === 'required' && !i.completed && !i.overridden,
        ).length;

        return (
          <div
            key={phase.id}
            className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-blue-500' : ''}`}
          >
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full px-6 py-4 border-b bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {phase.label}
                    </h3>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Active
                      </span>
                    )}
                    {progress.completed === progress.total &&
                      progress.total > 0 && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    {requiredIncomplete > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        {requiredIncomplete} required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 text-left">
                    {phase.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {progress.completed}/{progress.total}
                  </p>
                  <p className="text-xs text-gray-500">
                    {progress.percentage}% complete
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>
            <div className="h-1 bg-gray-200">
              <div
                className={`h-full transition-all ${progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {isExpanded && (
              <div className="divide-y">
                {items.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    isReadOnly={isReadOnly}
                    onToggle={() => toggleItem(item)}
                    onOverrideRequest={() =>
                      setOverrideModal({ isOpen: true, item })
                    }
                    getApplicabilityColor={getApplicabilityColor}
                  />
                ))}
                {items.length === 0 && (
                  <div className="px-6 py-4 text-center text-gray-500 text-sm">
                    No checklist items for this phase
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {status === 'in_progress' && (
        <ValidationWarnings
          checklist={evaluatedChecklist}
          hasDocumentation={hasDocumentation}
        />
      )}
      <OverrideModal
        isOpen={overrideModal.isOpen}
        item={overrideModal.item}
        onClose={() => setOverrideModal({ isOpen: false, item: null })}
        onConfirm={handleOverrideConfirm}
      />
    </div>
  );
};

interface ChecklistItemRowProps {
  item: EvaluatedChecklistItem;
  isReadOnly: boolean;
  onToggle: () => void;
  onOverrideRequest: () => void;
  getApplicabilityColor: (applicability: ChecklistApplicability) => string;
}

const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  item,
  isReadOnly,
  onToggle,
  onOverrideRequest,
  getApplicabilityColor,
}) => {
  const isNA = item.applicability === 'not_applicable';
  const isOverridden = item.overridden;

  return (
    <div
      className={`px-6 py-3 flex items-center gap-4 ${item.completed ? 'bg-green-50/50' : isNA ? 'bg-gray-50/50' : ''}`}
    >
      <button
        onClick={onToggle}
        disabled={isReadOnly || isNA}
        className={`flex-shrink-0 ${isReadOnly || isNA ? 'cursor-not-allowed opacity-50' : 'hover:scale-110'} transition-transform`}
      >
        {item.completed ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : isNA ? (
          <MinusCircle className="h-6 w-6 text-gray-400" />
        ) : (
          <Circle className="h-6 w-6 text-gray-300" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-sm ${item.completed ? 'text-gray-500 line-through' : isNA ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {item.text}
          </p>
          <span
            className={`px-1.5 py-0.5 text-xs rounded border ${getApplicabilityColor(item.applicability)}`}
          >
            {item.applicability === 'required'
              ? 'Required'
              : item.applicability === 'optional'
                ? 'Optional'
                : 'N/A'}
          </span>
          {isOverridden && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded border border-amber-200 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Overridden
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
        )}
        {item.completed && item.completedBy && (
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <User className="h-3 w-3" />
            <span>{item.completedBy}</span>
            <Clock className="h-3 w-3 ml-2" />
            <span>
              {item.completedAt
                ? new Date(item.completedAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
        )}
        {isOverridden && item.overrideReason && (
          <div className="flex items-start gap-2 mt-1 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Override reason:</span>{' '}
              {item.overrideReason}
              {item.overriddenBy && (
                <span className="text-amber-500 ml-2">
                  {' '}
                  {item.overriddenBy}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {!isReadOnly &&
        item.applicability === 'required' &&
        !item.completed &&
        !isOverridden && (
          <button
            onClick={onOverrideRequest}
            className="flex-shrink-0 px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded border border-amber-200"
            title="Override this requirement"
          >
            <Ban className="h-4 w-4" />
          </button>
        )}
    </div>
  );
};

interface ValidationWarningsProps {
  checklist: EvaluatedChecklistItem[];
  hasDocumentation: boolean;
}

const ValidationWarnings: React.FC<ValidationWarningsProps> = ({
  checklist,
  hasDocumentation,
}) => {
  const validation = validateCanCompleteProcedure(checklist, hasDocumentation);

  if (validation.canProceed && validation.warnings.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Ready for Completion</p>
            <p className="text-sm text-green-600 mt-1">
              All required items have been completed. The procedure can be
              marked as complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validation.blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">
                Cannot Complete Procedure
              </p>
              <p className="text-sm text-red-600 mt-1">
                The following items must be completed before the procedure can
                be marked as complete:
              </p>
              <ul className="mt-2 space-y-1">
                {validation.blockers.map((blocker) => (
                  <li
                    key={blocker.itemId}
                    className="text-sm text-red-700 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 bg-red-500 rounded-full" />
                    {blocker.itemText}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                Optional Items Incomplete
              </p>
              <p className="text-sm text-amber-600 mt-1">
                The following optional items have not been completed:
              </p>
              <ul className="mt-2 space-y-1">
                {validation.warnings.map((warning) => (
                  <li
                    key={warning.itemId}
                    className="text-sm text-amber-700 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 bg-amber-500 rounded-full" />
                    {warning.itemText}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcedureChecklist;
