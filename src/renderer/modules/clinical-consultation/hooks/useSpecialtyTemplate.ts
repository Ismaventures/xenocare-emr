/**
 * =============================================================================
 * useSpecialtyTemplate Hook
 *
 * Hook for determining and loading specialty examination templates.
 * Used to decide whether to show the standard ConsultationWizard or the
 * SpecialtyConsultationWizard based on the clinic/department type.
 * =============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../api/supabaseClient';
import {
  SpecialtyTemplate,
  SpecialtyTemplateSection,
} from '../dtos/specialty-template.dto';
import {
  getSpecialtyTemplate,
  getAllSpecialtyTemplates,
  SPECIALTY_TEMPLATES,
} from '../constants/specialty-templates';
import {
  classifyDepartmentByName,
  SOPD_DEPARTMENT_PATTERNS,
} from '../../../lib/workflow/opd-classification';

// =============================================================================
// Types
// =============================================================================

export interface SpecialtyClinicInfo {
  isSpecialtyClinic: boolean;
  specialtyCode: string | null;
  specialtyName: string | null;
  template: SpecialtyTemplate | null;
  opdType: 'MOPD' | 'SOPD' | null;
}

// =============================================================================
// Specialty Code Mapping
// =============================================================================

/**
 * Map clinic names/patterns to specialty codes
 */
