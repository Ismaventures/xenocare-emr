// =============================================================================
// DispositionForm — A&E Disposition Decision (Form G)
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LogOut,
  Bed,
  ArrowRightLeft,
  ExternalLink,
  Skull,
  AlertTriangle,
} from 'lucide-react';
import {
  dispositionFormSchema,
  type DispositionFormDTO,
} from '../../dtos/ae.dto';
import { useSubmitDisposition } from '../../hooks/useAe';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import { useToast } from '../../../../components/ui/Toast';

interface DispositionFormProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

const DISPOSITION_TYPES = [
  {
    value: 'discharge',
    label: 'Discharge Home',
    icon: LogOut,
    color: 'text-green-600',
  },
  { value: 'admit', label: 'Admit to Ward', icon: Bed, color: 'text-blue-600' },
  {
    value: 'transfer',
    label: 'Transfer Out',
    icon: ArrowRightLeft,
    color: 'text-orange-600',
  },
  {
    value: 'refer',
    label: 'Refer to Specialist',
    icon: ExternalLink,
    color: 'text-purple-600',
  },
  { value: 'death', label: 'Death', icon: Skull, color: 'text-gray-600' },
  {
    value: 'absconded',
    label: 'Absconded',
    icon: AlertTriangle,
    color: 'text-yellow-600',
  },
  {
    value: 'left_against_advice',
    label: 'Left Against Medical Advice',
    icon: AlertTriangle,
    color: 'text-red-600',
  },
] as const;

const CONDITIONS = [
  { value: 'stable', label: 'Stable' },
  { value: 'improved', label: 'Improved' },
  { value: 'unchanged', label: 'Unchanged' },
  { value: 'deteriorated', label: 'Deteriorated' },
  { value: 'critical', label: 'Critical' },
  { value: 'deceased', label: 'Deceased' },
];

export default function DispositionForm({
  encounterId,
  patientId,
  onSuccess,
}: DispositionFormProps) {
  const submitDisposition = useSubmitDisposition();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DispositionFormDTO>({
    resolver: zodResolver(dispositionFormSchema),
    defaultValues: {
      encounter_id: encounterId,
      patient_id: patientId,
      disposition_type: 'discharge',
      condition_at_disposition: 'stable',
      secondary_diagnoses: [],
      medications_on_discharge: [],
    },
  });

  const watchType = watch('disposition_type');

  const onSubmit = async (data: DispositionFormDTO) => {
    try {
      await submitDisposition.mutateAsync(data);
      showToast({ message: 'Disposition saved', type: 'success' });
      onSuccess?.();
    } catch (err) {
      console.error('[A&E] Disposition save failed:', err);
      showToast({ message: 'Failed to save disposition', type: 'error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        {/* Disposition Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Disposition Decision *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DISPOSITION_TYPES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setValue('disposition_type', d.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${
                  watchType === d.value
                    ? 'border-red-400 bg-red-50 ring-1 ring-red-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <d.icon className={`h-5 w-5 ${d.color}`} />
                <span className="font-medium">{d.label}</span>
              </button>
            ))}
          </div>
          {errors.disposition_type && (
            <p className="text-red-600 text-xs mt-1">
              {errors.disposition_type.message}
            </p>
          )}
        </div>

        {/* Final Diagnosis */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Final Diagnosis *
            </label>
            <SavedNotesPopover
              category="ae_notes"
              subcategory="final_diagnosis"
              currentValue={watch('final_diagnosis') || ''}
              onInsert={(content) => setValue('final_diagnosis', content)}
            />
          </div>
          <textarea
            {...register('final_diagnosis')}
            rows={2}
            placeholder="Final diagnosis..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {errors.final_diagnosis && (
            <p className="text-red-600 text-xs mt-1">
              {errors.final_diagnosis.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ICD-10 Code
          </label>
          <input
            type="text"
            {...register('final_diagnosis_icd10')}
            placeholder="e.g., S06.0"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition at Disposition *
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {CONDITIONS.map((c) => (
              <label
                key={c.value}
                className={`text-center p-2 rounded border cursor-pointer text-xs ${
                  watch('condition_at_disposition') === c.value
                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={c.value}
                  {...register('condition_at_disposition')}
                  className="sr-only"
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        {/* Conditional fields by disposition type */}
        {watchType === 'discharge' && (
          <div className="border border-green-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-green-700">
              Discharge Details
            </h4>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">
                  Discharge Instructions
                </label>
                <SavedNotesPopover
                  category="ae_notes"
                  subcategory="discharge_instructions"
                  currentValue={watch('discharge_instructions') || ''}
                  onInsert={(content) => setValue('discharge_instructions', content)}
                />
              </div>
              <textarea
                {...register('discharge_instructions')}
                rows={3}
                placeholder="Instructions for the patient on discharge..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">
                  Return Precautions
                </label>
                <SavedNotesPopover
                  category="ae_notes"
                  subcategory="return_precautions"
                  currentValue={watch('return_precautions') || ''}
                  onInsert={(content) => setValue('return_precautions', content)}
                />
              </div>
              <textarea
                {...register('return_precautions')}
                rows={2}
                placeholder="When to return to A&E..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  {...register('follow_up_date')}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Follow-up Clinic
                </label>
                <input
                  type="text"
                  {...register('follow_up_clinic_id')}
                  placeholder="Clinic for follow-up..."
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {watchType === 'admit' && (
          <div className="border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-blue-700">
              Admission Details
            </h4>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Admission Ward *
              </label>
              <input
                type="text"
                {...register('admission_ward_id')}
                placeholder="Ward ID or name..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">
                  Admission Reason
                </label>
                <SavedNotesPopover
                  category="ae_notes"
                  subcategory="admission_reason"
                  currentValue={watch('admission_reason') || ''}
                  onInsert={(content) => setValue('admission_reason', content)}
                />
              </div>
              <textarea
                {...register('admission_reason')}
                rows={2}
                placeholder="Reason for admission..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {watchType === 'transfer' && (
          <div className="border border-orange-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-orange-700">
              Transfer Details
            </h4>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Destination Facility *
              </label>
              <input
                type="text"
                {...register('transfer_destination')}
                placeholder="Receiving hospital/facility..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Transfer Reason
              </label>
              <textarea
                {...register('transfer_reason')}
                rows={2}
                placeholder="Reason for transfer..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={submitDisposition.isPending}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-md text-sm disabled:opacity-50"
          >
            {submitDisposition.isPending ? 'Saving...' : 'Confirm Disposition'}
          </button>
        </div>
      </form>
    </div>
  );
}
