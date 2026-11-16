/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - CLINICAL NOTES MODAL
 *
 * Modal for adding clinical notes to an encounter after reviewing results.
 * Follows standard EMR practices for:
 * - Progress Notes: Ongoing clinical documentation
 * - Result Review Notes: Notes added after reviewing lab/radiology results
 * - Addendum Notes: Additional notes to existing documentation
 * - Follow-up Notes: Documentation for follow-up actions
 *
 * Now supports specialty-aware template rendering via the 3-layer architecture:
 *   Layer 1: Shared notes engine (this modal + clinical_notes table)
 *   Layer 2: Universal note types (progress, result review, etc.)
 *   Layer 3: Specialty template layer (dynamic form sections)
 * =============================================================================
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Stethoscope,
  ClipboardList,
  Calendar,
  MessageSquare,
  Eye,
  Activity,
  FlaskConical,
  Scan,
  Clock,
  Plus,
  Edit3,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select } from '../../../../components/ui/FormElements';
import { useToast } from '../../../../components/ui/Toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../api/supabaseClient';
import {
  checkEncounterContinuation,
  EncounterContinuationContext,
  isActionAllowed,
} from '../../../../lib/encounter/continuation';
import { useEncounterAccess } from '../../../../lib/encounter/useEncounterAccess';
import { useDraftRestore } from '../../../../hooks/useDraftRestore';
import { notifyNoteAdded } from '../../../../lib/notifications/care-team.service';
import { useNoteTemplateResolver } from '../../hooks/useNoteTemplateResolver';
import { createClinicalNote } from '../../api/clinical-notes-template.api';
import { SpecialtyNoteFields } from './SpecialtyNoteFields';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import type {
  ClinicalNoteTemplate,
  NoteTemplateSchema,
} from '../../dtos/clinical-note-template.types';

// =============================================================================
// Types
// =============================================================================

export type NoteType =
  | 'progress_note' // General progress/update note
  | 'result_review' // Note after reviewing lab/radiology results
  | 'clinical_update' // Update to clinical assessment
  | 'follow_up_note' // Follow-up plan documentation
  | 'addendum'; // Addition to existing documentation

interface ClinicalNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  encounterNumber: string;
  visitId: string; // VARCHAR visit_id for daily_progress_notes FK
  patientId: string;
  patientName: string;
  encounterContext: EncounterContinuationContext;
  onNoteAdded?: () => void;
  initialNoteType?: NoteType;
  // Specialty template context (optional — will auto-detect if not provided)
  clinicId?: string | null;
  // For result-specific notes
  resultContext?: {
    type: 'lab' | 'radiology' | 'procedure';
    resultId: string;
    resultName: string;
  };
}

interface NoteTypeConfig {
  id: NoteType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  fields: (
    | 'subjective'
    | 'objective'
    | 'assessment'
    | 'plan'
    | 'notes'
    | 'follow_up'
  )[];
}

const NOTE_TYPES: NoteTypeConfig[] = [
  {
    id: 'progress_note',
    label: 'Progress Note',
    description: 'General clinical progress update',
    icon: <FileText size={18} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    fields: ['subjective', 'objective', 'assessment', 'plan'],
  },
  {
    id: 'result_review',
    label: 'Result Review',
    description: 'Document review of lab/imaging results',
    icon: <Eye size={18} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    fields: ['assessment', 'plan', 'notes'],
  },
  {
    id: 'clinical_update',
    label: 'Clinical Update',
    description: 'Update diagnosis or clinical assessment',
    icon: <Stethoscope size={18} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    fields: ['objective', 'assessment', 'plan'],
  },
  {
    id: 'follow_up_note',
    label: 'Follow-up Note',
    description: 'Document follow-up plan and instructions',
    icon: <Calendar size={18} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    fields: ['assessment', 'plan', 'follow_up'],
  },
  {
    id: 'addendum',
    label: 'Addendum',
    description: 'Additional note to existing documentation',
    icon: <Plus size={18} />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    fields: ['notes'],
  },
];

