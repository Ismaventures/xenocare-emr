/**
 * OverviewPanel  –  Timeline-based encounter overview
 *
 * Presents the encounter as a chronological vertical timeline with rich
 * content cards for each clinical event: registration, vitals, consultation,
 * prescriptions, labs, imaging, referrals, and discharge.
 */

import React, { useMemo } from 'react';
import {
  Pill,
  FlaskConical,
  Scan,
  Syringe,
  Activity,
  CheckCircle2,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  ArrowUpRight,
  Clock,
  Stethoscope,
  User,
} from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { formatDateTime, formatDate } from '../shared/utils';
import PatientVitalsChart from '../../../../../../components/charts/PatientVitalsChart';

interface OverviewPanelProps {
  encounter: EncounterDetail;
}

/* ───────── helpers ───────── */

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  completed: { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  admitted:  { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status?.toLowerCase()] ?? statusConfig.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

/* ───────── timeline event types ───────── */

interface TimelineSection {
  id: string;
  icon: React.ReactNode;
  iconBorder: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  content: React.ReactNode;
}

function TimelineNode({ section, isLast }: { section: TimelineSection; isLast: boolean }) {
  return (
    <div className="relative pl-16 group">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[23px] top-12 bottom-0 w-px bg-gray-200" />
      )}

      {/* Icon circle */}
      <div
        className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm bg-white ${section.iconBorder}`}
      >
        {section.icon}
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200 mb-8">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">{section.title}</h4>
            {section.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{section.subtitle}</p>
            )}
          </div>
          {section.timestamp && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              <Clock size={12} />
              {section.timestamp}
            </div>
          )}
        </div>
        {section.content}
      </div>
    </div>
  );
}

/* ───────── main component ───────── */

export function OverviewPanel({ encounter }: OverviewPanelProps) {
  const prescriptions = encounter.prescriptions ?? [];
  const labResults = encounter.lab_results ?? [];
  const labRequests = encounter.lab_requests ?? [];
  const imagingResults = encounter.imaging_results ?? [];
  const radiologyRequests = encounter.radiology_requests ?? [];
  const referrals = encounter.referrals ?? [];
  const procedures = encounter.procedure_results ?? [];

  const sections = useMemo(() => {
    const items: TimelineSection[] = [];

    // ─── 1. Encounter Start / Registration ───
    items.push({
      id: 'registration',
      icon: <User className="text-blue-600" size={18} />,
      iconBorder: 'border-blue-200',
      title: 'Encounter Started',
      subtitle: `${encounter.visit_type} — ${encounter.clinic_name || 'General'}`,
      timestamp: formatDateTime(encounter.encounter_date),
      content: (
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={encounter.status} />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
              {encounter.doctor?.name?.charAt(0) || 'D'}
            </div>
            <span className="text-xs font-semibold text-gray-700">
              {encounter.doctor?.name || 'Unassigned'}
            </span>
          </div>
          {encounter.encounter_number && (
            <span className="text-xs font-mono text-gray-400">
              #{encounter.encounter_number}
            </span>
          )}
        </div>
      ),
    });

    // ─── 2. Chief Complaint & Clinical Assessment ───
    if (encounter.chief_complaint || encounter.consultation) {
      items.push({
        id: 'assessment',
        icon: <Stethoscope className="text-emerald-600" size={18} />,
        iconBorder: 'border-emerald-200',
        title: 'Clinical Assessment',
        timestamp: encounter.consultation?.created_at
          ? formatDateTime(encounter.consultation.created_at)
          : undefined,
        content: (
          <div className="space-y-3">
            {encounter.chief_complaint && (
              <div className="relative pl-4 border-l-2 border-emerald-400">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Chief Complaint</p>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  &ldquo;{encounter.chief_complaint}&rdquo;
                </p>
              </div>
            )}

            {encounter.diagnoses && encounter.diagnoses.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Diagnosis</p>
                <div className="flex flex-wrap gap-2">
                  {encounter.diagnoses.map((diag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold"
                    >
                      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                      {diag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {encounter.consultation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Findings</p>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {encounter.consultation.clinical_notes ||
                      encounter.consultation.assessment ||
                      'Assessment recorded in clinical notes.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Plan</p>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {encounter.consultation.plan ||
                      encounter.consultation.treatment_plan ||
                      'Treatment pathway in progress.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ),
      });
    }

    // ─── 3. Vital Signs ───
    const displayVitals = encounter.vitals || (encounter.all_vitals && encounter.all_vitals.length > 0 ? encounter.all_vitals[0] : null);
    if (displayVitals) {
      // Normalize BP from either nested or flat shape
      const bpDisplay = displayVitals.blood_pressure
        ? typeof displayVitals.blood_pressure === 'object'
          ? `${displayVitals.blood_pressure.systolic}/${displayVitals.blood_pressure.diastolic}`
          : String(displayVitals.blood_pressure)
        : (displayVitals as any).blood_pressure_systolic && (displayVitals as any).blood_pressure_diastolic
          ? `${(displayVitals as any).blood_pressure_systolic}/${(displayVitals as any).blood_pressure_diastolic}`
          : '--/--';
      const pulseVal = (displayVitals as any).heart_rate ?? (displayVitals as any).pulse_rate ?? '--';
      items.push({
        id: 'vitals',
        icon: <Activity className="text-rose-600" size={18} />,
        iconBorder: 'border-rose-200',
        title: 'Vital Signs Recorded',
        timestamp: formatDateTime(displayVitals.recorded_at || encounter.encounter_date),
        content: (
          <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <VitalItem
              icon={<Activity size={14} className="text-emerald-600" />}
              label="BP"
              value={bpDisplay}
              unit="mmHg"
              bgColor="bg-emerald-50"
            />
            <VitalItem
              icon={<Heart size={14} className="text-rose-500" />}
              label="HR"
              value={String(pulseVal)}
              unit="BPM"
              bgColor="bg-rose-50"
            />
            <VitalItem
              icon={<Thermometer size={14} className="text-blue-500" />}
              label="Temp"
              value={String(displayVitals.temperature ?? '--')}
              unit="°C"
              bgColor="bg-blue-50"
            />
            <VitalItem
              icon={<Wind size={14} className="text-cyan-500" />}
              label="RR"
              value={String((displayVitals as any).respiratory_rate ?? '--')}
              unit="/min"
              bgColor="bg-cyan-50"
            />
            <VitalItem
              icon={<Droplets size={14} className="text-indigo-500" />}
              label="SpO₂"
              value={String((displayVitals as any).oxygen_saturation ?? (displayVitals as any).spo2 ?? '--')}
              unit="%"
              bgColor="bg-indigo-50"
            />
            <VitalItem
              icon={<Activity size={14} className="text-amber-500" />}
              label="Weight"
              value={String((displayVitals as any).weight ?? '--')}
              unit="kg"
              bgColor="bg-amber-50"
            />
            <VitalItem
              icon={<Activity size={14} className="text-violet-500" />}
              label="Height"
              value={String((displayVitals as any).height ?? '--')}
              unit="cm"
              bgColor="bg-violet-50"
            />
            <VitalItem
              icon={<Activity size={14} className="text-teal-500" />}
              label="BMI"
              value={
                (displayVitals as any).bmi
                  ? String(Number((displayVitals as any).bmi).toFixed(1))
                  : (displayVitals as any).weight && (displayVitals as any).height
                    ? (
                        (displayVitals as any).weight /
                        (((displayVitals as any).height / 100) ** 2)
                      ).toFixed(1)
                    : '--'
              }
              unit="kg/m²"
              bgColor="bg-teal-50"
            />
          </div>
          {/* Vitals Trend Chart */}
          <div className="mt-3">
            <PatientVitalsChart patientId={encounter.patient_id} compact defaultCollapsed />
          </div>
          </div>
        ),
      });
    }

    // ─── 4. Prescriptions ───
    if (prescriptions.length > 0) {
      items.push({
        id: 'prescriptions',
        icon: <Pill className="text-green-600" size={18} />,
        iconBorder: 'border-green-200',
        title: 'Medications Prescribed',
        subtitle: `${prescriptions.length} medication${prescriptions.length > 1 ? 's' : ''}`,
        content: (
          <div className="space-y-2">
            {prescriptions.slice(0, 5).map((rx, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/60 border border-green-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{rx.drug_name}</p>
                  <p className="text-xs text-gray-500">
                    {rx.dosage} {rx.route ? `| ${rx.route}` : ''} {rx.frequency ? `| ${rx.frequency}` : ''}
                  </p>
                </div>
                {rx.dispensed ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    Dispensed
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    Pending
                  </span>
                )}
              </div>
            ))}
            {prescriptions.length > 5 && (
              <p className="text-xs text-gray-400 text-center">+{prescriptions.length - 5} more</p>
            )}
          </div>
        ),
      });
    }

    // ─── 5. Lab Results ───
    const allLabs = labResults.length > 0 ? labResults : labRequests;
    if (allLabs.length > 0) {
      const completedCount = labResults.filter(
        (l) => l.status === 'Completed' || l.status === 'Result_Ready',
      ).length;
      const pendingCount = allLabs.length - completedCount;

      items.push({
        id: 'labs',
        icon: <FlaskConical className="text-cyan-600" size={18} />,
        iconBorder: 'border-cyan-200',
        title: 'Laboratory Tests',
        subtitle: `${completedCount} completed, ${pendingCount} pending`,
        content: (
          <div className="space-y-2">
            {(labResults.length > 0 ? labResults : (labRequests as any[])).slice(0, 5).map((lab: any, i: number) => {
              const isCritical = lab.is_critical;
              const isAbnormal = lab.is_abnormal;
              return (
                <div
                  key={lab.request_id || lab.id || i}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    isCritical
                      ? 'bg-red-50 border-red-200'
                      : isAbnormal
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-cyan-50/60 border-cyan-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {lab.test_name || 'Laboratory Test'}
                      </p>
                      {isCritical && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lab.result_date
                        ? formatDate(lab.result_date)
                        : lab.requested_date || lab.requested_at
                          ? formatDate(lab.requested_date || lab.requested_at)
                          : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lab.result_value ? (
                      <div className="flex items-center gap-1.5">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">{lab.result_value}</p>
                          {lab.result_unit && <p className="text-[10px] text-gray-400">{lab.result_unit}</p>}
                        </div>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        lab.status === 'Completed' || lab.status === 'Result_Ready'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {lab.status || 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {allLabs.length > 5 && (
              <p className="text-xs text-gray-400 text-center">+{allLabs.length - 5} more</p>
            )}
          </div>
        ),
      });
    }

    // ─── 6. Imaging & Radiology ───
    const allImaging = [...imagingResults, ...radiologyRequests];
    if (allImaging.length > 0) {
      items.push({
        id: 'imaging',
        icon: <Scan className="text-purple-600" size={18} />,
        iconBorder: 'border-purple-200',
        title: 'Imaging & Radiology',
        subtitle: `${allImaging.length} study${allImaging.length > 1 ? 'ies' : 'y'}`,
        content: (
          <div className="space-y-2">
            {allImaging.slice(0, 4).map((img: any, i) => (
              <div key={img.request_id || img.id || i} className="flex items-center gap-3 p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Scan size={14} className="text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {img.exam_name || img.study_type || img.modality || img.imaging_type || 'Imaging Study'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {img.body_part || img.clinical_indication || ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  img.status?.toLowerCase() === 'completed'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {img.status || 'Pending'}
                </span>
              </div>
            ))}
            {allImaging.length > 4 && (
              <p className="text-xs text-gray-400 text-center">+{allImaging.length - 4} more</p>
            )}
          </div>
        ),
      });
    }

    // ─── 7. Procedures ───
    if (procedures.length > 0) {
      items.push({
        id: 'procedures',
        icon: <Syringe className="text-amber-600" size={18} />,
        iconBorder: 'border-amber-200',
        title: 'Procedures',
        subtitle: `${procedures.length} procedure${procedures.length > 1 ? 's' : ''}`,
        content: (
          <div className="space-y-2">
            {procedures.slice(0, 4).map((proc, i) => (
              <div key={proc.id || i} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{proc.procedure_name}</p>
                  {proc.findings && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Findings: {proc.findings}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  proc.status?.toLowerCase() === 'completed'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {proc.status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        ),
      });
    }

    // ─── 8. Referrals ───
    if (referrals.length > 0) {
      items.push({
        id: 'referrals',
        icon: <ArrowUpRight className="text-indigo-600" size={18} />,
        iconBorder: 'border-indigo-200',
        title: 'Specialty Referrals',
        subtitle: `${referrals.length} referral${referrals.length > 1 ? 's' : ''}`,
        content: (
          <div className="space-y-2.5">
            {referrals.slice(0, 4).map((ref, i) => {
              const refStatus = ((ref as any).status || 'Pending').toLowerCase();
              const dotColor = refStatus === 'completed' ? 'bg-emerald-500' : refStatus === 'scheduled' ? 'bg-amber-500' : 'bg-blue-500';
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {(ref as any).specialty || (ref as any).referral_type || 'Specialty Consultation'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {(ref as any).reason || (ref as any).clinical_note || 'Clinical referral'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ),
      });
    }

    // ─── 9. Encounter Status / Discharge (end marker) ───
    const isCompleted = encounter.status?.toLowerCase() === 'completed';
    items.push({
      id: 'status',
      icon: isCompleted
        ? <CheckCircle2 className="text-gray-500" size={18} />
        : <Clock className="text-blue-600" size={18} />,
      iconBorder: isCompleted ? 'border-gray-200' : 'border-blue-200',
      title: isCompleted ? 'Encounter Completed' : 'Encounter In Progress',
      subtitle: isCompleted
        ? 'All orders fulfilled — discharge complete'
        : 'Pending completion of clinical orders',
      content: (
        <div className="flex items-center gap-3">
          <StatusBadge status={encounter.status} />
          {encounter.visit_type && (
            <span className="text-xs text-gray-400">
              {encounter.visit_type}
            </span>
          )}
        </div>
      ),
    });

    return items;
  }, [encounter, prescriptions, labResults, labRequests, imagingResults, radiologyRequests, procedures, referrals]);

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Timeline header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Encounter Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(encounter.encounter_date)} &mdash; {encounter.visit_type}
          </p>
        </div>
        <StatusBadge status={encounter.status} />
      </div>

      {/* Timeline */}
      <div className="relative">
        {sections.map((section, idx) => (
          <TimelineNode
            key={section.id}
            section={section}
            isLast={idx === sections.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Small sub-component for vitals grid ── */
function VitalItem({
  icon,
  label,
  value,
  unit,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-2.5 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold text-gray-900">{value}</span>
        <span className="text-[10px] text-gray-400">{unit}</span>
      </div>
    </div>
  );
}
