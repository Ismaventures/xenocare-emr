// =============================================================================
// XENOCARE EMR - Unified Procedure Checklist Rules Engine
// Dynamic checklist enforcement based on procedure classification
// =============================================================================

import type {
  ProcedureCatalogue,
  Procedure,
  AnesthesiaType,
  ProcedureCategory,
} from '../../../types/database.types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Procedure classification for checklist enforcement
 */
export type ProcedureClass = 'major' | 'minor';

/**
 * Care setting where procedure is performed
 */
export type CareSetting = 'theatre' | 'clinic' | 'bedside' | 'procedure_room';

/**
 * Risk level assessment
 */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Checklist item applicability status
 */
export type ChecklistApplicability = 'required' | 'optional' | 'not_applicable';

/**
 * Checklist phase
 */
export type ChecklistPhase = 'pre' | 'intra' | 'post';

/**
 * Checklist item definition
 */
export interface ChecklistItemDefinition {
  id: string;
  key: string;
  phase: ChecklistPhase;
  text: string;
  description?: string;
  defaultApplicability: ChecklistApplicability;
  // Rules for dynamic applicability
  rules: ApplicabilityRule[];
}

/**
 * Rule condition for checklist applicability
 */
export interface ApplicabilityRule {
  condition: RuleCondition;
  result: ChecklistApplicability;
}

/**
 * Condition types for rules
 */
export type RuleCondition =
  | { type: 'procedure_class'; value: ProcedureClass | ProcedureClass[] }
  | { type: 'care_setting'; value: CareSetting | CareSetting[] }
  | { type: 'anesthesia_type'; value: AnesthesiaType | AnesthesiaType[] }
  | { type: 'risk_level'; value: RiskLevel | RiskLevel[] }
  | { type: 'requires_anesthesia'; value: boolean }
  | { type: 'requires_sedation'; value: boolean }
  | { type: 'requires_fasting'; value: boolean }
  | { type: 'laterality_applicable'; value: boolean }
  | { type: 'always' };

/**
 * Procedure context for rule evaluation
 */
export interface ProcedureContext {
  procedureClass: ProcedureClass;
  careSetting: CareSetting;
  anesthesiaType: AnesthesiaType;
  riskLevel: RiskLevel;
  requiresAnesthesia: boolean;
  requiresSedation: boolean;
  requiresFasting: boolean;
  lateralityApplicable: boolean;
  category: ProcedureCategory;
}

/**
 * Evaluated checklist item with computed applicability
 */
