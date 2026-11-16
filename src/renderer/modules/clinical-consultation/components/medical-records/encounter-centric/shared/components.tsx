/**
 * Shared UI components for Encounter-Centric View
 */

import React from 'react';
import {
  Activity,
  FileText,
  Heart,
  Clipboard,
  FlaskConical,
  Scan,
  Pill,
  Syringe,
  BedDouble,
  Receipt,
  Users,
  Smile,
  Eye,
  Dumbbell,
} from 'lucide-react';
import { ModuleConfig, ModuleType } from './types';

// =============================================================================
// Module Configuration
// =============================================================================

export const MODULES: ModuleConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Activity,
    description: 'Summary of all encounter data',
  },
  {
    id: 'all-notes',
    label: 'All Notes',
    icon: FileText,
    description: 'Clinical, nursing & progress notes',
  },
  {
    id: 'vitals',
    label: 'Vitals',
    icon: Heart,
    description: 'Vital signs & measurements',
  },
  {
    id: 'treatment-plan',
    label: 'Treatment Plan',
    icon: Clipboard,
    description: 'Treatment plans & follow-ups',
  },
  {
    id: 'labs',
    label: 'Laboratory',
    icon: FlaskConical,
    description: 'Lab orders & results',
  },
  {
    id: 'radiology',
    label: 'Radiology',
    icon: Scan,
    description: 'Imaging studies & reports',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: Pill,
    description: 'Prescriptions & medications',
  },
  {
    id: 'procedures',
    label: 'Procedures',
    icon: Syringe,
    description: 'Surgeries & procedures',
  },
  {
    id: 'admissions',
    label: 'Admissions',
    icon: BedDouble,
    description: 'Ward admissions & records',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: Receipt,
    description: 'Invoices & payments',
  },
  {
    id: 'care-team',
    label: 'Care Team',
    icon: Users,
    description: 'Manage care team & access control',
    restrictedTo: ['super_admin', 'admin', 'doctor', 'medical_director'],
  },
  {
    id: 'dental',
    label: 'Dental',
    icon: Smile,
    description: 'Dental exams & procedures',
  },
  {
    id: 'ophthalmology',
    label: 'Ophthalmology',
    icon: Eye,
    description: 'Eye exams & procedures',
  },
  {
    id: 'physiotherapy',
    label: 'Physiotherapy',
    icon: Dumbbell,
    description: 'Physio assessments & sessions',
  },
];

// =============================================================================
// Helper Components
// =============================================================================

export function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}

export function InfoItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-white/60 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-white/60 text-xs">{label}</div>
        <div
          className={`truncate ${highlight ? 'font-semibold text-white' : 'text-white/90'}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const iconColorMap: Record<string, string> = {
    green: 'bg-slate-100 text-emerald-600',
    blue: 'bg-slate-100 text-sky-600',
    purple: 'bg-slate-100 text-violet-600',
    amber: 'bg-slate-100 text-amber-600',
  };

  const iconClasses = iconColorMap[color] || 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${iconClasses}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusLower = status?.toLowerCase() || '';
  let classes = 'bg-gray-100 text-gray-700';

  if (
    statusLower.includes('completed') ||
    statusLower.includes('dispensed') ||
    statusLower.includes('paid')
  ) {
    classes = 'bg-green-100 text-green-700';
  } else if (
    statusLower.includes('active') ||
    statusLower.includes('progress')
  ) {
    classes = 'bg-blue-100 text-blue-700';
  } else if (
    statusLower.includes('pending') ||
    statusLower.includes('waiting')
  ) {
    classes = 'bg-amber-100 text-amber-700';
  } else if (
    statusLower.includes('cancelled') ||
    statusLower.includes('rejected')
  ) {
    classes = 'bg-red-100 text-red-700';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
}

export function VitalsDisplay({
  vitals,
  detailed = false,
}: {
  vitals: any;
  detailed?: boolean;
}) {
  // Normalize BP: handle both flat (blood_pressure_systolic/diastolic) and
  // nested ({ systolic, diastolic }) shapes from VitalSnapshot vs other sources
  const bpSys =
    vitals.blood_pressure_systolic ??
    (typeof vitals.blood_pressure === 'object' ? vitals.blood_pressure?.systolic : null);
  const bpDia =
    vitals.blood_pressure_diastolic ??
    (typeof vitals.blood_pressure === 'object' ? vitals.blood_pressure?.diastolic : null);

  const vitalItems = [
    {
      label: 'Blood Pressure',
      value: bpSys && bpDia ? `${bpSys}/${bpDia}` : null,
      unit: 'mmHg',
      icon: Heart,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Pulse',
      value: vitals.pulse_rate ?? vitals.pulse ?? vitals.heart_rate,
      unit: 'bpm',
      icon: Activity,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
    {
      label: 'Temperature',
      value: vitals.temperature,
      unit: '°C',
      icon: Heart,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'SpO₂',
      value: vitals.oxygen_saturation,
      unit: '%',
      icon: Heart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Resp Rate',
      value: vitals.respiratory_rate,
      unit: '/min',
      icon: Heart,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  if (detailed) {
    vitalItems.push(
      {
        label: 'Weight',
        value: vitals.weight,
        unit: 'kg',
        icon: Heart,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
      {
        label: 'Height',
        value: vitals.height,
        unit: 'cm',
        icon: Heart,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
      },
      {
        label: 'BMI',
        value: vitals.bmi,
        unit: '',
        icon: Heart,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        label: 'Blood Glucose',
        value: vitals.blood_glucose,
        unit: 'mg/dL',
        icon: Heart,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Pain Level',
        value: vitals.pain_level,
        unit: '/10',
        icon: Heart,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
      },
    );
  }

  const hasVitals = vitalItems.some((v) => v.value != null && v.value !== '');

  if (!hasVitals) {
    // Show nurse/recorder info if available, even when no measurements
    const nurse = vitals.nurse_name || vitals.recorded_by_name;
    return (
      <div className="text-sm text-gray-500 italic">
        <p>No vital sign measurements recorded</p>
        {nurse && <p className="mt-1 text-xs">Recorded by: {nurse}</p>}
        {vitals.notes && <p className="mt-1 text-xs text-gray-600">Notes: {vitals.notes}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {vitalItems
          .filter((v) => v.value != null && v.value !== '')
          .map((vital, idx) => (
            <div key={idx} className={`${vital.bg} p-2 rounded-lg text-center`}>
              <p className="text-xs text-gray-500">{vital.label}</p>
              <p className={`text-lg font-bold ${vital.color}`}>
                {vital.value}
                <span className="text-xs font-normal text-gray-500 ml-0.5">
                  {vital.unit}
                </span>
              </p>
            </div>
          ))}
      </div>
      {detailed && vitals.notes && (
        <p className="mt-2 text-xs text-gray-600">
          <span className="font-medium">Notes:</span> {vitals.notes}
        </p>
      )}
      {detailed && (vitals.nurse_name || vitals.recorded_by_name) && (
        <p className="mt-1 text-xs text-gray-400">
          Recorded by: {vitals.nurse_name || vitals.recorded_by_name}
        </p>
      )}
    </div>
  );
}
