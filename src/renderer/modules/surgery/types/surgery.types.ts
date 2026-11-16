/**
 * Surgery/Theatre Module Types
 * Encounter-centric surgery workflow management
 */

// ============================================================================
// ENUMS
// ============================================================================

export type SurgeryStatus =
  | 'Planned'
  | 'Pre_Op'
  | 'In_Theatre'
  | 'Recovery'
  | 'Completed'
  | 'Cancelled'
  | 'Complicated';

export type ASAClassification =
  | 'ASA_I'
  | 'ASA_II'
  | 'ASA_III'
  | 'ASA_IV'
  | 'ASA_V'
  | 'ASA_VI';

export type AnesthesiaType =
  | 'General'
  | 'Regional'
  | 'Spinal'
  | 'Epidural'
  | 'Local'
  | 'Sedation'
  | 'Combined'
  | 'None';

export type WoundClassification =
  | 'Clean'
  | 'Clean_Contaminated'
  | 'Contaminated'
  | 'Dirty_Infected';

export type ConsentType = 'Written' | 'Verbal' | 'Emergency' | 'Guardian';

export type SurgeryDisposition =
  | 'Ward'
  | 'ICU'
  | 'HDU'
  | 'PACU'
  | 'Day_Case_Discharge'
  | 'Morgue';

export type SurgeryPriority = 'Emergency' | 'Urgent' | 'Routine' | 'Elective';

export type TheatreRoomType =
  | 'General'
  | 'Cardiac'
  | 'Neuro'
  | 'Orthopedic'
  | 'Obstetric'
  | 'Ophthalmic'
  | 'ENT'
  | 'Minor'
  | 'Emergency'
  | 'Hybrid';

export type TheatreRoomStatus =
  | 'Available'
  | 'In_Use'
  | 'Cleaning'
  | 'Maintenance'
  | 'Reserved';

export type TheatreScheduleStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'In_Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Delayed';

export type Laterality = 'Left' | 'Right' | 'Bilateral' | 'NA';

// ============================================================================
// THEATRE ROOM TYPES
// ============================================================================

export interface TheatreRoom {
  id: string;
  facility_id: string;
  room_code: string;
  room_name: string;
  room_type: TheatreRoomType;
  capacity_level: string;
  standard_equipment: string[];
  special_equipment: string[];
  is_active: boolean;
  current_status: TheatreRoomStatus;
  current_surgery_id: string | null;
  floor: string | null;
  building: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TheatreRoomFormData {
  room_code: string;
  room_name: string;
  room_type: TheatreRoomType;
  capacity_level?: string;
  standard_equipment?: string[];
  special_equipment?: string[];
  floor?: string;
  building?: string;
}

// ============================================================================
// SURGERY TYPES
// ============================================================================

export interface SecondaryProcedure {
  procedure_id?: string;
  procedure_name: string;
  procedure_code?: string;
  laterality?: Laterality;
  body_site?: string;
}

export interface BloodProduct {
  product_type: string;
  units: number;
  given_at: string;
  given_by?: string;
}

export interface SpecimenCollected {
  specimen_type: string;
  quantity: number;
  container: string;
  sent_to_lab: boolean;
  lab_number?: string;
  collected_at: string;
}

export interface ImplantUsed {
  implant_name: string;
  manufacturer?: string;
  lot_number?: string;
  serial_number?: string;
  size?: string;
  location: string;
}

export interface DrainPlaced {
  drain_type: string;
  location: string;
  size?: string;
  output_at_placement?: number;
}

export interface SurgicalTeamMember {
  staff_id: string;
  staff_name: string;
  role: string;
}

export interface ICD10Code {
  code: string;
  description: string;
  is_primary: boolean;
}

// WHO Safe Surgery Checklist
export interface SafeSurgeryChecklist {
  sign_in: {
    patient_identity_confirmed?: boolean;
    site_marked?: boolean;
    anesthesia_safety_check?: boolean;
    pulse_oximeter_functional?: boolean;
    allergies_checked?: boolean;
    airway_risk_assessed?: boolean;
    aspiration_risk_assessed?: boolean;
    blood_loss_risk_assessed?: boolean;
    completed_at?: string;
    completed_by?: string;
  };
  time_out: {
    team_members_introduced?: boolean;
    patient_identity_confirmed?: boolean;
    site_and_procedure_confirmed?: boolean;
    antibiotic_prophylaxis?: boolean;
    critical_steps_discussed?: boolean;
    anesthesia_concerns?: boolean;
    nursing_concerns?: boolean;
    completed_at?: string;
    completed_by?: string;
  };
  sign_out: {
    procedure_confirmed?: boolean;
    instrument_count_correct?: boolean;
    sponge_count_correct?: boolean;
    specimens_labeled?: boolean;
    equipment_issues?: boolean;
    recovery_concerns?: boolean;
    completed_at?: string;
    completed_by?: string;
  };
}

export interface Surgery {
  id: string;
  surgery_number: string;