// =============================================================================
// Main Component
// =============================================================================

export function ClinicalNotesModal({
  isOpen,
  onClose,
  encounterId,
  encounterNumber,
  visitId,
  patientId,
  patientName,
  encounterContext,
  onNoteAdded,
  initialNoteType = 'progress_note',
  clinicId,
  resultContext,
}: ClinicalNotesModalProps) {
  const { staff } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Template Resolution ───────────────────────────────────────────────
  const userRole = staff?.role === 'Nurse' ? 'Nurse' : 'Doctor';
  const {
    getTemplate,
    clinicInfo,
    isLoading: templateLoading,
  } = useNoteTemplateResolver({
    encounterId: isOpen ? encounterId : null,
    userRole,
  });

  // Check encounter access permissions
  const {
    encounterRole,
    isLoading: accessLoading,
    getAllowedActions,
  } = useEncounterAccess({ encounterId });

  // Helper to check if action is allowed
  const canPerformAction = useCallback(
    (action: 'edit_clinical_notes' | 'add_nursing_notes') => {
      const allowedActions = getAllowedActions();
      return allowedActions.includes(action);
    },
    [getAllowedActions],
  );

  // State
  const [noteType, setNoteType] = useState<NoteType>(
    resultContext ? 'result_review' : initialNoteType,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justification, setJustification] = useState('');
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);

  // ── Specialty template fields state ──────────────────────────────────
  const [specialtyData, setSpecialtyData] = useState<Record<string, unknown>>(
    {},
  );

  // Resolve template for current note type
  const activeTemplate: ClinicalNoteTemplate | null = useMemo(
    () => getTemplate(noteType),
    [getTemplate, noteType],
  );

  // Parse schema for rendering
  const templateSchema: NoteTemplateSchema | null = useMemo(() => {
    if (!activeTemplate?.schema_json) return null;
    const schema = activeTemplate.schema_json as NoteTemplateSchema;
    if (!schema.sections || schema.sections.length === 0) return null;
    return schema;
  }, [activeTemplate]);

  // Template display label for the note
  const templateDisplayLabel = useMemo(() => {
    if (!activeTemplate || activeTemplate.is_default) return null;
    return activeTemplate.display_name;
  }, [activeTemplate]);

  // Specialty data field change handler
  const handleSpecialtyFieldChange = useCallback(
    (fieldCode: string, value: unknown) => {
      setSpecialtyData((prev) => ({ ...prev, [fieldCode]: value }));
    },
    [],
  );

  // Reset specialty data when note type changes
  useEffect(() => {
    setSpecialtyData({});
  }, [noteType]);

  // Fetch latest vitals when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      setVitalsLoading(true);
      supabase
        .from('vitals')
        .select(
          `
          *,
          recorded_by_staff:staff!vitals_nurse_id_fkey(first_name, last_name)
        `,
        )
        .eq('patient_id', patientId)
        .order('date_recorded', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setLatestVitals(data);
          }
          setVitalsLoading(false);
        });
    }
  }, [isOpen, patientId]);

  // Form fields
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [notes, setNotes] = useState(
    resultContext
      ? `Reviewed ${resultContext.type} result: ${resultContext.resultName}\n\n`
      : '',
  );
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // ── Draft auto-save / restore ──────────────────────────────────────────
  const draftData = useMemo(
    () => ({
      subjective,
      objective,
      assessment,
      plan,
      notes,
      followUpDate,
      followUpNotes,
    }),
    [
      subjective,
      objective,
      assessment,
      plan,
      notes,
      followUpDate,
      followUpNotes,
    ],
  );

  const setDraftData = useCallback((d: typeof draftData) => {
    setSubjective(d.subjective);
    setObjective(d.objective);
    setAssessment(d.assessment);
    setPlan(d.plan);
    setNotes(d.notes);
    setFollowUpDate(d.followUpDate);
    setFollowUpNotes(d.followUpNotes);
  }, []);

  const { clearDraft } = useDraftRestore(
    `clinical-notes-${encounterId}`,
    draftData,
    setDraftData,
    { enabled: isOpen },
  );

  // Get current note type config
  const currentNoteType = useMemo(
    () => NOTE_TYPES.find((t) => t.id === noteType) || NOTE_TYPES[0],
    [noteType],
  );

  // Check continuation eligibility
  const continuationEligibility = useMemo(() => {
    return checkEncounterContinuation(encounterContext);
  }, [encounterContext]);

  // Check if notes can be added
  const canAddNotes = useMemo(() => {
    return isActionAllowed(continuationEligibility, 'update_notes');
  }, [continuationEligibility]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Validate patient and encounter IDs
    if (!patientId) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Patient ID is missing. Please refresh and try again.',
      });
      return;
    }
    if (!encounterId) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Encounter ID is missing. Please refresh and try again.',
      });
      return;
    }

    // Validate at least one field has content
    const hasContent =
      subjective ||
      objective ||
      assessment ||
      plan ||
      notes ||
      Object.keys(specialtyData).some(
        (k) =>
          specialtyData[k] !== '' &&
          specialtyData[k] !== undefined &&
          specialtyData[k] !== null,
      );
    if (!hasContent) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add some content to your note',
      });
      return;
    }

    if (
      continuationEligibility.requiresJustification &&
      !justification.trim()
    ) {
      showToast({
        type: 'error',
        title: 'Justification Required',
        message: 'Justification is required for this encounter',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // First verify the patient exists - check both id (UUID) and patient_id (display ID)
      const { data: patientCheck, error: patientError } = await supabase
        .from('patients')
        .select('id, patient_id')
        .or(`id.eq.${patientId},patient_id.eq.${patientId}`)
        .maybeSingle();

      if (patientError || !patientCheck) {
        console.error('[ClinicalNotesModal] Patient lookup failed:', {
          patientId,
          error: patientError,
        });
        throw new Error(
          `Patient not found. The patient record may have been deleted. Please select a valid patient.`,
        );
      }

      // UUID for tables with uuid FK (clinical_notes)
      const resolvedPatientId = patientCheck.id;
      // Display ID for tables with varchar FK (consultations, daily_progress_notes)
      const resolvedPatientDisplayId = patientCheck.patient_id;

      // Verify the encounter exists
      const { data: encounterCheck, error: encounterError } = await supabase
        .from('visits')
        .select('id')
        .eq('id', encounterId)
        .maybeSingle();

      if (encounterError || !encounterCheck) {
        throw new Error(
          `Encounter not found. The encounter may have been closed or deleted.`,
        );
      }

      // ── ALWAYS save to clinical_notes table (canonical source for timeline) ──
      await createClinicalNote({
        patient_id: resolvedPatientId,
        encounter_id: encounterId,
        note_type: noteType,
        template_key: activeTemplate?.template_key || null,
        specialty_clinic_id: clinicInfo?.clinic_id || clinicId || null,
        author_id: staff?.id || '',
        author_role: userRole,
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        notes: notes || null,
        follow_up_date: followUpDate || null,
        follow_up_notes: followUpNotes || null,
        specialty_data:
          activeTemplate && Object.keys(specialtyData).length > 0
            ? specialtyData
            : undefined,
        display_label: activeTemplate
          ? templateDisplayLabel || currentNoteType.label
          : currentNoteType.label,
        status: 'final',
      });

      // Legacy path: also save to daily_progress_notes / consultations
      // This ensures backward compatibility with AllNotesPanel and other consumers

      // Determine which table to use based on note type
      if (noteType === 'progress_note' || noteType === 'result_review') {
        // Use daily_progress_notes table for progress/result review notes
        // Note: daily_progress_notes has a unique constraint on (encounter_id, note_date)
        // So we need to UPSERT - update if exists, insert if not
        const todayDate = new Date().toISOString().split('T')[0];

        // Check if a progress note already exists for today
        // daily_progress_notes.encounter_id is UUID referencing visits.id
        const { data: existingNote } = await supabase
          .from('daily_progress_notes')
          .select(
            'progress_id, subjective, objective, assessment, plan, nursing_summary',
          )
          .eq('encounter_id', encounterId)
          .eq('note_date', todayDate)
          .maybeSingle();

        const timestamp = new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const staffName = staff
          ? `Dr. ${staff.first_name} ${staff.last_name}`
          : 'Unknown';
        const notePrefix = `\n\n--- ${currentNoteType.label} (${timestamp} by ${staffName}) ---\n`;

        if (existingNote) {
          // Update existing note by appending new content
          const updatedFields: Record<string, any> = {
            recorded_at: new Date().toISOString(),
            recorded_by: staff?.id,
          };

          // Append to existing fields
          if (subjective) {
            updatedFields.subjective = existingNote.subjective
              ? existingNote.subjective + notePrefix + subjective
              : subjective;
          }
          if (objective) {
            updatedFields.objective = existingNote.objective
              ? existingNote.objective + notePrefix + objective
              : objective;
          }
          if (assessment) {
            updatedFields.assessment = existingNote.assessment
              ? existingNote.assessment + notePrefix + assessment
              : assessment;
          }
          if (plan) {
            updatedFields.plan = existingNote.plan
              ? existingNote.plan + notePrefix + plan
              : plan;
          }
          if (notes) {
            updatedFields.nursing_summary = existingNote.nursing_summary
              ? existingNote.nursing_summary + notePrefix + notes
              : notes;
          }

          const { error } = await supabase
            .from('daily_progress_notes')
            .update(updatedFields)
            .eq('progress_id', existingNote.progress_id);

          if (error) throw error;
        } else {
          // Insert new progress note
          // daily_progress_notes: encounter_id (UUID) → visits.id, patient_id (varchar) → patients.patient_id
          const { error } = await supabase.from('daily_progress_notes').insert({
            encounter_id: encounterId,
            patient_id: resolvedPatientDisplayId,
            note_date: todayDate,
            subjective: subjective || null,
            objective: objective || null,
            assessment: assessment || null,
            plan: plan || null,
            nursing_summary: notes || null,
            recorded_by: staff?.id,
            recorded_at: new Date().toISOString(),
            patient_condition: 'stable',
          });

          if (error) throw error;
        }
      } else {
        // For clinical updates, follow-up, and addendum - update consultation
        // First check if consultation exists
        const { data: existingConsult } = await supabase
          .from('consultations')
          .select(
            'consultation_id, clinical_notes, notes, treatment_plan, follow_up_date, follow_up_notes',
          )
          .eq('encounter_id', encounterId)
          .maybeSingle();

        const timestamp = new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const staffName = staff
          ? `Dr. ${staff.first_name} ${staff.last_name}`
          : 'Unknown';

        if (existingConsult) {
          // Append to existing consultation
          const updatedFields: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          // Append notes with timestamp
          const notePrefix = `\n\n--- ${currentNoteType.label} (${timestamp} by ${staffName}) ---\n`;

          if (notes) {
            updatedFields.clinical_notes = existingConsult.clinical_notes
              ? existingConsult.clinical_notes + notePrefix + notes
              : notePrefix + notes;
          }

          if (assessment) {
            updatedFields.notes = existingConsult.notes
              ? `${existingConsult.notes + notePrefix}Assessment: ${assessment}`
              : `${notePrefix}Assessment: ${assessment}`;
          }

          if (plan) {
            updatedFields.treatment_plan = existingConsult.treatment_plan
              ? existingConsult.treatment_plan + notePrefix + plan
              : plan;
          }

          if (followUpDate) {
            updatedFields.follow_up_date = followUpDate;
          }

          if (followUpNotes) {
            updatedFields.follow_up_notes = existingConsult.follow_up_notes
              ? existingConsult.follow_up_notes + notePrefix + followUpNotes
              : followUpNotes;
          }

          const { error } = await supabase
            .from('consultations')
            .update(updatedFields)
            .eq('consultation_id', existingConsult.consultation_id);

          if (error) throw error;
        } else {
          // Create new consultation record with notes
          // consultations uses: encounter_id→visits.id (UUID), patient_id→patients.patient_id (varchar),
          // visit_id→visits.visit_id (varchar), doctor_id→staff.staff_id (varchar)
          const { error } = await supabase.from('consultations').insert({
            encounter_id: encounterId,
            visit_id: visitId,
            patient_id: resolvedPatientDisplayId,
            doctor_id: staff?.staff_id,
            clinical_notes: notes || null,
            notes: assessment ? `Assessment: ${assessment}` : null,
            treatment_plan: plan || null,
            follow_up_date: followUpDate || null,
            follow_up_notes: followUpNotes || null,
            consultation_date: new Date().toISOString(),
            status: 'Completed',
          });

          if (error) throw error;
        }
      }

      showToast({
        type: 'success',
        title: 'Note Added',
        message: `${currentNoteType.label} added successfully`,
      });

      // Notify care team about the new note
      const doctorName = staff?.first_name
        ? `Dr. ${staff.first_name} ${staff.last_name || ''}`.trim()
        : 'Doctor';
      notifyNoteAdded(
        encounterId,
        patientName,
        currentNoteType.label,
        doctorName,
        encounterId, // Use encounter as the entity since note IDs may vary
        staff?.id || '',
      ).catch(() => {}); // Non-fatal

      // Invalidate queries to refresh data - use correct query keys from useMedicalRecords
      // The encounter detail query key is: ['medical-records', 'encounter', encounterId]
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({
        queryKey: ['medical-records', 'encounter', encounterId],
      });
      queryClient.invalidateQueries({
        queryKey: ['encounter-details', encounterId],
      }); // Legacy key
      queryClient.invalidateQueries({
        queryKey: ['progress-notes', encounterId],
      });
      queryClient.invalidateQueries({
        queryKey: ['consultations', encounterId],
      });
      queryClient.invalidateQueries({
        queryKey: ['clinical-notes', encounterId],
      }); // New template-based notes

      clearDraft();
      onNoteAdded?.();
      onClose();

      // Reset form
      setSubjective('');
      setObjective('');
      setAssessment('');
      setPlan('');
      setNotes('');
      setFollowUpDate('');
      setFollowUpNotes('');
      setJustification('');
      setSpecialtyData({});
    } catch (error: any) {
      console.error('Failed to add note:', error);
      // Check for constraint errors and provide helpful message
      let errorMessage = error.message || 'Failed to add note';
      if (error.code === '23503') {
        // Foreign key constraint violation
        if (error.details?.includes('patient_id')) {
          errorMessage = `Patient not found (ID: ${patientId}). The patient record may have been deleted or is invalid.`;
        } else if (error.details?.includes('encounter_id')) {
          errorMessage = `Encounter not found (ID: ${encounterId}). The encounter may have been closed or deleted.`;
        } else {
          errorMessage = `Record not found: ${error.details || error.message}`;
        }
      } else if (error.code === '23505') {
        // Unique constraint violation - should not happen with our upsert logic, but handle gracefully
        errorMessage =
          'A note already exists for this date. Please try again - your content will be appended to the existing note.';
      }
      showToast({ type: 'error', title: 'Error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    noteType,
    subjective,
    objective,
    assessment,
    plan,
    notes,
    followUpDate,
    followUpNotes,
    justification,
    encounterId,
    patientId,
    staff,
    currentNoteType,
    continuationEligibility.requiresJustification,
    queryClient,
    showToast,
    onNoteAdded,
    onClose,
    activeTemplate,
    specialtyData,
    templateDisplayLabel,
    clinicInfo,
    clinicId,
    userRole,
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

  // Check if user has permission to add clinical notes
  const canAddClinicalNotes =
    canPerformAction('edit_clinical_notes') ||
    canPerformAction('add_nursing_notes');

  if (!canAddClinicalNotes) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 mb-2">
              You don't have permission to add notes to this encounter.
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

  // If notes cannot be added
  if (!canAddNotes) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Cannot Add Notes
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Add Clinical Note
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

        {/* Result Context Banner */}
        {resultContext && (
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-200 flex items-center gap-3">
            {resultContext.type === 'lab' && (
              <FlaskConical size={18} className="text-purple-600" />
            )}
            {resultContext.type === 'radiology' && (
              <Scan size={18} className="text-purple-600" />
            )}
            {resultContext.type === 'procedure' && (
              <Activity size={18} className="text-purple-600" />
            )}
            <div>
              <p className="text-sm font-medium text-purple-800">
                Documenting review of {resultContext.type} result
              </p>
              <p className="text-sm text-purple-600">
                {resultContext.resultName}
              </p>
            </div>
          </div>
        )}

        {/* Note Type Selector */}
        <div className="px-6 py-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Note Type
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setNoteType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  noteType === type.id
                    ? `${type.bgColor} ${type.color} ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {currentNoteType.description}
          </p>
        </div>

        {/* Template Banner — shows when a specialty template is active */}
        {activeTemplate && !activeTemplate.is_default && (
          <div
            className={`px-6 py-3 border-b flex items-center gap-3 ${
              activeTemplate.ui_config?.color
                ? `bg-${activeTemplate.ui_config.color}-50 border-${activeTemplate.ui_config.color}-200`
                : 'bg-indigo-50 border-indigo-200'
            }`}
          >
            <Sparkles size={18} className="text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {activeTemplate.ui_config?.banner_text ||
                  activeTemplate.display_name}
              </p>
              <p className="text-xs text-gray-500">
                Specialty-aware form •{' '}
                {clinicInfo?.clinic_name || 'Specialty Clinic'}
              </p>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Latest Vitals Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                Latest Vitals
              </h3>
              {latestVitals && (
                <span className="text-xs text-gray-500">
                  {new Date(latestVitals.date_recorded).toLocaleString(
                    'en-GB',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                  {latestVitals.recorded_by_staff &&
                    ` • By ${latestVitals.recorded_by_staff.first_name} ${latestVitals.recorded_by_staff.last_name}`}
                </span>
              )}
            </div>
            {vitalsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading vitals...
                </span>
              </div>
            ) : latestVitals ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Blood Pressure */}
                {(latestVitals.blood_pressure_systolic ||
                  latestVitals.blood_pressure_diastolic) && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                      <Heart size={14} />
                      <span className="text-xs font-bold uppercase">BP</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.blood_pressure_systolic || '--'}/
                      {latestVitals.blood_pressure_diastolic || '--'}
                    </p>
                    <p className="text-xs text-gray-500">mmHg</p>
                  </div>
                )}
                {/* Pulse */}
                {latestVitals.pulse_rate && (
                  <div className="bg-white rounded-lg p-3 border border-pink-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-pink-600 mb-1">
                      <Activity size={14} />
                      <span className="text-xs font-bold uppercase">Pulse</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.pulse_rate}
                    </p>
                    <p className="text-xs text-gray-500">bpm</p>
                  </div>
                )}
                {/* Temperature */}
                {latestVitals.temperature && (
                  <div className="bg-white rounded-lg p-3 border border-orange-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                      <Thermometer size={14} />
                      <span className="text-xs font-bold uppercase">Temp</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.temperature}
                    </p>
                    <p className="text-xs text-gray-500">°C</p>
                  </div>
                )}
                {/* Respiratory Rate */}
                {latestVitals.respiratory_rate && (
                  <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-teal-600 mb-1">
                      <Wind size={14} />
                      <span className="text-xs font-bold uppercase">Resp</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.respiratory_rate}
                    </p>
                    <p className="text-xs text-gray-500">breaths/min</p>
                  </div>
                )}
                {/* SpO2 */}
                {latestVitals.oxygen_saturation && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                      <Droplets size={14} />
                      <span className="text-xs font-bold uppercase">SpO₂</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.oxygen_saturation}
                    </p>
                    <p className="text-xs text-gray-500">%</p>
                  </div>
                )}
                {/* Weight */}
                {latestVitals.weight && (
                  <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <Activity size={14} />
                      <span className="text-xs font-bold uppercase">
                        Weight
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {latestVitals.weight}
                    </p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No vitals recorded for this patient
              </div>
            )}
          </div>

          {/* Specialty Extension Fields — rendered from template schema_json */}
          {templateSchema && (
            <SpecialtyNoteFields
              schema={templateSchema}
              values={specialtyData}
              onChange={handleSpecialtyFieldChange}
              disabled={isSubmitting}
            />
          )}

          {/* SOAP Fields */}
          {currentNoteType.fields.includes('subjective') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Subjective
                </label>
                <SavedNotesPopover
                  category="consultation_subjective"
                  currentValue={subjective}
                  onInsert={(content) => setSubjective(content)}
                />
              </div>
              <textarea
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                placeholder="Patient's symptoms, complaints, history as reported..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {currentNoteType.fields.includes('objective') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <Activity size={16} />
                  Objective
                </label>
                <SavedNotesPopover
                  category="consultation_objective"
                  currentValue={objective}
                  onInsert={(content) => setObjective(content)}
                />
              </div>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Clinical findings, examination results, vital signs..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {currentNoteType.fields.includes('assessment') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                  <Stethoscope size={16} />
                  Assessment / Clinical Impression
                </label>
                <SavedNotesPopover
                  category="consultation_assessment"
                  currentValue={assessment}
                  onInsert={(content) => setAssessment(content)}
                />
              </div>
              <textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Your clinical assessment, interpretation of findings/results..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {currentNoteType.fields.includes('plan') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                  <ClipboardList size={16} />
                  Plan / Next Steps
                </label>
                <SavedNotesPopover
                  category="consultation_plan"
                  currentValue={plan}
                  onInsert={(content) => setPlan(content)}
                />
              </div>
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Treatment plan, recommended actions, next steps..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {currentNoteType.fields.includes('notes') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Edit3 size={16} />
                  Additional Notes
                </label>
                <SavedNotesPopover
                  category="consultation_notes"
                  currentValue={notes}
                  onInsert={(content) => setNotes(content)}
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or observations..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none"
                rows={4}
              />
            </div>
          )}

          {currentNoteType.fields.includes('follow_up') && (
            <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                <Calendar size={18} />
                Follow-up Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Follow-up Instructions
                  </label>
                  <SavedNotesPopover
                    category="consultation_notes"
                    subcategory="follow_up"
                    currentValue={followUpNotes}
                    onInsert={(content) => setFollowUpNotes(content)}
                  />
                </div>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Instructions for follow-up visit..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Justification (if required) */}
        {continuationEligibility.requiresJustification && (
          <div className="px-6 py-4 border-t border-gray-100 bg-amber-50">
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Justification Required <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why notes are being added to this encounter..."
              className="w-full px-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 resize-none"
              rows={2}
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Clock size={16} />
            Note will be timestamped and attributed to{' '}
            {staff ? `Dr. ${staff.first_name} ${staff.last_name}` : 'you'}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClinicalNotesModal;