const CLINIC_TO_SPECIALTY_MAP: Record<string, string> = {
  // Cardiology
  cardiology: 'CARDIOLOGY',
  cardiac: 'CARDIOLOGY',
  heart: 'CARDIOLOGY',

  // Orthopaedics
  orthopaedics: 'ORTHOPAEDICS',
  orthopedics: 'ORTHOPAEDICS',
  ortho: 'ORTHOPAEDICS',
  bone: 'ORTHOPAEDICS',

  // Dermatology
  dermatology: 'DERMATOLOGY',
  derma: 'DERMATOLOGY',
  skin: 'DERMATOLOGY',

  // ENT
  ent: 'ENT',
  ear: 'ENT',
  nose: 'ENT',
  throat: 'ENT',
  otolaryngology: 'ENT',
  otorhinolaryngology: 'ENT',

  // Urology
  urology: 'UROLOGY',
  urological: 'UROLOGY',

  // Neurology
  neurology: 'NEUROLOGY',
  neuro: 'NEUROLOGY',

  // Gastroenterology
  gastroenterology: 'GASTROENTEROLOGY',
  gastro: 'GASTROENTEROLOGY',
  gi: 'GASTROENTEROLOGY',

  // Nephrology
  nephrology: 'NEPHROLOGY',
  kidney: 'NEPHROLOGY',
  renal: 'NEPHROLOGY',

  // Paediatrics
  paediatrics: 'PAEDIATRICS',
  pediatrics: 'PAEDIATRICS',
  paediatric: 'PAEDIATRICS',
  pediatric: 'PAEDIATRICS',
  child: 'PAEDIATRICS',

  // Neurosurgery
  neurosurgery: 'NEUROSURGERY',

  // Neuropsychiatry
  neuropsychiatry: 'NEUROPSYCHIATRY',
  mental: 'NEUROPSYCHIATRY',
  psychiatry: 'NEUROPSYCHIATRY',

  // General Surgery
  'general surgery': 'GENERAL_SURGERY',
  surgery: 'GENERAL_SURGERY',
  surgical: 'GENERAL_SURGERY',

  // Gynaecology
  gynaecology: 'GYNAECOLOGY',
  gynecology: 'GYNAECOLOGY',
  gynae: 'GYNAECOLOGY',
  gyn: 'GYNAECOLOGY',
  obstetrics: 'GYNAECOLOGY',

  // Oral & Maxillofacial
  oral: 'ORAL_MAXILLOFACIAL',
  maxillofacial: 'ORAL_MAXILLOFACIAL',
  'dental surgery': 'ORAL_MAXILLOFACIAL',

  // Pulmonology
  pulmonology: 'PULMONOLOGY',
  respiratory: 'PULMONOLOGY',
  chest: 'PULMONOLOGY',
  lung: 'PULMONOLOGY',

  // Endocrinology
  endocrinology: 'ENDOCRINOLOGY',
  endocrine: 'ENDOCRINOLOGY',
  diabetes: 'ENDOCRINOLOGY',
  thyroid: 'ENDOCRINOLOGY',

  // Plastic Surgery
  'plastic surgery': 'PLASTIC_SURGERY',
  plastic: 'PLASTIC_SURGERY',
  reconstructive: 'PLASTIC_SURGERY',

  // Ophthalmology — excluded: uses standalone ophthalmology/ module
  // 'ophthalmology': 'OPHTHALMOLOGY',
  // 'eye': 'OPHTHALMOLOGY',
  // 'ophthalmic': 'OPHTHALMOLOGY',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Detect specialty code from clinic/department name
 */
export function detectSpecialtyFromName(name: string): string | null {
  if (!name) return null;

  const lowerName = name.toLowerCase();

  // Try to match patterns
  for (const [pattern, specialtyCode] of Object.entries(
    CLINIC_TO_SPECIALTY_MAP,
  )) {
    if (lowerName.includes(pattern)) {
      return specialtyCode;
    }
  }

  return null;
}

/**
 * Check if a clinic/department is a specialty OPD (SOPD)
 */
export function isSpecialtyOPD(clinicName: string): boolean {
  const opdType = classifyDepartmentByName(clinicName);
  return opdType === 'SOPD';
}

/**
 * Get all available specialty codes that have templates
 */
export function getAvailableSpecialties(): string[] {
  return Object.keys(SPECIALTY_TEMPLATES);
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch and cache specialty templates from database or constants
 */
export function useSpecialtyTemplates() {
  return useQuery({
    queryKey: ['specialty-templates'],
    queryFn: async () => {
      // First try to fetch from database
      const { data, error } = await supabase
        .from('specialty_templates')
        .select(
          `
          *,
          sections:specialty_template_sections(
            *,
            fields:specialty_template_fields(*)
          )
        `,
        )
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.warn(
          'Failed to fetch templates from DB, using constants:',
          error,
        );
        return getAllSpecialtyTemplates();
      }

      // If database has templates, use them
      if (data && data.length > 0) {
        return data as SpecialtyTemplate[];
      }

      // Fall back to constant templates
      return getAllSpecialtyTemplates();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to determine specialty clinic info from clinic ID
 */
export function useSpecialtyClinicInfo(
  clinicId: string | undefined,
): SpecialtyClinicInfo {
  const [clinicInfo, setClinicInfo] = useState<SpecialtyClinicInfo>({
    isSpecialtyClinic: false,
    specialtyCode: null,
    specialtyName: null,
    template: null,
    opdType: null,
  });

  useEffect(() => {
    if (!clinicId) {
      setClinicInfo({
        isSpecialtyClinic: false,
        specialtyCode: null,
        specialtyName: null,
        template: null,
        opdType: null,
      });
      return;
    }

    const fetchClinicInfo = async () => {
      try {
        // Fetch clinic details
        const { data: clinic, error } = await supabase
          .from('clinics')
          .select('clinic_name, clinic_code, opd_type')
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (error || !clinic) {
          return;
        }

        const clinicName = clinic.clinic_name || '';
        const specialtyCode = detectSpecialtyFromName(clinicName);
        const opdType = clinic.opd_type || classifyDepartmentByName(clinicName);

        if (specialtyCode) {
          const template = getSpecialtyTemplate(specialtyCode);
          setClinicInfo({
            isSpecialtyClinic: true,
            specialtyCode,
            specialtyName: template?.specialty_name || clinicName,
            template,
            opdType: opdType === 'SOPD' ? 'SOPD' : null,
          });
        } else if (opdType === 'SOPD') {
          // SOPD but no specific template - use generic specialty approach
          setClinicInfo({
            isSpecialtyClinic: true,
            specialtyCode: null,
            specialtyName: clinicName,
            template: null,
            opdType: 'SOPD',
          });
        } else {
          setClinicInfo({
            isSpecialtyClinic: false,
            specialtyCode: null,
            specialtyName: null,
            template: null,
            opdType: opdType === 'MOPD' ? 'MOPD' : null,
          });
        }
      } catch (error) {
        console.error('Error fetching clinic info:', error);
      }
    };

    fetchClinicInfo();
  }, [clinicId]);

  return clinicInfo;
}

/**
 * Hook to get a specific specialty template by code
 */
export function useSpecialtyTemplate(specialtyCode: string | null) {
  return useQuery({
    queryKey: ['specialty-template', specialtyCode],
    queryFn: async () => {
      if (!specialtyCode) return null;

      // First try database
      const { data, error } = await supabase
        .from('specialty_templates')
        .select(
          `
          *,
          sections:specialty_template_sections(
            *,
            fields:specialty_template_fields(*)
          )
        `,
        )
        .eq('specialty_code', specialtyCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch template from DB:', error);
      }

      if (data) {
        return data as SpecialtyTemplate;
      }

      // Fall back to constants
      return getSpecialtyTemplate(specialtyCode);
    },
    enabled: !!specialtyCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to check if specialty consultation wizard should be used
 */
export function useShouldUseSpecialtyWizard(clinicId: string | undefined): {
  shouldUseSpecialtyWizard: boolean;
  specialtyInfo: SpecialtyClinicInfo;
  isLoading: boolean;
} {
  const clinicInfo = useSpecialtyClinicInfo(clinicId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give time for clinic info to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [clinicId]);

  const shouldUseSpecialtyWizard = useMemo(() => {
    // Use specialty wizard if we have a specific template for this specialty
    return clinicInfo.isSpecialtyClinic && clinicInfo.template !== null;
  }, [clinicInfo]);

  return {
    shouldUseSpecialtyWizard,
    specialtyInfo: clinicInfo,
    isLoading,
  };
}

// =============================================================================
// Export
// =============================================================================

export {
  getSpecialtyTemplate,
  getAllSpecialtyTemplates,
} from '../constants/specialty-templates';
