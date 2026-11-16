/**
 * =============================================================================
 * CLINICAL SCORE CALCULATOR
 * =============================================================================
 * Reusable component that renders any clinical scoring instrument (PHQ-9,
 * NYHA, CHA₂DS₂-VASc, GCS, IPSS etc.) from a ClinicalScoreDefinition.
 *
 * Features:
 * - Renders all scoring items with radio/select options
 * - Auto-calculates total score as user selects answers
 * - Color-coded severity classification with clinical action guidance
 * - Collapsible panel for embedding in examination forms
 * - onScoreChange callback for parent to capture result
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react';
import type {
  ClinicalScoreDefinition,
  ScoreResult,
  SeverityRange,
} from '../dtos/specialty-clinic.dto';

interface ClinicalScoreCalculatorProps {
  definition: ClinicalScoreDefinition;
  /** Previously saved item selections (for restore) */
  initialValues?: Record<string, number>;
  /** Called whenever the score changes */
  onScoreChange?: (result: ScoreResult | null) => void;
  /** Start collapsed? */
  defaultCollapsed?: boolean;
}

export default function ClinicalScoreCalculator({
  definition,
  initialValues,
  onScoreChange,
  defaultCollapsed = true,
}: ClinicalScoreCalculatorProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selections, setSelections] = useState<Record<string, number>>(
    initialValues || {},
  );

  // Compute the score
  const scoreResult = useMemo<ScoreResult | null>(() => {
    const answered = Object.keys(selections).length;
    if (answered === 0) return null;

    const totalScore = Object.values(selections).reduce((sum, v) => sum + v, 0);

    // Find the matching severity range
    const severity = definition.severity_ranges.find(
      (r) => totalScore >= r.min && totalScore <= r.max,
    ) || {
      min: 0,
      max: definition.max_score,
      label: 'Unknown',
      color: '#6b7280',
    };

    return {
      score_id: definition.id,
      total_score: totalScore,
      max_score: definition.max_score,
      severity,
      item_scores: { ...selections },
      computed_at: new Date().toISOString(),
    };
  }, [selections, definition]);

  const handleSelect = useCallback(
    (itemId: string, value: number) => {
      const next = { ...selections, [itemId]: value };
      setSelections(next);

      // Recompute and notify parent
      const total = Object.values(next).reduce((sum, v) => sum + v, 0);
      const severity = definition.severity_ranges.find(
        (r) => total >= r.min && total <= r.max,
      ) || {
        min: 0,
        max: definition.max_score,
        label: 'Unknown',
        color: '#6b7280',
      };
      onScoreChange?.({
        score_id: definition.id,
        total_score: total,
        max_score: definition.max_score,
        severity,
        item_scores: next,
        computed_at: new Date().toISOString(),
      });
    },
    [selections, definition, onScoreChange],
  );

  const answeredCount = Object.keys(selections).length;
  const totalItems = definition.items.length;
  const isComplete = answeredCount === totalItems;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <Calculator className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">
              {definition.name}
            </span>
            <span className="text-xs text-gray-500">
              {definition.full_name}
            </span>
          </div>
        </div>

        {/* Score badge — shown when calculated */}
        {scoreResult && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${scoreResult.severity.color}20`,
              color: scoreResult.severity.color,
              border: `1px solid ${scoreResult.severity.color}40`,
            }}
          >
            <span>{scoreResult.total_score}</span>
            <span className="text-[10px] opacity-80">
              / {scoreResult.max_score}
            </span>
            <span className="mx-0.5">—</span>
            <span>{scoreResult.severity.label}</span>
          </div>
        )}

        {!scoreResult && (
          <span className="text-xs text-gray-500 font-medium">
            {answeredCount}/{totalItems} answered
          </span>
        )}

        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Body — collapsible */}
      {!isCollapsed && (
        <div className="px-4 pb-4 border-t border-gray-200 space-y-4 pt-4">
          {/* Description */}
          {definition.description && (
            <p className="text-sm text-gray-600 flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
              {definition.description}
            </p>
          )}

          {/* Score Items */}
          <div className="space-y-4">
            {definition.items.map((item, idx) => (
              <div key={item.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-800">
                  <span className="text-gray-400 mr-2">{idx + 1}.</span>
                  {item.question}
                </label>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt) => {
                    const isSelected = selections[item.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(item.id, opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                          isSelected
                            ? 'bg-purple-100 border-purple-400 text-purple-800 ring-2 ring-purple-300 font-semibold'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Result Panel */}
          {scoreResult && isComplete && (
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{
                backgroundColor: `${scoreResult.severity.color}10`,
                border: `1px solid ${scoreResult.severity.color}30`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: `${scoreResult.severity.color}25`,
                    color: scoreResult.severity.color,
                  }}
                >
                  {scoreResult.total_score}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: scoreResult.severity.color }}
                  >
                    {scoreResult.severity.label}
                  </p>
                  <p className="text-sm text-gray-600 font-medium">
                    Score: {scoreResult.total_score} / {scoreResult.max_score}
                  </p>
                </div>
              </div>

              {scoreResult.severity.clinical_action && (
                <div className="flex items-start gap-2 text-sm text-gray-700 mt-2 bg-white/60 rounded-lg p-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <span className="font-medium">
                    {scoreResult.severity.clinical_action}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Interpretation notes */}
          {definition.interpretation_notes && isComplete && (
            <p className="text-xs text-gray-500 italic leading-relaxed">
              {definition.interpretation_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
