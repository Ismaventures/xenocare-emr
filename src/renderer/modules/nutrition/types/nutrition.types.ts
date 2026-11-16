/**
 * =============================================================================
 * NUTRITION MODULE - TYPE DEFINITIONS
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Core enums
// -----------------------------------------------------------------------------

export type NutritionRiskLevel = 'low' | 'moderate' | 'high';

export type NutritionPlanType =
  | 'weight_management'
  | 'diabetes_nutrition'
  | 'hypertension_low_sodium'
  | 'renal_nutrition'
  | 'pregnancy_nutrition'
  | 'pediatric_nutrition'
  | 'malnutrition_rehabilitation'
  | 'post_surgical_recovery'
  | 'general_wellness'
  | 'other';

export type DietType =
  | 'regular_balanced'
  | 'diabetic'
  | 'low_sodium'
  | 'renal'
  | 'high_protein'
  | 'high_calorie'
  | 'low_fat'
  | 'high_fiber'
  | 'soft_mechanical'
  | 'clear_liquid'
  | 'full_liquid'
  | 'enteral'
  | 'other';

export type PhysicalActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

export type AppetiteRating = 'poor' | 'fair' | 'good' | 'excellent';
export type MealPlanTolerance = 'poor' | 'fair' | 'good';
export type HydrationStatus = 'dehydrated' | 'adequate' | 'overhydrated';
export type NutritionProgress = 'improving' | 'stable' | 'declining';

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

export interface NutritionMealSchedule {
  breakfast?: string;
  mid_morning_snack?: string;
  lunch?: string;
  evening_snack?: string;
  dinner?: string;
  bedtime_snack?: string;
}

export interface NutritionCarePlanDTO {
  patient_id: string;
  encounter_id?: string;
  source_referral_request_id?: string;
  plan_type: NutritionPlanType;
  plan_name: string;
  diagnosis: string[];
  goals: string[];

  // Baseline nutrition assessment
  current_weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  muac_cm?: number;
  malnutrition_risk: NutritionRiskLevel;
  physical_activity_level?: PhysicalActivityLevel;
  comorbidities?: string;

  // Prescription targets
  diet_type: DietType;
  calorie_target_kcal?: number;
  protein_target_g?: number;
  fluid_target_ml?: number;
  sodium_limit_mg?: number;

  // Meal and counseling details
  meal_schedule?: NutritionMealSchedule;
  dietary_restrictions?: string;
  supplements?: string;
  counseling_notes?: string;

  // Follow-up structure
  frequency: string;
  expected_duration: string;
  total_sessions?: number;
}

export interface NutritionSessionData {
  weight_kg?: number;
  bmi?: number;
  appetite_rating: AppetiteRating;
  adherence_percentage: number; // 0 - 100
  meal_plan_tolerance: MealPlanTolerance;
  hydration_status: HydrationStatus;

  barriers?: string;
  gastrointestinal_symptoms?: string;
  meal_plan_adjustments?: string;
  supplement_adjustments?: string;
  counseling_provided?: string;

  progress_assessment: NutritionProgress;
  next_review_focus?: string;
}

export interface NutritionStats {
  active_care_plans: number;
  high_risk_patients: number;
  followups_this_month: number;
  average_adherence_rate: number;
}

export const NUTRITION_PLAN_LABELS: Record<NutritionPlanType, string> = {
  weight_management: 'Weight Management',
  diabetes_nutrition: 'Diabetes Nutrition Therapy',
  hypertension_low_sodium: 'Hypertension Low-Sodium Plan',
  renal_nutrition: 'Renal Nutrition Support',
  pregnancy_nutrition: 'Pregnancy Nutrition Care',
  pediatric_nutrition: 'Paediatric Nutrition Care',
  malnutrition_rehabilitation: 'Malnutrition Rehabilitation',
  post_surgical_recovery: 'Post-Surgical Nutrition Recovery',
  general_wellness: 'General Wellness Nutrition Plan',
  other: 'Other Nutrition Plan',
};
