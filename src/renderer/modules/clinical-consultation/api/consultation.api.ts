import { supabase } from '../../../api/supabaseClient';
import {
  ConsultationDTO,
  ConsultationWithRelations,
  ConsultationWithDetails,
  CreateConsultationDTO,
  UpdateConsultationDTO,
  ConsultationEditReason,
  ConsultationSearchParams,
  ConsultationSearchResult,
  LabOrderDTO,
  RadiologyOrderDTO,
  ProcedureOrderDTO,
  PrescriptionOrderDTO,
  getConsultationEditReasonLabel,
  isWithinEditWindow,
} from '../dtos/consultation.dto';
import {
  LabTestCatalogue,
  ImagingCatalogue,
  DrugCatalogue,
} from '../../../types';
import {
  isPatientNhis,
  createServiceApprovalRequest,
} from '../../../lib/nhis/serviceApprovalWorkflow';
import { logAudit } from '../../../lib/audit/audit';
import { updateWithLock } from '../../../lib/optimisticLocking';
import { createScopedLogger } from '../../../utils/logger';
import { resolvePatientVarcharId } from '../../../lib/patient-id-resolver';

// Re-export so existing consumers keep working
export { resolvePatientVarcharId } from '../../../lib/patient-id-resolver';

const log = createScopedLogger('ConsultationAPI');
// NOTE: Billing is now created when requests are APPROVED by the respective modules
// (Lab, Radiology, Pharmacy, Procedure, In-Patient) - not during consultation submission

// =============================================================================
// Patient ID Resolution Helper
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve external patient_id (e.g. PT-00001) to internal UUID (patients.id).
 * If the identifier is already a UUID, it returns it as-is.
 */
export async function resolvePatientUuid(identifier: string): Promise<string> {
  if (!identifier) {
    throw new Error('Patient identifier is required');
  }

  // If already a UUID, verify it exists in patients table
  if (UUID_REGEX.test(identifier)) {
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('id', identifier)
      .maybeSingle();

    if (data?.id) {
      return data.id;
    }
    // UUID doesn't exist as id, will try as patient_id below
  }

  // Look up the internal UUID from the external patient_id
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_id', identifier)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    log.error('Failed to resolve patient UUID:', error);
    throw new Error('Failed to resolve patient identifier');
  }

  if (data?.id) {
    return data.id;
  }

  // If still not found, throw an error instead of returning invalid value
  log.error(
    `[resolvePatientUuid] Patient not found for identifier: ${identifier}`,
  );
  throw new Error(`Patient not found: ${identifier}`);
}

async function resolveVisitIdentifiers(identifier?: string | null): Promise<{
  visitUuid: string | null;
  visitPublicId: string | null;
}> {
  if (!identifier) {
    return { visitUuid: null, visitPublicId: null };
  }

  const lookupColumn = UUID_REGEX.test(identifier) ? 'id' : 'visit_id';

  try {
    const { data, error } = await supabase
      .from('visits')
      .select('id, visit_id')
      .eq(lookupColumn, identifier)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to resolve visit identifiers:', error);
    }

    if (data?.id && data?.visit_id) {
      return { visitUuid: data.id, visitPublicId: data.visit_id };
    }
  } catch (err) {
    log.error('Visit resolution threw:', err);
  }

  if (UUID_REGEX.test(identifier)) {
    return { visitUuid: identifier, visitPublicId: null };
  }

  return { visitUuid: null, visitPublicId: identifier };
}

/**
 * Get patient's insurance type for NHIS calculation
 * Returns the insurance_type from the visit or patient record
 */
async function getInsuranceType(
  visitId: string | null,
  patientId: string,
): Promise<string> {
  // First try to get from visit (snapshot at encounter time)
  if (visitId) {
    const { data: visitData } = await supabase
      .from('visits')
      .select('insurance_type, payment_category')
      .or(`id.eq.${visitId},visit_id.eq.${visitId}`)
      .maybeSingle();

    if (visitData?.insurance_type) {
      return visitData.insurance_type;
    }
    if (visitData?.payment_category === 'NHIS') {
      return 'Civilian_NHIS'; // Default NHIS type if not specified
    }
  }

  // Fallback to patient's insurance type
  const { data: patientData } = await supabase
    .from('patients')
    .select('insurance_type')
    .or(`id.eq.${patientId},patient_id.eq.${patientId}`)
    .maybeSingle();

  return patientData?.insurance_type || 'Private';
}

const normalizeString = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeConsultationPayload = <T extends Partial<CreateConsultationDTO>>(
  payload: T,
) => {
  // Destructure to exclude clinic_id - it's handled separately with FK validation
  const { clinic_id: _ignoredClinicId, ...restPayload } = payload as any;

  const sanitized: Record<string, unknown> = {
    ...restPayload,
    visit_id: normalizeString(payload.visit_id),
    encounter_id: normalizeString(payload.encounter_id),
    // clinic_id is intentionally NOT included here - handled separately in createConsultation
    clinical_notes: normalizeString(payload.clinical_notes),
    history_of_present_illness: normalizeString(
      payload.history_of_present_illness,
    ),
    past_medical_history: normalizeString(payload.past_medical_history),
    family_history: normalizeString(payload.family_history),
    social_history: normalizeString(payload.social_history),
    review_of_systems: normalizeString(payload.review_of_systems),
    examination_findings: normalizeString(payload.examination_findings),
    physical_examination: normalizeString(payload.physical_examination),
    treatment_plan: normalizeString(payload.treatment_plan),
    recommendations: normalizeString(payload.recommendations),
    follow_up_date: normalizeString(payload.follow_up_date),
    follow_up_notes: normalizeString(payload.follow_up_notes),
  };

  // Handle icd10_codes - keep as JSONB
  if ('icd10_codes' in payload) {
    sanitized.icd10_codes = payload.icd10_codes || [];
  }

  // Handle specialty consultation fields - keep as-is (JSONB and text)
  if ('specialty_code' in payload) {
    sanitized.specialty_code = payload.specialty_code || null;
  }
  if ('specialty_template_id' in payload) {
    // Only save if it's a valid UUID (local templates use string IDs like 'tpl-neurology-001')
    const templateId = payload.specialty_template_id;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    sanitized.specialty_template_id =
      templateId && uuidRegex.test(templateId) ? templateId : null;
  }
  if ('specialty_template_version' in payload) {
    sanitized.specialty_template_version =
      payload.specialty_template_version || null;
  }
  if ('specialty_data' in payload) {
    // Ensure specialty_data is an object (JSONB column)
    sanitized.specialty_data =
      payload.specialty_data && typeof payload.specialty_data === 'object'
        ? payload.specialty_data
        : {};
  }

  // Handle diagnosis - convert string to array for database TEXT[] field
  if ('diagnosis' in payload) {
    const diagnosisValue = payload.diagnosis;
    if (typeof diagnosisValue === 'string' && diagnosisValue.trim()) {
      // Split by semicolon if multiple diagnoses, otherwise create single-item array
      const diagArray = diagnosisValue.includes(';')
        ? diagnosisValue
            .split(';')
            .map((d) => d.trim())
            .filter((d) => d.length > 0)
        : [diagnosisValue.trim()];
      sanitized.diagnosis = diagArray.length > 0 ? diagArray : null;
    } else if (Array.isArray(diagnosisValue)) {
      sanitized.diagnosis = diagnosisValue.length > 0 ? diagnosisValue : null;
    } else {
      sanitized.diagnosis = null;
    }
  }

  if (payload.complaints !== undefined) {
    sanitized.complaints =
      payload.complaints?.trim() || payload.complaints || '';
  }

  if ('differential_diagnosis' in payload) {
    const dxList = (payload.differential_diagnosis || [])
      .map((dx) => dx?.trim())
      .filter((dx): dx is string => Boolean(dx));
    sanitized.differential_diagnosis = dxList.length > 0 ? dxList : null;
  }

  // Clean up undefined values AND explicitly ensure clinic_id is removed
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  // Double-ensure clinic_id is not in the sanitized payload
  delete sanitized.clinic_id;

  return sanitized as T;
};

const ITEMS_PER_PAGE = 20;

interface ConsultationAuditRow {
  entity_id: string;
  performed_at: string;
  performed_by?: string | null;
  notes?: string | null;
}

const parseConsultationEditNote = (notes?: string | null) => {
  if (!notes) {
    return {
      reason: null as ConsultationEditReason | null,
      reasonLabel: null as string | null,
      reasonDetails: null as string | null,
    };
  }

  try {
    const parsed = JSON.parse(notes) as {
      edit_reason?: ConsultationEditReason;
      edit_reason_label?: string;
      edit_reason_details?: string;
    };
    return {
      reason: parsed.edit_reason || null,
      reasonLabel:
        parsed.edit_reason_label ||
        getConsultationEditReasonLabel(parsed.edit_reason || null),
      reasonDetails: parsed.edit_reason_details || null,
    };
  } catch {
    return {
      reason: 'other' as ConsultationEditReason,
      reasonLabel: 'Other clinical correction',
      reasonDetails: notes,
    };
  }
};

const attachConsultationAlterationMetadata = async <
  T extends ConsultationWithRelations,
>(
  consultations: T[],
): Promise<T[]> => {
  if (!consultations.length) return consultations;

  const consultationIds = consultations
    .map((item) => item.consultation_id)
    .filter(Boolean);

  if (!consultationIds.length) return consultations;

  const { data: auditRows } = await supabase
    .from('clinical_audit_log')
    .select('entity_id, performed_at, performed_by, notes')
    .eq('entity_type', 'consultation')
    .eq('action', 'UPDATE')
    .in('entity_id', consultationIds)
    .order('performed_at', { ascending: false });

  const latestByConsultation = new Map<string, ConsultationAuditRow>();
  (auditRows as ConsultationAuditRow[] | null)?.forEach((row) => {
    if (!latestByConsultation.has(row.entity_id)) {
      latestByConsultation.set(row.entity_id, row);
    }
  });

  return consultations.map((consultation) => {
    const audit = latestByConsultation.get(consultation.consultation_id);
    if (!audit) return consultation;

    const parsed = parseConsultationEditNote(audit.notes);
    return {
      ...consultation,
      is_altered: true,
      altered_at: audit.performed_at,
      altered_by: audit.performed_by || null,
      alteration_reason: parsed.reason,
      alteration_reason_label: parsed.reasonLabel,
      alteration_reason_details: parsed.reasonDetails,
    } as T;
  });
};

// =============================================================================
// Get Consultations (with search/filter/pagination)
// =============================================================================

