/**
 * =============================================================================
 * XENOCARE EMR - QUICK ORDER MODAL
 *
 * A streamlined modal for creating orders directly from encounter context.
 * Follows standard EMR practice of "Order from Chart" functionality.
 *
 * Key Features:
 * - Encounter-linked: All orders automatically tied to selected encounter
 * - Tab-based: Quick switch between Lab, Radiology, Pharmacy, Procedure
 * - Validation: Uses encounter continuation rules
 * - Audit-ready: Full traceability to originating encounter
 * =============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  FlaskConical,
  Scan,
  Pill,
  Syringe,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  AlertTriangle,
  Bed,
  ListTodo,
  Share2,
  Trash2,
  ExternalLink,
  Stethoscope,
  Building,
} from 'lucide-react';
import {
  Button,
  SearchableSelect,
} from '../../../../components/ui/FormElements';
import {
  CategorizedSearchableMultiSelect,
  SearchableMultiSelect,
} from '../../../../components/ui';
import type { CategorizedOption } from '../../../../components/ui/CategorizedSearchableMultiSelect';
import type { SearchableOption } from '../../../../components/ui/SearchableMultiSelect';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import PrescriptionEditor from '../prescriptions/PrescriptionEditor';
import LabSpecimenFields from '../lab/LabSpecimenFields';
import { useToast } from '../../../../components/ui/Toast';
import {
  useLabTestCatalogue,
  useImagingCatalogue,
  useDrugCatalogue,
  useProcedureCatalogue,
  useWardsCatalogue,
} from '../../hooks/useConsultation';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  checkEncounterContinuation,
  EncounterContinuationContext,
  AllowedContinuationAction,
  isActionAllowed,
} from '../../../../lib/encounter/continuation';
import { useEncounterAccess } from '../../../../lib/encounter/useEncounterAccess';
import {
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
  ProcedureOrderDTO,
  AdmissionOrderDTO,
} from '../../dtos/consultation.dto';
import { Priority } from '../../../../types';
import {
  CreateTreatmentTaskDTO,
  CreateTreatmentPlanDTO,
  TREATMENT_TASK_TYPES,
  TreatmentTaskType,
} from '../../../treatment-plan/dtos/treatment-plan.dto';
import { createTreatmentPlan } from '../../../treatment-plan/api/treatment-plan.api';
import { createClinicalRequest } from '../../../clinical-requests/api/clinical-requests.api';
import { createOutgoingReferral } from '../../../nhis/api/nhis.api';
import { isNhisFeatureEnabled } from '../../../../config/features';
import {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  ROUTE_OPTIONS,
} from '../../../pharmacy/dtos/pharmacy.dto';
import { createBatchOrders } from '../../api/consultation.api';
import { notifyModuleRequest } from '../../../../lib/notifications/trigger.service';

// =============================================================================
// Types
// =============================================================================

export type OrderType =
  | 'lab'
  | 'radiology'
  | 'pharmacy'
  | 'procedure'
  | 'admission'
  | 'nursing'
  | 'referrals';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  encounterNumber: string;
  patientId: string;
  patientName: string;
  patientEmrNumber?: string;
  encounterContext: EncounterContinuationContext;
  onOrdersCreated: () => void;
  initialTab?: OrderType;
}

interface OrderTab {
  id: OrderType;
  label: string;
  icon: React.ReactNode;
  action: AllowedContinuationAction;
  color: string;
}

const ORDER_TABS: OrderTab[] = [
  {
    id: 'lab',
    label: 'Laboratory',
    icon: <FlaskConical size={18} />,
    action: 'add_lab_orders',
    color: 'blue',
  },
  {
    id: 'radiology',
    label: 'Radiology',
    icon: <Scan size={18} />,
    action: 'add_radiology_orders',
    color: 'purple',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: <Pill size={18} />,
    action: 'add_prescriptions',
    color: 'green',
  },
  {
    id: 'procedure',
    label: 'Procedure',
    icon: <Syringe size={18} />,
    action: 'add_procedures',
    color: 'amber',
  },
  {
    id: 'admission',
    label: 'Admission',
    icon: <Bed size={18} />,
    action: 'add_clinical_requests',
    color: 'rose',
  },
  {
    id: 'nursing',
    label: 'Nursing Tasks',
    icon: <ListTodo size={18} />,
    action: 'add_clinical_requests',
    color: 'teal',
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: <Share2 size={18} />,
    action: 'add_clinical_requests',
    color: 'cyan',
  },
];

// =============================================================================
// Main Component
// =============================================================================

export function QuickOrderModal({
  isOpen,
  onClose,
  encounterId,
  encounterNumber,
  patientId,
  patientName,
  patientEmrNumber,
  encounterContext,
  onOrdersCreated,
  initialTab = 'lab',
}: QuickOrderModalProps) {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // Check encounter access permissions
  const {
    encounterRole,
    isLoading: accessLoading,
    getAllowedActions,
  } = useEncounterAccess({ encounterId });

  // Helper to check if action is allowed
  const canPerformAction = useCallback(
    (
      action: 'order_lab' | 'order_radiology' | 'prescribe' | 'order_procedure',
    ) => {
      const allowedActions = getAllowedActions();
      return allowedActions.includes(action);
    },
    [getAllowedActions],
  );

  // State
  const [activeTab, setActiveTab] = useState<OrderType>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justification, setJustification] = useState('');

  // Orders state
  const [labOrders, setLabOrders] = useState<LabOrderDTO[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrderDTO[]>(
    [],
  );
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrderDTO[]>(
    [],
  );
  const [procedureOrders, setProcedureOrders] = useState<ProcedureOrderDTO[]>(
    [],
  );

  // Admission state
  const [admissionOrder, setAdmissionOrder] =
    useState<AdmissionOrderDTO | null>(null);

  // Nursing tasks state
  const [treatmentTasks, setTreatmentTasks] = useState<
    CreateTreatmentTaskDTO[]
  >([]);
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState('');

  // Referrals state
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [specialtyReferralData, setSpecialtyReferralData] = useState<{
    clinicalFindings: string;
    provisionalDiagnosis: string;
    reason: string;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
  }>({
    clinicalFindings: '',
    provisionalDiagnosis: '',
    reason: '',
    urgency: 'Routine',
  });
  const [externalNhisReferral, setExternalNhisReferral] = useState({
    enabled: false,
    facilityName: '',
    facilityAddress: '',
    doctorName: '',
    reason: '',
    clinicalFindings: '',
    investigationFindings: '',
    provisionalDiagnosis: '',
    urgency: 'Routine' as 'Routine' | 'Urgent' | 'Emergency',
  });

  React.useEffect(() => {
    if (!isNhisFeatureEnabled() && externalNhisReferral.enabled) {
      setExternalNhisReferral((prev) => ({ ...prev, enabled: false }));
    }
  }, [externalNhisReferral.enabled]);

  // Catalogues
  const { data: labTests } = useLabTestCatalogue();
  const { data: imagingOptions } = useImagingCatalogue();
  const { data: drugOptions } = useDrugCatalogue();
  const { data: procedureOptions } = useProcedureCatalogue();
  const { data: wardOptions } = useWardsCatalogue();

  // Check encounter continuation eligibility
  const continuationEligibility = useMemo(() => {
    return checkEncounterContinuation(encounterContext);
  }, [encounterContext]);

  // Get available tabs based on allowed actions
  const availableTabs = useMemo(() => {
    return ORDER_TABS.filter((tab) =>
      isActionAllowed(continuationEligibility, tab.action),
    );
  }, [continuationEligibility]);

  // If current tab not available, switch to first available
  React.useEffect(() => {
    if (
      availableTabs.length > 0 &&
      !availableTabs.find((t) => t.id === activeTab)
    ) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Count total orders
  const referralCount =
    (selectedSpecialty ? 1 : 0) +
    (isNhisFeatureEnabled() && externalNhisReferral.enabled ? 1 : 0);
  const totalOrders =
    labOrders.length +
    radiologyOrders.length +
    prescriptions.length +
    procedureOrders.length +
    (admissionOrder ? 1 : 0) +
    treatmentTasks.length +
    referralCount;

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (totalOrders === 0) {
      showToast({ type: 'error', message: 'Please add at least one order' });
      return;
    }

    if (
      continuationEligibility.requiresJustification &&
      !justification.trim()
    ) {
      showToast({
        type: 'error',
        message: 'Justification is required for this encounter',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUserId = staff?.staff_id || '';

      // 1. Submit batch orders (lab, radiology, pharmacy, procedure)
      const hasBatchOrders =
        labOrders.length > 0 ||
        radiologyOrders.length > 0 ||
        prescriptions.length > 0 ||
        procedureOrders.length > 0;

      if (hasBatchOrders) {
        await createBatchOrders({
          consultationId: '',
          patientId,
          encounterId,
          labOrders,
          radiologyOrders,
          prescriptions,
          procedureOrders: procedureOrders as any,
          orderedBy: currentUserId,
          diagnosis: [],
          justification: justification || undefined,
          patientName,
          patientEmrNumber,
        });
      }

      // 2. Submit admission request
      if (admissionOrder) {
        await createClinicalRequest({
          patient_id: patientId,
          encounter_id: encounterId,
          requesting_doctor_id: currentUserId,
          request_type: 'Admission',
          clinical_reason: admissionOrder.reason,
          urgency:
            admissionOrder.priority === 'Emergency'
              ? 'Emergency'
              : admissionOrder.priority === 'Urgent'
                ? 'Urgent'
                : 'Routine',
          admission_type: admissionOrder.admission_type as any,
          expected_duration: admissionOrder.expected_duration,
          special_requirements: admissionOrder.special_requirements,
          target_ward_id: admissionOrder.ward_id,
          notes: admissionOrder.attending_doctor_notes,
        });
      }

      // 3. Submit treatment plan / nursing tasks
      if (treatmentTasks.length > 0) {
        await createTreatmentPlan({
          encounter_id: encounterId,
          patient_id: patientId,
          title: treatmentPlanNotes || 'Treatment Plan',
          description: treatmentPlanNotes,
          tasks: treatmentTasks,
        });
      }

      // 4. Submit internal specialty referrals
      if (selectedSpecialty) {
        await createClinicalRequest({
          patient_id: patientId,
          encounter_id: encounterId,
          requesting_doctor_id: currentUserId,
          request_type: 'Referral',
          clinical_reason: specialtyReferralData.reason,
          urgency: specialtyReferralData.urgency,
          specialty_module: selectedSpecialty,
          notes: `Clinical Findings: ${specialtyReferralData.clinicalFindings}\nProvisional Diagnosis: ${specialtyReferralData.provisionalDiagnosis}`,
        });
      }

      // 5. Submit external NHIS referral
      if (
        isNhisFeatureEnabled() &&
        externalNhisReferral.enabled &&
        externalNhisReferral.facilityName
      ) {
        await createOutgoingReferral({
          patient_id: patientId,
          source_encounter_id: encounterId,
          requesting_doctor_id: currentUserId,
          clinical_findings: externalNhisReferral.clinicalFindings,
          investigation_findings:
            externalNhisReferral.investigationFindings || undefined,
          provisional_diagnosis: externalNhisReferral.provisionalDiagnosis,
          reason_for_referral: externalNhisReferral.reason,
          urgency: externalNhisReferral.urgency,
          requested_by: currentUserId,
        });
      }

      showToast({
        type: 'success',
        message: `Successfully created ${totalOrders} order(s)`,
      });

      // Fire module request notifications for each department
      if (labOrders.length > 0) {
        notifyModuleRequest(
          'Laboratory',
          patientName,
          `${labOrders.length} lab test(s) ordered`,
          encounterId,
          {
            targetRole: 'lab_scientist',
            encounterId,
            currentUserId,
            actionUrl: `/lab?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      if (radiologyOrders.length > 0) {
        notifyModuleRequest(
          'Radiology',
          patientName,
          `${radiologyOrders.length} imaging study(ies) ordered`,
          encounterId,
          {
            targetRole: 'radiographer',
            encounterId,
            currentUserId,
            actionUrl: `/radiology?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      if (prescriptions.length > 0) {
        notifyModuleRequest(
          'Pharmacy',
          patientName,
          `${prescriptions.length} prescription(s) ordered`,
          encounterId,
          {
            targetRole: 'pharmacist',
            encounterId,
            currentUserId,
            actionUrl: `/pharmacy?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      if (procedureOrders.length > 0) {
        notifyModuleRequest(
          'Procedure',
          patientName,
          `${procedureOrders.length} procedure(s) ordered`,
          encounterId,
          {
            targetRole: 'nurse',
            encounterId,
            currentUserId,
            actionUrl: `/procedures?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      if (admissionOrder) {
        notifyModuleRequest(
          'In-Patient',
          patientName,
          'Admission request created',
          encounterId,
          {
            targetRole: 'nurse',
            encounterId,
            currentUserId,
            actionUrl: `/in-patient?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      if (treatmentTasks.length > 0) {
        notifyModuleRequest(
          'Nursing',
          patientName,
          `${treatmentTasks.length} nursing task(s) assigned`,
          encounterId,
          {
            targetRole: 'nurse',
            encounterId,
            currentUserId,
            actionUrl: `/nursing?encounter=${encounterId}`,
          },
        ).catch(() => {});
      }

      onOrdersCreated();
      onClose();

      // Reset state
      setLabOrders([]);
      setRadiologyOrders([]);
      setPrescriptions([]);
      setProcedureOrders([]);
      setAdmissionOrder(null);
      setTreatmentTasks([]);
      setTreatmentPlanNotes('');
      setSelectedSpecialty('');
      setSpecialtyReferralData({
        clinicalFindings: '',
        provisionalDiagnosis: '',
        reason: '',
        urgency: 'Routine',
      });
      setExternalNhisReferral({
        enabled: false,
        facilityName: '',
        facilityAddress: '',
        doctorName: '',
        reason: '',
        clinicalFindings: '',
        investigationFindings: '',
        provisionalDiagnosis: '',
        urgency: 'Routine',
      });
      setJustification('');
    } catch (error: any) {
      console.error('Failed to create orders:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to create orders',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    totalOrders,
    continuationEligibility.requiresJustification,
    justification,
    patientId,
    encounterId,
    labOrders,
    radiologyOrders,
    prescriptions,
    procedureOrders,
    admissionOrder,
    treatmentTasks,
    treatmentPlanNotes,
    selectedSpecialty,
    specialtyReferralData,
    externalNhisReferral,
    staff?.staff_id,
    patientName,
    patientEmrNumber,
    showToast,
    onOrdersCreated,
    onClose,
  ]);

  if (!isOpen) return null;

  // Show loading state while checking access
  if (accessLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <Loader2
              size={32}
              className="animate-spin mx-auto mb-4 text-primary-700"
            />
            <p className="text-gray-600">Checking access permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has permission to place orders
  const canPlaceOrders =
    canPerformAction('order_lab') ||
    canPerformAction('order_radiology') ||
    canPerformAction('prescribe') ||
    canPerformAction('order_procedure');

  if (!canPlaceOrders) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 mb-2">
              You don't have permission to place orders for this encounter.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your role:{' '}
              <span className="font-medium">{encounterRole || 'None'}</span>
            </p>
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If no continuation is allowed
  if (!continuationEligibility.canContinue) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Cannot Add Orders
            </h2>
            <p className="text-gray-600 mb-6">
              {continuationEligibility.reason}
            </p>
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] min-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Add Orders to Encounter
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Patient: <span className="font-medium">{patientName}</span> •
              Encounter: <span className="font-medium">{encounterNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Warning Banner if justification required */}
        {continuationEligibility.requiresJustification && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Justification Required
              </p>
              <p className="text-sm text-amber-700">
                {continuationEligibility.reason}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const orderCount =
              tab.id === 'lab'
                ? labOrders.length
                : tab.id === 'radiology'
                  ? radiologyOrders.length
                  : tab.id === 'pharmacy'
                    ? prescriptions.length
                    : tab.id === 'procedure'
                      ? procedureOrders.length
                      : tab.id === 'admission'
                        ? admissionOrder
                          ? 1
                          : 0
                        : tab.id === 'nursing'
                          ? treatmentTasks.length
                          : tab.id === 'referrals'
                            ? referralCount
                            : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? `bg-${tab.color}-100 text-${tab.color}-700`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
                {orderCount > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                      isActive ? `bg-${tab.color}-200` : 'bg-gray-200'
                    }`}
                  >
                    {orderCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {activeTab === 'lab' && (
            <LabOrdersPanel
              orders={labOrders}
              onOrdersChange={setLabOrders}
              labTests={labTests || []}
            />
          )}
          {activeTab === 'radiology' && (
            <RadiologyOrdersPanel
              orders={radiologyOrders}
              onOrdersChange={setRadiologyOrders}
              imagingOptions={imagingOptions || []}
            />
          )}
          {activeTab === 'pharmacy' && (
            <PrescriptionsPanel
              prescriptions={prescriptions}
              onPrescriptionsChange={setPrescriptions}
              drugOptions={drugOptions || []}
            />
          )}
          {activeTab === 'procedure' && (
            <ProcedureOrdersPanel
              orders={procedureOrders}
              onOrdersChange={setProcedureOrders}
              procedureOptions={procedureOptions || []}
            />
          )}
          {activeTab === 'admission' && (
            <AdmissionPanel
              admissionOrder={admissionOrder}
              onAdmissionOrderChange={setAdmissionOrder}
              wardOptions={wardOptions || []}
            />
          )}
          {activeTab === 'nursing' && (
            <NursingTasksPanel
              treatmentTasks={treatmentTasks}
              onTreatmentTasksChange={setTreatmentTasks}
              treatmentPlanNotes={treatmentPlanNotes}
              onTreatmentPlanNotesChange={setTreatmentPlanNotes}
            />
          )}
          {activeTab === 'referrals' && (
            <ReferralsPanel
              selectedSpecialty={selectedSpecialty}
              onSelectedSpecialtyChange={setSelectedSpecialty}
              specialtyReferralData={specialtyReferralData}
              onSpecialtyReferralDataChange={setSpecialtyReferralData}
              externalNhisReferral={externalNhisReferral}
              onExternalNhisReferralChange={setExternalNhisReferral}
            />
          )}
        </div>

        {/* Justification Input (if required) */}
        {continuationEligibility.requiresJustification && (
          <div className="px-6 py-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why additional orders are needed for this encounter..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={2}
            />
          </div>
        )}

        {/* Footer — always visible, sticky at bottom */}
        <div className="flex-shrink-0 px-6 py-3 border-t-2 border-gray-200 bg-gray-50 rounded-b-2xl">
          {/* Order summary chips */}
          {totalOrders > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {labOrders.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  <FlaskConical size={12} /> {labOrders.length} Lab
                </span>
              )}
              {radiologyOrders.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                  <Scan size={12} /> {radiologyOrders.length} Radiology
                </span>
              )}
              {prescriptions.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                  <Pill size={12} /> {prescriptions.length} Rx
                </span>
              )}
              {procedureOrders.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                  <Syringe size={12} /> {procedureOrders.length} Procedures
                </span>
              )}
              {admissionOrder && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200">
                  <Bed size={12} /> 1 Admission
                </span>
              )}
              {treatmentTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                  <ListTodo size={12} /> {treatmentTasks.length} Tasks
                </span>
              )}
              {referralCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-semibold rounded-full border border-cyan-200">
                  <Share2 size={12} /> {referralCount} Referral
                  {referralCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {totalOrders > 0 ? (
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle size={16} className="text-green-600" />
                  {totalOrders} order{totalOrders !== 1 ? 's' : ''} ready to
                  submit
                </span>
              ) : (
                <span className="flex items-center gap-2 text-gray-400">
                  <Info size={16} />
                  Search and select items above, then submit
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={totalOrders === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit {totalOrders > 0 ? `${totalOrders} ` : ''}Order
                    {totalOrders !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Lab Orders Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface LabOrdersPanelProps {
  orders: LabOrderDTO[];
  onOrdersChange: (orders: LabOrderDTO[]) => void;
  labTests: any[];
}

function LabOrdersPanel({
  orders,
  onOrdersChange,
  labTests,
}: LabOrdersPanelProps) {
  const labTestOptions: CategorizedOption[] = useMemo(
    () =>
      labTests.map((test) => ({
        id: test.test_id,
        name: test.test_name,
        code: test.test_code,
        category: test.category || 'General',
        subCategory: test.sample_type || undefined,
        price: test.price ?? null,
      })),
    [labTests],
  );

  const selectedLabIds = useMemo(() => orders.map((o) => o.test_id), [orders]);

  return (
    <div className="space-y-4">
      <CategorizedSearchableMultiSelect
        options={labTestOptions}
        selectedIds={selectedLabIds}
        onToggleSelect={(testId: string) => {
          const test = labTestOptions.find((t) => t.id === testId);
          if (selectedLabIds.includes(testId)) {
            onOrdersChange(orders.filter((o) => o.test_id !== testId));
          } else {
            onOrdersChange([
              ...orders,
              {
                test_id: testId,
                priority: 'Normal',
                test_name: test?.name,
                specimen_type: test?.subCategory,
                clinical_notes: '',
              },
            ]);
          }
        }}
        placeholder="Search lab tests by name, code, or category..."
        allCategoriesLabel="All Tests"
      />

      {/* Selected Lab Tests with Clinical Notes */}
      {orders.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Lab Tests:
          </p>
          {orders.map((order) => {
            const test = labTestOptions.find((t) => t.id === order.test_id);
            return (
              <div
                key={order.test_id}
                className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {test?.name || order.test_name || order.test_id}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onOrdersChange(
                        orders.filter((o) => o.test_id !== order.test_id),
                      )
                    }
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
                <LabSpecimenFields
                  specimenType={order.specimen_type || test?.subCategory}
                  specimenIdentifier={order.specimen_identifier}
                  onChange={(patch) =>
                    onOrdersChange(
                      orders.map((o) =>
                        o.test_id === order.test_id ? { ...o, ...patch } : o,
                      ),
                    )
                  }
                />
                <textarea
                  value={order.clinical_notes || ''}
                  onChange={(e) =>
                    onOrdersChange(
                      orders.map((o) =>
                        o.test_id === order.test_id
                          ? { ...o, clinical_notes: e.target.value }
                          : o,
                      ),
                    )
                  }
                  placeholder="Clinical notes (optional) - reason for test, relevant history..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Radiology Orders Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface RadiologyOrdersPanelProps {
  orders: RadiologyOrderDTO[];
  onOrdersChange: (orders: RadiologyOrderDTO[]) => void;
  imagingOptions: any[];
}

function RadiologyOrdersPanel({
  orders,
  onOrdersChange,
  imagingOptions,
}: RadiologyOrdersPanelProps) {
  const imagingCategorizedOptions: CategorizedOption[] = useMemo(
    () =>
      imagingOptions.map((img) => ({
        id: img.imaging_id,
        name: img.imaging_name,
        code: img.imaging_code,
        category: img.imaging_type || 'General',
        extraInfo: img.body_part,
        price: img.price ?? null,
      })),
    [imagingOptions],
  );

  const selectedImagingIds = useMemo(
    () => orders.map((o) => o.imaging_id),
    [orders],
  );

  return (
    <div className="space-y-4">
      <CategorizedSearchableMultiSelect
        options={imagingCategorizedOptions}
        selectedIds={selectedImagingIds}
        onToggleSelect={(imagingId: string) => {
          const imaging = imagingCategorizedOptions.find(
            (i) => i.id === imagingId,
          );
          if (selectedImagingIds.includes(imagingId)) {
            onOrdersChange(orders.filter((o) => o.imaging_id !== imagingId));
          } else {
            onOrdersChange([
              ...orders,
              {
                imaging_id: imagingId,
                body_part:
                  imagingOptions.find((i) => i.imaging_id === imagingId)
                    ?.body_part || '',
                priority: 'Normal' as const,
                clinical_indication: '',
              },
            ]);
          }
        }}
        placeholder="Search imaging studies by name, code, or modality..."
        allCategoriesLabel="All Modalities"
      />

      {/* Selected Imaging Studies with Clinical Indication */}
      {orders.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Imaging Studies:
          </p>
          {orders.map((order) => {
            const imaging = imagingCategorizedOptions.find(
              (i) => i.id === order.imaging_id,
            );
            return (
              <div
                key={order.imaging_id}
                className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {imaging?.name || order.imaging_id}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onOrdersChange(
                        orders.filter((o) => o.imaging_id !== order.imaging_id),
                      )
                    }
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  value={order.clinical_indication || ''}
                  onChange={(e) =>
                    onOrdersChange(
                      orders.map((o) =>
                        o.imaging_id === order.imaging_id
                          ? { ...o, clinical_indication: e.target.value }
                          : o,
                      ),
                    )
                  }
                  placeholder="Clinical indication (optional) - reason for study, suspected diagnosis..."
                  rows={2}
                  className="w-full mt-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Prescriptions Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface PrescriptionsPanelProps {
  prescriptions: PrescriptionOrderDTO[];
  onPrescriptionsChange: (prescriptions: PrescriptionOrderDTO[]) => void;
  drugOptions: any[];
}

function PrescriptionsPanel({
  prescriptions,
  onPrescriptionsChange,
  drugOptions,
}: PrescriptionsPanelProps) {
  const drugSearchOptions: SearchableOption[] = useMemo(
    () =>
      drugOptions.map((drug) => ({
        id: drug.drug_id,
        name: drug.drug_name,
        code: drug.generic_name,
        category: drug.form || 'General',
        extraInfo: drug.strength,
        price: drug.price ?? null,
      })),
    [drugOptions],
  );

  return (
    <PrescriptionEditor
      prescriptions={prescriptions}
      onChange={onPrescriptionsChange}
      drugOptions={drugSearchOptions}
    />
  );
}

// =============================================================================
// Procedure Orders Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface ProcedureOrdersPanelProps {
  orders: ProcedureOrderDTO[];
  onOrdersChange: (orders: ProcedureOrderDTO[]) => void;
  procedureOptions: any[];
}

function ProcedureOrdersPanel({
  orders,
  onOrdersChange,
  procedureOptions,
}: ProcedureOrdersPanelProps) {
  const procedureCategorizedOptions: CategorizedOption[] = useMemo(
    () =>
      procedureOptions.map((proc) => ({
        id: proc.procedure_id,
        name: proc.procedure_name,
        code: proc.procedure_code,
        category: proc.category || 'General',
        price: proc.price ?? null,
      })),
    [procedureOptions],
  );

  const selectedProcedureIds = useMemo(
    () => orders.map((o) => o.procedure_id),
    [orders],
  );

  return (
    <div className="space-y-4">
      <CategorizedSearchableMultiSelect
        options={procedureCategorizedOptions}
        selectedIds={selectedProcedureIds}
        onToggleSelect={(procedureId: string) => {
          const proc = procedureCategorizedOptions.find(
            (p) => p.id === procedureId,
          );
          if (selectedProcedureIds.includes(procedureId)) {
            onOrdersChange(
              orders.filter((o) => o.procedure_id !== procedureId),
            );
          } else {
            onOrdersChange([
              ...orders,
              {
                procedure_id: procedureId,
                procedure_name: proc?.name || '',
                procedure_type: proc?.category || 'General',
                priority: 'Normal' as const,
                notes: '',
              },
            ]);
          }
        }}
        placeholder="Search procedures by name, code, or type..."
        allCategoriesLabel="All Types"
      />

      {/* Selected Procedures */}
      {orders.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Procedures:
          </p>
          {orders.map((proc) => (
            <div
              key={proc.procedure_id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {proc.procedure_name}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  {proc.procedure_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOrdersChange(
                    orders.filter((p) => p.procedure_id !== proc.procedure_id),
                  )
                }
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Admission Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface AdmissionPanelProps {
  admissionOrder: AdmissionOrderDTO | null;
  onAdmissionOrderChange: (order: AdmissionOrderDTO | null) => void;
  wardOptions: any[];
}

function AdmissionPanel({
  admissionOrder,
  onAdmissionOrderChange,
  wardOptions,
}: AdmissionPanelProps) {
  if (!admissionOrder) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-white hover:border-rose-300 hover:shadow-sm transition-all group">
          <div className="bg-white p-4 rounded-full shadow-sm w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-gray-100 group-hover:scale-110 transition-transform">
            <Bed className="h-8 w-8 text-rose-500" />
          </div>
          <h4 className="text-xl font-semibold text-gray-900 mb-2">
            Admit Patient
          </h4>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Create an inpatient admission request for observation or treatment.
          </p>
          <Button
            type="button"
            onClick={() =>
              onAdmissionOrderChange({
                admission_type: 'Elective',
                reason: '',
                priority: 'Normal',
              })
            }
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 h-auto text-base"
          >
            <Plus size={18} className="mr-2" />
            Create Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
              <Bed className="h-5 w-5 text-rose-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              Admission Details
            </h4>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdmissionOrderChange(null)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 p-2 h-auto"
            title="Remove admission request"
          >
            <Trash2 size={16} className="mr-2" />
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admission Type *
            </label>
            <SearchableSelect
              value={admissionOrder.admission_type}
              onChange={(value) =>
                onAdmissionOrderChange({
                  ...admissionOrder,
                  admission_type: value as
                    | 'Emergency'
                    | 'Elective'
                    | 'Transfer',
                })
              }
              options={['Elective', 'Emergency', 'Transfer']}
              placeholder="Select admission type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority *
            </label>
            <SearchableSelect
              value={admissionOrder.priority}
              onChange={(value) =>
                onAdmissionOrderChange({
                  ...admissionOrder,
                  priority: value as 'Normal' | 'Urgent' | 'Emergency',
                })
              }
              options={['Normal', 'Urgent', 'Emergency']}
              placeholder="Select priority"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Ward
            </label>
            <SearchableSelect
              value={admissionOrder.ward_name || ''}
              onChange={(value) => {
                const ward = (wardOptions || []).find(
                  (w: any) =>
                    `${w.name} (${w.category || w.ward_type || ''}) - ${w.extraInfo || w.available_beds || ''}` ===
                    value,
                );
                onAdmissionOrderChange({
                  ...admissionOrder,
                  ward_id: ward?.id || ward?.ward_id || undefined,
                  ward_name: ward?.name,
                  ward_type: ward?.category || ward?.ward_type,
                });
              }}
              options={(wardOptions || []).map(
                (ward: any) =>
                  `${ward.name} (${ward.category || ward.ward_type || ''}) - ${ward.extraInfo || ward.available_beds || ''}`,
              )}
              placeholder="Select ward (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Duration
            </label>
            <SearchableSelect
              value={admissionOrder.expected_duration || ''}
              onChange={(value) =>
                onAdmissionOrderChange({
                  ...admissionOrder,
                  expected_duration: value || undefined,
                })
              }
              options={[
                '1 Day',
                '2-3 Days',
                '4-7 Days (1 Week)',
                '1-2 Weeks',
                '2-4 Weeks',
                'More than 1 Month',
              ]}
              placeholder="Select duration"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Reason for Admission *
            </label>
            <SavedNotesPopover
              category="admission_notes"
              subcategory="reason"
              currentValue={admissionOrder.reason}
              onInsert={(content) =>
                onAdmissionOrderChange({
                  ...admissionOrder,
                  reason: content,
                })
              }
            />
          </div>
          <textarea
            value={admissionOrder.reason}
            onChange={(e) =>
              onAdmissionOrderChange({
                ...admissionOrder,
                reason: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            rows={2}
            placeholder="Enter reason for admission..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Special Requirements / Notes
            </label>
            <SavedNotesPopover
              category="admission_notes"
              subcategory="special_requirements"
              currentValue={admissionOrder.special_requirements || ''}
              onInsert={(content) =>
                onAdmissionOrderChange({
                  ...admissionOrder,
                  special_requirements: content || undefined,
                })
              }
            />
          </div>
          <textarea
            value={admissionOrder.special_requirements || ''}
            onChange={(e) =>
              onAdmissionOrderChange({
                ...admissionOrder,
                special_requirements: e.target.value || undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            rows={2}
            placeholder="Any special requirements (isolation, monitoring equipment, etc.)..."
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Nursing Tasks Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

interface NursingTasksPanelProps {
  treatmentTasks: CreateTreatmentTaskDTO[];
  onTreatmentTasksChange: (tasks: CreateTreatmentTaskDTO[]) => void;
  treatmentPlanNotes: string;
  onTreatmentPlanNotesChange: (notes: string) => void;
}

function NursingTasksPanel({
  treatmentTasks,
  onTreatmentTasksChange,
  treatmentPlanNotes,
  onTreatmentPlanNotesChange,
}: NursingTasksPanelProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CreateTreatmentTaskDTO>>({
    task_type: 'Other',
    title: '',
    description: '',
    instructions: '',
    priority: 'Normal',
  });

  return (
    <div className="space-y-4">
      {/* Treatment Plan Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Treatment Plan Notes
        </label>
        <textarea
          value={treatmentPlanNotes}
          onChange={(e) => onTreatmentPlanNotesChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 transition-all min-h-[80px]"
          placeholder="General treatment plan notes and instructions for nursing staff..."
        />
      </div>

      {/* Added Tasks List */}
      {treatmentTasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            Task List ({treatmentTasks.length})
          </p>
          {treatmentTasks.map((task, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                      task.task_type === 'Administer_Medication'
                        ? 'bg-orange-50 text-orange-700 border-orange-100'
                        : task.task_type === 'Monitor_Vitals'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : task.task_type === 'Procedure'
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : task.task_type === 'Wound_Care'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : task.task_type === 'Sample_Collection'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {task.task_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      task.priority === 'Urgent'
                        ? 'bg-amber-100 text-amber-800'
                        : task.priority === 'Emergency'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">{task.title}</p>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {task.description}
                  </p>
                )}
                {task.instructions && (
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                    Instructions: {task.instructions}
                  </div>
                )}
                {task.task_type === 'Administer_Medication' &&
                  task.medication_name && (
                    <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2 inline-flex items-center gap-1">
                      <span>💊</span>
                      <span className="font-medium">
                        {task.medication_name}
                      </span>
                      <span>
                        - {task.dosage} ({task.route})
                      </span>
                    </div>
                  )}
                {task.task_type === 'Monitor_Vitals' && task.frequency && (
                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded mt-2 inline-flex items-center gap-1">
                    <span>⏰ Frequency:</span>
                    <span className="font-medium">{task.frequency}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  onTreatmentTasksChange(
                    treatmentTasks.filter((_, i) => i !== index),
                  )
                }
                className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Form */}
      {showAddTask ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h4 className="font-semibold text-gray-900">Add Nursing Task</h4>
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
              </label>
              <SearchableSelect
                value={newTask.task_type?.replace(/_/g, ' ') || 'Other'}
                onChange={(value) =>
                  setNewTask({
                    ...newTask,
                    task_type: value.replace(/ /g, '_') as TreatmentTaskType,
                  })
                }
                options={TREATMENT_TASK_TYPES.map((type) =>
                  type.replace(/_/g, ' '),
                )}
                placeholder="Select task type"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <SearchableSelect
                value={newTask.priority || 'Normal'}
                onChange={(value) => {
                  const priority = value as CreateTreatmentTaskDTO['priority'];
                  setNewTask({ ...newTask, priority });
                }}
                options={['Normal', 'Urgent', 'Emergency']}
                placeholder="Select priority"
              />
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={newTask.title || ''}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              placeholder="e.g., Blood pressure check, Administer IV fluids"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Medication-specific fields */}
          {newTask.task_type === 'Administer_Medication' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={newTask.medication_name || ''}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      medication_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g., Paracetamol"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={newTask.dosage || ''}
                  onChange={(e) =>
                    setNewTask({ ...newTask, dosage: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g., 500mg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route
                </label>
                <SearchableSelect
                  value={newTask.route || 'Oral'}
                  onChange={(value) => setNewTask({ ...newTask, route: value })}
                  options={[
                    'Oral',
                    'IV (Intravenous)',
                    'IM (Intramuscular)',
                    'SC (Subcutaneous)',
                    'Topical',
                    'Inhaled',
                    'Rectal',
                  ]}
                  placeholder="Select route"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <SearchableSelect
                  value={newTask.frequency || ''}
                  onChange={(value) =>
                    setNewTask({ ...newTask, frequency: value })
                  }
                  options={[
                    'Once',
                    'Stat (Immediately)',
                    'BD (Twice daily)',
                    'TDS (Three times daily)',
                    'QDS (Four times daily)',
                    'Every 4 hours',
                    'Every 6 hours',
                    'Every 8 hours',
                    'PRN (As needed)',
                  ]}
                  placeholder="Select frequency"
                />
              </div>
            </div>
          )}

          {/* Monitor Vitals specific fields */}
          {newTask.task_type === 'Monitor_Vitals' && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monitoring Frequency
              </label>
              <SearchableSelect
                value={newTask.frequency || ''}
                onChange={(value) =>
                  setNewTask({ ...newTask, frequency: value })
                }
                options={[
                  'Every 15 minutes',
                  'Every 30 minutes',
                  'Every 1 hour',
                  'Every 2 hours',
                  'Every 4 hours',
                  'Every 6 hours',
                  'Every 8 hours',
                  'Three times daily',
                  'Twice daily',
                  'Once daily',
                ]}
                placeholder="Select frequency"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newTask.description || ''}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              rows={2}
              placeholder="Additional details about the task..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddTask(false)}
              className="border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (newTask.title && newTask.task_type) {
                  onTreatmentTasksChange([
                    ...treatmentTasks,
                    {
                      task_type: newTask.task_type as TreatmentTaskType,
                      title: newTask.title,
                      description: newTask.description || '',
                      instructions: newTask.instructions || '',
                      priority: newTask.priority || 'Normal',
                      medication_name: newTask.medication_name,
                      dosage: newTask.dosage,
                      route: newTask.route,
                      frequency: newTask.frequency,
                    },
                  ]);
                  setNewTask({
                    task_type: 'Other',
                    title: '',
                    description: '',
                    instructions: '',
                    priority: 'Normal',
                  });
                  setShowAddTask(false);
                }
              }}
              disabled={!newTask.title}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus size={16} className="mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddTask(true)}
          className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:bg-white hover:border-gray-400 hover:text-gray-900 hover:shadow-sm transition-all flex flex-col items-center justify-center gap-2"
        >
          <div className="p-2 bg-gray-100 rounded-full">
            <Plus size={24} />
          </div>
          <span className="font-medium">Add Nursing Task</span>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Referrals Panel — matches ConsultationWizard OrdersStep exactly
// =============================================================================

const SPECIALTY_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: 'dental', label: 'Dental', emoji: '🦷' },
  { key: 'ophthalmology', label: 'Ophthalmology', emoji: '👁️' },
  { key: 'physiotherapy', label: 'Physiotherapy', emoji: '🏃' },
  { key: 'cardiology', label: 'Cardiology', emoji: '❤️' },
  { key: 'orthopaedics', label: 'Orthopaedics', emoji: '🦴' },
  { key: 'dermatology', label: 'Dermatology', emoji: '🩺' },
  { key: 'urology', label: 'Urology', emoji: '🚰' },
  { key: 'gastroenterology', label: 'Gastroenterology', emoji: '🍽️' },
  { key: 'nephrology', label: 'Nephrology', emoji: '🫘' },
  { key: 'paediatrics', label: 'Paediatrics', emoji: '👶' },
  { key: 'neurosurgery', label: 'Neurosurgery', emoji: '🧠' },
  { key: 'neurology', label: 'Neurology', emoji: '🧠' },
  { key: 'neuropsychiatry', label: 'Neuropsychiatry', emoji: '💭' },
  { key: 'general_surgery', label: 'General Surgery', emoji: '🏥' },
  { key: 'gynaecology', label: 'Gynaecology', emoji: '🤰' },
  { key: 'oral_maxillofacial', label: 'Oral & Maxillofacial', emoji: '😷' },
  { key: 'pulmonology', label: 'Pulmonology', emoji: '🫁' },
  { key: 'endocrinology', label: 'Endocrinology', emoji: '⚗️' },
  { key: 'plastic_surgery', label: 'Plastic Surgery', emoji: '✨' },
  { key: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { key: 'ent', label: 'ENT (Ear, Nose, Throat)', emoji: '👂' },
];

interface ReferralsPanelProps {
  selectedSpecialty: string;
  onSelectedSpecialtyChange: (specialty: string) => void;
  specialtyReferralData: {
    clinicalFindings: string;
    provisionalDiagnosis: string;
    reason: string;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
  };
  onSpecialtyReferralDataChange: (data: {
    clinicalFindings: string;
    provisionalDiagnosis: string;
    reason: string;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
  }) => void;
  externalNhisReferral: {
    enabled: boolean;
    facilityName: string;
    facilityAddress: string;
    doctorName: string;
    reason: string;
    clinicalFindings: string;
    investigationFindings: string;
    provisionalDiagnosis: string;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
  };
  onExternalNhisReferralChange: React.Dispatch<
    React.SetStateAction<{
      enabled: boolean;
      facilityName: string;
      facilityAddress: string;
      doctorName: string;
      reason: string;
      clinicalFindings: string;
      investigationFindings: string;
      provisionalDiagnosis: string;
      urgency: 'Routine' | 'Urgent' | 'Emergency';
    }>
  >;
}

function ReferralsPanel({
  selectedSpecialty,
  onSelectedSpecialtyChange,
  specialtyReferralData,
  onSpecialtyReferralDataChange,
  externalNhisReferral,
  onExternalNhisReferralChange,
}: ReferralsPanelProps) {
  const selectedSpecialtyInfo = SPECIALTY_OPTIONS.find(
    (s) => s.key === selectedSpecialty,
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-cyan-600" />
          Create Referral
        </h3>

        {/* Referral Type Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Referral Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onExternalNhisReferralChange((prev) => ({
                    ...prev,
                    enabled: false,
                  }));
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !externalNhisReferral.enabled && selectedSpecialty
                    ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200'
                    : !externalNhisReferral.enabled
                      ? 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${!externalNhisReferral.enabled && selectedSpecialty ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <Building size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Internal Referral
                    </p>
                    <p className="text-sm text-gray-500">
                      Refer to a specialty clinic within this hospital
                    </p>
                  </div>
                </div>
              </button>
              {isNhisFeatureEnabled() && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectedSpecialtyChange('');
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      enabled: !prev.enabled,
                    }));
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    externalNhisReferral.enabled
                      ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200'
                      : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${externalNhisReferral.enabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        External NHIS Referral
                      </p>
                      <p className="text-sm text-gray-500">
                        Refer to an outside hospital (requires NHIS approval)
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* ===== Internal Referral ===== */}
          {!externalNhisReferral.enabled && (
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-900">
                Select Specialty Clinic for Internal Referral
              </label>

              <div className="relative">
                <SearchableSelect
                  value={
                    selectedSpecialtyInfo
                      ? `${selectedSpecialtyInfo.emoji} ${selectedSpecialtyInfo.label}`
                      : ''
                  }
                  onChange={(value) => {
                    // Map dropdown value back to specialty key
                    const matched = SPECIALTY_OPTIONS.find((s) =>
                      value.includes(s.label),
                    );
                    if (matched) {
                      onSelectedSpecialtyChange(matched.key);
                      onSpecialtyReferralDataChange({
                        clinicalFindings: '',
                        provisionalDiagnosis: '',
                        reason: '',
                        urgency: 'Routine',
                      });
                    } else {
                      onSelectedSpecialtyChange('');
                    }
                  }}
                  options={[
                    'Select a specialty clinic...',
                    ...SPECIALTY_OPTIONS.map((s) => `${s.emoji} ${s.label}`),
                  ]}
                  placeholder="Select a specialty clinic..."
                />
              </div>

              {/* Selected Clinic Badge */}
              {selectedSpecialtyInfo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <Stethoscope size={16} className="text-cyan-600" />
                  </div>
                  <span className="text-sm font-medium text-cyan-800">
                    {selectedSpecialtyInfo.emoji} {selectedSpecialtyInfo.label}{' '}
                    selected
                  </span>
                  <span className="text-cyan-500 text-xs">✓ Form below</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Render Active Forms */}
      <div className="space-y-4">
        {/* Internal Specialty Referral Form */}
        {selectedSpecialty && !externalNhisReferral.enabled && (
          <div className="p-6 rounded-xl border border-cyan-200 bg-white shadow-sm ring-1 ring-cyan-100 animate-in fade-in slide-in-from-top-2 space-y-5">
            <div className="flex items-center justify-between border-b border-cyan-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-50 p-2 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-cyan-600" />
                </div>
                <h4 className="font-semibold text-gray-900">
                  {selectedSpecialtyInfo?.label || selectedSpecialty} Department
                  Referral
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectedSpecialtyChange('')}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            {/* Clinical Findings */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-900">
                  Clinical Findings
                </label>
                <SavedNotesPopover
                  category="referral_notes"
                  subcategory="clinical_findings"
                  currentValue={specialtyReferralData.clinicalFindings}
                  onInsert={(content) =>
                    onSpecialtyReferralDataChange({
                      ...specialtyReferralData,
                      clinicalFindings: content,
                    })
                  }
                />
              </div>
              <textarea
                value={specialtyReferralData.clinicalFindings}
                onChange={(e) =>
                  onSpecialtyReferralDataChange({
                    ...specialtyReferralData,
                    clinicalFindings: e.target.value,
                  })
                }
                placeholder="Clinical examination findings..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Provisional Diagnosis */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-900">
                  Provisional Diagnosis
                </label>
                <SavedNotesPopover
                  category="referral_notes"
                  subcategory="provisional_diagnosis"
                  currentValue={specialtyReferralData.provisionalDiagnosis}
                  onInsert={(content) =>
                    onSpecialtyReferralDataChange({
                      ...specialtyReferralData,
                      provisionalDiagnosis: content,
                    })
                  }
                />
              </div>
              <textarea
                value={specialtyReferralData.provisionalDiagnosis}
                onChange={(e) =>
                  onSpecialtyReferralDataChange({
                    ...specialtyReferralData,
                    provisionalDiagnosis: e.target.value,
                  })
                }
                placeholder="Provisional diagnosis..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Reason for Referral */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-900">
                  Reason for Referral <span className="text-red-500">*</span>
                </label>
                <SavedNotesPopover
                  category="referral_notes"
                  subcategory="reason"
                  currentValue={specialtyReferralData.reason}
                  onInsert={(content) =>
                    onSpecialtyReferralDataChange({
                      ...specialtyReferralData,
                      reason: content,
                    })
                  }
                />
              </div>
              <textarea
                value={specialtyReferralData.reason}
                onChange={(e) =>
                  onSpecialtyReferralDataChange({
                    ...specialtyReferralData,
                    reason: e.target.value,
                  })
                }
                placeholder="Describe why you are referring this patient..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Urgency
              </label>
              <select
                value={specialtyReferralData.urgency}
                onChange={(e) =>
                  onSpecialtyReferralDataChange({
                    ...specialtyReferralData,
                    urgency: e.target.value as
                      | 'Routine'
                      | 'Urgent'
                      | 'Emergency',
                  })
                }
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>
        )}

        {/* External NHIS Referral Form */}
        {isNhisFeatureEnabled() && externalNhisReferral.enabled && (
          <div className="p-6 rounded-xl border border-amber-200 bg-white shadow-sm ring-1 ring-amber-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-100">
              <div className="bg-amber-50 p-2 rounded-lg">
                <ExternalLink className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  External NHIS Referral
                </h4>
                <p className="text-xs text-amber-600">
                  This will be sent to NHIS desk for approval
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onExternalNhisReferralChange((prev) => ({
                    ...prev,
                    enabled: false,
                  }))
                }
                className="ml-auto text-sm text-red-500 hover:text-red-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Destination Hospital */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Destination Hospital <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={externalNhisReferral.facilityName}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      facilityName: e.target.value,
                    }))
                  }
                  placeholder="Enter the name of the hospital"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Facility Address */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Facility Address
                </label>
                <input
                  type="text"
                  value={externalNhisReferral.facilityAddress}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      facilityAddress: e.target.value,
                    }))
                  }
                  placeholder="Enter address (optional)"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Receiving Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Receiving Doctor
                </label>
                <input
                  type="text"
                  value={externalNhisReferral.doctorName}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      doctorName: e.target.value,
                    }))
                  }
                  placeholder="Enter doctor name (optional)"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Urgency <span className="text-red-500">*</span>
                </label>
                <select
                  value={externalNhisReferral.urgency}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      urgency: e.target.value as
                        | 'Routine'
                        | 'Urgent'
                        | 'Emergency',
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              {/* Clinical Findings */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-900">
                    Clinical Findings <span className="text-red-500">*</span>
                  </label>
                  <SavedNotesPopover
                    category="referral_notes"
                    subcategory="clinical_findings"
                    currentValue={externalNhisReferral.clinicalFindings}
                    onInsert={(content) =>
                      onExternalNhisReferralChange((prev) => ({
                        ...prev,
                        clinicalFindings: content,
                      }))
                    }
                  />
                </div>
                <textarea
                  value={externalNhisReferral.clinicalFindings}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      clinicalFindings: e.target.value,
                    }))
                  }
                  placeholder="Enter clinical examination findings..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Investigation Findings */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-900">
                    Investigation Findings
                  </label>
                  <SavedNotesPopover
                    category="referral_notes"
                    subcategory="investigation_findings"
                    currentValue={externalNhisReferral.investigationFindings}
                    onInsert={(content) =>
                      onExternalNhisReferralChange((prev) => ({
                        ...prev,
                        investigationFindings: content,
                      }))
                    }
                  />
                </div>
                <textarea
                  value={externalNhisReferral.investigationFindings}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      investigationFindings: e.target.value,
                    }))
                  }
                  placeholder="Enter lab/radiology results (optional)..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Provisional Diagnosis */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-900">
                    Provisional Diagnosis{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <SavedNotesPopover
                    category="referral_notes"
                    subcategory="provisional_diagnosis"
                    currentValue={externalNhisReferral.provisionalDiagnosis}
                    onInsert={(content) =>
                      onExternalNhisReferralChange((prev) => ({
                        ...prev,
                        provisionalDiagnosis: content,
                      }))
                    }
                  />
                </div>
                <textarea
                  value={externalNhisReferral.provisionalDiagnosis}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      provisionalDiagnosis: e.target.value,
                    }))
                  }
                  placeholder="Enter provisional diagnosis..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Reason for Referral */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-900">
                    Reason for Referral <span className="text-red-500">*</span>
                  </label>
                  <SavedNotesPopover
                    category="referral_notes"
                    subcategory="reason"
                    currentValue={externalNhisReferral.reason}
                    onInsert={(content) =>
                      onExternalNhisReferralChange((prev) => ({
                        ...prev,
                        reason: content,
                      }))
                    }
                  />
                </div>
                <textarea
                  value={externalNhisReferral.reason}
                  onChange={(e) =>
                    onExternalNhisReferralChange((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Enter reason for referral..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickOrderModal;
