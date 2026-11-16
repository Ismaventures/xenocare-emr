/**
 * =============================================================================
 * DYNAMIC MENU ITEMS HOOK
 * =============================================================================
 *
 * Provides dynamic navigation menu items based on user's specialty assignment.
 *
 * Behavior:
 * - Specialists (doctors with specialty_code): See "My [Specialty Name] Clinic"
 *   with their specific specialty's icon and route
 * - Admins/Medical Directors: See "Specialty Clinics" allowing access to all
 * - Non-specialist doctors: See "Specialty Clinics" (general access)
 *
 * @module useDynamicMenuItems
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  Bone,
  Eye,
  Ear,
  Brain,
  Baby,
  Scissors,
  Smile,
  Dumbbell,
  Hand,
  Droplet,
  Wind,
  Sparkles,
  Activity,
  Microscope,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';

import { menuItems, MenuItem } from '../config/menu';

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  Heart,
  Bone,
  Eye,
  Ear,
  Brain,
  Baby,
  Scissors,
  Smile,
  Dumbbell,
  Hand,
  Droplet,
  Wind,
  Sparkles,
  Activity,
  Microscope,
};

/**
 * Get icon component by name from database.
 */
function getIconByName(iconName: string | null): React.ElementType {
  if (!iconName) return Microscope;
  return ICON_MAP[iconName] || Microscope;
}

// =============================================================================
// TYPES
// =============================================================================

interface SpecialtyDepartmentInfo {
  specialty_code: string;
  specialty_name: string;
  icon_name: string | null;
  color_class: string | null;
}

// Admin roles that can access all specialties
const ADMIN_ROLES = ['super_admin', 'admin', 'medical_director'];

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook that returns dynamically modified menu items based on user's specialty.
 *
 * For specialists:
 * - Changes "Specialty Clinics" to "My [Specialty Name] Clinic"
 * - Updates icon and route to match their specialty
 *
 * For admins:
 * - Keeps "Specialty Clinics" as-is (access to all)
 */
export function useDynamicMenuItems(): {
  menuItems: MenuItem[];
  isLoading: boolean;
  userSpecialty: SpecialtyDepartmentInfo | null;
} {
  const { staff } = useAuth();

  // Determine if user is admin (can see all specialties)
  const isAdmin = staff?.role && ADMIN_ROLES.includes(staff.role);

  // Get user's specialty_code
  const userSpecialtyCode = staff?.specialty_code;

  // Query specialty info if user has a specialty_code and is not admin.
  const { data: specialtyInfo, isLoading } =
    useQuery<SpecialtyDepartmentInfo | null>({
      queryKey: ['user-specialty-info', userSpecialtyCode],
      queryFn: async () => {
        if (!userSpecialtyCode) return null;

        const { data, error } = await supabase
          .from('specialty_departments')
          .select('specialty_code, specialty_name, icon_name, color_class')
          .eq('specialty_code', userSpecialtyCode)
          .eq('is_active', true)
          .single();

        if (error || !data) return null;
        return data as SpecialtyDepartmentInfo;
      },
      staleTime: 30 * 60 * 1000,
      enabled: !!userSpecialtyCode && !isAdmin,
    });

  const displaySpecialtyInfo = specialtyInfo || null;

  // Specialties that have their own dedicated module pages.
  // These users should NOT see the specialty-clinic sidebar item because
  // they already have a dedicated sidebar entry (e.g. "Ophthalmology").
  // Note: A&E doctors are intentionally excluded — they keep both their
  // dedicated /ae module AND the specialty-clinic item so they can access
  // specialty clinic workflows when needed.
  const DEDICATED_MODULE_SPECIALTIES: Record<string, string> = {
    OPHTHALMOLOGY: '/ophthalmology',
    PHYSIOTHERAPY: '/physiotherapy',
    DENTAL: '/dental',
  };

  // Modules accessible to nurses — everything else is hidden
  const NURSE_MODULES = new Set([
    'dashboard',
    'nursing',
    'in-patient',
    'emergency',
    'anc',
    'registration', // patient lookup
    'medical-records',
    'encounter',
    'procedures',
    'hygiene',
    'clinical-requests',
    'messaging',
  ]);

  // Modules accessible to lab technicians
  const LAB_TECH_MODULES = new Set([
    'dashboard',
    'lab',
    'registration', // patient lookup
    'medical-records',
    'encounter',
    'inventory', // reagent/supply tracking
    'messaging',
  ]);

  // Modules accessible to radiologists
  const RADIOLOGIST_MODULES = new Set([
    'dashboard',
    'radiology',
    'registration', // patient lookup
    'medical-records',
    'encounter',
    'messaging',
  ]);

  // Modules accessible to billing clerks
  const BILLING_CLERK_MODULES = new Set([
    'dashboard',
    'billing',
    'registration', // patient lookup
    'medical-records',
    'encounter',
    'inventory', // supplies tracking
    'messaging',
  ]);

  // Build dynamic menu items
  const dynamicMenuItems = useMemo(() => {
    // Nurse role: show only nursing-relevant modules
    if (staff?.role === 'nurse') {
      return menuItems.filter((item) => NURSE_MODULES.has(item.module));
    }

    // Lab technician: show only lab-relevant modules
    if (staff?.role === 'lab_technician') {
      return menuItems.filter((item) => LAB_TECH_MODULES.has(item.module));
    }

    // Radiologist: show only radiology-relevant modules
    if (staff?.role === 'radiologist') {
      return menuItems.filter((item) => RADIOLOGIST_MODULES.has(item.module));
    }

    // Billing clerk: show only billing-relevant modules
    if (staff?.role === 'billing_clerk') {
      return menuItems.filter((item) => BILLING_CLERK_MODULES.has(item.module));
    }

    // If admin or no specialty info, return original menu items
    if (isAdmin || !displaySpecialtyInfo) {
      return menuItems;
    }

    const code = displaySpecialtyInfo.specialty_code.toUpperCase();

    // Specialties with dedicated modules: remove the specialty-clinic item
    // entirely — these users already see their own module in the sidebar.
    if (DEDICATED_MODULE_SPECIALTIES[code]) {
      return menuItems.filter((item) => item.module !== 'specialty-clinic');
    }

    // For other specialists, modify the specialty-clinic menu item
    return menuItems.map((item): MenuItem => {
      if (item.module === 'specialty-clinic') {
        const SpecialtyIcon = getIconByName(displaySpecialtyInfo.icon_name);
        return {
          ...item,
          to: `/specialty-clinic/${displaySpecialtyInfo.specialty_code}`,
          icon: SpecialtyIcon as MenuItem['icon'],
          label: `My ${displaySpecialtyInfo.specialty_name} Clinic`,
          description: `${displaySpecialtyInfo.specialty_name} clinic dashboard`,
          color:
            displaySpecialtyInfo.color_class?.replace('text-', 'bg-') ||
            item.color,
        };
      }
      return item;
    });
  }, [isAdmin, displaySpecialtyInfo, staff?.role]);

  return {
    menuItems: dynamicMenuItems,
    isLoading,
    userSpecialty: displaySpecialtyInfo || null,
  };
}

export default useDynamicMenuItems;
