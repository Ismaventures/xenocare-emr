/**
 * Role-Based Permissions System
 *
 * Implements role-based state control as defined in EMR Workflow Reference.
 * Provides helpers for checking permissions on state transitions and field access.
 */

import { supabase } from '../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

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
  | 'config_admin';

export type EntityType =
  | 'queue'
  | 'lab'
  | 'radiology'
  | 'pharmacy'
  | 'consultation'
  | 'treatment_plan'
  | 'billing'
  | 'encounter';

export interface StateTransitionPermission {
  entity_type: EntityType;
  from_state: string;
  to_state: string;
  allowed_roles: UserRole[];
  requires_reason: boolean;
  requires_approval: boolean;
  approval_roles?: UserRole[];
}

export interface FieldPermission {
  entity_type: EntityType;
  field_name: string;
  can_read: UserRole[];
  can_write: UserRole[];
}

// =============================================================================
// Role Hierarchy & Inheritance
// =============================================================================

// Roles that inherit from other roles
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  super_admin: [
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'billing_clerk',
    'receptionist',
    'cashier',
    'customer_service',
    'inventory_manager',
    'config_admin',
  ],
  admin: ['receptionist', 'customer_service'],
  medical_director: ['doctor'],
  doctor: [],
  nurse: [],
  lab_technician: [],
  radiologist: [],
  pharmacist: [],
  billing_clerk: ['cashier'],
  receptionist: [],
  cashier: [],
  customer_service: [],
  inventory_manager: [],
  config_admin: [],
};

/**
 * Get all effective roles for a user (including inherited roles)
 */
export function getEffectiveRoles(role: UserRole): UserRole[] {
  const roles: UserRole[] = [role];
  const inherited = ROLE_HIERARCHY[role] || [];

  for (const inheritedRole of inherited) {
    if (!roles.includes(inheritedRole)) {
      roles.push(inheritedRole);
      roles.push(...getEffectiveRoles(inheritedRole));
    }
  }

  return [...new Set(roles)];
}

