import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  usePatientAllergies,
  usePatientAllergyReview,
} from '../../modules/patient-registration/hooks/usePatientAllergies';
import type { AllergySeverity } from '../../modules/patient-registration/api/patient-allergies.api';

interface PatientAllergySummaryProps {
  patientId?: string | null;
  knownAllergies?: string[] | null;
  noKnownAllergies?: boolean | null;
  compact?: boolean;
  className?: string;
}

const severityStyles: Record<AllergySeverity, string> = {
  Mild: 'bg-yellow-100 text-yellow-800',
  Moderate: 'bg-orange-100 text-orange-800',
  Severe: 'bg-red-100 text-red-800',
  'Life-threatening': 'bg-red-700 text-white',
};

export default function PatientAllergySummary({
  patientId,
  knownAllergies,
  noKnownAllergies,
  compact = false,
  className = '',
}: PatientAllergySummaryProps) {
  const { data: structured = [], isLoading: loadingStructured } =
    usePatientAllergies(patientId);
  const { data: review, isLoading: loadingReview } =
    usePatientAllergyReview(patientId);

  const reviewed = review?.no_known_allergies ?? noKnownAllergies ?? false;
  const entries =
    structured.length > 0
      ? structured.map((entry) => ({
          allergen: entry.allergen,
          reaction: entry.reaction,
          severity: entry.severity,
        }))
      : (knownAllergies || []).filter(Boolean).map((allergen) => ({
          allergen,
          reaction: null,
          severity: 'Moderate' as AllergySeverity,
        }));

  if ((loadingStructured || loadingReview) && entries.length === 0) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 ${className}`}
      >
        Checking allergy status...
      </div>
    );
  }

  if (entries.length > 0) {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 ${className}`}
      >
        <div className="flex items-center gap-2 text-red-800">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">
            Known Allergies
          </span>
        </div>
        <div className={compact ? 'mt-1.5 space-y-1' : 'mt-2 space-y-2'}>
          {entries.map((entry, index) => (
            <div
              key={`${entry.allergen}-${index}`}
              className="flex flex-wrap items-center gap-2 text-sm text-red-800"
            >
              <span className="font-semibold">{entry.allergen}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${severityStyles[entry.severity]}`}
              >
                {entry.severity}
              </span>
              {entry.reaction && (
                <span className="text-xs text-red-700">
                  Reaction: {entry.reaction}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reviewed) {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ${className}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          No Known Allergies
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4" />
        Allergy status not recorded
      </span>
    </div>
  );
}