  // Core references (ENCOUNTER-CENTRIC)
  encounter_id: string;
  patient_id: string;
  admission_id: string | null;
  facility_id: string;

  // Procedure information
  procedure_catalogue_id: string | null;
  primary_procedure: string;
  secondary_procedures: SecondaryProcedure[];
  laterality: Laterality | null;
  body_site: string | null;

  // Scheduling
  scheduled_date: string | null;
  scheduled_time: string | null;
  scheduled_duration_minutes: number | null;
  theatre_room_id: string | null;
  theatre_room: string | null;
  priority: SurgeryPriority;

  // Clinical request linkage
  clinical_request_id: string | null;

  // NHIS/Insurance authorization
  requires_nhis_approval: boolean;
  nhis_approval_id: string | null;
  nhis_authorization_code: string | null;
  nhis_authorization_expiry: string | null;

  // Clinical indication
  indication: string;
  pre_op_diagnosis: string | null;
  post_op_diagnosis: string | null;
  icd10_codes: ICD10Code[];

  // Status tracking
  status: SurgeryStatus;

  // Timeline tracking
  theatre_entry_time: string | null;
  anesthesia_start_time: string | null;
  incision_time: string | null;
  closure_time: string | null;
  anesthesia_end_time: string | null;
  theatre_exit_time: string | null;

  // Surgical team
  primary_surgeon_id: string;
  assistant_surgeon_ids: string[];
  anesthetist_id: string | null;
  anesthesia_nurse_id: string | null;
  scrub_nurse_id: string | null;
  circulating_nurse_id: string | null;
  other_staff: SurgicalTeamMember[];

  // Consent documentation
  consent_obtained: boolean;
  consent_type: ConsentType | null;
  consent_date: string | null;
  consent_obtained_by: string | null;
  consent_witness_id: string | null;
  consent_document_url: string | null;
  consent_notes: string | null;

  // Pre-op checklist (WHO Safe Surgery)
  preop_checklist: SafeSurgeryChecklist;
  preop_checklist_completed: boolean;
  preop_checklist_completed_at: string | null;
  preop_checklist_completed_by: string | null;

  // Intra-operative details
  patient_position: string | null;
  skin_prep: string | null;
  approach: string | null;
  incision: string | null;
  findings: string | null;
  procedure_details: string | null;
  technique_description: string | null;
  estimated_blood_loss_ml: number | null;
  blood_products_given: BloodProduct[];
  specimens_collected: SpecimenCollected[];
  implants_used: ImplantUsed[];
  drains_placed: DrainPlaced[];
  closure_technique: string | null;
  wound_classification: WoundClassification | null;
  intraop_complications: string | null;

  // Post-operative
  recovery_location: string | null;
  recovery_start_time: string | null;
  recovery_end_time: string | null;
  disposition: SurgeryDisposition | null;
  transfer_ward_id: string | null;
  postop_instructions: string | null;
  postop_complications: string | null;

