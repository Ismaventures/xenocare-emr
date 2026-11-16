// =============================================================================
// XENOCARE EMR - Ward Round Note Form Component
// Form for documenting ward round notes and observations
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { isNhisFeatureEnabled } from '../../../config/features';
import {
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  Clipboard,
  AlertTriangle,
  X,
  Loader2,
  Plus,
  Trash2,
  Activity,
  Scan,
  Syringe,
  Heart,
  Zap,
  Search,
  Save,
  ChevronDown,
  User,
  Clock,
  History,
  Thermometer,
  Droplets,
  Wind,
  CheckCircle2,
  ArrowRight,
  Building,
  ExternalLink,
  MapPin,
  SendHorizonal,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  useCreateWardRoundNote,
  useWardRoundNotes,
} from '../hooks/useWardRounds';
import { getVitals } from '../../nursing/api/nursing.api';
import {
  useLabTestCatalogue,
  useImagingCatalogue,
  useDrugCatalogue,
  useProcedureCatalogue,
} from '../../clinical-consultation/hooks/useConsultation';
import type {
  AdmissionWithDetails,
  WardRoundType,
} from '../../../types/database.types';
import { useDraftRestore } from '../../../hooks/useDraftRestore';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import { useEncounterAccess } from '../../../lib/encounter/useEncounterAccess';
import {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  ROUTE_OPTIONS,
} from '../../pharmacy/dtos/pharmacy.dto';

interface WardRoundNoteFormProps {
  admission: AdmissionWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Order {
  type:
    | 'medication'
    | 'lab'
    | 'radiology'
    | 'xray'
    | 'ct_scan'
    | 'ultrasound'
    | 'mri'
    | 'ecg'
    | 'procedure'
    | 'nursing'
    | 'dietary'
    | 'physiotherapy'
    | 'other';
  description: string;
  priority: 'routine' | 'urgent' | 'stat';
  catalogueId?: string; // Reference to catalogue item
  price?: number;
  // Prescription fields (for medications)
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  quantity?: number;
  instructions?: string;
}

// Specialty clinics for internal referrals
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
  'Nutrition',
  'Plastic Surgery',
  'ENT (Ear, Nose & Throat)',
];

interface InternalReferral {
  specialty: string;
  reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  clinicalFindings: string;
  provisionalDiagnosis: string;
}

interface ExternalReferral {
  enabled: boolean;
  facilityName: string;
  facilityAddress: string;
  doctorName: string;
  reason: string;
  clinicalFindings: string;
  investigationFindings: string;
  provisionalDiagnosis: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
}

// Order category type for grouping
type OrderCategory = 'medication' | 'lab' | 'imaging' | 'procedure' | 'other';

const roundTypes: {
  value: WardRoundType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'morning',
    label: 'Morning Round',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: 'evening',
    label: 'Evening Round',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: 'night',
    label: 'Night Round',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: 'consultant',
    label: 'Consultant Round',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    value: 'multidisciplinary',
    label: 'Multidisciplinary',
    icon: <Clipboard className="h-4 w-4" />,
  },
  {
    value: 'teaching',
    label: 'Teaching Round',
    icon: <Activity className="h-4 w-4" />,
  },
];

// Simplified order categories
const orderCategories = [
  {
    value: 'medication' as OrderCategory,
    label: 'Medication',
    icon: <Pill className="h-4 w-4" />,
  },
  {
    value: 'lab' as OrderCategory,
    label: 'Lab Test',
    icon: <FlaskConical className="h-4 w-4" />,
  },
  {
    value: 'imaging' as OrderCategory,
    label: 'Imaging / Radiology',
    icon: <Scan className="h-4 w-4" />,
  },
  {
    value: 'procedure' as OrderCategory,
    label: 'Procedure',
    icon: <Syringe className="h-4 w-4" />,
  },
  {
    value: 'other' as OrderCategory,
    label: 'Other (Nursing, Dietary, etc.)',
    icon: <Clipboard className="h-4 w-4" />,
  },
];

const priorityColors = {
  routine: 'bg-gray-100 text-gray-700 border-gray-200',
  urgent: 'bg-amber-100 text-amber-700 border-amber-200',
  stat: 'bg-red-100 text-red-700 border-red-200',
};

