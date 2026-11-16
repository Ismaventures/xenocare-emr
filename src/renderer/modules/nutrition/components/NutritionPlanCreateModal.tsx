/**
 * =============================================================================
 * NUTRITION PLAN CREATE MODAL
 * =============================================================================
 * Creates a longitudinal nutrition care plan with meal prescription targets.
 * =============================================================================
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Leaf,
  PlusCircle,
  Target,
  User,
  Activity,
  Utensils,
  ClipboardList,
  Calendar,
  BookOpenText,
} from 'lucide-react';
import { Modal } from '../../../components/ui';
import { Button } from '../../../components/ui/FormElements';
import { useToast } from '../../../components/ui/Toast';
import { useCreateNutritionCarePlan } from '../hooks/useNutrition';
import {
  ConsultationPatientContextBar,
  ConsultationSupportDrawers,
  ConsultationVitalsRail,
} from '../../specialty-common';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  DietType,
  NutritionCarePlanDTO,
  NutritionPlanType,
  NutritionRiskLevel,
  PhysicalActivityLevel,
} from '../types/nutrition.types';
import { NUTRITION_PLAN_LABELS } from '../types/nutrition.types';

interface PlanPatientContext {
  patientId?: string;
  encounterId?: string;
  patientName?: string;
  emrNumber?: string;
  clinicalRequestId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientContext?: PlanPatientContext | null;
  onCreated?: (payload: {
    patientId: string;
    clinicalRequestId?: string;
  }) => Promise<void> | void;
}

const PLAN_TYPES: NutritionPlanType[] = [
  'weight_management',
  'diabetes_nutrition',
  'hypertension_low_sodium',
  'renal_nutrition',
  'pregnancy_nutrition',
  'pediatric_nutrition',
  'malnutrition_rehabilitation',
  'post_surgical_recovery',
  'general_wellness',
  'other',
];

const DIET_TYPES: Array<{ value: DietType; label: string }> = [
  { value: 'regular_balanced', label: 'Regular Balanced' },
  { value: 'diabetic', label: 'Diabetic Diet' },
  { value: 'low_sodium', label: 'Low Sodium' },
  { value: 'renal', label: 'Renal Diet' },
  { value: 'high_protein', label: 'High Protein' },
  { value: 'high_calorie', label: 'High Calorie' },
  { value: 'low_fat', label: 'Low Fat' },
  { value: 'high_fiber', label: 'High Fiber' },
  { value: 'soft_mechanical', label: 'Soft / Mechanical' },
  { value: 'clear_liquid', label: 'Clear Liquid' },
  { value: 'full_liquid', label: 'Full Liquid' },
  { value: 'enteral', label: 'Enteral Feeding' },
  { value: 'other', label: 'Other' },
];

function parseList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NutritionPlanCreateModal({
  isOpen,
  onClose,
  patientContext,
  onCreated,
}: Props) {
  const { showToast } = useToast();
  const { staff } = useAuth();
  const createPlan = useCreateNutritionCarePlan();
  const [isStoryPanelOpen, setIsStoryPanelOpen] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [planType, setPlanType] =
    useState<NutritionPlanType>('weight_management');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [goalsText, setGoalsText] = useState('');
  const [dietType, setDietType] = useState<DietType>('regular_balanced');
  const [riskLevel, setRiskLevel] = useState<NutritionRiskLevel>('moderate');
  const [activityLevel, setActivityLevel] =
    useState<PhysicalActivityLevel>('lightly_active');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [muacCm, setMuacCm] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [fluidTarget, setFluidTarget] = useState('');
  const [sodiumLimit, setSodiumLimit] = useState('');
  const [frequency, setFrequency] = useState('Every 2 weeks');
  const [duration, setDuration] = useState('3 months');
  const [totalSessions, setTotalSessions] = useState('6');
  const [comorbidities, setComorbidities] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [supplements, setSupplements] = useState('');
  const [counselingNotes, setCounselingNotes] = useState('');

  const [breakfast, setBreakfast] = useState('');
  const [midMorningSnack, setMidMorningSnack] = useState('');
  const [lunch, setLunch] = useState('');
  const [eveningSnack, setEveningSnack] = useState('');
  const [dinner, setDinner] = useState('');
  const [bedtimeSnack, setBedtimeSnack] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setPatientId(patientContext?.patientId || '');
    setEncounterId(patientContext?.encounterId || '');
    setPlanType('weight_management');
    setDiagnosisText('');
    setGoalsText('');
    setDietType('regular_balanced');
    setRiskLevel('moderate');
    setActivityLevel('lightly_active');
    setCurrentWeightKg('');
    setTargetWeightKg('');
    setHeightCm('');
    setMuacCm('');
    setCalorieTarget('');
    setProteinTarget('');
    setFluidTarget('');
    setSodiumLimit('');
    setFrequency('Every 2 weeks');
    setDuration('3 months');
    setTotalSessions('6');
    setComorbidities('');
    setDietaryRestrictions('');
    setSupplements('');
    setCounselingNotes('');
    setBreakfast('');
    setMidMorningSnack('');
    setLunch('');
    setEveningSnack('');
    setDinner('');
    setBedtimeSnack('');
  }, [isOpen, patientContext]);

  const bmi = useMemo(() => {
    const weight = parseOptionalNumber(currentWeightKg);
    const height = parseOptionalNumber(heightCm);
    if (!weight || !height) return undefined;
    const heightM = height / 100;
    if (heightM <= 0) return undefined;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  }, [currentWeightKg, heightCm]);

  async function handleCreatePlan() {
    if (!patientId.trim()) {
      showToast({
        type: 'warning',
        title: 'Patient required',
        message: 'Patient ID is required to create a nutrition care plan.',
      });
      return;
    }

    const dto: NutritionCarePlanDTO = {
      patient_id: patientId.trim(),
      encounter_id: encounterId.trim() || undefined,
      source_referral_request_id:
        patientContext?.clinicalRequestId || undefined,
      plan_type: planType,
      plan_name: `Nutrition Care Plan - ${NUTRITION_PLAN_LABELS[planType]}`,
      diagnosis: parseList(diagnosisText),
      goals: parseList(goalsText),
      current_weight_kg: parseOptionalNumber(currentWeightKg),
      target_weight_kg: parseOptionalNumber(targetWeightKg),
      height_cm: parseOptionalNumber(heightCm),
      bmi,
      muac_cm: parseOptionalNumber(muacCm),
      malnutrition_risk: riskLevel,
      physical_activity_level: activityLevel,
      comorbidities: comorbidities.trim() || undefined,
      diet_type: dietType,
      calorie_target_kcal: parseOptionalNumber(calorieTarget),
      protein_target_g: parseOptionalNumber(proteinTarget),
      fluid_target_ml: parseOptionalNumber(fluidTarget),
      sodium_limit_mg: parseOptionalNumber(sodiumLimit),
      meal_schedule: {
        breakfast: breakfast.trim() || undefined,
        mid_morning_snack: midMorningSnack.trim() || undefined,
        lunch: lunch.trim() || undefined,
        evening_snack: eveningSnack.trim() || undefined,
        dinner: dinner.trim() || undefined,
        bedtime_snack: bedtimeSnack.trim() || undefined,
      },
      dietary_restrictions: dietaryRestrictions.trim() || undefined,
      supplements: supplements.trim() || undefined,
      counseling_notes: counselingNotes.trim() || undefined,
      frequency: frequency.trim() || 'Every 2 weeks',
      expected_duration: duration.trim() || '3 months',
      total_sessions: parseOptionalNumber(totalSessions),
    };

    try {
      await createPlan.mutateAsync(dto);

      if (onCreated) {
        await onCreated({
          patientId: dto.patient_id,
          clinicalRequestId: patientContext?.clinicalRequestId,
        });
      }

      showToast({
        type: 'success',
        title: 'Care plan created',
        message: 'Nutrition care plan and meal schedule created successfully.',
      });
      onClose();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Create failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not create nutrition care plan.',
      });
    }
  }

  type FormSection = 'patient' | 'assessment' | 'targets' | 'meals' | 'additional';
  const [activeSection, setActiveSection] = useState<FormSection>('patient');

  const sections: Array<{
    key: FormSection;
    label: string;
    description: string;
    icon: React.ReactNode;
    activeClass: string;
  }> = [
    {
      key: 'patient',
      label: 'Patient Review',
      description: 'Plan type, diet pattern, diagnoses and goals',
      icon: <User size={13} />,
      activeClass: 'text-blue-700 bg-blue-100 border-blue-300',
    },
    {
      key: 'assessment',
      label: 'Assessment',
      description: 'Anthropometry, BMI, activity and risk profile',
      icon: <Activity size={13} />,
      activeClass: 'text-emerald-700 bg-emerald-100 border-emerald-300',
    },
    {
      key: 'targets',
      label: 'Nutrition Targets',
      description: 'Calories, macros, fluids and follow-up schedule',
      icon: <Target size={13} />,
      activeClass: 'text-purple-700 bg-purple-100 border-purple-300',
    },
    {
      key: 'meals',
      label: 'Meal Prescription',
      description: 'Meal-by-meal therapeutic nutrition plan',
      icon: <Utensils size={13} />,
      activeClass: 'text-orange-700 bg-orange-100 border-orange-300',
    },
    {
      key: 'additional',
      label: 'Review Notes',
      description: 'Restrictions, supplements, counseling and comorbidities',
      icon: <ClipboardList size={13} />,
      activeClass: 'text-slate-700 bg-slate-100 border-slate-300',
    },
  ];

  const activeSectionMeta =
    sections.find((section) => section.key === activeSection) || sections[0];
  const activeSectionIndex = sections.findIndex(
    (section) => section.key === activeSection,
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="max"
    >
      <div className="flex h-[88vh] min-h-[720px] flex-col overflow-hidden bg-slate-50">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Nutrition Care Plan</h2>
              <p className="text-sm text-emerald-100">
                OPD-style consultation workflow tailored for therapeutic nutrition planning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStoryPanelOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              title="View patient story"
            >
              <BookOpenText size={14} />
              Patient Story
            </button>
            <div className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90">
              Step {activeSectionIndex + 1} of {sections.length}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-white px-3 py-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {sections.map((section, index) => {
              const isActive = section.key === activeSection;
              const isPast = index < activeSectionIndex;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-left text-xs font-semibold transition-all ${
                    isActive
                      ? section.activeClass
                      : isPast
                        ? 'border-gray-200 bg-gray-50 text-gray-700'
                        : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${isActive ? 'bg-white/80' : isPast ? 'bg-white' : 'bg-gray-100'}`}>
                    {section.icon}
                  </span>
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {patientId && <ConsultationVitalsRail patientId={patientId} className="m-4 mr-0" />}

          <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-5">
            <div className="mx-auto max-w-6xl pb-10">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{activeSectionMeta.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{activeSectionMeta.description}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Care plan status</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">Draft in progress</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                      <Leaf className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Nutrition consultation workspace</p>
                      <p className="text-xs text-gray-500">Use the same review flow as OPD consultation, adapted for meal prescription and nutrition follow-up.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-6">

        {/* ═══ PLAN INFO ═══ */}
        {activeSection === 'patient' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">1</span>
              <span className="text-sm font-semibold text-gray-800">Patient &amp; Plan Configuration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Type</label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as NutritionPlanType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {PLAN_TYPES.map((option) => (
                    <option key={option} value={option}>{NUTRITION_PLAN_LABELS[option]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Diet Type</label>
                <select
                  value={dietType}
                  onChange={(e) => setDietType(e.target.value as DietType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {DIET_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Diagnoses <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <textarea
                  rows={2}
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="Type 2 diabetes, obesity..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Goals <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <textarea
                  rows={2}
                  value={goalsText}
                  onChange={(e) => setGoalsText(e.target.value)}
                  placeholder="Reduce HbA1c, improve appetite, gain 2 kg..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ ASSESSMENT ═══ */}
        {activeSection === 'assessment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">2</span>
              <span className="text-sm font-semibold text-gray-800">Anthropometric Assessment</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Weight (kg)</label>
                <input
                  type="number" min={0} step={0.1}
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Weight (kg)</label>
                <input
                  type="number" min={0} step={0.1}
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
                <input
                  type="number" min={0} step={0.1}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">MUAC (cm)</label>
                <input
                  type="number" min={0} step={0.1}
                  value={muacCm}
                  onChange={(e) => setMuacCm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">BMI</label>
                <div className={`w-full border rounded-lg px-3 py-2 text-sm font-semibold ${
                  bmi
                    ? bmi < 18.5
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : bmi <= 24.9
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  {bmi ? `${bmi} ${bmi < 18.5 ? '(Under)' : bmi <= 24.9 ? '(Normal)' : bmi <= 29.9 ? '(Over)' : '(Obese)'}` : 'Auto-calculated'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Malnutrition Risk</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'low', label: 'Low', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                    { value: 'moderate', label: 'Moderate', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                    { value: 'high', label: 'High', color: 'border-red-300 bg-red-50 text-red-700' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiskLevel(opt.value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        riskLevel === opt.value
                          ? opt.color
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Physical Activity Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'sedentary', label: 'Sedentary' },
                    { value: 'lightly_active', label: 'Lightly Active' },
                    { value: 'moderately_active', label: 'Mod. Active' },
                    { value: 'very_active', label: 'Very Active' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setActivityLevel(opt.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        activityLevel === opt.value
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TARGETS ═══ */}
        {activeSection === 'targets' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-orange-50 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded">3</span>
              <span className="text-sm font-semibold text-gray-800">Nutritional Targets</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Calories (kcal)</label>
                <input
                  type="number" min={0}
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  placeholder="2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Protein (g)</label>
                <input
                  type="number" min={0}
                  value={proteinTarget}
                  onChange={(e) => setProteinTarget(e.target.value)}
                  placeholder="60"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fluid (ml)</label>
                <input
                  type="number" min={0}
                  value={fluidTarget}
                  onChange={(e) => setFluidTarget(e.target.value)}
                  placeholder="2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sodium (mg)</label>
                <input
                  type="number" min={0}
                  value={sodiumLimit}
                  onChange={(e) => setSodiumLimit(e.target.value)}
                  placeholder="2300"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={13} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">Follow-Up Schedule</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                  <input
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                  <input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Sessions</label>
                  <input
                    type="number" min={1}
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MEAL PLAN ═══ */}
        {activeSection === 'meals' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-violet-50 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded">4</span>
              <span className="text-sm font-semibold text-gray-800">Prescribed Meal Schedule</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([
                { label: 'Breakfast', value: breakfast, setter: setBreakfast, icon: '🌅' },
                { label: 'Mid-Morning Snack', value: midMorningSnack, setter: setMidMorningSnack, icon: '🍎' },
                { label: 'Lunch', value: lunch, setter: setLunch, icon: '☀️' },
                { label: 'Evening Snack', value: eveningSnack, setter: setEveningSnack, icon: '🫖' },
                { label: 'Dinner', value: dinner, setter: setDinner, icon: '🌙' },
                { label: 'Bedtime Snack', value: bedtimeSnack, setter: setBedtimeSnack, icon: '💤' },
              ] as const).map((meal) => (
                <div key={meal.label} className="rounded-lg border border-gray-200 p-3 hover:border-emerald-200 transition-colors">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <span className="mr-1">{meal.icon}</span> {meal.label}
                  </label>
                  <textarea
                    rows={2}
                    value={meal.value}
                    onChange={(e) => meal.setter(e.target.value)}
                    placeholder={`Prescribe ${meal.label.toLowerCase()}...`}
                    className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none bg-gray-50/50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ADDITIONAL ═══ */}
        {activeSection === 'additional' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded">5</span>
              <span className="text-sm font-semibold text-gray-800">Additional Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dietary Restrictions</label>
                <textarea
                  rows={2}
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  placeholder="No added sugar, avoid fried foods, low potassium..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplements</label>
                <textarea
                  rows={2}
                  value={supplements}
                  onChange={(e) => setSupplements(e.target.value)}
                  placeholder="Oral nutrition supplements, micronutrients..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Comorbidities</label>
                <textarea
                  rows={2}
                  value={comorbidities}
                  onChange={(e) => setComorbidities(e.target.value)}
                  placeholder="Hypertension, CKD, heart failure..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Counseling Notes</label>
                <textarea
                  rows={2}
                  value={counselingNotes}
                  onChange={(e) => setCounselingNotes(e.target.value)}
                  placeholder="Lifestyle counseling summary"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="text-sm text-gray-500">
              Step {activeSectionIndex + 1} of {sections.length}: <span className="font-medium text-gray-800">{activeSectionMeta.label}</span>
            </div>

            <div className="flex items-center gap-3">
              {activeSectionIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setActiveSection(sections[activeSectionIndex - 1].key)}
                >
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {activeSectionIndex === sections.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={handleCreatePlan}
                  disabled={createPlan.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 min-w-[180px]"
                >
                  {createPlan.isPending ? (
                    'Creating...'
                  ) : (
                    <span className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Create Care Plan
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setActiveSection(sections[activeSectionIndex + 1].key)}
                  className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
                >
                  Next Section
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>

      <ConsultationSupportDrawers
        patientId={patientId || null}
        encounterId={encounterId || null}
        patientName={patientContext?.patientName}
        emrNumber={patientContext?.emrNumber}
        facilityId={staff?.facility_id ?? ''}
        userId={staff?.id ?? ''}
        department="Nutrition Consultation"
        isStoryOpen={isStoryPanelOpen}
        onCloseStory={() => setIsStoryPanelOpen(false)}
        isAIOpen={false}
        onCloseAI={() => {}}
      />
    </>
  );
}
