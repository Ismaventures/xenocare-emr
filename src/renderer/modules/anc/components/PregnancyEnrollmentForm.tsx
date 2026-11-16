// =============================================================================
// ANC Module — Pregnancy Enrollment Form
// Registers a new pregnancy episode for a patient
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Baby, Heart, Save, AlertTriangle } from 'lucide-react';
import { SelectWithOther } from '../../shared/components/SelectWithOther';
import PatientSearchInput from '../../../components/ui/PatientSearchInput';
import { useCreatePregnancy, useActivePregnancy } from '../hooks/useAnc';
import { useDoctors, useClinics } from '../../staff/hooks/useStaff';
import {
  pregnancyEpisodeSchema,
  type PregnancyEpisodeFormDTO,
} from '../dtos/anc.dto';
import { calculateEDD, calculateGestationalAge } from '../api/anc.types';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';

interface Props {
  onBack: () => void;
  onSuccess: (episodeId: string) => void;
  preselectedPatientId?: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

export default function PregnancyEnrollmentForm({
  onBack,
  onSuccess,
  preselectedPatientId,
}: Props) {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const createPregnancy = useCreatePregnancy();
  const { data: doctors } = useDoctors();
  const { data: clinics } = useClinics();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PregnancyEpisodeFormDTO>({
    resolver: zodResolver(pregnancyEpisodeSchema),
    defaultValues: {
      patient_id: preselectedPatientId || '',
      gravida: 1,
      parity: 0,
      abortions: 0,
      living_children: 0,
      risk_level: 'low',
      obstetric_history: [],
    },
  });

  const watchPatientId = watch('patient_id');
  const watchLmp = watch('lmp');

  // Check for existing active pregnancy
  const { data: existingPregnancy } = useActivePregnancy(
    watchPatientId || undefined,
  );

  // Auto-calculate EDD when LMP changes
  useEffect(() => {
    if (watchLmp) {
      const edd = calculateEDD(watchLmp);
      if (edd) setValue('edd', edd);
    }
  }, [watchLmp, setValue]);

  const ga = watchLmp ? calculateGestationalAge(watchLmp) : null;

  const onSubmit = async (data: PregnancyEpisodeFormDTO) => {
    try {
      // Sanitize empty strings to undefined for optional UUID fields
      const cleaned = {
        ...data,
        primary_doctor_id: data.primary_doctor_id || undefined,
        primary_midwife_id: data.primary_midwife_id || undefined,
        clinic_id: data.clinic_id || undefined,
      };
      const result = await createPregnancy.mutateAsync(cleaned);
      onSuccess(result.id);
    } catch (err: any) {
      alert(`Failed to save pregnancy: ${err?.message || String(err)}`);
    }
  };

  const handlePatientSelect = (patientId: string, patient: any) => {
    setValue('patient_id', patientId);
    setSelectedPatient(patient);
    // Auto-fill blood group if available from patient record
    if (patient?.blood_group) {
      setValue('blood_group', patient.blood_group);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-pink-500 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Baby className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-bold">New Pregnancy Enrollment</h1>
            <p className="text-pink-200 text-xs">
              Register a new pregnancy episode to begin ANC tracking
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Patient Selection */}
          <Section title="Patient">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Patient *
              </label>
              <Controller
                control={control}
                name="patient_id"
                render={({ field }) => (
                  <PatientSearchInput
                    value={field.value}
                    onChange={handlePatientSelect}
                    selectedPatient={selectedPatient}
                    autoFocus
                  />
                )}
              />
              {errors.patient_id && (
                <p className="text-xs text-red-600">
                  {errors.patient_id.message}
                </p>
              )}
              {existingPregnancy && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">
                      This patient already has an active pregnancy
                    </p>
                    <p className="text-xs mt-0.5">
                      Episode #{existingPregnancy.episode_number} — enrolled{' '}
                      {new Date(
                        existingPregnancy.enrollment_date,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* LMP / EDD / GA */}
          <Section title="Dates & Gestational Age">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Menstrual Period (LMP)
                </label>
                <input
                  type="date"
                  {...register('lmp')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
                {errors.lmp && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.lmp.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  {...register('edd')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gestational Age at Booking
                </label>
                {ga ? (
                  <div className="h-10 flex items-center px-3 bg-gray-100 rounded-lg text-sm font-medium text-gray-900">
                    {ga.weeks} weeks, {ga.days} days
                  </div>
                ) : (
                  <input
                    type="number"
                    {...register('gestational_age_at_booking', {
                      setValueAs: (v) =>
                        v === '' || v === undefined ? undefined : Number(v),
                    })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Weeks"
                  />
                )}
              </div>
            </div>
          </Section>

          {/* Obstetric Formula */}
          <Section title="Obstetric History">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gravida *
                </label>
                <input
                  type="number"
                  min={1}
                  {...register('gravida', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? 1 : Number(v),
                  })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
                {errors.gravida && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.gravida.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parity *
                </label>
                <input
                  type="number"
                  min={0}
                  {...register('parity', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? 0 : Number(v),
                  })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abortions
                </label>
                <input
                  type="number"
                  min={0}
                  {...register('abortions', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? 0 : Number(v),
                  })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Living Children
                </label>
                <input
                  type="number"
                  min={0}
                  {...register('living_children', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? 0 : Number(v),
                  })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>
          </Section>

          {/* Blood Group & Genotype */}
          <Section title="Blood & Genotype">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <SelectWithOther
                  fieldId="anc:blood_group"
                  value={watch('blood_group') ?? ''}
                  onChange={(v: string) => setValue('blood_group', v)}
                  options={BLOOD_GROUPS}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Select"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rhesus Factor
                </label>
                <SelectWithOther
                  fieldId="anc:rhesus_factor"
                  value={watch('rhesus_factor') ?? ''}
                  onChange={(v: string) => setValue('rhesus_factor', v)}
                  options={['positive', 'negative']}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Select"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genotype
                </label>
                <SelectWithOther
                  fieldId="anc:genotype"
                  value={watch('genotype') ?? ''}
                  onChange={(v: string) => setValue('genotype', v)}
                  options={GENOTYPES}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Select"
                />
              </div>
            </div>
          </Section>

          {/* Risk & Care Team */}
          <Section title="Risk Assessment & Care Team">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Risk Level *
                </label>
                <SelectWithOther
                  fieldId="anc:risk_level"
                  value={watch('risk_level') ?? ''}
                  onChange={(v: string) =>
                    setValue('risk_level', v as 'low' | 'moderate' | 'high')
                  }
                  options={['low', 'moderate', 'high']}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Select risk level"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Doctor
                </label>
                <select
                  value={watch('primary_doctor_id') ?? ''}
                  onChange={(e) =>
                    setValue('primary_doctor_id', e.target.value || undefined)
                  }
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Select doctor</option>
                  {doctors?.map((d: any) => (
                    <option
                      key={d.id}
                      value={d.id}
                    >{`Dr. ${d.first_name} ${d.last_name}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic
                </label>
                <select
                  value={watch('clinic_id') ?? ''}
                  onChange={(e) =>
                    setValue('clinic_id', e.target.value || undefined)
                  }
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Select clinic</option>
                  {clinics?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.clinic_name || c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* Medical History */}
          <Section title="Historical Notes (optional)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Medical History
                  </label>
                  <SavedNotesPopover
                    category="anc_notes"
                    subcategory="medical_history"
                    currentValue={watch('medical_history') || ''}
                    onInsert={(content) => setValue('medical_history', content)}
                  />
                </div>
                <textarea
                  {...register('medical_history')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Diabetes, hypertension, etc."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Surgical History
                  </label>
                  <SavedNotesPopover
                    category="anc_notes"
                    subcategory="surgical_history"
                    currentValue={watch('surgical_history') || ''}
                    onInsert={(content) => setValue('surgical_history', content)}
                  />
                </div>
                <textarea
                  {...register('surgical_history')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Previous C-sections, surgeries…"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Family History
                  </label>
                  <SavedNotesPopover
                    category="anc_notes"
                    subcategory="family_history"
                    currentValue={watch('family_history') || ''}
                    onInsert={(content) => setValue('family_history', content)}
                  />
                </div>
                <textarea
                  {...register('family_history')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Family medical history…"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Allergy History
                  </label>
                  <SavedNotesPopover
                    category="anc_notes"
                    subcategory="allergy_history"
                    currentValue={watch('allergy_history') || ''}
                    onInsert={(content) => setValue('allergy_history', content)}
                  />
                </div>
                <textarea
                  {...register('allergy_history')}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                  placeholder="Known allergies…"
                />
              </div>
            </div>
          </Section>

          {/* Validation Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Please fix the following errors:</p>
                <ul className="list-disc ml-4 mt-1 text-xs space-y-0.5">
                  {Object.entries(errors).map(([key, err]: [string, any]) => (
                    <li key={key}>{err?.message || `${key} is invalid`}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!existingPregnancy}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enroll Pregnancy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}
