// =============================================================================
// ANC Module — Doctor Review Form (SOAP + ANC-specific)
// Saves to existing consultations table + updates ANC visit
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  Stethoscope,
  ClipboardList,
  CalendarDays,
  CheckCircle,
} from 'lucide-react';
import { SelectWithOther } from '../../shared/components/SelectWithOther';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import {
  ancDoctorReviewSchema,
  type AncDoctorReviewFormDTO,
} from '../dtos/anc.dto';
import { useSaveAncDoctorReview } from '../hooks/useAnc';
import type { AncVisit } from '../api/anc.types';

interface Props {
  ancVisit: AncVisit;
  pregnancyEpisodeId: string;
  patientId: string;
  encounterId: string;
  currentRisk: string;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export default function AncDoctorReviewForm({
  ancVisit,
  pregnancyEpisodeId,
  patientId,
  encounterId,
  currentRisk,
  onSuccess,
  readOnly,
}: Props) {
  const saveReview = useSaveAncDoctorReview();

  // If doctor already completed, show summary
  if (ancVisit.doctor_completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" />
        Doctor review completed for this visit
      </div>
    );
  }

  // Past visit (read-only) — doctor never completed notes
  if (readOnly) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-gray-500">No doctor review was recorded for this visit</p>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AncDoctorReviewFormDTO>({
    resolver: zodResolver(ancDoctorReviewSchema),
    defaultValues: {
      anc_visit_id: ancVisit.id,
      pregnancy_episode_id: pregnancyEpisodeId,
      patient_id: patientId,
      encounter_id: encounterId,
      risk_classification: currentRisk as 'low' | 'moderate' | 'high',
    },
  });

  const onSubmit = async (data: AncDoctorReviewFormDTO) => {
    try {
      await saveReview.mutateAsync(data);
      onSuccess?.();
    } catch (err: any) {
      alert(`Failed to save review: ${err?.message || String(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SOAP Notes */}
      <Section
        title="Consultation Notes (SOAP)"
        icon={<ClipboardList className="h-4 w-4 text-blue-500" />}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <TemplateSearchPopover
              templateType="anc"
              category="anc_notes"
              currentValues={{
                subjective: watch('subjective') || '',
                objective: watch('objective') || '',
                assessment: watch('assessment') || '',
                plan: watch('plan') || '',
              }}
              onTemplateSelect={(data) => {
                if (data.subjective) setValue('subjective', data.subjective);
                if (data.objective) setValue('objective', data.objective);
                if (data.assessment) setValue('assessment', data.assessment);
                if (data.plan) setValue('plan', data.plan);
              }}
              buttonText="Fill All Fields"
            />
          </div>
          <Field
            label="Subjective (Patient's complaint / history) *"
            error={errors.subjective?.message}
          >
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="subjective"
                currentValue={watch('subjective') || ''}
                onInsert={(content) => setValue('subjective', content)}
              />
            </div>
            <textarea
              {...register('subjective')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
              placeholder="Patient reports…"
            />
          </Field>
          <Field
            label="Objective (Examination findings)"
            error={errors.objective?.message}
          >
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="objective"
                currentValue={watch('objective') || ''}
                onInsert={(content) => setValue('objective', content)}
              />
            </div>
            <textarea
              {...register('objective')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
              placeholder="On examination…"
            />
          </Field>
          <Field
            label="Assessment / Diagnosis"
            error={errors.assessment?.message}
          >
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="assessment"
                currentValue={watch('assessment') || ''}
                onInsert={(content) => setValue('assessment', content)}
              />
            </div>
            <textarea
              {...register('assessment')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[60px]"
              placeholder="Assessment…"
            />
          </Field>
          <Field label="Plan" error={errors.plan?.message}>
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="plan"
                currentValue={watch('plan') || ''}
                onInsert={(content) => setValue('plan', content)}
              />
            </div>
            <textarea
              {...register('plan')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
              placeholder="Plan of care…"
            />
          </Field>
        </div>
      </Section>

      {/* ANC-specific fields */}
      <Section
        title="ANC Clinical Decision"
        icon={<Stethoscope className="h-4 w-4 text-pink-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Risk Classification *"
            error={errors.risk_classification?.message}
          >
            <SelectWithOther
              fieldId="anc:risk_classification"
              value={watch('risk_classification')}
              onChange={(v) =>
                setValue(
                  'risk_classification',
                  v as 'low' | 'moderate' | 'high',
                )
              }
              options={['low', 'moderate', 'high']}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="Select risk classification"
            />
          </Field>
          <Field label="Delivery Plan">
            <input
              {...register('delivery_plan')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="SVD / Elective C/S / etc."
            />
          </Field>
        </div>
      </Section>

      {/* Next Visit */}
      <Section
        title="Follow-up Scheduling"
        icon={<CalendarDays className="h-4 w-4 text-purple-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Next Visit Date">
            <input
              type="date"
              {...register('next_visit_date')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="Follow-up Notes">
            <textarea
              {...register('follow_up_notes')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[60px]"
              placeholder="Labs to repeat, watch for…"
            />
          </Field>
        </div>
      </Section>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Complete Doctor Review
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
