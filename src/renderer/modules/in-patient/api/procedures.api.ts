import { supabase } from '../../../api/supabaseClient';

export interface ProcedureDTO {
  id: string;
  admission_id: string;
  encounter_id: string;
  patient_id: string;
  procedure_name: string;
  procedure_number: string;
  status: 'scheduled' | 'pre_op' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'emergency';
  scheduled_date: string;
  actual_start_time?: string;
  actual_end_time?: string;

  // Clinical
  indication?: string;
  pre_procedure_diagnosis?: string;
  post_procedure_diagnosis?: string;
  findings?: string;
  technique_description?: string;
  procedure_notes?: string;
  complications?: string;
  estimated_blood_loss_ml?: number;
  anesthesia_type?: string;
  anesthesia_notes?: string;
  post_op_instructions?: string;

  // Staff
  primary_surgeon_id?: string;
  anesthesiologist_id?: string;

  // Relations
  surgeon?: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export async function getProceduresByAdmission(
  admissionId: string,
): Promise<ProcedureDTO[]> {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      surgeon:staff!procedures_primary_surgeon_id_fkey(first_name, last_name)
    `,
    )
    .eq('admission_id', admissionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Known columns in the procedures table — used to strip non-DB fields before insert/update
const PROCEDURES_COLUMNS = new Set([
  'facility_id',
  'patient_id',
  'encounter_id',
  'admission_id',
  'procedure_number',
  'catalogue_id',
  'procedure_name',
  'procedure_code',
  'scheduled_date',
  'scheduled_duration_minutes',
  'priority',
  'status',
  'actual_start_time',
  'actual_end_time',
  'actual_duration_minutes',
  'location',
  'room_number',
  'indication',
  'pre_procedure_diagnosis',
  'post_procedure_diagnosis',
  'laterality',
  'body_site',
  'anesthesia_type',
  'anesthesiologist_id',
  'anesthesia_start_time',
  'anesthesia_end_time',
  'anesthesia_notes',
  'primary_surgeon_id',
  'assistant_surgeons',
  'scrub_nurse_id',
  'circulating_nurse_id',
  'other_staff',
  'consent_obtained',
  'consent_date',
  'consent_obtained_by',
  'consent_document_id',
  'consent_notes',
  'pre_op_checklist',
  'fasting_confirmed',
  'allergies_verified',
  'site_marked',
  'blood_products_available',
  'procedure_notes',
  'findings',
  'technique_description',
  'complications',
  'estimated_blood_loss_ml',
  'specimens_collected',
  'implants_used',
  'post_op_instructions',
  'recovery_location',
  'recovery_start_time',
  'recovery_end_time',
  'discharge_criteria_met',
  'post_op_diagnosis',
  'billable',
  'billed',
  'billing_id',
  'cancellation_reason',
  'cancelled_by',
  'cancelled_at',
  'notes',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'clinical_request_id',
]);

/** Strip any keys that are not actual columns in the procedures table */
function stripNonDbFields(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (PROCEDURES_COLUMNS.has(key)) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

export async function createProcedure(data: any): Promise<ProcedureDTO> {
  // Generate a temp procedure number if not provided
  let procedureNumber = data.procedure_number;
  if (!procedureNumber) {
    const { data: num } = await supabase.rpc('generate_procedure_number');
    procedureNumber = num || `PRC-${Date.now()}`;
  }

  const row = stripNonDbFields(data);

  const { data: result, error } = await supabase
    .from('procedures')
    .insert({
      ...row,
      procedure_number: procedureNumber,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateProcedure(
  id: string,
  data: any,
): Promise<ProcedureDTO> {
  const row = stripNonDbFields(data);

  const { data: result, error } = await supabase
    .from('procedures')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}
