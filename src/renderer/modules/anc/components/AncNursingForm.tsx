// =============================================================================
// ANC Module — Nursing Assessment Form
// Captures maternal vitals, fetal assessment, urine tests, danger signs
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Heart,
  Thermometer,
  Activity,
  Save,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  ancObservationSchema,
  type AncObservationFormDTO,
} from '../dtos/anc.dto';
import { useCreateObservation, useAncObservations } from '../hooks/useAnc';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import type { AncObservation } from '../api/anc.types';

interface Props {
  ancVisitId: string;
  pregnancyEpisodeId: string;
  onSuccess?: () => void;
  readOnly?: boolean;
}

const URINE_OPTIONS = ['nil', 'trace', '+', '++', '+++'];
const SEVERITY_OPTIONS = ['none', 'mild', 'moderate', 'severe'];
const FETAL_MOVEMENT_OPTIONS = ['present', 'reduced', 'absent'];
const PRESENTATION_OPTIONS = ['cephalic', 'breech', 'transverse', 'unstable'];
const LIE_OPTIONS = ['longitudinal', 'oblique', 'transverse'];
const LIQUOR_OPTIONS = ['adequate', 'reduced', 'excessive'];

const DANGER_SIGNS = [
  'Vaginal bleeding',
  'Severe headache',
  'Blurred vision',
  'Epigastric pain',
  'Severe abdominal pain',
  'Convulsions',
  'Reduced fetal movement',
  'Premature rupture of membranes',
  'High fever',
  'Severe vomiting',
];

