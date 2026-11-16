/**
 * =============================================================================
 * UNIVERSAL EXAM SHELL
 *
 * A lightweight wrapper that gives ALL specialty examinations the same five‑
 * block layout without replacing or losing any template‑driven fields:
 *
 *   Block 1 ─ Key Findings chips  (one‑tap abnormal flags)
 *   Block 2 ─ Examination Summary  (free‑text narrative)
 *   Block 3 ─ Detailed Examination  (full template renderer, collapsed)
 *   Block 4 ─ Clinical Tools  (scoring instruments, collapsed)
 *   Block 5 ─ Visit Mode Banner  (First Visit / Follow‑Up indicator)
 *
 * All blocks store data in the SAME specialtyFormData record – nothing is lost.
 * =============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Stethoscope,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  FlaskConical,
} from 'lucide-react';
import {
  SpecialtyTemplateSection,
  SpecialtyFormData,
} from '../../clinical-consultation/dtos/specialty-template.dto';
import { SpecialtyExaminationRenderer } from '../../clinical-consultation/components/SpecialtyExaminationRenderer';
import ClinicalScoreCalculator from './ClinicalScoreCalculator';
import type {
  ScoreResult,
  ClinicalScoreDefinition,
} from '../dtos/specialty-clinic.dto';
import { getKeyFindings, KeyFinding } from '../constants/key-findings';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VisitMode = 'first' | 'followup';

export interface UniversalExamShellProps {
  /** Specialty code (e.g. 'NEUROPSYCHIATRY', 'CARDIOLOGY') */
  specialtyCode: string;
  specialtyName: string;
  /** All template sections (from SpecialtyConsultationWizard) */
  templateSections: SpecialtyTemplateSection[];
  /** Current form values */
  specialtyFormData: SpecialtyFormData;
  /** Field‑change handler */
  onFieldChange: (fieldCode: string, value: unknown) => void;
  /** Validation errors */
  errors: Record<string, string>;
  /** Normal values map for Quick Normal button */
  normalValues?: Record<string, unknown>;
  /** Clinical scores */
  scores: ClinicalScoreDefinition[];
  clinicalScores: Record<string, ScoreResult>;
  onScoreChange: (scoreId: string, result: ScoreResult | null) => void;
  /** First visit or follow‑up */
  visitMode?: VisitMode;
  onVisitModeChange?: (mode: VisitMode) => void;
  /** Optional safety alert banner (e.g. Neuropsychiatry SafetyAlertBanner) */
  safetyBanner?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color map (matches SPECIALTY_COLORS in the wizard)