export interface EvaluatedChecklistItem {
  id: string;
  key: string;
  phase: ChecklistPhase;
  text: string;
  description?: string;
  applicability: ChecklistApplicability;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  overridden?: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

/**
 * Checklist override record for audit
 */
export interface ChecklistOverride {
  itemId: string;
  itemKey: string;
  originalApplicability: ChecklistApplicability;
  newApplicability: ChecklistApplicability;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

/**
 * Validation result for procedure state transitions
 */
export interface ValidationResult {
  canProceed: boolean;
  blockers: ValidationBlocker[];
  warnings: ValidationWarning[];
}

export interface ValidationBlocker {
  itemId: string;
  itemText: string;
  reason: string;
}

export interface ValidationWarning {
  itemId: string;
  itemText: string;
  message: string;
}

// =============================================================================
// CHECKLIST ITEM DEFINITIONS (Unified for all procedure types)
// =============================================================================

export const CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  // ========== PRE-PROCEDURE ITEMS ==========
  {
    id: 'pre-identity',
    key: 'identity_verified',
    phase: 'pre',
    text: 'Patient identity verified',
    description:
      'Verify patient identity using at least two identifiers (name, DOB, hospital ID)',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'pre-consent',
    key: 'consent_obtained',
    phase: 'pre',
    text: 'Informed consent obtained',
    description: 'Patient or guardian has signed informed consent form',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'pre-allergies',
    key: 'allergies_reviewed',
    phase: 'pre',
    text: 'Allergies reviewed',
    description: 'All known allergies have been verified and documented',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'pre-npo',
    key: 'fasting_confirmed',
    phase: 'pre',
    text: 'NPO status confirmed',
    description: 'Confirm patient fasting status per protocol',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'requires_fasting', value: true },
        result: 'required',
      },
      {
        condition: {
          type: 'anesthesia_type',
          value: ['sedation', 'general', 'spinal', 'epidural'],
        },
        result: 'required',
      },
      {
        condition: { type: 'anesthesia_type', value: ['none', 'local'] },
        result: 'not_applicable',
      },
    ],
  },
  {
    id: 'pre-site-marked',
    key: 'site_marked',
    phase: 'pre',
    text: 'Site marked (if applicable)',
    description:
      'Surgical/procedure site has been marked by operating physician',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'laterality_applicable', value: true },
        result: 'required',
      },
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'major' },
        result: 'required',
      },
      {
        condition: { type: 'care_setting', value: 'bedside' },
        result: 'not_applicable',
      },
    ],
  },
  {
    id: 'pre-iv-access',
    key: 'iv_access_established',
    phase: 'pre',
    text: 'IV access established',
    description: 'Intravenous access has been secured',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'procedure_class', value: 'major' },
        result: 'required',
      },
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: {
          type: 'anesthesia_type',
          value: ['sedation', 'general', 'spinal', 'epidural', 'regional'],
        },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'minor' },
        result: 'optional',
      },
    ],
  },
  {
    id: 'pre-meds',
    key: 'pre_meds_given',
    phase: 'pre',
    text: 'Pre-procedure medications given',
    description: 'Prescribed pre-procedure medications administered',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'requires_sedation', value: true },
        result: 'required',
      },
      {
        condition: { type: 'anesthesia_type', value: ['sedation', 'general'] },
        result: 'optional',
      },
    ],
  },
  {
    id: 'pre-vitals',
    key: 'vitals_documented',
    phase: 'pre',
    text: 'Patient vital signs documented',
    description: 'Baseline vital signs recorded',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },

  // ========== INTRA-PROCEDURE ITEMS ==========
  {
    id: 'intra-timeout',
    key: 'timeout_performed',
    phase: 'intra',
    text: 'Time-out performed',
    description: 'Surgical safety time-out completed with team',
    defaultApplicability: 'required',
    rules: [
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'major' },
        result: 'required',
      },
      {
        condition: { type: 'care_setting', value: 'bedside' },
        result: 'optional',
      },
    ],
  },
  {
    id: 'intra-team-intro',
    key: 'team_introduced',
    phase: 'intra',
    text: 'Team introduction completed',
    description: 'All team members introduced with roles',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'minor' },
        result: 'optional',
      },
    ],
  },
  {
    id: 'intra-equipment',
    key: 'equipment_checked',
    phase: 'intra',
    text: 'Equipment checked',
    description: 'All required equipment verified and functional',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'intra-sterile',
    key: 'sterile_field_maintained',
    phase: 'intra',
    text: 'Sterile field maintained',
    description: 'Sterility of field confirmed throughout procedure',
    defaultApplicability: 'required',
    rules: [
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'major' },
        result: 'required',
      },
      {
        condition: { type: 'care_setting', value: 'bedside' },
        result: 'optional',
      },
    ],
  },
  {
    id: 'intra-specimen',
    key: 'specimen_labeled',
    phase: 'intra',
    text: 'Specimen labeled (if applicable)',
    description: 'All specimens properly labeled with patient identifiers',
    defaultApplicability: 'optional',
    rules: [], // Always optional - depends on whether specimen collected
  },
  {
    id: 'intra-counts',
    key: 'counts_correct',
    phase: 'intra',
    text: 'Counts correct (if applicable)',
    description: 'Instrument and sponge counts verified correct',
    defaultApplicability: 'optional',
    rules: [
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'major' },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'minor' },
        result: 'not_applicable',
      },
    ],
  },

  // ========== POST-PROCEDURE ITEMS ==========
  {
    id: 'post-notes',
    key: 'notes_documented',
    phase: 'post',
    text: 'Procedure notes documented',
    description: 'Complete procedure notes including findings',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'post-orders',
    key: 'orders_written',
    phase: 'post',
    text: 'Post-procedure orders written',
    description: 'Post-operative orders documented',
    defaultApplicability: 'required',
    rules: [{ condition: { type: 'always' }, result: 'required' }],
  },
  {
    id: 'post-monitoring',
    key: 'monitoring_initiated',
    phase: 'post',
    text: 'Patient monitoring initiated',
    description: 'Appropriate post-procedure monitoring started',
    defaultApplicability: 'required',
    rules: [
      {
        condition: { type: 'care_setting', value: 'theatre' },
        result: 'required',
      },
      {
        condition: {
          type: 'anesthesia_type',
          value: ['sedation', 'general', 'spinal', 'epidural'],
        },
        result: 'required',
      },
      {
        condition: { type: 'procedure_class', value: 'minor' },
        result: 'optional',
      },
    ],
  },
  {
    id: 'post-education',
    key: 'patient_education',
    phase: 'post',
    text: 'Family/patient education provided',
    description: 'Post-procedure care instructions given to patient/family',
    defaultApplicability: 'optional',
    rules: [],
  },
  {
    id: 'post-followup',
    key: 'followup_scheduled',
    phase: 'post',
    text: 'Follow-up scheduled',
    description: 'Follow-up appointment scheduled if needed',
    defaultApplicability: 'optional',
    rules: [],
  },
];

