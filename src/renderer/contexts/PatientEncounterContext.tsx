/**
 * Patient Encounter Context
 *
 * Provides a unified context for patient selection with encounter history.
 * Implements strict role-based access control for viewing and interacting
 * with patient profiles and encounter data.
 *
 * Key Features:
 * - Patient selection loads profile + chronological encounter list
 * - Each encounter is selectable (shows only that encounter's records)
 * - No encounter data mixing across encounters
 * - Role-based visibility and access control
 * - Closed encounters are read-only for all roles
 * - UI dynamically hides sections based on permissions
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { supabase } from '../api/supabaseClient';
import {
  UserRole,
  canReadField,
  canAccessModule,
  EntityType,
} from '../lib/permissions';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('PatientEncounter');

// =============================================================================
// Types
// =============================================================================

export interface PatientProfile {
  patient_id: string;
  emr_number: string;
  first_name: string;
  surname: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  blood_group?: string;
  genotype?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  payment_category?: string;
  nhis_number?: string;
  created_at: string;
}

export interface EncounterSummary {
  visit_id: string;
  encounter_number?: string;
  visit_type: string;
  current_stage: string;
  status: string;
  payment_category?: string;
  priority?: string;
  chief_complaint?: string;
  start_time: string;
  end_time?: string;
  created_at: string;
  clinic?: {
    clinic_id: string;
    clinic_name: string;
  };
  // Counts for quick reference
  consultation_count: number;
  lab_count: number;
  radiology_count: number;
  prescription_count: number;
  vitals_count: number;
}

export interface EncounterRecords {
  consultations: unknown[];
  vitals: unknown[];
  lab_requests: unknown[];
  radiology_requests: unknown[];
  prescriptions: unknown[];
  nursing_care: unknown[];
  billing_orders: unknown[];
  triage: unknown[];
}

export interface VisibleSections {
  patientProfile: boolean;
  encounterList: boolean;
  demographics: boolean;
  vitals: boolean;
  consultation: boolean;
  diagnosis: boolean;
  treatmentPlan: boolean;
  labRequests: boolean;
  labResults: boolean;
  radiologyRequests: boolean;
  radiologyReports: boolean;
  prescriptions: boolean;
  nursingCare: boolean;
  billing: boolean;
  triage: boolean;
}

interface PatientEncounterContextType {
  // Patient State
  selectedPatient: PatientProfile | null;
  isLoadingPatient: boolean;
  patientError: string | null;

  // Encounter State
  patientEncounters: EncounterSummary[];
  isLoadingEncounters: boolean;
  encountersError: string | null;

  // Selected Encounter
  selectedEncounter: EncounterSummary | null;
  encounterRecords: EncounterRecords | null;
  isLoadingRecords: boolean;

  // Derived State
  isEncounterClosed: boolean;
  isReadOnly: boolean;
  canModifyEncounter: boolean;

  // Visibility (role-based)
  visibleSections: VisibleSections;
  canViewPatient: boolean;
  canViewEncounterList: boolean;

  // Actions
  selectPatient: (patientId: string) => Promise<void>;
  clearPatient: () => void;
  selectEncounter: (encounterId: string) => Promise<void>;
  clearEncounter: () => void;
  refreshEncounters: () => Promise<void>;
  refreshRecords: () => Promise<void>;

  // Permission Checks
  canViewSection: (section: keyof VisibleSections) => boolean;
  canEditSection: (section: keyof VisibleSections) => boolean;
  filterRecordsByRole: <T extends Record<string, unknown>>(
    records: T[],
    entityType: EntityType,
  ) => T[];
}

const PatientEncounterContext =
  createContext<PatientEncounterContextType | null>(null);

// =============================================================================
// Role-Based Section Visibility
// =============================================================================

// Which roles can view each section
const SECTION_VIEW_PERMISSIONS: Record<keyof VisibleSections, UserRole[]> = {
  patientProfile: [
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
  encounterList: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'receptionist',
  ],
  demographics: [
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
  vitals: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],
  consultation: ['super_admin', 'admin', 'medical_director', 'doctor'],
  diagnosis: ['super_admin', 'admin', 'medical_director', 'doctor'],
  treatmentPlan: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
  ],
  labRequests: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'lab_technician',
  ],
  labResults: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'lab_technician',
  ],
  radiologyRequests: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'radiologist',
  ],
  radiologyReports: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'radiologist',
  ],
  prescriptions: [
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'pharmacist',
    'nurse',
  ],
  nursingCare: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],
  billing: ['super_admin', 'admin', 'billing_clerk', 'cashier'],
  triage: ['super_admin', 'admin', 'medical_director', 'doctor', 'nurse'],
};

// Which roles can edit each section (subset of view)
const SECTION_EDIT_PERMISSIONS: Record<keyof VisibleSections, UserRole[]> = {
  patientProfile: ['super_admin', 'admin', 'medical_director', 'receptionist'],
  encounterList: ['super_admin', 'admin', 'medical_director', 'receptionist'],
  demographics: ['super_admin', 'admin', 'receptionist'],
  vitals: ['super_admin', 'admin', 'nurse'],
  consultation: ['super_admin', 'admin', 'medical_director', 'doctor'],
  diagnosis: ['super_admin', 'admin', 'medical_director', 'doctor'],
  treatmentPlan: ['super_admin', 'admin', 'medical_director', 'doctor'],
  labRequests: ['super_admin', 'admin', 'medical_director', 'doctor'],
  labResults: ['super_admin', 'admin', 'lab_technician'],
  radiologyRequests: ['super_admin', 'admin', 'medical_director', 'doctor'],
  radiologyReports: ['super_admin', 'admin', 'radiologist'],
  prescriptions: ['super_admin', 'admin', 'medical_director', 'doctor'],
  nursingCare: ['super_admin', 'admin', 'nurse'],
  billing: ['super_admin', 'admin', 'cashier'],
  triage: ['super_admin', 'admin', 'nurse'],
};

// =============================================================================
// Provider Component
// =============================================================================

interface PatientEncounterProviderProps {
  children: ReactNode;
}

export function PatientEncounterProvider({
  children,
}: PatientEncounterProviderProps) {
  const { staff, hasRole } = useAuth();

  // Patient State
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null,
  );
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Encounters State
  const [patientEncounters, setPatientEncounters] = useState<
    EncounterSummary[]
  >([]);
  const [isLoadingEncounters, setIsLoadingEncounters] = useState(false);
  const [encountersError, setEncountersError] = useState<string | null>(null);

  // Selected Encounter State
  const [selectedEncounter, setSelectedEncounter] =
    useState<EncounterSummary | null>(null);
  const [encounterRecords, setEncounterRecords] =
    useState<EncounterRecords | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Get user's role
  const userRole = (staff?.role as UserRole) || 'receptionist';

  // ==========================================================================
  // Visibility Calculations
  // ==========================================================================

  const canViewPatient = useMemo(() => {
    return hasRole(SECTION_VIEW_PERMISSIONS.patientProfile);
  }, [hasRole]);

  const canViewEncounterList = useMemo(() => {
    return hasRole(SECTION_VIEW_PERMISSIONS.encounterList);
  }, [hasRole]);

  const visibleSections = useMemo<VisibleSections>(() => {
    const sections: VisibleSections = {
      patientProfile: false,
      encounterList: false,
      demographics: false,
      vitals: false,
      consultation: false,
      diagnosis: false,
      treatmentPlan: false,
      labRequests: false,
      labResults: false,
      radiologyRequests: false,
      radiologyReports: false,
      prescriptions: false,
      nursingCare: false,
      billing: false,
      triage: false,
    };

    for (const section of Object.keys(sections) as (keyof VisibleSections)[]) {
      sections[section] = hasRole(SECTION_VIEW_PERMISSIONS[section]);
    }

    return sections;
  }, [hasRole]);

  const canViewSection = useCallback(
    (section: keyof VisibleSections): boolean => {
      return visibleSections[section];
    },
    [visibleSections],
  );

  const canEditSection = useCallback(
    (section: keyof VisibleSections): boolean => {
      // Cannot edit if encounter is closed
      if (selectedEncounter?.status === 'Closed') {
        return false;
      }
      return hasRole(SECTION_EDIT_PERMISSIONS[section]);
    },
    [hasRole, selectedEncounter],
  );

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isEncounterClosed = useMemo(() => {
    return selectedEncounter?.status === 'Closed';
  }, [selectedEncounter]);

  const isReadOnly = useMemo(() => {
    if (!selectedEncounter) return true;
    return isEncounterClosed;
  }, [selectedEncounter, isEncounterClosed]);

  const canModifyEncounter = useMemo(() => {
    if (!selectedEncounter || isEncounterClosed) return false;
    // Check if user has any edit permission on any section
    return Object.keys(SECTION_EDIT_PERMISSIONS).some((section) =>
      hasRole(SECTION_EDIT_PERMISSIONS[section as keyof VisibleSections]),
    );
  }, [selectedEncounter, isEncounterClosed, hasRole]);

  // ==========================================================================
  // Data Loading Functions
  // ==========================================================================

  /**
   * Load patient profile by ID
   */
  const selectPatient = useCallback(
    async (patientId: string) => {
      if (!canViewPatient) {
        setPatientError('You do not have permission to view patient profiles');
        return;
      }

      setIsLoadingPatient(true);
      setPatientError(null);
      setSelectedPatient(null);
      setPatientEncounters([]);
      setSelectedEncounter(null);
      setEncounterRecords(null);

      try {
        // Load patient profile
        const { data: patient, error: patientErr } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        if (patientErr) throw patientErr;

        setSelectedPatient(patient as PatientProfile);

        // If user can view encounter list, load encounters
        // visits.patient_id is UUID (patients.id), not the display patient_id
        if (canViewEncounterList && patient?.id) {
          await loadPatientEncounters(patient.id);
        }
      } catch (error) {
        log.error('Error loading patient:', error);
        setPatientError('Failed to load patient profile');
      } finally {
        setIsLoadingPatient(false);
      }
    },
    [canViewPatient, canViewEncounterList],
  );

  /**
   * Load encounters for a patient (chronological order)
   */
  const loadPatientEncounters = useCallback(
    async (patientId: string) => {
      if (!canViewEncounterList) {
        setEncountersError(
          'You do not have permission to view encounter history',
        );
        return;
      }

      setIsLoadingEncounters(true);
      setEncountersError(null);

      try {
        const { data, error } = await supabase
          .from('visits')
          .select(
            `
          visit_id,
          encounter_number,
          visit_type,
          current_stage,
          status,
          payment_category,
          priority,
          chief_complaint,
          start_time,
          end_time,
          created_at,
          clinic:clinics!visits_clinic_id_fkey(clinic_id, clinic_name)
        `,
          )
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const visitIds = (data || [])
          .map((encounter) => encounter.visit_id)
          .filter(Boolean);
        const countByVisitId = (
          rows: Array<{ visit_id: string | null }> | null | undefined,
        ) => {
          const counts = new Map<string, number>();
          (rows || []).forEach((row) => {
            if (!row.visit_id) return;
            counts.set(row.visit_id, (counts.get(row.visit_id) || 0) + 1);
          });
          return counts;
        };

        const [consultations, labs, radiology, prescriptions, vitals] =
          visitIds.length > 0
            ? await Promise.all([
                supabase
                  .from('consultations')
                  .select('visit_id')
                  .in('visit_id', visitIds),
                supabase
                  .from('lab_requests')
                  .select('visit_id')
                  .in('visit_id', visitIds),
                supabase
                  .from('radiology_requests')
                  .select('visit_id')
                  .in('visit_id', visitIds),
                supabase
                  .from('prescriptions')
                  .select('visit_id')
                  .in('visit_id', visitIds),
                supabase
                  .from('vitals')
                  .select('visit_id')
                  .in('visit_id', visitIds),
              ])
            : [
                { data: [] },
                { data: [] },
                { data: [] },
                { data: [] },
                { data: [] },
              ];

        const consultationCounts = countByVisitId(
          consultations.data as Array<{ visit_id: string | null }>,
        );
        const labCounts = countByVisitId(
          labs.data as Array<{ visit_id: string | null }>,
        );
        const radiologyCounts = countByVisitId(
          radiology.data as Array<{ visit_id: string | null }>,
        );
        const prescriptionCounts = countByVisitId(
          prescriptions.data as Array<{ visit_id: string | null }>,
        );
        const vitalsCounts = countByVisitId(
          vitals.data as Array<{ visit_id: string | null }>,
        );

        const encountersWithCounts = (data || []).map((encounter) => {
          // Handle clinic which comes as array from joined select
          const clinicData = Array.isArray(encounter.clinic)
            ? encounter.clinic[0]
            : encounter.clinic;

          return {
            visit_id: encounter.visit_id,
            encounter_number: encounter.encounter_number,
            visit_type: encounter.visit_type,
            current_stage: encounter.current_stage,
            status: encounter.status,
            payment_category: encounter.payment_category,
            priority: encounter.priority,
            chief_complaint: encounter.chief_complaint,
            start_time: encounter.start_time,
            end_time: encounter.end_time,
            created_at: encounter.created_at,
            clinic: clinicData || undefined,
            consultation_count: consultationCounts.get(encounter.visit_id) || 0,
            lab_count: labCounts.get(encounter.visit_id) || 0,
            radiology_count: radiologyCounts.get(encounter.visit_id) || 0,
            prescription_count: prescriptionCounts.get(encounter.visit_id) || 0,
            vitals_count: vitalsCounts.get(encounter.visit_id) || 0,
          } as EncounterSummary;
        });

        setPatientEncounters(encountersWithCounts);
      } catch (error) {
        log.error('Error loading encounters:', error);
        setEncountersError('Failed to load encounter history');
      } finally {
        setIsLoadingEncounters(false);
      }
    },
    [canViewEncounterList],
  );

  /**
   * Select a specific encounter and load its records
   */
  const selectEncounter = useCallback(
    async (encounterId: string) => {
      const encounter = patientEncounters.find(
        (e) => e.visit_id === encounterId,
      );
      if (!encounter) {
        log.error('Encounter not found in list');
        return;
      }

      setSelectedEncounter(encounter);
      setIsLoadingRecords(true);
      setEncounterRecords(null);

      try {
        // Load only records for THIS encounter, filtered by role
        const records: EncounterRecords = {
          consultations: [],
          vitals: [],
          lab_requests: [],
          radiology_requests: [],
          prescriptions: [],
          nursing_care: [],
          billing_orders: [],
          triage: [],
        };

        // Load each record type based on role permissions using async functions
        const loadFunctions: (() => Promise<void>)[] = [];

        if (visibleSections.consultation || visibleSections.diagnosis) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('consultations')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.consultations = data || [];
          });
        }

        if (visibleSections.vitals) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('vitals')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.vitals = data || [];
          });
        }

        if (visibleSections.labRequests || visibleSections.labResults) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('lab_requests')
              .select('*, lab_result:lab_results(*)')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.lab_requests = data || [];
          });
        }

        if (
          visibleSections.radiologyRequests ||
          visibleSections.radiologyReports
        ) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('radiology_requests')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.radiology_requests = data || [];
          });
        }

        if (visibleSections.prescriptions) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('prescriptions')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.prescriptions = data || [];
          });
        }

        if (visibleSections.nursingCare) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('nursing_care')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.nursing_care = data || [];
          });
        }

        if (visibleSections.billing) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('billing_orders')
              .select('*')
              .eq('visit_id', encounterId)
              .order('created_at', { ascending: true });
            records.billing_orders = data || [];
          });
        }

        if (visibleSections.triage) {
          loadFunctions.push(async () => {
            const { data } = await supabase
              .from('triage_assessments')
              .select('*')
              .eq('encounter_id', encounterId)
              .order('created_at', { ascending: true });
            records.triage = data || [];
          });
        }

        await Promise.all(loadFunctions.map((fn) => fn()));
        setEncounterRecords(records);
      } catch (error) {
        log.error('Error loading encounter records:', error);
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [patientEncounters, visibleSections],
  );

  /**
   * Filter records based on role permissions
   */
  const filterRecordsByRole = useCallback(
    <T extends Record<string, unknown>>(
      records: T[],
      entityType: EntityType,
    ): T[] => {
      return records.map((record) => {
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
          if (canReadField(entityType, key, userRole)) {
            filtered[key] = value;
          }
        }
        return filtered as T;
      });
    },
    [userRole],
  );

  // ==========================================================================
  // Clear Functions
  // ==========================================================================

  const clearPatient = useCallback(() => {
    setSelectedPatient(null);
    setPatientError(null);
    setPatientEncounters([]);
    setSelectedEncounter(null);
    setEncounterRecords(null);
  }, []);

  const clearEncounter = useCallback(() => {
    setSelectedEncounter(null);
    setEncounterRecords(null);
  }, []);

  const refreshEncounters = useCallback(async () => {
    if (selectedPatient) {
      // visits.patient_id is UUID (patients.id), not the display patient_id
      await loadPatientEncounters(selectedPatient.id);
    }
  }, [selectedPatient, loadPatientEncounters]);

  const refreshRecords = useCallback(async () => {
    if (selectedEncounter) {
      await selectEncounter(selectedEncounter.visit_id);
    }
  }, [selectedEncounter, selectEncounter]);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<PatientEncounterContextType>(
    () => ({
      // Patient State
      selectedPatient,
      isLoadingPatient,
      patientError,

      // Encounter State
      patientEncounters,
      isLoadingEncounters,
      encountersError,

      // Selected Encounter
      selectedEncounter,
      encounterRecords,
      isLoadingRecords,

      // Derived State
      isEncounterClosed,
      isReadOnly,
      canModifyEncounter,

      // Visibility
      visibleSections,
      canViewPatient,
      canViewEncounterList,

      // Actions
      selectPatient,
      clearPatient,
      selectEncounter,
      clearEncounter,
      refreshEncounters,
      refreshRecords,

      // Permission Checks
      canViewSection,
      canEditSection,
      filterRecordsByRole,
    }),
    [
      selectedPatient,
      isLoadingPatient,
      patientError,
      patientEncounters,
      isLoadingEncounters,
      encountersError,
      selectedEncounter,
      encounterRecords,
      isLoadingRecords,
      isEncounterClosed,
      isReadOnly,
      canModifyEncounter,
      visibleSections,
      canViewPatient,
      canViewEncounterList,
      selectPatient,
      clearPatient,
      selectEncounter,
      clearEncounter,
      refreshEncounters,
      refreshRecords,
      canViewSection,
      canEditSection,
      filterRecordsByRole,
    ],
  );

  return (
    <PatientEncounterContext.Provider value={contextValue}>
      {children}
    </PatientEncounterContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access the patient-encounter context
 */
export function usePatientEncounter() {
  const context = useContext(PatientEncounterContext);
  if (!context) {
    throw new Error(
      'usePatientEncounter must be used within a PatientEncounterProvider',
    );
  }
  return context;
}

/**
 * Hook to check if user can view a specific encounter
 */
export function useCanViewEncounter(encounterId: string | null) {
  const { patientEncounters, canViewEncounterList } = usePatientEncounter();

  if (!canViewEncounterList || !encounterId) {
    return false;
  }

  return patientEncounters.some((e) => e.visit_id === encounterId);
}

// =============================================================================
// HOC for Encounter-Scoped Components
// =============================================================================

/**
 * Higher-order component that ensures an encounter is selected
 */
export function withEncounterScope<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackMessage = 'Please select an encounter to view this section',
) {
  return function EncounterScopedComponent(props: P) {
    const { selectedEncounter, isLoadingRecords } = usePatientEncounter();

    if (isLoadingRecords) {
      return (
        <div className="p-6">
          <SkeletonCard lines={4} />
        </div>
      );
    }

    if (!selectedEncounter) {
      return (
        <div className="flex items-center justify-center p-8 text-gray-500">
          <p>{fallbackMessage}</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

// =============================================================================
// Guard Components
// =============================================================================

interface SectionGuardProps {
  section: keyof VisibleSections;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user can view the section
 */
export function SectionGuard({
  section,
  children,
  fallback = null,
}: SectionGuardProps) {
  const { canViewSection } = usePatientEncounter();

  if (!canViewSection(section)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that disables children if encounter is closed or user cannot edit
 */
interface EditGuardProps {
  section: keyof VisibleSections;
  children: ReactNode;
}

export function EditGuard({ section, children }: EditGuardProps) {
  const { canEditSection, isReadOnly } = usePatientEncounter();
  const canEdit = canEditSection(section);

  return (
    <div
      className={isReadOnly || !canEdit ? 'pointer-events-none opacity-60' : ''}
    >
      {children}
      {isReadOnly && (
        <div className="mt-2 text-sm text-amber-600">
          🔒 This encounter is closed and cannot be modified
        </div>
      )}
    </div>
  );
}