  // Sign-off (multi-signature)
  surgeon_signoff_by: string | null;
  surgeon_signoff_at: string | null;
  anesthetist_signoff_by: string | null;
  anesthetist_signoff_at: string | null;
  nurse_signoff_by: string | null;
  nurse_signoff_at: string | null;
  is_locked: boolean;
  locked_at: string | null;

  // Billing integration
  billable: boolean;
  billing_order_id: string | null;

  // Cancellation
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  // Audit trail
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

// Form data for creating/updating surgery
export interface SurgeryFormData {
  // Procedure information
  procedure_catalogue_id?: string;
  primary_procedure: string;
  secondary_procedures?: SecondaryProcedure[];
  laterality?: Laterality;
  body_site?: string;

  // Scheduling
  scheduled_date?: string;
  scheduled_time?: string;
  scheduled_duration_minutes?: number;
  theatre_room_id?: string;
  priority: SurgeryPriority;

  // Clinical request linkage
  clinical_request_id?: string;

  // NHIS/Insurance authorization
  requires_nhis_approval?: boolean;
  nhis_authorization_code?: string;

  // Clinical indication
  indication: string;
  pre_op_diagnosis?: string;
  icd10_codes?: ICD10Code[];

  // Surgical team
  primary_surgeon_id: string;
  assistant_surgeon_ids?: string[];
  anesthetist_id?: string;
  scrub_nurse_id?: string;
  circulating_nurse_id?: string;
}

// Consent form data
export interface SurgeryConsentData {
  consent_obtained: boolean;
  consent_type: ConsentType;
  consent_date: string;
  consent_obtained_by: string;
  consent_witness_id?: string;
  consent_document_url?: string;
  consent_notes?: string;
}

// Intra-op documentation form
export interface SurgeryIntraOpData {
  patient_position?: string;
  skin_prep?: string;
  approach?: string;
  incision?: string;
  findings?: string;
  procedure_details?: string;
  technique_description?: string;
  estimated_blood_loss_ml?: number;
  blood_products_given?: BloodProduct[];
  specimens_collected?: SpecimenCollected[];
  implants_used?: ImplantUsed[];
  drains_placed?: DrainPlaced[];
  closure_technique?: string;
  wound_classification?: WoundClassification;
  intraop_complications?: string;
  post_op_diagnosis?: string;
}

// Post-op form
export interface SurgeryPostOpData {
  post_op_diagnosis?: string;
  recovery_location?: string;
  disposition?: SurgeryDisposition;
  transfer_ward_id?: string;
  postop_instructions?: string;
  postop_complications?: string;
}

// Surgery with joined data for display
export interface SurgeryWithDetails extends Surgery {
  patient_name?: string;
  patient_emr_number?: string;
  patient_insurance_type?: string;
  surgeon_name?: string;
  anesthetist_name?: string;
  theatre_room_name?: string;
  admission_ward?: string;
}

// ============================================================================
// PRE-OP ASSESSMENT TYPES
// ============================================================================

export interface AirwayAssessment {
  mallampati_class?: '1' | '2' | '3' | '4';
  neck_mobility?: 'Full' | 'Limited' | 'Fixed';
  mouth_opening?: 'Normal' | 'Limited' | 'Severely Limited';
  thyromental_distance?: string;
  dentition?: string;
  upper_lip_bite_test?: '1' | '2' | '3';
  anticipated_difficulty?: boolean;
  notes?: string;
}

export interface InvestigationReview {
  investigation_type: string;
  date: string;
  result: string;
  is_normal: boolean;
  notes?: string;
}

export interface SurgeryPreopAssessment {
  id: string;
  surgery_id: string;
  assessment_date: string;
  assessed_by: string;

  // ASA Classification
  asa_classification: ASAClassification;
  asa_notes: string | null;

