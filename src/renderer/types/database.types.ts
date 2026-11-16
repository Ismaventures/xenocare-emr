// =============================================================================
// XENOCARE EMR - Database Types
// Auto-generated types matching Supabase schema
// =============================================================================

// =============================================================================
// ENUMS
// =============================================================================

export type Gender = 'Male' | 'Female' | 'Other';

export type StaffCategory = 'Military' | 'Civilian' | 'DS' | 'Guest Lecturer';

export type MilitaryBranch = 'Army' | 'Navy' | 'Air Force';

export type PatientStatus = 'Active' | 'Inactive' | 'Deceased';

export type PaymentMethod = 'Cash' | 'POS' | 'NHIS' | 'Retainership';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

// Billing Order Status (for billing_orders table)
export type BillingOrderStatus =
  | 'Pending'
  | 'Awaiting_Payment'
  | 'Partially_Paid'
  | 'Paid'
  | 'Paid_NHIS'
  | 'Paid_Retainership'
  | 'Waived'
  | 'Cancelled';

// Source Module (which module created the billing order)
export type SourceModule =
  | 'registration'
  | 'consultation'
  | 'nursing'
  | 'lab'
  | 'radiology'
  | 'pharmacy';

export type ServiceType =
  | 'Consultation'
  | 'Laboratory'
  | 'Radiology'
  | 'Pharmacy'
  | 'Surgery'
  | 'Procedure'
  | 'Nursing'
  | 'Admission'
  | 'Supplies'
  | 'Other';

// Queue status - matches queue_status_enum in database
export type QueueStatus =
  | 'Waiting'
  | 'Called'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

// Queue location - matches queue_location_enum in database
// Note: Both 'Reception'/'Registration' and 'Laboratory'/'Lab' are supported for compatibility
export type QueueLocation =
  | 'Reception'
  | 'Registration'
  | 'Nursing'
  | 'Consultation'
  | 'Laboratory'
  | 'Lab'
  | 'Radiology'
  | 'Pharmacy'
  | 'Billing'
  | 'Cashier'
  | 'CustomerService'
  // Specialty Clinical Departments
  | 'Dental'
  | 'Ophthalmology'
  | 'Physiotherapy'
  | 'Nutrition'
  | 'Neuropsychiatry'
  // Emergency Departments
  | 'Emergency'
  | 'Triage'
  | 'Resuscitation';

// Chief Complaint Category
export type ComplaintCategory =
  | 'General'
  | 'Pain'
  | 'Respiratory'
  | 'Cardiovascular'
  | 'Gastrointestinal'
  | 'Neurological'
  | 'Genitourinary'
  | 'Obstetrics_Gynecology'
  | 'Musculoskeletal'
  | 'Dermatology'
  | 'Mental_Health'
  | 'Trauma_Emergency';

// Duration Unit for Chief Complaints
export type DurationUnit = 'Hours' | 'Days' | 'Weeks' | 'Months';

export type ImagingType =
  | 'X-Ray'
  | 'Ultrasound'
  | 'MRI'
  | 'CT'
  | 'Mammography'
  | 'Fluoroscopy'
  | 'Ophthalmic Imaging'
  | 'Cardiac Imaging'
  | 'Pulmonary Diagnostics'
  | 'Nuclear Medicine'
  | 'Other';

// Request status - matches request_status_enum in database
export type RequestStatus =
  | 'Pending'
  | 'Ordered'
  | 'Scheduled'
  | 'In Progress'
  | 'Imaging Completed'
  | 'Awaiting Report'
  | 'Preliminary Report'
  | 'Final Report'
  | 'Sample Collected'
  | 'Completed'
  | 'Reported'
  | 'Cancelled'
  | 'Accepted'
  | 'Rejected'
  | 'Awaiting_Payment'
  | 'Paid'
  | 'Waived'
  | 'Sample_Collected'
  | 'Processing'
  | 'Result_Ready'
  | 'Result_Viewed';

// Dispense status - matches dispense_status_enum in database
export type DispenseStatus =
  | 'Dispensed'
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'Partial'
  | 'Out of Stock'
  | 'Cancelled'
  | 'Verified'
  | 'Awaiting_Payment'
  | 'Paid'
  | 'Waived';

// New Dispense Status (Standard EMR)
export type NewDispenseStatus =
  | 'Awaiting Payment'
  | 'Partially Dispensed'
  | 'Fully Dispensed'
  | 'Substituted'
  | 'Cancelled';

// Drug Category (Standard EMR)
export type DrugCategory =
  | 'Antibiotics'
  | 'Analgesics'
  | 'Antimalarials'
  | 'Antihypertensives'
  | 'Antidiabetics'
  | 'Antivirals'
  | 'Antifungals'
  | 'Vaccines'
  | 'IV Fluids'
  | 'Vitamins and Supplements';

// Drug Type (Standard EMR)
export type DrugType =
  | 'Tablets'
  | 'Capsules'
  | 'Syrups'
  | 'Injections'
  | 'Creams/Ointments'
  | 'IV Infusions';

export type Shift = 'Morning' | 'Evening' | 'Night';

// Visit status - matches visit_status_enum in database
export type VisitStatus =
  | 'Active'
  | 'Completed'
  | 'Cancelled'
  | 'Created'
  | 'Closed';

export type Priority = 'Normal' | 'Urgent' | 'Emergency' | 'Stat';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'medical_director'
  | 'doctor'
  | 'nurse'
  | 'lab_technician'
  | 'radiologist'
  | 'pharmacist'
  | 'billing_clerk'
  | 'receptionist'
  | 'cashier'
  | 'customer_service'
  | 'inventory_manager'
  | 'config_admin'
  // Specialty clinical roles
  | 'dentist'
  | 'ophthalmologist'
  | 'physiotherapist';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT';

