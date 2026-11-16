/**
 * =============================================================================
 * Ophthalmology Consultant Record — Main Container
 * Timeline-based patient ophthalmology record with split-panel layout.
 * Left: EncounterTimeline (compact)    Right: EncounterDetailPanel (wide)
 * Patient demographics + triage visible at top. Quick Actions as dropdown.
 * =============================================================================
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Eye,
  ArrowLeft,
  Plus,
  FileText,
  Loader2,
  User,
  Briefcase,
  Calendar,
  Phone,
  Activity,
  Pill,
  Scissors,
  History,
  MessageSquarePlus,
  Send,
  PenLine,
  UserCheck,
} from 'lucide-react';
import { format, differenceInYears, formatDistanceToNow } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../api/supabaseClient';
import {
  useConsultationAddendums,
  useAddConsultationAddendum,
} from '../../specialty-common/hooks/useSpecialtyClinic';
import { useCompleteRequest } from '../../clinical-requests/hooks/useClinicalRequests';
import {
  usePatientEyeExams,
  useUpdateEyeExam,
  useCreateEyeExam,
} from '../hooks/useOphthalmology';
import type {
  EyeExamDTO,
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
} from '../types/ophthalmology.types';
import {
  submitSpecialtyOrdersAndReferrals,
  type SpecialtyOrdersPayload,
} from '../../specialty-common/utils/specialty-order-submission';
import EncounterTimeline from './EncounterTimeline';
import EncounterDetailPanel from './EncounterDetailPanel';
import ConsultantQuickActions from './ConsultantQuickActions';
import VisionProgressGraph from './VisionProgressGraph';
import VisitComparisonModal from './VisitComparisonModal';
import EyeExamWizard from './EyeExamWizard';
import type { EyeExamMode } from './EyeExamWizard';
import { Modal } from '../../../components/ui';
import { usePatient } from '../../patient-registration/hooks/usePatient';
import EncounterDetailLayout from '../../specialty-common/components/EncounterDetailLayout';
import type { EncounterDetailTheme } from '../../specialty-common/components/EncounterDetailLayout';
import ClinicTriageDisplay from '../../specialty-common/components/ClinicTriageDisplay';
import {
  extractPrintableFields,
  type PrintableField,
} from '../../../utils/printFieldUtils';

// =============================================================================
// Props
// =============================================================================

interface OphthalmologyConsultantRecordProps {
  patientId: string;
  patientName: string;
  emrNumber: string;
  /** Current encounter ID (from queue or referral) */
  encounterId: string;
  encounterNumber?: string;
  clinicalRequestId?: string;
  onBack: () => void;
}

type CareTab =
  | 'summary'
  | 'care-vitals'
  | 'doctor-notes'
  | 'treatment-plan'
  | 'lab-orders'
  | 'imaging-orders'
  | 'procedure-orders'
  | 'medications'
  | 'history'
  | 'addendum';

interface EncounterLabOrder {
  request_id: string;
  test_id: string | null;
  status: string | null;
  priority: string | null;
  clinical_notes: string | null;
  created_at: string | null;
  ordered_by: string | null;
  test_name?: string;
  ordered_by_name?: string;
  lab_result_value?: string | null;
  lab_result_status?: string | null;
  lab_result_interpretation?: string | null;
  lab_result_comments?: string | null;
  lab_result_reported_at?: string | null;
  lab_result_unit?: string | null;
  lab_result_reference_range?: string | null;
  lab_result_is_abnormal?: boolean | null;
  lab_result_is_critical?: boolean | null;
}

interface EncounterImagingOrder {
  request_id: string;
  imaging_id: string | null;
  imaging_type: string | null;
  body_part: string | null;
  status: string | null;
  priority: string | null;
  clinical_indication: string | null;
  notes: string | null;
  clinical_history?: string | null;
  created_at: string | null;
  ordered_by: string | null;
  imaging_name?: string;
  ordered_by_name?: string;
  result_findings?: string | null;
  result_impression?: string | null;
  result_notes?: string | null;
  result_reported_at?: string | null;
  result_status?: string | null;
  result_extra_fields?: PrintableField[];
}

interface EncounterProcedureOrder {
  id: string;
  procedure_name: string | null;
  procedure_code: string | null;
  status: string | null;
  priority: string | null;
  indication: string | null;
  procedure_notes: string | null;
  scheduled_date: string | null;
  actual_end_time: string | null;
  created_at: string | null;
  primary_surgeon_id: string | null;
  created_by: string | null;
  findings: string | null;
  post_op_diagnosis: string | null;
  requested_by_name?: string;
}

interface EncounterProcedureRequestRow {
  request_id: string;
  procedure_id: string | null;
  procedure_name: string | null;
  procedure_type: string | null;
  status: string | null;
  priority: string | null;
  clinical_notes: string | null;
  notes: string | null;
  ordered_by: string | null;
  created_at: string | null;
}

interface NormalizedLabResultRow {
  request_id: string;
  result_value: string | null;
  interpretation: string | null;
  comments: string | null;
  reported_at: string | null;
  approved_at: string | null;
  workflow_status: string | null;
  unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean | null;
  is_critical: boolean | null;
}

interface NormalizedScanResultRow {
  request_id: string;
  findings: string | null;
  impression: string | null;
  notes: string | null;
  reported_at: string | null;
  report_date: string | null;
  created_at: string | null;
  workflow_status: string | null;
  extra_fields: PrintableField[];
}

interface EncounterMedicationOrder {
  prescription_id: string;
  drug_id: string | null;
  prescribed_by?: string | null;
  doctor_id?: string | null;
  dosage: string | null;
  dose?: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  quantity_prescribed: number | null;
  quantity_dispensed: number | null;
  instructions: string | null;
  special_instructions?: string | null;
  notes?: string | null;
  status: string | null;
  created_at: string | null;
  drug_name?: string;
  ordered_by_name?: string;
}

interface ClinicalTimelineNote {
  id: string;
  note_text: string;
  created_at: string;
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
  } | null;
}

function orderStatusBadgeClass(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('done'))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('cancel') || s.includes('reject') || s.includes('declin'))
    return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s.includes('process') || s.includes('progress') || s.includes('active'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function normalizeExamStatus(status: string | null | undefined): string {
  return (status || '').toLowerCase().replace(/_/g, ' ').trim();
}

function isCompletedExamStatus(status: string | null | undefined): boolean {
  return normalizeExamStatus(status).includes('complete');
}

function isInProgressExamStatus(status: string | null | undefined): boolean {
  return normalizeExamStatus(status).includes('progress');
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pickLatestByDate<T extends Record<string, any>>(
  rows: T[],
  keySelector: (row: T) => string | null | undefined,
  dateSelector: (row: T) => string | null | undefined,
): Map<string, T> {
  const result = new Map<string, T>();

  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;

    const existing = result.get(key);
    if (!existing) {
      result.set(key, row);
      continue;
    }

    const existingTs = new Date(dateSelector(existing) || 0).getTime();
    const currentTs = new Date(dateSelector(row) || 0).getTime();
    if (Number.isNaN(existingTs) || currentTs > existingTs) {
      result.set(key, row);
    }
  }

  return result;
}

async function resolveEncounterLookupIds(
  encounterId?: string | null,
  visitId?: string | null,
): Promise<{ encounterIds: string[]; visitIds: string[] }> {
  const encounterIds = new Set<string>();
  const visitIds = new Set<string>();

  async function addResolvedVisitLookup(identifier?: string | null) {
    if (!identifier) return;

    if (UUID_REGEX.test(identifier)) {
      encounterIds.add(identifier);

      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_id')
        .eq('id', identifier)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error(
          'Failed to resolve ophthalmology encounter UUID to visit_id:',
          error,
        );
        return;
      }

      if (data?.id) encounterIds.add(data.id);
      if (data?.visit_id) visitIds.add(data.visit_id);
      return;
    }

    visitIds.add(identifier);

    const { data, error } = await supabase
      .from('visits')
      .select('id, visit_id')
      .eq('visit_id', identifier)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(
        'Failed to resolve ophthalmology encounter visit_id to UUID:',
        error,
      );
      return;
    }

    if (data?.id) encounterIds.add(data.id);
    if (data?.visit_id) visitIds.add(data.visit_id);
  }

  await Promise.all([
    addResolvedVisitLookup(encounterId),
    addResolvedVisitLookup(visitId),
  ]);

  return {
    encounterIds: Array.from(encounterIds),
    visitIds: Array.from(visitIds),
  };
}

