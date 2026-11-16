/**
 * AIConsultationReview — Pre-submission AI Clinical Review Panel
 *
 * Displayed on the Preview/Review step of both ConsultationWizard and
 * SpecialtyConsultationWizard. The AI analyzes the doctor's entries
 * against the patient's existing medical records and provides:
 * - Drug interaction warnings
 * - Allergy conflict alerts
 * - Diagnostic consistency checks
 * - Treatment suggestions
 * - Completeness assessment
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bot,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  XCircle,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import {
  reviewConsultation,
  type ConsultationReviewRequest,
} from '../api/ai.api';

// ─── Markdown renderer (lightweight) ─────────────────────────────────────────
function renderMarkdown(text: string): string {
  return (
    text
      // Headers
      .replace(
        /^### (.+)$/gm,
        '<h4 class="text-sm font-bold text-gray-800 mt-3 mb-1">$1</h4>',
      )
      .replace(
        /^## (.+)$/gm,
        '<h3 class="text-base font-bold text-gray-900 mt-4 mb-2 flex items-center gap-2">$1</h3>',
      )
      .replace(
        /^# (.+)$/gm,
        '<h2 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h2>',
      )
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(
        /`(.+?)`/g,
        '<code class="bg-gray-100 text-xs px-1 py-0.5 rounded font-mono">$1</code>',
      )
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-gray-200 my-3" />')
      // Checkboxes
      .replace(
        /^- \[x\] (.+)$/gm,
        '<div class="flex items-center gap-2 text-sm text-green-700 ml-2"><span class="text-green-500">✅</span> $1</div>',
      )
      .replace(
        /^- \[ \] (.+)$/gm,
        '<div class="flex items-center gap-2 text-sm text-gray-600 ml-2"><span class="text-gray-400">☐</span> $1</div>',
      )
      // Unordered lists
      .replace(
        /^- (.+)$/gm,
        '<div class="flex items-start gap-2 text-sm ml-2 my-0.5"><span class="text-gray-400 mt-1">•</span><span>$1</span></div>',
      )
      // Table header/body (simple)
      .replace(/\|(.+)\|/g, (match) => {
        if (match.includes('---')) return '';
        const cells = match
          .split('|')
          .filter(Boolean)
          .map((c) => c.trim());
        const isHeader = cells.every(
          (c) => c.includes('**') || c === c.toUpperCase(),
        );
        const tag = isHeader ? 'th' : 'td';
        const cls = isHeader
          ? 'class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border-b"'
          : 'class="px-2 py-1 text-xs text-gray-600 border-b border-gray-100"';
        return `<tr>${cells.map((c) => `<${tag} ${cls}>${c}</${tag}>`).join('')}</tr>`;
      })
      // Paragraphs (lines that aren't already wrapped)
      .replace(
        /^(?!<[hdt]|<hr|<div)(.+)$/gm,
        '<p class="text-sm text-gray-700 my-1">$1</p>',
      )
      // Newlines
      .replace(/\n{2,}/g, '\n')
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
export interface AIConsultationReviewProps {
  patientId: string | null;
  facilityId?: string;
  userId?: string;
  // Consultation data
  complaints?: Array<{
    complaint_name?: string;
    complaint_code?: string;
    is_primary?: boolean;
    duration_value?: number;
    duration_unit?: string;
    notes?: string;
  }>;
  formData: {
    history_of_present_illness?: string;
    past_medical_history?: string;
    family_history?: string;
    social_history?: string;
    review_of_systems?: string;
    examination_findings?: string;
    physical_examination?: string;
    treatment_plan?: string;
    clinical_notes?: string;
    recommendations?: string;
    differential_diagnosis?: string[] | null;
    follow_up_date?: string;
    follow_up_notes?: string;
  };
  specialtyExamination?: Record<string, unknown>;
  diagnoses: Array<{ code?: string; title?: string }>;
  prescriptions: Array<{
    drug_name?: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    quantity_prescribed?: number;
    instructions?: string;
  }>;
  labOrders: Array<{
    test_name?: string;
    test_code?: string;
    priority?: string;
    clinical_notes?: string;
  }>;
  radiologyOrders: Array<{
    imaging_type?: string;
    body_part?: string;
    clinical_indication?: string;
    priority?: string;
  }>;
  procedureOrders?: Array<{
    procedure_name?: string;
    procedure_code?: string;
    priority?: string;
    indication?: string;
  }>;
  admissionOrder?: Record<string, unknown> | null;
  treatmentTasks?: Array<{
    task_type?: string;
    title?: string;
    priority?: string;
    medication_name?: string;
    dosage?: string;
    route?: string;
  }>;
  referrals?: Array<{
    specialty?: string;
    reason?: string;
    urgency?: string;
  }>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AIConsultationReview({
  patientId,
  facilityId,
  userId,
  complaints,
  formData,
  specialtyExamination,
  diagnoses,
  prescriptions,
  labOrders,
  radiologyOrders,
  procedureOrders,
  admissionOrder,
  treatmentTasks,
  referrals,
}: AIConsultationReviewProps) {
  const [reviewResult, setReviewResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [model, setModel] = useState<string>('');
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const reviewRef = useRef<HTMLDivElement>(null);

  const runReview = useCallback(async () => {
    if (!patientId) {
      setError('No patient selected. AI review requires a patient context.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const request: ConsultationReviewRequest = {
        patientId,
        facilityId,
        userId,
        consultationData: {
          complaints,
          history_of_present_illness: formData.history_of_present_illness,
          past_medical_history: formData.past_medical_history,
          family_history: formData.family_history,
          social_history: formData.social_history,
          review_of_systems: formData.review_of_systems,
          examination_findings: formData.examination_findings,
          physical_examination: formData.physical_examination,
          specialty_examination: specialtyExamination,
          diagnoses,
          differential_diagnosis: formData.differential_diagnosis?.join(', '),
          treatment_plan: formData.treatment_plan,
          clinical_notes: formData.clinical_notes,
          recommendations: formData.recommendations,
          prescriptions,
          labOrders,
          radiologyOrders,
          procedureOrders,
          admissionOrder,
          treatmentTasks,
          referrals,
          follow_up_date: formData.follow_up_date,
          follow_up_notes: formData.follow_up_notes,
        },
      };

      const result = await reviewConsultation(request);
      setReviewResult(result.review);
      setModel(result.model || '');
      setTokensUsed(result.tokensUsed || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to perform AI review',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    patientId,
    facilityId,
    userId,
    complaints,
    formData,
    specialtyExamination,
    diagnoses,
    prescriptions,
    labOrders,
    radiologyOrders,
    procedureOrders,
    admissionOrder,
    treatmentTasks,
    referrals,
  ]);

  // Auto-trigger review when the component mounts (first time only)
  useEffect(() => {
    if (!hasAutoTriggered && patientId) {
      setHasAutoTriggered(true);
      runReview();
    }
  }, [hasAutoTriggered, patientId, runReview]);

  // Scroll to review when result arrives
  useEffect(() => {
    if (reviewResult && reviewRef.current) {
      reviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [reviewResult]);

  // Count items for summary
  const totalMeds = prescriptions?.length || 0;
  const totalLabs = labOrders?.length || 0;
  const totalDiags = diagnoses?.length || 0;
  const totalImaging = radiologyOrders?.length || 0;

  return (
    <div
      ref={reviewRef}
      className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-2 border-indigo-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-indigo-100/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              AI Clinical Review
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                <Sparkles size={10} />
                Pre-submission
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Analyzing {totalDiags} diagnos{totalDiags === 1 ? 'is' : 'es'},{' '}
              {totalMeds} medication{totalMeds !== 1 ? 's' : ''}, {totalLabs}{' '}
              lab order{totalLabs !== 1 ? 's' : ''}, {totalImaging} imaging
              order{totalImaging !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reviewResult && !isLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                runReview();
              }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
              title="Re-run AI review"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -right-1 -bottom-1 p-1 bg-white rounded-full shadow-md">
                  <Loader2 size={14} className="text-indigo-600 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Performing Clinical Review...
                </p>
                <p className="text-xs text-gray-500 mt-1.5 max-w-sm">
                  Analyzing consultation entries against patient's medical
                  history, checking for drug interactions, allergy conflicts,
                  and clinical consistency.
                </p>
              </div>
              {/* Animated steps */}
              <div className="space-y-2 text-xs text-gray-500 w-full max-w-xs">
                <div className="flex items-center gap-2 animate-pulse">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span>Loading patient medical history...</span>
                </div>
                <div className="flex items-center gap-2 animate-pulse delay-300">
                  <Loader2 size={12} className="text-indigo-500 animate-spin" />
                  <span>Checking drug interactions & allergies...</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="w-3 h-3 rounded-full border border-gray-300" />
                  <span>Evaluating diagnostic consistency...</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="w-3 h-3 rounded-full border border-gray-300" />
                  <span>Generating clinical suggestions...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle
                size={18}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  Review Failed
                </p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <button
                  onClick={runReview}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Try again
                </button>
              </div>
            </div>
          )}

          {/* Review Result */}
          {reviewResult && !isLoading && (
            <div className="space-y-3">
              {/* AI Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  <span className="text-xs font-medium text-gray-600">
                    Clinical review by AI
                  </span>
                </div>
                {model && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {model}
                    {tokensUsed
                      ? ` · ${tokensUsed.toLocaleString()} tokens`
                      : ''}
                  </span>
                )}
              </div>

              {/* Rendered Review Content */}
              <div
                className="bg-white rounded-lg border border-gray-200 p-4 prose prose-sm max-w-none overflow-y-auto"
                style={{ maxHeight: '600px' }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(reviewResult),
                }}
              />

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                <AlertTriangle
                  size={14}
                  className="text-amber-600 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    AI Clinical Review Disclaimer
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    This review is generated by an AI assistant and is intended
                    as a <strong>clinical decision support tool only</strong>.
                    It does not replace professional clinical judgement. The
                    treating physician bears full responsibility for all
                    clinical decisions. Always verify suggestions against
                    current institutional protocols, national formulary
                    guidelines, and patient-specific clinical context before
                    acting.
                  </p>
                </div>
              </div>

              {/* Re-run button */}
              <div className="flex justify-center pt-1">
                <button
                  onClick={runReview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  <RefreshCw size={12} />
                  Re-run Clinical Review
                </button>
              </div>
            </div>
          )}

          {/* Initial state (no result, not loading, no error) — shouldn't happen due to auto-trigger */}
          {!reviewResult && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Bot size={24} className="text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 text-center max-w-xs">
                Click below to have the AI review your consultation entries
                before submission.
              </p>
              <button
                onClick={runReview}
                disabled={!patientId}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={14} />
                Run AI Clinical Review
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIConsultationReview;
