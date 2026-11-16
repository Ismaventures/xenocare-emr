/**
 * Dental Exam View Modal
 * Professional medical record view for dental examination details
 * Encounter-centric design with clean, readable layout
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar,
  User,
  FileText,
  Stethoscope,
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle,
  Maximize2,
  Minimize2,
  Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import type { DentalExamDTO } from '../types/dental.types';
import { extractPrintableFields } from '../../../utils/printFieldUtils';

interface DentalExamViewModalProps {
  exam: DentalExamDTO;
  isOpen: boolean;
  onClose: () => void;
}

export default function DentalExamViewModal({
  exam,
  isOpen,
  onClose,
}: DentalExamViewModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const patientName = exam.patient
    ? `${exam.patient.first_name} ${exam.patient.last_name}`
    : 'Unknown Patient';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'PPP p');
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const allStoredExamFields = useMemo(
    () =>
      extractPrintableFields(
        (exam as unknown as Record<string, unknown>) || null,
        {
          excludeKeys: ['patient', 'provider', 'encounter'],
          maxDepth: 3,
        },
      ),
    [exam],
  );

  function Section({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Icon className="h-5 w-5 text-emerald-600" />
          </div>
          <h4 className="font-semibold text-gray-900 text-lg">{title}</h4>
        </div>
        <div className="p-5">{children}</div>
      </div>
    );
  }

  function Field({
    label,
    value,
    className = '',
  }: {
    label: string;
    value?: string | null;
    className?: string;
  }) {
    return (
      <div className={`${className}`}>
        <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
        <dd className="text-base text-gray-900 leading-relaxed">
          {value || '—'}
        </dd>
      </div>
    );
  }

  function NotesBlock({
    title,
    content,
  }: {
    title: string;
    content?: string | null;
  }) {
    if (!content) return null;
    return (
      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-emerald-500">
        <h5 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-2">
          {title}
        </h5>
        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-200 print:static print:bg-white print:p-0">
      <div
        className={`bg-gray-50 rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out print:rounded-none print:shadow-none print:w-full print:max-w-none print:max-h-none ${
          isMaximized
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'max-w-5xl w-full max-h-[92vh]'
        }`}
      >
        {/* Header - Green theme matching Encounter module */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-3">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Dental Examination Record
              </h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                {formatDate(exam.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="text-white/80 hover:text-white transition-colors p-2.5 hover:bg-white/10 rounded-xl"
              title="Print"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-white/80 hover:text-white transition-colors p-2.5 hover:bg-white/10 rounded-xl"
              title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isMaximized ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2.5 hover:bg-white/10 rounded-xl"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible">
          {/* Patient Info Banner */}
          <div className="bg-white border border-emerald-200 rounded-xl p-5 flex items-center gap-5 shadow-sm">
            <div className="bg-emerald-100 rounded-full p-4">
              <User className="h-7 w-7 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-xl">
                {patientName}
              </h3>
              {exam.patient?.emr_number && (
                <p className="text-emerald-800 text-base font-semibold mt-1">
                  EMR: {exam.patient.emr_number}
                </p>
              )}
              <p className="text-emerald-600 text-sm mt-1">
                Patient ID: {exam.patient_id}
              </p>
              {exam.encounter_id && (
                <p className="text-emerald-500 text-sm mt-1">
                  Encounter: {exam.encounter_id.slice(0, 8)}...
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  exam.status === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : exam.status === 'In_Progress'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {exam.status?.replace('_', ' ') || 'Pending'}
              </span>
            </div>
          </div>

          {/* Chief Complaint & History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Chief Complaint" icon={AlertCircle}>
              <div className="space-y-4">
                <Field
                  label="Presenting Complaint"
                  value={exam.chief_complaint}
                />
                <Field label="Duration" value={exam.complaint_duration} />
                {exam.pain_level !== undefined && (
                  <div className="flex items-center gap-4">
                    <Field
                      label="Pain Level"
                      value={`${exam.pain_level}/10`}
                      className="flex-1"
                    />
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          exam.pain_level <= 3
                            ? 'bg-green-500'
                            : exam.pain_level <= 6
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${(exam.pain_level / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <Field label="Pain Character" value={exam.pain_character} />
              </div>
            </Section>

            <Section title="Medical & Dental History" icon={ClipboardList}>
              <div className="space-y-4">
                <Field label="Medical History" value={exam.medical_history} />
                <Field label="Allergies" value={exam.allergies} />
                <Field label="Dental History" value={exam.dental_history} />
                <Field
                  label="Current Medications"
                  value={exam.current_medications}
                />
              </div>
            </Section>
          </div>

          {/* Oral Examination - Full Width */}
          <Section title="Oral Examination Findings" icon={Stethoscope}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NotesBlock
                title="Extra-Oral Findings"
                content={exam.extraoral_findings}
              />
              <NotesBlock
                title="Intra-Oral Findings"
                content={exam.intraoral_findings}
              />
              <NotesBlock
                title="Soft Tissue Examination"
                content={exam.soft_tissue_exam}
              />
              <NotesBlock
                title="Hard Tissue Examination"
                content={exam.hard_tissue_exam}
              />
              <NotesBlock
                title="TMJ Assessment"
                content={exam.tmj_assessment}
              />
              <NotesBlock
                title="Occlusion Notes"
                content={exam.occlusion_notes}
              />
            </div>
          </Section>

          {/* Periodontal Assessment */}
          <Section title="Periodontal Assessment" icon={FileText}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <span className="text-sm text-gray-500 block mb-1">
                  Gingival Status
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.gingival_status || '—'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <span className="text-sm text-gray-500 block mb-1">
                  Bleeding on Probing
                </span>
                <span
                  className={`text-lg font-semibold ${exam.bleeding_on_probing ? 'text-red-600' : 'text-green-600'}`}
                >
                  {exam.bleeding_on_probing ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <span className="text-sm text-gray-500 block mb-1">
                  Plaque Score
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.plaque_score ?? '—'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <span className="text-sm text-gray-500 block mb-1">
                  Calculus
                </span>
                <span
                  className={`text-lg font-semibold ${exam.calculus_present ? 'text-orange-600' : 'text-green-600'}`}
                >
                  {exam.calculus_present ? 'Present' : 'Absent'}
                </span>
              </div>
            </div>
            <NotesBlock
              title="Pocket Depth Notes"
              content={exam.pocket_depth_notes}
            />
          </Section>

          {/* Diagnosis & Treatment Plan */}
          <Section title="Diagnosis & Treatment Plan" icon={CheckCircle}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NotesBlock
                  title="Provisional Diagnosis"
                  content={exam.provisional_diagnosis}
                />
                <NotesBlock
                  title="Final Diagnosis"
                  content={exam.final_diagnosis}
                />
              </div>
              <NotesBlock
                title="Treatment Plan"
                content={exam.treatment_plan}
              />
              {exam.urgency && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    Urgency:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      exam.urgency === 'Emergency'
                        ? 'bg-red-100 text-red-800'
                        : exam.urgency === 'Urgent'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {exam.urgency}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Radiographic Findings */}
          {exam.radiograph_taken && (
            <Section title="Radiographic Findings" icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Radiograph Type" value={exam.radiograph_type} />
                <NotesBlock
                  title="Findings"
                  content={exam.radiograph_findings}
                />
              </div>
            </Section>
          )}

          {/* Follow-up */}
          {(exam.follow_up_required ||
            exam.follow_up_date ||
            exam.follow_up_notes) && (
            <Section title="Follow-up" icon={Calendar}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  label="Follow-up Required"
                  value={exam.follow_up_required ? 'Yes' : 'No'}
                />
                <Field
                  label="Follow-up Date"
                  value={
                    exam.follow_up_date
                      ? format(new Date(exam.follow_up_date), 'PPP')
                      : undefined
                  }
                />
              </div>
              <div className="mt-4">
                <NotesBlock
                  title="Follow-up Notes"
                  content={exam.follow_up_notes}
                />
              </div>
            </Section>
          )}

          {allStoredExamFields.length > 0 && (
            <Section title="All Stored Exam Fields" icon={ClipboardList}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allStoredExamFields.map((field) => (
                  <div
                    key={field.key}
                    className="border border-gray-200 bg-gray-50 rounded p-2.5"
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
                      {field.label}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mt-0.5">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Audit Trail */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="font-semibold text-gray-700">
                Record Information
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Created</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(exam.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Last Updated</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(exam.updated_at)}
                </span>
              </div>
              {exam.finalized_at && (
                <div>
                  <span className="text-gray-500 block mb-1">Finalized</span>
                  <span className="text-gray-900 font-medium">
                    {formatDate(exam.finalized_at)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 block mb-1">Exam ID</span>
                <span className="text-gray-900 font-mono text-xs">
                  {exam.exam_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0 print:hidden">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