  // Airway assessment
  airway_assessment: AirwayAssessment;
  mallampati_class: string | null;
  neck_mobility: string | null;
  mouth_opening: string | null;
  dentition_notes: string | null;

  // Risk assessments
  cardiac_risk: string | null;
  pulmonary_risk: string | null;
  renal_risk: string | null;
  hepatic_risk: string | null;
  bleeding_risk: string | null;
  dvt_risk: string | null;

  // Verification
  allergies_verified: boolean;
  allergies_snapshot: Array<{ allergen: string; reaction: string }>;
  medications_reviewed: boolean;
  current_medications: Array<{
    medication: string;
    dose: string;
    frequency: string;
  }>;
  fasting_status: string | null;
  fasting_hours: number | null;

  // Investigations review
  investigations_reviewed: InvestigationReview[];
  pending_investigations: string | null;

  // Blood preparation
  blood_type: string | null;
  crossmatch_ordered: boolean;
  blood_units_ordered: number;

  // Final clearance
  fit_for_surgery: boolean | null;
  clearance_notes: string | null;
  special_considerations: string | null;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface PreopAssessmentFormData {
  asa_classification: ASAClassification;
  asa_notes?: string;
  airway_assessment?: AirwayAssessment;
  cardiac_risk?: string;
  pulmonary_risk?: string;
  renal_risk?: string;
  hepatic_risk?: string;
  bleeding_risk?: string;
  dvt_risk?: string;
  allergies_verified: boolean;
  allergies_snapshot?: Array<{ allergen: string; reaction: string }>;
  medications_reviewed: boolean;
  current_medications?: Array<{
    medication: string;
    dose: string;
    frequency: string;
  }>;
  fasting_status?: string;
  fasting_hours?: number;
  investigations_reviewed?: InvestigationReview[];
  pending_investigations?: string;
  blood_type?: string;
  crossmatch_ordered?: boolean;
  blood_units_ordered?: number;
  fit_for_surgery?: boolean;
  clearance_notes?: string;
  special_considerations?: string;
}

// ============================================================================
// ANESTHESIA RECORD TYPES
// ============================================================================

export interface MedicationDose {
  medication: string;
  dose: string;
  route: string;
  time: string;
}

export interface VitalSignEntry {
  time: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  spo2?: number;
  etco2?: number;
  temperature?: number;
  notes?: string;
}

export interface FluidGiven {
  fluid_type: string;
  volume_ml: number;
  start_time: string;
  end_time?: string;
}

export interface SurgeryAnesthesiaRecord {
  id: string;
  surgery_id: string;
  anesthetist_id: string;
  anesthesia_nurse_id: string | null;

  // Anesthesia type and technique
  anesthesia_type: AnesthesiaType;
  anesthesia_technique: string | null;

  // Airway management
  airway_management: string | null;
  tube_size: string | null;
  intubation_attempts: number | null;
  intubation_difficulty: string | null;

  // Medications administered
  premedication: MedicationDose[];
  induction_agents: MedicationDose[];
  maintenance_agents: MedicationDose[];
  muscle_relaxants: MedicationDose[];
  reversal_agents: MedicationDose[];
  other_medications: MedicationDose[];

  // Monitoring
  monitoring_used: string[];

  // Intraoperative record
  vital_signs_log: VitalSignEntry[];
  fluids_given: FluidGiven[];
  urine_output_ml: number | null;

  // Events and complications
  intraop_events: string | null;
  complications: string | null;

  // Recovery scoring (Aldrete)
  aldrete_score_initial: number | null;
  aldrete_score_discharge: number | null;
  recovery_notes: string | null;