// =============================================================================
// Role Permissions Matrix (from EMR Workflow Reference)
// =============================================================================

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'], // All permissions
  admin: ['manage_users', 'view_reports', 'manage_settings'],
  medical_director: [
    'consult',
    'diagnose',
    'prescribe',
    'order_tests',
    'view_all_records',
    'approve_referrals',
  ],
  doctor: [
    'consult',
    'diagnose',
    'prescribe',
    'order_tests',
    'create_treatment_plan',
    'view_results',
  ],
  nurse: [
    'record_vitals',
    'manage_queue',
    'view_treatment_plan',
    'execute_tasks',
    'triage',
  ],
  lab_technician: [
    'accept_tests',
    'collect_samples',
    'upload_results',
    'view_lab_requests',
  ],
  radiologist: [
    'accept_scans',
    'perform_imaging',
    'upload_reports',
    'view_radiology_requests',
  ],
  pharmacist: [
    'verify_prescriptions',
    'dispense_drugs',
    'check_interactions',
    'manage_inventory',
  ],
  billing_clerk: ['generate_bills', 'view_invoices', 'manage_pricing'],
  cashier: ['process_payments', 'issue_receipts', 'apply_waivers'],
  receptionist: [
    'register_patients',
    'create_encounters',
    'update_demographics',
  ],
  customer_service: ['view_appointments', 'manage_complaints'],
  inventory_manager: ['manage_stock', 'view_inventory', 'create_orders'],
  config_admin: ['manage_settings', 'configure_system'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const effectiveRoles = getEffectiveRoles(role);

  for (const effectiveRole of effectiveRoles) {
    const permissions = ROLE_PERMISSIONS[effectiveRole] || [];
    if (permissions.includes('*') || permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// State Transition Permissions
// =============================================================================

// In-memory cache of transition permissions (populated from DB on first use)
let transitionPermissionsCache: StateTransitionPermission[] | null = null;

/**
 * Load state transition permissions from database
 */
async function loadTransitionPermissions(): Promise<
  StateTransitionPermission[]
> {
  if (transitionPermissionsCache) {
    return transitionPermissionsCache;
  }

  const { data, error } = await supabase
    .from('state_transition_permissions')
    .select('*');

  if (error) {
    console.error('Failed to load transition permissions:', error);
    return [];
  }

  transitionPermissionsCache = data as StateTransitionPermission[];
  return transitionPermissionsCache;
}

/**
 * Clear the permissions cache (call when permissions are updated)
 */
export function clearPermissionsCache(): void {
  transitionPermissionsCache = null;
}

/**
 * Check if a role can perform a state transition
 */
export async function canTransitionState(
  entityType: EntityType,
  fromState: string,
  toState: string,
  role: UserRole,
): Promise<{
  allowed: boolean;
  requiresReason: boolean;
  requiresApproval: boolean;
}> {
  const permissions = await loadTransitionPermissions();

  const permission = permissions.find(
    (p) =>
      p.entity_type === entityType &&
      p.from_state === fromState &&
      p.to_state === toState,
  );

  if (!permission) {
    // No specific permission found - check if super_admin or admin
    const effectiveRoles = getEffectiveRoles(role);
    const isAdmin =
      effectiveRoles.includes('super_admin') ||
      effectiveRoles.includes('admin');
    return { allowed: isAdmin, requiresReason: false, requiresApproval: false };
  }

  const effectiveRoles = getEffectiveRoles(role);
  const allowed = permission.allowed_roles.some((r) =>
    effectiveRoles.includes(r as UserRole),
  );

  return {
    allowed,
    requiresReason: permission.requires_reason,
    requiresApproval: permission.requires_approval,
  };
}

/**
 * Synchronous check using database function (for server-side validation)
 */
export async function canTransitionStateDb(
  entityType: EntityType,
  fromState: string,
  toState: string,
  role: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_transition_state', {
    p_entity_type: entityType,
    p_from_state: fromState,
    p_to_state: toState,
    p_user_role: role,
  });

  if (error) {
    console.error('Failed to check transition permission:', error);
    return false;
  }

  return data === true;
}

// =============================================================================
// Field-Level Permissions
// =============================================================================

// Static field permissions (from EMR Workflow Reference - Visibility Matrix)
const FIELD_PERMISSIONS: FieldPermission[] = [
  // Consultation fields - Doctor only for clinical data
  {
    entity_type: 'consultation',
    field_name: 'complaints',
    can_read: ['doctor', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'consultation',
    field_name: 'clinical_notes',
    can_read: ['doctor', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'consultation',
    field_name: 'diagnosis',
    can_read: ['doctor', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'consultation',
    field_name: 'treatment_plan',
    can_read: ['doctor', 'nurse', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },

  // Treatment plan - Nurse can view but not modify
  {
    entity_type: 'treatment_plan',
    field_name: 'title',
    can_read: ['doctor', 'nurse', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'treatment_plan',
    field_name: 'instructions',
    can_read: ['doctor', 'nurse', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'treatment_plan',
    field_name: 'tasks',
    can_read: ['doctor', 'nurse', 'medical_director', 'super_admin', 'admin'],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'treatment_plan',
    field_name: 'execution_notes',
    can_read: ['doctor', 'nurse', 'medical_director', 'super_admin', 'admin'],
    can_write: ['nurse'],
  },

  // Lab results
  {
    entity_type: 'lab',
    field_name: 'result',
    can_read: [
      'doctor',
      'lab_technician',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['lab_technician'],
  },
  {
    entity_type: 'lab',
    field_name: 'interpretation',
    can_read: [
      'doctor',
      'lab_technician',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['lab_technician', 'doctor'],
  },

  // Radiology reports
  {
    entity_type: 'radiology',
    field_name: 'report',
    can_read: [
      'doctor',
      'radiologist',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['radiologist'],
  },
  {
    entity_type: 'radiology',
    field_name: 'findings',
    can_read: [
      'doctor',
      'radiologist',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['radiologist'],
  },

  // Pharmacy
  {
    entity_type: 'pharmacy',
    field_name: 'prescription',
    can_read: [
      'doctor',
      'pharmacist',
      'nurse',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['doctor', 'medical_director'],
  },
  {
    entity_type: 'pharmacy',
    field_name: 'dispense_notes',
    can_read: [
      'doctor',
      'pharmacist',
      'medical_director',
      'super_admin',
      'admin',
    ],
    can_write: ['pharmacist'],
  },

  // Billing
  {
    entity_type: 'billing',
    field_name: 'amount',
    can_read: ['cashier', 'billing_clerk', 'super_admin', 'admin'],
    can_write: ['billing_clerk', 'super_admin', 'admin'],
  },
  {
    entity_type: 'billing',
    field_name: 'waiver',
    can_read: ['cashier', 'billing_clerk', 'super_admin', 'admin'],
    can_write: ['cashier', 'super_admin', 'admin'],
  },
];

/**
 * Check if a role can read a specific field
 */
export function canReadField(
  entityType: EntityType,
  fieldName: string,
  role: UserRole,
): boolean {
  const permission = FIELD_PERMISSIONS.find(
    (p) => p.entity_type === entityType && p.field_name === fieldName,
  );

  if (!permission) {
    // No specific permission - allow for admins
    const effectiveRoles = getEffectiveRoles(role);
    return (
      effectiveRoles.includes('super_admin') || effectiveRoles.includes('admin')
    );
  }

  const effectiveRoles = getEffectiveRoles(role);
  return permission.can_read.some((r) => effectiveRoles.includes(r));
}

/**
 * Check if a role can write to a specific field
 */
export function canWriteField(
  entityType: EntityType,
  fieldName: string,
  role: UserRole,
): boolean {
  const permission = FIELD_PERMISSIONS.find(
    (p) => p.entity_type === entityType && p.field_name === fieldName,
  );

  if (!permission) {
    // No specific permission - allow for admins only
    const effectiveRoles = getEffectiveRoles(role);
    return effectiveRoles.includes('super_admin');
  }

  const effectiveRoles = getEffectiveRoles(role);
  return permission.can_write.some((r) => effectiveRoles.includes(r));
}

/**
 * Filter object to only include fields the role can read
 */
export function filterReadableFields<T extends Record<string, unknown>>(
  entityType: EntityType,
  data: T,
  role: UserRole,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    if (canReadField(entityType, key, role)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * Filter object to only include fields the role can write
 */
export function filterWritableFields<T extends Record<string, unknown>>(
  entityType: EntityType,
  data: T,
  role: UserRole,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    if (canWriteField(entityType, key, role)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

// =============================================================================
// Module Access Control
// =============================================================================

export const MODULE_ACCESS: Record<string, UserRole[]> = {
  // Dashboard
  dashboard: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'billing_clerk',
    'receptionist',
    'cashier',
    'customer_service',
    'inventory_manager',
    'config_admin',
  ],

  // Patient management
  registration: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
    'cashier',
    'customer_service',
  ],
  encounter: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
  ],

  // Clinical modules
  consultation: ['super_admin', 'admin', 'medical_director', 'doctor'],
  'specialty-clinic': ['super_admin', 'admin', 'medical_director', 'doctor'],
  nursing: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],
  treatment_plan: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
  ],
  queue: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
  ],

  // Diagnostic modules
  lab: ['super_admin', 'admin', 'medical_director', 'doctor', 'lab_technician'],
  radiology: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'radiologist',
  ],

  // In-Patient & Procedures
  'in-patient': ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],
  procedures: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],

  // Surgery/Theatre Module
  surgery: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],

  // Accident & Emergency Module
  emergency: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],

  // Hygiene & Infection Control Module
  hygiene: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],

  // Clinical Requests (Operations approval workflow)
  'clinical-requests': [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
  ],

  // Specialty Department Modules
  dental: ['super_admin', 'admin', 'medical_director', 'doctor'],
  ophthalmology: ['super_admin', 'admin', 'medical_director', 'doctor'],
  physiotherapy: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
  ],
  nutrition: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],

  // Medical Records (all clinicians)
  'medical-records': [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
  ],

  // Messaging
  messaging: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'billing_clerk',
    'receptionist',
    'cashier',
    'customer_service',
  ],

  // Staff Management
  staff: ['super_admin', 'admin'],

  // Analytics
  analytics: ['super_admin', 'admin', 'medical_director', 'billing_clerk'],

  // Pharmacy
  pharmacy: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'pharmacist',
    'nurse',
  ],

  // Billing
  billing: ['super_admin', 'admin', 'billing_clerk', 'cashier'],
  payments: ['super_admin', 'admin', 'cashier'],

  // NHIS Module
  nhis: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'billing_clerk',
    'cashier',
    'receptionist',
  ],

  // Support & Service
  'customer-service': [
    'super_admin',
    'admin',
    'customer_service',
    'receptionist',
  ],
  'medical-reports': [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
  ],

  // Patient management (legacy)
  patients: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'cashier',
  ],
  encounters: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
  ],

  // Administration
  users: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin', 'config_admin'],
  reports: ['super_admin', 'admin', 'medical_director', 'billing_clerk'],
  inventory: ['super_admin', 'admin', 'inventory_manager', 'pharmacist'],
  configurations: ['super_admin', 'admin', 'config_admin'],
};

