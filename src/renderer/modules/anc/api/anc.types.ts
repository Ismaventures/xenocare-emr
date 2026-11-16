// =============================================================================
// ANC Module — Type Definitions
// =============================================================================

// ─── Pregnancy Episode ───────────────────────────────────────────────────────

export type PregnancyStatus =
  | 'active'
  | 'delivered'
  | 'transferred'
  | 'lost_to_followup'
  | 'closed';
export type RiskLevel = 'low' | 'moderate' | 'high';
export type BookingStatus = 'booked' | 'confirmed';

export interface PregnancyEpisode {
  id: string;
  patient_id: string;
  episode_number: number;
  enrollment_date: string;
  lmp: string | null;
  edd: string | null;
  gestational_age_at_booking: number | null;
  gravida: number;
  parity: number;
  abortions: number;
  living_children: number;
  blood_group: string | null;
  rhesus_factor: string | null;
  genotype: string | null;
  booking_status: BookingStatus;
  risk_level: RiskLevel;
  primary_doctor_id: string | null;
  primary_midwife_id: string | null;
  department_id: string | null;
  clinic_id: string | null;
  status: PregnancyStatus;
  obstetric_history: any[];
  medical_history: string | null;
  surgical_history: string | null;
  family_history: string | null;
  allergy_history: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: {
    id: string;
    first_name: string;
    surname: string;
    date_of_birth: string | null;
    contact_phone: string | null;
    patient_id: string;
    emr_number: string | null;
    gender: string;
    blood_group: string | null;
    patient_category: string | null;
    insurance_type: string | null;
    nhis_number: string | null;
  } | null;
  primary_doctor?: { id: string; first_name: string; last_name: string } | null;
  primary_midwife?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

// ─── ANC Visit ───────────────────────────────────────────────────────────────

export type AncVisitType = 'booking' | 'routine_followup' | 'urgent_review';
export type AncVisitStatus = 'in_progress' | 'completed' | 'cancelled';

export interface AncVisit {
  id: string;
  pregnancy_episode_id: string;
  encounter_id: string;
  visit_number: number;
  visit_type: AncVisitType;
  visit_date: string;
  gestational_age_weeks: number | null;
  gestational_age_days: number | null;
  trimester: number | null;
  nurse_completed: boolean;
  doctor_completed: boolean;
  next_visit_date: string | null;
  visit_status: AncVisitStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  observations?: AncObservation[];
  encounter?: { id: string; visit_id: string; status: string } | null;
}

// ─── ANC Observations ────────────────────────────────────────────────────────

export type UrineResult = 'nil' | 'trace' | '+' | '++' | '+++';
export type SeverityGrade = 'none' | 'mild' | 'moderate' | 'severe';
export type FetalMovement = 'present' | 'reduced' | 'absent';
export type FetalPresentation =
  | 'cephalic'
  | 'breech'
  | 'transverse'
  | 'unstable';
export type FetalLie = 'longitudinal' | 'oblique' | 'transverse';
export type LiquorStatus = 'adequate' | 'reduced' | 'excessive';

export interface AncObservation {
  id: string;
  anc_visit_id: string;
  pregnancy_episode_id: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  temperature: number | null;
  pulse: number | null;
  respiratory_rate: number | null;
  urine_protein: UrineResult | null;
  urine_glucose: UrineResult | null;
  edema: SeverityGrade | null;
  pallor: SeverityGrade | null;
  breast_exam: string | null;
  fundal_height_cm: number | null;
  fetal_heart_rate: number | null;
  fetal_movement: FetalMovement | null;
  fetal_presentation: FetalPresentation | null;
  fetal_lie: FetalLie | null;
  number_of_fetuses: number;
  vaginal_bleeding: boolean;
  liquor_status: LiquorStatus | null;
  cervix_status: string | null;
  contractions: boolean;
  maternal_complaints: string | null;
  danger_signs: string[] | null;
  interventions: string | null;
  counseling_notes: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Risk Flags ──────────────────────────────────────────────────────────────

export type RiskSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface AncRiskFlag {
  id: string;
  pregnancy_episode_id: string;
  anc_visit_id: string | null;
  risk_code: string;
  risk_name: string;
  severity: RiskSeverity;
  active: boolean;
  detected_at: string;
  resolved_at: string | null;
  notes: string | null;
  created_by: string | null;
}

// ─── Pregnancy Outcome ───────────────────────────────────────────────────────

export type DeliveryMode =
  | 'svd'
  | 'elective_cs'
  | 'emergency_cs'
  | 'instrumental'
  | 'vacuum'
  | 'forceps';
export type MaternalOutcome = 'alive' | 'deceased';
export type NeonatalOutcome = 'alive' | 'stillbirth' | 'neonatal_death';
export type PlaceOfDelivery =
  | 'this_facility'
  | 'other_hospital'
  | 'home'
  | 'en_route';

export interface PregnancyOutcome {
  id: string;
  pregnancy_episode_id: string;
  delivery_date: string;
  gestational_age_at_delivery: number | null;
  place_of_delivery: PlaceOfDelivery | null;
  delivery_mode: DeliveryMode | null;
  maternal_outcome: MaternalOutcome | null;
  maternal_complications: string[] | null;
  baby_weight_grams: number | null;
  baby_sex: string | null;
  apgar_1: number | null;
  apgar_5: number | null;
  neonatal_outcome: NeonatalOutcome | null;
  neonatal_complications: string[] | null;
  blood_loss_ml: number | null;
  placenta_complete: boolean | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface AncDashboardStats {
  totalActive: number;
  todayVisits: number;
  highRisk: number;
  overdueVisits: number;
  deliveriesThisMonth: number;
}

// ─── Gestational Age helper ──────────────────────────────────────────────────

export function calculateGestationalAge(
  lmp: string | null | undefined,
): { weeks: number; days: number } | null {
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  const today = new Date();
  const diffMs = today.getTime() - lmpDate.getTime();
  if (diffMs < 0) return null;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

export function calculateEDD(lmp: string | null | undefined): string | null {
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
  return edd.toISOString().split('T')[0];
}

export function getTrimester(weeks: number): 1 | 2 | 3 {
  if (weeks < 13) return 1;
  if (weeks < 28) return 2;
  return 3;
}
