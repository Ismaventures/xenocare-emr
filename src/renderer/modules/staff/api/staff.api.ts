import { supabase } from '../../../api/supabaseClient';
import { Staff } from '../../../types/database.types';

export const getStaffList = async () => {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Staff[];
};

export const getStaffById = async (id: string) => {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Staff;
};

// Role → prefix mapping for staff ID generation (mirrors DB function)
const ROLE_PREFIX_MAP: Record<string, string> = {
  super_admin: 'ADM',
  admin: 'ADM',
  medical_director: 'MDR',
  doctor: 'DOC',
  nurse: 'NUR',
  lab_technician: 'LAB',
  radiologist: 'RAD',
  pharmacist: 'PHM',
  billing_clerk: 'BIL',
  receptionist: 'REC',
  cashier: 'CSH',
  customer_service: 'CSV',
  inventory_manager: 'INV',
  config_admin: 'CFG',
};

export const getNextStaffId = async (role: string) => {
  const prefix = ROLE_PREFIX_MAP[role] || 'STF';

  // Fetch ALL matching staff_ids and find the true numeric MAX client-side
  // The DB RPC (get_next_staff_id) has a known bug with SUBSTRING-based MAX,
  // so we always use the client-side approach for correctness.
  const { data: rows, error } = await supabase
    .from('staff')
    .select('staff_id')
    .like('staff_id', `${prefix}-%`);

  let maxSeq = 0;
  if (!error && rows && rows.length > 0) {
    for (const row of rows) {
      const match = row.staff_id?.match(/^[A-Z]+-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }

  const seq = maxSeq + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
};

export const createStaff = async (
  staff: Partial<Staff> & { password?: string },
) => {
  // 1. Create Auth User using secure IPC channel (service role key stays in main process)
  let userId = staff.user_id;

  if (staff.password && staff.email) {
    // Check if admin service is available
    const isAvailable = await window.electron.admin.isAvailable();
    if (!isAvailable) {
      throw new Error(
        'Admin service not configured. Please ensure SUPABASE_SERVICE_ROLE_KEY is set.',
      );
    }

    // Use secure IPC to create user (service role key never leaves main process)
    const result = await window.electron.admin.createUser({
      email: staff.email,
      password: staff.password,
      fullName: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
      role: staff.role || 'doctor',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create auth user');
    }
    userId = result.userId;
  }

  // 2. Create Staff Record
  // Remove password from staff object before inserting
  const { password, ...staffData } = staff;

  // Sanitize: convert empty string specialty_code to null (FK requires valid reference or null)
  if ('specialty_code' in staffData && !staffData.specialty_code) {
    staffData.specialty_code = null as any;
  }

  // Auto-assign facility_id if not set — prevents the "0 data" bug on all facility-scoped views
  if (!staffData.facility_id) {
    const { data: facility } = await supabase
      .from('facilities')
      .select('id')
      .limit(1)
      .single();
    if (facility?.id) {
      (staffData as any).facility_id = facility.id;
    }
  }

  // Retry with fresh staff_id on duplicate key conflict (code 23505)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // On retry, generate a fresh staff_id
    if (attempt > 0 && staffData.role) {
      const freshId = await getNextStaffId(staffData.role as string);
      (staffData as any).staff_id = freshId;
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([{ ...staffData, user_id: userId }])
      .select()
      .single();

    if (!error) return data as Staff;

    // If it's a duplicate staff_id error, retry with a new ID
    if (
      error.code === '23505' &&
      error.message?.includes('staff_staff_id_key') &&
      attempt < MAX_RETRIES - 1
    ) {
      console.warn(
        `Staff ID ${(staffData as any).staff_id} already exists, retrying with fresh ID (attempt ${attempt + 2}/${MAX_RETRIES})...`,
      );
      continue;
    }

    throw error;
  }

  throw new Error(
    'Failed to create staff after multiple attempts due to ID conflicts',
  );
};

export const updateStaff = async (id: string, updates: Partial<Staff>) => {
  // Sanitize: convert empty string specialty_code to null (FK requires valid reference or null)
  if ('specialty_code' in updates && !updates.specialty_code) {
    updates.specialty_code = null as any;
  }

  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Staff;
};

export const deleteStaff = async (id: string) => {
  const { error } = await supabase.from('staff').delete().eq('id', id);

  if (error) throw error;
  return true;
};

// =============================================================================
// Doctor-specific queries
// =============================================================================

export interface DoctorOption {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
}

export interface ClinicalStaffOption {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  role: string;
}

/**
 * Get all active doctors (staff with role='doctor')
 * Optionally filter by department/specialty
 */
export const getDoctors = async (
  department?: string,
): Promise<DoctorOption[]> => {
  let query = supabase
    .from('staff')
    .select('id, staff_id, first_name, last_name, department')
    .eq('role', 'doctor')
    .eq('is_active', true)
    .order('first_name', { ascending: true });

  if (department) {
    query = query.eq('department', department);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as DoctorOption[];
};

/**
 * Get all active clinical staff (doctors and nurses)
 * For care team management
 */
export const getClinicalStaff = async (): Promise<ClinicalStaffOption[]> => {
  const { data, error } = await supabase
    .from('staff')
    .select('id, staff_id, first_name, last_name, department, role')
    .in('role', ['doctor', 'nurse', 'medical_director'])
    .eq('is_active', true)
    .order('role', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data as ClinicalStaffOption[];
};

/**
 * Get unique departments/specialties from active doctors
 */
export const getDoctorSpecialties = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('staff')
    .select('department')
    .eq('role', 'doctor')
    .eq('is_active', true)
    .not('department', 'is', null);

  if (error) throw error;

  // Get unique departments
  const departments = [
    ...new Set(data?.map((d) => d.department).filter(Boolean)),
  ] as string[];
  return departments.sort();
};