// =============================================================================
// RULES ENGINE FUNCTIONS
// =============================================================================

/**
 * Derive procedure context from procedure and catalogue data
 */
export function deriveProcedureContext(
  procedure: Partial<Procedure>,
  catalogue?: ProcedureCatalogue | null,
): ProcedureContext {
  // Determine procedure class from category or explicit setting
  const category = catalogue?.category || 'other';
  const procedureClass = determineProcedureClass(category, catalogue);

  // Determine care setting from location or category
  const careSetting = determineCareSetting(
    procedure.location,
    category,
    catalogue,
  );

  // Determine risk level
  const riskLevel = determineRiskLevel(
    procedureClass,
    procedure.anesthesia_type,
    catalogue,
  );

  // Get anesthesia type
  const anesthesiaType =
    procedure.anesthesia_type ||
    (catalogue?.anesthesia_type as AnesthesiaType) ||
    'none';

  return {
    procedureClass,
    careSetting,
    anesthesiaType,
    riskLevel,
    requiresAnesthesia:
      catalogue?.requires_anesthesia || anesthesiaType !== 'none',
    requiresSedation:
      catalogue?.requires_sedation || anesthesiaType === 'sedation',
    requiresFasting:
      catalogue?.requires_fasting ||
      ['sedation', 'general', 'spinal', 'epidural'].includes(anesthesiaType),
    lateralityApplicable:
      procedure.laterality !== null && procedure.laterality !== 'na',
    category,
  };
}

/**
 * Determine procedure class from category
 */
function determineProcedureClass(
  category: ProcedureCategory,
  catalogue?: ProcedureCatalogue | null,
): ProcedureClass {
  // Major categories
  const majorCategories: ProcedureCategory[] = [
    'surgical',
    'major',
    'cardiovascular',
    'neurological',
    'obstetric',
  ];

  if (majorCategories.includes(category)) return 'major';

  // Check if requires admission (usually major)
  if (catalogue?.requires_admission) return 'major';

  // Check anesthesia type
  if (
    catalogue?.anesthesia_type &&
    ['general', 'spinal', 'epidural'].includes(catalogue.anesthesia_type)
  ) {
    return 'major';
  }

  return 'minor';
}

/**
 * Determine care setting from location and category
 */
function determineCareSetting(
  location?: string | null,
  category?: ProcedureCategory,
  catalogue?: ProcedureCatalogue | null,
): CareSetting {
  const locationLower = (
    location ||
    catalogue?.typical_location ||
    ''
  ).toLowerCase();

  if (
    locationLower.includes('theatre') ||
    locationLower.includes('or') ||
    locationLower.includes('operating')
  ) {
    return 'theatre';
  }
  if (locationLower.includes('bedside') || locationLower.includes('ward')) {
    return 'bedside';
  }
  if (
    locationLower.includes('clinic') ||
    locationLower.includes('outpatient')
  ) {
    return 'clinic';
  }
  if (locationLower.includes('procedure room')) {
    return 'procedure_room';
  }

  // Default based on category
  const theatreCategories: ProcedureCategory[] = [
    'surgical',
    'major',
    'cardiovascular',
    'neurological',
    'obstetric',
  ];
  if (category && theatreCategories.includes(category)) {
    return 'theatre';
  }

  return 'procedure_room';
}

/**
 * Determine risk level
 */
function determineRiskLevel(
  procedureClass: ProcedureClass,
  anesthesiaType?: AnesthesiaType | null,
  catalogue?: ProcedureCatalogue | null,
): RiskLevel {
  if (procedureClass === 'major') {
    if (anesthesiaType === 'general') return 'high';
    return 'moderate';
  }

  if (
    anesthesiaType &&
    ['sedation', 'regional', 'spinal', 'epidural'].includes(anesthesiaType)
  ) {
    return 'moderate';
  }

  return 'low';
}