/**
 * Check if a role can access a module
 */
export function canAccessModule(module: string, role: UserRole): boolean {
  const allowedRoles = MODULE_ACCESS[module];
  if (!allowedRoles) return false;

  const effectiveRoles = getEffectiveRoles(role);
  return allowedRoles.some((r) => effectiveRoles.includes(r));
}

/**
 * Get all modules a role can access
 */
export function getAccessibleModules(role: UserRole): string[] {
  const modules: string[] = [];

  for (const [module, allowedRoles] of Object.entries(MODULE_ACCESS)) {
    if (canAccessModule(module, role)) {
      modules.push(module);
    }
  }

  return modules;
}

// =============================================================================
// Action Validation Helpers
// =============================================================================

/**
 * Validate if a user can perform an action
 */
export function validateAction(
  action: string,
  role: UserRole,
  context?: {
    entityType?: EntityType;
    currentState?: string;
    targetState?: string;
  },
): { allowed: boolean; reason?: string } {
  // Check basic permission
  if (!hasPermission(role, action)) {
    return {
      allowed: false,
      reason: `Role ${role} does not have permission: ${action}`,
    };
  }

  // If state transition context provided, check that too
  if (context?.entityType && context?.currentState && context?.targetState) {
    // This would need to be async in real use
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Get allowed actions for a role on an entity
 */
export function getAllowedActions(
  entityType: EntityType,
  currentState: string,
  role: UserRole,
): string[] {
  // This would be populated from state_transition_permissions table
  // For now, return based on role permissions
  const actions: string[] = [];

  switch (entityType) {
    case 'lab':
      if (hasPermission(role, 'accept_tests')) actions.push('accept', 'reject');
      if (hasPermission(role, 'collect_samples'))
        actions.push('collect_sample');
      if (hasPermission(role, 'upload_results')) actions.push('enter_result');
      if (hasPermission(role, 'view_results')) actions.push('view_result');
      break;
    case 'radiology':
      if (hasPermission(role, 'accept_scans')) actions.push('accept', 'reject');
      if (hasPermission(role, 'perform_imaging'))
        actions.push('schedule', 'complete_scan');
      if (hasPermission(role, 'upload_reports')) actions.push('upload_report');
      break;
    case 'pharmacy':
      if (hasPermission(role, 'verify_prescriptions')) actions.push('verify');
      if (hasPermission(role, 'dispense_drugs')) actions.push('dispense');
      break;
    case 'queue':
      if (hasPermission(role, 'manage_queue'))
        actions.push('call', 'skip', 'requeue');
      if (hasPermission(role, 'consult'))
        actions.push('start_consultation', 'complete');
      break;
    case 'treatment_plan':
      if (hasPermission(role, 'create_treatment_plan'))
        actions.push('create', 'update', 'cancel');
      if (hasPermission(role, 'execute_tasks'))
        actions.push('start_task', 'complete_task', 'skip_task', 'escalate');
      break;
  }

  return actions;
}
