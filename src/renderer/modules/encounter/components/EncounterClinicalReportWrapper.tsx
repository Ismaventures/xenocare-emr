/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER CLINICAL REPORT WRAPPER
 * =============================================================================
 * This wrapper fetches all clinical data for an encounter and passes it
 * to the EncounterClinicalReport component for rendering.
 *
 * It uses the useEncounterClinicalData hook to pull data from:
 * - visits (encounter)
 * - vitals
 * - consultations
 * - lab_requests
 * - prescriptions
 * - imaging_requests
 * - nursing_notes
 * - treatment_plans
 * - triage_assessments
 * =============================================================================
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Encounter } from '../dtos/encounter.dto';
import { useEncounterClinicalData } from '../hooks/useEncounter';
import { EncounterClinicalReport } from './EncounterClinicalReport';

interface EncounterClinicalReportWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  encounter: Encounter | null;
}

/**
 * Wrapper component that fetches clinical data and renders the report
 */
export function EncounterClinicalReportWrapper({
  isOpen,
  onClose,
  encounter,
}: EncounterClinicalReportWrapperProps) {
  // Fetch comprehensive clinical data for this encounter
  const {
    data: clinicalData,
    isLoading,
    error,
  } = useEncounterClinicalData(isOpen && encounter ? encounter.id : null);

  if (!isOpen) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary-700 animate-spin" />
          <p className="text-gray-700 font-medium">Loading clinical data...</p>
          <p className="text-sm text-gray-500">
            Fetching vitals, labs, prescriptions, and notes
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <h2 className="text-lg font-bold text-red-600 mb-2">
            Error Loading Clinical Data
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Failed to fetch clinical data for this encounter. Please try again.
          </p>
          <p className="text-xs text-gray-500 mb-4 bg-gray-100 p-2 rounded">
            {error.message}
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Transform the clinical data to the report format
  // Use the fetched encounter data if available, otherwise fall back to the prop
  const reportEncounter = clinicalData?.encounter || encounter;

  // Get the most recent vitals record
  const mostRecentVitals = clinicalData?.vitals?.[0]
    ? {
        recorded_at: clinicalData.vitals[0].date_recorded,
        temperature: clinicalData.vitals[0].temperature ?? undefined,
        pulse: clinicalData.vitals[0].pulse ?? undefined,
        blood_pressure_systolic:
          clinicalData.vitals[0].blood_pressure_systolic ?? undefined,
        blood_pressure_diastolic:
          clinicalData.vitals[0].blood_pressure_diastolic ?? undefined,
        respiratory_rate: clinicalData.vitals[0].respiratory_rate ?? undefined,
        oxygen_saturation:
          clinicalData.vitals[0].oxygen_saturation ?? undefined,
        weight: clinicalData.vitals[0].weight ?? undefined,
        height: clinicalData.vitals[0].height ?? undefined,
        bmi: clinicalData.vitals[0].bmi ?? undefined,
        pain_score: clinicalData.vitals[0].pain_level ?? undefined,
        recorded_by: clinicalData.vitals[0].nurse
          ? `${clinicalData.vitals[0].nurse.first_name} ${clinicalData.vitals[0].nurse.last_name}`
          : undefined,
      }
    : undefined;

  // Transform lab requests to report format
  const labResults = (clinicalData?.labRequests || []).map((lr) => ({
    id: lr.request_id,
    test_name: lr.test_name || 'Unknown Test',
    category: lr.category || 'General',
    result: lr.result?.value || lr.result?.result_value,
    unit: lr.result?.unit,
    reference_range: lr.result?.reference_range,
    status: (lr.status || 'pending').toLowerCase() as
      | 'pending'
      | 'completed'
      | 'cancelled',
    ordered_at: lr.created_at,
    completed_at: lr.result ? lr.created_at : undefined,
    ordered_by: lr.ordered_by
      ? `${lr.ordered_by.first_name} ${lr.ordered_by.last_name}`
      : undefined,
    is_abnormal: lr.result?.is_abnormal || false,
  }));

  // Transform imaging requests to report format
  const radiologyResults = (clinicalData?.imagingRequests || []).map((ir) => ({
    id: ir.request_id,
    procedure_name: ir.procedure_name || 'Unknown Procedure',
    modality: ir.modality || 'Unknown',
    status: (ir.status || 'pending').toLowerCase() as
      | 'pending'
      | 'completed'
      | 'cancelled',
    ordered_at: ir.created_at,
    completed_at: ir.findings ? ir.created_at : undefined,
    findings: ir.findings ?? undefined,
    impression: ir.impression ?? undefined,
    radiologist: ir.performed_by
      ? `${ir.performed_by.first_name} ${ir.performed_by.last_name}`
      : undefined,
  }));

  // Transform prescriptions to report format
  const prescriptions = (clinicalData?.prescriptions || []).map((rx) => ({
    id: rx.prescription_id,
    drug_name: rx.drug_name || 'Unknown Drug',
    dosage: rx.dosage || '',
    route: rx.route || '',
    frequency: rx.frequency || '',
    duration: rx.duration ?? undefined,
    quantity: rx.quantity_prescribed ?? undefined,
    instructions: rx.instructions ?? undefined,
    prescribed_at: rx.created_at,
    prescribed_by: rx.doctor
      ? `${rx.doctor.first_name} ${rx.doctor.last_name}`
      : undefined,
    status: (rx.status || 'Pending').toLowerCase() as
      | 'active'
      | 'completed'
      | 'cancelled',
  }));

  // Transform nursing notes to report format
  const nursingNotes = (clinicalData?.nursingNotes || []).map((nn) => ({
    id: nn.id,
    note_type: nn.note_type || 'General Note',
    content: nn.content,
    recorded_at: nn.created_at,
    recorded_by: nn.recorded_by
      ? `${nn.recorded_by.first_name} ${nn.recorded_by.last_name}`
      : undefined,
  }));

  // Transform consultation to clinical notes format
  const clinicalNotes = clinicalData?.consultation
    ? [
        {
          id: clinicalData.consultation.consultation_id,
          note_type: 'Consultation',
          subjective:
            clinicalData.consultation.complaints ||
            clinicalData.consultation.subjective ||
            undefined,
          objective:
            clinicalData.consultation.examination_findings ||
            clinicalData.consultation.objective ||
            undefined,
          assessment:
            clinicalData.consultation.diagnosis_text ||
            (clinicalData.consultation.diagnosis
              ? clinicalData.consultation.diagnosis.join(', ')
              : undefined) ||
            clinicalData.consultation.assessment ||
            undefined,
          plan:
            clinicalData.consultation.treatment_plan ||
            clinicalData.consultation.plan ||
            undefined,
          recorded_at: clinicalData.consultation.consultation_date,
          recorded_by: clinicalData.consultation.doctor
            ? `${clinicalData.consultation.doctor.rank || ''} ${clinicalData.consultation.doctor.first_name} ${clinicalData.consultation.doctor.last_name}`.trim()
            : undefined,
        },
      ]
    : [];

  // Transform treatment plan tasks to procedures format
  const procedures = (clinicalData?.treatmentPlan?.tasks || [])
    .filter((t) => t.task_type === 'Procedure')
    .map((t) => ({
      id: t.id,
      procedure_name: t.title,
      procedure_type: t.task_type,
      status: t.status.toLowerCase() as
        | 'scheduled'
        | 'in_progress'
        | 'completed'
        | 'cancelled',
      performed_at: t.completed_at ?? undefined,
      performed_by: undefined,
      notes: t.description ?? undefined,
    }));

  return (
    <EncounterClinicalReport
      isOpen={isOpen}
      onClose={onClose}
      encounter={reportEncounter}
      vitals={mostRecentVitals}
      labResults={labResults}
      radiologyResults={radiologyResults}
      prescriptions={prescriptions}
      nursingNotes={nursingNotes}
      clinicalNotes={clinicalNotes}
      procedures={procedures}
    />
  );
}

export default EncounterClinicalReportWrapper;