// ─────────────────────────────────────────────────────────────────────────────
const CHIP_COLORS: Record<string, { active: string; idle: string }> = {
  red: {
    active: 'bg-red-100 border-red-400 text-red-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600',
  },
  amber: {
    active: 'bg-amber-100 border-amber-400 text-amber-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600',
  },
  orange: {
    active: 'bg-orange-100 border-orange-400 text-orange-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600',
  },
  violet: {
    active: 'bg-violet-100 border-violet-400 text-violet-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600',
  },
  blue: {
    active: 'bg-blue-100 border-blue-400 text-blue-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600',
  },
  cyan: {
    active: 'bg-cyan-100 border-cyan-400 text-cyan-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-cyan-600',
  },
  pink: {
    active: 'bg-pink-100 border-pink-400 text-pink-700',
    idle: 'bg-white border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Key Findings Chip
// ─────────────────────────────────────────────────────────────────────────────
function FindingChip({
  finding,
  active,
  onToggle,
}: {
  finding: KeyFinding;
  active: boolean;
  onToggle: () => void;
}) {
  const palette = CHIP_COLORS[finding.color ?? 'amber'];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all select-none
        ${active ? palette.active : palette.idle}`}
      title={
        active
          ? `Click to clear "${finding.label}"`
          : `Click to flag "${finding.label}"`
      }
    >
      {finding.icon && (
        <span className="text-sm leading-none">{finding.icon}</span>
      )}
      {finding.label}
      {active && <CheckCircle2 size={12} className="ml-0.5 shrink-0" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible Panel
// ─────────────────────────────────────────────────────────────────────────────
function CollapsiblePanel({
  title,
  icon,
  badgeCount,
  defaultOpen,
  children,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  badgeCount?: number;
  defaultOpen: boolean;
  children: React.ReactNode;
  accentClass?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div
          className={`flex items-center gap-2.5 font-semibold text-sm ${accentClass ?? 'text-gray-700'}`}
        >
          {icon}
          {title}
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {badgeCount}
            </span>
          )}
        </div>
        <div className="text-gray-400">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Shell
// ─────────────────────────────────────────────────────────────────────────────
const UniversalExamShell: React.FC<UniversalExamShellProps> = ({
  specialtyCode,
  specialtyName,
  templateSections,
  specialtyFormData,
  onFieldChange,
  errors,
  normalValues,
  scores,
  clinicalScores,
  onScoreChange,
  visitMode = 'first',
  onVisitModeChange,
  safetyBanner,
}) => {
  const keyFindings = useMemo(
    () => getKeyFindings(specialtyCode),
    [specialtyCode],
  );

  // Field code → finding lookup (for active state)
  const activeFindingCodes = useMemo(() => {
    const active = new Set<string>();
    keyFindings.forEach((f) => {
      const current = specialtyFormData[f.fieldCode];
      if (current === f.abnormalValue)
        active.add(`${f.fieldCode}:${f.abnormalValue}`);
    });
    return active;
  }, [keyFindings, specialtyFormData]);

  const activeCount = activeFindingCodes.size;

  const handleChipToggle = useCallback(
    (finding: KeyFinding) => {
      const key = `${finding.fieldCode}:${finding.abnormalValue}`;
      const isActive = activeFindingCodes.has(key);
      onFieldChange(
        finding.fieldCode,
        isActive ? finding.normalValue : finding.abnormalValue,
      );
    },
    [activeFindingCodes, onFieldChange],
  );

  // Quick-fill all normal values
  const handleQuickNormal = useCallback(() => {
    templateSections.forEach((section) => {
      section.fields.forEach((field) => {
        const nv = normalValues?.[field.field_code] ?? field.default_value;
        if (nv !== undefined) {
          onFieldChange(field.field_code, nv);
        }
      });
    });
  }, [templateSections, normalValues, onFieldChange]);

  const hasAnyNormal = useMemo(() => {
    return templateSections.some((s) =>
      s.fields.some(
        (f) =>
          normalValues?.[f.field_code] !== undefined ||
          f.default_value !== undefined,
      ),
    );
  }, [templateSections, normalValues]);

  const summaryValue = (specialtyFormData._exam_summary as string) ?? '';
  const planValue = (specialtyFormData._clinical_plan as string) ?? '';

  // Choose sections based on visitMode. For follow-ups, open only required sections by default.
  const sectionsForMode = useMemo(() => {
    if (visitMode === 'followup') {
      return templateSections.map((s) => ({
        ...s,
        default_expanded: s.is_required,
      }));
    }
    return templateSections;
  }, [templateSections, visitMode]);

  return (
    <div className="space-y-4">
      {/* ── Safety Alert (Neuropsychiatry / high-risk specialties) ── */}
      {safetyBanner}

      {/* ── Visit Mode Toggle ── */}
      {onVisitModeChange && (
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => onVisitModeChange('first')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              visitMode === 'first'
                ? 'bg-white shadow text-indigo-700 border border-indigo-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            First Visit
          </button>
          <button
            type="button"
            onClick={() => onVisitModeChange('followup')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              visitMode === 'followup'
                ? 'bg-white shadow text-indigo-700 border border-indigo-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Follow-Up
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          BLOCK 1: KEY FINDINGS
          ────────────────────────────────────────────────────────── */}
      {keyFindings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Zap size={15} className="text-amber-500" />
              Key Findings
              {activeCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeCount} flagged
                </span>
              )}
            </div>
            {hasAnyNormal && (
              <button
                type="button"
                onClick={handleQuickNormal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
                title="Fill all fields with normal default values"
              >
                <CheckCircle2 size={13} />
                Quick Normal
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Tap to flag abnormal findings. Unselected = within normal limits.
          </p>
          <div className="flex flex-wrap gap-2">
            {keyFindings.map((f) => (
              <FindingChip
                key={`${f.fieldCode}:${f.abnormalValue}`}
                finding={f}
                active={activeFindingCodes.has(
                  `${f.fieldCode}:${f.abnormalValue}`,
                )}
                onToggle={() => handleChipToggle(f)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          BLOCK 2: EXAMINATION SUMMARY (always visible)
          ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText size={15} className="text-blue-500" />
            Examination Summary
          </div>
          <SavedNotesPopover
            category="specialty_notes"
            subcategory="exam_summary"
            currentValue={summaryValue}
            onInsert={(content) => onFieldChange('_exam_summary', content)}
          />
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Brief narrative of abnormal findings. Leave blank if all normal.
        </p>
        <textarea
          value={summaryValue}
          onChange={(e) => onFieldChange('_exam_summary', e.target.value)}
          rows={3}
          placeholder={`e.g. Patient presents with ${
            activeCount > 0
              ? Array.from(activeFindingCodes)
                  .map((k) => k.split(':')[0])
                  .join(', ')
              : 'no significant abnormalities on examination'
          }...`}
          className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:bg-white transition-all resize-none placeholder-gray-400"
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          BLOCK 3: DETAILED EXAMINATION (collapsed by default)
          ────────────────────────────────────────────────────────── */}
      <CollapsiblePanel
        title={
          visitMode === 'followup'
            ? 'Detailed Examination (Optional)'
            : 'Detailed Examination'
        }
        icon={<Stethoscope size={15} className="text-indigo-500" />}
        defaultOpen={visitMode === 'first'}
        badgeCount={Object.keys(errors).length}
        accentClass="text-indigo-700"
      >
        {templateSections.length > 0 ? (
          <SpecialtyExaminationRenderer
            sections={sectionsForMode}
            formData={specialtyFormData}
            onChange={onFieldChange}
            errors={errors}
            specialtyCode={specialtyCode}
            showProgress
            normalValues={normalValues}
          />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-700 font-medium">
              No examination template configured for {specialtyName}.
            </p>
          </div>
        )}
      </CollapsiblePanel>

      {/* ──────────────────────────────────────────────────────────
          BLOCK 4: CLINICAL TOOLS (collapsed by default)
          ────────────────────────────────────────────────────────── */}
      {scores.length > 0 && (
        <CollapsiblePanel
          title="Clinical Tools & Scoring Instruments"
          icon={<BarChart2 size={15} className="text-violet-500" />}
          defaultOpen={false}
          accentClass="text-violet-700"
        >
          <p className="text-xs text-gray-500 mb-3">
            Optional. Open only when a scoring instrument is clinically
            indicated.
          </p>
          <div className="space-y-4">
            {scores.map((scoreDef) => (
              <ClinicalScoreCalculator
                key={scoreDef.id}
                definition={scoreDef}
                initialValues={clinicalScores[scoreDef.id]?.item_scores}
                onScoreChange={(result) => onScoreChange(scoreDef.id, result)}
                defaultCollapsed
              />
            ))}
          </div>
        </CollapsiblePanel>
      )}

      {/* ──────────────────────────────────────────────────────────
          BLOCK 5: CLINICAL IMPRESSION (quick plan — visible on follow-up)
          ────────────────────────────────────────────────────────── */}
      {visitMode === 'followup' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ClipboardList size={15} className="text-green-600" />
              Clinical Impression & Plan
              <span className="text-xs font-normal text-gray-400 ml-1">
                (for this visit)
              </span>
            </div>
            <SavedNotesPopover
              category="specialty_notes"
              subcategory="clinical_plan"
              currentValue={planValue}
              onInsert={(content) => onFieldChange('_clinical_plan', content)}
            />
          </div>
          <textarea
            value={planValue}
            onChange={(e) => onFieldChange('_clinical_plan', e.target.value)}
            rows={3}
            placeholder="Assessment and management plan for this follow-up visit..."
            className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-green-400 focus:ring-1 focus:ring-green-300 focus:bg-white transition-all resize-none placeholder-gray-400"
          />
        </div>
      )}

      {/* ── Minimal fields hint ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
        <FlaskConical size={13} />
        All detailed fields are saved automatically — only Key Findings and
        Summary are required for quick consults.
      </div>
    </div>
  );
};

export default UniversalExamShell;
