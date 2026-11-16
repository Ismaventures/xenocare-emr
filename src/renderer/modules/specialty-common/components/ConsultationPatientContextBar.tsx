import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock3,
  Droplets,
  Shield,
  Stethoscope,
  UserRound,
  Briefcase,
  HeartPulse,
} from 'lucide-react';
import { useActivePregnancy } from '../../anc/hooks/useAnc';
import { calculateGestationalAge, getTrimester } from '../../anc/api/anc.types';
import { usePatientMedicalRecords, useEncounterDetails } from '../../clinical-consultation/hooks/useMedicalRecords';

interface ConsultationPatientContextBarProps {
  patientId: string | null | undefined;
  encounterId?: string | null;
  fallbackPatientName?: string;
  fallbackEmrNumber?: string;
  fallbackEncounterNumber?: string;
  fallbackDoctorName?: string;
  className?: string;
  highlightOccupation?: boolean;
}

type Tone = 'critical' | 'warn' | 'info';

interface FlagItem {
  key: string;
  label: string;
  tone: Tone;
}

interface ProfileTagItem {
  key: string;
  label: string;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDisplayAge(dateOfBirth?: string, age?: string | number): string {
  if (typeof age === 'number' && age > 0) return `${age}y`;
  if (typeof age === 'string' && age.trim()) return age;
  if (!dateOfBirth) return 'Age n/a';

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'Age n/a';

  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    return `${Math.max(months, 0)}m`;
  }

  return `${years}y`;
}