const WardRoundNoteForm: React.FC<WardRoundNoteFormProps> = ({
  admission,
  onSuccess,
  onCancel,
}) => {
  const [roundType, setRoundType] = useState<WardRoundType>('morning');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [vitalSigns, setVitalSigns] = useState({
    temperature: '',
    pulse: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrder, setNewOrder] = useState<Order>({
    type: 'medication',
    description: '',
    priority: 'routine',
  });

  // ── Draft auto-save / restore ──────────────────────────────────────────
  const draftData = useMemo(
    () => ({
      roundType,
      subjective,
      objective,
      assessment,
      plan,
      vitalSigns,
    }),
    [roundType, subjective, objective, assessment, plan, vitalSigns],
  );

  const setDraftData = useCallback((d: typeof draftData) => {
    setRoundType(d.roundType);
    setSubjective(d.subjective);
    setObjective(d.objective);
    setAssessment(d.assessment);
    setPlan(d.plan);
    setVitalSigns(d.vitalSigns);
  }, []);

  const { clearDraft } = useDraftRestore(
    `ward-round-${admission.id}`,
    draftData,
    setDraftData,
  );
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<OrderCategory>('medication');
  const [searchQuery, setSearchQuery] = useState('');

  // Prescription popup state (for medication orders)
  const [prescriptionPopup, setPrescriptionPopup] = useState({
    isOpen: false,
    drugId: '',
    drugName: '',
    drugPrice: 0,
    priority: 'routine' as 'routine' | 'urgent' | 'stat',
    dosage: '',
    frequency: '',
    duration: '',
    route: '',
    quantity: 1,
    instructions: '',
  });

  // Referral state
  const [showReferrals, setShowReferrals] = useState(false);
  const [internalReferrals, setInternalReferrals] = useState<
    InternalReferral[]
  >([]);
  const [newReferralSpecialty, setNewReferralSpecialty] = useState('');
  const [externalReferral, setExternalReferral] = useState<ExternalReferral>({
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

  // Fetch catalogues
  const { data: labTests = [], isLoading: isLoadingLabs } =
    useLabTestCatalogue();
  const { data: imagingItems = [], isLoading: isLoadingImaging } =
    useImagingCatalogue();
  const { data: drugs = [], isLoading: isLoadingDrugs } = useDrugCatalogue();
  const { data: procedures = [], isLoading: isLoadingProcedures } =
    useProcedureCatalogue();

  // Check if current category is loading
  const isCatalogueLoading =
    (selectedCategory === 'lab' && isLoadingLabs) ||
    (selectedCategory === 'imaging' && isLoadingImaging) ||
    (selectedCategory === 'medication' && isLoadingDrugs) ||
    (selectedCategory === 'procedure' && isLoadingProcedures);

  // Context Data Fetching
  const { data: previousRounds } = useWardRoundNotes(admission.id);
  const lastRound = previousRounds?.[0]; // Assuming API returns sorted desc

  const { data: recentVitals } = useQuery({
    queryKey: ['recent-vitals', admission.encounter_id],
    queryFn: () => getVitals({ encounter_id: admission.encounter_id || '' }),
    enabled: !!admission.encounter_id,
  });
  const latestVitals = recentVitals?.[0];

  const createNote = useCreateWardRoundNote();

  // --- Care team access check ---
  const {
    canEdit: encounterCanEdit,
    isLoading: accessLoading,
    encounterRole,
  } = useEncounterAccess({
    encounterId: admission.encounter_id || '',
    enabled: !!admission.encounter_id,
  });

  // Get filtered catalogue items based on selected category
  const getCatalogueItems = () => {
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
      default:
        return [];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query),
      );
    }

    return items;
  };

  const catalogueItems = getCatalogueItems();

  const handleVitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVitalSigns((prev) => ({ ...prev, [name]: value }));
  };

  // Add order from catalogue item
  const addOrderFromCatalogue = (
    item: { id: string; name: string; price: number; category?: string },
    priority: 'routine' | 'urgent' | 'stat' = 'routine',
  ) => {
    // For medications, open the prescription popup instead of adding directly
    if (selectedCategory === 'medication') {
      setPrescriptionPopup({
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
      return;
    }

    const orderType =
      selectedCategory === 'imaging' ? 'radiology' : selectedCategory;
    const newOrderItem: Order = {
      type: orderType as Order['type'],
      description: item.name,
      priority,
      catalogueId: item.id,
      price: item.price,
    };
    setOrders([...orders, newOrderItem]);
    setSearchQuery('');
  };

  // Confirm prescription from popup and add to orders
  const confirmPrescription = () => {
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
    } = prescriptionPopup;
    if (!dosage || !frequency || !duration) return;
    const newOrderItem: Order = {
      type: 'medication',
      description: drugName,
      priority,
      catalogueId: drugId,
      price: drugPrice,
      dosage,
      frequency,
      duration,
      route,
      quantity,
      instructions,
    };
    setOrders((prev) => [...prev, newOrderItem]);
    setPrescriptionPopup((prev) => ({ ...prev, isOpen: false }));
    setSearchQuery('');
  };

  // Add internal referral
  const addInternalReferral = () => {
    if (!newReferralSpecialty) return;
    if (internalReferrals.some((r) => r.specialty === newReferralSpecialty))
      return;
    setInternalReferrals((prev) => [
      ...prev,
      {
        specialty: newReferralSpecialty,
        reason: '',
        urgency: 'Routine',
        clinicalFindings: '',
        provisionalDiagnosis: '',
      },
    ]);
    setNewReferralSpecialty('');
  };

  const removeInternalReferral = (specialty: string) => {
    setInternalReferrals((prev) =>
      prev.filter((r) => r.specialty !== specialty),
    );
  };

  const updateInternalReferral = (
    specialty: string,
    updates: Partial<InternalReferral>,
  ) => {
    setInternalReferrals((prev) =>
      prev.map((r) => (r.specialty === specialty ? { ...r, ...updates } : r)),
    );
  };

  // Add custom/manual order
  const addOrder = () => {
    if (!newOrder.description.trim()) return;
    setOrders([...orders, newOrder]);
    setNewOrder({ type: 'medication', description: '', priority: 'routine' });
    setShowAddOrder(false);
  };

  const removeOrder = (index: number) => {
    setOrders(orders.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Prepare vital signs (only include non-empty values)
    const vitals = Object.entries(vitalSigns)
      .filter(([_, v]) => v !== '')
      .reduce(
        (acc, [key, value]) => {
          acc[key] = parseFloat(value) || value;
          return acc;
        },
        {} as Record<string, number | string>,
      );

    // Prepare orders in the correct format
    const formattedOrders =
      orders.length > 0
        ? orders.map((o) => ({
            type: o.type,
            description: o.description,
            urgency: o.priority,
            ...(o.catalogueId && { catalogueId: o.catalogueId }),
            ...(o.price && { price: o.price }),
            ...(o.dosage && { dosage: o.dosage }),
            ...(o.frequency && { frequency: o.frequency }),
            ...(o.duration && { duration: o.duration }),
            ...(o.route && { route: o.route }),
            ...(o.quantity && { quantity: o.quantity }),
            ...(o.instructions && { instructions: o.instructions }),
          }))
        : undefined;

    // Prepare referral data
    const referralData =
      internalReferrals.length > 0 ||
      (isNhisFeatureEnabled() && externalReferral.enabled)
        ? {
            internal:
              internalReferrals.length > 0 ? internalReferrals : undefined,
            external:
              isNhisFeatureEnabled() && externalReferral.enabled
              ? {
                  facilityName: externalReferral.facilityName,
                  facilityAddress: externalReferral.facilityAddress,
                  doctorName: externalReferral.doctorName,
                  reason: externalReferral.reason,
                  clinicalFindings: externalReferral.clinicalFindings,
                  investigationFindings: externalReferral.investigationFindings,
                  provisionalDiagnosis: externalReferral.provisionalDiagnosis,
                  urgency: externalReferral.urgency,
                }
              : undefined,
          }
        : undefined;

    try {
      await createNote.mutateAsync({
        admission_id: admission.id,
        round_type: roundType,
        subjective_notes: subjective || undefined,
        objective_findings: objective || undefined,
        vital_signs: Object.keys(vitals).length > 0 ? vitals : undefined,
        assessment: assessment || undefined,
        plan: plan || undefined,
        new_orders: formattedOrders,
        referrals: referralData,
      } as any);
      clearDraft();
      onSuccess();
    } catch (error) {
      console.error('Failed to create ward round note:', error);
    }
  };

  // --- Access gate: block non-care-team members from writing ---
  if (accessLoading) {
    return (
      <div className="max-w-7xl mx-auto h-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!encounterCanEdit) {
    return (
      <div className="max-w-7xl mx-auto h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500 text-center max-w-md">
          You are not on the care team for this encounter
          {encounterRole ? ` (role: ${encounterRole})` : ''}. Only care team
          members with edit permissions can document ward round notes.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto h-full flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Ward Round Documentation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {admission.admission_number} • {admission.admitting_diagnosis}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {roundType}
            </span>
            <button
              onClick={onCancel}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* LEFT SIDEBAR - CONTEXT */}
          <div className="w-80 bg-slate-100 border-r border-slate-200 overflow-y-auto p-4 space-y-4 hidden lg:block">
            <div className="pb-2 border-b border-slate-200 mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Clinical Context
              </h3>
            </div>

            {/* Latest Vitals Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                <h4 className="font-bold text-blue-900 text-xs flex items-center gap-2">
                  <Activity size={14} className="text-blue-600" />
                  LATEST VITALS
                </h4>
                {latestVitals && (
                  <span className="text-xs font-medium text-blue-600">
                    {format(new Date(latestVitals.created_at), 'HH:mm')}
                  </span>
                )}
              </div>
              <div className="p-4">
                {latestVitals ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-xs text-slate-400 uppercase block">
                        BP
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {latestVitals.blood_pressure || '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-xs text-slate-400 uppercase block">
                        Pulse
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {latestVitals.pulse || '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-xs text-slate-400 uppercase block">
                        Temp
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {latestVitals.temperature || '-'}°C
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-xs text-slate-400 uppercase block">
                        SpO2
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {latestVitals.oxygen_saturation || '-'}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No active vitals recorded
                  </p>
                )}
              </div>
            </div>

            {/* Last Round Note */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-purple-50/50 px-4 py-3 border-b border-purple-100 flex justify-between items-center">
                <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                  <History size={14} className="text-purple-600" />
                  LAST ROUND
                </h4>
                {lastRound && (
                  <span className="text-xs font-medium text-purple-600">
                    {format(new Date(lastRound.created_at), 'MMM dd')}
                  </span>
                )}
              </div>
              <div className="p-4">
                {lastRound ? (
                  <div className="space-y-3">
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block mb-1">
                        Plan:
                      </span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                        {lastRound.plan || 'No plan recorded'}
                      </p>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block mb-1">
                        Assessment:
                      </span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                        {lastRound.assessment || 'No assessment recorded'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No previous rounds found
                  </p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
              <h4 className="font-bold text-amber-800 text-xs mb-2 flex items-center gap-2">
                <AlertTriangle size={12} /> ALERTS
              </h4>
              <ul className="list-disc pl-4 text-xs text-amber-700 space-y-1">
                <li>Check pending lab results</li>
                {admission.isolation_required && (
                  <li>Patient in isolation ({admission.isolation_type})</li>
                )}
              </ul>
            </div>
          </div>

          {/* RIGHT MAIN FORM */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {/* Orders - MOVED TO TOP */}
              <div className="pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Clipboard className="h-5 w-5 text-blue-600" />
                      Clinical Orders
                    </div>
                  </label>
                  <button
                    onClick={() => setShowAddOrder(!showAddOrder)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    New Order
                  </button>
                </div>

                {/* Add Order Form */}
                {showAddOrder && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 shadow-inner">
                    {/* Category Selection */}
                    <div className="flex flex-wrap gap-2 mb-4 p-1 bg-white rounded-lg border border-gray-200">
                      {orderCategories.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setSelectedCategory(cat.value);
                            setSearchQuery('');
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                            selectedCategory === cat.value
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {cat.icon}
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input - for catalogue-based categories */}
                    {selectedCategory !== 'other' ? (
                      <div className="space-y-3">
                        {/* Selected Orders Tags - Show inline above search */}
                        {orders.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Selected Orders ({orders.length})
                              </span>
                              <button
                                onClick={() => setOrders([])}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {orders.map((order, index) => (
                                <span
                                  key={index}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    order.priority === 'urgent'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : order.priority === 'stat'
                                        ? 'bg-red-100 text-red-800 border border-red-300'
                                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                                  }`}
                                >
                                  <span className="text-xs uppercase font-bold opacity-75">
                                    {order.priority}
                                  </span>
                                  {order.description}
                                  <button
                                    onClick={() => removeOrder(index)}
                                    className="ml-1 hover:text-red-600 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Type to search ${orderCategories.find((c) => c.value === selectedCategory)?.label || 'items'}...`}
                            className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Catalogue Items List - Only show when searching */}
                        {searchQuery.trim() ? (
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                            {catalogueItems.length > 0 ? (
                              catalogueItems.slice(0, 50).map((item) => {
                                const isAlreadyAdded = orders.some(
                                  (o) => o.description === item.name,
                                );
                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 cursor-pointer group transition-colors ${
                                      isAlreadyAdded
                                        ? 'bg-green-50 border-l-4 border-l-green-500'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                      {isAlreadyAdded && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      )}
                                      <div>
                                        <p
                                          className={`text-sm font-medium truncate ${isAlreadyAdded ? 'text-green-700' : 'text-gray-900 group-hover:text-blue-700'}`}
                                        >
                                          {item.name}
                                        </p>
                                        {item.category && (
                                          <p className="text-xs text-gray-500">
                                            {item.category}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      <span className="text-sm font-bold text-slate-700">
                                        ₦{item.price?.toLocaleString() || '0'}
                                      </span>
                                      {isAlreadyAdded ? (
                                        <span className="px-2 py-1 text-xs font-bold uppercase bg-green-100 text-green-700 rounded">
                                          ✓ Added
                                        </span>
                                      ) : (
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() =>
                                              addOrderFromCatalogue(
                                                item,
                                                'routine',
                                              )
                                            }
                                            className="px-2 py-1 text-xs font-bold uppercase bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                            title="Add as Routine"
                                          >
                                            Routine
                                          </button>
                                          <button
                                            onClick={() =>
                                              addOrderFromCatalogue(
                                                item,
                                                'urgent',
                                              )
                                            }
                                            className="px-2 py-1 text-xs font-bold uppercase bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors"
                                            title="Add as Urgent"
                                          >
                                            Urgent
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : isCatalogueLoading ? (
                              <div className="p-8 text-center text-sm text-gray-500">
                                <Loader2 className="h-8 w-8 mx-auto text-blue-500 mb-2 animate-spin" />
                                Loading catalogue items...
                              </div>
                            ) : (
                              <div className="p-6 text-center text-sm text-gray-500">
                                <Search className="h-6 w-6 mx-auto text-gray-300 mb-2" />
                                No items found matching "{searchQuery}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                            <Search className="h-5 w-5 mx-auto text-gray-300 mb-1" />
                            Start typing to search{' '}
                            {orderCategories.find(
                              (c) => c.value === selectedCategory,
                            )?.label || 'items'}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Manual Entry for "Other" category */
                      <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Order Type
                            </label>
                            <select
                              value={newOrder.type}
                              onChange={(e) =>
                                setNewOrder({
                                  ...newOrder,
                                  type: e.target.value as Order['type'],
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                            >
                              <option value="nursing">Nursing Care</option>
                              <option value="dietary">
                                Dietary / Nutrition
                              </option>
                              <option value="physiotherapy">
                                Physiotherapy
                              </option>
                              <option value="other">General / Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Priority
                            </label>
                            <select
                              value={newOrder.priority}
                              onChange={(e) =>
                                setNewOrder({
                                  ...newOrder,
                                  priority: e.target.value as Order['priority'],
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                            >
                              <option value="routine">Routine</option>
                              <option value="urgent">Urgent</option>
                              <option value="stat">STAT (Emergency)</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Description / Instructions
                          </label>
                          <input
                            type="text"
                            value={newOrder.description}
                            onChange={(e) =>
                              setNewOrder({
                                ...newOrder,
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter specific instructions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={addOrder}
                          disabled={!newOrder.description.trim()}
                          className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50 transition-colors"
                        >
                          Add Custom Order
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Orders List */}
                {orders.length > 0 ? (
                  <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Pending Orders ({orders.length})
                    </h4>
                    {orders.map((order, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${priorityColors[order.priority]}`}
                            >
                              {order.priority}
                            </span>
                            <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                              {order.type}
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {order.description}
                            </span>
                            {order.price !== undefined && order.price > 0 && (
                              <span className="text-sm font-bold text-green-600 ml-auto mr-4 font-mono">
                                ₦{order.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeOrder(index)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Show prescription details for medication orders */}
                        {order.type === 'medication' && order.dosage && (
                          <div className="mt-2 ml-2 pl-3 border-l-2 border-green-300">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span>
                                <strong>Dosage:</strong> {order.dosage}
                              </span>
                              <span>
                                <strong>Frequency:</strong> {order.frequency}
                              </span>
                              <span>
                                <strong>Duration:</strong> {order.duration}
                              </span>
                              {order.route && (
                                <span>
                                  <strong>Route:</strong> {order.route}
                                </span>
                              )}
                              {order.quantity && (
                                <span>
                                  <strong>Qty:</strong> {order.quantity}
                                </span>
                              )}
                              {order.instructions && (
                                <span>
                                  <strong>Instructions:</strong>{' '}
                                  {order.instructions}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Total Price */}
                    {orders.some((o) => o.price && o.price > 0) && (
                      <div className="flex justify-end pt-3 border-t border-gray-200 mt-2">
                        <span className="text-sm font-bold text-gray-700">
                          Total Estimated Cost:{' '}
                          <span className="text-green-600 font-mono text-lg">
                            ₦
                            {orders
                              .reduce((sum, o) => sum + (o.price || 0), 0)
                              .toLocaleString()}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  !showAddOrder && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Clipboard className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">
                        No orders added
                      </p>
                      <p className="text-xs text-gray-400">
                        Medications, labs, and other requests will appear here
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  REFERRALS SECTION
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <SendHorizonal className="h-5 w-5 text-amber-600" />
                      Referrals
                      {(internalReferrals.length > 0 ||
                        (isNhisFeatureEnabled() &&
                          externalReferral.enabled)) && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                          {internalReferrals.length +
                            (isNhisFeatureEnabled() &&
                            externalReferral.enabled
                              ? 1
                              : 0)}
                        </span>
                      )}
                    </div>
                  </label>
                  <button
                    onClick={() => setShowReferrals(!showReferrals)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    {showReferrals ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {showReferrals ? 'Close' : 'Add Referral'}
                  </button>
                </div>

                {showReferrals && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 mb-4 space-y-6">
                    {/* ── Internal Specialty Referral ── */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4 text-amber-600" />
                        Internal Specialty Referral
                      </h4>
                      <div className="flex gap-3 mb-4">
                        <select
                          value={newReferralSpecialty}
                          onChange={(e) =>
                            setNewReferralSpecialty(e.target.value)
                          }
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="">Select Specialty Clinic...</option>
                          {SPECIALTY_CLINICS.filter(
                            (s) =>
                              !internalReferrals.some((r) => r.specialty === s),
                          ).map((clinic) => (
                            <option key={clinic} value={clinic}>
                              {clinic}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={addInternalReferral}
                          disabled={!newReferralSpecialty}
                          className="px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </div>

                      {/* Internal referral forms */}
                      {internalReferrals.map((ref) => (
                        <div
                          key={ref.specialty}
                          className="p-4 bg-white border border-amber-200 rounded-lg mb-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-amber-600" />
                              <h5 className="font-bold text-gray-900 text-sm">
                                {ref.specialty} Referral
                              </h5>
                            </div>
                            <button
                              onClick={() =>
                                removeInternalReferral(ref.specialty)
                              }
                              className="text-sm text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Reason for Referral{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={ref.reason}
                                onChange={(e) =>
                                  updateInternalReferral(ref.specialty, {
                                    reason: e.target.value,
                                  })
                                }
                                placeholder="Describe reason for referral..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Urgency
                              </label>
                              <select
                                value={ref.urgency}
                                onChange={(e) =>
                                  updateInternalReferral(ref.specialty, {
                                    urgency: e.target.value as any,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="Routine">Routine</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Emergency">Emergency</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Clinical Findings
                              </label>
                              <input
                                type="text"
                                value={ref.clinicalFindings}
                                onChange={(e) =>
                                  updateInternalReferral(ref.specialty, {
                                    clinicalFindings: e.target.value,
                                  })
                                }
                                placeholder="Examination findings..."
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Provisional Diagnosis
                              </label>
                              <input
                                type="text"
                                value={ref.provisionalDiagnosis}
                                onChange={(e) =>
                                  updateInternalReferral(ref.specialty, {
                                    provisionalDiagnosis: e.target.value,
                                  })
                                }
                                placeholder="Provisional diagnosis..."
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── External NHIS Referral ── */}
                    {isNhisFeatureEnabled() && (
                    <div className="pt-4 border-t border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-amber-600" />
                          External NHIS Referral
                        </h4>
                        <button
                          onClick={() =>
                            setExternalReferral((prev) => ({
                              ...prev,
                              enabled: !prev.enabled,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            externalReferral.enabled
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {externalReferral.enabled
                            ? 'Cancel External Referral'
                            : 'Add External Referral'}
                        </button>
                      </div>

                      {externalReferral.enabled && (
                        <div className="p-4 bg-white border border-amber-200 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Destination Hospital{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={externalReferral.facilityName}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    facilityName: e.target.value,
                                  }))
                                }
                                placeholder="Enter the name of the hospital"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Facility Address
                              </label>
                              <input
                                type="text"
                                value={externalReferral.facilityAddress}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    facilityAddress: e.target.value,
                                  }))
                                }
                                placeholder="Enter address (optional)"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Receiving Doctor
                              </label>
                              <input
                                type="text"
                                value={externalReferral.doctorName}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    doctorName: e.target.value,
                                  }))
                                }
                                placeholder="Enter doctor name (optional)"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Urgency <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={externalReferral.urgency}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    urgency: e.target.value as any,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="Routine">Routine</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Emergency">Emergency</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Clinical Findings{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={externalReferral.clinicalFindings}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    clinicalFindings: e.target.value,
                                  }))
                                }
                                placeholder="Enter clinical examination findings..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Investigation Findings
                              </label>
                              <textarea
                                value={externalReferral.investigationFindings}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    investigationFindings: e.target.value,
                                  }))
                                }
                                placeholder="Enter lab/radiology results (optional)..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Provisional Diagnosis{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={externalReferral.provisionalDiagnosis}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    provisionalDiagnosis: e.target.value,
                                  }))
                                }
                                placeholder="Enter provisional diagnosis..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Reason for Referral{' '}
                                <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={externalReferral.reason}
                                onChange={(e) =>
                                  setExternalReferral((prev) => ({
                                    ...prev,
                                    reason: e.target.value,
                                  }))
                                }
                                placeholder="Describe why you are referring this patient to an external facility..."
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {/* Referrals Summary (when collapsed) */}
                {!showReferrals &&
                  (internalReferrals.length > 0 ||
                    (isNhisFeatureEnabled() &&
                      externalReferral.enabled)) && (
                    <div className="space-y-2">
                      {internalReferrals.map((ref) => (
                        <div
                          key={ref.specialty}
                          className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <ArrowRight className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {ref.specialty}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                ref.urgency === 'Emergency'
                                  ? 'bg-red-100 text-red-700'
                                  : ref.urgency === 'Urgent'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {ref.urgency}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              removeInternalReferral(ref.specialty)
                            }
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {isNhisFeatureEnabled() && externalReferral.enabled && (
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <ExternalLink className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-gray-900">
                              External:{' '}
                              {externalReferral.facilityName || 'Not specified'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                externalReferral.urgency === 'Emergency'
                                  ? 'bg-red-100 text-red-700'
                                  : externalReferral.urgency === 'Urgent'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {externalReferral.urgency}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setExternalReferral((prev) => ({
                                ...prev,
                                enabled: false,
                              }))
                            }
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                {!showReferrals &&
                  internalReferrals.length === 0 &&
                  !externalReferral.enabled && (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <SendHorizonal className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">
                        No referrals added
                      </p>
                      <p className="text-xs text-gray-400">
                        Internal specialty referrals
                      </p>
                    </div>
                  )}
              </div>

              {/* Round Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Round Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {roundTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setRoundType(type.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        roundType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vital Signs (Input) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                  Current Vitals Check
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">
                      Temp (°C)
                    </label>
                    <div className="relative">
                      <Thermometer
                        size={14}
                        className="absolute left-2.5 top-2.5 text-gray-400"
                      />
                      <input
                        type="number"
                        name="temperature"
                        value={vitalSigns.temperature}
                        onChange={handleVitalChange}
                        step="0.1"
                        placeholder="36.5"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">
                      Pulse (bpm)
                    </label>
                    <div className="relative">
                      <Heart
                        size={14}
                        className="absolute left-2.5 top-2.5 text-gray-400"
                      />
                      <input
                        type="number"
                        name="pulse"
                        value={vitalSigns.pulse}
                        onChange={handleVitalChange}
                        placeholder="72"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">
                      BP Systolic
                    </label>
                    <div className="relative">
                      <Activity
                        size={14}
                        className="absolute left-2.5 top-2.5 text-gray-400"
                      />
                      <input
                        type="number"
                        name="blood_pressure_systolic"
                        value={vitalSigns.blood_pressure_systolic}
                        onChange={handleVitalChange}
                        placeholder="120"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">
                      SpO2 (%)
                    </label>
                    <div className="relative">
                      <Wind
                        size={14}
                        className="absolute left-2.5 top-2.5 text-gray-400"
                      />
                      <input
                        type="number"
                        name="oxygen_saturation"
                        value={vitalSigns.oxygen_saturation}
                        onChange={handleVitalChange}
                        placeholder="98"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SOAP Notes */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg">
                      Detailed Notes
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded">
                      SOAP Format
                    </span>
                  </div>
                  <TemplateSearchPopover
                    templateType="inpatient"
                    category="ward_round"
                    currentValues={{ subjective, objective, assessment, plan }}
                    onTemplateSelect={(data) => {
                      if (data.subjective) setSubjective(data.subjective);
                      if (data.objective) setObjective(data.objective);
                      if (data.assessment) setAssessment(data.assessment);
                      if (data.plan) setPlan(data.plan);
                    }}
                    buttonText="Fill All Fields"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-blue-800">
                          Subjective
                        </label>
                        <SavedNotesPopover
                          category="consultation_subjective"
                          subcategory="ward_round"
                          currentValue={subjective}
                          onInsert={(content) => setSubjective(content)}
                        />
                      </div>
                      <textarea
                        value={subjective}
                        onChange={(e) => setSubjective(e.target.value)}
                        rows={4}
                        placeholder="Patient's symptoms, complaints..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-indigo-800">
                          Objective
                        </label>
                        <SavedNotesPopover
                          category="consultation_objective"
                          subcategory="ward_round"
                          currentValue={objective}
                          onInsert={(content) => setObjective(content)}
                        />
                      </div>
                      <textarea
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        rows={4}
                        placeholder="Physical exam findings..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-amber-800">
                          Assessment
                        </label>
                        <SavedNotesPopover
                          category="consultation_assessment"
                          subcategory="ward_round"
                          currentValue={assessment}
                          onInsert={(content) => setAssessment(content)}
                        />
                      </div>
                      <textarea
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        rows={4}
                        placeholder="Diagnosis, progress..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-emerald-800">
                          Plan
                        </label>
                        <SavedNotesPopover
                          category="consultation_plan"
                          subcategory="ward_round"
                          currentValue={plan}
                          onInsert={(content) => setPlan(content)}
                        />
                      </div>
                      <textarea
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        rows={4}
                        placeholder="Treatment plan, medications..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Footer attached to the bottom of the scrollable area if content is long, or fixed at bottom of container */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between items-center mt-6">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createNote.isPending}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {createNote.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Saving Note...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Ward Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
        PRESCRIPTION POPUP MODAL (for medication orders)
        ═══════════════════════════════════════════════════════════════════════ */}
      {prescriptionPopup.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-green-600" />
                    Prescription Details
                  </h3>
                  <p className="text-sm text-green-700 mt-1 font-medium">
                    {prescriptionPopup.drugName}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPrescriptionPopup((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dosage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dosage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prescriptionPopup.dosage}
                    onChange={(e) =>
                      setPrescriptionPopup((prev) => ({
                        ...prev,
                        dosage: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select dosage...</option>
                    {DOSAGE_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prescriptionPopup.frequency}
                    onChange={(e) =>
                      setPrescriptionPopup((prev) => ({
                        ...prev,
                        frequency: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select frequency...</option>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prescriptionPopup.duration}
                    onChange={(e) =>
                      setPrescriptionPopup((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select duration...</option>
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Route */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Route
                  </label>
                  <select
                    value={prescriptionPopup.route}
                    onChange={(e) =>
                      setPrescriptionPopup((prev) => ({
                        ...prev,
                        route: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select route...</option>
                    {ROUTE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prescriptionPopup.quantity}
                    onChange={(e) =>
                      setPrescriptionPopup((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Special Instructions
                </label>
                <textarea
                  value={prescriptionPopup.instructions}
                  onChange={(e) =>
                    setPrescriptionPopup((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g. Take after meals, avoid with dairy..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Price info */}
              {prescriptionPopup.drugPrice > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-gray-600">Unit Price:</span>
                  <span className="text-sm font-bold text-green-700 font-mono">
                    ₦{prescriptionPopup.drugPrice.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <button
                onClick={() =>
                  setPrescriptionPopup((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrescription}
                disabled={
                  !prescriptionPopup.dosage ||
                  !prescriptionPopup.frequency ||
                  !prescriptionPopup.duration
                }
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WardRoundNoteForm;
