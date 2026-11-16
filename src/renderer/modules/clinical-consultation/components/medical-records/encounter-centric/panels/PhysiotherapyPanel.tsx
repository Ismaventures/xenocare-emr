/**
 * PhysiotherapyPanel - Shows physio assessments and sessions for an encounter
 */

import React, { useState, useEffect } from 'react';
import { Dumbbell, Activity, ChevronDown, Loader2 } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { StatusBadge, formatDateTime } from '../shared';
import { supabase } from '../../../../../../api/supabaseClient';

interface PhysiotherapyPanelProps {
  encounter: EncounterDetail;
}

export function PhysiotherapyPanel({ encounter }: PhysiotherapyPanelProps) {
  const [physioData, setPhysioData] = useState<{
    assessments: any[];
    sessions: any[];
  }>({ assessments: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<
    string | null
  >(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function fetchPhysioData() {
      setLoading(true);
      try {
        // Fetch physio assessments for this encounter
        const { data: assessments, error: assessError } = await supabase
          .from('physio_assessments')
          .select('*, created_by_staff:staff(first_name, last_name)')
          .eq('encounter_id', encounter.encounter_id)
          .order('created_at', { ascending: false });

        // Fetch physio sessions linked to plans for this encounter
        const { data: plans } = await supabase
          .from('physio_treatment_plans')
          .select('plan_id')
          .eq('encounter_id', encounter.encounter_id);

        let sessions: any[] = [];
        if (plans && plans.length > 0) {
          const planIds = plans.map((p: { plan_id: string }) => p.plan_id);
          const { data: sessionsData } = await supabase
            .from('physio_sessions')
            .select('*, therapist:staff(first_name, last_name)')
            .in('plan_id', planIds)
            .order('session_date', { ascending: false });
          sessions = sessionsData || [];
        }

        if (!assessError) {
          setPhysioData({
            assessments: assessments || [],
            sessions,
          });
        }
      } catch (err) {
        console.error('Error fetching physiotherapy data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (encounter.encounter_id) {
      fetchPhysioData();
    }
  }, [encounter.encounter_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">
          Loading physiotherapy records...
        </span>
      </div>
    );
  }

  const hasData =
    physioData.assessments.length > 0 || physioData.sessions.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No Physiotherapy Records"
        description="No physiotherapy assessments or sessions recorded for this encounter."
      />
    );
  }

  const toggleAssessment = (assessmentId: string) => {
    setExpandedAssessmentId(
      expandedAssessmentId === assessmentId ? null : assessmentId,
    );
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Dumbbell size={18} className="text-orange-600" />
          Physiotherapy Records
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {physioData.assessments.length + physioData.sessions.length}
          </span>
        </h2>
      </div>

      {/* Physio Assessments */}
      {physioData.assessments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Assessments</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {physioData.assessments.map((assessment, idx) => {
              const isExpanded =
                expandedAssessmentId === assessment.assessment_id;
              return (
                <div
                  key={assessment.assessment_id}
                  className={idx > 0 ? 'border-t border-gray-100' : ''}
                >
                  <button
                    onClick={() => toggleAssessment(assessment.assessment_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100">
                        <Dumbbell size={16} className="text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {assessment.chief_complaint ||
                            assessment.referral_reason ||
                            'Physiotherapy Assessment'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {assessment.primary_diagnosis && (
                            <span>{assessment.primary_diagnosis} • </span>
                          )}
                          <span>{formatDateTime(assessment.created_at)}</span>
                          {assessment.created_by_staff && (
                            <span>
                              {' '}
                              • By {assessment.created_by_staff.first_name}{' '}
                              {assessment.created_by_staff.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <StatusBadge status={assessment.status} />
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-orange-50/50 border-t border-orange-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chief Complaint Section */}
                        {(assessment.chief_complaint ||
                          assessment.complaint_duration ||
                          assessment.onset_type ||
                          assessment.mechanism_of_injury) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Chief Complaint
                            </p>
                            <div className="space-y-2">
                              {assessment.chief_complaint && (
                                <p className="text-gray-900 text-sm">
                                  {assessment.chief_complaint}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm">
                                {assessment.complaint_duration && (
                                  <span className="text-gray-600">
                                    Duration:{' '}
                                    <span className="font-medium text-gray-900">
                                      {assessment.complaint_duration}
                                    </span>
                                  </span>
                                )}
                                {assessment.onset_type && (
                                  <span className="text-gray-600">
                                    Onset:{' '}
                                    <span className="font-medium text-gray-900">
                                      {assessment.onset_type}
                                    </span>
                                  </span>
                                )}
                              </div>
                              {assessment.mechanism_of_injury && (
                                <p className="text-sm text-gray-700 mt-1">
                                  Mechanism: {assessment.mechanism_of_injury}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Referral Information */}
                        {(assessment.referral_reason ||
                          assessment.referral_source ||
                          assessment.referral_diagnosis) && (
                          <div className="bg-white p-3 rounded-lg border border-blue-100 bg-blue-50/30 md:col-span-2">
                            <p className="text-xs text-blue-600 uppercase font-medium mb-2">
                              Referral Information
                            </p>
                            <div className="space-y-1">
                              {assessment.referral_source && (
                                <p className="text-sm text-gray-700">
                                  Source:{' '}
                                  <span className="font-medium">
                                    {assessment.referral_source}
                                  </span>
                                </p>
                              )}
                              {assessment.referral_diagnosis && (
                                <p className="text-sm text-gray-700">
                                  Diagnosis:{' '}
                                  <span className="font-medium">
                                    {assessment.referral_diagnosis}
                                  </span>
                                </p>
                              )}
                              {assessment.referral_reason && (
                                <p className="text-sm text-gray-900">
                                  {assessment.referral_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {assessment.physio_diagnosis && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Physiotherapy Diagnosis
                            </p>
                            <p className="text-gray-900 text-sm font-medium">
                              {assessment.physio_diagnosis}
                            </p>
                          </div>
                        )}

                        {/* Pain Assessment */}
                        {assessment.pain_score !== null &&
                          assessment.pain_score !== undefined && (
                            <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                                Pain Assessment
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <span className="text-xs text-gray-500 block">
                                    Current
                                  </span>
                                  <span
                                    className={`text-lg font-bold ${assessment.pain_score > 6 ? 'text-red-600' : assessment.pain_score > 3 ? 'text-amber-600' : 'text-green-600'}`}
                                  >
                                    {assessment.pain_score}/10
                                  </span>
                                </div>
                                {assessment.pain_at_rest !== null &&
                                  assessment.pain_at_rest !== undefined && (
                                    <div className="bg-gray-50 rounded p-2 text-center">
                                      <span className="text-xs text-gray-500 block">
                                        At Rest
                                      </span>
                                      <span className="text-lg font-semibold text-gray-900">
                                        {assessment.pain_at_rest}/10
                                      </span>
                                    </div>
                                  )}
                                {assessment.pain_on_activity !== null &&
                                  assessment.pain_on_activity !== undefined && (
                                    <div className="bg-gray-50 rounded p-2 text-center">
                                      <span className="text-xs text-gray-500 block">
                                        Activity
                                      </span>
                                      <span className="text-lg font-semibold text-gray-900">
                                        {assessment.pain_on_activity}/10
                                      </span>
                                    </div>
                                  )}
                                {assessment.pain_worst !== null &&
                                  assessment.pain_worst !== undefined && (
                                    <div className="bg-gray-50 rounded p-2 text-center">
                                      <span className="text-xs text-gray-500 block">
                                        Worst
                                      </span>
                                      <span className="text-lg font-semibold text-red-600">
                                        {assessment.pain_worst}/10
                                      </span>
                                    </div>
                                  )}
                                {assessment.pain_best !== null &&
                                  assessment.pain_best !== undefined && (
                                    <div className="bg-gray-50 rounded p-2 text-center">
                                      <span className="text-xs text-gray-500 block">
                                        Best
                                      </span>
                                      <span className="text-lg font-semibold text-green-600">
                                        {assessment.pain_best}/10
                                      </span>
                                    </div>
                                  )}
                              </div>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                {assessment.pain_location && (
                                  <span className="text-gray-600">
                                    Location:{' '}
                                    <span className="font-medium text-gray-900">
                                      {assessment.pain_location}
                                    </span>
                                  </span>
                                )}
                                {assessment.pain_character && (
                                  <span className="text-gray-600">
                                    Character:{' '}
                                    <span className="font-medium text-gray-900">
                                      {assessment.pain_character}
                                    </span>
                                  </span>
                                )}
                                {assessment.pain_pattern && (
                                  <span className="text-gray-600">
                                    Pattern:{' '}
                                    <span className="font-medium text-gray-900">
                                      {assessment.pain_pattern}
                                    </span>
                                  </span>
                                )}
                                {assessment.night_pain && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                                    Night Pain
                                  </span>
                                )}
                              </div>
                              {assessment.pain_radiation && (
                                <p className="text-sm text-gray-700 mt-1">
                                  Radiation: {assessment.pain_radiation}
                                </p>
                              )}
                            </div>
                          )}

                        {/* Aggravating/Relieving Factors */}
                        {(assessment.aggravating_factors ||
                          assessment.relieving_factors) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Modifying Factors
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {assessment.aggravating_factors && (
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                  <span className="text-xs text-red-600 font-medium">
                                    Aggravating
                                  </span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {assessment.aggravating_factors}
                                  </p>
                                </div>
                              )}
                              {assessment.relieving_factors && (
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                  <span className="text-xs text-green-600 font-medium">
                                    Relieving
                                  </span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {assessment.relieving_factors}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* History */}
                        {(assessment.medical_history ||
                          assessment.surgical_history ||
                          assessment.medications ||
                          assessment.allergies) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              History
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {assessment.medical_history && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Medical
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.medical_history}
                                  </p>
                                </div>
                              )}
                              {assessment.surgical_history && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Surgical
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.surgical_history}
                                  </p>
                                </div>
                              )}
                              {assessment.medications && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Medications
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.medications}
                                  </p>
                                </div>
                              )}
                              {assessment.allergies && (
                                <div className="bg-red-50 p-2 rounded border border-red-200">
                                  <span className="text-xs text-red-600 font-medium">
                                    Allergies
                                  </span>
                                  <p className="text-sm text-red-800 font-medium">
                                    {assessment.allergies}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Functional Assessment */}
                        {(assessment.functional_status ||
                          assessment.mobility_status ||
                          assessment.gait_pattern ||
                          assessment.balance_assessment) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Functional Assessment
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {assessment.functional_status && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Functional Status
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.functional_status}
                                  </p>
                                </div>
                              )}
                              {assessment.mobility_status && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Mobility
                                  </span>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {assessment.mobility_status}
                                  </p>
                                </div>
                              )}
                              {assessment.gait_pattern && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Gait Pattern
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.gait_pattern}
                                  </p>
                                </div>
                              )}
                              {assessment.balance_assessment && (
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Balance
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {assessment.balance_assessment}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Range of Motion */}
                        {(assessment.rom_joint || assessment.rom_notes) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Range of Motion{' '}
                              {assessment.rom_joint &&
                                `- ${assessment.rom_joint}`}
                            </p>
                            {(assessment.rom_flexion_active !== null ||
                              assessment.rom_extension_active !== null) && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-1 px-2 font-medium text-gray-700">
                                        Movement
                                      </th>
                                      <th className="text-center py-1 px-2 font-medium text-gray-700">
                                        Active
                                      </th>
                                      <th className="text-center py-1 px-2 font-medium text-gray-700">
                                        Passive
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(assessment.rom_flexion_active !== null ||
                                      assessment.rom_flexion_passive !==
                                        null) && (
                                      <tr className="border-b border-gray-100">
                                        <td className="py-1 px-2 text-gray-600">
                                          Flexion
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_flexion_active ?? '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_flexion_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                    {(assessment.rom_extension_active !==
                                      null ||
                                      assessment.rom_extension_passive !==
                                        null) && (
                                      <tr className="border-b border-gray-100">
                                        <td className="py-1 px-2 text-gray-600">
                                          Extension
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_extension_active ??
                                            '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_extension_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                    {(assessment.rom_abduction_active !==
                                      null ||
                                      assessment.rom_abduction_passive !==
                                        null) && (
                                      <tr className="border-b border-gray-100">
                                        <td className="py-1 px-2 text-gray-600">
                                          Abduction
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_abduction_active ??
                                            '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_abduction_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                    {(assessment.rom_adduction_active !==
                                      null ||
                                      assessment.rom_adduction_passive !==
                                        null) && (
                                      <tr className="border-b border-gray-100">
                                        <td className="py-1 px-2 text-gray-600">
                                          Adduction
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_adduction_active ??
                                            '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_adduction_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                    {(assessment.rom_internal_rotation_active !==
                                      null ||
                                      assessment.rom_internal_rotation_passive !==
                                        null) && (
                                      <tr className="border-b border-gray-100">
                                        <td className="py-1 px-2 text-gray-600">
                                          Internal Rotation
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_internal_rotation_active ??
                                            '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_internal_rotation_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                    {(assessment.rom_external_rotation_active !==
                                      null ||
                                      assessment.rom_external_rotation_passive !==
                                        null) && (
                                      <tr>
                                        <td className="py-1 px-2 text-gray-600">
                                          External Rotation
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_external_rotation_active ??
                                            '-'}
                                          °
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                          {assessment.rom_external_rotation_passive ??
                                            '-'}
                                          °
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {assessment.rom_notes && (
                              <p className="text-sm text-gray-700 mt-2">
                                {assessment.rom_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Muscle Strength */}
                        {(assessment.muscle_groups_tested ||
                          assessment.muscle_strength_grades ||
                          assessment.muscle_strength_notes) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Muscle Strength (MRC Scale)
                            </p>
                            {assessment.muscle_strength_grades &&
                              typeof assessment.muscle_strength_grades ===
                                'object' && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {Object.entries(
                                    assessment.muscle_strength_grades,
                                  ).map(([muscle, grade]) => (
                                    <span
                                      key={muscle}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                    >
                                      {muscle}:{' '}
                                      <span className="font-medium">
                                        {String(grade)}/5
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            {assessment.muscle_strength_notes && (
                              <p className="text-sm text-gray-700">
                                {assessment.muscle_strength_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Special Tests */}
                        {(assessment.special_tests_performed ||
                          assessment.special_tests_findings) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Special Tests
                            </p>
                            {assessment.special_tests_performed &&
                              Array.isArray(
                                assessment.special_tests_performed,
                              ) && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {assessment.special_tests_performed.map(
                                    (test: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                      >
                                        {test}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                            {assessment.special_tests_findings &&
                              typeof assessment.special_tests_findings ===
                                'object' && (
                                <div className="space-y-1 text-sm">
                                  {Object.entries(
                                    assessment.special_tests_findings,
                                  ).map(([test, result]) => (
                                    <p key={test} className="text-gray-700">
                                      <span className="font-medium">
                                        {test}:
                                      </span>{' '}
                                      {String(result)}
                                    </p>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}

                        {/* Goals */}
                        {(assessment.short_term_goals ||
                          assessment.long_term_goals ||
                          assessment.patient_goals) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Treatment Goals
                            </p>
                            <div className="space-y-2">
                              {assessment.short_term_goals && (
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                  <span className="text-xs text-green-600 font-medium">
                                    Short-term (2-4 weeks)
                                  </span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {assessment.short_term_goals}
                                  </p>
                                </div>
                              )}
                              {assessment.long_term_goals && (
                                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                  <span className="text-xs text-blue-600 font-medium">
                                    Long-term (6-12 weeks)
                                  </span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {assessment.long_term_goals}
                                  </p>
                                </div>
                              )}
                              {assessment.patient_goals && (
                                <div className="bg-purple-50 p-2 rounded border border-purple-100">
                                  <span className="text-xs text-purple-600 font-medium">
                                    Patient Goals
                                  </span>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {assessment.patient_goals}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Prognosis */}
                        {(assessment.prognosis ||
                          assessment.prognosis_notes ||
                          assessment.estimated_sessions ||
                          assessment.estimated_duration_weeks) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Prognosis
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {assessment.prognosis && (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    assessment.prognosis === 'Excellent'
                                      ? 'bg-green-100 text-green-700'
                                      : assessment.prognosis === 'Good'
                                        ? 'bg-blue-100 text-blue-700'
                                        : assessment.prognosis === 'Fair'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {assessment.prognosis}
                                </span>
                              )}
                              {assessment.estimated_sessions && (
                                <span className="text-gray-600">
                                  Est. Sessions:{' '}
                                  <span className="font-medium text-gray-900">
                                    {assessment.estimated_sessions}
                                  </span>
                                </span>
                              )}
                              {assessment.estimated_duration_weeks && (
                                <span className="text-gray-600">
                                  Duration:{' '}
                                  <span className="font-medium text-gray-900">
                                    {assessment.estimated_duration_weeks} weeks
                                  </span>
                                </span>
                              )}
                            </div>
                            {assessment.prognosis_notes && (
                              <p className="text-sm text-gray-700 mt-2">
                                {assessment.prognosis_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Precautions & Contraindications */}
                        {(assessment.precautions ||
                          assessment.contraindications ||
                          assessment.red_flags_present) && (
                          <div className="bg-white p-3 rounded-lg border border-red-200 bg-red-50/30 md:col-span-2">
                            <p className="text-xs text-red-600 uppercase font-medium mb-2">
                              Precautions & Contraindications
                            </p>
                            <div className="space-y-2">
                              {assessment.red_flags_present &&
                                assessment.red_flags &&
                                Array.isArray(assessment.red_flags) && (
                                  <div className="bg-red-100 p-2 rounded border border-red-200">
                                    <span className="text-xs text-red-700 font-medium">
                                      ⚠️ Red Flags Present
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {assessment.red_flags.map(
                                        (flag: string, i: number) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded"
                                          >
                                            {flag}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              {assessment.precautions && (
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">
                                    Precautions:
                                  </span>{' '}
                                  {assessment.precautions}
                                </p>
                              )}
                              {assessment.contraindications && (
                                <p className="text-sm text-red-700">
                                  <span className="font-medium">
                                    Contraindications:
                                  </span>{' '}
                                  {assessment.contraindications}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Physio Sessions */}
      {physioData.sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Treatment Sessions
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {physioData.sessions.map((session, idx) => {
              const isExpanded = expandedSessionId === session.session_id;
              return (
                <div
                  key={session.session_id}
                  className={idx > 0 ? 'border-t border-gray-100' : ''}
                >
                  <button
                    onClick={() => toggleSession(session.session_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-teal-100">
                        <Activity size={16} className="text-teal-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          Session #{session.session_number || '1'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {session.treatments_performed && (
                            <span>
                              {session.treatments_performed
                                .slice(0, 3)
                                .join(', ')}{' '}
                              •{' '}
                            </span>
                          )}
                          <span>{formatDateTime(session.session_date)}</span>
                          {session.duration_minutes && (
                            <span> • {session.duration_minutes} min</span>
                          )}
                          {session.therapist && (
                            <span>
                              {' '}
                              • By {session.therapist.first_name}{' '}
                              {session.therapist.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {session.pain_level_after !== null && (
                        <span className="text-xs text-gray-500">
                          Pain: {session.pain_level_after}/10
                        </span>
                      )}
                      <StatusBadge status={session.status} />
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-teal-50/50 border-t border-teal-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {session.treatments_performed &&
                          session.treatments_performed.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                                Treatments Performed
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {session.treatments_performed.map(
                                  (treatment: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full"
                                    >
                                      {treatment}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        {session.duration_minutes && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Duration
                            </p>
                            <p className="text-gray-900 text-sm">
                              {session.duration_minutes} minutes
                            </p>
                          </div>
                        )}
                        {(session.pain_level_before !== null ||
                          session.pain_level_after !== null) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Pain Level
                            </p>
                            <p className="text-gray-900 text-sm">
                              Before: {session.pain_level_before ?? 'N/A'}/10 →
                              After: {session.pain_level_after ?? 'N/A'}/10
                            </p>
                          </div>
                        )}
                        {session.patient_response && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Patient Response
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {session.patient_response}
                            </p>
                          </div>
                        )}
                        {session.exercises_prescribed && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Exercises Prescribed
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {typeof session.exercises_prescribed === 'object'
                                ? JSON.stringify(
                                    session.exercises_prescribed,
                                    null,
                                    2,
                                  )
                                : session.exercises_prescribed}
                            </p>
                          </div>
                        )}
                        {session.home_program && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Home Program
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {session.home_program}
                            </p>
                          </div>
                        )}
                        {session.notes && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Session Notes
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {session.notes}
                            </p>
                          </div>
                        )}
                        {session.next_session_plan && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Next Session Plan
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {session.next_session_plan}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