export default function AncNursingForm({
  ancVisitId,
  pregnancyEpisodeId,
  onSuccess,
  readOnly,
}: Props) {
  const createObservation = useCreateObservation();
  const { data: existingObs } = useAncObservations(ancVisitId);

  const hasExistingData = existingObs && existingObs.length > 0;
  const latestObs = hasExistingData ? existingObs[0] : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AncObservationFormDTO>({
    resolver: zodResolver(ancObservationSchema),
    defaultValues: {
      anc_visit_id: ancVisitId,
      pregnancy_episode_id: pregnancyEpisodeId,
      number_of_fetuses: 1,
      vaginal_bleeding: false,
      contractions: false,
      danger_signs: [],
    },
  });

  const watchBpSys = watch('systolic_bp');
  const watchBpDia = watch('diastolic_bp');

  const bpWarning =
    (watchBpSys && watchBpSys >= 140) || (watchBpDia && watchBpDia >= 90)
      ? 'Elevated BP — consider pre-eclampsia screening'
      : null;

  const onSubmit = async (data: AncObservationFormDTO) => {
    try {
      await createObservation.mutateAsync(data);
      onSuccess?.();
    } catch (err: any) {
      alert(`Failed to save observation: ${err?.message || String(err)}`);
    }
  };

  // If observation already done, show summary
  if (hasExistingData && latestObs) {
    return <ObservationSummary obs={latestObs} />;
  }

  // Past visit (read-only) but no nursing data was recorded
  if (readOnly) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-gray-500">No nursing assessment was recorded for this visit</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Maternal Vitals */}
      <Section
        title="Maternal Vitals"
        icon={<Heart className="h-4 w-4 text-red-500" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Systolic BP (mmHg)" error={errors.systolic_bp?.message}>
            <input
              type="number"
              {...register('systolic_bp', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="120"
            />
          </Field>
          <Field
            label="Diastolic BP (mmHg)"
            error={errors.diastolic_bp?.message}
          >
            <input
              type="number"
              {...register('diastolic_bp', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="80"
            />
          </Field>
          <Field label="Pulse (bpm)" error={errors.pulse?.message}>
            <input
              type="number"
              {...register('pulse', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="72"
            />
          </Field>
          <Field label="Temperature (°C)" error={errors.temperature?.message}>
            <input
              type="number"
              step="0.1"
              {...register('temperature', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="36.5"
            />
          </Field>
          <Field
            label="Respiratory Rate"
            error={errors.respiratory_rate?.message}
          >
            <input
              type="number"
              {...register('respiratory_rate', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="18"
            />
          </Field>
          <Field label="Weight (kg)" error={errors.weight_kg?.message}>
            <input
              type="number"
              step="0.1"
              {...register('weight_kg', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="65.0"
            />
          </Field>
          <Field label="Height (cm)" error={errors.height_cm?.message}>
            <input
              type="number"
              step="0.1"
              {...register('height_cm', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="165"
            />
          </Field>
        </div>
        {bpWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-amber-700 mt-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {bpWarning}
          </div>
        )}
      </Section>

      {/* Urine & Physical Exam */}
      <Section
        title="Urine & Physical Exam"
        icon={<Activity className="h-4 w-4 text-blue-500" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Urine Protein">
            <select
              {...register('urine_protein')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {URINE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Urine Glucose">
            <select
              {...register('urine_glucose')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {URINE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Edema">
            <select
              {...register('edema')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pallor">
            <select
              {...register('pallor')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Breast Examination Notes">
            <textarea
              {...register('breast_exam')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[60px]"
              placeholder="NAD / Any findings…"
            />
          </Field>
        </div>
      </Section>

      {/* Fetal Assessment */}
      <Section
        title="Fetal Assessment"
        icon={<Stethoscope className="h-4 w-4 text-pink-500" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field
            label="Fundal Height (cm)"
            error={errors.fundal_height_cm?.message}
          >
            <input
              type="number"
              step="0.5"
              {...register('fundal_height_cm', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="28"
            />
          </Field>
          <Field
            label="Fetal Heart Rate (bpm)"
            error={errors.fetal_heart_rate?.message}
          >
            <input
              type="number"
              {...register('fetal_heart_rate', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="140"
            />
          </Field>
          <Field label="Fetal Movement">
            <select
              {...register('fetal_movement')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {FETAL_MOVEMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Presentation">
            <select
              {...register('fetal_presentation')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {PRESENTATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fetal Lie">
            <select
              {...register('fetal_lie')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {LIE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="No. of Fetuses"
            error={errors.number_of_fetuses?.message}
          >
            <input
              type="number"
              min={1}
              max={5}
              {...register('number_of_fetuses', {
                setValueAs: (v: string) => (v === '' ? 1 : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="Liquor Status">
            <select
              {...register('liquor_status')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              {LIQUOR_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cervix Status">
            <input
              {...register('cervix_status')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="Closed / Effaced…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('vaginal_bleeding')}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Vaginal bleeding
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('contractions')}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Contractions
          </label>
        </div>
      </Section>

      {/* Danger Signs */}
      <Section
        title="Danger Signs / Red Flags"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DANGER_SIGNS.map((sign) => (
            <label
              key={sign}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                value={sign}
                {...register('danger_signs')}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              {sign}
            </label>
          ))}
        </div>
      </Section>

      {/* Notes */}
      <Section
        title="Additional Notes"
        icon={<Activity className="h-4 w-4 text-gray-500" />}
      >
        <div className="flex justify-end mb-3">
          <TemplateSearchPopover
            templateType="anc"
            category="anc_notes"
            currentValues={{
              maternal_complaints: watch('maternal_complaints') || '',
              interventions: watch('interventions') || '',
            }}
            onTemplateSelect={(data) => {
              if (data.maternal_complaints) setValue('maternal_complaints', data.maternal_complaints);
              if (data.nursing_notes) setValue('maternal_complaints', data.nursing_notes);
              if (data.interventions) setValue('interventions', data.interventions);
            }}
            buttonText="Fill All Fields"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Maternal Complaints">
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="maternal_complaints"
                currentValue={watch('maternal_complaints') || ''}
                onInsert={(content) => setValue('maternal_complaints', content)}
              />
            </div>
            <textarea
              {...register('maternal_complaints')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[70px]"
              placeholder="Any complaints…"
            />
          </Field>
          <Field label="Interventions Given">
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="interventions"
                currentValue={watch('interventions') || ''}
                onInsert={(content) => setValue('interventions', content)}
              />
            </div>
            <textarea
              {...register('interventions')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[70px]"
              placeholder="Iron, folic acid, TT vaccine…"
            />
          </Field>
          <Field label="Counseling Notes">
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="counseling_notes"
                currentValue={watch('counseling_notes') || ''}
                onInsert={(content) => setValue('counseling_notes', content)}
              />
            </div>
            <textarea
              {...register('counseling_notes')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[70px]"
              placeholder="Nutrition, exercise, danger signs discussed…"
            />
          </Field>
          <Field label="General Notes">
            <div className="flex justify-end mb-1">
              <SavedNotesPopover
                category="anc_notes"
                subcategory="general_notes"
                currentValue={watch('notes') || ''}
                onInsert={(content) => setValue('notes', content)}
              />
            </div>
            <textarea
              {...register('notes')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[70px]"
              placeholder="Additional observations…"
            />
          </Field>
        </div>
      </Section>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Nursing Assessment
        </button>
      </div>
    </form>
  );
}

// ─── Observation Summary (read-only, shown after save) ──────────────────────
// Timeline-card layout matching inpatient encounter timeline design

export function ObservationSummary({ obs, compact }: { obs: AncObservation; compact?: boolean }) {
  const hasBp = obs.systolic_bp != null && obs.diastolic_bp != null;
  const bpHigh = hasBp && (obs.systolic_bp! >= 140 || obs.diastolic_bp! >= 90);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="font-semibold">Nursing Assessment</span>
          <span className="text-green-500">·</span>
          <span>
            {new Date(obs.created_at).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}{' '}
            at{' '}
            {new Date(obs.created_at).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* 1. Maternal Vitals */}
      <SummarySection
        title="Maternal Vitals"
        icon={<Heart className="h-3.5 w-3.5 text-red-500" />}
        color="red"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <VitalChip
            label="BP"
            value={hasBp ? `${obs.systolic_bp}/${obs.diastolic_bp}` : null}
            unit="mmHg"
            alert={bpHigh}
          />
          <VitalChip label="Pulse" value={obs.pulse} unit="bpm" />
          <VitalChip label="Temp" value={obs.temperature} unit="°C" />
          <VitalChip label="RR" value={obs.respiratory_rate} unit="/min" />
          <VitalChip label="Weight" value={obs.weight_kg} unit="kg" />
          <VitalChip label="Height" value={obs.height_cm} unit="cm" />
        </div>
        {bpHigh && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Elevated BP — consider pre-eclampsia screening
          </div>
        )}
      </SummarySection>

      {/* 2. Urine & Physical Exam */}
      <SummarySection
        title="Urine & Physical Exam"
        icon={<Activity className="h-3.5 w-3.5 text-blue-500" />}
        color="blue"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <VitalChip label="Urine Protein" value={obs.urine_protein} />
          <VitalChip label="Urine Glucose" value={obs.urine_glucose} />
          <VitalChip label="Edema" value={obs.edema} />
          <VitalChip label="Pallor" value={obs.pallor} />
        </div>
        {obs.breast_exam && (
          <NoteBlock label="Breast Exam" text={obs.breast_exam} />
        )}
      </SummarySection>

      {/* 3. Fetal Assessment */}
      <SummarySection
        title="Fetal Assessment"
        icon={<Stethoscope className="h-3.5 w-3.5 text-pink-500" />}
        color="pink"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <VitalChip label="Fundal Ht" value={obs.fundal_height_cm} unit="cm" />
          <VitalChip label="FHR" value={obs.fetal_heart_rate} unit="bpm" />
          <VitalChip label="Movement" value={obs.fetal_movement} />
          <VitalChip label="Presentation" value={obs.fetal_presentation} />
          <VitalChip label="Lie" value={obs.fetal_lie} />
          <VitalChip label="Fetuses" value={obs.number_of_fetuses} />
          <VitalChip label="Liquor" value={obs.liquor_status} />
          <VitalChip label="Cervix" value={obs.cervix_status} />
        </div>
        {(obs.vaginal_bleeding || obs.contractions) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {obs.vaginal_bleeding && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" /> Vaginal Bleeding
              </span>
            )}
            {obs.contractions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                <AlertTriangle className="h-3 w-3" /> Contractions
              </span>
            )}
          </div>
        )}
      </SummarySection>

      {/* 4. Danger Signs */}
      {obs.danger_signs && obs.danger_signs.length > 0 && (
        <SummarySection
          title={`Danger Signs (${obs.danger_signs.length})`}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          color="red"
          alert
        >
          <div className="flex flex-wrap gap-1.5">
            {obs.danger_signs.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-700"
              >
                {s}
              </span>
            ))}
          </div>
        </SummarySection>
      )}

      {/* 5. Clinical Notes */}
      {(obs.maternal_complaints || obs.interventions || obs.counseling_notes || obs.notes) && (
        <SummarySection
          title="Clinical Notes"
          icon={<Activity className="h-3.5 w-3.5 text-gray-500" />}
          color="gray"
        >
          <div className={compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
            {obs.maternal_complaints && (
              <NoteBlock label="Maternal Complaints" text={obs.maternal_complaints} />
            )}
            {obs.interventions && (
              <NoteBlock label="Interventions Given" text={obs.interventions} />
            )}
            {obs.counseling_notes && (
              <NoteBlock label="Counseling Notes" text={obs.counseling_notes} />
            )}
            {obs.notes && (
              <NoteBlock label="General Notes" text={obs.notes} />
            )}
          </div>
        </SummarySection>
      )}
    </div>
  );
}

function SummarySection({
  title,
  icon,
  color,
  alert: isAlert,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
  children: React.ReactNode;
}) {
  const borderCls = isAlert ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white';
  return (
    <div className={`rounded-xl border ${borderCls} overflow-hidden`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        {icon}
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function VitalChip({
  label,
  value,
  unit,
  alert: isAlert,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  alert?: boolean;
}) {
  const display = value != null && value !== '' ? String(value) : '—';
  const hasValue = value != null && value !== '';
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        isAlert
          ? 'bg-red-50 border border-red-200'
          : 'bg-gray-50'
      }`}
    >
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p
        className={`text-sm font-semibold ${
          isAlert
            ? 'text-red-700'
            : hasValue
              ? 'text-gray-900'
              : 'text-gray-300'
        }`}
      >
        {display}
        {hasValue && unit && (
          <span className="ml-0.5 text-[11px] font-normal text-gray-400">{unit}</span>
        )}
      </p>
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
    </div>
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
