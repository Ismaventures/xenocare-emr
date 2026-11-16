// =============================================================================
// TriageForm — A&E Triage Assessment (Form B)
// Saves vitals + triage_assessments with A&E extensions
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, Brain, AlertCircle, Thermometer, Heart } from 'lucide-react';
import { triageFormSchema, type TriageFormDTO } from '../../dtos/ae.dto';
import { useSubmitTriage } from '../../hooks/useAe';
import {
  AE_RED_FLAGS,
  triageLevelLabel,
  triageLevelToAcuityColor,
  acuityColorToClasses,
} from '../../api/ae.types';
import type { TriageLevel } from '../../api/ae.types';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../../components/ui/TemplateSearchPopover';
import { useToast } from '../../../../components/ui/Toast';

interface TriageFormProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export default function TriageForm({
  encounterId,
  patientId,
  onSuccess,
}: TriageFormProps) {
  const submitTriage = useSubmitTriage();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TriageFormDTO>({
    resolver: zodResolver(triageFormSchema),
    defaultValues: {
      encounter_id: encounterId,
      patient_id: patientId,
      triage_level: 3,
      consciousness: 'Alert',
      red_flags: [],
    },
  });

  const watchLevel = watch('triage_level');
  const watchRedFlags = watch('red_flags');
  const acuityColor = triageLevelToAcuityColor(
    (watchLevel || 3) as TriageLevel,
  );

  const toggleRedFlag = (flag: string) => {
    const current = watchRedFlags || [];
    const updated = current.includes(flag)
      ? current.filter((f) => f !== flag)
      : [...current, flag];
    setValue('red_flags', updated);
  };

  const onSubmit = async (data: TriageFormDTO) => {
    try {
      await submitTriage.mutateAsync(data);
      showToast({ message: 'Triage saved', type: 'success' });
      onSuccess?.();
    } catch (err) {
      console.error('[A&E] Triage save failed:', err);
      showToast({ message: 'Failed to save triage', type: 'error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Triage Assessment
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Record vital signs and determine patient acuity.
          </p>
        </div>

        {/* Acuity Level Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Triage Acuity Level (ESI) *
          </label>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as TriageLevel[]).map((level) => {
              const color = triageLevelToAcuityColor(level);
              const isSelected = watchLevel === level;
              const colorClasses = acuityColorToClasses(color);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setValue('triage_level', level)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isSelected
                      ? `${colorClasses} border-current ring-2 ring-offset-1`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-lg font-bold">{level}</div>
                  <div className="text-xs">{triageLevelLabel(level)}</div>
                </button>
              );
            })}
          </div>
          <div
            className={`mt-2 p-2 rounded text-center text-sm font-medium ${acuityColorToClasses(acuityColor)}`}
          >
            Acuity: {acuityColor} —{' '}
            {triageLevelLabel((watchLevel || 3) as TriageLevel)}
          </div>
          {errors.triage_level && (
            <p className="text-red-600 text-xs mt-1">
              {errors.triage_level.message}
            </p>
          )}
        </div>

        {/* Vital Signs */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Activity className="h-4 w-4" /> Vital Signs
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Thermometer className="inline h-3 w-3 mr-1" />
                Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('temperature', { valueAsNumber: true })}
                placeholder="36.5"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Heart className="inline h-3 w-3 mr-1" />
                Pulse (bpm)
              </label>
              <input
                type="number"
                {...register('pulse_rate', { valueAsNumber: true })}
                placeholder="80"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                RR (/min)
              </label>
              <input
                type="number"
                {...register('respiratory_rate', { valueAsNumber: true })}
                placeholder="16"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                SpO₂ (%)
              </label>
              <input
                type="number"
                {...register('oxygen_saturation', { valueAsNumber: true })}
                placeholder="98"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                BP Systolic
              </label>
              <input
                type="number"
                {...register('bp_systolic', { valueAsNumber: true })}
                placeholder="120"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                BP Diastolic
              </label>
              <input
                type="number"
                {...register('bp_diastolic', { valueAsNumber: true })}
                placeholder="80"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Blood Glucose
              </label>
              <input
                type="number"
                step="0.1"
                {...register('blood_glucose', { valueAsNumber: true })}
                placeholder="5.5"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Pain (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                {...register('pain_score', { valueAsNumber: true })}
                placeholder="5"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Consciousness (AVPU) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Brain className="inline h-4 w-4 mr-1" /> Consciousness (AVPU) *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['Alert', 'Verbal', 'Pain', 'Unresponsive'] as const).map(
              (level) => (
                <label
                  key={level}
                  className={`flex items-center justify-center p-2 rounded border cursor-pointer text-sm ${
                    watch('consciousness') === level
                      ? level === 'Unresponsive'
                        ? 'bg-red-100 border-red-400 text-red-800'
                        : level === 'Pain'
                          ? 'bg-orange-100 border-orange-400 text-orange-800'
                          : 'bg-green-100 border-green-400 text-green-800'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={level}
                    {...register('consciousness')}
                    className="sr-only"
                  />
                  {level}
                </label>
              ),
            )}
          </div>
        </div>

        {/* GCS (optional, for trauma/altered consciousness) */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Glasgow Coma Scale (Optional)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Eye (1-4)
              </label>
              <select
                {...register('gcs_eye', { valueAsNumber: true })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                <option value={4}>4 - Spontaneous</option>
                <option value={3}>3 - To voice</option>
                <option value={2}>2 - To pain</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Verbal (1-5)
              </label>
              <select
                {...register('gcs_verbal', { valueAsNumber: true })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                <option value={5}>5 - Orientated</option>
                <option value={4}>4 - Confused</option>
                <option value={3}>3 - Inappropriate words</option>
                <option value={2}>2 - Incomprehensible</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Motor (1-6)
              </label>
              <select
                {...register('gcs_motor', { valueAsNumber: true })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                <option value={6}>6 - Obeys commands</option>
                <option value={5}>5 - Localises pain</option>
                <option value={4}>4 - Withdrawal</option>
                <option value={3}>3 - Abnormal flexion</option>
                <option value={2}>2 - Extension</option>
                <option value={1}>1 - None</option>
              </select>
            </div>
          </div>
          {watch('gcs_eye') && watch('gcs_verbal') && watch('gcs_motor') && (
            <div className="mt-2 text-center">
              <span className="text-sm font-medium">
                GCS Total:{' '}
                {(watch('gcs_eye') || 0) +
                  (watch('gcs_verbal') || 0) +
                  (watch('gcs_motor') || 0)}
                /15
              </span>
            </div>
          )}
        </div>

        {/* Red Flags */}
        <div className="border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-700 mb-3">
            🚩 Red Flags
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {AE_RED_FLAGS.map((flag) => (
              <label
                key={flag}
                className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${
                  (watchRedFlags || []).includes(flag)
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(watchRedFlags || []).includes(flag)}
                  onChange={() => toggleRedFlag(flag)}
                  className="rounded text-red-600"
                />
                {flag}
              </label>
            ))}
          </div>
        </div>

        {/* Allergies & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allergies Noted
            </label>
            <input
              type="text"
              {...register('allergies_noted')}
              placeholder="Known allergies..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trauma Mechanism
            </label>
            <input
              type="text"
              {...register('trauma_mechanism')}
              placeholder="Mechanism of injury (if trauma)..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Triage Notes
            </label>
            <div className="flex items-center gap-1">
              <TemplateSearchPopover
                templateType="ae"
                category="ae_triage"
                currentValues={{ triage_notes: watch('triage_notes') || '' }}
                onTemplateSelect={(data) => {
                  if (data.triage_notes) setValue('triage_notes', data.triage_notes);
                  if (data.notes) setValue('triage_notes', data.notes);
                }}
                buttonText="Fill"
              />
              <SavedNotesPopover
                category="ae_notes"
                subcategory="triage_notes"
                currentValue={watch('triage_notes') || ''}
                onInsert={(content) => setValue('triage_notes', content)}
              />
            </div>
          </div>
          <textarea
            {...register('triage_notes')}
            rows={2}
            placeholder="Additional triage observations..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitTriage.isPending}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-md text-sm disabled:opacity-50"
          >
            {submitTriage.isPending ? 'Saving...' : 'Complete Triage'}
          </button>
        </div>
      </form>
    </div>
  );
}
