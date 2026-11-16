import {
  createBatchOrders,
  resolvePatientUuid,
} from '../../clinical-consultation/api/consultation.api';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  ProcedureOrderDTO,
  PrescriptionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';
import { createBulkClinicalRequests } from '../../clinical-requests/api/clinical-requests.api';
import type { CreateClinicalRequestDTO } from '../../clinical-requests/dtos/clinical-request.dto';

export interface SpecialtyReferralSelection {
  selected: boolean;
  reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  referralType?: 'internal' | 'external';
  externalFacility?: string;
  externalDoctor?: string;
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
}

export type SpecialtyReferralSelectionMap = Record<
  string,
  SpecialtyReferralSelection
>;

export interface SpecialtyOrdersPayload {
  labOrders: LabOrderDTO[];
  radiologyOrders: RadiologyOrderDTO[];
  prescriptions: PrescriptionOrderDTO[];
  procedureOrders: ProcedureOrderDTO[];
  specialtyReferrals: SpecialtyReferralSelectionMap;
}

export interface SubmitSpecialtyOrdersParams {
  patientPublicId: string;
  encounterId: string;
  orderedByStaffId: string;
  orderedByStaffUuid?: string;
  currentSpecialty: string;
  orders: SpecialtyOrdersPayload;
  consultationId?: string | null;
  diagnosisText?: string | null;
  clinicalFindings?: string | null;
  patientName?: string;
  patientEmrNumber?: string;
}

export interface SubmitSpecialtyOrdersResult {
  labCount: number;
  imagingCount: number;
  prescriptionCount: number;
  procedureCount: number;
  referralCount: number;
}

function diagnosisArrayFromText(text: string | null | undefined): string[] {
  return (text || '')
    .split(/[;\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function selectedReferrals(
  specialtyReferrals: SpecialtyReferralSelectionMap,
  currentSpecialty: string,
): Array<[string, SpecialtyReferralSelection]> {
  const current = (currentSpecialty || '').toLowerCase();
  return Object.entries(specialtyReferrals || {}).filter(
    ([specialtyKey, referral]) => {
      if (!referral?.selected) return false;
      return specialtyKey.toLowerCase() !== current;
    },
  );
}

function buildReferralNotes(
  specialtyKey: string,
  referral: SpecialtyReferralSelection,
  fallbackFindings: string | null | undefined,
  fallbackDiagnosis: string | null | undefined,
): string {
  const parts: string[] = [];

  const destination = specialtyKey.replace(/_/g, ' ');
  parts.push(`Referral destination: ${destination}`);

  if (referral.referralType === 'external') {
    parts.push('Referral type: external');
    if (referral.externalFacility)
      parts.push(`External facility: ${referral.externalFacility}`);
    if (referral.externalDoctor)
      parts.push(`External doctor: ${referral.externalDoctor}`);
  } else {
    parts.push('Referral type: internal');
  }

  const findings = referral.clinicalFindings || fallbackFindings;
  const diagnosis = referral.provisionalDiagnosis || fallbackDiagnosis;

  if (findings) parts.push(`Clinical findings: ${findings}`);
  if (diagnosis) parts.push(`Provisional diagnosis: ${diagnosis}`);

  return parts.join(' | ');
}

export async function submitSpecialtyOrdersAndReferrals(
  params: SubmitSpecialtyOrdersParams,
): Promise<SubmitSpecialtyOrdersResult> {
  const {
    patientPublicId,
    encounterId,
    orderedByStaffId,
    orderedByStaffUuid,
    currentSpecialty,
    orders,
    consultationId,
    diagnosisText,
    clinicalFindings,
    patientName,
    patientEmrNumber,
  } = params;

  const labOrders = orders.labOrders || [];
  const radiologyOrders = orders.radiologyOrders || [];
  const prescriptions = orders.prescriptions || [];
  const procedureOrders = orders.procedureOrders || [];
  const referralEntries = selectedReferrals(
    orders.specialtyReferrals || {},
    currentSpecialty,
  );

  const hasAnyDepartmentOrder =
    labOrders.length > 0 ||
    radiologyOrders.length > 0 ||
    prescriptions.length > 0 ||
    procedureOrders.length > 0;

  if (!hasAnyDepartmentOrder && referralEntries.length === 0) {
    return {
      labCount: 0,
      imagingCount: 0,
      prescriptionCount: 0,
      procedureCount: 0,
      referralCount: 0,
    };
  }

  const diagnosis = diagnosisArrayFromText(diagnosisText);

  if (hasAnyDepartmentOrder) {
    if (!orderedByStaffId) {
      throw new Error('Could not submit orders: missing staff ID.');
    }

    await createBatchOrders({
      consultationId: consultationId || '',
      patientId: patientPublicId,
      visitId: encounterId,
      encounterId,
      orderedBy: orderedByStaffId,
      labOrders,
      radiologyOrders,
      procedureOrders,
      prescriptions,
      diagnosis,
      clinicalFindings: clinicalFindings || undefined,
      patientName,
      patientEmrNumber,
    });
  }

  if (referralEntries.length > 0) {
    if (!orderedByStaffUuid) {
      throw new Error('Could not submit referrals: missing staff UUID.');
    }

    const patientUuid = await resolvePatientUuid(patientPublicId);
    if (!patientUuid) {
      throw new Error(
        'Could not submit referrals: patient UUID could not be resolved.',
      );
    }

    const referralRequests: CreateClinicalRequestDTO[] = referralEntries.map(
      ([specialtyKey, referral]) => {
        const requestReason =
          referral.reason?.trim() ||
          `Referral from ${currentSpecialty} consultation.`;
        const notes = buildReferralNotes(
          specialtyKey,
          referral,
          clinicalFindings,
          diagnosisText,
        );

        return {
          patient_id: patientUuid,
          encounter_id: encounterId,
          requesting_doctor_id: orderedByStaffUuid,
          request_type: 'Referral',
          clinical_reason: requestReason,
          urgency: referral.urgency || 'Routine',
          specialty_module: specialtyKey.toLowerCase(),
          notes,
          created_by: orderedByStaffUuid,
          // Keep referral lifecycle explicit for encounter-office routing consistency.
          status: 'Under_Review',
          referral_workflow_status: 'Pending_Encounter_Office',
        } as any;
      },
    );

    await createBulkClinicalRequests(referralRequests);
  }

  return {
    labCount: labOrders.length,
    imagingCount: radiologyOrders.length,
    prescriptionCount: prescriptions.length,
    procedureCount: procedureOrders.length,
    referralCount: referralEntries.length,
  };
}
