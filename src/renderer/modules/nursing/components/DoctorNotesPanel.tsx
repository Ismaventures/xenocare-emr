/**
 * Doctor's Notes Panel Component
 *
 * Read-only view of doctor's clinical notes, treatment plans, and orders
 * for nurses to access within their workflow.
 *
 * This component displays:
 * - Latest consultation notes (SOAP format)
 * - Active treatment plans
 * - Doctor's orders requiring nurse action
 * - Medication orders (fetched from encounter-centric API)
 */

import React, { useState } from 'react';
import { formatStaffName } from '../../../utils/staffDisplay';
import {
  FileText,
  Stethoscope,
  ClipboardList,
  Pill,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Activity,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileEdit,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, EmptyState, Button } from '../../../components/ui';
import { supabase } from '../../../api/supabaseClient';
import { useEncounterDetails } from '../../clinical-consultation/hooks/useMedicalRecords';
import { getNursingNotesByEncounter } from '../api/nursing-notes.api';
import {
  NursingNoteDTO,
  getNoteTypeColor,
  getNoteTypeLabel,
  getConditionColor,
} from '../dtos/nursing-notes.dto';

// =============================================================================
// Types
// =============================================================================

interface DoctorNotesPanelProps {
  encounterId: string;
  patientId: string;
  patientName?: string;
}

interface ConsultationNote {
  id: string;
  encounter_id: string;
  patient_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  icd_code: string;
  clinical_notes: string;
  created_at: string;
  created_by: string;
  doctor?: {
    first_name: string;
    last_name: string;
    specialization: string;
  };
  // Nurse-specific fields
  requires_nurse_followup?: boolean;
  nurse_followup_instructions?: string;
}

interface TreatmentPlan {
  id: string;
  encounter_id: string;
  patient_id: string;
  plan_type: string;
  description: string;
  instructions: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  doctor?: {
    first_name: string;
    last_name: string;
  };
}

interface DoctorOrder {
  id: string;
  encounter_id: string;
  patient_id: string;
  order_type: 'medication' | 'monitoring' | 'procedure' | 'diet' | 'activity';
  instruction: string;
  frequency: string;
  duration: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'in_progress' | 'completed';
  requires_nurse_action: boolean;
  ordered_at: string;
  doctor?: {
    first_name: string;
    last_name: string;
  };
}