// Patient Category and Insurance Types
export type PatientCategory =
  | 'Military'
  | 'Civilian'
  | 'Military Participant'
  | 'Civilian Participant'
  | 'Security Services';
export type InsuranceType =
  | 'Private'
  | 'Military_NHIS'
  | 'Civilian_NHIS'
  | 'Retainership'
  | 'GIFSHIP'
  | 'DHML'
  | 'Security_Services_NHIS';
export type PatientType = 'Principal' | 'Dependent' | 'Private';

// =============================================================================
// ENTITY INTERFACES
// =============================================================================

export interface Staff {
  id?: string; // UUID primary key
  staff_id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  staff_category: StaffCategory | null;
  military_branch: MilitaryBranch | null;
  rank: string | null;
  service_number: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  last_activity?: string | null; // For online status tracking
  photo_url?: string | null; // Profile photo (base64)
  facility_id?: string | null; // Facility association for multi-facility deployments
  specialty_code?: string | null; // FK to specialty_departments.specialty_code (for specialists)
  created_at: string;
  updated_at: string;
}

// =============================================================================
// IN-PATIENT & PROCEDURE TYPE ALIASES AND HELPERS
// =============================================================================

// Type alias for Admission with patient details included
export type AdmissionWithDetails = Admission & {
  patient?: Patient;
  current_ward?: Ward;
  current_bed?: Bed;
};

// Type alias for discharge DTO (same as DischargeAdmissionDTO)
export type DischargePatientDTO = DischargeAdmissionDTO;

// Note type for ward round notes
export type NoteType =
  | 'progress'
  | 'assessment'
  | 'procedure'
  | 'consultation'
  | 'nursing';

export interface PayerInfo {
  scheme: string;
  enrolee_id: string;
  relationship: string;
  expiration_date: string;
  principal_name?: string;
  principal_rank?: string;
  principal_service_number?: string;
  principal_unit?: string;
}

export interface Patient {
  id?: string; // UUID primary key - used for foreign key references
  patient_id: string; // VARCHAR display ID
  emr_number: string | null; // Unique EMR identifier
  first_name: string;
  middle_name: string | null;
  surname: string;
  gender: Gender;
  date_of_birth: string | null;
  nationality: string | null;
  state_of_origin: string | null;
  lga: string | null;
  contact_phone: string | null;
  email: string | null;
  residential_address: string | null;
  nok_name: string | null;
  nok_relationship: string | null;
  nok_phone: string | null;
  nok_address: string | null;
  // Patient categorization
  patient_category: PatientCategory | null;
  insurance_type: InsuranceType | null;
  patient_type: PatientType | null;
  principal_id: string | null; // For dependents - references principal patient
  relationship_to_principal: string | null;
  // Legacy staff category fields (kept for backward compatibility)
  staff_category: StaffCategory | null;
  military_branch: MilitaryBranch | null;
  rank: string | null;
  service_number: string | null;
  unit: string | null; // Military unit
  occupation: string | null; // Civilian occupation
  employer: string | null; // Civilian employer
  title: string | null; // Title/Rank for Civilian and Civilian Participant
  course: string | null; // Course name for Participants (e.g., "Course 34")
  // Security Services NHIS fields
  security_organization: string | null; // Security organization code (NPF, FRSC, etc.)
  security_service_number: string | null; // Force/Service number for security services
  nhis_number: string | null; // NHIS enrollment number
  national_id: string | null; // National Identification Number
  // NHIS Referral fields
  nhis_patient_source: 'Internal' | 'Referral' | null;
  referral_code: string | null;
  referring_facility_name: string | null;
  referring_facility_nhis_id: string | null;
  referral_date: string | null;
  referral_reason: string | null;
  referral_status: 'Active' | 'Expired' | 'Used' | 'Cancelled' | null;
  referral_expiry_date: string | null;
  clinical_summary: string | null;
  blood_group: string | null;
  known_allergies: string[] | null;
  no_known_allergies: boolean | null;
  allergies_reviewed_at: string | null;
  registered_by: string | null;
  registration_date: string;
  status: PatientStatus;
  photo_url: string | null;
  payer_info: PayerInfo | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  visit_id: string;
  patient_id: string;
  clinic_id: string | null;
  visit_type: string;
  encounter_number: string | null;
  encounter_date: string | null;
  priority: Priority;
  chief_complaint: string | null;
  payment_category: PaymentMethod;
  status: VisitStatus;
  start_time: string;
  end_time: string | null;
  discharge_date: string | null;
  discharge_notes: string | null;
  attending_doctor_id: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  clinic?: Clinic;
  attending_doctor?: Staff;
}

export interface Clinic {
  clinic_id: string;
  clinic_name: string;
  clinic_code: string;
  description: string | null;
  // Private pricing (InsuranceType: 'Private')
  consultation_fee: number;
  follow_up_fee: number;
  emergency_fee: number;
  // Military NHIS pricing (InsuranceType: 'Military_NHIS')
  military_nhis_consultation_fee: number;
  military_nhis_follow_up_fee: number;
  military_nhis_emergency_fee: number;
  // Civilian NHIS pricing (InsuranceType: 'Civilian_NHIS')
  nhis_consultation_fee: number;
  nhis_follow_up_fee: number;
  nhis_emergency_fee: number;
  // Retainership pricing (InsuranceType: 'Retainership')
  retainership_consultation_fee: number;
  retainership_follow_up_fee: number;
  retainership_emergency_fee: number;
  // GIFSHIP pricing (InsuranceType: 'GIFSHIP')
  gifship_consultation_fee: number;
  gifship_follow_up_fee: number;
  gifship_emergency_fee: number;
  department_id: string | null;
  location: string | null;
  operating_hours: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  consultation_id: string;
  visit_id: string | null;
  encounter_id: string | null;
  patient_id: string;
  doctor_id: string;
  consultation_date: string;
  complaints: string;
  clinical_notes: string | null;
  history_of_present_illness: string | null;
  past_medical_history: string | null;
  examination_findings: string | null;
  diagnosis: string | null;
  differential_diagnosis: string[] | null;
  treatment_plan: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  doctor?: Staff;
  visit?: Visit;
}

