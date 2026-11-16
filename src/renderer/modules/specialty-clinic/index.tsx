/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - SPECIALTY CLINIC MODULE
 *
 * This module provides template-driven consultation forms for specialty OPD
 * clinics. Unlike the standard GOPD consultation wizard, this module uses
 * pre-configured examination templates specific to each specialty.
 *
 * Supported Specialties (18):
 * - Cardiology, Orthopaedics, Dermatology, Urology, Gastroenterology
 * - Nephrology, Paediatrics, Neurosurgery, Neurology, Neuropsychiatry
 * - General Surgery, Gynaecology, Oral & Maxillofacial, Pulmonology
 * - Endocrinology, Plastic Surgery, ENT, Ophthalmology
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Microscope,
  Plus,
  Calendar,
  Clock,
  Users,
  Activity,
  TrendingUp,
  FileText,
  Search,
  ChevronRight,
  Heart,
  Bone,
  Hand,
  Ear,
  Eye,
  Brain,
  Baby,
  Scissors,
  Filter,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button, Input, SearchableSelect } from '../../components/ui';
import { SpecialtyConsultationWizard } from '../clinical-consultation/components/SpecialtyConsultationWizard';
import {
  SPECIALTY_TEMPLATES,
  getSpecialtyTemplate,
  getAllSpecialtyTemplates,
} from '../clinical-consultation/constants/specialty-templates';
import {
  SpecialtyTemplate,
  SpecialtyFormData,
  SpecialtySubmissionData,
} from '../clinical-consultation/dtos/specialty-template.dto';
import {
  CreateConsultationDTO,
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
  ProcedureOrderDTO,
  AdmissionOrderDTO,
} from '../clinical-consultation/dtos/consultation.dto';
import { PatientDTO } from '../patient-registration/dtos/patient.dto';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { useCreateConsultation } from '../clinical-consultation/hooks/useConsultation';
import { useActiveEncounters, EncounterDTO } from '../../lib/workflow';
import { CreateTreatmentTaskDTO } from '../treatment-plan/dtos/treatment-plan.dto';
import { createTreatmentPlan } from '../treatment-plan/api/treatment-plan.api';
import {
  createBatchOrders,
  resolvePatientUuid,
} from '../clinical-consultation/api/consultation.api';
import { createBulkClinicalRequests } from '../clinical-requests/api/clinical-requests.api';
import type { CreateClinicalRequestDTO } from '../clinical-requests/dtos/clinical-request.dto';
import {
  SpecialtyReferralDTO,
  ExternalNhisReferralDTO,
} from '../clinical-consultation/components/ConsultationWizard';
import { createOutgoingReferral } from '../nhis/api/nhis.api';
import { validateRecordLinkage } from '../../lib/encounter';
import { supabase } from '../../api/supabaseClient';
import { SkeletonDashboard } from '../../components/ui/SkeletonLoader';
import { formatSpecialtyExamNarrative } from '../../utils/clinicalTextFormatter';
// Role-based specialty dashboard import
import DynamicSpecialtyDashboard from './pages/SpecialtyClinicPage';
import { useCurrentUserSpecialty } from './hooks/useSpecialtyDashboard';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('SpecialtyClinicModule');
// =============================================================================
// Types
// =============================================================================

interface SpecialtyClinicStats {
  total: number;
  inProgress: number;
  completed: number;
  waiting: number;
}

// Icon mapping for specialties
const SPECIALTY_ICONS: Record<string, React.ElementType> = {
  CARDIOLOGY: Heart,
  ORTHOPAEDICS: Bone,
  DERMATOLOGY: Hand,
  ENT: Ear,
  OPHTHALMOLOGY: Eye,
  NEUROLOGY: Brain,
  NEUROSURGERY: Brain,
  PAEDIATRICS: Baby,
  GENERAL_SURGERY: Scissors,
};

// =============================================================================
// Specialty Card Component
// =============================================================================

