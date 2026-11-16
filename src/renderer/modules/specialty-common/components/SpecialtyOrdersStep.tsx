/**
 * =============================================================================
 * SPECIALTY ORDERS STEP COMPONENT
 * =============================================================================
 * Shared component for ordering services from specialty clinic consultations
 * (Dental, Ophthalmology, Physiotherapy). This mirrors the ConsultationWizard
 * OrdersStep but is tailored for specialty clinics.
 *
 * Features:
 * - Lab Tests ordering with clinical notes
 * - Radiology/Imaging ordering with indications
 * - Procedures ordering (specialty-specific)
 * - Prescriptions with full dosage configuration
 * - Internal Referrals to other specialty clinics
 * - NHIS workflow integration (auto-routes NHIS patients to approval queue)
 * =============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Pill,
  FlaskConical,
  Scan,
  Scissors,
  Share2,
  Plus,
  Settings,
  Building,
  ExternalLink,
  Search,
} from 'lucide-react';
import {
  Button,
  SearchableMultiSelect,
  CategorizedSearchableMultiSelect,
  SearchableOption,
  SearchableSelect,
} from '../../../components/ui';
import {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  ROUTE_OPTIONS,
  getDrugCategoryColor,
  DRUG_CATEGORIES,
  DrugCategory,
} from '../../pharmacy/dtos/pharmacy.dto';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  ProcedureOrderDTO,
  PrescriptionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';

// =============================================================================
// Types
// =============================================================================

export interface SpecialtyReferralState {
  selected: boolean;
  reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  referralType: 'internal' | 'external';
  externalFacility: string;
  externalDoctor: string;
  clinicalFindings: string;
  provisionalDiagnosis: string;
}

export type SpecialtyReferralsState = Record<string, SpecialtyReferralState>;

// All specialty clinics available for referral
export const SPECIALTY_CLINICS: { key: string; label: string }[] = [
  { key: 'dental', label: '🦷 Dental' },
  { key: 'ophthalmology', label: '👁️ Ophthalmology' },
  { key: 'physiotherapy', label: '🏃 Physiotherapy' },
  { key: 'cardiology', label: '❤️ Cardiology' },
  { key: 'orthopaedics', label: '🦴 Orthopaedics' },
  { key: 'dermatology', label: '🩺 Dermatology' },
  { key: 'urology', label: '🚰 Urology' },
  { key: 'gastroenterology', label: '🍽️ Gastroenterology' },
  { key: 'nephrology', label: '🫘 Nephrology' },
  { key: 'paediatrics', label: '👶 Paediatrics' },
  { key: 'neurosurgery', label: '🧠 Neurosurgery' },
  { key: 'neurology', label: '🧠 Neurology' },
  { key: 'neuropsychiatry', label: '💭 Neuropsychiatry' },
  { key: 'general_surgery', label: '🏥 General Surgery' },
  { key: 'gynaecology', label: '🤰 Gynaecology' },
  { key: 'oral_maxillofacial', label: '😷 Oral & Maxillofacial' },
  { key: 'pulmonology', label: '🫁 Pulmonology' },
  { key: 'endocrinology', label: '⚗️ Endocrinology' },
  { key: 'plastic_surgery', label: '✨ Plastic Surgery' },
  { key: 'ent', label: '👂 ENT (Ear, Nose, Throat)' },
];

interface SpecialtyOrdersStepProps {
  // Current specialty (to exclude from referral options)
  currentSpecialty: string;

  // Order state
  labOrders: LabOrderDTO[];
  radiologyOrders: RadiologyOrderDTO[];
  prescriptions: PrescriptionOrderDTO[];
  procedureOrders: ProcedureOrderDTO[];

  // Order handlers
  onLabOrdersChange: (orders: LabOrderDTO[]) => void;
  onRadiologyOrdersChange: (orders: RadiologyOrderDTO[]) => void;
  onPrescriptionsChange: (prescriptions: PrescriptionOrderDTO[]) => void;
  onProcedureOrdersChange: (orders: ProcedureOrderDTO[]) => void;

  // Referrals
  specialtyReferrals: SpecialtyReferralsState;
  onSpecialtyReferralsChange: React.Dispatch<
    React.SetStateAction<SpecialtyReferralsState>
  >;

  // Catalogues (passed from parent hook calls)
  labTestOptions: SearchableOption[];
  imagingOptions: SearchableOption[];
  drugOptions: SearchableOption[];
  procedureOptions: SearchableOption[];
  isLoadingImaging?: boolean;

  // Clinical context for prefill
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
  selectedDiagnoses?: { code: string; title: string }[];

  // Specialty-specific procedure options (if different from general)
  specialtyProcedureOptions?: SearchableOption[];

  // Patient info for referral context
  patientName?: string;

  // Read-only mode
  readOnly?: boolean;
}

// =============================================================================
// Default referral state factory
// =============================================================================

export function createDefaultReferralState(): SpecialtyReferralState {
  return {
    selected: false,
    reason: '',
    urgency: 'Routine',
    referralType: 'internal',
    externalFacility: '',
    externalDoctor: '',
    clinicalFindings: '',
    provisionalDiagnosis: '',
  };
}

export function createDefaultSpecialtyReferrals(): SpecialtyReferralsState {
  return Object.fromEntries(
    SPECIALTY_CLINICS.map((c) => [c.key, createDefaultReferralState()]),
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SpecialtyOrdersStep({
  currentSpecialty,
  labOrders,
  radiologyOrders,
  prescriptions,
  procedureOrders,
  onLabOrdersChange,
  onRadiologyOrdersChange,
  onPrescriptionsChange,
  onProcedureOrdersChange,
  specialtyReferrals,
  onSpecialtyReferralsChange,
  labTestOptions,
  imagingOptions,
  drugOptions,
  procedureOptions,
  isLoadingImaging = false,
  clinicalFindings = '',
  provisionalDiagnosis = '',
  selectedDiagnoses = [],
  specialtyProcedureOptions,
  patientName,
  readOnly = false,
}: SpecialtyOrdersStepProps) {
  // Determine which procedure options to use
  const effectiveProcedureOptions =
    specialtyProcedureOptions || procedureOptions;

  // Get referral count
  const referralCount = Object.values(specialtyReferrals).filter(
    (ref) => ref.selected,
  ).length;

  // Active tab state
  const [activeOrderTab, setActiveOrderTab] = useState<
    'rx' | 'lab' | 'imaging' | 'procedures' | 'referrals'
  >('rx');

  // Pending drugs state (selected but not configured)
  const [pendingDrugIds, setPendingDrugIds] = useState<string[]>([]);

  // Multi-drug prescription modal state
  const [multiPrescriptionModal, setMultiPrescriptionModal] = useState<{
    isOpen: boolean;
    drugConfigs: Array<{
      drugId: string;
      dosage: string;
      customDosage: string;
      useCustomDosage: boolean;
      frequency: string;
      duration: string;
      route: string;
      quantity: number;
      instructions: string;
    }>;
  }>({
    isOpen: false,
    drugConfigs: [],
  });

  // Tab configuration
  const orderTabs = useMemo(
    () => [
      {
        id: 'rx',
        label: 'Prescriptions',
        icon: <Pill size={16} />,
        count: prescriptions.length,
        color: 'orange',
      },
      {
        id: 'lab',
        label: 'Lab Tests',
        icon: <FlaskConical size={16} />,
        count: labOrders.length,
        color: 'emerald',
      },
      {
        id: 'imaging',
        label: 'Imaging',
        icon: <Scan size={16} />,
        count: radiologyOrders.length,
        color: 'blue',
      },
      {
        id: 'procedures',
        label: 'Procedures',
        icon: <Scissors size={16} />,
        count: procedureOrders.length,
        color: 'purple',
      },
      {
        id: 'referrals',
        label: 'Referrals',
        icon: <Share2 size={16} />,
        count: referralCount,
        color: 'cyan',
      },
    ],
    [
      prescriptions.length,
      labOrders.length,
      radiologyOrders.length,
      procedureOrders.length,
      referralCount,
    ],
  );

  // Selected IDs
  const selectedLabIds = labOrders.map((o) => o.test_id);
  const selectedImagingIds = radiologyOrders.map((o) => o.imaging_id);
  const selectedDrugIds = prescriptions
    .map((p) => p.drug_id)
    .filter((id): id is string => !!id);
  const selectedProcedureIds = procedureOrders.map((o) => o.procedure_id);
  const allSelectedDrugIds = [...selectedDrugIds, ...pendingDrugIds];

  // Prefill helper
  const getPrefillDiagnosis = useCallback(() => {
    return selectedDiagnoses.length > 0
      ? selectedDiagnoses.map((d) => d.title)
      : [];
  }, [selectedDiagnoses]);

  // Drug toggle handler
  const toggleDrug = useCallback(
    (drugId: string) => {
      if (readOnly) return;
      if (selectedDrugIds.includes(drugId)) {
        onPrescriptionsChange(
          prescriptions.filter((p) => p.drug_id !== drugId),
        );
      } else if (pendingDrugIds.includes(drugId)) {
        setPendingDrugIds(pendingDrugIds.filter((id) => id !== drugId));
      } else {
        setPendingDrugIds([...pendingDrugIds, drugId]);
      }
    },
    [
      readOnly,
      selectedDrugIds,
      pendingDrugIds,
      prescriptions,
      onPrescriptionsChange,
    ],
  );

  // Open multi-drug config modal
  const openMultiDrugModal = useCallback(() => {
    setMultiPrescriptionModal({
      isOpen: true,
      drugConfigs: pendingDrugIds.map((drugId) => ({
        drugId,
        dosage: '',
        customDosage: '',
        useCustomDosage: false,
        frequency: '',
        duration: '',
        route: 'Oral',
        quantity: 1,
        instructions: '',
      })),
    });
  }, [pendingDrugIds]);

  // Update drug config in modal
  const updateDrugConfig = useCallback(
    (index: number, field: string, value: string | number | boolean) => {
      setMultiPrescriptionModal((prev) => ({
        ...prev,
        drugConfigs: prev.drugConfigs.map((config, i) =>
          i === index ? { ...config, [field]: value } : config,
        ),
      }));
    },
    [],
  );

  // Remove drug from modal
  const removeDrugFromModal = useCallback((drugId: string) => {
    setMultiPrescriptionModal((prev) => ({
      ...prev,
      drugConfigs: prev.drugConfigs.filter((c) => c.drugId !== drugId),
    }));
    setPendingDrugIds((prev) => prev.filter((id) => id !== drugId));
  }, []);

  // Confirm multiple prescriptions
  const confirmMultiplePrescriptions = useCallback(() => {
    const diagnosisPrefill = getPrefillDiagnosis();

    const newPrescriptions = multiPrescriptionModal.drugConfigs
      .filter((config) => {
        const hasValidDosage = config.useCustomDosage
          ? config.customDosage
          : config.dosage;
        return hasValidDosage && config.frequency && config.duration;
      })
      .map((config) => {
        const drug = drugOptions.find((d) => d.id === config.drugId);
        const finalDosage = config.useCustomDosage
          ? config.customDosage
          : config.dosage;
        return {
          drug_id: config.drugId,
          drug_name: drug?.name || 'Unknown Drug',
          dosage: finalDosage,
          frequency: config.frequency,
          duration: config.duration,
          route: config.route,
          quantity_prescribed: config.quantity,
          instructions: config.instructions,
          price: drug?.price,
          clinical_notes: clinicalFindings,
          diagnosis: diagnosisPrefill,
        };
      });

    if (newPrescriptions.length > 0) {
      onPrescriptionsChange([...prescriptions, ...newPrescriptions]);
    }

    setPendingDrugIds([]);
    setMultiPrescriptionModal({ isOpen: false, drugConfigs: [] });
  }, [
    multiPrescriptionModal.drugConfigs,
    drugOptions,
    clinicalFindings,
    getPrefillDiagnosis,
    prescriptions,
    onPrescriptionsChange,
  ]);

  // Available referral options (all clinics, excluding current specialty)
  const availableReferralOptions = useMemo(
    () => SPECIALTY_CLINICS.filter((c) => c.key !== currentSpecialty),
    [currentSpecialty],
  );

  // Clinics not yet selected (for the add-referral dropdown)
  const unselectedClinicOptions = useMemo(
    () =>
      availableReferralOptions
        .filter((c) => !specialtyReferrals[c.key]?.selected)
        .map((c) => c.label),
    [availableReferralOptions, specialtyReferrals],
  );

  // Clinics that are selected (to show their forms)
  const selectedReferralClinics = useMemo(
    () =>
      availableReferralOptions.filter(
        (c) => specialtyReferrals[c.key]?.selected,
      ),
    [availableReferralOptions, specialtyReferrals],
  );

  return (
    <div className="space-y-6">
      {/* Order Type Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 min-w-max px-1">
          {orderTabs.map((tab) => {
            const isActive = activeOrderTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveOrderTab(tab.id as typeof activeOrderTab)
                }
                className={`
                  group flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all border-b-2
                  ${
                    isActive
                      ? 'border-green-600 text-green-700 bg-green-50/30'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span
                  className={`transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                >
                  {tab.icon}
                </span>
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1.5 ${
                      isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prescriptions Tab */}
      {activeOrderTab === 'rx' && (
        <div className="space-y-4">
          <SearchableMultiSelect
            options={drugOptions}
            selectedIds={allSelectedDrugIds}
            onToggleSelect={toggleDrug}
            placeholder="Search medications by name or code..."
            categoryColorFn={(cat) =>
              DRUG_CATEGORIES.includes(cat as DrugCategory)
                ? getDrugCategoryColor(cat as DrugCategory)
                : 'bg-gray-100 text-gray-700'
            }
          />

          {/* Pending Drugs */}
          {pendingDrugIds.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <Pill className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="font-medium text-orange-800">
                    {pendingDrugIds.length} medication
                    {pendingDrugIds.length > 1 ? 's' : ''} pending configuration
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={openMultiDrugModal}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Settings size={16} className="mr-1.5" />
                  Configure Dosage
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingDrugIds.map((drugId) => {
                  const drug = drugOptions.find((d) => d.id === drugId);
                  return (
                    <span
                      key={drugId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-orange-200 rounded-lg text-sm text-orange-800"
                    >
                      {drug?.name || drugId}
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDrugIds(
                            pendingDrugIds.filter((id) => id !== drugId),
                          )
                        }
                        className="p-0.5 hover:bg-orange-100 rounded"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Prescriptions */}
          {prescriptions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Medications:
              </p>
              {prescriptions.map((rx, idx) => {
                const drug = drugOptions.find((d) => d.id === rx.drug_id);
                return (
                  <div
                    key={`${rx.drug_id || rx.drug_name || 'rx'}-${idx}`}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {drug?.name || rx.drug_name}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {rx.dosage} • {rx.frequency} • {rx.duration}
                      </span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrescriptionsChange(
                            prescriptions.filter((_, pIdx) => pIdx !== idx),
                          )
                        }
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lab Tests Tab */}
      {activeOrderTab === 'lab' && (
        <div className="space-y-4">
          <CategorizedSearchableMultiSelect
            options={labTestOptions}
            selectedIds={selectedLabIds}
            onToggleSelect={(testId: string) => {
              if (readOnly) return;
              const test = labTestOptions.find((t) => t.id === testId);
              if (selectedLabIds.includes(testId)) {
                onLabOrdersChange(
                  labOrders.filter((o) => o.test_id !== testId),
                );
              } else {
                onLabOrdersChange([
                  ...labOrders,
                  {
                    test_id: testId,
                    priority: 'Normal',
                    test_name: test?.name,
                    test_code: test?.code,
                    clinical_notes: clinicalFindings,
                    diagnosis: getPrefillDiagnosis(),
                  },
                ]);
              }
            }}
            placeholder="Search lab tests by name, code, or category..."
            allCategoriesLabel="All Tests"
          />

          {/* Selected Lab Tests */}
          {labOrders.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Lab Tests:
              </p>
              {labOrders.map((order, idx) => {
                const test = labTestOptions.find((t) => t.id === order.test_id);
                return (
                  <div
                    key={`${order.test_id}-${idx}`}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {test?.name || order.test_name || order.test_id}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onLabOrdersChange(
                              labOrders.filter((_, oIdx) => oIdx !== idx),
                            )
                          }
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={order.clinical_notes || ''}
                      onChange={(e) =>
                        onLabOrdersChange(
                          labOrders.map((o, oIdx) =>
                            oIdx === idx
                              ? { ...o, clinical_notes: e.target.value }
                              : o,
                          ),
                        )
                      }
                      placeholder="Clinical notes (optional) - reason for test, relevant history..."
                      rows={2}
                      disabled={readOnly}
                      className="w-full mt-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Imaging Tab */}
      {activeOrderTab === 'imaging' && (
        <div className="space-y-4">
          {isLoadingImaging ? (
            <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm">Loading imaging catalogue...</span>
            </div>
          ) : (
          <CategorizedSearchableMultiSelect
            options={imagingOptions}
            selectedIds={selectedImagingIds}
            onToggleSelect={(imagingId: string) => {
              if (readOnly) return;
              if (selectedImagingIds.includes(imagingId)) {
                onRadiologyOrdersChange(
                  radiologyOrders.filter((o) => o.imaging_id !== imagingId),
                );
              } else {
                onRadiologyOrdersChange([
                  ...radiologyOrders,
                  {
                    imaging_id: imagingId,
                    priority: 'Normal',
                    clinical_indication: clinicalFindings,
                    diagnosis: getPrefillDiagnosis(),
                  },
                ]);
              }
            }}
            placeholder="Search imaging studies by name, code, or modality..."
            allCategoriesLabel="All Modalities"
          />
          )}

          {/* Selected Imaging */}
          {radiologyOrders.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Imaging Studies:
              </p>
              {radiologyOrders.map((order, idx) => {
                const imaging = imagingOptions.find(
                  (i) => i.id === order.imaging_id,
                );
                return (
                  <div
                    key={`${order.imaging_id}-${idx}`}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {imaging?.name || order.imaging_id}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onRadiologyOrdersChange(
                              radiologyOrders.filter((_, oIdx) => oIdx !== idx),
                            )
                          }
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={order.clinical_indication || ''}
                      onChange={(e) =>
                        onRadiologyOrdersChange(
                          radiologyOrders.map((o, oIdx) =>
                            oIdx === idx
                              ? { ...o, clinical_indication: e.target.value }
                              : o,
                          ),
                        )
                      }
                      placeholder="Clinical indication (optional) - reason for study..."
                      rows={2}
                      disabled={readOnly}
                      className="w-full mt-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Procedures Tab */}
      {activeOrderTab === 'procedures' && (
        <div className="space-y-4">
          <CategorizedSearchableMultiSelect
            options={effectiveProcedureOptions}
            selectedIds={selectedProcedureIds}
            onToggleSelect={(procedureId: string) => {
              if (readOnly) return;
              const proc = effectiveProcedureOptions.find(
                (p) => p.id === procedureId,
              );
              if (selectedProcedureIds.includes(procedureId)) {
                onProcedureOrdersChange(
                  procedureOrders.filter((o) => o.procedure_id !== procedureId),
                );
              } else {
                onProcedureOrdersChange([
                  ...procedureOrders,
                  {
                    procedure_id: procedureId,
                    procedure_name: proc?.name || '',
                    procedure_type: proc?.category || 'General',
                    priority: 'Normal',
                    price: proc?.price,
                    clinical_notes: clinicalFindings,
                    diagnosis: getPrefillDiagnosis(),
                  },
                ]);
              }
            }}
            placeholder="Search procedures by name, code, or type..."
            allCategoriesLabel="All Types"
          />

          {/* Selected Procedures */}
          {procedureOrders.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected Procedures:
              </p>
              {procedureOrders.map((proc, idx) => (
                <div
                  key={`${proc.procedure_id}-${idx}`}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {proc.procedure_name}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {proc.procedure_type}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onProcedureOrdersChange(
                          procedureOrders.filter((_, pIdx) => pIdx !== idx),
                        )
                      }
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referrals Tab */}
      {activeOrderTab === 'referrals' && (
        <div className="space-y-6">
          {/* Add Referral Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-cyan-600" />
              Referral to Specialty Clinic
            </h3>
            {patientName && (
              <p className="text-sm text-gray-500 mb-4">
                Patient:{' '}
                <span className="font-medium text-gray-700">{patientName}</span>
              </p>
            )}
            {!patientName && <div className="mb-4" />}

            {!readOnly && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Add Referral — Select Specialty Clinic
                </label>
                <SearchableSelect
                  value=""
                  onChange={(label) => {
                    const clinic = SPECIALTY_CLINICS.find(
                      (c) => c.label === label,
                    );
                    if (!clinic) return;
                    onSpecialtyReferralsChange((prev) => ({
                      ...prev,
                      [clinic.key]: {
                        ...(prev[clinic.key] || createDefaultReferralState()),
                        selected: true,
                        referralType: 'internal',
                        clinicalFindings,
                        provisionalDiagnosis:
                          selectedDiagnoses.length > 0
                            ? selectedDiagnoses.map((d) => d.title).join(', ')
                            : provisionalDiagnosis,
                      },
                    }));
                  }}
                  options={[
                    'Select a specialty clinic...',
                    ...unselectedClinicOptions,
                  ]}
                  placeholder="Search specialty clinics..."
                />
                {unselectedClinicOptions.length === 0 &&
                  availableReferralOptions.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ All available specialty clinics have been added
                    </p>
                  )}
              </div>
            )}
          </div>

          {/* Selected Referral Forms */}
          {selectedReferralClinics.map(({ key, label }) => {
            const ref = specialtyReferrals[key] || createDefaultReferralState();
            return (
              <div
                key={key}
                className="p-6 rounded-xl border border-cyan-200 bg-white shadow-sm ring-1 ring-cyan-100"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="bg-cyan-50 p-2 rounded-lg">
                    <Share2 size={16} className="text-cyan-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    {label} Referral
                  </h4>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onSpecialtyReferralsChange((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], selected: false },
                        }))
                      }
                      className="ml-auto text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Internal / External Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Referral Type
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          onSpecialtyReferralsChange((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], referralType: 'internal' },
                          }))
                        }
                        className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          ref.referralType === 'internal'
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Building size={15} />
                        Internal (Within Hospital)
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          onSpecialtyReferralsChange((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], referralType: 'external' },
                          }))
                        }
                        className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          ref.referralType === 'external'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <ExternalLink size={15} />
                        External (NHIS / Outside Hospital)
                      </button>
                    </div>
                  </div>

                  {/* External-only fields */}
                  {ref.referralType === 'external' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          Receiving Facility / Hospital
                        </label>
                        <input
                          type="text"
                          value={ref.externalFacility}
                          onChange={(e) =>
                            onSpecialtyReferralsChange((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                externalFacility: e.target.value,
                              },
                            }))
                          }
                          placeholder="Name of referring hospital..."
                          disabled={readOnly}
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1.5">
                          Receiving Doctor / Consultant
                        </label>
                        <input
                          type="text"
                          value={ref.externalDoctor}
                          onChange={(e) =>
                            onSpecialtyReferralsChange((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                externalDoctor: e.target.value,
                              },
                            }))
                          }
                          placeholder="Doctor or consultant name (optional)..."
                          disabled={readOnly}
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Clinical Findings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Clinical Findings
                    </label>
                    <textarea
                      value={ref.clinicalFindings}
                      onChange={(e) =>
                        onSpecialtyReferralsChange((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            clinicalFindings: e.target.value,
                          },
                        }))
                      }
                      placeholder="Clinical examination findings..."
                      rows={3}
                      disabled={readOnly}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Provisional Diagnosis */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Provisional Diagnosis
                    </label>
                    <textarea
                      value={ref.provisionalDiagnosis}
                      onChange={(e) =>
                        onSpecialtyReferralsChange((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            provisionalDiagnosis: e.target.value,
                          },
                        }))
                      }
                      placeholder="Provisional diagnosis..."
                      rows={2}
                      disabled={readOnly}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Reason for Referral */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Reason for Referral{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={ref.reason}
                      onChange={(e) =>
                        onSpecialtyReferralsChange((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], reason: e.target.value },
                        }))
                      }
                      placeholder="Describe why you are referring this patient..."
                      rows={3}
                      disabled={readOnly}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Urgency
                    </label>
                    <div className="flex gap-3">
                      {(['Routine', 'Urgent', 'Emergency'] as const).map(
                        (level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              if (readOnly) return;
                              onSpecialtyReferralsChange((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], urgency: level },
                              }));
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              ref.urgency === level
                                ? level === 'Emergency'
                                  ? 'bg-red-500 text-white'
                                  : level === 'Urgent'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {referralCount === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Share2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>
                Use the dropdown above to add a referral to a specialty clinic
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multi-Drug Configuration Modal */}
      {multiPrescriptionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Configure Medications
              </h3>
              <button
                onClick={() =>
                  setMultiPrescriptionModal({ isOpen: false, drugConfigs: [] })
                }
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {multiPrescriptionModal.drugConfigs.map((config, index) => {
                const drug = drugOptions.find((d) => d.id === config.drugId);
                return (
                  <div
                    key={config.drugId}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        {drug?.name || config.drugId}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeDrugFromModal(config.drugId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Dosage
                        </label>
                        {config.useCustomDosage ? (
                          <input
                            type="text"
                            value={config.customDosage}
                            onChange={(e) =>
                              updateDrugConfig(
                                index,
                                'customDosage',
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Custom dosage..."
                          />
                        ) : (
                          <SearchableSelect
                            value={config.dosage}
                            onChange={(v) =>
                              updateDrugConfig(index, 'dosage', v)
                            }
                            options={DOSAGE_OPTIONS}
                            placeholder="Select..."
                          />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            updateDrugConfig(
                              index,
                              'useCustomDosage',
                              !config.useCustomDosage,
                            )
                          }
                          className="text-xs text-blue-600 mt-1"
                        >
                          {config.useCustomDosage
                            ? 'Use preset'
                            : 'Custom dosage'}
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Frequency
                        </label>
                        <SearchableSelect
                          value={config.frequency}
                          onChange={(v) =>
                            updateDrugConfig(index, 'frequency', v)
                          }
                          options={FREQUENCY_OPTIONS}
                          placeholder="Select..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Duration
                        </label>
                        <SearchableSelect
                          value={config.duration}
                          onChange={(v) =>
                            updateDrugConfig(index, 'duration', v)
                          }
                          options={DURATION_OPTIONS}
                          placeholder="Select..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Route
                        </label>
                        <SearchableSelect
                          value={config.route}
                          onChange={(v) => updateDrugConfig(index, 'route', v)}
                          options={ROUTE_OPTIONS}
                          placeholder="Select..."
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Instructions
                      </label>
                      <input
                        type="text"
                        value={config.instructions}
                        onChange={(e) =>
                          updateDrugConfig(
                            index,
                            'instructions',
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Special instructions (optional)..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setMultiPrescriptionModal({ isOpen: false, drugConfigs: [] })
                }
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmMultiplePrescriptions}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Confirm Prescriptions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