export interface Vitals {
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  pain_score?: number;
}

export interface NursingCare {
  care_id: string;
  patient_id: string;
  visit_id: string | null;
  nurse_id: string;
  care_type: string;
  notes: string | null;
  next_care_time: string | null;
  vital_signs: Record<string, unknown>;
  ward: string | null;
  bed_number: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  nurse?: Staff;
}

export interface LabTestCatalogue {
  test_id: string; // lab_test_id
  test_code: string; // test_code
  test_name: string; // test_name
  category: string | null; // Hematology, Chemical Pathology, Microbiology, Serology
  description: string | null;
  normal_range: string | null;
  unit: string | null;
  price: number; // cost
  nhis_eligible: boolean; // nhis_covered
  nhis_percentage: number | null; // nhis_percentage
  turnaround_time: string | null;
  sample_type: string | null; // Blood, Stool, Urine, Semen, Sputum, CSF
  is_active: boolean; // status
  requires_nhis_authorization?: boolean;
  created_at: string;
  updated_at?: string;
}

// NHIS Approval Status enum (matches database type)
export type NhisApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'provisional';

export interface LabRequest {
  request_id: string; // lab_request_id
  consultation_id: string | null;
  encounter_id: string | null; // encounter_id (FK)
  patient_id: string;
  visit_id: string | null;
  test_id: string; // lab_test_id (FK)
  ordered_by: string; // requested_by (Doctor ID)
  priority: Priority;
  clinical_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  result: Record<string, unknown> | null; // Legacy - use lab_results
  result_notes: string | null; // Legacy - use lab_results.remarks
  result_file_url: string | null; // Legacy - use lab_results.attachment_url
  status: RequestStatus; // Pending, Sample Collected, In Progress, Completed, Cancelled
  request_date?: string; // When request was made
  sample_collected_at: string | null;
  lab_request_group_id?: string | null;
  specimen_type?: string | null;
  specimen_identifier?: string | null;
  created_at: string;
  updated_at: string;
  // NHIS fields
  nhis_approval_status?: NhisApprovalStatus; // NHIS approval workflow status
  nhis_coverage_percentage?: number; // NHIS coverage % for this service
  is_nhis_covered?: boolean; // Whether covered by NHIS
  // Relations
  patient?: Patient;
  test?: LabTestCatalogue;
  orderer?: Staff;
  processor?: Staff;
  lab_result?: LabResult; // New relation to lab_results
}

// LAB_RESULT - Results uploaded for lab requests
export interface LabResult {
  lab_result_id: string;
  lab_request_id: string;

  // Result data
  result: string | null; // Main result value/text
  result_value: number | null; // Numeric result value
  result_unit: string | null; // Unit of measurement
  result_status: string | null; // Normal, Abnormal, Critical
  reference_range: string | null;

  // Report details
  remarks: string | null; // Additional remarks/notes
  interpretation: string | null;
  methodology: string | null;

  // Workflow tracking
  uploaded_by: string | null; // Lab technician who uploaded
  upload_date: string; // When result was uploaded
  verified_by: string | null; // Supervisor who verified
  verified_at: string | null;

  // Attachments
  attachment_url: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;

  // Relations
  uploader?: Staff;
  verifier?: Staff;
  components?: LabResultComponent[];
}

// Individual components of panel tests (e.g., FBC components)
export interface LabResultComponent {
  component_id: string;
  lab_result_id: string;

  component_name: string; // e.g., "WBC", "RBC", "Hemoglobin"
  component_code: string | null;
  result_value: number | null;
  result_text: string | null;
  result_unit: string | null;
  reference_range: string | null;
  result_status: string | null; // Normal, Abnormal, Critical
  sequence_number: number;

  created_at: string;
}

export interface ImagingCatalogue {
  imaging_id: string; // scan_id
  imaging_code: string; // scan_code
  imaging_name: string; // scan_name
  imaging_type: ImagingType; // scan_type (X-Ray, Ultrasound, CT, MRI)
  category: string | null; // category (Chest, Limbs, Spine, Abdominal, Pelvic, Obstetric, Brain)
  body_part: string | null; // body_part
  description: string | null;
  preparation_instructions: string | null;
  price: number; // cost
  nhis_eligible: boolean; // nhis_covered
  nhis_percentage: number | null; // nhis_percentage
  duration_minutes: number;
  is_active: boolean;
  requires_nhis_authorization?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RadiologyRequest {
  request_id: string; // scan_request_id
  consultation_id: string | null;
  patient_id: string;
  visit_id: string | null;
  encounter_id: string | null; // encounter_id (FK)
  imaging_id: string; // scan_id (FK)
  imaging_type: ImagingType;
  body_part: string | null;
  ordered_by: string; // requested_by (Doctor ID)
  priority: Priority;
  clinical_indication: string | null;
  request_date: string | null; // request_date
  scheduled_date: string | null;
  performed_at: string | null;
  performed_by: string | null;
  findings: string | null; // (legacy - now in scan_results)
  impression: string | null; // (legacy - now in scan_results)
  result_file_url: string | null; // (legacy - now in scan_images)
  status: RequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  imaging?: ImagingCatalogue;
  orderer?: Staff;
  performer?: Staff;
}

// Scan Result - SCAN_RESULT table
export interface ScanResult {
  scan_result_id: string;
  scan_request_id: string; // FK to radiology_requests
  report: string | null;
  findings: string | null;
  impression: string | null;
  technique: string | null;
  comparison: string | null;
  urgency: 'Normal' | 'Urgent' | 'Critical';
  is_preliminary: boolean;
  notes: string | null; // Additional notes/recommendations
  reported_by: string | null; // uploaded_by (Radiologist ID)
  reported_at: string | null; // upload_date
  verified_by: string | null;
  verified_at: string | null;
  addendum: string | null;
  addendum_by: string | null;
  addendum_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  request?: RadiologyRequest;
  reporter?: Staff;
  verifier?: Staff;
}

// Scan Image - individual image record
export interface ScanImage {
  image_id: string;
  scan_request_id: string; // FK to radiology_requests
  image_path: string; // Storage URL
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  view_plane:
    | 'AP'
    | 'PA'
    | 'Lateral'
    | 'Oblique'
    | 'Axial'
    | 'Sagittal'
    | 'Coronal'
    | 'Other'
    | null;
  sequence_number: number;
  is_key_image: boolean;
  notes: string | null;
  uploaded_by: string; // Staff ID
  upload_date: string;
  created_at: string;
  // Relations
  request?: RadiologyRequest;
  uploader?: Staff;
}

export interface DrugCatalogue {
  // Core identification - maps from 'id' and 'code' columns
  drug_id: string;
  drug_code: string | null;
  drug_name: string;