function mergeUniqueRows<T>(
  rows: T[],
  keySelector: (row: T) => string | null | undefined,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const row of rows) {
    const key = keySelector(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

async function fetchLabResultsByRequestIds(
  requestIds: string[],
): Promise<NormalizedLabResultRow[]> {
  if (requestIds.length === 0) return [];

  const primary = await supabase
    .from('lab_results')
    .select(
      'request_id, result_value, interpretation, comments, reported_at, approved_at, workflow_status, created_at, unit, reference_range, is_abnormal, is_critical',
    )
    .in('request_id', requestIds);

  if (!primary.error) {
    return ((primary.data || []) as Array<any>).map((row) => ({
      request_id: row.request_id,
      result_value: row.result_value != null ? String(row.result_value) : null,
      interpretation: row.interpretation || null,
      comments: row.comments || null,
      reported_at: row.reported_at || row.created_at || null,
      approved_at: row.approved_at || null,
      workflow_status: row.workflow_status || null,
      unit: row.unit || null,
      reference_range: row.reference_range || null,
      is_abnormal: row.is_abnormal ?? null,
      is_critical: row.is_critical ?? null,
    }));
  }

  const legacy = await supabase
    .from('lab_results')
    .select(
      'lab_request_id, result, result_value, interpretation, remarks, upload_date, verified_at, result_status, workflow_status, created_at',
    )
    .in('lab_request_id', requestIds);

  if (legacy.error) {
    console.error(
      'Failed to load ophthalmology lab results from both schema variants:',
      {
        primaryError: primary.error,
        legacyError: legacy.error,
      },
    );
    return [];
  }

  return ((legacy.data || []) as Array<any>).map((row) => ({
    request_id: row.lab_request_id,
    result_value:
      row.result != null
        ? String(row.result)
        : row.result_value != null
          ? String(row.result_value)
          : null,
    interpretation: row.interpretation || null,
    comments: row.remarks || null,
    reported_at: row.upload_date || row.created_at || null,
    approved_at: row.verified_at || null,
    workflow_status: row.workflow_status || row.result_status || null,
    unit: row.unit || null,
    reference_range: row.reference_range || null,
    is_abnormal: row.is_abnormal ?? null,
    is_critical: row.is_critical ?? null,
  }));
}

async function fetchScanResultsByRequestIds(
  requestIds: string[],
): Promise<NormalizedScanResultRow[]> {
  if (requestIds.length === 0) return [];

  const primary = await supabase
    .from('scan_results')
    .select('*')
    .in('request_id', requestIds);

  if (!primary.error) {
    return ((primary.data || []) as Array<any>).map((row) => ({
      request_id: row.request_id || row.scan_request_id,
      findings: row.findings || null,
      impression: row.impression || null,
      notes: row.notes || row.recommendation || null,
      reported_at:
        row.reported_at ||
        row.report_date ||
        row.verified_at ||
        row.created_at ||
        null,
      report_date: row.report_date || row.verified_at || null,
      created_at: row.created_at || null,
      workflow_status:
        row.workflow_status ||
        (row.is_preliminary ? 'Preliminary' : row.urgency || null),
      extra_fields: extractPrintableFields(row as Record<string, unknown>, {
        excludeKeys: [
          'id', 'request_id', 'scan_request_id', 'findings', 'impression',
          'notes', 'recommendation', 'reported_at', 'report_date',
          'created_at', 'workflow_status', 'is_preliminary', 'urgency',
          'reporter', 'verifier', 'request',
        ],
        maxDepth: 3,
      }),
    }));
  }

  const legacy = await supabase
    .from('scan_results')
    .select('*')
    .in('scan_request_id', requestIds);

  if (legacy.error) {
    console.error(
      'Failed to load ophthalmology imaging results from both schema variants:',
      {
        primaryError: primary.error,
        legacyError: legacy.error,
      },
    );
    return [];
  }

  return ((legacy.data || []) as Array<any>).map((row) => ({
    request_id: row.request_id || row.scan_request_id,
    findings: row.findings || null,
    impression: row.impression || null,
    notes: row.notes || row.recommendation || null,
    reported_at:
      row.reported_at ||
      row.report_date ||
      row.verified_at ||
      row.created_at ||
      null,
    report_date: row.report_date || row.verified_at || null,
    created_at: row.created_at || null,
    workflow_status:
      row.workflow_status ||
      (row.is_preliminary ? 'Preliminary' : row.urgency || null),
    extra_fields: extractPrintableFields(row as Record<string, unknown>, {
      excludeKeys: [
        'id', 'request_id', 'scan_request_id', 'findings', 'impression',
        'notes', 'recommendation', 'reported_at', 'report_date',
        'created_at', 'workflow_status', 'is_preliminary', 'urgency',
        'reporter', 'verifier', 'request',
      ],
      maxDepth: 3,
    }),
  }));
}

function clinicalNoteRolePrefix(role: string | null | undefined): string {
  const r = (role || '').toLowerCase();
  if (r.includes('nurse')) return 'Nurse';
  if (r.includes('ophthalmolog')) return 'Ophthalmologist';
  if (r.includes('optometrist') || r.includes('optometry'))
    return 'Optometrist';
  if (
    r.includes('doctor') ||
    r.includes('physician') ||
    r.includes('surgeon') ||
    r.includes('consultant') ||
    r.includes('specialist') ||
    r.includes('medical officer')
  )
    return 'Dr.';
  return '';
}

function clinicalNoteAuthor(note: ClinicalTimelineNote): string {
  const first = note.staff?.first_name?.trim() || '';
  const last = note.staff?.last_name?.trim() || '';
  const fullName =
    [first, last].filter(Boolean).join(' ').trim() || 'Unknown user';
  const rolePrefix = clinicalNoteRolePrefix(note.staff?.role);
  return rolePrefix ? `${rolePrefix} ${fullName}` : fullName;
}

function clinicalNoteTimestamp(createdAt: string | null | undefined): string {
  if (!createdAt) return 'Unknown time';
  try {
    const createdDate = new Date(createdAt);
    return `${format(createdDate, 'dd MMM yyyy, h:mm a')} (${formatDistanceToNow(createdDate, { addSuffix: true })})`;
  } catch {
    return createdAt;
  }
}

// =============================================================================
// Copy Previous Helper — extracts consultant-entry fields from last exam
// =============================================================================

function copyFromPrevious(prev: EyeExamDTO): Partial<EyeExamDTO> {
  return {
    // Anterior segment
    anterior_right_lids: prev.anterior_right_lids,
    anterior_left_lids: prev.anterior_left_lids,
    anterior_right_conjunctiva: prev.anterior_right_conjunctiva,
    anterior_left_conjunctiva: prev.anterior_left_conjunctiva,
    anterior_right_cornea: prev.anterior_right_cornea,
    anterior_left_cornea: prev.anterior_left_cornea,
    anterior_right_ac: prev.anterior_right_ac,
    anterior_left_ac: prev.anterior_left_ac,
    anterior_right_iris: prev.anterior_right_iris,
    anterior_left_iris: prev.anterior_left_iris,
    anterior_right_pupil: prev.anterior_right_pupil,
    anterior_left_pupil: prev.anterior_left_pupil,
    anterior_right_lens: prev.anterior_right_lens,
    anterior_left_lens: prev.anterior_left_lens,
    anterior_right_lens_status: prev.anterior_right_lens_status,
    anterior_left_lens_status: prev.anterior_left_lens_status,
    // Posterior segment
    posterior_right_media: prev.posterior_right_media,
    posterior_left_media: prev.posterior_left_media,
    posterior_right_disc: prev.posterior_right_disc,
    posterior_left_disc: prev.posterior_left_disc,
    posterior_right_cdr: prev.posterior_right_cdr,
    posterior_left_cdr: prev.posterior_left_cdr,
    posterior_right_macula: prev.posterior_right_macula,
    posterior_left_macula: prev.posterior_left_macula,
    posterior_right_foveal_reflex: prev.posterior_right_foveal_reflex,
    posterior_left_foveal_reflex: prev.posterior_left_foveal_reflex,
    posterior_right_vessels: prev.posterior_right_vessels,
    posterior_left_vessels: prev.posterior_left_vessels,
    posterior_right_av_ratio: prev.posterior_right_av_ratio,
    posterior_left_av_ratio: prev.posterior_left_av_ratio,
    posterior_right_periphery: prev.posterior_right_periphery,
    posterior_left_periphery: prev.posterior_left_periphery,
    // Diagnosis (pre-fill for quick update)
    provisional_diagnosis: prev.provisional_diagnosis,
    final_diagnosis: prev.final_diagnosis,
    treatment_plan: prev.treatment_plan,
  };
}

// =============================================================================
// Component
// =============================================================================

export default function OphthalmologyConsultantRecord({
  patientId,
  patientName,
  emrNumber,
  encounterId,
  encounterNumber,
  clinicalRequestId,
  onBack,
}: OphthalmologyConsultantRecordProps) {
  const { staff } = useAuth();
  const { showToast } = useToast();
  const userRole = staff?.role || '';
  const isConsultant = ['doctor', 'medical_director', 'super_admin'].includes(
    userRole,
  );
  const isNurse = userRole === 'nurse';

  // Patient's ophthalmology history
  const {
    data: patientExams = [],
    isLoading,
    refetch: refetchExams,
  } = usePatientEyeExams(patientId);

  // Mutations
  const updateExam = useUpdateEyeExam();
  const createExam = useCreateEyeExam();
  const completeRequestMutation = useCompleteRequest();

  // Selected exam for detail view
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [activeCareTab, setActiveCareTab] = useState<CareTab>('summary');
  const [isExpanded, setIsExpanded] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);
  const [labOrders, setLabOrders] = useState<EncounterLabOrder[]>([]);
  const [imagingOrders, setImagingOrders] = useState<EncounterImagingOrder[]>(
    [],
  );
  const [procedureOrders, setProcedureOrders] = useState<
    EncounterProcedureOrder[]
  >([]);
  const [medicationOrders, setMedicationOrders] = useState<
    EncounterMedicationOrder[]
  >([]);

  // Modals state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'followup' | 'triage'>(
    'followup',
  );
  const [wizardInitialStep, setWizardInitialStep] = useState<
    string | undefined
  >(undefined);
  const [wizardOrdersOnly, setWizardOrdersOnly] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showVisionChart, setShowVisionChart] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [clinicalNoteText, setClinicalNoteText] = useState('');
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [referralCompleted, setReferralCompleted] = useState(false);

  useEffect(() => {
    if (showNoteModal && noteTextareaRef.current)
      noteTextareaRef.current.focus();
  }, [showNoteModal]);

  // Fetch patient demographics
  const { data: patient } = usePatient(patientId);

  // Auto-select the first exam for this encounter, or most recent
  const sortedExams = useMemo(
    () =>
      [...patientExams].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [patientExams],
  );

  const selectedExam = useMemo(
    () =>
      sortedExams.find((e) => e.exam_id === selectedExamId) ||
      sortedExams[0] ||
      null,
    [sortedExams, selectedExamId],
  );

  useEffect(() => {
    if (sortedExams.length === 0) {
      setSelectedExamId(null);
      return;
    }

    const hasCurrentSelection = selectedExamId
      ? sortedExams.some((exam) => exam.exam_id === selectedExamId)
      : false;

    if (hasCurrentSelection) return;

    const encounterMatchedExam = sortedExams.find(
      (exam) => exam.encounter_id === encounterId,
    );
    setSelectedExamId((encounterMatchedExam || sortedExams[0]).exam_id);
  }, [sortedExams, selectedExamId, encounterId]);

  useEffect(() => {
    let cancelled = false;

    async function loadEncounterOrders() {
      const { encounterIds: encounterLookupIds, visitIds: visitLookupIds } =
        await resolveEncounterLookupIds(
          selectedExam?.encounter_id || encounterId,
          encounterId,
        );

      if (encounterLookupIds.length === 0 && visitLookupIds.length === 0) {
        setLabOrders([]);
        setImagingOrders([]);
        setProcedureOrders([]);
        setMedicationOrders([]);
        setOrdersLoading(false);
        return;
      }

      setOrdersLoading(true);

      try {
        const [
          labByEncounterRes,
          labByVisitRes,
          imagingByEncounterRes,
          imagingByVisitRes,
          procedureRes,
          procedureRequestByEncounterRes,
          procedureRequestByVisitRes,
          prescriptionsByEncounterRes,
          prescriptionsByVisitRes,
        ] = await Promise.all([
          encounterLookupIds.length > 0
            ? supabase
                .from('lab_requests')
                .select(
                  'request_id, test_id, status, priority, clinical_notes, created_at, ordered_by',
                )
                .in('encounter_id', encounterLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterLabOrder[] }),
          visitLookupIds.length > 0
            ? supabase
                .from('lab_requests')
                .select(
                  'request_id, test_id, status, priority, clinical_notes, created_at, ordered_by',
                )
                .in('visit_id', visitLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterLabOrder[] }),
          encounterLookupIds.length > 0
            ? supabase
                .from('radiology_requests')
                .select('*')
                .in('encounter_id', encounterLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterImagingOrder[] }),
          visitLookupIds.length > 0
            ? supabase
                .from('radiology_requests')
                .select('*')
                .in('visit_id', visitLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterImagingOrder[] }),
          encounterLookupIds.length > 0
            ? supabase
                .from('procedures')
                .select(
                  'id, procedure_name, procedure_code, status, priority, indication, procedure_notes, scheduled_date, actual_end_time, findings, post_op_diagnosis, created_at, primary_surgeon_id, created_by',
                )
                .in('encounter_id', encounterLookupIds)
                .order('scheduled_date', {
                  ascending: false,
                  nullsFirst: false,
                })
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterProcedureOrder[] }),
          encounterLookupIds.length > 0
            ? supabase
                .from('procedure_requests')
                .select(
                  'request_id, procedure_id, procedure_name, procedure_type, status, priority, clinical_notes, notes, ordered_by, created_at',
                )
                .in('encounter_id', encounterLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterProcedureRequestRow[] }),
          visitLookupIds.length > 0
            ? supabase
                .from('procedure_requests')
                .select(
                  'request_id, procedure_id, procedure_name, procedure_type, status, priority, clinical_notes, notes, ordered_by, created_at',
                )
                .in('visit_id', visitLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterProcedureRequestRow[] }),
          encounterLookupIds.length > 0
            ? supabase
                .from('prescriptions')
                .select('*')
                .in('encounter_id', encounterLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterMedicationOrder[] }),
          visitLookupIds.length > 0
            ? supabase
                .from('prescriptions')
                .select('*')
                .in('visit_id', visitLookupIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as EncounterMedicationOrder[] }),
        ]);

        const rawLabs = mergeUniqueRows(
          [
            ...((labByEncounterRes.data || []) as EncounterLabOrder[]),
            ...((labByVisitRes.data || []) as EncounterLabOrder[]),
          ].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          ),
          (row) => row.request_id,
        );
        const rawImaging = mergeUniqueRows(
          [
            ...((imagingByEncounterRes.data || []) as EncounterImagingOrder[]),
            ...((imagingByVisitRes.data || []) as EncounterImagingOrder[]),
          ].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          ),
          (row) => row.request_id,
        );
        const rawProcedures = (procedureRes.data ||
          []) as EncounterProcedureOrder[];
        const rawProcedureRequests = mergeUniqueRows(
          [
            ...((procedureRequestByEncounterRes.data ||
              []) as EncounterProcedureRequestRow[]),
            ...((procedureRequestByVisitRes.data ||
              []) as EncounterProcedureRequestRow[]),
          ].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          ),
          (row) => row.request_id,
        );
        const rawPrescriptions = mergeUniqueRows(
          [
            ...((prescriptionsByEncounterRes.data ||
              []) as EncounterMedicationOrder[]),
            ...((prescriptionsByVisitRes.data ||
              []) as EncounterMedicationOrder[]),
          ].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          ),
          (row) => row.prescription_id,
        );

        const labRequestIds = Array.from(
          new Set(
            rawLabs
              .map((o) => o.request_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const imagingRequestIds = Array.from(
          new Set(
            rawImaging
              .map((o) => o.request_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        const staffIds = Array.from(
          new Set(
            [
              ...rawLabs.map((o) => o.ordered_by),
              ...rawImaging.map((o) => o.ordered_by),
              ...rawProcedures.map((o) => o.primary_surgeon_id || o.created_by),
              ...rawProcedureRequests.map((o) => o.ordered_by),
              ...rawPrescriptions.map(
                (o) => o.prescribed_by || o.doctor_id || null,
              ),
            ].filter((id): id is string => Boolean(id)),
          ),
        );

        const testIds = Array.from(
          new Set(
            rawLabs
              .map((o) => o.test_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const imagingIds = Array.from(
          new Set(
            rawImaging
              .map((o) => o.imaging_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const procedureCatalogueIds = Array.from(
          new Set(
            rawProcedureRequests
              .map((o) => o.procedure_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const drugIds = Array.from(
          new Set(
            rawPrescriptions
              .map((o) => o.drug_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        const [
          staffRes,
          testsRes,
          imagingCatalogueRes,
          procedureCatalogueRes,
          drugsRes,
          labResultsRows,
          scanResultsRows,
        ] = await Promise.all([
          staffIds.length > 0
            ? supabase
                .from('staff')
                .select('staff_id, first_name, last_name')
                .in('staff_id', staffIds)
            : Promise.resolve({
                data: [] as Array<{
                  staff_id: string;
                  first_name: string | null;
                  last_name: string | null;
                }>,
              }),
          testIds.length > 0
            ? supabase
                .from('lab_test_catalogue')
                .select('id, name, code')
                .in('id', testIds)
            : Promise.resolve({
                data: [] as Array<{
                  id: string;
                  name: string | null;
                  code: string | null;
                }>,
              }),
          imagingIds.length > 0
            ? supabase
                .from('imaging_catalogue')
                .select('id, name, code')
                .in('id', imagingIds)
            : Promise.resolve({
                data: [] as Array<{
                  id: string;
                  name: string | null;
                  code: string | null;
                }>,
              }),
          procedureCatalogueIds.length > 0
            ? supabase
                .from('nhis_procedures')
                .select('id, name, code')
                .in('id', procedureCatalogueIds)
            : Promise.resolve({
                data: [] as Array<{
                  id: string;
                  name: string | null;
                  code: string | null;
                }>,
              }),
          drugIds.length > 0
            ? supabase.from('drug_catalogue').select('*').in('id', drugIds)
            : Promise.resolve({ data: [] as Array<any> }),
          fetchLabResultsByRequestIds(labRequestIds),
          fetchScanResultsByRequestIds(imagingRequestIds),
        ]);

        if (cancelled) return;

        const staffMap = new Map(
          (
            (staffRes.data || []) as Array<{
              staff_id: string;
              first_name: string | null;
              last_name: string | null;
            }>
          ).map((s) => {
            const fullName = [s.first_name, s.last_name]
              .filter(Boolean)
              .join(' ')
              .trim();
            return [
              s.staff_id,
              fullName || `Staff ${s.staff_id.slice(0, 8)}`,
            ] as const;
          }),
        );

        const testMap = new Map(
          (
            (testsRes.data || []) as Array<{
              id: string;
              name: string | null;
              code: string | null;
            }>
          ).map((t) => {
            const label = t.name
              ? `${t.name}${t.code ? ` (${t.code})` : ''}`
              : t.code || t.id;
            return [t.id, label] as const;
          }),
        );

        const imagingMap = new Map(
          (
            (imagingCatalogueRes.data || []) as Array<{
              id: string;
              name: string | null;
              code: string | null;
            }>
          ).map((i) => {
            const label = i.name
              ? `${i.name}${i.code ? ` (${i.code})` : ''}`
              : i.code || i.id;
            return [i.id, label] as const;
          }),
        );

        const procedureCatalogueMap = new Map(
          (
            (procedureCatalogueRes.data || []) as Array<{
              id: string;
              name: string | null;
              code: string | null;
            }>
          ).map((p) => {
            const label = p.name || p.code || p.id;
            return [p.id, { name: label, code: p.code || null }] as const;
          }),
        );

        const drugMap = new Map(
          ((drugsRes.data || []) as Array<any>).map((d) => {
            const label =
              d.drug_name ||
              d.name ||
              d.generic_name ||
              d.brand_name ||
              d.drug_code ||
              d.code ||
              d.id;
            return [d.id, label] as const;
          }),
        );

        const labResultMap = pickLatestByDate(
          labResultsRows,
          (lr) => lr.request_id,
          (lr) => lr.reported_at || lr.approved_at,
        );

        const scanResultMap = pickLatestByDate(
          scanResultsRows,
          (sr) => sr.request_id,
          (sr) => sr.reported_at || sr.report_date || sr.created_at,
        );

        setLabOrders(
          rawLabs.map((o) => ({
            ...o,
            test_name:
              (o.test_id && testMap.get(o.test_id)) || o.test_id || 'Lab Test',
            ordered_by_name:
              (o.ordered_by && staffMap.get(o.ordered_by)) ||
              'Unknown clinician',
            lab_result_value:
              labResultMap.get(o.request_id)?.result_value || null,
            lab_result_status:
              labResultMap.get(o.request_id)?.workflow_status || null,
            lab_result_interpretation:
              labResultMap.get(o.request_id)?.interpretation || null,
            lab_result_comments:
              labResultMap.get(o.request_id)?.comments || null,
            lab_result_reported_at:
              labResultMap.get(o.request_id)?.reported_at ||
              labResultMap.get(o.request_id)?.approved_at ||
              null,
            lab_result_unit:
              labResultMap.get(o.request_id)?.unit || null,
            lab_result_reference_range:
              labResultMap.get(o.request_id)?.reference_range || null,
            lab_result_is_abnormal:
              labResultMap.get(o.request_id)?.is_abnormal ?? null,
            lab_result_is_critical:
              labResultMap.get(o.request_id)?.is_critical ?? null,
          })),
        );

        setImagingOrders(
          rawImaging.map((o) => ({
            ...o,
            notes: o.notes || o.clinical_history || null,
            imaging_name:
              (o.imaging_id && imagingMap.get(o.imaging_id)) ||
              o.imaging_type ||
              o.imaging_id ||
              'Imaging study',
            ordered_by_name:
              (o.ordered_by && staffMap.get(o.ordered_by)) ||
              'Unknown clinician',
            result_findings: scanResultMap.get(o.request_id)?.findings || null,
            result_impression:
              scanResultMap.get(o.request_id)?.impression || null,
            result_notes: scanResultMap.get(o.request_id)?.notes || null,
            result_reported_at:
              scanResultMap.get(o.request_id)?.reported_at ||
              scanResultMap.get(o.request_id)?.report_date ||
              scanResultMap.get(o.request_id)?.created_at ||
              null,
            result_status:
              scanResultMap.get(o.request_id)?.workflow_status || null,
            result_extra_fields:
              scanResultMap.get(o.request_id)?.extra_fields || [],
          })),
        );

        setProcedureOrders(
          [
            ...rawProcedureRequests.map((o) => {
              const requestedById = o.ordered_by;
              const catalogue = o.procedure_id
                ? procedureCatalogueMap.get(o.procedure_id)
                : undefined;
              return {
                id: o.request_id,
                procedure_name:
                  o.procedure_name ||
                  catalogue?.name ||
                  o.procedure_type ||
                  'Procedure Request',
                procedure_code: catalogue?.code || o.procedure_id,
                status: o.status,
                priority: o.priority,
                indication: o.clinical_notes,
                procedure_notes: o.notes,
                scheduled_date: null,
                actual_end_time: null,
                created_at: o.created_at,
                primary_surgeon_id: null,
                created_by: o.ordered_by,
                findings: null,
                post_op_diagnosis: null,
                requested_by_name:
                  (requestedById && staffMap.get(requestedById)) ||
                  'Unknown clinician',
              } as EncounterProcedureOrder;
            }),
            ...rawProcedures.map((o) => {
              const requestedById = o.primary_surgeon_id || o.created_by;
              return {
                ...o,
                requested_by_name:
                  (requestedById && staffMap.get(requestedById)) ||
                  'Unknown clinician',
              };
            }),
          ].sort((a, b) => {
            const aTs = new Date(
              a.scheduled_date || a.created_at || 0,
            ).getTime();
            const bTs = new Date(
              b.scheduled_date || b.created_at || 0,
            ).getTime();
            return bTs - aTs;
          }),
        );

        setMedicationOrders(
          rawPrescriptions.map((o) => {
            const prescribedBy = o.prescribed_by || o.doctor_id || null;
            return {
              ...o,
              dose: o.dose || o.dosage || null,
              instructions: o.instructions || o.notes || null,
              special_instructions: o.special_instructions || o.notes || null,
              drug_name: (o.drug_id && drugMap.get(o.drug_id)) || 'Medication',
              ordered_by_name:
                (prescribedBy && staffMap.get(prescribedBy)) ||
                'Unknown clinician',
            };
          }),
        );
      } catch (error) {
        console.error('Failed to load ophthalmology encounter orders:', error);
        if (!cancelled) {
          setLabOrders([]);
          setImagingOrders([]);
          setProcedureOrders([]);
          setMedicationOrders([]);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }

    loadEncounterOrders();

    return () => {
      cancelled = true;
    };
  }, [selectedExam?.encounter_id, encounterId, ordersRefreshToken]);

  // Addendums for the selected exam's notes (must be after selectedExam)
  const { data: clinicalNotes = [] } = useConsultationAddendums(
    selectedExam?.exam_id,
  );
  const addNoteMutation = useAddConsultationAddendum();

  // Get the previous exam (for "copy previous" feature)
  const previousExam = useMemo(() => {
    if (!selectedExam) return undefined;
    const idx = sortedExams.findIndex(
      (e) => e.exam_id === selectedExam.exam_id,
    );
    return idx >= 0 && idx < sortedExams.length - 1
      ? sortedExams[idx + 1]
      : undefined;
  }, [sortedExams, selectedExam]);

  // Handlers
  const handleSelectExam = useCallback((exam: EyeExamDTO) => {
    setSelectedExamId(exam.exam_id);
  }, []);

  const handleSaveExam = useCallback(
    async (data: UpdateEyeExamDTO) => {
      if (!selectedExam) return;
      await updateExam.mutateAsync({
        examId: selectedExam.exam_id,
        input: data,
      });
      refetchExams();
      if (clinicalRequestId && !referralCompleted) {
        try {
          await completeRequestMutation.mutateAsync({
            id: clinicalRequestId,
            completion: { reviewed_by: staff?.id || '' },
          });
          setReferralCompleted(true);
        } catch (error) {
          console.error('Failed to complete referral request:', error);
          showToast({
            title: 'Referral Update Failed',
            message:
              'Exam saved, but the referral could not be marked complete.',
            type: 'warning',
          });
        }
      }
    },
    [
      selectedExam,
      updateExam,
      refetchExams,
      clinicalRequestId,
      referralCompleted,
      completeRequestMutation,
      staff?.id,
      showToast,
    ],
  );

  const handleAddFollowUp = () => {
    setWizardMode('followup');
    setWizardInitialStep(undefined);
    setWizardOrdersOnly(false);
    setShowWizard(true);
  };

  const handleStartTriage = () => {
    setWizardMode('triage');
    setWizardInitialStep(undefined);
    setWizardOrdersOnly(false);
    setShowWizard(true);
  };

  const handleOpenOrders = () => {
    setWizardMode('followup');
    setWizardInitialStep('orders');
    setWizardOrdersOnly(true);
    setShowWizard(true);
  };

  const handleWizardSave = async (
    data: CreateEyeExamDTO | UpdateEyeExamDTO,
    orders?: SpecialtyOrdersPayload,
  ) => {
    try {
      const examIdFromPayload = (data as any).exam_id as string | undefined;
      const fallbackExam =
        selectedExam ||
        sortedExams.find(
          (e) =>
            e.encounter_id === encounterId && !isCompletedExamStatus(e.status),
        ) ||
        sortedExams.find((e) => e.encounter_id === encounterId) ||
        undefined;
      const targetExamId = examIdFromPayload || fallbackExam?.exam_id;
      const targetExam = examIdFromPayload
        ? sortedExams.find((e) => e.exam_id === examIdFromPayload) ||
          (selectedExam?.exam_id === examIdFromPayload
            ? selectedExam
            : undefined)
        : fallbackExam;

      const canUpdateTargetExam =
        Boolean(targetExamId) &&
        targetExam &&
        !isCompletedExamStatus(targetExam.status);
      const shouldReuseCompletedExamForOrdersOnly = Boolean(
        wizardOrdersOnly &&
        targetExam &&
        isCompletedExamStatus(targetExam.status),
      );

      let savedExam: EyeExamDTO;
      if (canUpdateTargetExam) {
        savedExam = await updateExam.mutateAsync({
          examId: targetExamId || '',
          input: data as UpdateEyeExamDTO,
        });
      } else if (shouldReuseCompletedExamForOrdersOnly && targetExam) {
        savedExam = targetExam;
      } else {
        savedExam = await createExam.mutateAsync(data as CreateEyeExamDTO);
      }

      if (!savedExam) {
        throw new Error('Unable to resolve saved exam for this encounter.');
      }

      let requestSummary = '';
      if (orders) {
        const orderSelectionCount =
          (orders.labOrders?.length || 0) +
          (orders.radiologyOrders?.length || 0) +
          (orders.prescriptions?.length || 0) +
          (orders.procedureOrders?.length || 0) +
          Object.values(orders.specialtyReferrals || {}).filter(
            (ref) => ref.selected,
          ).length;

        if (orderSelectionCount > 0) {
          try {
            const submitted = await submitSpecialtyOrdersAndReferrals({
              patientPublicId: savedExam.patient_id,
              encounterId: savedExam.encounter_id,
              orderedByStaffId: staff?.staff_id || '',
              orderedByStaffUuid: staff?.id,
              currentSpecialty: 'ophthalmology',
              orders,
              consultationId:
                (savedExam as any).consultation_id ||
                (data as any).consultation_id,
              diagnosisText:
                savedExam.final_diagnosis ||
                savedExam.provisional_diagnosis ||
                '',
              clinicalFindings: [
                savedExam.chief_complaint,
                savedExam.ocular_history,
                savedExam.treatment_plan,
              ]
                .filter(Boolean)
                .join('; '),
              patientName,
              patientEmrNumber: emrNumber,
            });

            const sentCount =
              submitted.labCount +
              submitted.imagingCount +
              submitted.prescriptionCount +
              submitted.procedureCount +
              submitted.referralCount;

            if (sentCount > 0) {
              requestSummary = ` ${sentCount} request(s) sent.`;
              setOrdersRefreshToken((v) => v + 1);
            }
          } catch (orderError) {
            console.error(
              'Failed to submit ophthalmology orders/referrals:',
              orderError,
            );
            showToast({
              title: 'Orders Not Sent',
              message:
                'Visit was saved, but one or more Orders & Services requests could not be sent.',
              type: 'warning',
            });
          }
        }
      }

      showToast({
        title: wizardMode === 'triage' ? 'Triage Saved' : 'Follow-Up Created',
        message:
          wizardMode === 'triage'
            ? `Triage data recorded. Patient is ready for consultant review.${requestSummary}`
            : `New follow-up visit added to the patient timeline.${requestSummary}`,
        type: 'success',
      });
      setShowWizard(false);
      refetchExams();
      if (clinicalRequestId && !referralCompleted) {
        try {
          await completeRequestMutation.mutateAsync({
            id: clinicalRequestId,
            completion: { reviewed_by: staff?.id || '' },
          });
          setReferralCompleted(true);
        } catch (error) {
          console.error('Failed to complete referral request:', error);
          showToast({
            title: 'Referral Update Failed',
            message:
              'Exam saved, but the referral could not be marked complete.',
            type: 'warning',
          });
        }
      }
    } catch (err) {
      showToast({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save',
        type: 'error',
      });
    }
  };

  // Determine exam mode for the wizard
  const examMode: EyeExamMode = wizardMode === 'triage' ? 'triage' : 'full';

  // Check if this encounter already has a triaged exam
  const hasTriageForEncounter = sortedExams.some(
    (e) => e.encounter_id === encounterId && isInProgressExamStatus(e.status),
  );
  const hasExamForEncounter = sortedExams.some(
    (e) => e.encounter_id === encounterId,
  );

  const careTabItems: Array<{
    id: CareTab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }> = [
    { id: 'summary', label: 'Summary', icon: Activity },
    { id: 'care-vitals', label: 'Care & Vitals', icon: Eye },
    { id: 'doctor-notes', label: 'Doctor Notes', icon: FileText },
    { id: 'treatment-plan', label: 'Treatment Plan', icon: Send },
    {
      id: 'lab-orders',
      label: 'Lab Orders',
      icon: FileText,
      count: labOrders.length,
    },
    {
      id: 'imaging-orders',
      label: 'Imaging Orders',
      icon: Eye,
      count: imagingOrders.length,
    },
    {
      id: 'procedure-orders',
      label: 'Procedure Orders',
      icon: Scissors,
      count: procedureOrders.length,
    },
    {
      id: 'medications',
      label: 'Medications',
      icon: Pill,
      count:
        medicationOrders.length + (selectedExam?.prescriptions?.length || 0),
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      count: sortedExams.length,
    },
    {
      id: 'addendum',
      label: 'Addendum',
      icon: PenLine,
      count: clinicalNotes.length,
    },
  ];

  // =============================================================================
  // Loading state
  // =============================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // =============================================================================
  // Helper: calculate age
  // =============================================================================
  const patientAge = patient?.date_of_birth
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  // =============================================================================
  // Render
  // =============================================================================
  // Patient initials for sidebar avatar
  const initials = patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Ophthalmology encounter theme (matches the one in SpecialtyConsultationTimeline)
  const ophthalmologyTheme: EncounterDetailTheme = {
    primary: 'bg-sky-700',
    primaryHover: 'hover:bg-sky-800',
    text: 'text-sky-900',
    softBg: 'bg-sky-50',
    softBorder: 'border-sky-200',
    sidebarDot: 'bg-sky-600',
    priorityFrom: 'from-sky-700',
    priorityTo: 'to-indigo-600',
    complaintCardAccent: 'border-sky-200',
  };

  // Sidebar jump-to sections
  const jumpToItems = [
    { id: 'summary', label: 'Summary' },
    { id: 'care-vitals', label: 'Care & Vitals' },
    { id: 'doctor-notes', label: 'Doctor Notes' },
    { id: 'treatment-plan', label: 'Treatment Plan' },
    { id: 'lab-orders', label: 'Lab Orders', count: labOrders.length },
    { id: 'imaging-orders', label: 'Imaging Orders', count: imagingOrders.length },
    { id: 'procedure-orders', label: 'Procedure Orders', count: procedureOrders.length },
    { id: 'medications', label: 'Medications', count: medicationOrders.length + (selectedExam?.prescriptions?.length || 0) },
    { id: 'history', label: 'History', count: sortedExams.length },
    { id: 'addendum', label: 'Addendum', count: clinicalNotes.length },
  ];

  // Encounter options for the selector
  const encounterOptions = sortedExams.map((exam, index) => {
    const examDate = exam.created_at
      ? format(new Date(exam.created_at), 'dd MMM yyyy')
      : 'Unknown date';
    const encounterLabel =
      exam.encounter?.encounter_number ||
      (exam.encounter_id
        ? `ENC-${exam.encounter_id.slice(0, 8).toUpperCase()}`
        : `Visit ${sortedExams.length - index}`);
    return {
      id: exam.exam_id,
      label: `${examDate} | ${encounterLabel}`,
    };
  });

  // Diagnosis codes from selected exam
  const diagnosisCodes = selectedExam?.provisional_diagnosis
    ? [{ code: selectedExam.provisional_diagnosis, isPrimary: true }]
    : [];

  // =============================================================================
  // Render — Uses the shared EncounterDetailLayout (same as all 18 specialty clinics)
  // =============================================================================
  return (
    <>
    <EncounterDetailLayout
      mode="fullpage"
      patientName={patientName}
      emrNumber={emrNumber}
      initials={initials}
      specialtyName="Ophthalmology"
      theme={ophthalmologyTheme}
      encounterDate={
        selectedExam?.created_at
          ? format(new Date(selectedExam.created_at), 'MMM d, yyyy · h:mm a')
          : undefined
      }
      visitId={encounterNumber}
      status={selectedExam?.status || 'Active'}
      statusBadgeClass="bg-emerald-100 text-emerald-700 border-emerald-300"
      subtitle={`Eye Clinic · ${patientName}`}
      diagnosisCodes={diagnosisCodes}
      jumpToItems={jumpToItems}
      activeJumpToId={activeCareTab}
      onJumpTo={(id) => setActiveCareTab(id as CareTab)}
      sidebarExtra={
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">Triage</p>
          <ClinicTriageDisplay
            encounterId={encounterId}
            clinicType="ophthalmology"
            compact
          />
        </div>
      }
      sidebarFooter={
        patient ? (
          <div className="px-3 py-2 border-t border-slate-200/80 space-y-1">
            {patient.date_of_birth && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                {format(new Date(patient.date_of_birth), 'dd MMM yyyy')}
                {patientAge != null && <span className="font-bold text-slate-600">({patientAge} yrs)</span>}
              </p>
            )}
            {patient.contact_phone && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400" />
                {patient.contact_phone}
              </p>
            )}
            {patient.blood_group && (
              <p className="text-[11px] font-bold text-red-600">Blood: {patient.blood_group}</p>
            )}
            {patient.known_allergies && patient.known_allergies.length > 0 && (
              <p className="text-[11px] font-bold text-amber-700">Allergies: {patient.known_allergies.join(', ')}</p>
            )}
          </div>
        ) : undefined
      }
      onPrint={() => window.print()}
      onClose={onBack}
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
      headerActions={
        <>
          {isNurse && !hasExamForEncounter && (
            <button
              onClick={handleStartTriage}
              className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Start Triage
            </button>
          )}
          {isConsultant && (
            <button
              onClick={handleAddFollowUp}
              className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Follow-Up
            </button>
          )}
          {isConsultant && (
            <button
              onClick={() => setShowNoteModal(true)}
              disabled={!selectedExam}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border border-slate-200 bg-white ${ophthalmologyTheme.text} hover:bg-slate-50 shadow-sm disabled:opacity-50`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              + Addendum Note
            </button>
          )}
          <ConsultantQuickActions
            isConsultant={isConsultant}
            onAddFollowUp={handleAddFollowUp}
            onAddNote={() => setShowNoteModal(true)}
            onOpenOrders={handleOpenOrders}
            onCompareVisits={() => setShowComparison(true)}
            onViewVisionChart={() => setShowVisionChart(true)}
          />
        </>
      }
      updatesCount={clinicalNotes.length}
      encounterOptions={encounterOptions}
      selectedEncounterId={selectedExam?.exam_id || ''}
      onSelectEncounter={(id) => {
        const exam = sortedExams.find((item) => item.exam_id === id);
        if (exam) handleSelectExam(exam);
      }}
      workspaceTabs={careTabItems}
      activeTabId={activeCareTab}
      onChangeTab={(id) => setActiveCareTab(id as CareTab)}
    >
              {!selectedExam ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="h-7 w-7 text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                No Examination Selected
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {sortedExams.length === 0
                  ? 'No examinations yet. Start a triage or examination from the queue.'
                  : 'Select an examination from the history tab.'}
              </p>
            </div>
          ) : activeCareTab === 'summary' ? (
            <div className="h-full overflow-y-auto">
              <EncounterDetailPanel
                exam={selectedExam}
                userRole={userRole}
                onSave={handleSaveExam}
                onCopyFromPrevious={
                  previousExam
                    ? () => copyFromPrevious(previousExam)
                    : undefined
                }
                previousExam={previousExam}
                useInternalScroll={false}
                clinicalTimelineNotes={clinicalNotes as ClinicalTimelineNote[]}
              />
            </div>
          ) : activeCareTab === 'care-vitals' ? (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  Visual Acuity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      Right Eye (OD)
                    </p>
                    <p className="font-semibold text-slate-800">
                      Unaided: {selectedExam.va_right_unaided || '—'} | Aided:{' '}
                      {selectedExam.va_right_aided || '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      Left Eye (OS)
                    </p>
                    <p className="font-semibold text-slate-800">
                      Unaided: {selectedExam.va_left_unaided || '—'} | Aided:{' '}
                      {selectedExam.va_left_aided || '—'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  IOP & Pressure Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-red-50 rounded border border-red-100">
                    <p className="text-xs text-red-600 uppercase font-bold">
                      IOP Right
                    </p>
                    <p className="font-semibold text-slate-800">
                      {selectedExam.iop_right ?? '—'} mmHg
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded border border-red-100">
                    <p className="text-xs text-red-600 uppercase font-bold">
                      IOP Left
                    </p>
                    <p className="font-semibold text-slate-800">
                      {selectedExam.iop_left ?? '—'} mmHg
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      Method
                    </p>
                    <p className="font-semibold text-slate-800">
                      {selectedExam.iop_method || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCareTab === 'doctor-notes' ? (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  Clinical Notes
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-600">
                      Chief Complaint:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.chief_complaint || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Ocular History:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.ocular_history || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Systemic History:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.systemic_history || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Family History:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.family_history || '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Addendum Notes
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNoteModal(true)}
                  >
                    Open Notes
                  </Button>
                </div>
                {clinicalNotes.length > 0 ? (
                  <div className="space-y-2">
                    {(clinicalNotes as ClinicalTimelineNote[])
                      .slice(0, 5)
                      .map((note) => (
                        <div
                          key={note.id}
                          className="p-3 bg-teal-50 border border-teal-100 rounded-lg"
                        >
                          <p className="text-xs font-semibold text-teal-700 mb-1">
                            {clinicalNoteAuthor(note)}
                          </p>
                          <p className="text-sm text-slate-800">
                            {note.note_text}
                          </p>
                          <p className="text-[11px] text-teal-500 mt-1">
                            {clinicalNoteTimestamp(note.created_at)}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No addendum notes yet.
                  </p>
                )}
              </div>
            </div>
          ) : activeCareTab === 'treatment-plan' ? (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  Diagnosis & Plan
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-600">
                      Provisional Diagnosis:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.provisional_diagnosis || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Final Diagnosis:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.final_diagnosis || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Treatment Plan:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.treatment_plan || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">
                      Follow-Up:
                    </span>{' '}
                    <span className="text-slate-800">
                      {selectedExam.follow_up_interval || '—'}{' '}
                      {selectedExam.follow_up_date
                        ? `(${selectedExam.follow_up_date})`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCareTab === 'lab-orders' ? (
            <div className="h-full overflow-y-auto p-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Lab Orders Requested by Doctors
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {ordersLoading ? (
                    <p className="text-sm text-slate-500">
                      Loading lab orders...
                    </p>
                  ) : labOrders.length > 0 ? (
                    labOrders.map((order) => {
                      const isCritical = Boolean(order.lab_result_is_critical);
                      const isAbnormal = Boolean(order.lab_result_is_abnormal);
                      const hasLabResult = Boolean(order.lab_result_value || order.lab_result_interpretation || order.lab_result_comments);
                      return (
                      <div
                        key={order.request_id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Header bar */}
                        <div className="px-4 py-2.5 bg-indigo-50/60 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {order.test_name || 'Lab test'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCritical && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-600 text-white border border-red-700">CRITICAL</span>
                            )}
                            {isAbnormal && !isCritical && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">ABNORMAL</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${orderStatusBadgeClass(order.status)}`}>
                              {order.status || 'Pending'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              hasLabResult ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {hasLabResult ? 'Result Available' : 'Awaiting Result'}
                            </span>
                          </div>
                        </div>
                        {/* Meta row */}
                        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {order.priority && <span>Priority: <span className="font-medium text-slate-700">{order.priority}</span></span>}
                          <span>Requested by: <span className="font-medium text-slate-700">{order.ordered_by_name || 'Unknown clinician'}</span></span>
                          {order.created_at && <span>{format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}</span>}
                        </div>
                        {/* Clinical notes */}
                        {order.clinical_notes && (
                          <div className="px-4 py-2 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Notes</p>
                            <p className="text-sm text-slate-700 whitespace-pre-line">{order.clinical_notes}</p>
                          </div>
                        )}
                        {/* Result section */}
                        {hasLabResult && (
                          <div className={`px-4 py-4 space-y-3 ${isCritical ? 'bg-gradient-to-b from-red-50/50 to-white' : isAbnormal ? 'bg-gradient-to-b from-amber-50/50 to-white' : 'bg-gradient-to-b from-emerald-50/50 to-white'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500' : isAbnormal ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <p className={`text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-800' : isAbnormal ? 'text-amber-800' : 'text-emerald-800'}`}>Lab Result</p>
                              </div>
                              {order.lab_result_reported_at && (
                                <span className="text-[11px] text-slate-400">{format(new Date(order.lab_result_reported_at), 'dd MMM yyyy, h:mm a')}</span>
                              )}
                            </div>
                            {order.lab_result_value && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Value</p>
                                </div>
                                <div className="px-3 py-2.5 flex items-baseline gap-2 flex-wrap">
                                  <span className={`text-lg font-bold ${isCritical ? 'text-red-700' : isAbnormal ? 'text-amber-700' : 'text-slate-900'}`}>
                                    {order.lab_result_value}
                                  </span>
                                  {order.lab_result_unit && (
                                    <span className="text-sm text-slate-500 font-medium">{order.lab_result_unit}</span>
                                  )}
                                  {order.lab_result_reference_range && (
                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                      Ref: {order.lab_result_reference_range}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {order.lab_result_interpretation && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Interpretation</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{order.lab_result_interpretation}</p>
                                </div>
                              </div>
                            )}
                            {order.lab_result_comments && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Notes</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{order.lab_result_comments}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      No lab orders found for this encounter.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : activeCareTab === 'imaging-orders' ? (
            <div className="h-full overflow-y-auto p-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Imaging Orders Requested by Doctors
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {ordersLoading ? (
                    <p className="text-sm text-slate-500">
                      Loading imaging orders...
                    </p>
                  ) : imagingOrders.length > 0 ? (
                    imagingOrders.map((order) => {
                      const hasImagingResult = Boolean(
                        order.result_findings || order.result_impression || order.result_notes ||
                        order.result_reported_at || order.result_status ||
                        (order.result_extra_fields && order.result_extra_fields.length > 0),
                      );
                      return (
                      <div
                        key={order.request_id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Header bar */}
                        <div className="px-4 py-2.5 bg-amber-50/60 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {order.imaging_name || 'Imaging study'}
                            </p>
                            {(order.body_part || order.imaging_type) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[order.body_part, order.imaging_type].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${orderStatusBadgeClass(order.status)}`}>
                              {order.status || 'Pending'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              hasImagingResult ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {hasImagingResult ? order.result_status || 'Report Available' : 'Awaiting Report'}
                            </span>
                          </div>
                        </div>
                        {/* Meta row */}
                        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {order.priority && <span>Priority: <span className="font-medium text-slate-700">{order.priority}</span></span>}
                          <span>Requested by: <span className="font-medium text-slate-700">{order.ordered_by_name || 'Unknown clinician'}</span></span>
                          {order.created_at && <span>{format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}</span>}
                        </div>
                        {/* Clinical indication */}
                        {(order.clinical_indication || order.notes) && (
                          <div className="px-4 py-2 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Indication</p>
                            <p className="text-sm text-slate-700 whitespace-pre-line">{order.clinical_indication || order.notes}</p>
                          </div>
                        )}
                        {/* Report section */}
                        {hasImagingResult && (
                          <div className="px-4 py-4 bg-gradient-to-b from-sky-50/50 to-white space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-500" />
                                <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Radiology Report</p>
                              </div>
                              {order.result_reported_at && (
                                <span className="text-[11px] text-slate-400">
                                  {format(new Date(order.result_reported_at), 'dd MMM yyyy, h:mm a')}
                                </span>
                              )}
                            </div>
                            {order.result_findings && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Findings</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{order.result_findings}</p>
                                </div>
                              </div>
                            )}
                            {order.result_impression && (
                              <div className="rounded-lg border-2 border-sky-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-sky-50 border-b border-sky-200">
                                  <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Impression</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-900 font-semibold whitespace-pre-line leading-relaxed">{order.result_impression}</p>
                                </div>
                              </div>
                            )}
                            {order.result_notes && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Notes</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{order.result_notes}</p>
                                </div>
                              </div>
                            )}
                            {order.result_extra_fields && order.result_extra_fields.length > 0 && (
                              <div className="space-y-2 pt-1">
                                {order.result_extra_fields.map((field) => (
                                  <div key={field.key} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</p>
                                    </div>
                                    <div className="px-3 py-2">
                                      <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{field.value}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      No imaging orders found for this encounter.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : activeCareTab === 'procedure-orders' ? (
            <div className="h-full overflow-y-auto p-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Procedure Orders Requested by Doctors
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {ordersLoading ? (
                    <p className="text-sm text-slate-500">
                      Loading procedure orders...
                    </p>
                  ) : procedureOrders.length > 0 ? (
                    procedureOrders.map((order) => {
                      const hasResult = Boolean(order.findings || order.post_op_diagnosis);
                      return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Header bar */}
                        <div className="px-4 py-2.5 bg-emerald-50/60 flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {order.procedure_name || order.procedure_code || 'Procedure'}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${orderStatusBadgeClass(order.status)}`}>
                              {order.status || 'Pending'}
                            </span>
                            {hasResult && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-violet-100 text-violet-700 border-violet-200">
                                Result Available
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Meta row */}
                        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {order.priority && <span>Priority: <span className="font-medium text-slate-700">{order.priority}</span></span>}
                          <span>Requested by: <span className="font-medium text-slate-700">{order.requested_by_name || 'Unknown clinician'}</span></span>
                          {(order.scheduled_date || order.created_at) && (
                            <span>{format(new Date(order.scheduled_date || order.created_at || ''), 'dd MMM yyyy, h:mm a')}</span>
                          )}
                        </div>
                        {/* Indication */}
                        {(order.indication || order.procedure_notes) && (
                          <div className="px-4 py-2 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Indication</p>
                            <p className="text-sm text-slate-700 whitespace-pre-line">{order.indication || order.procedure_notes}</p>
                          </div>
                        )}
                        {/* Result section */}
                        {hasResult && (
                          <div className="px-4 py-4 bg-gradient-to-b from-violet-50/50 to-white space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500" />
                                <p className="text-xs font-bold uppercase tracking-wider text-violet-800">Procedure Result</p>
                              </div>
                              {order.actual_end_time && (
                                <span className="text-[11px] text-slate-400">{format(new Date(order.actual_end_time), 'dd MMM yyyy, h:mm a')}</span>
                              )}
                            </div>
                            {order.findings && (
                              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Findings</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{order.findings}</p>
                                </div>
                              </div>
                            )}
                            {order.post_op_diagnosis && (
                              <div className="rounded-lg border-2 border-violet-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-violet-50 border-b border-violet-200">
                                  <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Post-op Diagnosis</p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="text-sm text-slate-900 font-semibold whitespace-pre-line leading-relaxed">{order.post_op_diagnosis}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      No procedure orders found for this encounter.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : activeCareTab === 'medications' ? (
            <div className="h-full overflow-y-auto p-5">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Medication Orders Requested by Doctors
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {ordersLoading ? (
                      <p className="text-sm text-slate-500">
                        Loading medication orders...
                      </p>
                    ) : medicationOrders.length > 0 ? (
                      medicationOrders.map((order) => (
                        <div
                          key={order.prescription_id}
                          className="p-3 border border-slate-200 rounded-lg bg-white"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {order.drug_name || 'Medication'}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${orderStatusBadgeClass(order.status)}`}
                            >
                              {order.status || 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {order.route ? `Route: ${order.route} • ` : ''}
                            {order.quantity_prescribed != null
                              ? `Qty Prescribed: ${order.quantity_prescribed} • `
                              : ''}
                            {order.quantity_dispensed != null
                              ? `Qty Dispensed: ${order.quantity_dispensed} • `
                              : ''}
                            Requested by:{' '}
                            {order.ordered_by_name || 'Unknown clinician'}
                            {order.created_at
                              ? ` • ${format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}`
                              : ''}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {[
                              order.dosage || order.dose,
                              order.frequency,
                              order.duration,
                            ]
                              .filter(Boolean)
                              .join(' • ') ||
                              'No dosage instructions recorded.'}
                          </p>
                          {(order.instructions ||
                            order.special_instructions) && (
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">
                              {order.instructions || order.special_instructions}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No medication orders found for this encounter.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Exam-Specific Medications
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {(selectedExam.prescriptions || []).length > 0 ? (
                      (selectedExam.prescriptions || []).map(
                        (rx: any, idx: number) => (
                          <div
                            key={rx.prescription_id || rx.id || idx}
                            className="p-3 border border-slate-200 rounded-lg bg-white"
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {rx.drug_name ||
                                rx.medication_name ||
                                'Medication'}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {rx.dosage || '—'} {rx.frequency || ''}{' '}
                              {rx.duration ? `for ${rx.duration}` : ''}
                            </p>
                            {rx.instructions && (
                              <p className="text-xs text-slate-500 mt-1">
                                {rx.instructions}
                              </p>
                            )}
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-sm text-slate-500">
                        No exam-specific medications recorded for this exam.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeCareTab === 'history' ? (
            <div className="h-full flex overflow-hidden">
              <div className="w-[230px] flex-shrink-0 border-r border-slate-200 bg-white overflow-hidden">
                <EncounterTimeline
                  exams={sortedExams}
                  selectedExamId={selectedExam?.exam_id}
                  onSelectExam={handleSelectExam}
                />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <EncounterDetailPanel
                  exam={selectedExam}
                  userRole={userRole}
                  onSave={handleSaveExam}
                  onCopyFromPrevious={
                    previousExam
                      ? () => copyFromPrevious(previousExam)
                      : undefined
                  }
                  previousExam={previousExam}
                  clinicalTimelineNotes={
                    clinicalNotes as ClinicalTimelineNote[]
                  }
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-5">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Addendum Timeline
                  </h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowNoteModal(true)}
                  >
                    Add Note
                  </Button>
                </div>
                {clinicalNotes.length > 0 ? (
                  <div className="space-y-2">
                    {(clinicalNotes as ClinicalTimelineNote[]).map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-teal-50 border border-teal-100 rounded-lg"
                      >
                        <p className="text-xs font-semibold text-teal-700 mb-1">
                          {clinicalNoteAuthor(note)}
                        </p>
                        <p className="text-sm text-slate-800">
                          {note.note_text}
                        </p>
                        <p className="text-[11px] text-teal-500 mt-1">
                          {clinicalNoteTimestamp(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No addendum notes yet.
                  </p>
                )}
              </div>
            </div>
          )}
    </EncounterDetailLayout>

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}

      {/* Follow-Up / Triage / Orders Wizard Modal */}
      {showWizard && (
        <Modal
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          title={
            wizardInitialStep === 'orders'
              ? 'Orders & Services'
              : wizardMode === 'triage'
                ? 'Ophthalmic Triage'
                : 'New Follow-Up Visit'
          }
          size="max"
          allowMaximize
          showCloseButton
          noPadding
        >
          <EyeExamWizard
            patientId={patientId}
            emrNumber={emrNumber}
            encounterId={encounterId}
            patientName={patientName}
            encounterNumber={encounterNumber}
            mode={examMode}
            initialStepId={wizardInitialStep}
            ordersOnly={wizardOrdersOnly}
            existingExam={
              wizardOrdersOnly
                ? selectedExam ||
                  sortedExams.find((e) => e.encounter_id === encounterId)
                : wizardMode === 'followup' && hasTriageForEncounter
                  ? sortedExams.find(
                      (e) =>
                        e.encounter_id === encounterId &&
                        isInProgressExamStatus(e.status),
                    )
                  : undefined
            }
            onSave={handleWizardSave}
            onClose={() => setShowWizard(false)}
          />
        </Modal>
      )}

      {/* Visit Comparison Modal */}
      {showComparison && (
        <Modal
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          title="Compare Visits"
          size="max"
          allowMaximize
          showCloseButton
          noPadding
        >
          <VisitComparisonModal exams={sortedExams} />
        </Modal>
      )}

      {/* Vision Progress Chart Modal */}
      {showVisionChart && (
        <Modal
          isOpen={showVisionChart}
          onClose={() => setShowVisionChart(false)}
          title="Vision Progress"
          size="2xl"
          allowMaximize
          showCloseButton
        >
          <div className="p-4">
            <VisionProgressGraph exams={sortedExams} />
          </div>
        </Modal>
      )}

      {/* Clinical Notes Modal — addendum-backed, newest first */}
      {showNoteModal && (
        <Modal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false);
            setClinicalNoteText('');
          }}
          title="Clinical Notes"
          size="2xl"
          allowMaximize
          showCloseButton
        >
          <div className="p-6 space-y-4">
            {/* Add note form — always at the top */}
            <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                Add New Clinical Note
              </p>
              <textarea
                ref={noteTextareaRef}
                rows={3}
                value={clinicalNoteText}
                onChange={(e) => setClinicalNoteText(e.target.value)}
                placeholder="Enter clinical note, progress update, post-op finding..."
                className="w-full px-4 py-3 border border-teal-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 outline-none bg-white"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    const text = clinicalNoteText.trim();
                    if (!text || !selectedExam?.exam_id || !staff?.id) return;
                    try {
                      await addNoteMutation.mutateAsync({
                        consultationId: selectedExam.exam_id,
                        noteText: text,
                        createdBy: staff.id,
                      });
                      showToast({
                        title: 'Note Added',
                        message: 'Clinical note saved.',
                        type: 'success',
                      });
                      setClinicalNoteText('');
                    } catch {
                      showToast({
                        title: 'Error',
                        message: 'Could not save note.',
                        type: 'error',
                      });
                    }
                  }}
                  disabled={
                    !clinicalNoteText.trim() || addNoteMutation.isPending
                  }
                  className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 font-semibold transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Existing notes — newest first */}
            {clinicalNotes.length > 0 && (
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                {clinicalNotes.length} note
                {clinicalNotes.length !== 1 ? 's' : ''} — most recent first
              </p>
            )}
            {clinicalNotes.length > 0 ? (
              <div className="relative ml-3 space-y-0">
                <div className="absolute left-0 top-2 bottom-4 w-0.5 bg-teal-200 rounded-full" />
                {(clinicalNotes as ClinicalTimelineNote[]).map((note, i) => {
                  return (
                    <div key={note.id} className="relative pl-6 pb-4">
                      <div
                        className={`absolute left-[-4px] top-2 w-3 h-3 rounded-full border-2 border-white ring-2 ${
                          i === 0
                            ? 'bg-teal-500 ring-teal-300'
                            : 'bg-teal-200 ring-teal-100'
                        }`}
                      />
                      <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-sm font-bold text-teal-800 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4" />
                            {clinicalNoteAuthor(note)}
                          </span>
                          <span className="text-xs text-teal-400 shrink-0">
                            {clinicalNoteTimestamp(note.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-teal-900 leading-relaxed">
                          {note.note_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-teal-50/50 border border-dashed border-teal-200 rounded-xl px-4 py-6 text-center">
                <PenLine className="w-6 h-6 text-teal-300 mx-auto mb-2" />
                <p className="text-sm text-teal-400 font-medium">
                  No clinical notes yet
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
