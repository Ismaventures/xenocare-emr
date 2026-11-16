// =============================================================================
// AeConsultationWizard — Comprehensive Emergency Consultation & Orders
// Modern SOAP + Integrated Clinical Orders for A&E encounters
// Inspired by InPatient WardRoundNoteForm + ConsultationWizard design
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Scan,
  Pill,
  Scissors,
  FileText,
  Search,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Wind,
  Brain,
  Eye,
  Bed,
  Send,
  Building,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../api/supabaseClient';
import { useToast } from '../../../../components/ui/Toast';
import { useAeTriage, useAeVitals, useSubmitAeOrders } from '../../hooks/useAe';
import {
  useLabTestCatalogue,
  useImagingCatalogue,
  useDrugCatalogue,
  useProcedureCatalogue,
  useWardsCatalogue,
} from '../../../clinical-consultation/hooks/useConsultation';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
  ProcedureOrderDTO,
  AdmissionOrderDTO,
} from '../../../clinical-consultation/dtos/consultation.dto';
import type { Priority } from '../../../../types/database.types';
import {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  ROUTE_OPTIONS,
} from '../../../pharmacy/dtos/pharmacy.dto';
import { SelectWithOther } from '../../../shared/components/SelectWithOther';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import { resolvePatientVarcharId } from '../../../../lib/patient-id-resolver';

// =============================================================================
// Types
// =============================================================================

interface AeConsultationWizardProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

type SoapSection = 'subjective' | 'objective' | 'assessment' | 'plan-orders';
type OrderCategory = 'lab' | 'imaging' | 'medication' | 'procedure';

interface DiagnosisEntry {
  code: string;
  description: string;
  is_primary: boolean;
}

interface PrescriptionPopup {
  isOpen: boolean;
  drugId: string;
  drugName: string;
  drugPrice: number;
  priority: Priority;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  instructions: string;
}

interface InternalReferral {
  specialty: string;
  reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  clinicalFindings: string;
  provisionalDiagnosis: string;
}

// Specialty clinics for referrals
const SPECIALTY_CLINICS = [
  'Dental',
  'Ophthalmology',
  'Physiotherapy',
  'Cardiology',
  'Orthopaedics',
  'Dermatology',
  'Urology',
  'Gastroenterology',
  'Nephrology',
  'Paediatrics',
  'Neurosurgery',
  'Neurology',
  'Neuropsychiatry',
  'General Surgery',
  'Gynaecology',
  'Oral & Maxillofacial',
  'Pulmonology',
  'Endocrinology',
  'Plastic Surgery',
  'ENT (Ear, Nose & Throat)',
];

const REASSESS_OPTIONS = [
  '15 min',
  '30 min',
  '1 hour',
  '2 hours',
  '4 hours',
  'As needed',
];

// =============================================================================
// Section Configuration
// =============================================================================

const SECTIONS: {
  key: SoapSection;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    key: 'subjective',
    label: 'Subjective',
    icon: ClipboardList,
    color: 'blue',
  },
  { key: 'objective', label: 'Objective', icon: Stethoscope, color: 'emerald' },
  { key: 'assessment', label: 'Assessment', icon: Brain, color: 'purple' },
  {
    key: 'plan-orders',
    label: 'Plan & Orders',
    icon: FlaskConical,
    color: 'red',
  },
];

const ORDER_CATEGORIES: {
  value: OrderCategory;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: 'lab', label: 'Lab Tests', icon: FlaskConical },
  { value: 'imaging', label: 'Imaging', icon: Scan },
  { value: 'medication', label: 'Medications', icon: Pill },
  { value: 'procedure', label: 'Procedures', icon: Scissors },
];

// =============================================================================
// Component
// =============================================================================