interface SpecialtyCardProps {
  template: SpecialtyTemplate;
  onSelect: (template: SpecialtyTemplate) => void;
  isSelected: boolean;
  patientCount: number;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({
  template,
  onSelect,
  isSelected,
  patientCount,
}) => {
  const Icon = SPECIALTY_ICONS[template.specialty_code] || Sparkles;

  return (
    <button
      onClick={() => onSelect(template)}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200
        hover:shadow-md hover:scale-[1.02] text-left w-full
        ${
          isSelected
            ? 'border-violet-500 bg-violet-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-violet-300'
        }
      `}
    >
      {/* Badge for version */}
      <div className="absolute top-2 right-2">
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          v{template.version || 1}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={`
          p-2.5 rounded-lg
          ${isSelected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'}
        `}
        >
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-sm ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}
          >
            {template.specialty_name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {template.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <FileText size={12} />
              {template.sections?.length || 0} sections
            </span>
            {patientCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-violet-600 font-medium">
                <Users size={12} />
                {patientCount} waiting
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={16}
          className={`mt-1 ${isSelected ? 'text-violet-500' : 'text-gray-400'}`}
        />
      </div>
    </button>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function SpecialtyClinicPage() {
  const { hasRole, staff } = useAuth();
  const { showToast } = useToast();
  const { timeOfDay, colors: themeColors } = useTimeTheme();

  // Check user's specialty and role - MUST be before any conditional returns
  const {
    data: userSpecialtyData,
    isLoading: isLoadingUserSpecialty,
    isError: isUserSpecialtyError,
    refetch: refetchUserSpecialty,
  } = useCurrentUserSpecialty();

  // State - ALL hooks must be called unconditionally
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<SpecialtyTemplate | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [preselectedPatient, setPreselectedPatient] =
    useState<PatientDTO | null>(null);
  const [selectedEncounter, setSelectedEncounter] =
    useState<EncounterDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data hooks
  const createConsultation = useCreateConsultation();
  const { data: activeEncounters, refetch: refetchEncounters } =
    useActiveEncounters();

  // Get all templates
  const allTemplates = useMemo(() => getAllSpecialtyTemplates(), []);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return allTemplates;

    const query = searchQuery.toLowerCase();
    return allTemplates.filter(
      (t) =>
        t.specialty_name.toLowerCase().includes(query) ||
        t.specialty_code.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query),
    );
  }, [allTemplates, searchQuery]);

  // Calculate stats per specialty
  const specialtyStats = useMemo(() => {
    const stats: Record<string, number> = {};

    // For now, we don't have clinic_type on encounters
    // This will be populated when specialty clinics have assigned clinic IDs
    // TODO: Map clinic_id to specialty codes when clinics are configured

    return stats;
  }, [activeEncounters]);

  // Overall stats
  const stats = useMemo((): SpecialtyClinicStats => {
    const total = Object.values(specialtyStats).reduce((a, b) => a + b, 0);
    return {
      total,
      inProgress: Math.floor(total * 0.3),
      completed: Math.floor(total * 0.5),
      waiting: Math.floor(total * 0.2),
    };
  }, [specialtyStats]);

  // Handlers
  const handleSelectSpecialty = useCallback((template: SpecialtyTemplate) => {
    setSelectedSpecialty(template);
  }, []);

  const handleStartConsultation = useCallback(() => {
    if (!selectedSpecialty) {
      showToast({
        type: 'warning',
        title: 'Select Specialty',
        message: 'Please select a specialty clinic first',
      });
      return;
    }
    setIsWizardOpen(true);
  }, [selectedSpecialty, showToast]);

  const handleCloseWizard = useCallback(() => {
    setIsWizardOpen(false);
    setPreselectedPatient(null);
    setSelectedEncounter(null);
  }, []);

  /**
   * Submit handler for specialty consultation wizard.
   * Creates consultation with specialty template data and associated orders.
   */
  const handleSubmitConsultation = useCallback(
    async (
      data: CreateConsultationDTO,
      specialtyData: SpecialtySubmissionData | null,
      labOrders: LabOrderDTO[],
      radiologyOrders: RadiologyOrderDTO[],
      prescriptions: PrescriptionOrderDTO[],
      procedureOrders?: ProcedureOrderDTO[],
      admissionOrder?: AdmissionOrderDTO | null,
      treatmentTasks?: CreateTreatmentTaskDTO[],
      specialtyReferrals?: SpecialtyReferralDTO[],
      externalNhisReferral?: ExternalNhisReferralDTO | null,
    ) => {
      // ====================================================================
      // ENCOUNTER-CENTRIC VALIDATION
      // ====================================================================
      const encounterId =
        data.encounter_id || data.visit_id || selectedEncounter?.id;
      const patientId = data.patient_id;

      if (!encounterId) {
        showToast({
          type: 'error',
          title: 'Missing Encounter',
          message:
            'All clinical records must be tied to an encounter. Please select a patient from the queue.',
        });
        return;
      }

      if (!patientId) {
        showToast({
          type: 'error',
          title: 'Missing Patient',
          message: 'All clinical records must be tied to a patient EMR number.',
        });
        return;
      }

      // Validate EMR → Encounter → Record linkage
      const linkageValidation = await validateRecordLinkage(
        patientId,
        encounterId,
        {
          recordType: 'consultation',
        },
      );

      if (!linkageValidation.isValid) {
        showToast({
          type: 'error',
          title: 'Record Linkage Error',
          message:
            linkageValidation.error ||
            'Invalid patient/encounter linkage. Please verify the encounter.',
        });
        log.error(
          '[SpecialtyClinic] Linkage validation failed:',
          linkageValidation,
        );
        return;
      }
      // ====================================================================

      setIsSubmitting(true);

      // Store for potential retry
      const savedEncounter = selectedEncounter;
      const savedPatient = preselectedPatient;

      handleCloseWizard();

      // Show saving indicator
      showToast({
        type: 'info',
        title: 'Saving...',
        message: 'Specialty consultation is being saved.',
      });

      try {
        // Build consultation payload with specialty data
        const consultationPayload: CreateConsultationDTO = {
          ...data,
          // Add specialty template reference if available
          ...(specialtyData && {
            specialty_code: specialtyData.specialty_code,
            specialty_template_id: specialtyData.specialty_template_id,
            specialty_template_version:
              specialtyData.specialty_template_version,
            specialty_data: specialtyData.form_data,
          }),
        };

        // Create consultation
        const consultation =
          await createConsultation.mutateAsync(consultationPayload);
        const staffId = consultation.doctor_id;

        // Create treatment plan with nursing tasks if any tasks were specified
        if (
          treatmentTasks &&
          treatmentTasks.length > 0 &&
          consultation.encounter_id
        ) {
          try {
            const patientUuidForPlan = await resolvePatientUuid(
              consultation.patient_id,
            );

            if (patientUuidForPlan) {
              let diagnosisText = '';
              if (consultation.diagnosis) {
                if (Array.isArray(consultation.diagnosis)) {
                  diagnosisText = consultation.diagnosis[0] || '';
                } else if (typeof consultation.diagnosis === 'string') {
                  diagnosisText = consultation.diagnosis.split(';')[0].trim();
                }
              }
              const treatmentPlanTitle = diagnosisText
                ? `Treatment Plan - ${diagnosisText}`
                : 'Treatment Plan';

              void createTreatmentPlan({
                encounter_id: consultation.encounter_id,
                patient_id: patientUuidForPlan,
                consultation_id: consultation.consultation_id,
                title: treatmentPlanTitle,
                description: consultation.treatment_plan || undefined,
                instructions: consultation.treatment_plan || undefined,
                tasks: treatmentTasks,
              })
                .then(() => {
                  log.info(
                    '[SpecialtyClinic] Treatment plan created with',
                    treatmentTasks.length,
                    'tasks',
                  );
                })
                .catch((treatmentPlanError) => {
                  log.error(
                    'Failed to create treatment plan:',
                    treatmentPlanError,
                  );
                });
            }
          } catch (treatmentPlanError) {
            log.error(
              'Failed to create treatment plan:',
              treatmentPlanError,
            );
          }
        }

        // Create batch orders if any
        const hasOrders =
          labOrders.length > 0 ||
          radiologyOrders.length > 0 ||
          prescriptions.length > 0 ||
          (procedureOrders && procedureOrders.length > 0);

        if (hasOrders) {
          const diagnosisArray: string[] = [];
          if (consultation.diagnosis) {
            if (Array.isArray(consultation.diagnosis)) {
              diagnosisArray.push(...consultation.diagnosis);
            } else if (typeof consultation.diagnosis === 'string') {
              diagnosisArray.push(
                ...consultation.diagnosis
                  .split(';')
                  .map((d) => d.trim())
                  .filter(Boolean),
              );
            }
          }

          const clinicalFindingsParts: string[] = [];
          if ((consultation as any).examination_findings) {
            clinicalFindingsParts.push(
              `Examination Findings: ${(consultation as any).examination_findings}`,
            );
          }
          if (specialtyData?.form_data) {
            const specialtyNarrative = formatSpecialtyExamNarrative(
              specialtyData.specialty_code,
              specialtyData.form_data,
            );
            if (specialtyNarrative) {
              clinicalFindingsParts.push(specialtyNarrative);
            }
          }
          const clinicalFindings = clinicalFindingsParts.join('\n\n');

          const patientName = preselectedPatient
            ? `${preselectedPatient.first_name || ''} ${preselectedPatient.surname || ''}`.trim()
            : undefined;
          const patientEmrNumber =
            preselectedPatient?.emr_number || preselectedPatient?.patient_id;

          void createBatchOrders({
            consultationId: consultation.consultation_id,
            patientId: consultation.patient_id,
            visitId: consultation.visit_id,
            encounterId: consultation.encounter_id!,
            orderedBy: staffId,
            labOrders,
            radiologyOrders,
            procedureOrders: procedureOrders || [],
            prescriptions,
            diagnosis: diagnosisArray,
            clinicalFindings,
            patientName,
            patientEmrNumber,
          }).catch((orderErr) => {
            log.error(
              '[SpecialtyClinic] Failed to create batch orders:',
              orderErr,
            );
            showToast({
              type: 'warning',
              title: 'Orders Not Sent',
              message:
                'Consultation saved, but one or more orders could not be sent.',
            });
          });
        }

        // Create Clinical Requests for Admission Orders
        if (admissionOrder) {
          const resolvedEncounterId =
            consultation.encounter_id || consultation.visit_id;
          const staffUuid = staff?.id;
          let resolvedPatientUuid: string | null = null;

          try {
            resolvedPatientUuid = await resolvePatientUuid(
              consultation.patient_id,
            );
          } catch (e) {
            log.error(
              '[SpecialtyClinic] Failed to resolve patient UUID for admission request:',
              e,
            );
          }

          if (resolvedEncounterId && resolvedPatientUuid && staffUuid) {
            const clinicalRequests: CreateClinicalRequestDTO[] = [
              {
                patient_id: resolvedPatientUuid,
                encounter_id: resolvedEncounterId,
                requesting_doctor_id: staffUuid,
                request_type: 'Admission',
                clinical_reason: admissionOrder.reason || 'Admission requested',
                urgency:
                  admissionOrder.priority === 'Emergency'
                    ? 'Emergency'
                    : admissionOrder.priority === 'Urgent'
                      ? 'Urgent'
                      : 'Routine',
                target_ward_id: admissionOrder.ward_id,
                admission_type: admissionOrder.admission_type as
                  | 'Emergency'
                  | 'Elective',
                expected_duration: admissionOrder.expected_duration,
                special_requirements: admissionOrder.special_requirements,
                created_by: staffUuid,
              },
            ];

            void createBulkClinicalRequests(clinicalRequests)
              .then(() => {
                log.info(
                  '[SpecialtyClinic] Admission request created successfully',
                );
              })
              .catch((admissionErr) => {
                log.error(
                  '[SpecialtyClinic] Failed to create admission request:',
                  admissionErr,
                );
                showToast({
                  type: 'warning',
                  title: 'Admission Request Issue',
                  message:
                    'Could not create admission request. Please try again from clinical requests.',
                });
              });
          } else {
            log.warn(
              '[SpecialtyClinic] Cannot create admission request - missing encounter, patient UUID, or staff UUID',
            );
            showToast({
              type: 'warning',
              title: 'Admission Request Not Created',
              message: 'Admission request requires an active encounter.',
            });
          }
        }

        // Create Internal Specialty Referral Requests
        if (specialtyReferrals && specialtyReferrals.length > 0) {
          const resolvedEncounterId =
            consultation.encounter_id || consultation.visit_id;
          const staffUuid = staff?.id;
          let resolvedPatientUuid: string | null = null;

          try {
            resolvedPatientUuid = await resolvePatientUuid(
              consultation.patient_id,
            );
          } catch (e) {
            log.error(
              '[SpecialtyClinic] Failed to resolve patient UUID for referrals:',
              e,
            );
          }

          if (resolvedEncounterId && resolvedPatientUuid && staffUuid) {
            const referralRequests: CreateClinicalRequestDTO[] =
              specialtyReferrals.map(
                (referral) =>
                  ({
                    patient_id: resolvedPatientUuid!,
                    encounter_id: resolvedEncounterId,
                    requesting_doctor_id: staffUuid,
                    request_type: 'Referral' as const,
                    clinical_reason: referral.reason,
                    urgency: referral.urgency,
                    specialty_module: referral.specialty.toLowerCase(),
                    notes: `Internal referral to ${referral.specialty} - ${referral.reason}`,
                    created_by: staffUuid,
                    referral_workflow_status: 'Pending_Encounter_Office',
                    status: 'Under_Review',
                  }) as any,
              );

            void createBulkClinicalRequests(referralRequests)
              .then(() => {
                log.info(
                  '[SpecialtyClinic] Internal referrals created:',
                  specialtyReferrals.length,
                );
              })
              .catch((refErr) => {
                log.error(
                  '[SpecialtyClinic] Failed to create internal referrals:',
                  refErr,
                );
                showToast({
                  type: 'warning',
                  title: 'Referral Issue',
                  message:
                    'Some internal referrals could not be created. Please try again.',
                });
              });
          }
        }

        // Process External NHIS Referral
        if (externalNhisReferral) {
          const resolvedEncounterId =
            consultation.encounter_id || consultation.visit_id;
          const staffUuid = staff?.id;
          let resolvedPatientUuid: string | null = null;

          try {
            resolvedPatientUuid = await resolvePatientUuid(
              consultation.patient_id,
            );
          } catch (e) {
            log.error(
              '[SpecialtyClinic] Failed to resolve patient UUID for external referral:',
              e,
            );
          }

          if (resolvedEncounterId && resolvedPatientUuid && staffUuid) {
            void createOutgoingReferral({
              patient_id: resolvedPatientUuid,
              source_encounter_id: resolvedEncounterId,
              requesting_doctor_id: staffUuid,
              clinical_findings: externalNhisReferral.clinicalFindings,
              investigation_findings:
                externalNhisReferral.investigationFindings,
              provisional_diagnosis: externalNhisReferral.provisionalDiagnosis,
              reason_for_referral: externalNhisReferral.reason,
              additional_notes: externalNhisReferral.doctorName
                ? `Destination: ${externalNhisReferral.facilityName}, Doctor: ${externalNhisReferral.doctorName}`
                : `Destination: ${externalNhisReferral.facilityName}`,
              urgency: externalNhisReferral.urgency,
              requested_by: staffUuid,
            })
              .then(() => {
                log.info(
                  '[SpecialtyClinic] External NHIS referral created for:',
                  externalNhisReferral.facilityName,
                );
              })
              .catch((extRefErr) => {
                log.error(
                  '[SpecialtyClinic] Failed to create external NHIS referral:',
                  extRefErr,
                );
                showToast({
                  type: 'warning',
                  title: 'External Referral Issue',
                  message: `Could not create external referral to ${externalNhisReferral.facilityName}. Please try from NHIS desk.`,
                });
              });
          }
        }

        // Refetch encounters to update any queue displays
        void refetchEncounters();

        // Build success message
        const successParts: string[] = [];
        if (selectedSpecialty?.specialty_name) {
          successParts.push(
            `${selectedSpecialty.specialty_name} consultation saved`,
          );
        } else {
          successParts.push('Specialty consultation saved');
        }
        if (labOrders.length > 0)
          successParts.push(`${labOrders.length} lab test(s)`);
        if (radiologyOrders.length > 0)
          successParts.push(`${radiologyOrders.length} imaging order(s)`);
        if (prescriptions.length > 0)
          successParts.push(`${prescriptions.length} prescription(s)`);
        if (procedureOrders && procedureOrders.length > 0)
          successParts.push(`${procedureOrders.length} procedure(s)`);
        if (treatmentTasks && treatmentTasks.length > 0)
          successParts.push(`${treatmentTasks.length} nursing task(s)`);
        if (admissionOrder) successParts.push('admission request');
        if (specialtyReferrals && specialtyReferrals.length > 0)
          successParts.push(`${specialtyReferrals.length} referral(s)`);
        if (externalNhisReferral) successParts.push('NHIS external referral');

        const successMessage =
          successParts.length > 1
            ? `${successParts[0]} with ${successParts.slice(1).join(', ')}`
            : successParts[0];

        showToast({
          type: 'success',
          title: 'Consultation Complete',
          message: successMessage,
        });
      } catch (error) {
        log.error('Error creating specialty consultation:', error);
        showToast({
          type: 'error',
          title: 'Save Failed',
          message:
            'Failed to save specialty consultation. The form has been restored.',
        });

        // Restore form state for retry
        setPreselectedPatient(savedPatient);
        setSelectedEncounter(savedEncounter);
        setIsWizardOpen(true);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      selectedEncounter,
      preselectedPatient,
      selectedSpecialty,
      createConsultation,
      showToast,
      handleCloseWizard,
      refetchEncounters,
    ],
  );

  // Dynamic header gradient
  const headerGradient = useMemo(() => {
    return `bg-gradient-to-r ${themeColors.header.gradient}`;
  }, [themeColors]);

  // =============================================================================
  // ROLE-BASED RENDERING
  // =============================================================================

  // Determine if user is an admin (can see all specialties)
  const isAdmin =
    userSpecialtyData?.role &&
    ['super_admin', 'admin', 'medical_director'].includes(
      userSpecialtyData.role,
    );

  // Loading state
  if (isLoadingUserSpecialty) {
    return <SkeletonDashboard />;
  }

  // Network error or failed to resolve user specialty — show error with retry
  // Do NOT fall through to admin view, which would expose all specialties
  if (
    isUserSpecialtyError ||
    (!userSpecialtyData?.role && !userSpecialtyData?.specialty_code)
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <p className="text-gray-600 text-sm text-center max-w-md">
          Could not load your specialty assignment. Please check your network
          connection and try again.
        </p>
        <Button
          variant="outline"
          onClick={() => refetchUserSpecialty()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  // If user is NOT an admin and HAS a specialty_code, show their personal specialty dashboard
  // Only super_admin/admin/medical_director see the full specialty list
  if (!isAdmin && userSpecialtyData?.specialty_code) {
    // Specialties with dedicated modules get redirected to their own pages
    const DEDICATED_MODULE_ROUTES: Record<string, string> = {
      OPHTHALMOLOGY: '/ophthalmology',
      PHYSIOTHERAPY: '/physiotherapy',
      DENTAL: '/dental',
    };
    const dedicatedRoute =
      DEDICATED_MODULE_ROUTES[userSpecialtyData.specialty_code.toUpperCase()];
    if (dedicatedRoute) {
      return <Navigate to={dedicatedRoute} replace />;
    }

    return <DynamicSpecialtyDashboard />;
  }

  // =============================================================================
  // ADMIN VIEW - Full Specialty List
  // =============================================================================

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className={`${headerGradient} px-6 py-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Microscope className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Specialty Clinics
              </h1>
              <p className="text-white/80 text-sm">
                Template-driven specialty OPD consultations
              </p>
            </div>
          </div>

          <Button
            onClick={handleStartConsultation}
            disabled={!selectedSpecialty}
            className="bg-white text-violet-600 hover:bg-violet-50 font-medium px-5"
          >
            <Plus size={18} className="mr-2" />
            New Consultation
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          {[
            {
              label: 'Total Today',
              value: stats.total,
              icon: Calendar,
              color: 'bg-white/20',
            },
            {
              label: 'In Progress',
              value: stats.inProgress,
              icon: Activity,
              color: 'bg-yellow-500/30',
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: CheckCircle,
              color: 'bg-green-500/30',
            },
            {
              label: 'Waiting',
              value: stats.waiting,
              icon: Clock,
              color: 'bg-orange-500/30',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`${stat.color} rounded-lg px-4 py-3 backdrop-blur-sm`}
            >
              <div className="flex items-center gap-2">
                <stat.icon size={16} className="text-white/80" />
                <span className="text-white/80 text-xs font-medium">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Specialty Selection */}
        <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                placeholder="Search specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {filteredTemplates.length} specialties available
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredTemplates.map((template) => (
              <SpecialtyCard
                key={template.id}
                template={template}
                onSelect={handleSelectSpecialty}
                isSelected={selectedSpecialty?.id === template.id}
                patientCount={specialtyStats[template.specialty_code] || 0}
              />
            ))}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No specialties match your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Selected Specialty Info */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedSpecialty ? (
            <div className="max-w-3xl">
              {/* Specialty Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-100 text-violet-600">
                      {(() => {
                        const Icon =
                          SPECIALTY_ICONS[selectedSpecialty.specialty_code] ||
                          Sparkles;
                        return <Icon size={28} />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedSpecialty.specialty_name}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {selectedSpecialty.description}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-violet-100 text-violet-700">
                    Template v{selectedSpecialty.version || 1}
                    {selectedSpecialty.is_active && (
                      <span className="ml-1 text-green-600">(Active)</span>
                    )}
                  </span>
                </div>

                {/* Template Meta */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      OPD Type
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedSpecialty.opd_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Sections
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedSpecialty.sections?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Fields
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedSpecialty.sections?.reduce(
                        (acc, s) => acc + (s.fields?.length || 0),
                        0,
                      ) || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Examination Sections
                </h3>

                <div className="space-y-3">
                  {selectedSpecialty.sections?.map((section, idx) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {section.section_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {section.fields?.length || 0} fields
                        </p>
                      </div>
                      {section.is_required && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-600">
                          Required
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Start Button */}
                <Button
                  onClick={handleStartConsultation}
                  className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white py-3"
                >
                  <Plus size={18} className="mr-2" />
                  Start {selectedSpecialty.specialty_name} Consultation
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Microscope size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600">
                  Select a Specialty
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Choose a specialty clinic from the left panel to begin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specialty Consultation Wizard */}
      {selectedSpecialty && (
        <SpecialtyConsultationWizard
          isOpen={isWizardOpen}
          onClose={handleCloseWizard}
          onSubmit={handleSubmitConsultation}
          isLoading={isSubmitting}
          specialtyCode={selectedSpecialty.specialty_code}
          specialtyName={selectedSpecialty.specialty_name}
          template={selectedSpecialty}
          preselectedPatient={preselectedPatient}
          visitId={selectedEncounter?.id}
          encounterId={selectedEncounter?.id}
        />
      )}
    </div>
  );
}