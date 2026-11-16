// =============================================================================
// ANC Module — Delivery Outcome Form
// Records delivery details and closes the pregnancy episode
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Baby, Save, CheckCircle, Heart } from 'lucide-react';
import {
  deliveryOutcomeSchema,
  type DeliveryOutcomeFormDTO,
} from '../dtos/anc.dto';
import { useCreateOutcome, usePregnancyOutcome } from '../hooks/useAnc';
import type { PregnancyOutcome } from '../api/anc.types';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

interface Props {
  pregnancyEpisodeId: string;
  onSuccess?: () => void;
}

const DELIVERY_MODES = [
  { value: 'svd', label: 'Spontaneous Vaginal Delivery (SVD)' },
  { value: 'elective_cs', label: 'Elective Caesarean Section' },
  { value: 'emergency_cs', label: 'Emergency Caesarean Section' },
  { value: 'instrumental', label: 'Instrumental Delivery' },
  { value: 'vacuum', label: 'Vacuum Extraction' },
  { value: 'forceps', label: 'Forceps Delivery' },
];

const PLACES = [
  { value: 'this_facility', label: 'This Facility' },
  { value: 'other_hospital', label: 'Other Hospital' },
  { value: 'home', label: 'Home' },
  { value: 'en_route', label: 'En Route' },
];

const MATERNAL_COMPLICATIONS = [
  'PPH',
  'Eclampsia',
  'Sepsis',
  'Uterine rupture',
  'Retained placenta',
  'Perineal tear (3rd/4th degree)',
  'DIC',
  'Amniotic fluid embolism',
];

const NEONATAL_COMPLICATIONS = [
  'Birth asphyxia',
  'Neonatal jaundice',
  'Respiratory distress',
  'Low birth weight',
  'Congenital anomaly',
  'Neonatal sepsis',
  'Meconium aspiration',
];

