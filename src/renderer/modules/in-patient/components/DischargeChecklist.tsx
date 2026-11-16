/**
 * Discharge Checklist Component
 * =============================
 * Checklist component for completing all discharge requirements
 * - Nursing clearance
 * - Clinical clearance
 * - Pharmacy clearance
 * - Billing clearance
 * - Patient education
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  User,
  Pill,
  DollarSign,
  FileText,
  Stethoscope,
  ClipboardList,
  Clock,
} from 'lucide-react';

export interface ChecklistItem {
  id: string;
  category:
    | 'nursing'
    | 'clinical'
    | 'pharmacy'
    | 'billing'
    | 'education'
    | 'documentation';
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

interface DischargeChecklistProps {
  admissionId: string;
  patientName: string;
  items?: ChecklistItem[];
  onItemToggle: (itemId: string, completed: boolean, notes?: string) => void;
  onAllComplete?: () => void;
  readOnly?: boolean;
}

// Default checklist items
const DEFAULT_CHECKLIST: Omit<
  ChecklistItem,
  'completed' | 'completedBy' | 'completedAt'
>[] = [
  // Clinical
  {
    id: 'clinical-assessment',
    category: 'clinical',
    label: 'Final clinical assessment completed',
    required: true,
  },
  {
    id: 'discharge-diagnosis',
    category: 'clinical',
    label: 'Discharge diagnosis documented',
    required: true,
  },
  {
    id: 'vitals-stable',
    category: 'clinical',
    label: 'Vital signs stable for discharge',
    required: true,
  },
  {
    id: 'lab-results',
    category: 'clinical',
    label: 'All pending lab results reviewed',
    required: false,
    description: 'Review any outstanding results',
  },

  // Nursing
  {
    id: 'nursing-assessment',
    category: 'nursing',
    label: 'Final nursing assessment',
    required: true,
  },
  {
    id: 'iv-removed',
    category: 'nursing',
    label: 'IV lines removed',
    required: false,
  },
  {
    id: 'wound-care',
    category: 'nursing',
    label: 'Wound care instructions provided',
    required: false,
  },
  {
    id: 'dressing-changed',
    category: 'nursing',
    label: 'Final dressing change (if applicable)',
    required: false,
  },

  // Pharmacy
  {
    id: 'discharge-medications',
    category: 'pharmacy',
    label: 'Discharge medications dispensed',
    required: true,
  },
  {
    id: 'medication-instructions',
    category: 'pharmacy',
    label: 'Medication instructions explained',
    required: true,
  },
  {
    id: 'medication-reconciliation',
    category: 'pharmacy',
    label: 'Medication reconciliation completed',
    required: true,
  },

  // Billing
  {
    id: 'bill-finalized',
    category: 'billing',
    label: 'Final bill prepared',
    required: true,
  },
  {
    id: 'bill-cleared',
    category: 'billing',
    label: 'Payment cleared / Insurance approved',
    required: true,
  },

  // Education
  {
    id: 'discharge-instructions',
    category: 'education',
    label: 'Discharge instructions provided',
    required: true,
  },
  {
    id: 'warning-signs',
    category: 'education',
    label: 'Warning signs explained to patient/family',
    required: true,
  },
  {
    id: 'follow-up-scheduled',
    category: 'education',
    label: 'Follow-up appointment scheduled',
    required: false,
  },
  {
    id: 'diet-activity',
    category: 'education',
    label: 'Diet and activity restrictions explained',
    required: false,
  },

  // Documentation
  {
    id: 'discharge-summary',
    category: 'documentation',
    label: 'Discharge summary prepared',
    required: true,
  },
  {
    id: 'patient-signature',
    category: 'documentation',
    label: 'Patient/Family signature obtained',
    required: true,
  },
  {
    id: 'belongings-returned',
    category: 'documentation',
    label: 'Patient belongings returned',
    required: false,
  },
];

const CATEGORY_CONFIG = {
  clinical: {
    label: 'Clinical Clearance',
    icon: Stethoscope,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  nursing: {
    label: 'Nursing Clearance',
    icon: User,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  pharmacy: {
    label: 'Pharmacy Clearance',
    icon: Pill,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  billing: {
    label: 'Billing Clearance',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  education: {
    label: 'Patient Education',
    icon: FileText,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  documentation: {
    label: 'Documentation',
    icon: ClipboardList,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
  },
};

export const DischargeChecklist: React.FC<DischargeChecklistProps> = ({
  admissionId,
  patientName,
  items: providedItems,
  onItemToggle,
  onAllComplete,
  readOnly = false,
}) => {
  // Initialize items from props or defaults
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    if (providedItems && providedItems.length > 0) {
      return providedItems;
    }
    return DEFAULT_CHECKLIST.map((item) => ({
      ...item,
      completed: false,
    }));
  });

  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    'clinical',
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>,
  );

  // Calculate completion stats
  const totalRequired = items.filter((i) => i.required).length;
  const completedRequired = items.filter(
    (i) => i.required && i.completed,
  ).length;
  const totalCompleted = items.filter((i) => i.completed).length;
  const allRequiredComplete = completedRequired === totalRequired;
  const percentComplete = Math.round((completedRequired / totalRequired) * 100);

  // Notify parent when all required items are complete
  useEffect(() => {
    if (allRequiredComplete && onAllComplete) {
      onAllComplete();
    }
  }, [allRequiredComplete, onAllComplete]);

  const handleToggle = (itemId: string) => {
    if (readOnly) return;

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: !item.completed,
              completedAt: !item.completed
                ? new Date().toISOString()
                : undefined,
            }
          : item,
      );
      const toggledItem = updated.find((i) => i.id === itemId);
      if (toggledItem) {
        onItemToggle(itemId, toggledItem.completed, itemNotes[itemId]);
      }
      return updated;
    });
  };

  const getCategoryStats = (category: string) => {
    const categoryItems = groupedItems[category] || [];
    const completed = categoryItems.filter((i) => i.completed).length;
    const required = categoryItems.filter((i) => i.required).length;
    const requiredCompleted = categoryItems.filter(
      (i) => i.required && i.completed,
    ).length;
    return {
      completed,
      total: categoryItems.length,
      required,
      requiredCompleted,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg p-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Discharge Checklist
        </h3>
        <p className="text-indigo-100 text-sm mt-1">{patientName}</p>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Required Items Progress</span>
            <span>
              {completedRequired}/{totalRequired} ({percentComplete}%)
            </span>
          </div>
          <div className="h-2 bg-indigo-900/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${allRequiredComplete ? 'bg-green-400' : 'bg-white'}`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {allRequiredComplete ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            All required items complete - Patient ready for discharge
          </span>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
          <span>
            {totalRequired - completedRequired} required items remaining
          </span>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const stats = getCategoryStats(category);
          const CategoryIcon = config.icon;
          const isExpanded = expandedCategory === category;
          const categoryComplete = stats.requiredCompleted === stats.required;

          return (
            <div key={category} className="border rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : category)
                }
                className={`w-full flex items-center justify-between p-3 ${config.bg} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                  <span className={`font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {categoryComplete ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Complete
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {stats.requiredCompleted}/{stats.required} required
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="divide-y">
                  {(groupedItems[category] || []).map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 flex items-start gap-3 ${item.completed ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <button
                        onClick={() => handleToggle(item.id)}
                        disabled={readOnly}
                        className={`mt-0.5 flex-shrink-0 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {item.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle
                            className={`w-5 h-5 ${item.required ? 'text-amber-400' : 'text-gray-300'}`}
                          />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                          >
                            {item.label}
                          </span>
                          {item.required && !item.completed && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                              Required
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        {item.completedAt && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.completedAt).toLocaleString()}
                            {item.completedBy && ` by ${item.completedBy}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 text-center">
        {totalCompleted} of {items.length} total items completed
      </div>
    </div>
  );
};

export default DischargeChecklist;