// Prescription type matching EncounterDetail.prescriptions from medical-records.api.ts
interface Prescription {
  id: string;
  prescription_id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  dispensed: boolean;
  is_changed?: boolean;
  status?: string;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchConsultationNotes(
  encounterId: string,
): Promise<ConsultationNote[]> {
  console.log(
    '[DoctorNotesPanel] Fetching consultation notes for encounter:',
    encounterId,
  );

  // First fetch consultations
  const { data, error } = await supabase
    .from('consultations')
    .select(
      `
      consultation_id,
      encounter_id,
      patient_id,
      doctor_id,
      complaints,
      history_of_present_illness,
      past_medical_history,
      family_history,
      social_history,
      review_of_systems,
      examination_findings,
      physical_examination,
      diagnosis,
      diagnosis_text,
      differential_diagnosis,
      treatment_plan,
      recommendations,
      follow_up_date,
      follow_up_notes,
      subjective,
      objective,
      assessment,
      plan,
      clinical_notes,
      notes,
      icd10_codes,
      consultation_date,
      created_at,
      updated_at,
      requires_nurse_followup,
      nurse_followup_instructions
    `,
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  console.log('[DoctorNotesPanel] Consultation query result:', {
    data,
    error,
    encounterId,
  });

  if (error) {
    console.error(
      '[DoctorNotesPanel] Error fetching consultation notes:',
      error,
    );
    return [];
  }

  if (!data || data.length === 0) {
    console.log(
      '[DoctorNotesPanel] No consultations found for encounter:',
      encounterId,
    );
    return [];
  }

  console.log('[DoctorNotesPanel] Found', data.length, 'consultations');

  // Fetch doctor info separately (supports both staff_id and UUID)
  const doctorIds = [...new Set(data.map((c) => c.doctor_id).filter(Boolean))];
  const doctorMap = new Map<string, any>();

  if (doctorIds.length > 0) {
    const potentialUuids = doctorIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    );
    const potentialStaffIds = doctorIds.filter(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    );

    const queries = [];
    if (potentialStaffIds.length > 0) {
      queries.push(
        supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role')
          .in('staff_id', potentialStaffIds),
      );
    }
    if (potentialUuids.length > 0) {
      queries.push(
        supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role')
          .in('id', potentialUuids),
      );
    }

    const results = await Promise.all(queries);
    const allDoctors = results.flatMap((r) => r.data || []);

    if (allDoctors.length > 0) {
      allDoctors.forEach((d) => {
        if (d.staff_id) doctorMap.set(d.staff_id, d);
        if (d.id) doctorMap.set(d.id, d);
      });
    }
  }

  // Transform data to match the expected interface
  return data.map((item) => {
    const doctor = item.doctor_id ? doctorMap.get(item.doctor_id) : null;

    // Build comprehensive subjective from all relevant fields
    const subjectiveParts = [
      item.complaints && `Chief Complaint: ${item.complaints}`,
      item.history_of_present_illness &&
        `HPI: ${item.history_of_present_illness}`,
      item.past_medical_history && `PMH: ${item.past_medical_history}`,
      item.family_history && `Family Hx: ${item.family_history}`,
      item.social_history && `Social Hx: ${item.social_history}`,
      item.review_of_systems && `ROS: ${item.review_of_systems}`,
      item.subjective,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Build objective from examination fields
    const objectiveParts = [
      item.physical_examination &&
        `Physical Exam: ${item.physical_examination}`,
      item.examination_findings && `Findings: ${item.examination_findings}`,
      item.objective,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Build assessment from diagnosis fields
    const diagnosisDisplay = Array.isArray(item.diagnosis)
      ? item.diagnosis.join(', ')
      : item.diagnosis || item.diagnosis_text || '';
    const assessmentParts = [
      diagnosisDisplay && `Diagnosis: ${diagnosisDisplay}`,
      item.differential_diagnosis?.length &&
        `Differential: ${item.differential_diagnosis.join(', ')}`,
      item.assessment,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Build plan from treatment fields
    const planParts = [
      item.treatment_plan && `Treatment: ${item.treatment_plan}`,
      item.recommendations && `Recommendations: ${item.recommendations}`,
      item.follow_up_date && `Follow-up: ${item.follow_up_date}`,
      item.follow_up_notes && `Follow-up Notes: ${item.follow_up_notes}`,
      item.plan,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      id: item.consultation_id,
      encounter_id: item.encounter_id,
      patient_id: item.patient_id,
      subjective: subjectiveParts || item.subjective || '',
      objective: objectiveParts || item.objective || '',
      assessment: assessmentParts || item.assessment || '',
      plan: planParts || item.plan || '',
      diagnosis: diagnosisDisplay,
      icd_code: Array.isArray(item.icd10_codes)
        ? item.icd10_codes.map((c: any) => c.code || c).join(', ')
        : '',
      clinical_notes: item.clinical_notes || item.notes || '',
      created_at: item.created_at || item.consultation_date,
      created_by: item.doctor_id || '',
      doctor: doctor
        ? {
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            specialization: doctor.role || '',
          }
        : undefined,
      // Nurse-specific fields
      requires_nurse_followup: item.requires_nurse_followup,
      nurse_followup_instructions: item.nurse_followup_instructions,
    };
  });
}

async function fetchDailyProgressNotes(
  encounterId: string,
): Promise<ConsultationNote[]> {
  console.log(
    '[DoctorNotesPanel] Fetching daily progress notes for encounter:',
    encounterId,
  );

  const { data, error } = await supabase
    .from('daily_progress_notes')
    .select(
      `
      progress_id,
      encounter_id,
      patient_id,
      subjective,
      objective,
      assessment,
      plan,
      io_notes,
      note_date,
      recorded_by,
      recorded_at
    `,
    )
    .eq('encounter_id', encounterId)
    .order('note_date', { ascending: false });

  if (error || !data) {
    console.error('[DoctorNotesPanel] Error fetching progress notes:', error);
    return [];
  }

  // Fetch staff info for recorders (supports both staff_id and UUID)
  const staffIds = [...new Set(data.map((p) => p.recorded_by).filter(Boolean))];
  const staffMap = new Map<string, any>();

  if (staffIds.length > 0) {
    const potentialUuids = staffIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    );
    const potentialStaffIds = staffIds.filter(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    );

    const queries = [];
    if (potentialStaffIds.length > 0) {
      queries.push(
        supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role')
          .in('staff_id', potentialStaffIds),
      );
    }
    if (potentialUuids.length > 0) {
      queries.push(
        supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role')
          .in('id', potentialUuids),
      );
    }

    const results = await Promise.all(queries);
    const allStaff = results.flatMap((r) => r.data || []);

    if (allStaff.length > 0) {
      allStaff.forEach((s) => {
        if (s.staff_id) staffMap.set(s.staff_id, s);
        if (s.id) staffMap.set(s.id, s);
      });
    }
  }

  return data.map((item) => {
    const staff = item.recorded_by ? staffMap.get(item.recorded_by) : null;
    return {
      id: item.progress_id,
      encounter_id: item.encounter_id,
      patient_id: item.patient_id,
      subjective: item.subjective || '',
      objective: item.objective || '',
      assessment: item.assessment || '',
      plan: item.plan || '',
      diagnosis: '',
      icd_code: '',
      clinical_notes: item.io_notes || '',
      created_at: item.note_date || item.recorded_at,
      created_by: item.recorded_by || '',
      doctor: staff
        ? {
            first_name: staff.first_name,
            last_name: staff.last_name,
            specialization: staff.role || 'Clinical Staff',
          }
        : undefined,
    };
  });
}

async function fetchTreatmentPlans(
  encounterId: string,
): Promise<TreatmentPlan[]> {
  // First fetch treatment plans without FK hint
  const { data, error } = await supabase
    .from('treatment_plans')
    .select(
      `
      id,
      encounter_id,
      patient_id,
      title,
      description,
      instructions,
      status,
      created_by,
      created_at,
      updated_at
    `,
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching treatment plans:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch doctor info separately (created_by is UUID referencing staff.id)
  const creatorIds = [
    ...new Set(data.map((p) => p.created_by).filter(Boolean)),
  ];
  let creatorMap = new Map<string, any>();

  if (creatorIds.length > 0) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .in('id', creatorIds);

    if (staff) {
      creatorMap = new Map(staff.map((s) => [s.id, s]));
    }
  }

  return data.map((item) => {
    const doctor = item.created_by ? creatorMap.get(item.created_by) : null;
    return {
      id: item.id,
      encounter_id: item.encounter_id,
      patient_id: item.patient_id,
      plan_type: item.title || 'Treatment Plan',
      description: item.description || '',
      instructions: item.instructions || '',
      start_date: item.created_at,
      end_date: '',
      status: item.status || 'active',
      created_at: item.created_at,
      doctor: doctor
        ? {
            first_name: doctor.first_name,
            last_name: doctor.last_name,
          }
        : undefined,
    };
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

function ConsultationCard({ note }: { note: ConsultationNote }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">Clinical Consultation</h4>
            <p className="text-sm text-gray-500">
              {note.doctor
                ? formatStaffName(note.doctor.first_name, note.doctor.last_name, note.doctor.role, 'Unknown Doctor')
                : 'Unknown Doctor'}
              {note.doctor?.specialization &&
                ` • ${note.doctor.specialization}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {new Date(note.created_at).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {/* SOAP Notes — stacked single-column for readability */}
          <div className="grid grid-cols-1 gap-3 mt-4">
            {note.subjective && (
              <div className="bg-blue-50/70 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
                  Subjective
                </h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {note.subjective}
                </p>
              </div>
            )}
            {note.objective && (
              <div className="bg-green-50/70 border-l-4 border-green-400 p-4 rounded-r-lg">
                <h5 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5">
                  Objective
                </h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {note.objective}
                </p>
              </div>
            )}
            {note.assessment && (
              <div className="bg-amber-50/70 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <h5 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                  Assessment
                </h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {note.assessment}
                </p>
              </div>
            )}
            {note.plan && (
              <div className="bg-purple-50/70 border-l-4 border-purple-400 p-4 rounded-r-lg">
                <h5 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5">
                  Plan
                </h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {note.plan}
                </p>
              </div>
            )}
          </div>

          {/* Diagnosis */}
          {(note.diagnosis || note.icd_code) && (
            <div className="bg-red-50/70 border-l-4 border-red-400 p-4 rounded-r-lg">
              <h5 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5">
                Diagnosis
              </h5>
              <p className="text-sm text-gray-800 leading-relaxed">
                {note.diagnosis}
                {note.icd_code && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({note.icd_code})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Additional Notes */}
          {note.clinical_notes && (
            <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded-r-lg">
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Additional Notes
              </h5>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {note.clinical_notes}
              </p>
            </div>
          )}

          {/* Nurse Follow-up Instructions - Important for nursing care */}
          {note.requires_nurse_followup && note.nurse_followup_instructions && (
            <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h5 className="text-sm font-bold text-amber-800 uppercase">
                  ⚠️ Nurse Follow-up Required
                </h5>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                {note.nurse_followup_instructions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TreatmentPlanCard({ plan }: { plan: TreatmentPlan }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ClipboardList className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{plan.plan_type}</h4>
            <p className="text-sm text-gray-500">
              {plan.doctor
                ? formatStaffName(plan.doctor.first_name, plan.doctor.last_name, plan.doctor.role)
                : 'Unknown'}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}
        >
          {plan.status}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-2">{plan.description}</p>

      {plan.instructions && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase">
              Nursing Instructions
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {plan.instructions}
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Start: {new Date(plan.start_date).toLocaleDateString('en-GB')}
        </span>
        {plan.end_date && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            End: {new Date(plan.end_date).toLocaleDateString('en-GB')}
          </span>
        )}
      </div>
    </div>
  );
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  // Determine dispensed status from the prescription data
  const isDispensed =
    prescription.dispensed ||
    prescription.status?.toLowerCase() === 'dispensed';

  const getStatusIcon = () => {
    if (isDispensed) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (prescription.status?.toLowerCase() === 'cancelled')
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    return <Circle className="h-4 w-4 text-amber-600" />;
  };

  const getStatusBadge = () => {
    if (isDispensed) {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Dispensed
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {prescription.status || 'Pending'}
      </span>
    );
  };

  return (
    <div
      className={`p-4 bg-white border rounded-lg ${isDispensed ? 'border-green-200' : 'border-gray-200'}`}
    >
      {/* Header with Drug Name and Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isDispensed ? 'bg-green-100' : 'bg-pink-100'}`}
          >
            <Pill
              className={`h-5 w-5 ${isDispensed ? 'text-green-600' : 'text-pink-600'}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                {prescription.drug_name}
              </h4>
              {getStatusIcon()}
              {prescription.is_changed && (
                <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
                  Modified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Qty: {prescription.quantity || '-'}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Dosage Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-[11px] text-gray-500 uppercase font-medium tracking-wider">
            Dosage
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {prescription.dosage || '-'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase font-medium tracking-wider">
            Frequency
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {prescription.frequency || '-'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase font-medium tracking-wider">
            Duration
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {prescription.duration || '-'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase font-medium tracking-wider">
            Quantity
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {prescription.quantity || '-'}
          </p>
        </div>
      </div>

      {/* Special Instructions */}
      {prescription.instructions && (
        <div className="mt-3 bg-blue-50/70 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Special Instructions
            </span>
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">
            {prescription.instructions}
          </p>
        </div>
      )}
    </div>
  );
}

// Nursing Progress Note Card Component
function NursingProgressCard({ note }: { note: NursingNoteDTO }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getShiftIcon = (shift: string | null | undefined) => {
    switch (shift) {
      case 'Morning':
        return '🌅';
      case 'Afternoon':
        return '☀️';
      case 'Night':
        return '🌙';
      default:
        return '📋';
    }
  };

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'bg-green-100 text-green-700';
    if (level <= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md ${
        note.is_critical
          ? 'border-red-200 bg-gradient-to-r from-red-50/50 to-white'
          : 'border-gray-200 hover:border-emerald-200'
      }`}
    >
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Shift Icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                note.is_critical ? 'bg-red-100' : 'bg-emerald-50'
              }`}
            >
              {getShiftIcon(note.shift)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getNoteTypeColor(note.note_type)}`}
                >
                  {getNoteTypeLabel(note.note_type)}
                </span>
                {note.patient_condition && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getConditionColor(note.patient_condition)}`}
                  >
                    {note.patient_condition}
                  </span>
                )}
                {note.pain_level !== null && note.pain_level !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${getPainLevelColor(note.pain_level)}`}
                  >
                    Pain: {note.pain_level}/10
                  </span>
                )}
              </div>

              {/* Note Title or Content Preview */}
              <h4 className="font-medium text-gray-900 mt-1 truncate">
                {note.title ||
                  note.content.substring(0, 60) +
                    (note.content.length > 60 ? '...' : '')}
              </h4>

              {/* Timestamp */}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(note.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {note.recorder && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {note.recorder.first_name} {note.recorder.last_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {note.is_critical && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                CRITICAL
              </span>
            )}
            {note.requires_doctor_review && !note.doctor_reviewed_at && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                Needs Review
              </span>
            )}
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Full Content */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          </div>

          {/* Interventions */}
          {note.interventions_performed && (
            <div className="bg-blue-50/70 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Interventions Performed
                </span>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">
                {note.interventions_performed}
              </p>
            </div>
          )}

          {/* Patient Response */}
          {note.patient_response && (
            <div className="bg-green-50/70 border-l-4 border-green-400 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                  Patient Response
                </span>
              </div>
              <p className="text-sm text-green-800 leading-relaxed">
                {note.patient_response}
              </p>
            </div>
          )}

          {/* Follow-up Required */}
          {note.follow_up_required && note.follow_up_notes && (
            <div className="bg-amber-50/70 border-l-4 border-amber-400 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Follow-up Required
                </span>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                {note.follow_up_notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DoctorNotesPanel({
  encounterId,
  patientId,
  patientName,
}: DoctorNotesPanelProps) {
  const [activeSection, setActiveSection] = useState<
    'consultations' | 'plans' | 'nursing-progress' | 'medications'
  >('consultations');

  // Fetch encounter details from the encounter-centric API (includes prescriptions)
  const { data: encounterDetails, isLoading: encounterLoading } =
    useEncounterDetails(encounterId);

  // Fetch consultation notes and daily progress notes
  const { data: consultations, isLoading: consultationsLoading } = useQuery({
    queryKey: ['doctor-consultations-combined', encounterId],
    queryFn: async () => {
      const [consultNotes, progressNotes] = await Promise.all([
        fetchConsultationNotes(encounterId),
        fetchDailyProgressNotes(encounterId),
      ]);

      // Combine and sort by date descending
      return [...consultNotes, ...progressNotes].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    enabled: !!encounterId,
  });

  // Fetch treatment plans
  const { data: treatmentPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['doctor-treatment-plans', encounterId],
    queryFn: () => fetchTreatmentPlans(encounterId),
    enabled: !!encounterId,
  });

  // Get prescriptions from encounter details (uses the same source as EncounterCentricView)
  const prescriptions = encounterDetails?.prescriptions || [];
  const prescriptionsLoading = encounterLoading;

  // Fetch nursing progress notes
  const { data: nursingNotes, isLoading: nursingNotesLoading } = useQuery({
    queryKey: ['nursing-progress-notes', encounterId],
    queryFn: () => getNursingNotesByEncounter(encounterId),
    enabled: !!encounterId,
  });

  if (!encounterId) {
    return (
      <Card className="p-6">
        <EmptyState
          title="No Encounter Selected"
          description="Select a patient from the queue to view doctor's notes and orders."
        />
      </Card>
    );
  }

  const sections = [
    {
      key: 'consultations',
      label: 'Consultations',
      icon: Stethoscope,
      count: consultations?.length || 0,
    },
    {
      key: 'plans',
      label: 'Treatment Plans',
      icon: ClipboardList,
      count: treatmentPlans?.length || 0,
    },
    {
      key: 'nursing-progress',
      label: 'Nursing Progress',
      icon: FileEdit,
      count: nursingNotes?.length || 0,
    },
    {
      key: 'medications',
      label: 'Medications',
      icon: Pill,
      count: prescriptions?.length || 0,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Clinical Overview
            </h3>
            {patientName && (
              <p className="text-xs text-gray-500">Patient: {patientName}</p>
            )}
          </div>
        </div>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full tracking-wide uppercase">
          Read Only
        </span>
      </div>

      {/* Section Tabs — compact pill-style */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === section.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <section.icon className="h-3.5 w-3.5" />
            {section.label === 'Consultations'
              ? 'Clinical Notes'
              : section.label}
            {section.count !== null && section.count > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] leading-none rounded-full font-bold ${
                  activeSection === section.key
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — flex-grow to fill available space */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Consultations Section */}
        {activeSection === 'consultations' && (
          <div className="space-y-4">
            {consultationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : consultations && consultations.length > 0 ? (
              consultations.map((note) => (
                <ConsultationCard key={note.id} note={note} />
              ))
            ) : (
              <EmptyState
                title="No Consultation Notes"
                description="No consultation notes have been recorded for this encounter yet."
              />
            )}
          </div>
        )}

        {/* Treatment Plans Section */}
        {activeSection === 'plans' && (
          <div className="space-y-4">
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : treatmentPlans && treatmentPlans.length > 0 ? (
              treatmentPlans.map((plan) => (
                <TreatmentPlanCard key={plan.id} plan={plan} />
              ))
            ) : (
              <EmptyState
                title="No Treatment Plans"
                description="No treatment plans have been created for this encounter yet."
              />
            )}
          </div>
        )}

        {/* Nursing Progress Notes Section */}
        {activeSection === 'nursing-progress' && (
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FileEdit className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Nursing Progress Notes
                  </h4>
                  <p className="text-xs text-gray-500">
                    {nursingNotes?.length || 0} nursing observations documented
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {nursingNotes && nursingNotes.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {nursingNotes.length}
                  </p>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Total Notes
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg border border-red-100 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {nursingNotes.filter((n) => n.is_critical).length}
                  </p>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                    Critical
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg border border-amber-100 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {
                      nursingNotes.filter(
                        (n) =>
                          n.requires_doctor_review && !n.doctor_reviewed_at,
                      ).length
                    }
                  </p>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Pending Review
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {nursingNotes.filter((n) => n.follow_up_required).length}
                  </p>
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    Follow-ups
                  </p>
                </div>
              </div>
            )}

            {/* Notes List */}
            {nursingNotesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Loading nursing notes...
                  </p>
                </div>
              </div>
            ) : nursingNotes && nursingNotes.length > 0 ? (
              <div className="space-y-3">
                {nursingNotes.map((note) => (
                  <NursingProgressCard key={note.id} note={note} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileEdit className="h-8 w-8 text-emerald-300" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-1">
                  No Nursing Notes Yet
                </h4>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Nursing progress notes will appear here once documented by the
                  nursing staff.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Medications Section */}
        {activeSection === 'medications' && (
          <div className="space-y-3">
            {prescriptionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : prescriptions && prescriptions.length > 0 ? (
              prescriptions.map((prescription, idx) => (
                <PrescriptionCard
                  key={prescription.id || idx}
                  prescription={prescription as Prescription}
                />
              ))
            ) : (
              <EmptyState
                title="No Medications"
                description="No medications have been prescribed for this encounter yet."
              />
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-amber-50/60 border-t border-amber-100 px-5 py-2 rounded-b-xl">
        <div className="flex items-center gap-2 text-[11px] text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Read-only view — contact the attending physician for changes.
          </span>
        </div>
      </div>
    </div>
  );
}
