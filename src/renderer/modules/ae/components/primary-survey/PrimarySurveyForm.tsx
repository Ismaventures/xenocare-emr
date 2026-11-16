// =============================================================================
// PrimarySurveyForm — ABCDE Trauma Survey (Form C)
// Conditional for trauma / critical patients
// =============================================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wind, Stethoscope, Heart, Brain, Scan } from 'lucide-react';
import {
  primarySurveyFormSchema,
  type PrimarySurveyFormDTO,
} from '../../dtos/ae.dto';
import { useSubmitPrimarySurvey } from '../../hooks/useAe';
import {
  AIRWAY_INTERVENTIONS,
  BREATHING_INTERVENTIONS,
  CIRCULATION_INTERVENTIONS,
} from '../../api/ae.types';
import { SelectWithOther } from '../../../shared/components/SelectWithOther';
import { useToast } from '../../../../components/ui/Toast';

interface PrimarySurveyFormProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

function InterventionChecklist({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter((s) => s !== item)
        : [...selected, item],
    );
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              selected.includes(opt)
                ? 'bg-blue-100 border-blue-400 text-blue-800'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PrimarySurveyForm({
  encounterId,
  patientId,
  onSuccess,
}: PrimarySurveyFormProps) {
  const submitSurvey = useSubmitPrimarySurvey();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<string>('airway');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PrimarySurveyFormDTO>({
    resolver: zodResolver(primarySurveyFormSchema),
    defaultValues: {
      encounter_id: encounterId,
      patient_id: patientId,
      consciousness: 'Alert',
      airway_interventions: [],
      breathing_interventions: [],
      circulation_interventions: [],
      bleeding_sites: [],
      iv_access: [],
      injuries: [],
    },
  });

  const sections = [
    { key: 'airway', label: 'A - Airway', icon: Wind, color: 'text-blue-600' },
    {
      key: 'breathing',
      label: 'B - Breathing',
      icon: Stethoscope,
      color: 'text-cyan-600',
    },
    {
      key: 'circulation',
      label: 'C - Circulation',
      icon: Heart,
      color: 'text-red-600',
    },
    {
      key: 'disability',
      label: 'D - Disability',
      icon: Brain,
      color: 'text-purple-600',
    },
    {
      key: 'exposure',
      label: 'E - Exposure',
      icon: Scan,
      color: 'text-orange-600',
    },
  ];

  const onSubmit = async (data: PrimarySurveyFormDTO) => {
    try {
      await submitSurvey.mutateAsync(data);
      showToast({ message: 'Primary survey saved', type: 'success' });
      onSuccess?.();
    } catch (err) {
      console.error('[A&E] Primary survey save failed:', err);
      showToast({ message: 'Failed to save primary survey', type: 'error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Primary Survey (ABCDE)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Structured emergency assessment.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-2 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-t text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === s.key
                  ? 'bg-white border border-b-white border-gray-200 -mb-[1px]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <s.icon className={`h-4 w-4 ${s.color}`} />
              {s.label}
            </button>
          ))}
        </div>

        {/* A - Airway */}
        {activeSection === 'airway' && (
          <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Airway Status
              </label>
              <SelectWithOther
                fieldId="ae:airway_status"
                value={watch('airway_status') || ''}
                onChange={(v) => setValue('airway_status', v as any)}
                options={[
                  'patent',
                  'compromised',
                  'obstructed',
                  'intubated',
                ].map((v) => ({
                  value: v,
                  label:
                    {
                      patent: 'Patent (clear)',
                      compromised: 'Compromised',
                      obstructed: 'Obstructed',
                      intubated: 'Intubated / Secured',
                    }[v] || v,
                }))}
                placeholder="— Assess —"
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              />
            </div>
            <InterventionChecklist
              label="Interventions"
              options={AIRWAY_INTERVENTIONS}
              selected={watch('airway_interventions')}
              onChange={(items) => setValue('airway_interventions', items)}
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('airway_notes')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* B - Breathing */}
        {activeSection === 'breathing' && (
          <div className="space-y-4 p-4 border border-cyan-200 rounded-lg bg-cyan-50/30">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breathing Status
                </label>
                <SelectWithOther
                  fieldId="ae:breathing_status"
                  value={watch('breathing_status') || ''}
                  onChange={(v) => setValue('breathing_status', v as any)}
                  options={['normal', 'labored', 'absent', 'assisted'].map(
                    (v) => ({
                      value: v,
                      label:
                        {
                          normal: 'Normal',
                          labored: 'Labored',
                          absent: 'Absent',
                          assisted: 'Assisted',
                        }[v] || v,
                    }),
                  )}
                  placeholder="— Assess —"
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  RR (/min)
                </label>
                <input
                  type="number"
                  {...register('breathing_rate', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  SpO₂ (%)
                </label>
                <input
                  type="number"
                  {...register('spo2', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Chest Findings
              </label>
              <textarea
                {...register('chest_findings')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Air entry, percussion, auscultation..."
              />
            </div>
            <InterventionChecklist
              label="Interventions"
              options={BREATHING_INTERVENTIONS}
              selected={watch('breathing_interventions')}
              onChange={(items) => setValue('breathing_interventions', items)}
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('breathing_notes')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* C - Circulation */}
        {activeSection === 'circulation' && (
          <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <SelectWithOther
                  fieldId="ae:circulation_status"
                  value={watch('circulation_status') || ''}
                  onChange={(v) => setValue('circulation_status', v as any)}
                  options={['stable', 'compromised', 'shock', 'arrest'].map(
                    (v) => ({
                      value: v,
                      label:
                        {
                          stable: 'Stable',
                          compromised: 'Compromised',
                          shock: 'Shock',
                          arrest: 'Cardiac Arrest',
                        }[v] || v,
                    }),
                  )}
                  placeholder="— Assess —"
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  HR (bpm)
                </label>
                <input
                  type="number"
                  {...register('heart_rate', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  BP Systolic
                </label>
                <input
                  type="number"
                  {...register('bp_systolic', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  BP Diastolic
                </label>
                <input
                  type="number"
                  {...register('bp_diastolic', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Capillary Refill
              </label>
              <SelectWithOther
                fieldId="ae:capillary_refill"
                value={watch('capillary_refill') || ''}
                onChange={(v) => setValue('capillary_refill', v as any)}
                options={[
                  { value: '<2s', label: '<2 seconds (normal)' },
                  { value: '2-3s', label: '2-3 seconds' },
                  { value: '>3s', label: '>3 seconds (delayed)' },
                ]}
                placeholder="—"
                className="w-full border rounded px-3 py-2 text-sm bg-white"
              />
            </div>
            <InterventionChecklist
              label="Interventions"
              options={CIRCULATION_INTERVENTIONS}
              selected={watch('circulation_interventions')}
              onChange={(items) => setValue('circulation_interventions', items)}
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('circulation_notes')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* D - Disability */}
        {activeSection === 'disability' && (
          <div className="space-y-4 p-4 border border-purple-200 rounded-lg bg-purple-50/30">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  GCS Eye (1-4)
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
                <label className="block text-xs text-gray-600 mb-1">
                  GCS Verbal (1-5)
                </label>
                <select
                  {...register('gcs_verbal', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  <option value={5}>5 - Orientated</option>
                  <option value={4}>4 - Confused</option>
                  <option value={3}>3 - Inappropriate</option>
                  <option value={2}>2 - Incomprehensible</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  GCS Motor (1-6)
                </label>
                <select
                  {...register('gcs_motor', { valueAsNumber: true })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  <option value={6}>6 - Obeys commands</option>
                  <option value={5}>5 - Localises</option>
                  <option value={4}>4 - Withdrawal</option>
                  <option value={3}>3 - Abnormal flexion</option>
                  <option value={2}>2 - Extension</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Pupil Left
                </label>
                <SelectWithOther
                  fieldId="ae:pupil"
                  value={watch('pupil_left') || ''}
                  onChange={(v) => setValue('pupil_left', v as any)}
                  options={[
                    'Equal, reactive',
                    'Dilated',
                    'Constricted',
                    'Fixed',
                  ]}
                  placeholder="—"
                  className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Pupil Right
                </label>
                <SelectWithOther
                  fieldId="ae:pupil"
                  value={watch('pupil_right') || ''}
                  onChange={(v) => setValue('pupil_right', v as any)}
                  options={[
                    'Equal, reactive',
                    'Dilated',
                    'Constricted',
                    'Fixed',
                  ]}
                  placeholder="—"
                  className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AVPU
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Alert', 'Verbal', 'Pain', 'Unresponsive'] as const).map(
                  (level) => (
                    <label
                      key={level}
                      className={`text-center p-2 rounded border cursor-pointer text-sm ${
                        watch('consciousness') === level
                          ? 'bg-purple-100 border-purple-400'
                          : 'border-gray-200'
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
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('disability_notes')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* E - Exposure */}
        {activeSection === 'exposure' && (
          <div className="space-y-4 p-4 border border-orange-200 rounded-lg bg-orange-50/30">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exposure Findings
              </label>
              <textarea
                {...register('exposure_findings')}
                rows={3}
                placeholder="Full body examination findings, wounds, rashes, deformities..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('exposure_notes')}
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitSurvey.isPending}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-md text-sm disabled:opacity-50"
          >
            {submitSurvey.isPending ? 'Saving...' : 'Save Primary Survey'}
          </button>
        </div>
      </form>
    </div>
  );
}