/**
 * Evaluate a rule condition against procedure context
 */
function evaluateCondition(
  condition: RuleCondition,
  context: ProcedureContext,
): boolean {
  switch (condition.type) {
    case 'always':
      return true;

    case 'procedure_class':
      return Array.isArray(condition.value)
        ? condition.value.includes(context.procedureClass)
        : condition.value === context.procedureClass;

    case 'care_setting':
      return Array.isArray(condition.value)
        ? condition.value.includes(context.careSetting)
        : condition.value === context.careSetting;

    case 'anesthesia_type':
      return Array.isArray(condition.value)
        ? condition.value.includes(context.anesthesiaType)
        : condition.value === context.anesthesiaType;

    case 'risk_level':
      return Array.isArray(condition.value)
        ? condition.value.includes(context.riskLevel)
        : condition.value === context.riskLevel;

    case 'requires_anesthesia':
      return context.requiresAnesthesia === condition.value;

    case 'requires_sedation':
      return context.requiresSedation === condition.value;

    case 'requires_fasting':
      return context.requiresFasting === condition.value;

    case 'laterality_applicable':
      return context.lateralityApplicable === condition.value;

    default:
      return false;
  }
}

/**
 * Determine applicability for a checklist item based on context
 */
export function determineApplicability(
  item: ChecklistItemDefinition,
  context: ProcedureContext,
): ChecklistApplicability {
  // Evaluate rules in order - first matching rule wins
  for (const rule of item.rules) {
    if (evaluateCondition(rule.condition, context)) {
      return rule.result;
    }
  }

  // Fall back to default
  return item.defaultApplicability;
}

/**
 * Evaluate all checklist items for a procedure
 */
export function evaluateChecklist(
  procedure: Partial<Procedure>,
  catalogue?: ProcedureCatalogue | null,
  savedChecklist?: Record<string, any>,
): EvaluatedChecklistItem[] {
  const context = deriveProcedureContext(procedure, catalogue);

  return CHECKLIST_ITEMS.map((item) => {
    const applicability = determineApplicability(item, context);
    const savedItem = savedChecklist?.[item.key];

    return {
      id: item.id,
      key: item.key,
      phase: item.phase,
      text: item.text,
      description: item.description,
      applicability,
      completed: savedItem === true || savedChecklist?.[item.id] === true,
      completedBy:
        savedChecklist?.[`${item.key}_by`] || savedChecklist?.[`${item.id}_by`],
      completedAt:
        savedChecklist?.[`${item.key}_at`] || savedChecklist?.[`${item.id}_at`],
      overridden: savedChecklist?.[`${item.key}_overridden`] === true,
      overrideReason: savedChecklist?.[`${item.key}_override_reason`],
      overriddenBy: savedChecklist?.[`${item.key}_overridden_by`],
      overriddenAt: savedChecklist?.[`${item.key}_overridden_at`],
    };
  });
}

/**
 * Get checklist items by phase
 */