function getInitials(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return 'PT';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function getFlagClasses(tone: Tone): string {
  if (tone === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  if (tone === 'warn') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function formatShortDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBloodPressureLevel(
  systolic?: number | null,
  diastolic?: number | null,
): 'critical' | 'warn' | 'normal' {
  if ((systolic ?? 0) >= 180 || (diastolic ?? 0) >= 120) {
    return 'critical';
  }

  if ((systolic ?? 0) >= 160 || (diastolic ?? 0) >= 110) {
    return 'warn';
  }

  return 'normal';
}

export default function ConsultationPatientContextBar({
  patientId,
  encounterId,
  fallbackPatientName,
  fallbackEmrNumber,
  fallbackEncounterNumber,
  fallbackDoctorName,
  className = '',
  highlightOccupation = false,
}: ConsultationPatientContextBarProps) {
  const normalizedPatientId = patientId?.trim() || null;
  const normalizedEncounterId = encounterId?.trim() || null;

  const { data: recordView, isLoading: isLoadingPatient } = usePatientMedicalRecords(normalizedPatientId);
  const { data: encounterDetail, isLoading: isLoadingEncounter } = useEncounterDetails(normalizedEncounterId);

  const patient = recordView?.patient;
  const problems = recordView?.problems || [];
  const latestVitals = recordView?.latest_vitals;
  const pregnancyPatientId = patient?.id || null;
  const { data: activePregnancy } = useActivePregnancy(pregnancyPatientId || undefined);

  const fullName = useMemo(() => {
    const parts = [patient?.first_name, patient?.middle_name, patient?.surname]
      .map((part) => part?.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    return fallbackPatientName?.trim() || 'Selected patient';
  }, [fallbackPatientName, patient?.first_name, patient?.middle_name, patient?.surname]);

  const allergyFlags = useMemo<FlagItem[]>(() => {
    return (patient?.allergies || []).slice(0, 4).map((allergy, index) => ({
      key: `allergy-${index}-${allergy.allergen}`,
      label: `Allergy: ${allergy.allergen}`,
      tone:
        allergy.severity === 'Severe' || allergy.severity === 'Life-threatening'
          ? 'critical'
          : 'warn',
    }));
  }, [patient?.allergies]);

  const chronicFlags = useMemo<FlagItem[]>(() => {
    return problems
      .filter((problem) => problem.status === 'Active' || problem.status === 'Chronic')
      .slice(0, 4)
      .map((problem) => ({
        key: `problem-${problem.id}`,
        label: problem.name,
        tone: problem.status === 'Chronic' ? 'warn' : 'info',
      }));
  }, [problems]);

  const profileTags = useMemo<ProfileTagItem[]>(() => {
    const tags: ProfileTagItem[] = [];
    const addTag = (key: string, label: string) => {
      if (tags.some((tag) => tag.label.toLowerCase() === label.toLowerCase())) {
        return;
      }
      tags.push({ key, label });
    };

    if (patient?.patient_category) {
      addTag('patient-category', patient.patient_category);
    }

    if (patient?.military_branch || patient?.service_number) {
      addTag('military', 'Military');
    }

    if ((patient?.insurance_type || '').toLowerCase().includes('vip')) {
      addTag('vip', 'VIP');
    }

    if (patient?.patient_type === 'Dependent') {
      addTag('dependent', 'Dependent');
    }

    if ((patient?.insurance_type || '').toLowerCase().includes('nhis')) {
      addTag('nhis', 'NHIS');
    }

    return tags.slice(0, 5);
  }, [patient?.insurance_type, patient?.military_branch, patient?.patient_category, patient?.patient_type, patient?.service_number]);

  const clinicalFlags = useMemo<FlagItem[]>(() => [], []);

  const pregnancySummaryItems = useMemo<string[]>(() => {
    if (!activePregnancy) return [];

    const items: string[] = [];
    const gestationalAge = calculateGestationalAge(activePregnancy.lmp);
    const trimester = gestationalAge ? getTrimester(gestationalAge.weeks) : null;
    const edd = formatShortDate(activePregnancy.edd);

    if (gestationalAge) {
      items.push(`GA ${gestationalAge.weeks}w ${gestationalAge.days}d`);
    }

    if (trimester) {
      items.push(`Trimester ${trimester}`);
    }

    if (typeof activePregnancy.gravida === 'number' && typeof activePregnancy.parity === 'number') {
      items.push(`G${activePregnancy.gravida}P${activePregnancy.parity}`);
    }

    if (edd) {
      items.push(`EDD ${edd}`);
    }

    if (activePregnancy.risk_level && activePregnancy.risk_level !== 'low') {
      items.push(`${activePregnancy.risk_level.toUpperCase()} risk`);
    }

    return items;
  }, [activePregnancy]);

  const flags = [...allergyFlags, ...chronicFlags, ...clinicalFlags].slice(0, 8);
  const age = getDisplayAge(patient?.date_of_birth, patient?.age);
  const sex = patient?.gender || 'Unknown';
  const bloodGroup = patient?.blood_group || 'Not set';
  const occupation = patient?.occupation?.trim() || null;
  const bloodPressure = latestVitals?.blood_pressure || null;
  const bloodPressureValue = bloodPressure
    ? `${bloodPressure.systolic}/${bloodPressure.diastolic} mmHg`
    : null;
  const bloodPressureLevel = getBloodPressureLevel(
    bloodPressure?.systolic,
    bloodPressure?.diastolic,
  );
  const emrNumber = patient?.emr_number || fallbackEmrNumber || normalizedPatientId || 'Pending';
  const encounterNumber =
    encounterDetail?.encounter_number || fallbackEncounterNumber || 'Encounter pending';
  const doctorName = encounterDetail?.doctor?.name || fallbackDoctorName || 'Doctor not assigned';
  const visitDateTime = formatDateTime(encounterDetail?.encounter_date);

  if (!normalizedPatientId && !fallbackPatientName && !fallbackEmrNumber) {
    return null;
  }

  return (
    <div
      className={`border-b border-slate-200 bg-white text-slate-900 shadow-sm ${className}`}
    >
      <div className="px-4 py-2 sm:px-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(280px,0.95fr)] xl:items-stretch">
            <div className="flex min-w-0 items-center gap-3 bg-gradient-to-br from-sky-50 via-white to-cyan-50/60 px-2 py-3 xl:px-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-100 bg-sky-50 text-sm font-bold uppercase tracking-wide text-sky-700 shadow-inner">
              {patient?.photo_url ? (
                <img
                  src={patient.photo_url}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(fullName)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {fullName}
                </p>
                {profileTags.map((tag) => (
                  <span
                    key={tag.key}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>

              <p className="mt-1 text-sm font-medium text-slate-700">
                EMR {emrNumber}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">Age {age}</span>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-700">Sex {sex}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                  <Droplets className="h-3.5 w-3.5" />
                  {bloodGroup}
                </span>
                {bloodPressureValue && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                      bloodPressureLevel === 'critical'
                        ? 'border-red-300 bg-red-100 text-red-800 ring-1 ring-red-200'
                        : bloodPressureLevel === 'warn'
                          ? 'border-amber-300 bg-amber-100 text-amber-800'
                          : 'border-violet-200 bg-violet-50 text-violet-700'
                    }`}
                  >
                    <HeartPulse className="h-3.5 w-3.5" />
                    BP {bloodPressureValue}
                  </span>
                )}
              </div>

              {highlightOccupation && occupation && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-sky-700">
                    <Briefcase className="h-3.5 w-3.5" />
                    Occupation
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
                    {occupation}
                  </span>
                </div>
              )}

              {pregnancySummaryItems.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-700">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Pregnancy
                  </span>
                  {pregnancySummaryItems.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

            <div className="border-t border-slate-200 px-2 py-3 xl:border-l xl:border-t-0 xl:px-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              Critical Flags
              </div>

              {isLoadingPatient ? (
                <div className="text-sm text-slate-500">Loading patient safety snapshot...</div>
              ) : flags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {flags.map((flag) => (
                    <span
                      key={flag.key}
                      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getFlagClasses(flag.tone)}`}
                      title={flag.label}
                    >
                      <span className="truncate">{flag.label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="h-4 w-4 text-slate-400" />
                  No allergies or chronic flags captured for this snapshot.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-2 py-3 xl:border-l xl:border-t-0 xl:px-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                Current Encounter
              </div>

              <div className="grid gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Encounter</span>
                  <span className="text-right font-semibold text-slate-900">{encounterNumber}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Visit
                  </span>
                  <span className="text-right font-medium text-slate-800">{visitDateTime}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <UserRound className="h-3.5 w-3.5" />
                    Doctor
                  </span>
                  <span className="text-right font-medium text-slate-800">{doctorName}</span>
                </div>

                {(isLoadingPatient || isLoadingEncounter) && (
                  <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Refreshing patient context...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
