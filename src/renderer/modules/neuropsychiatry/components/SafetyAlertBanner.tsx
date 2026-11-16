/**
 * =============================================================================
 * SAFETY ALERT BANNER
 * =============================================================================
 * Displays a high-visibility alert when specialty_data from the MSE template
 * contains critical suicidal or homicidal ideation values.
 *
 * This component is designed to be embedded inside the SpecialtyConsultationWizard
 * whenever specialty_code = 'NEUROPSYCHIATRY'.
 *
 * Usage:
 *   <SafetyAlertBanner specialtyData={currentSpecialtyData} />
 * =============================================================================
 */

import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type {
  SuicidalIdeationType,
  HomicidalIdeationType,
  PsychSafetyRisk,
} from '../types/neuropsychiatry.types';

const HIGH_RISK_SUICIDAL: SuicidalIdeationType[] = [
  'active_with_plan',
  'active_with_intent',
];
const HIGH_RISK_HOMICIDAL: HomicidalIdeationType[] = ['present_with_target'];

/**
 * Derives the safety risk level from raw specialty_data JSONB
 * (keyed by field_code from the NEUROPSYCHIATRY_TEMPLATE)
 */
export function deriveRisk(
  specialtyData: Record<string, unknown> | null | undefined,
): PsychSafetyRisk {
  const suicidal =
    (specialtyData?.suicidal_ideation as SuicidalIdeationType) ?? null;
  const homicidal =
    (specialtyData?.homicidal_ideation as HomicidalIdeationType) ?? null;
  return {
    is_high_risk_suicidal: HIGH_RISK_SUICIDAL.includes(
      suicidal as SuicidalIdeationType,
    ),
    is_high_risk_homicidal: HIGH_RISK_HOMICIDAL.includes(
      homicidal as HomicidalIdeationType,
    ),
    suicidal_level: suicidal,
    homicidal_level: homicidal,
  };
}

interface SafetyAlertBannerProps {
  /** Raw specialty_data object from MSE template form values */
  specialtyData: Record<string, unknown> | null | undefined;
  /** Optional: show compact single-line mode */
  compact?: boolean;
}

export default function SafetyAlertBanner({
  specialtyData,
  compact = false,
}: SafetyAlertBannerProps) {
  const risk = deriveRisk(specialtyData);

  if (!risk.is_high_risk_suicidal && !risk.is_high_risk_homicidal) return null;

  const suicidalLabel: Record<SuicidalIdeationType, string> = {
    absent: 'Absent',
    passive: 'Passive',
    active: 'Active',
    active_with_plan: 'Active with Plan',
    active_with_intent: 'Active with Intent',
  };

  const homicidalLabel: Record<HomicidalIdeationType, string> = {
    absent: 'Absent',
    present: 'Present',
    present_with_target: 'Present with Specific Target',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-md">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span>
          SAFETY ALERT — High-risk ideation detected. Safety plan required
          before completing this consultation.
        </span>
      </div>
    );
  }

  return (
    <div className="border-2 border-red-500 rounded-lg bg-red-50 p-4 space-y-3 animate-pulse-once">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
        <h3 className="text-base font-bold text-red-700 uppercase tracking-wide">
          ⚠ SAFETY ALERT — Immediate Action Required
        </h3>
      </div>

      {/* Risk Items */}
      <div className="space-y-2">
        {risk.is_high_risk_suicidal && risk.suicidal_level && (
          <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-md px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">
                Suicidal Ideation: {suicidalLabel[risk.suicidal_level]}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                This level of suicidal ideation requires immediate risk
                assessment, a documented safety plan, and notification of the
                supervising consultant before this consultation can be
                completed.
              </p>
            </div>
          </div>
        )}

        {risk.is_high_risk_homicidal && risk.homicidal_level && (
          <div className="flex items-start gap-2 bg-orange-100 border border-orange-300 rounded-md px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-800">
                Homicidal Ideation: {homicidalLabel[risk.homicidal_level]}
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                Homicidal ideation with a specific target triggers mandatory
                duty-of-care reporting. Document the intended harm, notify the
                supervising consultant, and follow institutional safeguarding
                protocol.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Required Actions */}
      <div className="bg-white border border-red-200 rounded-md p-3 space-y-1">
        <p className="text-xs font-bold text-red-700 uppercase">
          Mandatory Before Completing Consultation:
        </p>
        <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
          <li>
            Complete and document a structured safety assessment (risk factors,
            protective factors)
          </li>
          <li>Document a written safety plan in the clinical notes</li>
          <li>Notify supervising consultant / duty psychiatrist</li>
          {risk.is_high_risk_homicidal && (
            <li className="font-semibold text-orange-700">
              Initiate duty-of-care/Tarasoff reporting protocol
            </li>
          )}
          <li>Consider need for voluntary/involuntary admission</li>
        </ul>
      </div>
    </div>
  );
}
