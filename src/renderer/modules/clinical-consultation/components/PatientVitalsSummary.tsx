import React, { useState } from 'react';
import {
  Activity,
  Heart,
  Thermometer,
  Droplet,
  StickyNote,
  ClipboardList,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  usePatientLatestVitals,
  useNursingCareRecords,
} from '../../nursing/hooks/useNursing';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import PatientVitalsChart from '../../../components/charts/PatientVitalsChart';

interface PatientVitalsSummaryProps {
  patientId?: string | null;
  className?: string;
  hideNursingNotes?: boolean;
  compact?: boolean; // For sidebar use - always visible vitals in compact format
}

const formatNumber = (value?: number | null, unit?: string) => {
  if (value === undefined || value === null) {
    return '--';
  }
  return unit ? `${value} ${unit}` : `${value}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return value;
  }
};

export function PatientVitalsSummary({
  patientId,
  className,
  hideNursingNotes = false,
  compact = false,
}: PatientVitalsSummaryProps) {
  const { isNightMode } = useTimeTheme();
  const [vitalsExpanded, setVitalsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const { data: vitals, isLoading } = usePatientLatestVitals(patientId ?? null);
  const notesFilters = React.useMemo(
    () => ({
      page: 1,
      limit: 3,
      patient_id: patientId || '__invalid__',
    }),
    [patientId],
  );
  const { data: nursingRecords, isLoading: notesLoading } =
    useNursingCareRecords(notesFilters);
  const nursingNotes = React.useMemo(
    () =>
      (nursingRecords?.data || [])
        .filter((record) => Boolean(record.notes?.trim()))
        .slice(0, 3),
    [nursingRecords],
  );

  if (!patientId) return null;

  const bloodPressure = vitals?.blood_pressure
    ? typeof vitals.blood_pressure === 'object'
      ? `${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic} mmHg`
      : `${vitals.blood_pressure} mmHg`
    : vitals?.blood_pressure_systolic && vitals?.blood_pressure_diastolic
      ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`
      : '--';

  const recordedAt = formatDateTime(vitals?.date_recorded);
  const additionalNotes =
    vitals?.notes ??
    (vitals as { additional_notes?: string | null } | undefined)
      ?.additional_notes ??
    null;

  // Compact mode for sidebar - always visible, no collapsible sections
  if (compact) {
    return (
      <div className={`space-y-2 ${className || ''}`.trim()}>
        {/* Recorded Time */}
        {recordedAt && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-blue-50 border border-blue-100 px-2 py-1.5 rounded-md">
            <Activity className="h-3 w-3 text-blue-500 flex-shrink-0" />
            <span className="font-medium">Taken: {recordedAt}</span>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-gray-500">Loading vitals...</p>
        ) : !vitals ? (
          <p className="text-xs text-gray-400">No vitals recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {/* Vitals Grid - Stacked for narrow widths */}
            <div className="grid grid-cols-2 gap-1">
              {/* Temperature */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
                  <Thermometer className="h-3 w-3 flex-shrink-0" />
                  <span>Temp</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatNumber(vitals.temperature, '°C')}
                </p>
              </div>

              {/* Pulse */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                  <Heart className="h-3 w-3 flex-shrink-0" />
                  <span>Pulse</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatNumber(vitals.pulse, 'bpm')}
                </p>
              </div>

              {/* Blood Pressure */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-purple-600 font-semibold">
                  <Droplet className="h-3 w-3 flex-shrink-0" />
                  <span>BP</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {bloodPressure.replace(' mmHg', '')}
                </p>
              </div>

              {/* Respiratory Rate */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
                  <Activity className="h-3 w-3 flex-shrink-0" />
                  <span>Resp</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatNumber(vitals.respiratory_rate, 'cpm')}
                </p>
              </div>

              {/* O2 Saturation */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                  <Activity className="h-3 w-3 flex-shrink-0" />
                  <span>SpO2</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatNumber(vitals.oxygen_saturation, '%')}
                </p>
              </div>

              {/* Weight */}
              <div className="bg-white border border-gray-200 rounded p-1.5 shadow-sm">
                <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                  <Activity className="h-3 w-3 flex-shrink-0" />
                  <span>Weight</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {formatNumber(vitals.weight, 'kg')}
                </p>
              </div>
            </div>

            {/* BMI if available */}
            {vitals.bmi && (
              <div className="bg-indigo-50 border border-indigo-200 rounded p-1.5 text-center shadow-sm">
                <span className="text-xs text-indigo-600 font-semibold">
                  BMI
                </span>
                <p className="text-sm font-bold text-indigo-700">
                  {vitals.bmi}
                </p>
              </div>
            )}

            {/* Additional Notes */}
            {additionalNotes && (
              <div className="bg-amber-100 border-2 border-amber-300 rounded p-2.5 mt-1 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold mb-1.5">
                  <StickyNote className="h-3.5 w-3.5 flex-shrink-0" />
                  Nurse Notes
                </div>
                <p className="text-sm font-semibold text-amber-950 leading-relaxed break-words">
                  {additionalNotes}
                </p>
              </div>
            )}

            {/* Recorded By */}
            {vitals?.nurse && (
              <p className="text-xs text-gray-500 font-medium">
                By: {vitals.nurse.first_name} {vitals.nurse.last_name}
              </p>
            )}

            {vitals?.is_critical && (
              <div className="bg-red-100 border border-red-300 rounded px-2 py-1.5 text-center shadow-sm">
                <span className="text-xs font-bold text-red-700">
                  ⚠ CRITICAL
                </span>
              </div>
            )}
          </div>
        )}

        {/* Vitals Trend Chart */}
        {patientId && (
          <PatientVitalsChart patientId={patientId} compact defaultCollapsed timeframe="3m" />
        )}

        {/* Nursing Notes in Compact Mode */}
        {!hideNursingNotes && nursingNotes.length > 0 && (
          <div className="border-t-2 border-blue-200 pt-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-blue-800 font-bold mb-2">
              <ClipboardList className="h-3.5 w-3.5" />
              Nursing Notes ({nursingNotes.length})
            </div>
            <div className="space-y-2">
              {nursingNotes.map((note) => (
                <div
                  key={note.care_id}
                  className="bg-blue-100 border-2 border-blue-300 rounded p-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs text-blue-700 mb-1.5">
                    <span className="font-bold">{note.care_type}</span>
                    <span className="text-blue-600 font-medium">
                      {
                        formatDateTime(
                          note.updated_at || note.created_at,
                        )?.split(',')[0]
                      }
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-blue-950 leading-relaxed break-words line-clamp-4">
                    {note.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-4 space-y-3 ${className || ''}`.trim()}>
      {/* Vitals Section - Collapsible */}
      <div
        className={`rounded-lg border shadow-sm overflow-hidden ${isNightMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
      >
        <button
          type="button"
          onClick={() => setVitalsExpanded(!vitalsExpanded)}
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isNightMode ? 'bg-gradient-to-r from-emerald-900/30 to-slate-800 hover:from-emerald-900/50' : 'bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100'}`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-left">
              <span
                className={`text-sm font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                Latest Vitals
              </span>
              {recordedAt && (
                <span
                  className={`ml-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                >
                  ({recordedAt})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vitals && !isLoading && (
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {vitals.temperature ? `${vitals.temperature}°C` : '--'} |{' '}
                {bloodPressure.split(' ')[0]}
              </span>
            )}
            <div
              className={`p-1 rounded-full transition-colors ${vitalsExpanded ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
            >
              {vitalsExpanded ? (
                <Minus className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </div>
          </div>
        </button>

        {/* Vitals Content */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            vitalsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className={`px-4 pb-4 border-t ${isNightMode ? 'border-slate-700' : 'border-gray-100'}`}
          >
            {isLoading ? (
              <p
                className={`mt-4 text-sm ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
              >
                Loading vitals...
              </p>
            ) : !vitals ? (
              <p
                className={`mt-4 text-sm ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
              >
                No vitals recorded by nursing yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Thermometer className="h-3.5 w-3.5" />
                    Temperature
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {formatNumber(vitals.temperature, '°C')}
                  </p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    Pulse
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {formatNumber(vitals.pulse, 'bpm')}
                  </p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Droplet className="h-3.5 w-3.5" />
                    Blood Pressure
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {bloodPressure}
                  </p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Respiratory Rate
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {formatNumber(vitals.respiratory_rate, 'cpm')}
                  </p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Oxygen Saturation
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {formatNumber(vitals.oxygen_saturation, '%')}
                  </p>
                </div>

                <div
                  className={`rounded-lg border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Weight / BMI
                  </div>
                  <p
                    className={`mt-1 text-base font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {formatNumber(vitals.weight, 'kg')}
                    {vitals.bmi ? ` - BMI ${vitals.bmi}` : ''}
                  </p>
                </div>
              </div>
            )}

            {additionalNotes && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-800">
                  <StickyNote className="h-3.5 w-3.5" /> Nurse Additional Notes
                </div>
                <p className="mt-2 text-sm text-yellow-900 whitespace-pre-wrap">
                  {additionalNotes}
                </p>
              </div>
            )}

            {vitals?.nurse && (
              <p className="mt-2 text-xs text-gray-500">
                Recorded by {vitals.nurse.first_name} {vitals.nurse.last_name}
                {vitals.is_critical ? ' - Marked as critical' : ''}
              </p>
            )}
            {!vitals?.nurse && vitals?.is_critical && (
              <p className="mt-2 text-xs text-red-600">
                Marked as critical by nursing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vitals Trend Chart — Full Mode */}
      {patientId && (
        <PatientVitalsChart patientId={patientId} defaultCollapsed timeframe="6m" />
      )}

      {/* Nursing Notes Section - Collapsible (conditionally shown) */}
      {!hideNursingNotes && (
        <div
          className={`rounded-lg border shadow-sm overflow-hidden ${isNightMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <button
            type="button"
            onClick={() => setNotesExpanded(!notesExpanded)}
            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isNightMode ? 'bg-gradient-to-r from-blue-900/30 to-slate-800 hover:from-blue-900/50' : 'bg-gradient-to-r from-blue-50 to-white hover:from-blue-100'}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${isNightMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}
              >
                <ClipboardList className="h-4 w-4 text-blue-600" />
              </div>
              <span
                className={`text-sm font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                Nursing Notes
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!notesLoading && nursingNotes.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {nursingNotes.length} note
                  {nursingNotes.length !== 1 ? 's' : ''}
                </span>
              )}
              <div
                className={`p-1 rounded-full transition-colors ${notesExpanded ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'}`}
              >
                {notesExpanded ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </div>
            </div>
          </button>

          {/* Notes Content */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              notesExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div
              className={`px-4 pb-4 border-t ${isNightMode ? 'border-slate-700' : 'border-gray-100'}`}
            >
              {notesLoading ? (
                <p
                  className={`mt-4 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                >
                  Loading nursing notes...
                </p>
              ) : nursingNotes.length === 0 ? (
                <p
                  className={`mt-4 text-xs ${isNightMode ? 'text-slate-500' : 'text-gray-400'}`}
                >
                  No nursing notes available for this patient.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {nursingNotes.map((note) => (
                    <li
                      key={note.care_id}
                      className={`rounded-md border p-3 ${isNightMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div
                        className={`flex items-center justify-between text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium px-2 py-0.5 rounded border ${isNightMode ? 'text-slate-300 bg-slate-600 border-slate-500' : 'text-gray-700 bg-white border-gray-200'}`}
                          >
                            {note.care_type}
                          </span>
                          {note.nurse && (
                            <span
                              className={`italic ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}
                            >
                              by {note.nurse.first_name} {note.nurse.last_name}
                            </span>
                          )}
                        </div>
                        <span>
                          {formatDateTime(note.updated_at || note.created_at) ||
                            'Unknown date'}
                        </span>
                      </div>
                      <p
                        className={`mt-2 text-sm whitespace-pre-wrap ${isNightMode ? 'text-slate-200' : 'text-gray-800'}`}
                      >
                        {note.notes}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientVitalsSummary;