export function getChecklistByPhase(
  items: EvaluatedChecklistItem[],
  phase: ChecklistPhase,
): EvaluatedChecklistItem[] {
  return items.filter((item) => item.phase === phase);
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate if procedure can be started (transition to in_progress)
 */
export function validateCanStartProcedure(
  checklist: EvaluatedChecklistItem[],
): ValidationResult {
  const preItems = getChecklistByPhase(checklist, 'pre');
  const blockers: ValidationBlocker[] = [];
  const warnings: ValidationWarning[] = [];

  for (const item of preItems) {
    if (
      item.applicability === 'required' &&
      !item.completed &&
      !item.overridden
    ) {
      blockers.push({
        itemId: item.id,
        itemText: item.text,
        reason: 'Required pre-procedure item not completed',
      });
    } else if (item.applicability === 'optional' && !item.completed) {
      warnings.push({
        itemId: item.id,
        itemText: item.text,
        message: 'Optional item not completed',
      });
    }
  }

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Validate if procedure can be completed
 */
export function validateCanCompleteProcedure(
  checklist: EvaluatedChecklistItem[],
  hasDocumentation: boolean,
): ValidationResult {
  const postItems = getChecklistByPhase(checklist, 'post');
  const blockers: ValidationBlocker[] = [];
  const warnings: ValidationWarning[] = [];

  // Check documentation requirement
  if (!hasDocumentation) {
    blockers.push({
      itemId: 'documentation',
      itemText: 'Procedure Documentation',
      reason: 'Procedure documentation must be saved before completion',
    });
  }

  // Check required post-procedure items
  for (const item of postItems) {
    if (
      item.applicability === 'required' &&
      !item.completed &&
      !item.overridden
    ) {
      blockers.push({
        itemId: item.id,
        itemText: item.text,
        reason: 'Required post-procedure item not completed',
      });
    }
  }

  // Check intra-procedure items
  const intraItems = getChecklistByPhase(checklist, 'intra');
  for (const item of intraItems) {
    if (
      item.applicability === 'required' &&
      !item.completed &&
      !item.overridden
    ) {
      blockers.push({
        itemId: item.id,
        itemText: item.text,
        reason: 'Required intra-procedure item not completed',
      });
    }
  }

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Get completion statistics for a checklist phase
 */
export function getPhaseProgress(
  items: EvaluatedChecklistItem[],
  phase: ChecklistPhase,
): { completed: number; required: number; total: number; percentage: number } {
  const phaseItems = getChecklistByPhase(items, phase);
  const applicable = phaseItems.filter(
    (i) => i.applicability !== 'not_applicable',
  );
  const required = applicable.filter((i) => i.applicability === 'required');
  const completed = applicable.filter((i) => i.completed || i.overridden);
  const requiredCompleted = required.filter((i) => i.completed || i.overridden);

  return {
    completed: completed.length,
    required: required.length,
    total: applicable.length,
    percentage:
      applicable.length > 0
        ? Math.round((completed.length / applicable.length) * 100)
        : 100,
  };
}

/**
 * Check if all required items for a phase are complete
 */
export function isPhaseComplete(
  items: EvaluatedChecklistItem[],
  phase: ChecklistPhase,
): boolean {
  const phaseItems = getChecklistByPhase(items, phase);
  return phaseItems
    .filter((i) => i.applicability === 'required')
    .every((i) => i.completed || i.overridden);
}

// =============================================================================
// OVERRIDE FUNCTIONS
// =============================================================================

/**
 * Create an override record for audit
 */
export function createOverrideRecord(
  item: EvaluatedChecklistItem,
  newApplicability: ChecklistApplicability,
  reason: string,
  userId: string,
  userName: string,
): ChecklistOverride {
  return {
    itemId: item.id,
    itemKey: item.key,
    originalApplicability: item.applicability,
    newApplicability,
    reason,
    overriddenBy: userName,
    overriddenAt: new Date().toISOString(),
  };
}

/**
 * Apply override to checklist data for saving
 */
export function applyOverrideToChecklistData(
  currentData: Record<string, any>,
  override: ChecklistOverride,
): Record<string, any> {
  return {
    ...currentData,
    [`${override.itemKey}_overridden`]: true,
    [`${override.itemKey}_override_reason`]: override.reason,
    [`${override.itemKey}_overridden_by`]: override.overriddenBy,
    [`${override.itemKey}_overridden_at`]: override.overriddenAt,
    [`${override.itemKey}_original_applicability`]:
      override.originalApplicability,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert database checklist key to item ID
 */
export function dbKeyToItemId(key: string): string | undefined {
  const item = CHECKLIST_ITEMS.find((i) => i.key === key);
  return item?.id;
}

/**
 * Convert item ID to database checklist key
 */
export function itemIdToDbKey(id: string): string | undefined {
  const item = CHECKLIST_ITEMS.find((i) => i.id === id);
  return item?.key;
}

/**
 * Get checklist item definition by ID
 */
export function getChecklistItemById(
  id: string,
): ChecklistItemDefinition | undefined {
  return CHECKLIST_ITEMS.find((i) => i.id === id);
}

/**
 * Get checklist item definition by key
 */
export function getChecklistItemByKey(
  key: string,
): ChecklistItemDefinition | undefined {
  return CHECKLIST_ITEMS.find((i) => i.key === key);
}

export default {
  CHECKLIST_ITEMS,
  deriveProcedureContext,
  determineApplicability,
  evaluateChecklist,
  getChecklistByPhase,
  validateCanStartProcedure,
  validateCanCompleteProcedure,
  getPhaseProgress,
  isPhaseComplete,
  createOverrideRecord,
  applyOverrideToChecklistData,
};
