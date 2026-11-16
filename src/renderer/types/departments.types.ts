// Department and Ward Types for EMR System
// Generated: December 20, 2025

// =====================================================
// ENUMS
// =====================================================

export type DepartmentStatus = 'Active' | 'Inactive' | 'Maintenance';

export type WardType =
  | 'General'
  | 'ICU'
  | 'Emergency'
  | 'Pediatric'
  | 'Maternity'
  | 'Surgical'
  | 'Psychiatric'
  | 'Isolation'
  | 'Outpatient';

export type BedStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Maintenance'
  | 'Cleaning';

export type DepartmentCategory =
  | 'Clinical'
  | 'Diagnostic'
  | 'Support'
  | 'Administrative';

// =====================================================
// DEPARTMENT TYPES
// =====================================================

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: DepartmentCategory;

  // Location
  building?: string;
  floor?: string;

  // Operational settings
  status: DepartmentStatus;
  accepts_queue: boolean;
  accepts_referrals: boolean;
  requires_payment: boolean;

  // Queue settings
  default_priority: number;
  max_queue_size?: number;
  avg_service_time_minutes?: number;

  // Contact
  extension?: string;
  email?: string;

  // Management
  head_of_department?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface DepartmentWithStats extends Department {
  queue_count: number;
  staff_count: number;
  ward_count: number;
}

export interface CreateDepartmentDTO {
  code: string;
  name: string;
  description?: string;
  category: DepartmentCategory;
  building?: string;
  floor?: string;
  status?: DepartmentStatus;
  accepts_queue?: boolean;
  accepts_referrals?: boolean;
  requires_payment?: boolean;
  default_priority?: number;
  max_queue_size?: number;
  avg_service_time_minutes?: number;
  extension?: string;
  email?: string;
  head_of_department?: string;
}

export interface UpdateDepartmentDTO extends Partial<CreateDepartmentDTO> {
  id: string;
}

// =====================================================
// WARD TYPES
// =====================================================

export interface Ward {
  id: string;
  department_id: string;
  code: string;
  name: string;
  ward_type: WardType;

  // Capacity
  total_beds: number;
  available_beds: number;

  // Location
  floor?: string;
  wing?: string;

  // Settings
  status: DepartmentStatus;
  gender_restriction?: 'Male' | 'Female' | null;
  age_restriction_min?: number;
  age_restriction_max?: number;

  // Staff
  nurse_in_charge?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface WardWithDepartment extends Ward {
  department: Department;
}

export interface CreateWardDTO {
  department_id: string;
  code: string;
  name: string;
  ward_type: WardType;
  floor?: string;
  wing?: string;
  status?: DepartmentStatus;
  gender_restriction?: 'Male' | 'Female' | null;
  age_restriction_min?: number;
  age_restriction_max?: number;
  nurse_in_charge?: string;
}

export interface UpdateWardDTO extends Partial<CreateWardDTO> {
  id: string;
}

// =====================================================
// BED TYPES
// =====================================================

export interface Bed {
  id: string;
  ward_id: string;
  bed_number: string;

  // Status
  status: BedStatus;
  current_patient_id?: string;
  current_visit_id?: string;

  // Features
  has_oxygen: boolean;
  has_suction: boolean;
  has_monitor: boolean;
  is_isolation: boolean;

  // Timestamps
  occupied_at?: string;
  expected_discharge?: string;
  created_at: string;
  updated_at: string;
}

export interface BedWithDetails extends Bed {
  ward: Ward;
  current_patient?: {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
}

export interface CreateBedDTO {
  ward_id: string;
  bed_number: string;
  status?: BedStatus;
  has_oxygen?: boolean;
  has_suction?: boolean;
  has_monitor?: boolean;
  is_isolation?: boolean;
}

export interface UpdateBedDTO extends Partial<CreateBedDTO> {
  id: string;
}

export interface AssignBedDTO {
  bed_id: string;
  patient_id: string;
  visit_id: string;
  expected_discharge?: string;
}

// =====================================================
// DEPARTMENT STAFF TYPES
// =====================================================

export type StaffRole = 'Primary' | 'Secondary' | 'On-Call' | 'Supervisor';

export interface DepartmentStaff {
  id: string;
  department_id: string;
  staff_id: string;
  role: StaffRole;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string;
  created_at: string;
}

export interface DepartmentStaffWithUser extends DepartmentStaff {
  staff: {
    staff_id: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
  };
}

export interface AssignStaffDTO {
  department_id: string;
  staff_id: string;
  role: StaffRole;
  is_primary?: boolean;
  effective_from?: string;
  effective_to?: string;
}

// =====================================================
// QUERY PARAMETERS
// =====================================================

export interface DepartmentQueryParams {
  category?: DepartmentCategory;
  status?: DepartmentStatus;
  accepts_queue?: boolean;
  accepts_referrals?: boolean;
  search?: string;
}

export interface WardQueryParams {
  department_id?: string;
  ward_type?: WardType;
  status?: DepartmentStatus;
  has_available_beds?: boolean;
}

export interface BedQueryParams {
  ward_id?: string;
  status?: BedStatus;
  has_oxygen?: boolean;
  has_monitor?: boolean;
  is_isolation?: boolean;
}