export default function AeConsultationWizard({
  encounterId,
  patientId,
  onSuccess,
}: AeConsultationWizardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const submitOrders = useSubmitAeOrders();

  // Context data
  const { data: triage } = useAeTriage(encounterId);
  const { data: vitals = [] } = useAeVitals(encounterId);
  const latestVitals = vitals[0];

  // Catalogues
  const { data: labTests = [], isLoading: labsLoading } = useLabTestCatalogue();
  const { data: imagingItems = [], isLoading: imagingLoading } =
    useImagingCatalogue();
  const { data: drugs = [], isLoading: drugsLoading } = useDrugCatalogue();
  const { data: procedures = [], isLoading: proceduresLoading } =
    useProcedureCatalogue();
  const { data: wards = [] } = useWardsCatalogue();

  // Form State
  const [activeSection, setActiveSection] = useState<SoapSection>('subjective');
  const [saving, setSaving] = useState(false);

  // SOAP fields
  const [hpi, setHpi] = useState('');
  const [pmh, setPmh] = useState('');
  const [medicationHistory, setMedicationHistory] = useState('');
  const [allergyHistory, setAllergyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [focusedExam, setFocusedExam] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [differentials, setDifferentials] = useState<DiagnosisEntry[]>([]);
  const [clinicalImpression, setClinicalImpression] = useState('');
  const [planText, setPlanText] = useState('');
  const [reassessInterval, setReassessInterval] = useState('30 min');

  // Orders State
  const [labOrders, setLabOrders] = useState<LabOrderDTO[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrderDTO[]>(
    [],
  );
  const [prescriptionOrders, setPrescriptionOrders] = useState<
    PrescriptionOrderDTO[]
  >([]);
  const [procedureOrders, setProcedureOrders] = useState<ProcedureOrderDTO[]>(
    [],
  );
  const [admissionOrder, setAdmissionOrder] =
    useState<AdmissionOrderDTO | null>(null);

  // Order UI state
  const [selectedCategory, setSelectedCategory] =
    useState<OrderCategory>('lab');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddOrder, setShowAddOrder] = useState(true);

  // Prescription popup
  const [rxPopup, setRxPopup] = useState<PrescriptionPopup>({
    isOpen: false,
    drugId: '',
    drugName: '',
    drugPrice: 0,
    priority: 'Urgent',
    dosage: '',
    frequency: '',
    duration: '',
    route: '',
    quantity: 1,
    instructions: '',
  });

  // Referrals
  const [showReferrals, setShowReferrals] = useState(false);
  const [internalReferrals, setInternalReferrals] = useState<
    InternalReferral[]
  >([]);
  const [newReferralSpecialty, setNewReferralSpecialty] = useState('');

  // Admission
  const [showAdmission, setShowAdmission] = useState(false);

  // ==========================================================================
  // Catalogue search
  // ==========================================================================

  const getCatalogueItems = useMemo(() => {
    let items: {
      id: string;
      name: string;
      price: number;
      category?: string;
    }[] = [];
    switch (selectedCategory) {
      case 'lab':
        items = labTests.map((t: any) => ({
          id: t.test_id || t.id,
          name: t.test_name || t.name,
          price: t.price || 0,
          category: t.category,
        }));
        break;
      case 'imaging':
        items = imagingItems.map((i: any) => ({
          id: i.imaging_id || i.id,
          name: i.imaging_name || i.name || i.examination_name,
          price: i.price || 0,
          category: i.imaging_type || i.modality,
        }));
        break;
      case 'medication':
        items = drugs.map((d: any) => ({
          id: d.drug_id || d.id,
          name: d.drug_name || d.name,
          price: d.price || d.unit_price || 0,
          category: d.category || d.dosage_form,
        }));
        break;
      case 'procedure':
        items = procedures.map((p: any) => ({
          id: p.procedure_id || p.id,
          name: p.procedure_name || p.name,
          price: p.price || 0,
          category: p.procedure_type || p.category,
        }));
        break;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [
    selectedCategory,
    searchQuery,
    labTests,
    imagingItems,
    drugs,
    procedures,
  ]);

  const isCatalogueLoading =
    (selectedCategory === 'lab' && labsLoading) ||
    (selectedCategory === 'imaging' && imagingLoading) ||
    (selectedCategory === 'medication' && drugsLoading) ||
    (selectedCategory === 'procedure' && proceduresLoading);

  // ==========================================================================
  // Order handlers
  // ==========================================================================

  const totalOrders =
    labOrders.length +
    radiologyOrders.length +
    prescriptionOrders.length +
    procedureOrders.length;

  const addFromCatalogue = useCallback(
    (
      item: { id: string; name: string; price: number },
      priority: Priority = 'Urgent',
    ) => {
      switch (selectedCategory) {
        case 'lab':
          if (labOrders.some((o) => o.test_id === item.id)) return;
          setLabOrders((prev) => [
            ...prev,
            {
              test_id: item.id,
              test_name: item.name,
              priority,
              clinical_notes: '',
            },
          ]);
          break;
        case 'imaging':
          if (radiologyOrders.some((o) => o.imaging_id === item.id)) return;
          setRadiologyOrders((prev) => [
            ...prev,
            { imaging_id: item.id, priority, clinical_indication: '' },
          ]);
          break;
        case 'medication':
          setRxPopup({
            isOpen: true,
            drugId: item.id,
            drugName: item.name,
            drugPrice: item.price,
            priority,
            dosage: '',
            frequency: '',
            duration: '',
            route: '',
            quantity: 1,
            instructions: '',
          });
          break;
        case 'procedure':
          if (procedureOrders.some((o) => o.procedure_id === item.id)) return;
          setProcedureOrders((prev) => [
            ...prev,
            {
              procedure_id: item.id,
              procedure_name: item.name,
              procedure_type: '',
              priority,
              price: item.price,
            },
          ]);
          break;
      }
      setSearchQuery('');
    },
    [selectedCategory, labOrders, radiologyOrders, procedureOrders],
  );

  const confirmPrescription = useCallback(() => {
    const {
      drugId,
      drugName,
      drugPrice,
      priority,
      dosage,
      frequency,
      duration,
      route,
      quantity,
      instructions,
    } = rxPopup;
    if (!dosage || !frequency) return;
    setPrescriptionOrders((prev) => [
      ...prev,
      {
        drug_id: drugId,
        drug_name: drugName,
        dosage,
        frequency,
        duration: duration || undefined,
        route: route || undefined,
        quantity_prescribed: quantity,
        instructions: instructions || undefined,
        price: drugPrice,
      },
    ]);
    setRxPopup((prev) => ({ ...prev, isOpen: false }));
    setSearchQuery('');
  }, [rxPopup]);

  const removeLabOrder = (idx: number) =>
    setLabOrders((prev) => prev.filter((_, i) => i !== idx));
  const removeRadiologyOrder = (idx: number) =>
    setRadiologyOrders((prev) => prev.filter((_, i) => i !== idx));
  const removePrescription = (idx: number) =>
    setPrescriptionOrders((prev) => prev.filter((_, i) => i !== idx));
  const removeProcedureOrder = (idx: number) =>
    setProcedureOrders((prev) => prev.filter((_, i) => i !== idx));

  const addReferral = () => {
    if (
      !newReferralSpecialty ||
      internalReferrals.some((r) => r.specialty === newReferralSpecialty)
    )
      return;
    setInternalReferrals((prev) => [
      ...prev,
      {
        specialty: newReferralSpecialty,
        reason: '',
        urgency: 'Urgent',
        clinicalFindings: '',
        provisionalDiagnosis: '',
      },
    ]);
    setNewReferralSpecialty('');
  };

  // ==========================================================================
  // Submit
  // ==========================================================================

  const handleSubmit = async () => {
    if (!hpi.trim()) {
      showToast({
        message: 'Please enter the History of Presenting Illness',
        type: 'error',
      });
      setActiveSection('subjective');
      return;
    }
    setSaving(true);
    try {
      // 1. Get staff ID
      const { data: authData } = await supabase.auth.getUser();
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('email', authData?.user?.email ?? '')
        .maybeSingle();

      // 2. Resolve patient VARCHAR id for the consultations FK
      const resolvedPatientId = await resolvePatientVarcharId(patientId);

      // 3. Build and save consultation
      const soapNote = [
        `**HPI:** ${hpi}`,
        pmh ? `**PMH:** ${pmh}` : '',
        medicationHistory ? `**Medications:** ${medicationHistory}` : '',
        allergyHistory ? `**Allergies:** ${allergyHistory}` : '',
        socialHistory ? `**Social:** ${socialHistory}` : '',
        `**Exam:** ${focusedExam}`,
        `**Assessment:** ${clinicalImpression}`,
        `**Working Dx:** ${workingDiagnosis}`,
        differentials.length > 0
          ? `**Differentials:** ${differentials.map((d) => `${d.code} ${d.description}`).join(', ')}`
          : '',
        `**Plan:** ${planText}`,
        reassessInterval ? `**Reassess:** ${reassessInterval}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const consultationPayload = {
        encounter_id: encounterId,
        patient_id: resolvedPatientId,
        doctor_id: staffRow?.staff_id ?? null,
        complaints: hpi.substring(0, 500),
        subjective: [
          `HPI: ${hpi}`,
          pmh ? `PMH: ${pmh}` : '',
          medicationHistory ? `Medications: ${medicationHistory}` : '',
          allergyHistory ? `Allergies: ${allergyHistory}` : '',
          socialHistory ? `Social History: ${socialHistory}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        history_of_present_illness: hpi,
        past_medical_history: pmh || null,
        objective: focusedExam || null,
        examination_findings: focusedExam || null,
        assessment: clinicalImpression || null,
        diagnosis_text: workingDiagnosis || null,
        differential_diagnosis:
          differentials.length > 0
            ? differentials.map((d: any) => `${d.code} ${d.description}`)
            : null,
        plan: planText || null,
        treatment_plan: planText || null,
        notes: soapNote,
        clinical_notes: soapNote,
        status: 'Completed',
      };

      // Atomic upsert: update if consultation exists for this encounter, else insert.
      // First try to find existing consultation to decide update vs insert.
      const { data: existingConsultation } = await supabase
        .from('consultations')
        .select('consultation_id')
        .eq('encounter_id', encounterId)
        .order('consultation_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let consError: any;
      if (existingConsultation?.consultation_id) {
        const result = await supabase
          .from('consultations')
          .update(consultationPayload)
          .eq('consultation_id', existingConsultation.consultation_id);
        consError = result.error;
      } else {
        // Try insert; on 409 conflict (duplicate), fall back to update
        const insertResult = await supabase
          .from('consultations')
          .insert(consultationPayload);
        if (insertResult.error && insertResult.error.code === '23505') {
          // Unique constraint violation — consultation was created between our check and insert
          const { data: retryExisting } = await supabase
            .from('consultations')
            .select('consultation_id')
            .eq('encounter_id', encounterId)
            .limit(1)
            .maybeSingle();
          if (retryExisting?.consultation_id) {
            const updateResult = await supabase
              .from('consultations')
              .update(consultationPayload)
              .eq('consultation_id', retryExisting.consultation_id);
            consError = updateResult.error;
          } else {
            consError = insertResult.error;
          }
        } else {
          consError = insertResult.error;
        }
      }

      if (consError) throw consError;

      // 3. Submit clinical orders in background (do not block UI completion)
      const hasPostSaveSyncWork = totalOrders > 0 || Boolean(admissionOrder);
      if (hasPostSaveSyncWork) {
        submitOrders.mutate(
          {
            encounterId,
            patientId,
            labOrders,
            radiologyOrders,
            prescriptions: prescriptionOrders,
            procedureOrders,
            admissionOrder,
            staffId: staffRow?.id ?? null,
          },
          {
            onError: (error: any) => {
              console.error('[A&E] Background order sync failed:', error);
              showToast({
                message:
                  'Consultation saved, but some orders failed to sync. Check sync status.',
                type: 'warning',
              });
            },
          },
        );
      }

      // 4. Log timeline with full SOAP data
      const timelineDesc = [
        `HPI: ${hpi}`,
        pmh ? `PMH: ${pmh}` : '',
        medicationHistory ? `Medications: ${medicationHistory}` : '',
        allergyHistory ? `Allergies: ${allergyHistory}` : '',
        socialHistory ? `Social Hx: ${socialHistory}` : '',
        focusedExam ? `Exam: ${focusedExam}` : '',
        clinicalImpression ? `Assessment: ${clinicalImpression}` : '',
        workingDiagnosis ? `Working Dx: ${workingDiagnosis}` : '',
        differentials.length > 0
          ? `Differentials: ${differentials.map((d: any) => `${d.code} ${d.description}`).join(', ')}`
          : '',
        planText ? `Plan: ${planText}` : '',
        reassessInterval ? `Reassess: ${reassessInterval}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      void supabase
        .from('ae_timeline_events')
        .insert({
          encounter_id: encounterId,
          patient_id: patientId,
          event_category: 'assessment',
          event_type: 'consultation_completed',
          title: 'Emergency Consultation Completed',
          description: timelineDesc,
          details: {
            working_diagnosis: workingDiagnosis,
            orders: totalOrders,
            referrals: internalReferrals.length,
          },
          performed_by: staffRow?.id ?? null,
          performed_at: new Date().toISOString(),
          severity: 'success',
        })
        .then(({ error }) => {
          if (error) {
            console.warn(
              '[A&E] Timeline event write failed after consultation save:',
              error,
            );
          }
        });

      queryClient.invalidateQueries({ queryKey: ['ae'] });
      showToast({
        message: hasPostSaveSyncWork
          ? 'Consultation saved. Orders are syncing in background.'
          : 'Consultation saved successfully.',
        type: 'success',
      });
      onSuccess?.();
    } catch (err: any) {
      console.error('[A&E] Consultation save failed:', err);
      showToast({
        message: err?.message || 'Failed to save consultation',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="max-w-7xl mx-auto py-6 h-full flex flex-col">
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ─── Top Section Nav ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            {SECTIONS.map((section, idx) => {
              const isActive = activeSection === section.key;
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isActive
                      ? `bg-${section.color}-50 text-${section.color}-700 ring-2 ring-${section.color}-200`
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isActive
                        ? `bg-${section.color}-100 text-${section.color}-700`
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {totalOrders > 0 && (
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                {totalOrders} order{totalOrders !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Consultation'}
            </button>
          </div>
        </div>

        {/* ─── Main Layout: Context Sidebar + Content ─────────────────── */}
        <div className="flex-1 overflow-hidden flex">
          {/* ── Left Context Sidebar ──────────────────────────────────── */}
          <div className="w-72 bg-slate-100 border-r border-slate-200 overflow-y-auto p-4 space-y-4 hidden lg:block flex-shrink-0">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Clinical Context
              </h3>
            </div>

            {/* Triage Summary */}
            {triage && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${
                    triage.triage_level <= 2
                      ? 'bg-red-50 border-red-100'
                      : triage.triage_level === 3
                        ? 'bg-yellow-50 border-yellow-100'
                        : 'bg-green-50 border-green-100'
                  }`}
                >
                  <h4 className="font-bold text-xs flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    TRIAGE
                  </h4>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      triage.triage_level <= 2
                        ? 'bg-red-200 text-red-800'
                        : triage.triage_level === 3
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-green-200 text-green-800'
                    }`}
                  >
                    Level {triage.triage_level}
                  </span>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  {triage.consciousness && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Consciousness</span>
                      <span className="font-medium text-slate-700">
                        {triage.consciousness}
                      </span>
                    </div>
                  )}
                  {triage.triage_notes && (
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                      {triage.triage_notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Latest Vitals */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                <h4 className="font-bold text-blue-900 text-xs flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-blue-600" />
                  VITALS
                </h4>
              </div>
              <div className="p-4">
                {latestVitals ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: 'BP',
                        value:
                          latestVitals.blood_pressure_systolic &&
                          latestVitals.blood_pressure_diastolic
                            ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
                            : latestVitals.blood_pressure || '-',
                        icon: Heart,
                      },
                      {
                        label: 'Pulse',
                        value:
                          latestVitals.pulse || latestVitals.pulse_rate || '-',
                        icon: Activity,
                      },
                      {
                        label: 'Temp',
                        value: latestVitals.temperature
                          ? `${latestVitals.temperature}°C`
                          : '-',
                        icon: Thermometer,
                      },
                      {
                        label: 'SpO2',
                        value: latestVitals.oxygen_saturation
                          ? `${latestVitals.oxygen_saturation}%`
                          : '-',
                        icon: Wind,
                      },
                      {
                        label: 'RR',
                        value: latestVitals.respiratory_rate || '-',
                        icon: Droplets,
                      },
                      {
                        label: 'GCS',
                        value: latestVitals.gcs_total || '-',
                        icon: Brain,
                      },
                    ].map((v) => (
                      <div
                        key={v.label}
                        className="p-2 bg-slate-50 rounded border border-slate-100"
                      >
                        <span className="text-xs text-slate-400 uppercase block">
                          {v.label}
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                          {v.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-3">
                    No vitals recorded
                  </p>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            {totalOrders > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-emerald-50/50 px-4 py-3 border-b border-emerald-100">
                  <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ORDERS ({totalOrders})
                  </h4>
                </div>
                <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {labOrders.map((o, i) => (
                    <div
                      key={`l-${i}`}
                      className="text-xs flex items-center gap-1.5 text-slate-600"
                    >
                      <FlaskConical className="h-3 w-3 text-purple-500 flex-shrink-0" />
                      <span className="truncate">{o.test_name || 'Lab'}</span>
                    </div>
                  ))}
                  {radiologyOrders.map((o, i) => (
                    <div
                      key={`r-${i}`}
                      className="text-xs flex items-center gap-1.5 text-slate-600"
                    >
                      <Scan className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <span className="truncate">Imaging #{i + 1}</span>
                    </div>
                  ))}
                  {prescriptionOrders.map((o, i) => (
                    <div
                      key={`rx-${i}`}
                      className="text-xs flex items-center gap-1.5 text-slate-600"
                    >
                      <Pill className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="truncate">{o.drug_name}</span>
                    </div>
                  ))}
                  {procedureOrders.map((o, i) => (
                    <div
                      key={`p-${i}`}
                      className="text-xs flex items-center gap-1.5 text-slate-600"
                    >
                      <Scissors className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="truncate">{o.procedure_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Main Content Area ─────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 w-full mx-auto space-y-6">
              {/* ═══════════════════════════════════════════════════════ */}
              {/* SUBJECTIVE */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === 'subjective' && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={ClipboardList}
                    title="Subjective Assessment"
                    color="blue"
                    subtitle="Patient history and presenting complaint"
                  />

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-slate-700">
                          History of Presenting Illness{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <SavedNotesPopover
                          category="ae_notes"
                          subcategory="hpi"
                          currentValue={hpi}
                          onInsert={(content) => setHpi(content)}
                        />
                      </div>
                      <textarea
                        value={hpi}
                        onChange={(e) => setHpi(e.target.value)}
                        rows={5}
                        placeholder="Describe the presenting complaint, onset, duration, character, progression, aggravating/relieving factors..."
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-shadow resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Past Medical History
                        </label>
                        <textarea
                          value={pmh}
                          onChange={(e) => setPmh(e.target.value)}
                          rows={3}
                          placeholder="Previous conditions, surgeries, hospitalizations..."
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 transition-shadow resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Medication History
                        </label>
                        <textarea
                          value={medicationHistory}
                          onChange={(e) => setMedicationHistory(e.target.value)}
                          rows={3}
                          placeholder="Current medications, recent changes, compliance..."
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 transition-shadow resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />{' '}
                            Allergy History
                          </span>
                        </label>
                        <textarea
                          value={allergyHistory}
                          onChange={(e) => setAllergyHistory(e.target.value)}
                          rows={2}
                          placeholder="Drug allergies, food allergies, reactions..."
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 transition-shadow resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Social History
                        </label>
                        <textarea
                          value={socialHistory}
                          onChange={(e) => setSocialHistory(e.target.value)}
                          rows={2}
                          placeholder="Smoking, alcohol, occupation, living situation..."
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 transition-shadow resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <NavigationButtons
                    onNext={() => setActiveSection('objective')}
                  />
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* OBJECTIVE */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === 'objective' && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={Stethoscope}
                    title="Objective Findings"
                    color="emerald"
                    subtitle="Physical examination and clinical findings"
                  />

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-start gap-3">
                      <Activity className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
                      <div>
                        <span className="font-bold">
                          Vitals from triage & nursing are displayed in the
                          sidebar.
                        </span>
                        <span className="block text-blue-500 text-xs mt-0.5">
                          Record your focused examination findings below.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Focused Physical Examination{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={focusedExam}
                        onChange={(e) => setFocusedExam(e.target.value)}
                        rows={10}
                        placeholder={`General Appearance:\n\nAirway & Breathing:\n\nCardiovascular:\n\nAbdomen:\n\nNeurological:\n\nMusculoskeletal:\n\nSkin / Wounds:\n\nOther Findings:`}
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-shadow resize-none"
                      />
                    </div>
                  </div>

                  <NavigationButtons
                    onPrev={() => setActiveSection('subjective')}
                    onNext={() => setActiveSection('assessment')}
                  />
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* ASSESSMENT */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === 'assessment' && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={Brain}
                    title="Assessment & Diagnosis"
                    color="purple"
                    subtitle="Working diagnosis and clinical reasoning"
                  />

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Working Diagnosis{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={workingDiagnosis}
                        onChange={(e) => setWorkingDiagnosis(e.target.value)}
                        placeholder="Primary working diagnosis..."
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-shadow"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold text-slate-700">
                          Differential Diagnoses
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDifferentials((prev) => [
                              ...prev,
                              { code: '', description: '', is_primary: false },
                            ])
                          }
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-bold"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Differential
                        </button>
                      </div>
                      {differentials.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No differential diagnoses added.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {differentials.map((dx, idx) => (
                            <div
                              key={idx}
                              className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100"
                            >
                              <input
                                value={dx.code}
                                onChange={(e) => {
                                  const updated = [...differentials];
                                  updated[idx] = {
                                    ...dx,
                                    code: e.target.value,
                                  };
                                  setDifferentials(updated);
                                }}
                                placeholder="ICD-10"
                                className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm"
                              />
                              <input
                                value={dx.description}
                                onChange={(e) => {
                                  const updated = [...differentials];
                                  updated[idx] = {
                                    ...dx,
                                    description: e.target.value,
                                  };
                                  setDifferentials(updated);
                                }}
                                placeholder="Description"
                                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                              />
                              <button
                                onClick={() =>
                                  setDifferentials((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-slate-700">
                          Clinical Impression
                        </label>
                        <SavedNotesPopover
                          category="ae_notes"
                          subcategory="clinical_impression"
                          currentValue={clinicalImpression}
                          onInsert={(content) => setClinicalImpression(content)}
                        />
                      </div>
                      <textarea
                        value={clinicalImpression}
                        onChange={(e) => setClinicalImpression(e.target.value)}
                        rows={3}
                        placeholder="Summary assessment and clinical reasoning..."
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-300 transition-shadow resize-none"
                      />
                    </div>
                  </div>

                  <NavigationButtons
                    onPrev={() => setActiveSection('objective')}
                    onNext={() => setActiveSection('plan-orders')}
                  />
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* PLAN & ORDERS */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === 'plan-orders' && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={FlaskConical}
                    title="Plan & Clinical Orders"
                    color="red"
                    subtitle="Management plan, investigations, and prescriptions"
                  />

                  {/* Management Plan Text */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-slate-700">
                          Management Plan
                        </label>
                        <SavedNotesPopover
                          category="ae_notes"
                          subcategory="management_plan"
                          currentValue={planText}
                          onInsert={(content) => setPlanText(content)}
                        />
                      </div>
                      <textarea
                        value={planText}
                        onChange={(e) => setPlanText(e.target.value)}
                        rows={4}
                        placeholder={`1. Investigations:\n2. Medications:\n3. Monitoring:\n4. Disposition plan:`}
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-red-300 transition-shadow resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Reassessment
                        </label>
                        <SelectWithOther
                          fieldId="ae:reassess_interval"
                          value={reassessInterval}
                          onChange={(v) => setReassessInterval(v)}
                          options={REASSESS_OPTIONS}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Clinical Orders Panel ─────────────────────────── */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-red-500" />
                        Clinical Orders
                      </h3>
                      <button
                        onClick={() => setShowAddOrder(!showAddOrder)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        {showAddOrder ? 'Hide' : 'Add Orders'}
                      </button>
                    </div>

                    {showAddOrder && (
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        {/* Category Tabs */}
                        <div className="flex gap-1.5 mb-4 p-1 bg-white rounded-lg border border-slate-200 inline-flex">
                          {ORDER_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                              <button
                                key={cat.value}
                                onClick={() => {
                                  setSelectedCategory(cat.value);
                                  setSearchQuery('');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                  selectedCategory === cat.value
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Search */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${ORDER_CATEGORIES.find((c) => c.value === selectedCategory)?.label || ''}...`}
                            className="w-full pl-10 pr-20 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-300 shadow-sm"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Selected orders tags */}
                        {totalOrders > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Selected Orders ({totalOrders})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {labOrders.map((o, i) => (
                                <OrderTag
                                  key={`l-${i}`}
                                  label={o.test_name || 'Lab'}
                                  priority={o.priority}
                                  onRemove={() => removeLabOrder(i)}
                                />
                              ))}
                              {radiologyOrders.map((_, i) => (
                                <OrderTag
                                  key={`r-${i}`}
                                  label={`Imaging #${i + 1}`}
                                  priority="Urgent"
                                  onRemove={() => removeRadiologyOrder(i)}
                                />
                              ))}
                              {prescriptionOrders.map((o, i) => (
                                <OrderTag
                                  key={`rx-${i}`}
                                  label={`${o.drug_name} ${o.dosage}`}
                                  priority="Normal"
                                  onRemove={() => removePrescription(i)}
                                />
                              ))}
                              {procedureOrders.map((o, i) => (
                                <OrderTag
                                  key={`p-${i}`}
                                  label={o.procedure_name}
                                  priority={o.priority}
                                  onRemove={() => removeProcedureOrder(i)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Catalogue results */}
                        {searchQuery.trim() ? (
                          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                            {getCatalogueItems.length > 0 ? (
                              getCatalogueItems.slice(0, 50).map((item) => {
                                const isAdded =
                                  (selectedCategory === 'lab' &&
                                    labOrders.some(
                                      (o) => o.test_id === item.id,
                                    )) ||
                                  (selectedCategory === 'imaging' &&
                                    radiologyOrders.some(
                                      (o) => o.imaging_id === item.id,
                                    )) ||
                                  (selectedCategory === 'procedure' &&
                                    procedureOrders.some(
                                      (o) => o.procedure_id === item.id,
                                    ));

                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-b-0 group transition-colors ${
                                      isAdded
                                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                        : 'hover:bg-slate-50 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                      {isAdded && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                      )}
                                      <div>
                                        <p
                                          className={`text-sm font-medium truncate ${isAdded ? 'text-emerald-700' : 'text-slate-900'}`}
                                        >
                                          {item.name}
                                        </p>
                                        {item.category && (
                                          <p className="text-xs text-slate-500">
                                            {item.category}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                      <span className="text-sm font-bold text-slate-600">
                                        ₦{item.price?.toLocaleString() || '0'}
                                      </span>
                                      {isAdded ? (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded">
                                          Added
                                        </span>
                                      ) : (
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() =>
                                              addFromCatalogue(item, 'Urgent')
                                            }
                                            className="px-2 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
                                          >
                                            Urgent
                                          </button>
                                          <button
                                            onClick={() =>
                                              addFromCatalogue(item, 'Stat')
                                            }
                                            className="px-2 py-1 text-xs font-bold bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                                          >
                                            STAT
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : isCatalogueLoading ? (
                              <div className="p-8 text-center">
                                <Loader2 className="h-6 w-6 mx-auto text-red-500 animate-spin mb-2" />
                                <span className="text-sm text-slate-500">
                                  Loading catalogue...
                                </span>
                              </div>
                            ) : (
                              <div className="p-6 text-center">
                                <Search className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                                <span className="text-sm text-slate-500">
                                  No items found for "{searchQuery}"
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-5 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white/50">
                            <Search className="h-5 w-5 mx-auto text-slate-300 mb-1" />
                            Start typing to search{' '}
                            {
                              ORDER_CATEGORIES.find(
                                (c) => c.value === selectedCategory,
                              )?.label
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detailed order list by type */}
                    <div className="p-5 space-y-4">
                      {labOrders.length > 0 && (
                        <OrderSection
                          icon={FlaskConical}
                          title="Lab Orders"
                          color="purple"
                          items={labOrders.map((o, i) => ({
                            label: o.test_name || 'Lab Test',
                            priority: o.priority,
                            onRemove: () => removeLabOrder(i),
                          }))}
                        />
                      )}
                      {radiologyOrders.length > 0 && (
                        <OrderSection
                          icon={Scan}
                          title="Imaging Orders"
                          color="blue"
                          items={radiologyOrders.map((o, i) => ({
                            label: `Imaging #${i + 1}`,
                            priority: o.priority,
                            onRemove: () => removeRadiologyOrder(i),
                          }))}
                        />
                      )}
                      {prescriptionOrders.length > 0 && (
                        <OrderSection
                          icon={Pill}
                          title="Medications"
                          color="green"
                          items={prescriptionOrders.map((o, i) => ({
                            label: `${o.drug_name} — ${o.dosage} ${o.frequency} ${o.duration ? `× ${o.duration}` : ''}`,
                            priority: 'Normal',
                            onRemove: () => removePrescription(i),
                          }))}
                        />
                      )}
                      {procedureOrders.length > 0 && (
                        <OrderSection
                          icon={Scissors}
                          title="Procedures"
                          color="red"
                          items={procedureOrders.map((o, i) => ({
                            label: o.procedure_name,
                            priority: o.priority,
                            onRemove: () => removeProcedureOrder(i),
                          }))}
                        />
                      )}
                      {totalOrders === 0 && !showAddOrder && (
                        <p className="text-slate-400 text-sm italic text-center py-6">
                          No clinical orders added yet. Click "Add Orders" to
                          begin.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Referrals ─────────────────────────────────────── */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setShowReferrals(!showReferrals)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Send className="h-4 w-4 text-indigo-500" />
                        Internal Referrals
                        {internalReferrals.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {internalReferrals.length}
                          </span>
                        )}
                      </h3>
                      {showReferrals ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {showReferrals && (
                      <div className="px-5 pb-5 space-y-3">
                        <div className="flex gap-2">
                          <select
                            value={newReferralSpecialty}
                            onChange={(e) =>
                              setNewReferralSpecialty(e.target.value)
                            }
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Select specialty clinic...</option>
                            {SPECIALTY_CLINICS.filter(
                              (c) =>
                                !internalReferrals.some(
                                  (r) => r.specialty === c,
                                ),
                            ).map((clinic) => (
                              <option key={clinic} value={clinic}>
                                {clinic}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={addReferral}
                            disabled={!newReferralSpecialty}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        {internalReferrals.map((ref, idx) => (
                          <div
                            key={ref.specialty}
                            className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-indigo-800 flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {ref.specialty}
                              </span>
                              <button
                                onClick={() =>
                                  setInternalReferrals((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-indigo-600 uppercase">
                                  Reason
                                </label>
                                <input
                                  value={ref.reason}
                                  onChange={(e) => {
                                    const updated = [...internalReferrals];
                                    updated[idx] = {
                                      ...ref,
                                      reason: e.target.value,
                                    };
                                    setInternalReferrals(updated);
                                  }}
                                  placeholder="Reason for referral"
                                  className="w-full border border-indigo-200 rounded px-3 py-1.5 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-indigo-600 uppercase">
                                  Urgency
                                </label>
                                <SelectWithOther
                                  fieldId="ae:referral_urgency"
                                  value={ref.urgency}
                                  onChange={(v) => {
                                    const updated = [...internalReferrals];
                                    updated[idx] = {
                                      ...ref,
                                      urgency: v as InternalReferral['urgency'],
                                    };
                                    setInternalReferrals(updated);
                                  }}
                                  options={['Emergency', 'Urgent', 'Routine']}
                                  className="w-full border border-indigo-200 rounded px-3 py-1.5 text-sm mt-1 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Admission ──────────────────────────────────────── */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setShowAdmission(!showAdmission)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Bed className="h-4 w-4 text-orange-500" />
                        Request Admission
                      </h3>
                      {showAdmission ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {showAdmission && (
                      <div className="px-5 pb-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">
                              Ward
                            </label>
                            <select
                              value={admissionOrder?.ward_id || ''}
                              onChange={(e) => {
                                const ward = wards.find(
                                  (w: any) =>
                                    (w.ward_id || w.id) === e.target.value,
                                );
                                setAdmissionOrder((prev) => ({
                                  ...(prev || {
                                    admission_type: 'Emergency' as const,
                                    reason: '',
                                    priority: 'Urgent' as const,
                                  }),
                                  ward_id: e.target.value,
                                  ward_name: ward?.ward_name || '',
                                }));
                              }}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                            >
                              <option value="">Select ward...</option>
                              {wards.map((w: any) => (
                                <option
                                  key={w.ward_id || w.id}
                                  value={w.ward_id || w.id}
                                >
                                  {w.ward_name || w.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">
                              Reason
                            </label>
                            <input
                              value={admissionOrder?.reason || ''}
                              onChange={(e) =>
                                setAdmissionOrder((prev) => ({
                                  ...(prev || {
                                    admission_type: 'Emergency' as const,
                                    reason: '',
                                    priority: 'Urgent' as const,
                                  }),
                                  reason: e.target.value,
                                }))
                              }
                              placeholder="Reason for admission"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                            />
                          </div>
                        </div>
                        {admissionOrder && !admissionOrder.reason && (
                          <p className="text-xs text-amber-600">
                            Please provide a reason for admission.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <NavigationButtons
                    onPrev={() => setActiveSection('assessment')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Prescription Popup Modal */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {rxPopup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200">
            <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-green-900">
                  Prescribe Medication
                </h3>
                <p className="text-sm text-green-600">
                  {rxPopup.drugName} — ₦{rxPopup.drugPrice.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  setRxPopup((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Dosage *
                  </label>
                  <SelectWithOther
                    fieldId="rx:dosage"
                    value={rxPopup.dosage}
                    onChange={(v) =>
                      setRxPopup((prev) => ({ ...prev, dosage: v }))
                    }
                    options={DOSAGE_OPTIONS}
                    placeholder="Select dosage..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Frequency *
                  </label>
                  <SelectWithOther
                    fieldId="rx:frequency"
                    value={rxPopup.frequency}
                    onChange={(v) =>
                      setRxPopup((prev) => ({ ...prev, frequency: v }))
                    }
                    options={FREQUENCY_OPTIONS}
                    placeholder="Select frequency..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Duration
                  </label>
                  <SelectWithOther
                    fieldId="rx:duration"
                    value={rxPopup.duration}
                    onChange={(v) =>
                      setRxPopup((prev) => ({ ...prev, duration: v }))
                    }
                    options={DURATION_OPTIONS}
                    placeholder="Duration..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Route
                  </label>
                  <SelectWithOther
                    fieldId="rx:route"
                    value={rxPopup.route}
                    onChange={(v) =>
                      setRxPopup((prev) => ({ ...prev, route: v }))
                    }
                    options={ROUTE_OPTIONS}
                    placeholder="Route..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rxPopup.quantity}
                    onChange={(e) =>
                      setRxPopup((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Special Instructions
                </label>
                <input
                  value={rxPopup.instructions}
                  onChange={(e) =>
                    setRxPopup((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g., Take with food, avoid alcohol..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() =>
                  setRxPopup((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrescription}
                disabled={!rxPopup.dosage || !rxPopup.frequency}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-40 transition-colors"
              >
                Add Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function SectionHeader({
  icon: Icon,
  title,
  color,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  subtitle: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-xl p-4 border ${cls}`}>
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </h2>
      <p className="text-xs mt-0.5 opacity-70">{subtitle}</p>
    </div>
  );
}

function NavigationButtons({
  onPrev,
  onNext,
}: {
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex justify-between pt-2">
      {onPrev ? (
        <button
          onClick={onPrev}
          className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Previous
        </button>
      ) : (
        <div />
      )}
      {onNext && (
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  );
}

function OrderTag({
  label,
  priority,
  onRemove,
}: {
  label: string;
  priority?: string;
  onRemove: () => void;
}) {
  const bgClass =
    priority === 'STAT' || priority === 'Emergency'
      ? 'bg-red-100 text-red-800 border-red-300'
      : priority === 'Urgent'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bgClass}`}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:text-red-600 transition-colors ml-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function OrderSection({
  icon: Icon,
  title,
  color,
  items,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  items: { label: string; priority?: string; onRemove: () => void }[];
}) {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    green: 'text-green-600 bg-green-50 border-green-100',
    red: 'text-red-600 bg-red-50 border-red-100',
  };
  const cls = colorMap[color] || colorMap.purple;

  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" />
        {title} ({items.length})
      </h4>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-white/60 rounded px-2.5 py-1.5 text-sm"
          >
            <span className="truncate">{item.label}</span>
            <button
              onClick={item.onRemove}
              className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
