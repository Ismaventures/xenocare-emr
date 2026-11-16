import React from 'react';
import {
  HeartPulse,
  Brain,
  AlertCircle,
  Thermometer,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAeTriage } from '../../hooks/useAe';
import { triageLevelLabel, acuityColorToClasses } from '../../api/ae.types';

export default function TriageSummary({
  encounterId,
}: {
  encounterId: string;
}) {
  const { data: triage, isLoading } = useAeTriage(encounterId);

  if (isLoading)
    return (
      <div className="animate-pulse flex space-x-4 p-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    );

  if (!triage)
    return (
      <div className="p-4 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        No triage record found.
      </div>
    );

  // Render a mini vitals panel
  const vitals = triage.ae_vitals;
  function VitalsItem({ label, value, unit, icon: Icon }: any) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="font-bold text-slate-800">
          {value || '-'}{' '}
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full space-y-4">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-blue-600" />
          Triage Assessment
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
          {triage.triage_time
            ? format(new Date(triage.triage_time), 'PP p')
            : 'Pending'}
        </span>
      </div>

      <div className="p-5 space-y-6">
        {/* Acuity Banner */}
        <div
          className={`p-4 rounded-xl border-2 flex items-center gap-4 ${acuityColorToClasses(triage.acuity_color)}`}
        >
          <div className="flex-shrink-0 bg-white/50 p-2 rounded-lg">
            <AlertCircle size={24} className="opacity-80" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight uppercase">
              ESI Level {triage.triage_level} — {triage.acuity_color}
            </h4>
            <p className="text-sm font-medium opacity-90">
              {triageLevelLabel(triage.triage_level as any)}
            </p>
          </div>
        </div>

        {/* Vitals Grid */}
        {vitals ? (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Activity size={14} /> Recorded Vitals
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <VitalsItem
                label="BP"
                value={
                  vitals.blood_pressure_systolic &&
                  vitals.blood_pressure_diastolic
                    ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`
                    : null
                }
                unit="mmHg"
                icon={HeartPulse}
              />
              <VitalsItem
                label="Pulse"
                value={vitals.pulse_rate}
                unit="bpm"
                icon={Activity}
              />
              <VitalsItem
                label="Temp"
                value={vitals.temperature}
                unit="°C"
                icon={Thermometer}
              />
              <VitalsItem
                label="Resp"
                value={vitals.respiratory_rate}
                unit="cpm"
                icon={Activity}
              />
              <VitalsItem
                label="SpO2"
                value={vitals.oxygen_saturation}
                unit="%"
                icon={Activity}
              />
              <VitalsItem
                label="GCS"
                value={vitals.gcs_score}
                unit=""
                icon={Brain}
              />
              {vitals.blood_sugar && (
                <VitalsItem
                  label="RBS"
                  value={vitals.blood_sugar}
                  unit="mmol/L"
                  icon={Activity}
                />
              )}
              {vitals.pain_score && (
                <VitalsItem
                  label="Pain"
                  value={`${vitals.pain_score}/10`}
                  unit=""
                  icon={AlertCircle}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">
            No vitals were recorded during triage.
          </p>
        )}

        {/* Selected Red Flags */}
        {triage.red_flags && triage.red_flags.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" /> Clinical Red
              Flags
            </h4>
            <div className="flex flex-wrap gap-2">
              {triage.red_flags.map((flag: string) => (
                <span
                  key={flag}
                  className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold uppercase rounded border border-red-100"
                >
                  {flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