export default function DeliveryOutcomeForm({
  pregnancyEpisodeId,
  onSuccess,
}: Props) {
  const { data: existingOutcome } = usePregnancyOutcome(pregnancyEpisodeId);
  const createOutcome = useCreateOutcome();

  if (existingOutcome) {
    return <OutcomeSummary outcome={existingOutcome} />;
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryOutcomeFormDTO>({
    resolver: zodResolver(deliveryOutcomeSchema),
    defaultValues: {
      pregnancy_episode_id: pregnancyEpisodeId,
      place_of_delivery: 'this_facility',
      delivery_mode: 'svd',
      maternal_outcome: 'alive',
      neonatal_outcome: 'alive',
      placenta_complete: true,
      maternal_complications: [],
      neonatal_complications: [],
    },
  });

  const onSubmit = async (data: DeliveryOutcomeFormDTO) => {
    try {
      await createOutcome.mutateAsync(data);
      onSuccess?.();
    } catch (err: any) {
      alert(`Failed to save delivery outcome: ${err?.message || String(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Delivery Details */}
      <Section
        title="Delivery Details"
        icon={<Baby className="h-4 w-4 text-pink-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Delivery Date *" error={errors.delivery_date?.message}>
            <input
              type="date"
              {...register('delivery_date')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="GA at Delivery (weeks)">
            <input
              type="number"
              {...register('gestational_age_at_delivery', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="Place of Delivery">
            <select
              {...register('place_of_delivery')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              {PLACES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Delivery Mode">
            <select
              {...register('delivery_mode')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              {DELIVERY_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Blood Loss (ml)">
            <input
              type="number"
              {...register('blood_loss_ml', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="500"
            />
          </Field>
          <Field label="Placenta Complete">
            <select
              {...register('placenta_complete', {
                setValueAs: (v) => v === 'true',
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Maternal Outcome */}
      <Section
        title="Maternal Outcome"
        icon={<Heart className="h-4 w-4 text-red-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Maternal Outcome *">
            <select
              {...register('maternal_outcome')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="alive">Alive & Well</option>
              <option value="deceased">Deceased</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Maternal Complications
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MATERNAL_COMPLICATIONS.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  value={c}
                  {...register('maternal_complications')}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Neonatal Outcome */}
      <Section
        title="Neonatal Outcome"
        icon={<Baby className="h-4 w-4 text-blue-500" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Baby Weight (grams)">
            <input
              type="number"
              {...register('baby_weight_grams', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="3200"
            />
          </Field>
          <Field label="Baby Sex">
            <select
              {...register('baby_sex')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="ambiguous">Ambiguous</option>
            </select>
          </Field>
          <Field label="APGAR @ 1 min">
            <input
              type="number"
              min={0}
              max={10}
              {...register('apgar_1', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="APGAR @ 5 min">
            <input
              type="number"
              min={0}
              max={10}
              {...register('apgar_5', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </Field>
          <Field label="Neonatal Outcome *">
            <select
              {...register('neonatal_outcome')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="alive">Alive</option>
              <option value="stillbirth">Stillbirth</option>
              <option value="neonatal_death">Neonatal Death</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Neonatal Complications
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NEONATAL_COMPLICATIONS.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  value={c}
                  {...register('neonatal_complications')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Notes */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-1">
          <Field label="Additional Notes">
            <span />
          </Field>
          <div className="flex items-center gap-1">
            <TemplateSearchPopover
              templateType="anc"
              category="anc_notes"
              currentValues={{ notes: watch('notes') || '' }}
              onTemplateSelect={(data) => {
                if (data.notes || data.nursing_notes) setValue('notes', data.notes || data.nursing_notes || '');
              }}
              buttonText="Fill"
            />
            <SavedNotesPopover
              category="anc_notes"
              subcategory="delivery_notes"
              currentValue={watch('notes') || ''}
              onInsert={(content) => setValue('notes', content)}
            />
          </div>
        </div>
        <textarea
          {...register('notes')}
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
          placeholder="Delivery summary, complications, instructions…"
        />
      </div>

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
          Record Delivery Outcome
        </button>
      </div>
    </form>
  );
}

// ─── Outcome Summary ────────────────────────────────────────────────────────

function OutcomeSummary({ outcome }: { outcome: PregnancyOutcome }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" />
        Delivery outcome recorded —{' '}
        {new Date(outcome.delivery_date).toLocaleDateString()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryItem
          label="Delivery Mode"
          value={outcome.delivery_mode?.replace('_', ' ').toUpperCase() || '—'}
        />
        <SummaryItem
          label="Place"
          value={outcome.place_of_delivery?.replace('_', ' ') || '—'}
        />
        <SummaryItem
          label="GA at Delivery"
          value={
            outcome.gestational_age_at_delivery
              ? `${outcome.gestational_age_at_delivery} weeks`
              : '—'
          }
        />
        <SummaryItem
          label="Blood Loss"
          value={outcome.blood_loss_ml ? `${outcome.blood_loss_ml} ml` : '—'}
        />
        <SummaryItem
          label="Baby Weight"
          value={
            outcome.baby_weight_grams ? `${outcome.baby_weight_grams}g` : '—'
          }
        />
        <SummaryItem label="Baby Sex" value={outcome.baby_sex || '—'} />
        <SummaryItem
          label="APGAR"
          value={
            outcome.apgar_1 != null && outcome.apgar_5 != null
              ? `${outcome.apgar_1} / ${outcome.apgar_5}`
              : '—'
          }
        />
        <SummaryItem
          label="Maternal Outcome"
          value={outcome.maternal_outcome || '—'}
        />
        <SummaryItem
          label="Neonatal Outcome"
          value={outcome.neonatal_outcome || '—'}
        />
        <SummaryItem
          label="Placenta"
          value={outcome.placenta_complete ? 'Complete' : 'Incomplete'}
        />
      </div>

      {outcome.notes && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Notes</p>
          {outcome.notes}
        </div>
      )}
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
