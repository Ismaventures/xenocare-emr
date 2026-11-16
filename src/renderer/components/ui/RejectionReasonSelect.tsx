/**
 * RejectionReasonSelect Component
 * ================================
 * Structured dropdown for selecting rejection reasons with categories.
 * Used across lab, radiology, and procedure rejection workflows.
 */

import React, { useState } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface RejectionReason {
  code: string;
  label: string;
  category: RejectionCategory;
  requiresExplanation?: boolean;
}

export type RejectionCategory =
  | 'clinical'
  | 'operational'
  | 'patient'
  | 'administrative';

// =============================================================================
// Rejection Reasons Catalogue
// =============================================================================

export const REJECTION_REASONS: RejectionReason[] = [
  // Clinical reasons
  {
    code: 'DUPLICATE_ORDER',
    label: 'Duplicate order already exists',
    category: 'clinical',
  },
  {
    code: 'INAPPROPRIATE_TEST',
    label: 'Test/procedure not clinically indicated',
    category: 'clinical',
  },
  {
    code: 'CONTRAINDICATED',
    label: 'Contraindicated for patient',
    category: 'clinical',
  },
  {
    code: 'ALTERNATIVE_RECOMMENDED',
    label: 'Alternative test/procedure recommended',
    category: 'clinical',
    requiresExplanation: true,
  },
  {
    code: 'INSUFFICIENT_INDICATION',
    label: 'Insufficient clinical indication',
    category: 'clinical',
    requiresExplanation: true,
  },
  {
    code: 'DIAGNOSIS_CHANGED',
    label: 'Diagnosis changed, test no longer needed',
    category: 'clinical',
  },

  // Operational reasons
  {
    code: 'EQUIPMENT_DOWN',
    label: 'Equipment unavailable/under maintenance',
    category: 'operational',
  },
  {
    code: 'REAGENT_UNAVAILABLE',
    label: 'Reagents/supplies unavailable',
    category: 'operational',
  },
  {
    code: 'STAFF_UNAVAILABLE',
    label: 'Required staff unavailable',
    category: 'operational',
  },
  {
    code: 'FACILITY_CAPACITY',
    label: 'Facility at capacity',
    category: 'operational',
  },
  {
    code: 'SERVICE_SUSPENDED',
    label: 'Service temporarily suspended',
    category: 'operational',
  },

  // Patient reasons
  {
    code: 'PATIENT_REFUSED',
    label: 'Patient refused the test/procedure',
    category: 'patient',
  },
  {
    code: 'PATIENT_NOT_PREPARED',
    label: 'Patient not properly prepared',
    category: 'patient',
  },
  {
    code: 'PATIENT_CONDITION',
    label: 'Patient condition unsuitable',
    category: 'patient',
    requiresExplanation: true,
  },
  {
    code: 'PATIENT_ABSENT',
    label: 'Patient did not present',
    category: 'patient',
  },
  {
    code: 'PATIENT_DISCHARGED',
    label: 'Patient already discharged',
    category: 'patient',
  },

  // Administrative reasons
  {
    code: 'INSURANCE_NOT_VERIFIED',
    label: 'Insurance not verified',
    category: 'administrative',
  },
  {
    code: 'AUTHORIZATION_PENDING',
    label: 'Pre-authorization required',
    category: 'administrative',
  },
  {
    code: 'ORDER_INCOMPLETE',
    label: 'Order information incomplete',
    category: 'administrative',
    requiresExplanation: true,
  },
  {
    code: 'CONSENT_MISSING',
    label: 'Patient consent not obtained',
    category: 'administrative',
  },

  // Other
  {
    code: 'OTHER',
    label: 'Other (please specify)',
    category: 'administrative',
    requiresExplanation: true,
  },
];

// Category display info
export const CATEGORY_INFO: Record<
  RejectionCategory,
  { label: string; color: string }