  // Sign-off
  signed_off: boolean;
  signed_off_at: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AnesthesiaRecordFormData {
  anesthesia_type: AnesthesiaType;
  anesthesia_technique?: string;
  airway_management?: string;
  tube_size?: string;
  intubation_attempts?: number;
  intubation_difficulty?: string;
  premedication?: MedicationDose[];
  induction_agents?: MedicationDose[];
  maintenance_agents?: MedicationDose[];
  muscle_relaxants?: MedicationDose[];
  reversal_agents?: MedicationDose[];
  other_medications?: MedicationDose[];
  monitoring_used?: string[];
  vital_signs_log?: VitalSignEntry[];
  fluids_given?: FluidGiven[];
  urine_output_ml?: number;
  intraop_events?: string;
  complications?: string;
  aldrete_score_initial?: number;
  aldrete_score_discharge?: number;
  recovery_notes?: string;
}

// ============================================================================
// SURGERY CONSUMABLES TYPES
// ============================================================================

export interface SurgeryConsumable {
  id: string;
  surgery_id: string;
  inventory_item_id: string | null;
  item_name: string;
  item_code: string | null;
  category: string | null;
  quantity_used: number;
  unit: string | null;
  batch_number: string | null;
  serial_number: string | null;
  expiry_date: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  billable: boolean;
  is_implant: boolean;
  implant_details: ImplantUsed | null;
  recorded_at: string;
  recorded_by: string;
}

export interface SurgeryConsumableFormData {
  inventory_item_id?: string;
  item_name: string;
  item_code?: string;
  category?: string;
  quantity_used: number;
  unit?: string;
  batch_number?: string;
  serial_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  billable?: boolean;
  is_implant?: boolean;
  implant_details?: ImplantUsed;
}

// ============================================================================
// THEATRE SCHEDULE TYPES
// ============================================================================

export interface TheatreSchedule {
  id: string;
  theatre_room_id: string;
  surgery_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  schedule_status: TheatreScheduleStatus;
  primary_surgeon_id: string | null;
  anesthetist_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TheatreScheduleWithDetails extends TheatreSchedule {
  theatre_room_name?: string;
  theatre_room_code?: string;
  surgery_number?: string;
  patient_name?: string;
  patient_emr_number?: string;
  primary_procedure?: string;
  surgeon_name?: string;
  anesthetist_name?: string;
}

export interface TheatreScheduleFormData {
  theatre_room_id: string;
  surgery_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  primary_surgeon_id?: string;
  anesthetist_id?: string;
  notes?: string;
}

// ============================================================================
// DASHBOARD AND ANALYTICS TYPES
// ============================================================================

export interface SurgeryDashboardStats {
  today_scheduled: number;
  today_completed: number;
  today_in_progress: number;
  pending_consent: number;
  pending_preop: number;
  awaiting_nhis: number;
  emergency_pending: number;
  cancelled_today: number;
}

export interface TheatreUtilization {
  room_id: string;
  room_name: string;
  total_scheduled_minutes: number;
  total_available_minutes: number;
  utilization_percentage: number;
  surgeries_count: number;
  delays_count: number;
  average_turnover_minutes: number;
}

export interface SurgeonStats {
  surgeon_id: string;
  surgeon_name: string;
  surgeries_performed: number;
  total_operating_time_minutes: number;
  average_duration_minutes: number;
  complications_count: number;
}

// ============================================================================
// FILTER AND LIST TYPES
// ============================================================================

export interface SurgeryListFilters {
  status?: SurgeryStatus[];
  priority?: SurgeryPriority[];
  scheduled_date_from?: string;
  scheduled_date_to?: string;
  surgeon_id?: string;
  theatre_room_id?: string;
  requires_nhis_approval?: boolean;
  is_locked?: boolean;
  search?: string;
}

export interface TheatreScheduleFilters {
  date_from?: string;
  date_to?: string;
  theatre_room_id?: string;
  surgeon_id?: string;
  schedule_status?: TheatreScheduleStatus[];
}

// ============================================================================
// WORKFLOW TRANSITION TYPES
// ============================================================================

export interface SurgeryStatusTransition {
  from_status: SurgeryStatus;
  to_status: SurgeryStatus;
  requires_fields?: string[];
  requires_role?: string[];
  auto_timestamps?: string[];
}

export const SURGERY_STATUS_TRANSITIONS: SurgeryStatusTransition[] = [
  {
    from_status: 'Planned',
    to_status: 'Pre_Op',
    requires_fields: ['consent_obtained', 'preop_checklist_completed'],
    requires_role: ['surgeon', 'nurse'],
  },
  {
    from_status: 'Pre_Op',
    to_status: 'In_Theatre',
    requires_fields: ['theatre_room_id', 'anesthetist_id'],
    requires_role: ['surgeon', 'anesthetist'],
    auto_timestamps: ['theatre_entry_time'],
  },
  {
    from_status: 'In_Theatre',
    to_status: 'Recovery',
    requires_fields: ['closure_time'],
    requires_role: ['surgeon', 'anesthetist'],
    auto_timestamps: ['theatre_exit_time'],
  },
  {
    from_status: 'Recovery',
    to_status: 'Completed',
    requires_fields: ['disposition', 'postop_instructions'],
    requires_role: ['surgeon', 'nurse'],
    auto_timestamps: ['recovery_end_time'],
  },
  {
    from_status: 'Planned',
    to_status: 'Cancelled',
    requires_fields: ['cancellation_reason'],
    requires_role: ['surgeon', 'admin'],
    auto_timestamps: ['cancelled_at'],
  },
];

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

export function getSurgeryStatusColor(status: SurgeryStatus): string {
  const colors: Record<SurgeryStatus, string> = {
    Planned: 'bg-blue-100 text-blue-800',
    Pre_Op: 'bg-yellow-100 text-yellow-800',
    In_Theatre: 'bg-red-100 text-red-800',
    Recovery: 'bg-orange-100 text-orange-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-gray-100 text-gray-800',
    Complicated: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getPriorityColor(priority: SurgeryPriority): string {
  const colors: Record<SurgeryPriority, string> = {
    Emergency: 'bg-red-600 text-white',
    Urgent: 'bg-orange-500 text-white',
    Routine: 'bg-blue-500 text-white',
    Elective: 'bg-green-500 text-white',
  };
  return colors[priority] || 'bg-gray-500 text-white';
}

export function getTheatreRoomStatusColor(status: TheatreRoomStatus): string {
  const colors: Record<TheatreRoomStatus, string> = {
    Available: 'bg-green-100 text-green-800',
    In_Use: 'bg-red-100 text-red-800',
    Cleaning: 'bg-yellow-100 text-yellow-800',
    Maintenance: 'bg-orange-100 text-orange-800',
    Reserved: 'bg-blue-100 text-blue-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function canTransitionToStatus(
  currentStatus: SurgeryStatus,
  targetStatus: SurgeryStatus,
): boolean {
  return SURGERY_STATUS_TRANSITIONS.some(
    (t) => t.from_status === currentStatus && t.to_status === targetStatus,
  );
}

export function getASADescription(classification: ASAClassification): string {
  const descriptions: Record<ASAClassification, string> = {
    ASA_I: 'Normal healthy patient',
    ASA_II: 'Patient with mild systemic disease',
    ASA_III: 'Patient with severe systemic disease',
    ASA_IV:
      'Patient with severe systemic disease that is a constant threat to life',
    ASA_V: 'Moribund patient not expected to survive without operation',
    ASA_VI: 'Brain-dead patient for organ donation',
  };
  return descriptions[classification] || '';
}

export function getWoundClassificationDescription(
  classification: WoundClassification,
): string {
  const descriptions: Record<WoundClassification, string> = {
    Clean:
      'Elective, primarily closed, no acute inflammation, no break in technique',
    Clean_Contaminated:
      'Elective entry into respiratory, GI, or GU tract under controlled conditions',
    Contaminated:
      'Open fresh wounds, major breaks in sterile technique, gross spillage from GI tract',
    Dirty_Infected:
      'Old traumatic wounds, existing clinical infection, perforated viscera',
  };
  return descriptions[classification] || '';
}