export const getConsultations = async (
  params?: ConsultationSearchParams,
): Promise<ConsultationSearchResult> => {
  const page = params?.page || 1;
  const limit = params?.limit || ITEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  let query = supabase.from('consultations').select(
    `
      *,
      patient:patients!fk_consultations_patient(patient_id, first_name, middle_name, surname, contact_phone, gender, date_of_birth),
      doctor:staff!fk_consultations_doctor(staff_id, first_name, last_name, role)
    `,
    { count: 'exact' },
  );

  // Apply filters
  if (params?.patient_id) {
    query = query.eq('patient_id', params.patient_id);
  }

  if (params?.doctor_id) {
    query = query.eq('doctor_id', params.doctor_id);
  }

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  if (params?.date_from) {
    query = query.gte('consultation_date', params.date_from);
  }

  if (params?.date_to) {
    query = query.lte('consultation_date', params.date_to);
  }

  // Apply pagination and ordering
  query = query
    .order('consultation_date', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  const consultationsWithAudit = await attachConsultationAlterationMetadata(
    (data || []) as ConsultationWithRelations[],
  );

  return {
    consultations: consultationsWithAudit,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
};

// =============================================================================
// Get Consultation by ID
// =============================================================================

export const getConsultationById = async (
  id: string,
): Promise<ConsultationWithDetails> => {
  // NOTE: Removed FK joins to catalogue tables due to Supabase schema cache issues
  // Fetching related data separately
  const { data, error } = await supabase
    .from('consultations')
    .select(
      `
      *,
      patient:patients!fk_consultations_patient(*),
      doctor:staff!fk_consultations_doctor(*)
    `,
    )
    .eq('consultation_id', id)
    .single();

  if (error) throw error;

  const { data: auditRows } = await supabase
    .from('clinical_audit_log')
    .select('entity_id, performed_at, performed_by, notes')
    .eq('entity_type', 'consultation')
    .eq('action', 'UPDATE')
    .eq('entity_id', id)
    .order('performed_at', { ascending: false })
    .limit(1);

  const latestAudit = (auditRows as ConsultationAuditRow[] | null)?.[0] || null;
  const parsedAuditNote = parseConsultationEditNote(latestAudit?.notes || null);

  // Fetch lab_requests separately
  const { data: labRequests } = await supabase
    .from('lab_requests')
    .select('request_id, status, result, test_id')
    .eq('consultation_id', id);

  // Fetch lab test names
  let labRequestsWithTest = labRequests || [];
  if (labRequests && labRequests.length > 0) {
    const testIds = [
      ...new Set(labRequests.map((l) => l.test_id).filter(Boolean)),
    ];
    if (testIds.length > 0) {
      const { data: tests } = await supabase
        .from('lab_test_catalogue')
        .select('id, name')
        .in('id', testIds);
      const testMap = new Map(tests?.map((t) => [t.id, t]) || []);
      labRequestsWithTest = labRequests.map((l) => ({
        ...l,
        test: (() => {
          const test = testMap.get(l.test_id);
          return test
            ? {
                test_id: test.id,
                test_name: test.name,
              }
            : null;
        })(),
      }));
    }
  }

  // Fetch radiology_requests separately
  const { data: radiologyRequests } = await supabase
    .from('radiology_requests')
    .select('request_id, status, report, imaging_id')
    .eq('consultation_id', id);

  // Fetch imaging names
  let radiologyRequestsWithImaging = radiologyRequests || [];
  if (radiologyRequests && radiologyRequests.length > 0) {
    const imagingIds = [
      ...new Set(radiologyRequests.map((r) => r.imaging_id).filter(Boolean)),
    ];
    if (imagingIds.length > 0) {
      const { data: imaging } = await supabase
        .from('imaging_catalogue')
        .select('id, name')
        .in('id', imagingIds);
      const imagingMap = new Map(imaging?.map((i) => [i.id, i]) || []);
      radiologyRequestsWithImaging = radiologyRequests.map((r) => ({
        ...r,
        imaging: (() => {
          const imagingItem = imagingMap.get(r.imaging_id);
          return imagingItem
            ? {
                imaging_id: imagingItem.id,
                imaging_name: imagingItem.name,
              }
            : null;
        })(),
      }));
    }
  }

  // Fetch procedure_requests separately
  const { data: procedureRequests } = await supabase
    .from('procedure_requests')
    .select('request_id, status, notes, procedure_id, procedure_type')
    .eq('consultation_id', id);

  // Fetch procedure names
  let procedureRequestsWithCatalogue = procedureRequests || [];
  if (procedureRequests && procedureRequests.length > 0) {
    const procedureIds = [
      ...new Set(procedureRequests.map((p) => p.procedure_id).filter(Boolean)),
    ];
    if (procedureIds.length > 0) {
      const { data: procedures } = await supabase
        .from('procedure_catalogue')
        .select('id, name, type')
        .in('id', procedureIds);
      const procedureMap = new Map(procedures?.map((p) => [p.id, p]) || []);
      procedureRequestsWithCatalogue = procedureRequests.map((p) => ({
        ...p,
        procedure: (() => {
          const procedure = procedureMap.get(p.procedure_id);
          return procedure
            ? {
                procedure_id: procedure.id,
                procedure_name: procedure.name,
                procedure_type: procedure.type || p.procedure_type || 'General',
              }
            : null;
        })(),
      }));
    }
  }

  // Fetch prescriptions separately
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select(
      'prescription_id, status, dosage, frequency, duration, route, quantity_prescribed, quantity_dispensed, instructions, drug_id',
    )
    .eq('consultation_id', id);

  // Fetch drug names
  let prescriptionsWithDrug = prescriptions || [];
  if (prescriptions && prescriptions.length > 0) {
    const drugIds = [
      ...new Set(prescriptions.map((p) => p.drug_id).filter(Boolean)),
    ];
    if (drugIds.length > 0) {
      const { data: drugs } = await supabase
        .from('drug_catalogue')
        .select('id, name, strength')
        .in('id', drugIds);
      const drugMap = new Map(drugs?.map((d) => [d.id, d]) || []);
      prescriptionsWithDrug = prescriptions.map((p) => ({
        ...p,
        drug: drugMap.get(p.drug_id) || null,
      }));
    }
  }

  return {
    ...data,
    lab_requests: labRequestsWithTest,
    radiology_requests: radiologyRequestsWithImaging,
    procedure_requests: procedureRequestsWithCatalogue,
    prescriptions: prescriptionsWithDrug,
    is_altered: Boolean(latestAudit),
    altered_at: latestAudit?.performed_at || null,
    altered_by: latestAudit?.performed_by || null,
    alteration_reason: parsedAuditNote.reason,
    alteration_reason_label: parsedAuditNote.reasonLabel,
    alteration_reason_details: parsedAuditNote.reasonDetails,
  } as ConsultationWithDetails;
};

// =============================================================================
// Get Patient Consultations
// =============================================================================

export const getPatientConsultations = async (
  patientId: string,
): Promise<ConsultationWithRelations[]> => {
  const { data, error } = await supabase
    .from('consultations')
    .select(
      `
      *,
      patient:patients!fk_consultations_patient(patient_id, first_name, surname),
      doctor:staff!fk_consultations_doctor(staff_id, first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .order('consultation_date', { ascending: false });

  if (error) throw error;
  return data as ConsultationWithRelations[];
};

// =============================================================================
// Create Consultation
// =============================================================================

export const createConsultation = async (
  consultation: CreateConsultationDTO,
): Promise<ConsultationDTO> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('Session expired. Please sign in again.');
  }

  const { user } = authData;

  // consultations.doctor_id references staff(staff_id)
  // Resolve the authenticated user's staff record and ensure a staff_id exists
  const { data: staffRecord, error: staffError } = await supabase
    .from('staff')
    .select('staff_id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError && staffError.code !== 'PGRST116') {
    throw new Error('Unable to resolve staff profile. Please try again later.');
  }

  if (!staffRecord?.user_id) {
    throw new Error(
      'Your account is not linked to a staff record. Please contact the administrator.',
    );
  }

  let doctorId = staffRecord.staff_id;

  if (!doctorId) {
    const fallbackStaffId = staffRecord.user_id ?? user.id;

    const { data: updatedStaff, error: updateError } = await supabase
      .from('staff')
      .update({ staff_id: fallbackStaffId })
      .eq('user_id', user.id)
      .select('staff_id')
      .maybeSingle();

    if (updateError) {
      throw new Error(
        'Unable to align staff identifier. Please try again later.',
      );
    }

    doctorId = (updatedStaff?.staff_id || fallbackStaffId || '').trim();
  }

  if (!doctorId) {
    throw new Error(
      'Unable to resolve doctor identifier. Please contact the administrator.',
    );
  }

  // Resolve visit identifiers - ensure we have both UUID (encounter_id) and VARCHAR (visit_id)
  let resolvedVisitId: string | null = null;
  let resolvedEncounterId: string | null = null;
  let resolvedClinicId: string | null = consultation.clinic_id || null;

  // Helper to detect if a string is a UUID format
  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // If encounter_id is provided, resolve both UUID and display ID
  if (consultation.encounter_id) {
    if (isUuid(consultation.encounter_id)) {
      // It's a UUID - query by id
      resolvedEncounterId = consultation.encounter_id;
      const { data: visitData } = await supabase
        .from('visits')
        .select('visit_id, clinic_id')
        .eq('id', consultation.encounter_id)
        .maybeSingle();

      if (visitData?.visit_id) {
        resolvedVisitId = visitData.visit_id;
      }
      if (!resolvedClinicId && visitData?.clinic_id) {
        resolvedClinicId = visitData.clinic_id;
      }
    } else {
      // It's a display ID (VIS-...) - query by visit_id
      resolvedVisitId = consultation.encounter_id;
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, clinic_id')
        .eq('visit_id', consultation.encounter_id)
        .maybeSingle();

      if (visitData?.id) {
        resolvedEncounterId = visitData.id;
      }
      if (!resolvedClinicId && visitData?.clinic_id) {
        resolvedClinicId = visitData.clinic_id;
      }
    }
  }

  // If visit_id is provided directly (could be UUID or VARCHAR), resolve it
  if (consultation.visit_id && !resolvedVisitId) {
    if (isUuid(consultation.visit_id)) {
      // It's a UUID, look up the VARCHAR visit_id and clinic_id
      const { data: visitData } = await supabase
        .from('visits')
        .select('visit_id, clinic_id')
        .eq('id', consultation.visit_id)
        .maybeSingle();

      if (visitData?.visit_id) {
        resolvedVisitId = visitData.visit_id;
        resolvedEncounterId = consultation.visit_id;
      }
      // Only use clinic_id from visit if not already provided
      if (!resolvedClinicId && visitData?.clinic_id) {
        resolvedClinicId = visitData.clinic_id;
      }
    } else {
      // It's already a VARCHAR visit_id
      resolvedVisitId = consultation.visit_id;

      // Look up the UUID and clinic_id
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, clinic_id')
        .eq('visit_id', consultation.visit_id)
        .maybeSingle();

      if (visitData?.id) {
        resolvedEncounterId = visitData.id;
      }
      // Only use clinic_id from visit if not already provided
      if (!resolvedClinicId && visitData?.clinic_id) {
        resolvedClinicId = visitData.clinic_id;
      }
    }
  }

  // IMPORTANT: The FK fk_consultations_clinic references clinics(clinic_id) which is VARCHAR (e.g., "CLN-001")
  // NOT clinics(id) which is UUID. We need to resolve UUID to VARCHAR clinic_id.
  const candidateClinicUuid =
    resolvedClinicId || (consultation as any).clinic_id;
  let validatedClinicId: string | null = null;

  if (
    candidateClinicUuid &&
    typeof candidateClinicUuid === 'string' &&
    candidateClinicUuid.trim()
  ) {
    // Check if it's already a VARCHAR clinic_id (starts with CLN-)
    if (candidateClinicUuid.startsWith('CLN-')) {
      // Verify it exists
      const { data: clinicByDisplayId } = await supabase
        .from('clinics')
        .select('clinic_id')
        .eq('clinic_id', candidateClinicUuid.trim())
        .maybeSingle();

      if (clinicByDisplayId) {
        validatedClinicId = candidateClinicUuid.trim();
      }
    } else {
      // It's a UUID - look up the VARCHAR clinic_id
      const { data: clinicByUuid } = await supabase
        .from('clinics')
        .select('clinic_id')
        .eq('id', candidateClinicUuid.trim())
        .maybeSingle();

      if (clinicByUuid?.clinic_id) {
        validatedClinicId = clinicByUuid.clinic_id;
        log.info(
          `[createConsultation] Resolved clinic UUID ${candidateClinicUuid} to clinic_id ${validatedClinicId}`,
        );
      }
    }

    if (!validatedClinicId) {
      log.warn(
        `[createConsultation] Clinic "${candidateClinicUuid}" not found in clinics table, setting to null`,
      );
    }
  }

  // Sanitize data - clinic_id is now excluded from sanitizeConsultationPayload
  const sanitizedPayload = sanitizeConsultationPayload(consultation);

  // Final sanitizedData object - explicit clinic_id setting
  const sanitizedData = {
    ...sanitizedPayload,
    visit_id: resolvedVisitId, // VARCHAR display ID (e.g., "VIS-00001")
    encounter_id: resolvedEncounterId, // UUID reference to visits.id
    clinic_id: validatedClinicId, // VARCHAR clinic_id (e.g., "CLN-001") - FK references clinics(clinic_id)
    doctor_id: doctorId,
    consultation_date: new Date().toISOString(),
    status: 'Completed',
  };

  // Debug log to verify clinic_id handling
  log.info(
    '[createConsultation] Final payload clinic_id:',
    sanitizedData.clinic_id,
    'from candidate UUID:',
    candidateClinicUuid,
  );

  const { data, error } = await supabase
    .from('consultations')
    .insert([sanitizedData])
    .select()
    .single();

  if (error) throw error;
  return data as ConsultationDTO;
};

// =============================================================================
// Update Consultation
// =============================================================================

export const updateConsultation = async (
  consultation: UpdateConsultationDTO,
): Promise<ConsultationDTO> => {
  const {
    consultation_id,
    version,
    edit_reason,
    edit_reason_details,
    ...updates
  } = consultation;

  if (!edit_reason) {
    throw new Error('Please select an edit reason before saving changes.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('consultations')
    .select('*')
    .eq('consultation_id', consultation_id)
    .single();

  if (fetchError) throw fetchError;

  if (!isWithinEditWindow(existing.created_at)) {
    throw new Error(
      'Edit window expired. Consultation records can only be edited within 15 minutes of submission.',
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Session expired. Please sign in again.');
  }

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  const performedBy = staffRecord?.staff_id || authData.user.id;

  // Sanitize data - convert empty strings to null for date fields
  const sanitizedUpdates = {
    ...sanitizeConsultationPayload(updates),
    updated_at: new Date().toISOString(),
  };

  let data: ConsultationDTO;

  if (typeof version === 'number') {
    data = await updateWithLock<ConsultationDTO>(
      'consultations',
      consultation_id,
      sanitizedUpdates,
      version,
      {
        modifiedBy: authData.user.id,
        logConflict: true,
      },
    );
  } else {
    const { data: fallbackData, error } = await supabase
      .from('consultations')
      .update(sanitizedUpdates)
      .eq('consultation_id', consultation_id)
      .select()
      .single();

    if (error) throw error;
    data = fallbackData as ConsultationDTO;
  }

  await logAudit({
    encounterId:
      data.encounter_id ||
      existing.encounter_id ||
      data.visit_id ||
      existing.visit_id ||
      consultation_id,
    patientId: data.patient_id || existing.patient_id,
    action: 'UPDATE',
    entityType: 'consultation',
    entityId: consultation_id,
    performedBy,
    oldValue: existing,
    newValue: data,
    notes: JSON.stringify({
      edit_reason,
      edit_reason_label: getConsultationEditReasonLabel(edit_reason),
      edit_reason_details: normalizeString(edit_reason_details),
    }),
  });

  return data as ConsultationDTO;
};

// =============================================================================
// Delete Consultation
// =============================================================================

export const deleteConsultation = async (
  consultationId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('consultation_id', consultationId);

  if (error) throw error;
};

// =============================================================================
// Create Lab Order
// =============================================================================

export const createLabOrder = async (
  consultationId: string,
  patientId: string,
  visitId: string | null,
  order: LabOrderDTO,
  orderedBy: string,
): Promise<void> => {
  // Resolve identifiers to match internal schema
  const { visitUuid, visitPublicId } = await resolveVisitIdentifiers(visitId);
  const encounterId = visitUuid ?? visitPublicId ?? '';
  const patientVarcharId = await resolvePatientVarcharId(patientId);

  // Check if patient is NHIS
  const patientIsNhis = await isPatientNhis(patientId);

  // Get lab test details including NHIS authorization requirement
  const { data: labTest } = await supabase
    .from('lab_test_catalogue')
    .select('name, code, price, requires_nhis_authorization')
    .eq('id', order.test_id)
    .single();

  // Determine if this specific service requires NHIS approval
  // Only services marked with requires_nhis_authorization=true go to NHIS module
  const serviceRequiresNhisApproval =
    patientIsNhis && labTest?.requires_nhis_authorization === true;

  // Insert into lab_requests with Pending status
  // Billing will be created when the Lab module approves this request
  const { data: insertedRequest, error } = await supabase
    .from('lab_requests')
    .insert([
      {
        consultation_id: consultationId,
        patient_id: patientVarcharId, // VARCHAR like 'PT-00001'
        visit_id: visitPublicId ?? visitUuid, // VARCHAR display ID (V-XXXXX)
        encounter_id: encounterId, // UUID primary link
        test_id: order.test_id,
        ordered_by: orderedBy,
        clinical_notes: order.clinical_notes,
        priority: order.priority || 'Normal',
        status: 'Pending',
        // Only set pending NHIS status if service requires NHIS authorization
        nhis_approval_status: serviceRequiresNhisApproval
          ? 'pending'
          : 'not_required',
      },
    ])
    .select('request_id')
    .single();

  if (error) throw error;

  // Only create NHIS approval request if service is marked as requiring NHIS authorization
  if (serviceRequiresNhisApproval && insertedRequest) {
    await createServiceApprovalRequest({
      serviceType: 'lab_request',
      serviceId: insertedRequest.request_id,
      serviceName: labTest?.name || 'Lab Test',
      serviceCode: labTest?.code,
      encounterId,
      patientId,
      estimatedCost: labTest?.price || 0,
      requestedBy: orderedBy,
      clinicalJustification: order.clinical_notes,
      requestReason:
        'Lab test ordered during consultation - requires NHIS pre-authorization',
    });
  }

  // NOTE: Billing order is NOT created here.
  // The Lab module will create the billing order when the request is approved.
  // This ensures requests are reviewed before billing.
};

const requiresRadiologyNhisApproval = (params: {
  requiresNhisAuthorization?: boolean | null;
  isNhisCovered?: boolean | null;
  nhisPercentage?: number | null;
}): boolean => {
  const { requiresNhisAuthorization, isNhisCovered, nhisPercentage } = params;

  if (requiresNhisAuthorization === true) return true;
  if (isNhisCovered === false) return true;

  if (
    typeof nhisPercentage === 'number' &&
    nhisPercentage >= 0 &&
    nhisPercentage < 100
  ) {
    return true;
  }

  return false;
};

// =============================================================================
// Create Radiology Order
// =============================================================================

export const createRadiologyOrder = async (
  consultationId: string,
  patientId: string,
  visitId: string | null,
  order: RadiologyOrderDTO,
  orderedBy: string,
): Promise<void> => {
  // Resolve identifiers
  const { visitUuid, visitPublicId } = await resolveVisitIdentifiers(visitId);
  const encounterId = visitUuid ?? visitPublicId ?? '';
  const patientVarcharId = await resolvePatientVarcharId(patientId);

  // Check if patient is NHIS
  const patientIsNhis = await isPatientNhis(patientId);

  // Get imaging details including NHIS authorization requirement
  const { data: imaging } = await supabase
    .from('imaging_catalogue')
    .select(
      'id, modality, name, code, price, requires_nhis_authorization, is_nhis_covered, nhis_percentage',
    )
    .eq('id', order.imaging_id)
    .single();

  // Determine if this specific imaging service requires NHIS approval.
  // Radiology now requires NHIS pre-auth when the service is not fully covered,
  // even if requires_nhis_authorization is not explicitly enabled.
  const serviceRequiresNhisApproval =
    patientIsNhis &&
    requiresRadiologyNhisApproval({
      requiresNhisAuthorization: imaging?.requires_nhis_authorization,
      isNhisCovered: imaging?.is_nhis_covered,
      nhisPercentage: imaging?.nhis_percentage,
    });

  // Insert into radiology_requests with Pending status
  // Billing will be created when the Radiology module approves this request
  const { data: insertedRequest, error } = await supabase
    .from('radiology_requests')
    .insert([
      {
        consultation_id: consultationId,
        patient_id: patientVarcharId, // VARCHAR like 'PT-00001'
        visit_id: visitPublicId ?? visitUuid, // VARCHAR display ID (V-XXXXX)
        encounter_id: encounterId, // UUID primary link
        imaging_id: order.imaging_id,
        imaging_type: imaging?.modality || 'Other',
        body_part: order.body_part,
        ordered_by: orderedBy,
        clinical_indication: order.clinical_indication,
        priority: order.priority || 'Normal',
        status: 'Pending',
        // Only set pending NHIS status if service requires NHIS authorization
        nhis_approval_status: serviceRequiresNhisApproval
          ? 'pending'
          : 'not_required',
      },
    ])
    .select('request_id')
    .single();

  if (error) throw error;

  // Only create NHIS approval request if service is marked as requiring NHIS authorization
  if (serviceRequiresNhisApproval && insertedRequest) {
    await createServiceApprovalRequest({
      serviceType: 'radiology_request',
      serviceId: insertedRequest.request_id,
      serviceName: imaging?.name || 'Radiology Study',
      serviceCode: imaging?.code,
      encounterId,
      patientId,
      estimatedCost: imaging?.price || 0,
      requestedBy: orderedBy,
      clinicalJustification: order.clinical_indication,
      requestReason:
        'Radiology ordered during consultation - requires NHIS pre-authorization',
    });
  }

  // NOTE: Billing order is NOT created here.
  // The Radiology module will create the billing order when the request is approved.
  // This ensures requests are reviewed before billing.
};

// =============================================================================
// Create Prescription
// =============================================================================

export const createPrescription = async (
  consultationId: string,
  patientId: string,
  visitId: string | null,
  prescription: PrescriptionOrderDTO,
  doctorId: string,
): Promise<void> => {
  // Resolve identifiers
  const { visitUuid, visitPublicId } = await resolveVisitIdentifiers(visitId);
  const encounterId = visitUuid ?? visitPublicId ?? '';
  const patientVarcharId = await resolvePatientVarcharId(patientId);

  // Check if patient is NHIS
  const patientIsNhis = await isPatientNhis(patientId);

  // Get drug details including NHIS authorization requirement
  const { data: drug } = await supabase
    .from('drug_catalogue')
    .select('name, code, unit_price, requires_nhis_authorization')
    .eq('id', prescription.drug_id)
    .single();

  // Calculate estimated cost based on quantity
  const estimatedCost =
    (drug?.unit_price || 0) * (prescription.quantity_prescribed || 1);

  // Determine if this specific drug requires NHIS approval
  // Only drugs marked with requires_nhis_authorization=true go to NHIS module
  const serviceRequiresNhisApproval =
    patientIsNhis && drug?.requires_nhis_authorization === true;

  // Insert into prescriptions with Pending status
  // Billing will be created when the Pharmacy module approves this prescription
  const { data: insertedPrescription, error } = await supabase
    .from('prescriptions')
    .insert([
      {
        consultation_id: consultationId,
        patient_id: patientVarcharId, // VARCHAR like 'PT-00001'
        visit_id: visitPublicId ?? visitUuid, // VARCHAR display ID (V-XXXXX)
        encounter_id: encounterId, // UUID primary link
        drug_id: prescription.drug_id,
        doctor_id: doctorId,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        route: prescription.route,
        quantity_prescribed: prescription.quantity_prescribed,
        instructions: prescription.instructions,
        status: 'Pending',
        // Only set pending NHIS status if drug requires NHIS authorization
        nhis_approval_status: serviceRequiresNhisApproval
          ? 'pending'
          : 'not_required',
      },
    ])
    .select('prescription_id')
    .single();

  if (error) throw error;

  // Only create NHIS approval request if drug is marked as requiring NHIS authorization
  if (serviceRequiresNhisApproval && insertedPrescription) {
    await createServiceApprovalRequest({
      serviceType: 'prescription',
      serviceId: insertedPrescription.prescription_id,
      serviceName: drug?.name || 'Medication',
      serviceCode: drug?.code,
      encounterId,
      patientId,
      estimatedCost,
      requestedBy: doctorId,
      clinicalJustification: prescription.instructions,
      requestReason:
        'Prescription ordered during consultation - requires NHIS pre-authorization',
    });
  }

  // NOTE: Billing order is NOT created here.
  // The Pharmacy module will create the billing order when the prescription is approved.
  // This ensures prescriptions are reviewed before billing.
};

// =============================================================================
// Get Lab Test Catalogue
// =============================================================================

export const getLabTestCatalogue = async (): Promise<LabTestCatalogue[]> => {
  const { data, error } = await supabase
    .from('lab_test_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data || []).map((item) => ({
    test_id: item.id,
    test_code: item.code,
    test_name: item.name,
    category: item.category || 'General',
    description: null,
    normal_range: null,
    unit: null,
    price: item.price || 0,
    nhis_eligible: true,
    turnaround_time: item.tat_minutes,
    sample_type: item.specimen_type,
    is_active: item.is_active,
    created_at: item.created_at,
    requires_nhis_authorization: item.requires_nhis_authorization || false,
  })) as unknown as LabTestCatalogue[];
};

// =============================================================================
// Get Imaging Catalogue
// =============================================================================

export const getImagingCatalogue = async (): Promise<ImagingCatalogue[]> => {
  const { data, error } = await supabase
    .from('imaging_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data || []).map((item) => ({
    imaging_id: item.id,
    imaging_code: item.code,
    imaging_name: item.name,
    imaging_type: item.modality,
    category: null,
    body_part: item.body_part,
    description: null,
    preparation_instructions: null,
    price: item.price || 0,
    nhis_eligible: true,
    nhis_percentage: null,
    duration_minutes: 0,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    requires_nhis_authorization: item.requires_nhis_authorization || false,
  })) as unknown as ImagingCatalogue[];
};

// =============================================================================
// Get Procedure Catalogue (General, Dental, Surgery, etc.)
// =============================================================================

export interface ProcedureCatalogue {
  procedure_id: string;
  procedure_code: string;
  procedure_name: string;
  procedure_type: string;
  price: number;
  nhis_price: number;
  nhis_eligible: boolean;
  description?: string;
  requires_admission?: boolean;
  typical_duration_minutes?: number;
  requires_nhis_authorization?: boolean;
}

export const getProcedureCatalogue = async (): Promise<
  ProcedureCatalogue[]
> => {
  // First try procedure_catalogue table (new seeded data)
  const { data: catalogueData, error: catalogueError } = await supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (!catalogueError && catalogueData && catalogueData.length > 0) {
    return catalogueData.map((item) => ({
      procedure_id: item.id,
      procedure_code: item.code,
      procedure_name: item.name,
      procedure_type: item.category,
      price: item.base_price || 0,
      nhis_price: item.nhis_price || 0,
      nhis_eligible: true,
      description: item.description,
      requires_admission: item.requires_admission,
      typical_duration_minutes: item.typical_duration_minutes,
      requires_nhis_authorization: item.requires_nhis_authorization || false,
    }));
  }

  // Fallback to nhis_procedures if procedure_catalogue is empty
  const { data, error } = await supabase
    .from('nhis_procedures')
    .select('*')
    .not(
      'type',
      'in',
      '("Laboratory Investigations","Radiology Investigations")',
    )
    .order('name');

  if (error) throw error;

  return (data || []).map((item) => ({
    procedure_id: item.id,
    procedure_code: item.code,
    procedure_name: item.name,
    procedure_type: item.type,
    price: item.price || 0,
    nhis_price: item.price || 0,
    nhis_eligible: true,
    requires_nhis_authorization: false,
  }));
};

// =============================================================================
// Get Drug Catalogue
// =============================================================================

export const getDrugCatalogue = async (): Promise<DrugCatalogue[]> => {
  const { data, error } = await supabase
    .from('drug_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data || []).map((item) => ({
    drug_id: item.id,
    drug_code: item.code,
    drug_name: item.name,
    dosage_form: item.dosage_form,
    strengths: item.strengths,
    presentation: item.presentation,
    price: item.price,
    stock_quantity: item.stock_quantity || 0,
    reorder_level: item.reorder_level || 0,
    is_nhis_covered: item.is_nhis_covered || false,
    is_active: item.is_active,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || item.created_at || new Date().toISOString(),
    requires_nhis_authorization: item.requires_nhis_authorization || false,
  }));
};

// =============================================================================
// Get Wards Catalogue (for Admission Orders)
// =============================================================================

export interface WardCatalogue {
  ward_id: string;
  ward_name: string;
  ward_type: string;
  total_beds: number;
  available_beds: number;
  daily_rate?: number;
}

export const getWardsCatalogue = async (): Promise<WardCatalogue[]> => {
  // Fetch all wards first, then filter client-side to handle different schemas
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .order('ward_type')
    .order('name');

  if (error) {
    log.error('Error fetching wards:', error);
    throw error;
  }

  // Filter active wards - handle both is_active and status columns
  const activeWards = (data || []).filter((item) => {
    // If is_active column exists, use it (true or null/undefined means active)
    if ('is_active' in item) {
      return item.is_active !== false;
    }
    // If status column exists, check for 'Active'
    if ('status' in item) {
      return item.status === 'Active';
    }
    // If neither column exists, include the ward
    return true;
  });

  return activeWards.map((item) => ({
    ward_id: item.id,
    ward_name: item.name,
    ward_type: item.ward_type || 'General',
    total_beds: item.total_beds || 0,
    available_beds: item.available_beds || 0,
    daily_rate: item.daily_rate,
  }));
};

// =============================================================================
// Get Today's Consultations Count
// =============================================================================

export const getTodayConsultationsCount = async (
  doctorId?: string,
): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .gte('consultation_date', today.toISOString());

  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }

  const { count } = await query;
  return count || 0;
};

// =============================================================================
// Get Doctor's Patients (My Patients)
// =============================================================================

export interface MyPatientsParams {
  doctorId: string;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PatientSummary {
  patient_id: string;
  emr_number?: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  gender: string;
  date_of_birth: string;
  contact_phone?: string;
  total_visits: number;
  last_visit_date: string;
  last_diagnosis?: string;
}

export interface MyPatientsResult {
  patients: PatientSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export const getMyPatients = async (
  params: MyPatientsParams,
): Promise<MyPatientsResult> => {
  const { doctorId, page = 1, limit = 20, search, dateFrom, dateTo } = params;
  const offset = (page - 1) * limit;

  // First, get distinct patients the doctor has consulted
  let query = supabase
    .from('consultations')
    .select(
      `
      patient_id,
      consultation_date,
      diagnosis,
      patient:patients!fk_consultations_patient(
        patient_id,
        emr_number,
        first_name,
        middle_name,
        surname,
        gender,
        date_of_birth,
        contact_phone
      )
    `,
    )
    .eq('doctor_id', doctorId)
    .order('consultation_date', { ascending: false });

  if (dateFrom) {
    query = query.gte('consultation_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('consultation_date', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching my patients:', error);
    return { patients: [], total: 0, page, totalPages: 0 };
  }

  // Group by patient and get summary
  const patientMap = new Map<string, PatientSummary>();

  data?.forEach((consultation) => {
    const patient = consultation.patient as any;
    const patientId = patient.patient_id;

    if (patientMap.has(patientId)) {
      const existing = patientMap.get(patientId)!;
      existing.total_visits++;
      // Keep the most recent diagnosis
      if (
        consultation.consultation_date > existing.last_visit_date &&
        consultation.diagnosis
      ) {
        existing.last_diagnosis = consultation.diagnosis;
        existing.last_visit_date = consultation.consultation_date;
      }
    } else {
      patientMap.set(patientId, {
        patient_id: patientId,
        emr_number: patient.emr_number,
        first_name: patient.first_name,
        middle_name: patient.middle_name,
        surname: patient.surname,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        contact_phone: patient.contact_phone,
        total_visits: 1,
        last_visit_date: consultation.consultation_date,
        last_diagnosis: consultation.diagnosis,
      });
    }
  });

  let patients = Array.from(patientMap.values());

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    patients = patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.surname.toLowerCase().includes(searchLower) ||
        p.contact_phone?.includes(search),
    );
  }

  // Sort by last visit date (most recent first)
  patients.sort(
    (a, b) =>
      new Date(b.last_visit_date).getTime() -
      new Date(a.last_visit_date).getTime(),
  );

  const total = patients.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedPatients = patients.slice(offset, offset + limit);

  return {
    patients: paginatedPatients,
    total,
    page,
    totalPages,
  };
};

// =============================================================================
// Get Patient Full Medical History
// =============================================================================

export interface PatientMedicalHistory {
  patient: {
    id: string; // UUID primary key - used for DB relations
    patient_id: string; // Display ID
    emr_number?: string; // EMR number for display
    first_name: string;
    middle_name?: string;
    surname: string;
    gender: string;
    date_of_birth: string;
    contact_phone?: string;
    email?: string;
    address?: string;
    blood_group?: string;
    allergies?: string[];
  };
  consultations: Array<{
    consultation_id: string;
    consultation_date: string;
    complaints: string;
    diagnosis?: string;
    treatment_plan?: string;
    doctor?: { first_name: string; last_name: string } | null;
    lab_requests?: Array<{
      request_id: string;
      test_name: string;
      status: string;
      result?: string;
      result_value?: string;
      result_unit?: string;
      reference_range?: string;
      is_abnormal?: boolean;
      is_critical?: boolean;
      interpretation?: string;
    }>;
    radiology_requests?: Array<{
      request_id: string;
      imaging_name: string;
      status: string;
      report?: string;
      findings?: string;
      impression?: string;
      body_part?: string;
      modality?: string;
    }>;
    prescriptions?: Array<{
      prescription_id: string;
      drug_name: string;
      dosage: string;
      status: string;
    }>;
  }>;
  lab_requests?: Array<{
    request_id: string;
    test_name: string;
    status: string;
    result?: string;
    result_value?: string;
    result_unit?: string;
    reference_range?: string;
    is_abnormal?: boolean;
    is_critical?: boolean;
    interpretation?: string;
    requested_at?: string;
    consultation_id?: string | null;
  }>;
  vitals: Array<{
    record_id: string;
    recorded_at: string;
    vital_signs: {
      blood_pressure?: { systolic: number; diastolic: number };
      pulse_rate?: number;
      temperature?: number;
      respiratory_rate?: number;
      oxygen_saturation?: number;
      weight?: number;
      height?: number;
    };
    nurse: { first_name: string; last_name: string };
  }>;
  stats: {
    totalConsultations: number;
    totalLabTests: number;
    totalRadiology: number;
    totalPrescriptions: number;
    lastVisitDate?: string;
  };
}

export const getPatientMedicalHistory = async (
  patientId: string,
): Promise<PatientMedicalHistory | null> => {
  // Guard against empty patientId
  if (!patientId || patientId.trim() === '') {
    log.warn('getPatientMedicalHistory called with empty patientId');
    return null;
  }

  try {
    // Detect if patientId is UUID or VARCHAR
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        patientId,
      );

    // First get patient to get both patient_id (VARCHAR) and id (UUID)
    let patient: any = null;
    let patientError: any = null;

    if (isUUID) {
      // Query by UUID id
      const result = await supabase
        .from('patients')
        .select(
          'id, patient_id, emr_number, first_name, middle_name, surname, gender, date_of_birth, contact_phone, email, residential_address, blood_group, known_allergies',
        )
        .eq('id', patientId)
        .single();
      patient = result.data;
      patientError = result.error;
    } else {
      // Query by VARCHAR patient_id
      const result = await supabase
        .from('patients')
        .select(
          'id, patient_id, emr_number, first_name, middle_name, surname, gender, date_of_birth, contact_phone, email, residential_address, blood_group, known_allergies',
        )
        .eq('patient_id', patientId)
        .single();
      patient = result.data;
      patientError = result.error;
    }

    if (patientError || !patient) {
      log.error(
        'Error fetching patient:',
        patientError,
        'patientId:',
        patientId,
        'isUUID:',
        isUUID,
      );
      return null;
    }

    // Now run remaining queries in parallel with correct IDs
    // - consultations uses VARCHAR patient_id (patient.patient_id)
    // - vitals uses UUID patient.id
    const [consultationsResult, vitalsResult] = await Promise.all([
      // Consultations with doctor info - limited fields for speed
      supabase
        .from('consultations')
        .select(
          `
        consultation_id,
        consultation_date,
        complaints,
        diagnosis,
        treatment_plan,
        doctor_id,
        doctor:staff!fk_consultations_doctor(first_name, last_name)
      `,
        )
        .eq('patient_id', patient.patient_id) // Always use VARCHAR patient_id
        .order('consultation_date', { ascending: false })
        .limit(30),

      // Latest vitals (vitals table uses UUID)
      supabase
        .from('vitals')
        .select(
          `
        id,
        date_recorded,
        temperature,
        pulse,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        respiratory_rate,
        oxygen_saturation,
        weight,
        height,
        nurse:staff!vitals_nurse_id_fkey(first_name, last_name)
      `,
        )
        .eq('patient_id', patient.id) // UUID
        .order('date_recorded', { ascending: false })
        .limit(10),
    ]);

    const consultations = consultationsResult.data || [];
    const vitalsRecords = vitalsResult.data || [];

    // Pull all patient lab requests so records surfaces can render consultation-linked
    // and standalone (e.g. nutrition-triggered) lab history.
    const consultationIds = new Set(
      consultations
        .map((c: any) => c.consultation_id)
        .filter((id: string | undefined): id is string => Boolean(id)),
    );

    const labRequestsByConsultation = new Map<
      string,
      Array<{
        request_id: string;
        test_name: string;
        status: string;
        result?: string;
        result_value?: string;
        result_unit?: string;
        reference_range?: string;
        is_abnormal?: boolean;
        is_critical?: boolean;
        interpretation?: string;
      }>
    >();

    const standaloneLabRequests: Array<{
      request_id: string;
      test_name: string;
      status: string;
      result?: string;
      result_value?: string;
      result_unit?: string;
      reference_range?: string;
      is_abnormal?: boolean;
      is_critical?: boolean;
      interpretation?: string;
      requested_at?: string;
      consultation_id?: string | null;
    }> = [];

    {
      const { data: labRequests } = await supabase
        .from('lab_requests')
        .select(
          'request_id, consultation_id, test_id, status, result, result_value, result_unit, reference_range, is_critical, interpretation, created_at',
        )
        .eq('patient_id', patient.patient_id)
        .order('created_at', { ascending: false })
        .limit(200);

      const requestIds = (labRequests || [])
        .map((l: any) => l.request_id)
        .filter(Boolean);

      // Fetch lab_results for richer data (result_value, unit, reference_range, is_abnormal)
      let labResultsMap = new Map<string, any>();
      if (requestIds.length > 0) {
        const { data: labResults } = await supabase
          .from('lab_results')
          .select(
            'request_id, result_value, unit, reference_range, is_abnormal, is_critical, comments',
          )
          .in('request_id', requestIds);

        (labResults || []).forEach((lr: any) => {
          // Keep first result per request (primary result)
          if (!labResultsMap.has(lr.request_id)) {
            labResultsMap.set(lr.request_id, lr);
          }
        });
      }

      const testIds = [
        ...new Set(
          (labRequests || []).map((l: any) => l.test_id).filter(Boolean),
        ),
      ];
      let testMap = new Map<string, string>();

      if (testIds.length > 0) {
        const { data: labTests } = await supabase
          .from('lab_test_catalogue')
          .select('id, name')
          .in('id', testIds);
        testMap = new Map(
          (labTests || []).map((test: any) => [String(test.id), test.name]),
        );
      }

      (labRequests || []).forEach((request: any) => {
        const consultationKey = request.consultation_id;
        const labResult = labResultsMap.get(request.request_id);
        const mappedRequest = {
          request_id: request.request_id,
          test_name: testMap.get(String(request.test_id)) || 'Lab Test',
          status: request.status,
          result: request.result || undefined,
          result_value:
            labResult?.result_value || request.result_value || undefined,
          result_unit: labResult?.unit || request.result_unit || undefined,
          reference_range:
            labResult?.reference_range ||
            request.reference_range ||
            undefined,
          is_abnormal: labResult?.is_abnormal || false,
          is_critical:
            labResult?.is_critical || request.is_critical || false,
          interpretation: request.interpretation || undefined,
        };

        if (consultationKey && consultationIds.has(consultationKey)) {
          const existing = labRequestsByConsultation.get(consultationKey) || [];
          existing.push(mappedRequest);
          labRequestsByConsultation.set(consultationKey, existing);
          return;
        }

        standaloneLabRequests.push({
          ...mappedRequest,
          requested_at: request.created_at || undefined,
          consultation_id: consultationKey || null,
        });
      });
    }

    const consultationLabCount = Array.from(
      labRequestsByConsultation.values(),
    ).reduce((acc, requests) => acc + requests.length, 0);
    const totalLabTests = consultationLabCount + standaloneLabRequests.length;

    // Fetch radiology requests for this patient
    const radiologyByConsultation = new Map<string, any[]>();
    let totalRadiologyCount = 0;
    {
      const { data: radRequests } = await supabase
        .from('radiology_requests')
        .select(
          'request_id, consultation_id, status, findings, impression, report, body_part, imaging_type, imaging_id, result_file_url, created_at',
        )
        .eq('patient_id', patient.patient_id)
        .order('created_at', { ascending: false })
        .limit(200);

      // Resolve imaging names from catalogue
      const imagingIds = [
        ...new Set(
          (radRequests || []).map((r: any) => r.imaging_id).filter(Boolean),
        ),
      ];
      let imagingMap = new Map<string, { name: string; modality: string }>();
      if (imagingIds.length > 0) {
        const { data: imagingCatalogue } = await supabase
          .from('imaging_catalogue')
          .select('id, name, modality')
          .in('id', imagingIds);
        (imagingCatalogue || []).forEach((img: any) => {
          imagingMap.set(String(img.id), {
            name: img.name,
            modality: img.modality,
          });
        });
      }

      (radRequests || []).forEach((req: any) => {
        const imaging = imagingMap.get(String(req.imaging_id));
        const mapped = {
          request_id: req.request_id,
          imaging_name:
            imaging?.name || req.imaging_type || 'Imaging Study',
          status: req.status,
          report: req.report || undefined,
          findings: req.findings || undefined,
          impression: req.impression || undefined,
          body_part: req.body_part || undefined,
          modality: imaging?.modality || req.imaging_type || undefined,
        };

        const consultationKey = req.consultation_id;
        if (consultationKey && consultationIds.has(consultationKey)) {
          const existing =
            radiologyByConsultation.get(consultationKey) || [];
          existing.push(mapped);
          radiologyByConsultation.set(consultationKey, existing);
        }
        totalRadiologyCount++;
      });
    }

    // Format consultations - resolve missing doctors only if needed
    const consultationsWithMissingDoctors = consultations.filter(
      (c: any) => !c.doctor && c.doctor_id,
    );

    const fallbackDoctorMap = new Map<
      string,
      { first_name: string; last_name: string }
    >();

    // Only fetch missing doctors if there are any (batch fetch)
    if (consultationsWithMissingDoctors.length > 0) {
      const uniqueDoctorIds = [
        ...new Set(
          consultationsWithMissingDoctors.map((c: any) => c.doctor_id),
        ),
      ];

      const { data: staffRecords } = await supabase
        .from('staff')
        .select('staff_id, user_id, first_name, last_name')
        .or(
          uniqueDoctorIds
            .map((id) => `staff_id.eq.${id},user_id.eq.${id}`)
            .join(','),
        );

      if (staffRecords) {
        staffRecords.forEach((s: any) => {
          fallbackDoctorMap.set(s.staff_id, {
            first_name: s.first_name,
            last_name: s.last_name,
          });
          if (s.user_id) {
            fallbackDoctorMap.set(s.user_id, {
              first_name: s.first_name,
              last_name: s.last_name,
            });
          }
        });
      }
    }

    const formattedConsultations = consultations.map((c: any) => {
      const resolvedDoctor =
        (c.doctor as any) || fallbackDoctorMap.get(c.doctor_id);
      return {
        consultation_id: c.consultation_id,
        consultation_date: c.consultation_date,
        complaints: c.complaints,
        diagnosis: c.diagnosis,
        treatment_plan: c.treatment_plan,
        doctor: resolvedDoctor
          ? {
              first_name: resolvedDoctor.first_name,
              last_name: resolvedDoctor.last_name,
            }
          : null,
        lab_requests: labRequestsByConsultation.get(c.consultation_id) || [],
        radiology_requests:
          radiologyByConsultation.get(c.consultation_id) || [],
        prescriptions: [],
      };
    });

    // Format vitals from vitals table
    const formattedVitals = vitalsRecords.map((v: any) => ({
      record_id: v.id,
      recorded_at: v.date_recorded,
      vital_signs: {
        blood_pressure:
          v.blood_pressure_systolic && v.blood_pressure_diastolic
            ? {
                systolic: v.blood_pressure_systolic,
                diastolic: v.blood_pressure_diastolic,
              }
            : undefined,
        pulse_rate: v.pulse,
        temperature: v.temperature,
        respiratory_rate: v.respiratory_rate,
        oxygen_saturation: v.oxygen_saturation,
        weight: v.weight,
        height: v.height,
      },
      nurse: v.nurse || { first_name: 'N/A', last_name: '' },
    }));

    return {
      patient: {
        id: patient.id, // UUID primary key - CRITICAL for encounter lookups
        patient_id: patient.patient_id,
        emr_number: patient.emr_number,
        first_name: patient.first_name,
        middle_name: patient.middle_name,
        surname: patient.surname,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        contact_phone: patient.contact_phone,
        email: patient.email,
        address: patient.residential_address,
        blood_group: patient.blood_group,
        allergies: patient.known_allergies,
      },
      consultations: formattedConsultations,
      lab_requests: standaloneLabRequests,
      vitals: formattedVitals,
      stats: {
        totalConsultations: formattedConsultations.length,
        totalLabTests,
        totalRadiology: totalRadiologyCount,
        totalPrescriptions: 0,
        lastVisitDate: formattedConsultations[0]?.consultation_date,
      },
    };
  } catch (err) {
    log.error('getPatientMedicalHistory error:', err);
    return null;
  }
};

// =============================================================================
// BATCH ORDER CREATION - Optimized for Performance
// Creates all orders in minimal database calls
// =============================================================================

interface BatchOrdersParams {
  /** Consultation ID (UUID) - optional, only include if creating from consultation context */
  consultationId?: string | null;
  patientId: string;
  visitId?: string | null;
  /** Encounter ID (UUID) - preferred over visitId for direct encounter linking */
  encounterId?: string | null;
  orderedBy: string;
  labOrders: LabOrderDTO[];
  radiologyOrders: RadiologyOrderDTO[];
  procedureOrders: ProcedureOrderDTO[];
  prescriptions: PrescriptionOrderDTO[];
  /** Diagnosis array from consultation - passed to all orders for clinical context */
  diagnosis?: string[];
  /** Justification for late encounter additions */
  justification?: string;
  /** Clinical examination findings for NHIS pre-authorization */
  clinicalFindings?: string;
  /** Patient name for NHIS approval display */
  patientName?: string;
  /** Patient EMR number for NHIS approval display */
  patientEmrNumber?: string;
}

interface BatchOrderResult {
  labRequests: Array<{
    request_id: string;
    test_id: string;
    test_name?: string;
    price?: number;
  }>;
  radiologyRequests: Array<{
    request_id: string;
    imaging_id: string;
    imaging_name?: string;
    price?: number;
  }>;
  procedureRequests: Array<{
    request_id: string;
    procedure_id: string;
    procedure_name?: string;
    price?: number;
  }>;
  prescriptionRecords: Array<{
    prescription_id: string;
    drug_id: string;
    drug_name?: string;
    price?: number;
    quantity?: number;
  }>;
  /** Number of services sent to NHIS approval queue */
  nhisRequestsCount: number;
  /** True when direct procedure_requests insert was skipped due to RLS (42501) */
  procedureRlsFallbackTriggered: boolean;
}

/**
 * Create all consultation orders (lab, radiology, prescriptions) in batch
 * This is much faster than individual calls - reduces ~10 DB calls per order to ~3-4 total
 *
 * STANDARDIZED ID USAGE:
 * - encounter_id: UUID (visits.id) - THE single encounter identifier for all tables
 * - patient_id: VARCHAR for service tables (lab_requests, etc.), UUID for billing_orders
 */
export const createBatchOrders = async (
  params: BatchOrdersParams,
): Promise<BatchOrderResult> => {
  const {
    consultationId,
    patientId,
    visitId,
    encounterId: providedEncounterId,
    orderedBy,
    labOrders = [],
    radiologyOrders = [],
    procedureOrders = [],
    prescriptions = [],
    diagnosis = [], // Clinical diagnosis to pass to all orders
    justification,
    clinicalFindings,
    patientName,
    patientEmrNumber,
  } = params;

  // Patient IDs: VARCHAR for service tables, UUID for billing
  // Resolve both forms regardless of what was passed (UUID or VARCHAR)
  const patientVarcharId = await resolvePatientVarcharId(patientId); // VARCHAR like "PT-00001"
  const patientUuid = await resolvePatientUuid(patientId); // UUID for billing_orders

  // Encounter ID Resolution:
  // 1. If encounterId is provided directly and is a valid UUID, use it
  // 2. Otherwise fall back to visitId resolution
  let encounterId: string | null = null;

  // First check if encounterId was provided directly (from QuickOrderModal)
  if (providedEncounterId && UUID_REGEX.test(providedEncounterId)) {
    encounterId = providedEncounterId;
  } else if (visitId) {
    // Fall back to visitId resolution
    if (UUID_REGEX.test(visitId)) {
      encounterId = visitId; // Already a UUID
    } else {
      // Legacy VARCHAR visit_id - resolve to UUID
      const { data } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_id', visitId)
        .maybeSingle();
      encounterId = data?.id || null;
    }
  }

  log.info('[BatchOrders] providedEncounterId:', providedEncounterId);
  log.info('[BatchOrders] patientVarcharId:', patientVarcharId);
  log.info('[BatchOrders] patientUuid:', patientUuid);
  log.info('[BatchOrders] encounterId (UUID):', encounterId);

  // =========================================================================
  // ENCOUNTER-CENTRIC VALIDATION
  // All records MUST have valid encounter_id - this enforces the hierarchy
  // =========================================================================
  if (!encounterId) {
    throw new Error(
      'Encounter ID is required for all clinical records. No record can exist without a valid encounter.',
    );
  }

  // Verify we have a valid UUID for billing
  if (!UUID_REGEX.test(patientUuid)) {
    log.error(
      '[BatchOrders] Failed to resolve patient UUID, got:',
      patientUuid,
    );
    throw new Error(
      `Invalid patient UUID format: ${patientUuid}. Expected UUID.`,
    );
  }

  // consultation_id is optional on downstream tables and must reference consultations.consultation_id when present.
  // Specialty flows may pass UUIDs from non-consultation tables; validate before attaching to avoid FK violations.
  let validConsultationId: string | null = null;
  if (consultationId && UUID_REGEX.test(consultationId)) {
    const { data: consultationRow, error: consultationLookupError } =
      await supabase
        .from('consultations')
        .select('consultation_id')
        .eq('consultation_id', consultationId)
        .maybeSingle();

    if (
      consultationLookupError &&
      consultationLookupError.code !== 'PGRST116'
    ) {
      log.warn(
        '[BatchOrders] Consultation lookup failed; omitting consultation_id from order inserts:',
        consultationLookupError,
      );
    }

    if (consultationRow?.consultation_id) {
      validConsultationId = consultationRow.consultation_id;
    }
  }

  const result: BatchOrderResult = {
    labRequests: [],
    radiologyRequests: [],
    procedureRequests: [],
    prescriptionRecords: [],
    nhisRequestsCount: 0, // Track NHIS approval requests created
    procedureRlsFallbackTriggered: false,
  };

  // Get current user/staff once
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .maybeSingle();

  // If staff not found by email, try resolving from orderedBy (VARCHAR staff_id like 'DOC-7430')
  if (!staffData && orderedBy) {
    const { data: fallbackStaff } = await supabase
      .from('staff')
      .select('id, staff_id')
      .eq('staff_id', orderedBy)
      .maybeSingle();
    if (fallbackStaff) {
      staffData = fallbackStaff;
      log.info(
        `[BatchOrders] Staff resolved from orderedBy='${orderedBy}' → UUID='${fallbackStaff.id}'`,
      );
    }
  }

  // Evaluate NHIS once so we can set request-level NHIS status correctly at insert time.
  const patientIsNhisBatch = await isPatientNhis(patientId);

  // =========================================================================
  // 1. Fetch all catalogue data in parallel (single query per catalogue)
  // =========================================================================
  const [labTests, imagingItems, procedures, drugs] = await Promise.all([
    labOrders.length > 0
      ? supabase
          .from('lab_test_catalogue')
          .select('id, name, code, price')
          .in(
            'id',
            labOrders.map((o) => o.test_id),
          )
          .then((r) => r.data || [])
      : Promise.resolve(
          [] as { id: string; name: string; code: string; price: number }[],
        ),

    radiologyOrders.length > 0
      ? supabase
          .from('imaging_catalogue')
          .select(
            'id, name, code, price, modality, requires_nhis_authorization, is_nhis_covered, nhis_percentage',
          )
          .in(
            'id',
            radiologyOrders.map((o) => o.imaging_id),
          )
          .then((r) => r.data || [])
      : Promise.resolve(
          [] as {
            id: string;
            name: string;
            code: string;
            price: number;
            modality: string;
            requires_nhis_authorization?: boolean | null;
            is_nhis_covered?: boolean | null;
            nhis_percentage?: number | null;
          }[],
        ),

    procedureOrders.length > 0
      ? supabase
          .from('nhis_procedures')
          .select('id, name, code, price, type')
          .in(
            'id',
            procedureOrders.map((o) => o.procedure_id),
          )
          .then((r) => r.data || [])
      : Promise.resolve(
          [] as {
            id: string;
            name: string;
            code: string;
            price: number;
            type: string;
          }[],
        ),

    prescriptions.length > 0
      ? supabase
          .from('drug_catalogue')
          .select('id, name, price')
          .in(
            'id',
            prescriptions.map((p) => p.drug_id).filter((id) => !!id),
          )
          .then((r) => r.data || [])
      : Promise.resolve([] as { id: string; name: string; price: number }[]),
  ]);

  // Create lookup maps
  const labTestMap = new Map(labTests.map((t) => [t.id, t]));
  const imagingMap = new Map(imagingItems.map((i) => [i.id, i]));
  const procedureMap = new Map(procedures.map((p) => [p.id, p]));
  const drugMap = new Map(drugs.map((d) => [d.id, d]));

  // =========================================================================
  // 2. Batch insert all orders in parallel
  // STANDARDIZED: encounter_id is UUID (visits.id) for all tables
  // patient_id: VARCHAR for service tables, UUID for billing_orders
  // =========================================================================
  const [labInsertResult, radiologyInsertResult, prescriptionInsertResult] =
    await Promise.all([
      // Lab requests batch insert
      labOrders.length > 0
        ? supabase
            .from('lab_requests')
            .insert(
              labOrders.map((order) => ({
                ...(validConsultationId
                  ? { consultation_id: validConsultationId }
                  : {}),
                patient_id: patientVarcharId, // VARCHAR like "PT-00001"
                encounter_id: encounterId, // UUID - THE standard encounter identifier
                test_id: order.test_id,
                ordered_by: orderedBy,
                clinical_notes: order.clinical_notes,
                priority: order.priority || 'Normal',
                status: 'Pending',
                diagnosis:
                  order.diagnosis && order.diagnosis.length > 0
                    ? order.diagnosis
                    : diagnosis && diagnosis.length > 0
                      ? diagnosis
                      : null, // Pass diagnosis for clinical context
              })),
            )
            .select('request_id, test_id')
        : Promise.resolve({ data: [], error: null }),

      // Radiology requests batch insert
      radiologyOrders.length > 0
        ? supabase
            .from('radiology_requests')
            .insert(
              radiologyOrders.map((order) => {
                const imaging = imagingMap.get(order.imaging_id);
                const serviceRequiresNhisApproval =
                  patientIsNhisBatch &&
                  requiresRadiologyNhisApproval({
                    requiresNhisAuthorization:
                      imaging?.requires_nhis_authorization,
                    isNhisCovered: imaging?.is_nhis_covered,
                    nhisPercentage: imaging?.nhis_percentage,
                  });
                return {
                  ...(validConsultationId
                    ? { consultation_id: validConsultationId }
                    : {}),
                  patient_id: patientVarcharId, // VARCHAR like "PT-00001"
                  encounter_id: encounterId, // UUID - THE standard encounter identifier
                  imaging_id: order.imaging_id,
                  imaging_type: imaging?.modality || 'Other',
                  body_part: order.body_part,
                  ordered_by: orderedBy,
                  clinical_indication: order.clinical_indication,
                  priority: order.priority || 'Normal',
                  status: 'Pending',
                  nhis_approval_status: serviceRequiresNhisApproval
                    ? 'pending'
                    : 'not_required',
                  diagnosis: order.diagnosis || diagnosis, // Pass diagnosis for clinical context
                };
              }),
            )
            .select('request_id, imaging_id')
        : Promise.resolve({ data: [], error: null }),

      // Prescriptions batch insert
      prescriptions.length > 0
        ? supabase
            .from('prescriptions')
            .insert(
              prescriptions.map((rx) => ({
                ...(validConsultationId
                  ? { consultation_id: validConsultationId }
                  : {}),
                patient_id: patientVarcharId, // VARCHAR like "PT-00001"
                encounter_id: encounterId, // UUID - THE standard encounter identifier
                drug_id: rx.drug_id || null, // Allow null if not provided
                drug_name: rx.drug_name, // Store the name directly
                doctor_id: orderedBy,
                dosage: rx.dosage,
                frequency: rx.frequency,
                duration: rx.duration,
                route: rx.route,
                quantity_prescribed: rx.quantity_prescribed,
                instructions: rx.instructions,
                status: 'Pending',
                diagnosis:
                  rx.diagnosis && rx.diagnosis.length > 0
                    ? rx.diagnosis
                    : diagnosis && diagnosis.length > 0
                      ? diagnosis
                      : null, // Pass diagnosis for clinical context
                clinical_notes: rx.clinical_notes, // Why was this drug prescribed
              })),
            )
            .select('prescription_id, drug_id, drug_name')
        : Promise.resolve({ data: [], error: null }),
    ]);

  let procedureInsertResult: {
    data: Array<{ request_id: string; procedure_id: string }>;
    error: any;
  } = { data: [], error: null };

  if (procedureOrders.length > 0) {
    const procedureInsert = await supabase
      .from('procedure_requests')
      .insert(
        procedureOrders.map((order) => {
          const proc = procedureMap.get(order.procedure_id);
          return {
            ...(validConsultationId
              ? { consultation_id: validConsultationId }
              : {}),
            patient_id: patientVarcharId,
            encounter_id: encounterId,
            procedure_id: order.procedure_id,
            procedure_type: proc?.type || 'General',
            ordered_by: orderedBy,
            notes: order.notes,
            priority: order.priority || 'Normal',
            status: 'Pending',
          };
        }),
      )
      .select('request_id, procedure_id');

    if (procedureInsert.error?.code === '42501') {
      // procedure_requests may be RLS-restricted for doctor roles.
      // Continue without failing consultation; procedure workflow is also handled via clinical_requests.
      log.warn(
        '[BatchOrders] Skipping direct procedure_requests insert due to RLS policy:',
        procedureInsert.error,
      );
      result.procedureRlsFallbackTriggered = true;
      procedureInsertResult = { data: [], error: null };
    } else {
      procedureInsertResult = {
        data: (procedureInsert.data || []) as Array<{
          request_id: string;
          procedure_id: string;
        }>,
        error: procedureInsert.error,
      };
    }
  }

  if (labInsertResult.error) throw labInsertResult.error;
  if (radiologyInsertResult.error) throw radiologyInsertResult.error;
  if (procedureInsertResult.error) throw procedureInsertResult.error;
  if (prescriptionInsertResult.error) throw prescriptionInsertResult.error;

  // Map results with catalogue data
  result.labRequests = (labInsertResult.data || []).map((r) => {
    const test = labTestMap.get(r.test_id);
    return { ...r, test_name: test?.name, price: test?.price };
  });

  result.radiologyRequests = (radiologyInsertResult.data || []).map((r) => {
    const img = imagingMap.get(r.imaging_id);
    return { ...r, imaging_name: img?.name, price: img?.price };
  });

  result.procedureRequests = (procedureInsertResult.data || []).map((r) => {
    const proc = procedureMap.get(r.procedure_id);
    return { ...r, procedure_name: proc?.name, price: proc?.price };
  });

  result.prescriptionRecords = (prescriptionInsertResult.data || []).map(
    (r) => {
      const drug = r.drug_id ? drugMap.get(r.drug_id) : null;

      // Try to find the original order to get the quantity
      // 1. Match by drug_id (if available and matches)
      // 2. Match by drug_name (robust string match)
      const rxOrder = prescriptions.find((p) => {
        const idMatch = r.drug_id && p.drug_id === r.drug_id;
        const nameMatch =
          p.drug_name &&
          r.drug_name &&
          p.drug_name.trim().toLowerCase() === r.drug_name.trim().toLowerCase();
        return idMatch || nameMatch;
      });

      // Determine price: Catalogue price > Order price > 0
      const price = drug?.price || rxOrder?.price || 0;

      return {
        ...r,
        drug_name: drug?.name || r.drug_name,
        price,
        quantity: rxOrder?.quantity_prescribed || 1,
      };
    },
  );

  // =========================================================================
  // 2.5 CREATE NHIS APPROVAL ENTRIES FOR SERVICES REQUIRING PRE-AUTH
  // =========================================================================
  // Check which services are pending NHIS approval (set by database trigger)
  // and create nhis_approvals entries with clinical context for NHIS desk
  const provisionalDiagnosis = diagnosis?.join('; ') || '';

  if (patientIsNhisBatch) {
    // Fetch which lab tests require NHIS authorization
    const labTestsWithAuth = await supabase
      .from('lab_test_catalogue')
      .select('id, name, code, price, requires_nhis_authorization')
      .in(
        'id',
        labOrders.map((o) => o.test_id),
      )
      .eq('requires_nhis_authorization', true);

    // Fetch imaging items and apply the same radiology NHIS rule used at insert time.
    const imagingWithAuth = await supabase
      .from('imaging_catalogue')
      .select(
        'id, name, code, price, requires_nhis_authorization, is_nhis_covered, nhis_percentage',
      )
      .in(
        'id',
        radiologyOrders.map((o) => o.imaging_id),
      );

    // Fetch which procedures require NHIS authorization
    // Try procedure_catalogue first; if the requires_nhis_authorization column
    // doesn't exist (migration 087 not applied), fall back to nhis_procedures
    let proceduresWithAuth: { data: any[] | null; error: any } = {
      data: [],
      error: null,
    };
    if (procedureOrders.length > 0) {
      proceduresWithAuth = await supabase
        .from('procedure_catalogue')
        .select('id, name, code, base_price, requires_nhis_authorization')
        .in(
          'id',
          procedureOrders.map((o) => o.procedure_id),
        )
        .eq('requires_nhis_authorization', true);

      if (proceduresWithAuth.error) {
        log.warn(
          '[BatchOrders] procedure_catalogue query failed (requires_nhis_authorization column may not exist), trying nhis_procedures fallback:',
          proceduresWithAuth.error.message,
        );
        // Fallback: try nhis_procedures table which may have the column
        const fallback = await supabase
          .from('nhis_procedures')
          .select('id, name, code, price')
          .in(
            'id',
            procedureOrders.map((o) => o.procedure_id),
          );
        proceduresWithAuth = { data: fallback.data || [], error: null };
      }
    }

    // Fetch which drugs require NHIS authorization
    const drugsWithAuth = await supabase
      .from('drug_catalogue')
      .select('id, name, price, requires_nhis_authorization')
      .in('id', prescriptions.map((p) => p.drug_id).filter(Boolean) as string[])
      .eq('requires_nhis_authorization', true);

    // Create sets of IDs that require auth
    const labAuthSet = new Set((labTestsWithAuth.data || []).map((t) => t.id));
    const imagingAuthSet = new Set(
      (imagingWithAuth.data || [])
        .filter((i) =>
          requiresRadiologyNhisApproval({
            requiresNhisAuthorization: i.requires_nhis_authorization,
            isNhisCovered: i.is_nhis_covered,
            nhisPercentage: i.nhis_percentage,
          }),
        )
        .map((i) => i.id),
    );
    const procAuthSet = new Set(
      (proceduresWithAuth.data || []).map((p) => p.id),
    );
    const drugAuthSet = new Set((drugsWithAuth.data || []).map((d) => d.id));

    // Build NHIS approval entries
    const nhisApprovalEntries: any[] = [];

    // Lab requests needing NHIS approval
    result.labRequests.forEach((req) => {
      const order = labOrders.find((o) => o.test_id === req.test_id);
      if (labAuthSet.has(req.test_id)) {
        const test = labTestMap.get(req.test_id);
        // Use order-level diagnosis if available, otherwise fall back to params-level
        const orderDiagnosis = order?.diagnosis?.length
          ? order.diagnosis.join('; ')
          : provisionalDiagnosis;
        nhisApprovalEntries.push({
          service_request_id: req.request_id,
          service_type: 'lab_request',
          service_category: 'lab',
          encounter_id: encounterId,
          patient_id: patientUuid, // Use UUID for foreign key constraint
          patient_emr_number: patientEmrNumber,
          patient_name: patientName,
          service_name: test?.name || 'Lab Test',
          service_code: test?.code,
          estimated_cost: test?.price || 0,
          requested_by: staffData?.id || null, // Must be UUID (staff.id), never VARCHAR staff_id
          requested_at: new Date().toISOString(),
          request_reason: `Lab test: ${test?.name || 'Unknown'} - requires NHIS pre-authorization`,
          clinical_justification: order?.clinical_notes || justification,
          clinical_findings: clinicalFindings,
          provisional_diagnosis: orderDiagnosis,
          status: 'pending',
        });
      }
    });

    // Radiology requests needing NHIS approval
    result.radiologyRequests.forEach((req) => {
      const order = radiologyOrders.find(
        (o) => o.imaging_id === req.imaging_id,
      );
      if (imagingAuthSet.has(req.imaging_id)) {
        const img = imagingMap.get(req.imaging_id);
        // Use order-level diagnosis if available, otherwise fall back to params-level
        const orderDiagnosis = order?.diagnosis?.length
          ? order.diagnosis.join('; ')
          : provisionalDiagnosis;
        nhisApprovalEntries.push({
          service_request_id: req.request_id,
          service_type: 'radiology_request',
          service_category: 'radiology',
          encounter_id: encounterId,
          patient_id: patientUuid, // Use UUID for foreign key constraint
          patient_emr_number: patientEmrNumber,
          patient_name: patientName,
          service_name: img?.name || 'Radiology Study',
          service_code: img?.code,
          estimated_cost: img?.price || 0,
          requested_by: staffData?.id || null, // Must be UUID (staff.id), never VARCHAR staff_id
          requested_at: new Date().toISOString(),
          request_reason: `Radiology: ${img?.name || 'Unknown'} - requires NHIS pre-authorization`,
          clinical_justification: order?.clinical_indication || justification,
          clinical_findings: clinicalFindings,
          provisional_diagnosis: orderDiagnosis,
          status: 'pending',
        });
      }
    });

    // Procedure requests needing NHIS approval
    result.procedureRequests.forEach((req) => {
      const order = procedureOrders.find(
        (o) => o.procedure_id === req.procedure_id,
      );
      if (procAuthSet.has(req.procedure_id)) {
        const proc = procedureMap.get(req.procedure_id);
        // Use order-level diagnosis if available, otherwise fall back to params-level
        const orderDiagnosis = order?.diagnosis?.length
          ? order.diagnosis.join('; ')
          : provisionalDiagnosis;
        nhisApprovalEntries.push({
          service_request_id: req.request_id,
          service_type: 'procedure',
          service_category: 'procedure',
          encounter_id: encounterId,
          patient_id: patientUuid, // Use UUID for foreign key constraint
          patient_emr_number: patientEmrNumber,
          patient_name: patientName,
          service_name: proc?.name || 'Procedure',
          service_code: proc?.code,
          estimated_cost: proc?.price || 0,
          requested_by: staffData?.id || null, // Must be UUID (staff.id), never VARCHAR staff_id
          requested_at: new Date().toISOString(),
          request_reason: `Procedure: ${proc?.name || 'Unknown'} - requires NHIS pre-authorization`,
          clinical_justification:
            order?.clinical_notes || order?.notes || justification,
          clinical_findings: clinicalFindings,
          provisional_diagnosis: orderDiagnosis,
          status: 'pending',
        });
      }
    });

    // Prescription requests needing NHIS approval
    result.prescriptionRecords.forEach((rx) => {
      const order = prescriptions.find(
        (p) => p.drug_id === rx.drug_id || p.drug_name === rx.drug_name,
      );
      if (rx.drug_id && drugAuthSet.has(rx.drug_id)) {
        const drug = drugMap.get(rx.drug_id);
        // Use order-level diagnosis if available, otherwise fall back to params-level
        const orderDiagnosis = order?.diagnosis?.length
          ? order.diagnosis.join('; ')
          : provisionalDiagnosis;
        nhisApprovalEntries.push({
          service_request_id: rx.prescription_id,
          service_type: 'prescription',
          service_category: 'pharmacy',
          encounter_id: encounterId,
          patient_id: patientUuid, // Use UUID for foreign key constraint
          patient_emr_number: patientEmrNumber,
          patient_name: patientName,
          service_name: drug?.name || rx.drug_name || 'Prescription',
          estimated_cost: (drug?.price || rx.price || 0) * (rx.quantity || 1),
          requested_by: staffData?.id || null, // Must be UUID (staff.id), never VARCHAR staff_id
          requested_at: new Date().toISOString(),
          request_reason: `Prescription: ${drug?.name || rx.drug_name || 'Unknown'} - requires NHIS pre-authorization`,
          clinical_justification: order?.clinical_notes || justification,
          clinical_findings: clinicalFindings,
          provisional_diagnosis: orderDiagnosis,
          status: 'pending',
        });
      }
    });

    // Batch insert NHIS approval entries
    if (nhisApprovalEntries.length > 0) {
      const { error: nhisError } = await supabase
        .from('nhis_approvals')
        .insert(nhisApprovalEntries);

      if (nhisError) {
        log.error('Failed to create NHIS approval entries:', nhisError);
        // Fallback: retry with only base columns (migration 101 may not be applied)
        // Base columns: service_request_id, service_type, encounter_id, patient_id,
        //   service_name, service_code, estimated_cost, requested_by, requested_at,
        //   request_reason, clinical_justification, status
        const baseEntries = nhisApprovalEntries.map((e) => ({
          service_request_id: e.service_request_id,
          service_type: e.service_type,
          encounter_id: e.encounter_id,
          patient_id: e.patient_id,
          service_name: e.service_name,
          service_code: e.service_code,
          estimated_cost: e.estimated_cost,
          requested_by: e.requested_by,
          requested_at: e.requested_at,
          request_reason: e.request_reason,
          clinical_justification: e.clinical_justification,
          status: e.status,
        }));
        const { error: fallbackError } = await supabase
          .from('nhis_approvals')
          .insert(baseEntries);
        if (fallbackError) {
          log.error(
            'Failed to create NHIS approval entries (fallback):',
            fallbackError,
          );
          // Don't throw - the service requests are already created
          // NHIS desk can still see them in the pending approvals view
        } else {
          result.nhisRequestsCount = nhisApprovalEntries.length;
          log.info(
            `[BatchOrders] Created ${nhisApprovalEntries.length} NHIS approval entries (base columns only)`,
          );
        }
      } else {
        // Update count of NHIS requests successfully created
        result.nhisRequestsCount = nhisApprovalEntries.length;
      }
    }
  }

  // =========================================================================
  // 3. BILLING CREATION REMOVED - BILLING IS NOW CREATED ON APPROVAL
  // =========================================================================
  // Billing orders are NO LONGER created immediately when consultation is submitted.
  // Instead, billing is created when:
  // - Lab requests are ACCEPTED in the Lab module
  // - Radiology requests are ACCEPTED in the Radiology module
  // - Prescriptions are ACCEPTED in the Pharmacy module
  // - Procedures are APPROVED in the Clinical Requests module
  // - Admissions are CONFIRMED in the In-Patient module
  //
  // This ensures the hospital only bills for services that have been approved
  // and will actually be performed.
  // =========================================================================

  return result;
};
