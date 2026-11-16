/**
 * Nursing Intervention Codes Configuration
 *
 * Single source of truth for all nursing intervention codes.
 * Codes use UPPER_SNAKE_CASE slugs for stability and easy querying.
 *
 * This config supports analytics use-cases like:
 * - "How many IV adjustments per ward?"
 * - "Which shifts perform most wound care?"
 * - "How often are doctors notified?"
 */

// =============================================================================
// Types
// =============================================================================

export interface InterventionItem {
  code: string;
  label: string;
  description?: string;
}

export interface InterventionCategory {
  category: string;
  categoryCode: string;
  icon?: string;
  items: InterventionItem[];
}

// =============================================================================
// Intervention Codes Configuration
// =============================================================================

export const INTERVENTION_CATEGORIES: InterventionCategory[] = [
  {
    category: 'Medication & Therapy',
    categoryCode: 'MED_THERAPY',
    icon: '💊',
    items: [
      { code: 'MED_ADMINISTERED', label: 'Medication administered' },
      { code: 'MED_DOSE_ADJUSTED', label: 'Medication dose adjusted' },
      { code: 'MED_HELD', label: 'Medication held/withheld' },
      { code: 'PRN_MED_GIVEN', label: 'PRN medication given' },
      { code: 'PAIN_MED_ADMINISTERED', label: 'Pain medication administered' },
      { code: 'ANTIBIOTIC_ADMINISTERED', label: 'Antibiotic administered' },
      { code: 'NEBULIZER_TREATMENT', label: 'Nebulizer treatment given' },
      { code: 'INSULIN_ADMINISTERED', label: 'Insulin administered' },
    ],
  },
  {
    category: 'IV Therapy & Fluids',
    categoryCode: 'IV_FLUIDS',
    icon: '💉',
    items: [
      { code: 'IV_STARTED', label: 'IV line started' },
      { code: 'IV_FLUIDS_ADJUSTED', label: 'IV fluids adjusted' },
      { code: 'IV_FLUIDS_CHANGED', label: 'IV fluids changed' },
      { code: 'IV_SITE_CHANGED', label: 'IV site changed' },
      { code: 'IV_DISCONTINUED', label: 'IV discontinued' },
      { code: 'IV_FLUSHED', label: 'IV line flushed' },
      { code: 'BLOOD_TRANSFUSION', label: 'Blood transfusion administered' },
      { code: 'TPN_ADMINISTERED', label: 'TPN administered' },
    ],
  },
  {
    category: 'Wound Care',
    categoryCode: 'WOUND_CARE',
    icon: '🩹',
    items: [
      { code: 'WOUND_DRESSING_CHANGED', label: 'Wound dressing changed' },
      { code: 'WOUND_ASSESSED', label: 'Wound assessed' },
      { code: 'WOUND_IRRIGATED', label: 'Wound irrigated' },
      { code: 'SURGICAL_SITE_CARE', label: 'Surgical site care' },
      { code: 'PRESSURE_ULCER_CARE', label: 'Pressure ulcer care' },
      { code: 'DRAIN_CARE', label: 'Drain care/emptied' },
      { code: 'SUTURE_STAPLE_REMOVAL', label: 'Suture/staple removal' },
    ],
  },
  {
    category: 'Respiratory Care',
    categoryCode: 'RESPIRATORY',
    icon: '🫁',
    items: [
      { code: 'OXYGEN_THERAPY_STARTED', label: 'Oxygen therapy started' },
      { code: 'OXYGEN_ADJUSTED', label: 'Oxygen flow rate adjusted' },
      { code: 'OXYGEN_DISCONTINUED', label: 'Oxygen discontinued' },
      { code: 'SUCTIONING_PERFORMED', label: 'Suctioning performed' },
      { code: 'CHEST_PHYSIO', label: 'Chest physiotherapy' },
      {
        code: 'INCENTIVE_SPIROMETRY',
        label: 'Incentive spirometry encouraged',
      },
      { code: 'TRACH_CARE', label: 'Tracheostomy care' },
      { code: 'CPAP_BIPAP_ADJUSTED', label: 'CPAP/BiPAP adjusted' },
    ],
  },
  {
    category: 'Monitoring & Assessment',
    categoryCode: 'MONITORING',
    icon: '📊',
    items: [
      { code: 'VITALS_RECORDED', label: 'Vital signs recorded' },
      { code: 'NEURO_CHECK', label: 'Neurological check performed' },
      { code: 'BLOOD_GLUCOSE_CHECKED', label: 'Blood glucose checked' },
      { code: 'INTAKE_OUTPUT_RECORDED', label: 'Intake/output recorded' },
      { code: 'PAIN_ASSESSED', label: 'Pain assessment completed' },
      { code: 'FALL_RISK_ASSESSED', label: 'Fall risk assessed' },
      { code: 'SKIN_ASSESSMENT', label: 'Skin assessment completed' },
      { code: 'CARDIAC_MONITORING', label: 'Cardiac monitoring' },
    ],
  },
  {
    category: 'Patient Mobility & Positioning',
    categoryCode: 'MOBILITY',
    icon: '🚶',
    items: [
      { code: 'PATIENT_REPOSITIONED', label: 'Patient repositioned' },
      { code: 'AMBULATION_ASSISTED', label: 'Ambulation assisted' },
      { code: 'TRANSFER_ASSISTED', label: 'Transfer assisted' },
      { code: 'ROM_EXERCISES', label: 'Range of motion exercises' },
      { code: 'BED_TO_CHAIR', label: 'Assisted bed to chair' },
      { code: 'FALL_PRECAUTIONS', label: 'Fall precautions implemented' },
    ],
  },
  {
    category: 'Elimination Care',
    categoryCode: 'ELIMINATION',
    icon: '🚽',
    items: [
      { code: 'FOLEY_INSERTED', label: 'Foley catheter inserted' },
      { code: 'FOLEY_CARE', label: 'Foley catheter care' },
      { code: 'FOLEY_REMOVED', label: 'Foley catheter removed' },
      { code: 'BLADDER_SCAN', label: 'Bladder scan performed' },
      { code: 'ENEMA_GIVEN', label: 'Enema administered' },
      { code: 'BOWEL_CARE', label: 'Bowel care provided' },
      { code: 'OSTOMY_CARE', label: 'Ostomy care' },
      { code: 'INCONTINENCE_CARE', label: 'Incontinence care' },
    ],
  },
  {
    category: 'Nutrition & Hydration',
    categoryCode: 'NUTRITION',
    icon: '🍽️',
    items: [
      { code: 'FEEDING_ASSISTED', label: 'Feeding assistance provided' },
      { code: 'NG_TUBE_INSERTED', label: 'NG tube inserted' },
      { code: 'NG_TUBE_FEEDING', label: 'NG tube feeding given' },
      { code: 'NG_TUBE_REMOVED', label: 'NG tube removed' },
      { code: 'PEG_TUBE_CARE', label: 'PEG tube care' },
      { code: 'DIETARY_INTAKE_MONITORED', label: 'Dietary intake monitored' },
      { code: 'FLUID_ENCOURAGED', label: 'Fluid intake encouraged' },
    ],
  },
  {
    category: 'Hygiene & Comfort',
    categoryCode: 'HYGIENE',
    icon: '🛁',
    items: [
      { code: 'BED_BATH', label: 'Bed bath given' },
      { code: 'SHOWER_ASSISTED', label: 'Shower/bath assisted' },
      { code: 'ORAL_CARE', label: 'Oral care provided' },
      { code: 'SKIN_CARE', label: 'Skin care provided' },
      { code: 'LINEN_CHANGED', label: 'Linen changed' },
      { code: 'COMFORT_MEASURES', label: 'Comfort measures provided' },
    ],
  },
  {
    category: 'Communication & Escalation',
    categoryCode: 'COMMUNICATION',
    icon: '📞',
    items: [
      {
        code: 'DOCTOR_NOTIFIED_CHANGE_CONDITION',
        label: 'Doctor notified of change in condition',
      },
      {
        code: 'DOCTOR_NOTIFIED_CRITICAL',
        label: 'Doctor notified of critical value',
      },
      { code: 'FAMILY_UPDATED', label: 'Family/caregiver updated' },
      { code: 'PATIENT_EDUCATION', label: 'Patient education provided' },
      { code: 'DISCHARGE_TEACHING', label: 'Discharge teaching provided' },
      { code: 'RAPID_RESPONSE_CALLED', label: 'Rapid response called' },
      { code: 'CODE_BLUE_INITIATED', label: 'Code blue initiated' },
    ],
  },
  {
    category: 'Safety & Precautions',
    categoryCode: 'SAFETY',
    icon: '⚠️',
    items: [
      { code: 'RESTRAINTS_APPLIED', label: 'Restraints applied' },
      { code: 'RESTRAINTS_REMOVED', label: 'Restraints removed' },
      {
        code: 'ISOLATION_PRECAUTIONS',
        label: 'Isolation precautions implemented',
      },
      { code: 'SIDE_RAILS_UP', label: 'Side rails raised' },
      { code: 'BED_ALARM_ACTIVATED', label: 'Bed alarm activated' },
      { code: 'PATIENT_IDENTIFIED', label: 'Patient identification verified' },
    ],
  },
  {
    category: 'Specimen Collection',
    categoryCode: 'SPECIMEN',
    icon: '🧪',
    items: [
      { code: 'BLOOD_SAMPLE_COLLECTED', label: 'Blood sample collected' },
      { code: 'URINE_SAMPLE_COLLECTED', label: 'Urine sample collected' },
      { code: 'STOOL_SAMPLE_COLLECTED', label: 'Stool sample collected' },
      { code: 'WOUND_CULTURE', label: 'Wound culture obtained' },
      { code: 'SPUTUM_COLLECTED', label: 'Sputum sample collected' },
    ],
  },
  {
    category: 'Other',
    categoryCode: 'OTHER',
    icon: '📝',
    items: [{ code: 'OTHER_CUSTOM', label: 'Other intervention (specify)' }],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all intervention codes as a flat array
 */
export function getAllInterventionCodes(): string[] {
  return INTERVENTION_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => item.code),
  );
}

