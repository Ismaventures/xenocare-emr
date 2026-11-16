/**
 * =============================================================================
 * NUTRITION SESSION RECORD MODAL
 * =============================================================================
 * Captures follow-up session metrics for a nutrition care plan.
 * =============================================================================
 */

import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle, ClipboardList, Scale, X } from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { useToast } from '../../../components/ui/Toast';
import { useCompleteNutritionSession } from '../hooks/useNutrition';
import type {
  AppetiteRating,
  HydrationStatus,
  MealPlanTolerance,
  NutritionProgress,
  NutritionSessionData,
} from '../types/nutrition.types';
import type {
  CareplanSession,
  SpecialtyCareplan,
} from '../../specialty-common/dtos/specialty-clinic.dto';

interface Props {
  careplan: SpecialtyCareplan;
  session: CareplanSession;
  careplanId: string;
  onClose: () => void;
  onCompleted: () => void;
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NutritionSessionRecordModal({
  careplan,
  session,
  careplanId,
  onClose,
  onCompleted,
}: Props) {
  const { showToast } = useToast();
  const completeSession = useCompleteNutritionSession();

  const baseline = (careplan.baseline_data || {}) as Record<string, unknown>;
  const baselineHeightCm = Number(baseline.height_cm || 0) || 0;
  const baselineWeightKg = Number(baseline.current_weight_kg || 0) || 0;

  const [weightKg, setWeightKg] = useState(
    baselineWeightKg > 0 ? String(baselineWeightKg) : '',
  );
  const [heightCm] = useState(baselineHeightCm > 0 ? baselineHeightCm : 0);
  const [appetiteRating, setAppetiteRating] = useState<AppetiteRating>('good');
  const [adherencePercentage, setAdherencePercentage] = useState('75');
  const [mealPlanTolerance, setMealPlanTolerance] =
    useState<MealPlanTolerance>('good');
  const [hydrationStatus, setHydrationStatus] =
    useState<HydrationStatus>('adequate');
  const [barriers, setBarriers] = useState('');
  const [gastroSymptoms, setGastroSymptoms] = useState('');
  const [mealPlanAdjustments, setMealPlanAdjustments] = useState('');
  const [supplementAdjustments, setSupplementAdjustments] = useState('');
  const [counselingProvided, setCounselingProvided] = useState('');
  const [progressAssessment, setProgressAssessment] =
    useState<NutritionProgress>('stable');
  const [nextReviewFocus, setNextReviewFocus] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const bmi = useMemo(() => {
    const weight = toNumber(weightKg);
    if (!weight || !heightCm) return undefined;
    const heightM = heightCm / 100;
    if (heightM <= 0) return undefined;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  }, [weightKg, heightCm]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const adherence = Number(adherencePercentage);
    if (!Number.isFinite(adherence) || adherence < 0 || adherence > 100) {
      showToast({
        type: 'warning',
        title: 'Invalid adherence',
        message: 'Adherence must be between 0 and 100.',
      });
      return;
    }

    const sessionData: NutritionSessionData = {
      weight_kg: toNumber(weightKg),
      bmi,
      appetite_rating: appetiteRating,
      adherence_percentage: adherence,
      meal_plan_tolerance: mealPlanTolerance,
      hydration_status: hydrationStatus,
      barriers: barriers.trim() || undefined,
      gastrointestinal_symptoms: gastroSymptoms.trim() || undefined,
      meal_plan_adjustments: mealPlanAdjustments.trim() || undefined,
      supplement_adjustments: supplementAdjustments.trim() || undefined,
      counseling_provided: counselingProvided.trim() || undefined,
      progress_assessment: progressAssessment,
      next_review_focus: nextReviewFocus.trim() || undefined,
    };

    try {
      await completeSession.mutateAsync({
        sessionId: session.id,
        careplan_id: careplanId,
        session_data: sessionData as unknown as Record<string, unknown>,
        notes: clinicalNotes.trim() || undefined,
        assessment: `Progress: ${progressAssessment}; Adherence: ${adherence}%`,
        plan_for_next: nextReviewFocus.trim() || undefined,
      });

      showToast({
        type: 'success',
        title: 'Session completed',
        message: 'Nutrition follow-up session recorded successfully.',
      });
      onCompleted();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not complete nutrition session.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Nutrition Follow-up Session #{session.session_number}
              </h2>
              <p className="text-xs text-gray-500">{careplan.plan_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Weight (kg)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={heightCm || ''}
                disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BMI
              </label>
              <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                <Scale className="w-4 h-4 text-gray-400" />
                {bmi ?? 'Auto'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appetite Rating
              </label>
              <select
                value={appetiteRating}
                onChange={(event) =>
                  setAppetiteRating(event.target.value as AppetiteRating)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="excellent">Excellent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adherence (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={adherencePercentage}
                onChange={(event) => setAdherencePercentage(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meal Plan Tolerance
              </label>
              <select
                value={mealPlanTolerance}
                onChange={(event) =>
                  setMealPlanTolerance(event.target.value as MealPlanTolerance)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hydration Status
              </label>
              <select
                value={hydrationStatus}
                onChange={(event) =>
                  setHydrationStatus(event.target.value as HydrationStatus)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="dehydrated">Dehydrated</option>
                <option value="adequate">Adequate</option>
                <option value="overhydrated">Overhydrated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barriers to Adherence
              </label>
              <textarea
                rows={2}
                value={barriers}
                onChange={(event) => setBarriers(event.target.value)}
                placeholder="Cost, appetite loss, cultural preferences, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GI Symptoms / Tolerance Notes
              </label>
              <textarea
                rows={2}
                value={gastroSymptoms}
                onChange={(event) => setGastroSymptoms(event.target.value)}
                placeholder="Nausea, bloating, constipation, diarrhea, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meal Plan Adjustments
              </label>
              <textarea
                rows={2}
                value={mealPlanAdjustments}
                onChange={(event) => setMealPlanAdjustments(event.target.value)}
                placeholder="Changes to servings, substitutions, or timing"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplement Adjustments
              </label>
              <textarea
                rows={2}
                value={supplementAdjustments}
                onChange={(event) =>
                  setSupplementAdjustments(event.target.value)
                }
                placeholder="Micronutrients, oral supplements, enteral changes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress Assessment
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  ['improving', 'stable', 'declining'] as NutritionProgress[]
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setProgressAssessment(option)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      progressAssessment === option
                        ? option === 'improving'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : option === 'stable'
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Activity className="w-3 h-3 inline mr-1" />
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Counseling Provided
              </label>
              <textarea
                rows={2}
                value={counselingProvided}
                onChange={(event) => setCounselingProvided(event.target.value)}
                placeholder="Education given, handouts discussed, goals reinforced"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Next Review Focus
            </label>
            <textarea
              rows={2}
              value={nextReviewFocus}
              onChange={(event) => setNextReviewFocus(event.target.value)}
              placeholder="Weight trend, glycemic targets, appetite improvement, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Notes
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(event) => setClinicalNotes(event.target.value)}
              placeholder="Objective follow-up note"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={completeSession.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {completeSession.isPending ? (
                <span className="flex items-center gap-2">Saving...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Complete Session
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
