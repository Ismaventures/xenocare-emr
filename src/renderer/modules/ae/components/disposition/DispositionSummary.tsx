// =============================================================================
// DispositionSummary — Read-only view of a locked disposition decision
// One-off: Once a disposition is recorded, it's legally locked
// =============================================================================

import React from 'react';
import {
  LogOut,
  Bed,
  ArrowRightLeft,
  ExternalLink,
  Skull,
  AlertTriangle,
  Lock,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAeDisposition } from '../../hooks/useAe';

interface DispositionSummaryProps {
  encounterId: string;
}

const DISPOSITION_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  discharge: {
    label: 'Discharged Home',
    icon: LogOut,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  admit: {
    label: 'Admitted to Ward',
    icon: Bed,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  transfer: {
    label: 'Transferred Out',
    icon: ArrowRightLeft,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  refer: {
    label: 'Referred to Specialist',
    icon: ExternalLink,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  death: {
    label: 'Death',
    icon: Skull,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  absconded: {
    label: 'Absconded',
    icon: AlertTriangle,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  left_against_advice: {
    label: 'Left Against Medical Advice',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
};

const CONDITIONS: Record<string, string> = {
  stable: 'Stable',
  improved: 'Improved',
  unchanged: 'Unchanged',
  deteriorated: 'Deteriorated',
  critical: 'Critical',
  deceased: 'Deceased',
};

export default function DispositionSummary({
  encounterId,
}: DispositionSummaryProps) {
  const { data: disposition } = useAeDisposition(encounterId);

  if (!disposition) return null;

  const d =
    DISPOSITION_LABELS[disposition.disposition_type] ||
    DISPOSITION_LABELS.discharge;
  const Icon = d.icon;

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Locked banner */}
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">
            This disposition record is locked and cannot be modified for
            medico-legal integrity.
          </span>
        </div>

        {/* Disposition Type */}
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${d.color} mb-6`}
        >
          <Icon className="w-6 h-6" />
          <div>
            <div className="text-lg font-bold">{d.label}</div>
            <div className="text-xs opacity-70 flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3" />
              {disposition.disposition_time
                ? new Date(disposition.disposition_time).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : disposition.created_at
                  ? new Date(disposition.created_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Final Diagnosis */}
          {disposition.final_diagnosis && (
            <Field
              label="Final Diagnosis"
              value={disposition.final_diagnosis}
            />
          )}
          {disposition.final_diagnosis_icd10 && (
            <Field
              label="ICD-10 Code"
              value={disposition.final_diagnosis_icd10}
            />
          )}
          {disposition.condition_at_disposition && (
            <Field
              label="Condition at Disposition"
              value={
                CONDITIONS[disposition.condition_at_disposition] ||
                disposition.condition_at_disposition
              }
            />
          )}

          {/* Discharge Details */}
          {disposition.discharge_instructions && (
            <Field
              label="Discharge Instructions"
              value={disposition.discharge_instructions}
              span
            />
          )}
          {disposition.return_precautions && (
            <Field
              label="Return Precautions"
              value={disposition.return_precautions}
              span
            />
          )}
          {disposition.follow_up_date && (
            <Field
              label="Follow-up Date"
              value={new Date(disposition.follow_up_date).toLocaleDateString()}
            />
          )}
          {disposition.follow_up_clinic_id && (
            <Field
              label="Follow-up Clinic"
              value={disposition.follow_up_clinic_id}
            />
          )}

          {/* Admission Details */}
          {disposition.admission_ward_id && (
            <Field
              label="Admission Ward"
              value={disposition.admission_ward_id}
            />
          )}
          {disposition.admission_reason && (
            <Field
              label="Admission Reason"
              value={disposition.admission_reason}
              span
            />
          )}

          {/* Transfer Details */}
          {disposition.transfer_destination && (
            <Field
              label="Transfer Destination"
              value={disposition.transfer_destination}
            />
          )}
          {disposition.transfer_reason && (
            <Field
              label="Transfer Reason"
              value={disposition.transfer_reason}
              span
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