  // Drug details
  generic_name?: string | null;
  brand_name?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  drug_type?: string | null;
  strength?: string | null;
  strengths?: string | null;
  formulation?: string | null;
  dosage_form?: string | null;
  presentation?: string | null;
  description?: string | null;
  unit_of_measure?: string | null;

  // Pricing
  price?: number | null;
  unit_price?: number | null;
  unit_cost?: number | null;
  selling_price?: number | null;

  // Stock
  stock_quantity: number;
  quantity_in_stock?: number;
  reorder_level: number;

  // NHIS
  is_nhis_covered: boolean;
  nhis_eligible?: boolean;
  nhis_code?: string | null;
  nhis_price?: number | null;
  nhis_percentage?: number;
  nhis_category?: string | null;
  nhis_subcategory?: string | null;

  // Flags
  is_active: boolean;
  is_controlled?: boolean;
  requires_prescription?: boolean;
  requires_nhis_authorization?: boolean;

  // Audit
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface Prescription {
  prescription_id: string;
  consultation_id: string | null;
  encounter_id: string | null; // Reference to clinical encounter
  patient_id: string;
  visit_id: string | null;
  drug_id: string;
  prescribed_by: string;
  dose: string | null; // Prescribed dose (e.g., 500mg)
  dosage: string;
  frequency: string;
  duration: string | null;
  route: string | null;
  quantity_prescribed: number;
  instructions: string | null;
  special_instructions: string | null; // Special dispensing instructions
  quantity_dispensed: number;
  dispensed_by: string | null;
  dispense_date: string | null;
  status: DispenseStatus;
  is_nhis_claim: boolean;
  is_external?: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  drug?: DrugCatalogue;
  prescriber?: Staff;
  dispenser?: Staff;
  dispenses?: Dispense[]; // Related dispense records
}

// Dispense record (Standard EMR)
export interface Dispense {
  dispense_id: string;
  prescription_id: string;
  quantity_dispensed: number;
  dispense_status: NewDispenseStatus;
  dispensed_by: string | null;
  dispense_date: string;
  substituted_drug_id: string | null;
  substitution_reason: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  prescription?: Prescription;
  pharmacist?: Staff;
  substituted_drug?: DrugCatalogue;
}

export interface Queue {
  id: string;
  patient_id: string;
  visit_id: string | null;
  encounter_id: string | null;
  department_id: string | null;
  clinic_id: string | null;
  ticket_number: string;
  location: QueueLocation;
  priority: Priority;
  status: QueueStatus;
  assigned_to: string | null;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  specialty_code: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  assigned_staff?: Staff;
}

export interface Billing {
  billing_id: string;
  patient_id: string;
  visit_id: string | null;
  service_type: ServiceType;
  service_description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  quantity: number;
  unit_price: number;
  amount_due: number;
  discount: number;
  amount_paid: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_date: string | null;
  receipt_number: string | null;
  invoice_number: string | null;
  is_nhis_claim: boolean;
  nhis_authorization_code: string | null;
  created_by: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
}

// Central Billing Orders (new payment verification system)
export interface BillingOrder {
  billing_id: string;
  patient_id: string;
  visit_id: string | null;
  source_module: SourceModule;
  source_record_id: string | null;
  service_code: string | null;
  service_description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount_due: number;
  payment_status: BillingOrderStatus;
  payment_method: PaymentMethod | null;
  requested_by: string | null;
  requested_by_role: UserRole | null;
  verified_by: string | null;
  verified_at: string | null;
  receipt_number: string | null;
  invoice_id: string | null;
  invoice_item_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  visit?: Visit;
  requested_by_staff?: Staff;
  verified_by_staff?: Staff;
}

// Billing Audit Log (for compliance and tracking)
export interface BillingAuditLog {
  audit_id: string;
  billing_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  action: string;
  performed_by: string | null;
  performed_by_role: UserRole | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
  // Relations
  staff?: Staff;
}

export interface Report {
  report_id: string;
  report_name: string;
  report_type: string;
  description: string | null;
  generated_by: string | null;
  generation_date: string;
  date_range_start: string | null;
  date_range_end: string | null;
  filters: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  file_url: string | null;
  file_format: string | null;
  status: string;
  created_at: string;
  // Relations
  generator?: Staff;
}

export interface AuditLog {
  log_id: string;
  staff_id: string | null;
  action: AuditAction;
  module: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Relations
  staff?: Staff;
}

export interface Permission {
  permission_id: string;
  permission_name: string;
  description: string | null;
  module: string;
  created_at: string;
}

export interface RolePermission {
  role_permission_id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
  // Relations
  permission?: Permission;
}

// =============================================================================
// COMPUTED TYPES
// =============================================================================

export interface PatientWithAge extends Patient {
  age: number | null;
}

export interface QueueWithPatient extends Queue {
  patient: Patient;
}

export interface ConsultationWithRelations extends Consultation {
  patient: Patient;
  doctor: Staff;
  prescriptions?: Prescription[];
  lab_requests?: LabRequest[];
  radiology_requests?: RadiologyRequest[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface PatientDemographics {
  total_patients: number;
  by_gender: Record<Gender, number>;
  by_status: Record<PatientStatus, number>;
  by_staff_category: Record<StaffCategory | 'None', number>;
  by_age_group: Record<string, number>;
}

export interface RevenueStats {
  total_revenue: number;
  by_service_type: Record<ServiceType, number>;
  by_payment_method: Record<PaymentMethod, number>;
  by_date: { date: string; amount: number }[];
}

export interface ServiceUtilization {
  consultations: number;
  lab_tests: number;
  radiology_exams: number;
  prescriptions_dispensed: number;
  patients_queued: number;
}

// =============================================================================
// CHIEF COMPLAINTS TYPES
// =============================================================================

export interface ChiefComplaintCatalogue {
  complaint_id: string;
  complaint_name: string;
  complaint_code: string;
  category: ComplaintCategory;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PatientChiefComplaint {
  id: string;
  patient_id: string;
  emr_number: string;
  encounter_id: string;
  consultation_id: string | null;
  complaint_id: string;
  is_primary: boolean;
  duration_value: number;
  duration_unit: DurationUnit;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from catalogue
  complaint_name?: string;
  complaint_code?: string;
  category?: ComplaintCategory;
}

export interface PatientChiefComplaintDTO {
  complaint_id: string;
  is_primary: boolean;
  duration_value: number;
  duration_unit: DurationUnit;
  notes?: string;
}

export interface PatientComplaintView {
  id: string;
  patient_id: string;
  emr_number: string;
  encounter_id: string;
  consultation_id: string | null;
  is_primary: boolean;
  duration_value: number;
  duration_unit: DurationUnit;
  notes: string | null;
  created_at: string;
  complaint_id: string;
  complaint_name: string;
  complaint_code: string;
  category: ComplaintCategory;
  first_name: string;
  surname: string;
  encounter_number: string;
  encounter_date: string;
}

// =============================================================================
// IN-PATIENT MODULE TYPES
// =============================================================================

export type WardType =
  | 'general'
  | 'icu'
  | 'pediatric'
  | 'maternity'
  | 'surgical'
  | 'orthopedic'
  | 'cardiac'
  | 'emergency'
  | 'psychiatric'
  | 'isolation';

export type BedType =
  | 'standard'
  | 'electric'
  | 'icu'
  | 'pediatric'
  | 'bariatric'
  | 'low'
  | 'stretcher'
  | 'crib'
  | 'bassinet';

export type BedStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Maintenance'
  | 'Cleaning';

export type AdmissionType =
  | 'emergency'
  | 'elective'
  | 'transfer'
  | 'observation'
  | 'day_case';

export type AdmissionSource =
  | 'emergency'
  | 'outpatient'
  | 'referral'
  | 'transfer'
  | 'direct';

export type AdmissionStatus =
  | 'admitted'
  | 'under_observation'
  | 'critical'
  | 'stable'
  | 'improving'
  | 'discharged'
  | 'transferred'
  | 'deceased'
  | 'absconded';

export type AcuityLevel = 'low' | 'moderate' | 'high' | 'critical';

export type CodeStatus =
  | 'full_code'
  | 'dnr'
  | 'dni'
  | 'dnr_dni'
  | 'comfort_care';

export type DischargeType =
  | 'home'
  | 'transfer'
  | 'against_medical_advice'
  | 'deceased'
  | 'skilled_nursing'
  | 'rehabilitation'
  | 'hospice'
  | 'other';

export type WardRoundType =
  | 'morning'
  | 'evening'
  | 'night'
  | 'consultant'
  | 'multidisciplinary'
  | 'teaching';

export type TransferReason =
  | 'clinical_upgrade'
  | 'clinical_downgrade'
  | 'bed_availability'
  | 'patient_request'
  | 'isolation_required'
  | 'isolation_cleared'
  | 'procedure'
  | 'surgery'
  | 'discharge_preparation'
  | 'other';

export interface Ward {
  id: string;
  facility_id: string;
  name: string;
  code: string;
  ward_type: WardType;
  total_beds: number;
  available_beds: number;
  description: string | null;
  floor_number: number | null;
  building: string | null;
  nurse_station_phone: string | null;
  head_nurse_id: string | null;
  gender_restriction?: 'male' | 'female' | 'none';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Pricing fields
  price?: number;
  nhis_price?: number;
  is_nhis_covered?: boolean;
  nhis_percentage?: number;
}

export interface Bed {
  id: string;
  ward_id: string;
  bed_number: string;
  bed_type: BedType;
  status: BedStatus;
  features: string[]; // JSON array of features
  daily_rate: number | null;
  current_patient_id: string | null;
  current_admission_id: string | null;
  location_details: string | null;
  is_active: boolean;
  last_cleaned_at: string | null;
  last_maintenance_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  ward?: Ward;
  current_patient?: Patient;
}

export interface CareTeamMember {
  user_id: string;
  role: string;
  assigned_at: string;
}

export interface FollowUpAppointment {
  date: string;
  department: string;
  doctor_id: string | null;
  notes: string | null;
}

export interface DischargeMedication {
  drug_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface Admission {
  id: string;
  facility_id: string;
  patient_id: string;
  encounter_id: string | null;
  admission_number: string;
  admission_date: string;
  expected_discharge_date: string | null;
  actual_discharge_date: string | null;
  admission_type: AdmissionType;
  admission_source: AdmissionSource | null;
  current_ward_id: string | null;
  current_bed_id: string | null;
  admitting_diagnosis: string;
  admitting_diagnosis_icd10: string | null;
  secondary_diagnoses: { code: string; description: string }[];
  chief_complaint: string | null;
  reason_for_admission: string | null;
  admitting_doctor_id: string | null;
  attending_physician_id: string | null;
  primary_nurse_id: string | null;
  care_team: CareTeamMember[];
  admission_status: AdmissionStatus;
  acuity_level: AcuityLevel | null;
  code_status: CodeStatus;
  isolation_required: boolean;
  isolation_type: string | null;
  fall_risk_level: string | null;
  pressure_ulcer_risk: string | null;
  allergies_snapshot: {
    allergen: string;
    reaction: string;
    severity: string;
  }[];
  alerts: { type: string; message: string; created_at: string }[];
  diet_type: string | null;
  diet_restrictions: string | null;
  activity_level: string | null;
  mobility_status: string | null;
  discharge_type: DischargeType | null;
  discharge_disposition: string | null;
  discharge_diagnosis: string | null;
  discharge_diagnosis_icd10: string | null;
  discharge_summary: string | null;
  discharge_instructions: string | null;
  follow_up_appointments: FollowUpAppointment[];
  discharge_medications: DischargeMedication[];
  discharged_by: string | null;
  insurance_verified: boolean;
  pre_authorization_number: string | null;
  estimated_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined fields
  patient?: Patient;
  current_ward?: Ward;
  current_bed?: Bed;
  attending_physician?: { id: string; first_name: string; last_name: string };
}

export interface WardRoundNote {
  id: string;
  admission_id: string;
  encounter_id: string | null;
  round_date: string;
  round_type: WardRoundType;
  subjective_notes: string | null;
  objective_findings: string | null;
  vital_signs: Record<string, unknown> | null;
  assessment: string | null;
  plan: string | null;
  new_orders: { type: string; description: string; urgency: string }[];
  discontinued_orders: { order_id: string; reason: string }[];
  nursing_instructions: string | null;
  patient_condition: string | null;
  estimated_discharge_date: string | null;
  discharge_planning_notes: string | null;
  attending_physician_id: string | null;
  participants: { user_id: string; role: string }[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  // Joined fields
  admission?: Admission;
  attending_physician?: { id: string; first_name: string; last_name: string };
}

export interface BedTransfer {
  id: string;
  admission_id: string;
  from_ward_id: string | null;
  from_bed_id: string | null;
  to_ward_id: string;
  to_bed_id: string;
  transfer_date: string;
  transfer_reason: TransferReason;
  transfer_reason_details: string | null;
  clinical_status_at_transfer: string | null;
  authorized_by: string;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  // Joined fields
  from_ward?: Ward;
  from_bed?: Bed;
  to_ward?: Ward;
  to_bed?: Bed;
}

// =============================================================================
// PROCEDURE MODULE TYPES
// =============================================================================

export type ProcedureCategory =
  | 'surgical'
  | 'diagnostic'
  | 'therapeutic'
  | 'minor'
  | 'major'
  | 'endoscopy'
  | 'biopsy'
  | 'injection'
  | 'infusion'
  | 'wound_care'
  | 'cardiovascular'
  | 'orthopedic'
  | 'neurological'
  | 'obstetric'
  | 'other';

export type ProcedurePriority = 'emergency' | 'urgent' | 'routine' | 'elective';

export type ProcedureStatus =
  | 'scheduled'
  | 'pre_op'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'complications';

export type AnesthesiaType =
  | 'none'
  | 'local'
  | 'regional'
  | 'sedation'
  | 'general'
  | 'spinal'
  | 'epidural';

export type Laterality = 'left' | 'right' | 'bilateral' | 'na';

export interface RequiredStaff {
  role: string;
  count: number;
}

export interface ProcedureCatalogue {
  id: string;
  facility_id: string | null;
  code: string;
  name: string;
  description: string | null;
  category: ProcedureCategory;
  subcategory: string | null;
  cpt_code: string | null;
  icd10_pcs_code: string | null;
  body_system: string | null;
  requires_anesthesia: boolean;
  anesthesia_type: string | null;
  typical_duration_minutes: number | null;
  recovery_time_hours: number | null;
  requires_consent: boolean;
  requires_fasting: boolean;
  fasting_hours: number | null;
  requires_sedation: boolean;
  requires_admission: boolean;
  pre_procedure_instructions: string | null;
  post_procedure_instructions: string | null;
  required_equipment: string[];
  required_supplies: string[];
  required_staff: RequiredStaff[];
  typical_location: string | null;
  base_price: number | null;
  nhis_price: number | null;
  professional_fee: number | null;
  facility_fee: number | null;
  is_active: boolean;
  requires_nhis_authorization?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PreOpChecklist {
  identity_verified?: boolean;
  consent_signed?: boolean;
  site_marked?: boolean;
  allergies_reviewed?: boolean;
  fasting_confirmed?: boolean;
  blood_available?: boolean;
  labs_reviewed?: boolean;
  imaging_reviewed?: boolean;
  anesthesia_cleared?: boolean;
  [key: string]: boolean | undefined;
}

export interface SpecimenCollected {
  type: string;
  site: string;
  container: string;
  sent_to_lab: boolean;
  lab_number: string | null;
}

export interface ImplantUsed {
  name: string;
  manufacturer: string;
  serial_number: string;
  lot_number: string;
  size: string | null;
  site: string;
}

export interface Procedure {
  id: string;
  facility_id: string;
  patient_id: string;
  encounter_id: string | null;
  admission_id: string | null;
  procedure_number: string;
  catalogue_id: string | null;
  procedure_name: string;
  procedure_code: string | null;
  scheduled_date: string | null;
  scheduled_duration_minutes: number | null;
  priority: ProcedurePriority;
  status: ProcedureStatus;
  actual_start_time: string | null;
  actual_end_time: string | null;
  actual_duration_minutes: number | null;
  location: string | null;
  room_number: string | null;
  indication: string;
  pre_procedure_diagnosis: string | null;
  post_procedure_diagnosis: string | null;
  laterality: Laterality | null;
  body_site: string | null;
  anesthesia_type: AnesthesiaType | null;
  anesthesiologist_id: string | null;
  anesthesia_start_time: string | null;
  anesthesia_end_time: string | null;
  anesthesia_notes: string | null;
  primary_surgeon_id: string | null;
  assistant_surgeons: { user_id: string; role: string }[];
  scrub_nurse_id: string | null;
  circulating_nurse_id: string | null;
  other_staff: { user_id: string; role: string }[];
  consent_obtained: boolean;
  consent_date: string | null;
  consent_obtained_by: string | null;
  consent_document_id: string | null;
  consent_notes: string | null;
  pre_op_checklist: PreOpChecklist;
  fasting_confirmed: boolean | null;
  allergies_verified: boolean | null;
  site_marked: boolean | null;
  blood_products_available: boolean | null;
  procedure_notes: string | null;
  findings: string | null;
  technique_description: string | null;
  complications: string | null;
  estimated_blood_loss_ml: number | null;
  specimens_collected: SpecimenCollected[];
  implants_used: ImplantUsed[];
  post_op_instructions: string | null;
  recovery_location: string | null;
  recovery_start_time: string | null;
  recovery_end_time: string | null;
  discharge_criteria_met: boolean | null;
  post_op_diagnosis: string | null;
  billable: boolean;
  billed: boolean;
  billing_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  // Joined fields
  patient?: Patient;
  catalogue?: ProcedureCatalogue;
  primary_surgeon?: { id: string; first_name: string; last_name: string };
  admission?: Admission;
}

export interface ProcedureConsumable {
  id: string;
  procedure_id: string;
  item_id: string | null;
  item_name: string;
  item_code: string | null;
  category: string | null;
  quantity_used: number;
  unit: string;
  unit_cost: number | null;
  total_cost: number | null;
  billable: boolean;
  batch_number: string | null;
  serial_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
}

// =============================================================================
// VIEW TYPES FOR IN-PATIENT AND PROCEDURE MODULES
// =============================================================================

export interface WardCensusView {
  ward_id: string;
  ward_name: string;
  ward_type: WardType;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  maintenance_beds: number;
  cleaning_beds: number;
  reserved_beds: number;
  occupancy_rate: number | null;
  critical_patients: number;
  isolation_patients: number;
  facility_id: string;
}

export interface ActiveAdmissionView {
  admission_id: string;
  admission_number: string;
  encounter_id: string | null;
  encounter_number: string | null;
  admission_date: string;
  admission_type: AdmissionType;
  admission_source: string | null;
  admission_status: AdmissionStatus;
  admitting_diagnosis: string;
  admitting_diagnosis_icd10: string | null;
  secondary_diagnoses: object | null;
  chief_complaint: string | null;
  reason_for_admission: string | null;
  acuity_level: AcuityLevel | null;
  expected_discharge_date: string | null;
  actual_discharge_date: string | null;

  // Patient info
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  hospital_id: string;
  patient_phone: string | null;

  // Billing info
  billing_status?: string;
  billing_order_id?: string;
  billing_amount?: number;
  pending_bills_total?: number;
  pending_bills_count?: number;

  // Location
  current_ward_id: string | null;
  ward_name: string | null;
  ward_type: WardType | null;
  nurse_station_phone: string | null;
  current_bed_id: string | null;
  bed_number: string | null;
  bed_type: BedType | null;
  bed_features: object | null;

  // Care Team - Admitting Doctor
  admitting_doctor_id: string | null;
  admitting_doctor_first_name: string | null;
  admitting_doctor_last_name: string | null;
  admitting_doctor_staff_id: string | null;

  // Care Team - Attending Physician
  attending_physician_id: string | null;
  physician_first_name: string | null;
  physician_last_name: string | null;
  physician_staff_id: string | null;

  // Care Team - Primary Nurse
  primary_nurse_id: string | null;
  primary_nurse_first_name: string | null;
  primary_nurse_last_name: string | null;

  // Record creator
  created_by: string | null;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  record_created_at: string | null;

  // Discharge info
  discharge_type: string | null;
  discharge_disposition: string | null;
  discharge_diagnosis: string | null;
  discharge_summary: string | null;
  discharged_by: string | null;
  discharged_by_first_name: string | null;
  discharged_by_last_name: string | null;

  // Patient condition flags
  code_status: string | null;
  isolation_required: boolean;
  isolation_type: string | null;
  fall_risk_level: string | null;
  pressure_ulcer_risk: string | null;

  // Insurance
  insurance_verified: boolean;
  pre_authorization_number: string | null;
  estimated_cost: number | null;

  // Additional data
  care_team: object | null;
  allergies_snapshot: object | null;
  alerts: object | null;
  diet_type: string | null;
  activity_level: string | null;
  mobility_status: string | null;
  notes: string | null;

  // Facility
  facility_id: string;

  // Calculated fields
  length_of_stay_days: number | null;
  ward_round_count: number;
  last_ward_round_date: string | null;
  transfer_count: number;
}

export interface TodaysProcedureView {
  procedure_id: string;
  procedure_number: string;
  procedure_name: string;
  scheduled_date: string;
  scheduled_duration_minutes: number | null;
  priority: ProcedurePriority;
  status: ProcedureStatus;
  location: string | null;
  room_number: string | null;
  anesthesia_type: AnesthesiaType | null;
  patient_id: string;
  first_name: string;
  last_name: string;
  hospital_id: string;
  surgeon_first_name: string | null;
  surgeon_last_name: string | null;
  facility_id: string;
}

export interface BedAvailabilityView {
  ward_id: string;
  ward_name: string;
  ward_type: WardType;
  bed_id: string;
  bed_number: string;
  bed_type: BedType;
  status: BedStatus;
  features: string[];
  daily_rate: number | null;
  current_patient_name: string | null;
  current_patient_emr: string | null;
  admission_number: string | null;
  last_cleaned_at: string | null;
  last_maintenance_at: string | null;
  facility_id: string;
}

// =============================================================================
// DTO TYPES FOR IN-PATIENT AND PROCEDURE MODULES
// =============================================================================

export interface CreateAdmissionDTO {
  patient_id: string;
  encounter_id?: string;
  admission_type: AdmissionType;
  admission_source?: AdmissionSource;
  ward_id: string;
  bed_id: string;
  admitting_diagnosis: string;
  admitting_diagnosis_icd10?: string;
  chief_complaint?: string;
  reason_for_admission?: string;
  admitting_doctor_id?: string;
  attending_physician_id?: string;
  acuity_level?: AcuityLevel;
  isolation_required?: boolean;
  isolation_type?: string;
  expected_discharge_date?: string;
  notes?: string;
}

export interface UpdateAdmissionDTO {
  admission_status?: AdmissionStatus;
  acuity_level?: AcuityLevel;
  attending_physician_id?: string;
  primary_nurse_id?: string;
  code_status?: CodeStatus;
  isolation_required?: boolean;
  isolation_type?: string;
  diet_type?: string;
  diet_restrictions?: string;
  activity_level?: string;
  mobility_status?: string;
  expected_discharge_date?: string;
  notes?: string;
}

export interface DischargeAdmissionDTO {
  discharge_type: DischargeType;
  discharge_diagnosis: string;
  discharge_diagnosis_icd10?: string;
  discharge_disposition?: string;
  discharge_summary: string;
  discharge_instructions: string;
  follow_up_appointments?: FollowUpAppointment[];
  discharge_medications?: DischargeMedication[];
}

export interface CreateWardRoundNoteDTO {
  admission_id: string;
  encounter_id?: string;
  round_type: WardRoundType;
  subjective_notes?: string;
  objective_findings?: string;
  vital_signs?: Record<string, unknown>;
  assessment?: string;
  plan?: string;
  new_orders?: { type: string; description: string; urgency: string }[];
  nursing_instructions?: string;
  patient_condition?: string;
  estimated_discharge_date?: string;
  discharge_planning_notes?: string;
  referrals?: {
    internal?: {
      specialty: string;
      reason: string;
      urgency: 'Routine' | 'Urgent' | 'Emergency';
      clinicalFindings?: string;
      provisionalDiagnosis?: string;
    }[];
    external?: {
      facilityName?: string;
      facilityAddress?: string;
      doctorName?: string;
      reason?: string;
      clinicalFindings?: string;
      investigationFindings?: string;
      provisionalDiagnosis?: string;
      urgency?: 'Routine' | 'Urgent' | 'Emergency';
      enabled?: boolean;
    };
  };
}

export interface CreateBedTransferDTO {
  admission_id: string;
  to_ward_id: string;
  to_bed_id: string;
  transfer_reason: TransferReason;
  transfer_reason_details?: string;
  clinical_status_at_transfer?: string;
  notes?: string;
}

export interface CreateProcedureDTO {
  patient_id: string;
  encounter_id?: string;
  admission_id?: string;
  catalogue_id?: string;
  procedure_name: string;
  procedure_code?: string;
  scheduled_date: string;
  scheduled_duration_minutes?: number;
  priority: ProcedurePriority;
  location?: string;
  room_number?: string;
  indication: string;
  pre_procedure_diagnosis?: string;
  laterality?: Laterality;
  body_site?: string;
  anesthesia_type?: AnesthesiaType;
  anesthesiologist_id?: string;
  primary_surgeon_id?: string;
  assistant_surgeons?: { user_id: string; role: string }[];
  scrub_nurse_id?: string;
  circulating_nurse_id?: string;
}

export interface UpdateProcedureDTO {
  status?: ProcedureStatus;
  scheduled_date?: string;
  priority?: ProcedurePriority;
  location?: string;
  room_number?: string;
  anesthesia_type?: AnesthesiaType;
  anesthesiologist_id?: string;
  primary_surgeon_id?: string;
  consent_obtained?: boolean;
  consent_date?: string;
  consent_obtained_by?: string;
  consent_notes?: string;
  pre_op_checklist?: PreOpChecklist;
  actual_start_time?: string;
  actual_end_time?: string;
  procedure_notes?: string;
  findings?: string;
  technique_description?: string;
  complications?: string;
  estimated_blood_loss_ml?: number;
  post_op_instructions?: string;
  post_op_diagnosis?: string;
}

export interface CreateProcedureConsumableDTO {
  procedure_id: string;
  item_id?: string;
  item_name: string;
  item_code?: string;
  category?: string;
  quantity_used: number;
  unit: string;
  unit_cost?: number;
  batch_number?: string;
  serial_number?: string;
  expiry_date?: string;
  notes?: string;
}