/**
 * Get intervention item by code
 */
export function getInterventionByCode(
  code: string,
): InterventionItem | undefined {
  for (const category of INTERVENTION_CATEGORIES) {
    const item = category.items.find((i) => i.code === code);
    if (item) return item;
  }
  return undefined;
}

/**
 * Get category by code
 */
export function getCategoryByCode(
  categoryCode: string,
): InterventionCategory | undefined {
  return INTERVENTION_CATEGORIES.find(
    (cat) => cat.categoryCode === categoryCode,
  );
}

/**
 * Get category for an intervention code
 */
export function getCategoryForIntervention(
  interventionCode: string,
): InterventionCategory | undefined {
  return INTERVENTION_CATEGORIES.find((cat) =>
    cat.items.some((item) => item.code === interventionCode),
  );
}

/**
 * Get intervention label by code
 */
export function getInterventionLabel(code: string): string {
  const item = getInterventionByCode(code);
  return item?.label || code;
}

/**
 * Get category label by intervention code
 */
export function getCategoryLabel(interventionCode: string): string {
  const category = getCategoryForIntervention(interventionCode);
  return category?.category || 'Unknown';
}

/**
 * Validate if an intervention code is valid
 */
export function isValidInterventionCode(code: string): boolean {
  return getAllInterventionCodes().includes(code) || code === 'OTHER_CUSTOM';
}

/**
 * Get color class for category badge
 */
export function getCategoryColor(categoryCode: string): string {
  const colors: Record<string, string> = {
    MED_THERAPY: 'bg-purple-100 text-purple-700',
    IV_FLUIDS: 'bg-blue-100 text-blue-700',
    WOUND_CARE: 'bg-red-100 text-red-700',
    RESPIRATORY: 'bg-cyan-100 text-cyan-700',
    MONITORING: 'bg-green-100 text-green-700',
    MOBILITY: 'bg-orange-100 text-orange-700',
    ELIMINATION: 'bg-amber-100 text-amber-700',
    NUTRITION: 'bg-lime-100 text-lime-700',
    HYGIENE: 'bg-pink-100 text-pink-700',
    COMMUNICATION: 'bg-indigo-100 text-indigo-700',
    SAFETY: 'bg-yellow-100 text-yellow-700',
    SPECIMEN: 'bg-teal-100 text-teal-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };
  return colors[categoryCode] || 'bg-gray-100 text-gray-700';
}

/**
 * Get icon for category
 */
export function getCategoryIcon(categoryCode: string): string {
  const category = INTERVENTION_CATEGORIES.find(
    (cat) => cat.categoryCode === categoryCode,
  );
  return category?.icon || '📝';
}