> = {
  clinical: { label: 'Clinical', color: 'text-blue-700 bg-blue-50' },
  operational: { label: 'Operational', color: 'text-orange-700 bg-orange-50' },
  patient: { label: 'Patient', color: 'text-purple-700 bg-purple-50' },
  administrative: {
    label: 'Administrative',
    color: 'text-gray-700 bg-gray-50',
  },
};

// =============================================================================
// Component Props
// =============================================================================

export interface RejectionReasonSelectProps {
  value: string;
  explanation: string;
  onChange: (reasonCode: string, explanation: string) => void;
  className?: string;
  requestType?: 'lab' | 'radiology' | 'procedure' | 'generic';
  error?: string;
}

// =============================================================================
// Component
// =============================================================================

export function RejectionReasonSelect({
  value,
  explanation,
  onChange,
  className = '',
  requestType = 'generic',
  error,
}: RejectionReasonSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get selected reason
  const selectedReason = REJECTION_REASONS.find((r) => r.code === value);

  // Group reasons by category
  const groupedReasons = REJECTION_REASONS.reduce(
    (acc, reason) => {
      if (!acc[reason.category]) {
        acc[reason.category] = [];
      }
      acc[reason.category].push(reason);
      return acc;
    },
    {} as Record<RejectionCategory, RejectionReason[]>,
  );

  // Handle reason selection
  const handleSelect = (reason: RejectionReason) => {
    onChange(reason.code, reason.requiresExplanation ? '' : reason.label);
    setIsOpen(false);
  };

  // Build full rejection text
  const getFullRejectionText = (): string => {
    if (!selectedReason) return '';
    if (selectedReason.requiresExplanation) {
      return `${selectedReason.label}: ${explanation}`;
    }
    return selectedReason.label;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-left transition-colors ${
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 bg-white'
          }`}
        >
          {selectedReason ? (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_INFO[selectedReason.category].color}`}
              >
                {CATEGORY_INFO[selectedReason.category].label}
              </span>
              <span className="text-gray-900">{selectedReason.label}</span>
            </div>
          ) : (
            <span className="text-gray-500">Select rejection reason...</span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {Object.entries(groupedReasons).map(([category, reasons]) => (
                <div key={category}>
                  {/* Category Header */}
                  <div
                    className={`px-3 py-2 sticky top-0 ${CATEGORY_INFO[category as RejectionCategory].color} border-b border-gray-100`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {CATEGORY_INFO[category as RejectionCategory].label}
                    </span>
                  </div>

                  {/* Reasons */}
                  {reasons.map((reason) => (
                    <button
                      key={reason.code}
                      type="button"
                      onClick={() => handleSelect(reason)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                        value === reason.code ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-sm text-gray-700">
                        {reason.label}
                      </span>
                      {reason.requiresExplanation && (
                        <span className="text-xs text-gray-400">
                          requires details
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Explanation Field (when required) */}
      {selectedReason?.requiresExplanation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Details <span className="text-red-500">*</span>
          </label>
          <textarea
            value={explanation}
            onChange={(e) => onChange(value, e.target.value)}
            placeholder="Please provide additional details for this rejection..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              error && !explanation ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={3}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {selectedReason && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Rejection reason will be recorded as:
          </div>
          <div className="text-sm text-gray-900 font-medium">
            "{getFullRejectionText() || '(Please add details)'}"
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper to get formatted rejection reason
// =============================================================================

export function getFormattedRejectionReason(
  code: string,
  explanation?: string,
): string {
  const reason = REJECTION_REASONS.find((r) => r.code === code);
  if (!reason) return explanation || code;

  if (reason.requiresExplanation && explanation) {
    return `${reason.label}: ${explanation}`;
  }
  return reason.label;
}

// =============================================================================
// Helper to validate rejection
// =============================================================================

export function validateRejection(
  code: string,
  explanation: string,
): string | null {
  if (!code) return 'Please select a rejection reason';

  const reason = REJECTION_REASONS.find((r) => r.code === code);
  if (!reason) return 'Invalid rejection reason';

  if (reason.requiresExplanation && !explanation.trim()) {
    return 'Please provide additional details for this rejection reason';
  }

  return null;
}

export default RejectionReasonSelect;
