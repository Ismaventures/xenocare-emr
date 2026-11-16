/**
 * DentalPanel - Shows dental exams and procedures for an encounter
 */

import React, { useState, useEffect } from 'react';
import { Smile, Syringe, ChevronDown, Loader2 } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { StatusBadge, formatDateTime } from '../shared';
import { supabase } from '../../../../../../api/supabaseClient';

interface DentalPanelProps {
  encounter: EncounterDetail;
}

export function DentalPanel({ encounter }: DentalPanelProps) {
  const [dentalData, setDentalData] = useState<{
    exams: any[];
    procedures: any[];
  }>({ exams: [], procedures: [] });
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedProcId, setExpandedProcId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDentalData() {
      setLoading(true);
      try {
        // Fetch dental exams for this encounter
        const { data: exams, error: examsError } = await supabase
          .from('dental_exams')
          .select('*, created_by_staff:staff(first_name, last_name)')
          .eq('encounter_id', encounter.encounter_id)
          .order('created_at', { ascending: false });

        // Fetch dental procedures for this encounter
        const { data: procedures, error: procsError } = await supabase
          .from('dental_procedures')
          .select('*, performed_by_staff:staff(first_name, last_name)')
          .eq('encounter_id', encounter.encounter_id)
          .order('created_at', { ascending: false });

        if (!examsError && !procsError) {
          setDentalData({
            exams: exams || [],
            procedures: procedures || [],
          });
        }
      } catch (err) {
        console.error('Error fetching dental data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (encounter.encounter_id) {
      fetchDentalData();
    }
  }, [encounter.encounter_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Loading dental records...</span>
      </div>
    );
  }

  const hasData =
    dentalData.exams.length > 0 || dentalData.procedures.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No Dental Records"
        description="No dental examinations or procedures recorded for this encounter."
      />
    );
  }

  const toggleExam = (examId: string) => {
    setExpandedExamId(expandedExamId === examId ? null : examId);
  };

  const toggleProc = (procId: string) => {
    setExpandedProcId(expandedProcId === procId ? null : procId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Smile size={18} className="text-pink-600" />
          Dental Records
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {dentalData.exams.length + dentalData.procedures.length}
          </span>
        </h2>
      </div>

      {/* Dental Exams */}
      {dentalData.exams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Dental Examinations
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {dentalData.exams.map((exam, idx) => {
              const isExpanded = expandedExamId === exam.exam_id;
              return (
                <div
                  key={exam.exam_id}
                  className={idx > 0 ? 'border-t border-gray-100' : ''}
                >
                  <button
                    onClick={() => toggleExam(exam.exam_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-pink-100">
                        <Smile size={16} className="text-pink-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {exam.chief_complaint || 'Dental Examination'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {exam.provisional_diagnosis && (
                            <span>{exam.provisional_diagnosis} • </span>
                          )}
                          <span>{formatDateTime(exam.created_at)}</span>
                          {exam.created_by_staff && (
                            <span>
                              {' '}
                              • By Dr. {exam.created_by_staff.first_name}{' '}
                              {exam.created_by_staff.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <StatusBadge status={exam.status} />
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-pink-50/50 border-t border-pink-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Chief Complaint Section */}
                        {(exam.chief_complaint ||
                          exam.complaint_duration ||
                          exam.pain_level !== undefined ||
                          exam.pain_character) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Chief Complaint
                            </p>
                            <div className="space-y-2">
                              {exam.chief_complaint && (
                                <p className="text-gray-900 text-sm">
                                  {exam.chief_complaint}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm">
                                {exam.complaint_duration && (
                                  <span className="text-gray-600">
                                    Duration:{' '}
                                    <span className="font-medium text-gray-900">
                                      {exam.complaint_duration}
                                    </span>
                                  </span>
                                )}
                                {exam.pain_level !== undefined && (
                                  <span className="text-gray-600">
                                    Pain Level:{' '}
                                    <span
                                      className={`font-medium ${exam.pain_level > 6 ? 'text-red-600' : exam.pain_level > 3 ? 'text-amber-600' : 'text-green-600'}`}
                                    >
                                      {exam.pain_level}/10
                                    </span>
                                  </span>
                                )}
                                {exam.pain_character && (
                                  <span className="text-gray-600">
                                    Character:{' '}
                                    <span className="font-medium text-gray-900">
                                      {exam.pain_character}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* History Section */}
                        {(exam.medical_history ||
                          exam.dental_history ||
                          exam.allergies ||
                          exam.current_medications) && (
                          <>
                            {exam.medical_history && (
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                                  Medical History
                                </p>
                                <p className="text-gray-900 text-sm whitespace-pre-wrap">
                                  {exam.medical_history}
                                </p>
                              </div>
                            )}
                            {exam.dental_history && (
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                                  Dental History
                                </p>
                                <p className="text-gray-900 text-sm whitespace-pre-wrap">
                                  {exam.dental_history}
                                </p>
                              </div>
                            )}
                            {exam.allergies && (
                              <div className="bg-white p-3 rounded-lg border border-red-200 bg-red-50">
                                <p className="text-xs text-red-600 uppercase font-medium mb-1">
                                  Allergies
                                </p>
                                <p className="text-red-800 text-sm font-medium">
                                  {exam.allergies}
                                </p>
                              </div>
                            )}
                            {exam.current_medications && (
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                                  Current Medications
                                </p>
                                <p className="text-gray-900 text-sm">
                                  {exam.current_medications}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Oral Examination */}
                        {exam.extraoral_findings && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Extraoral Findings
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.extraoral_findings}
                            </p>
                          </div>
                        )}
                        {exam.intraoral_findings && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Intraoral Findings
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.intraoral_findings}
                            </p>
                          </div>
                        )}
                        {exam.soft_tissue_exam && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Soft Tissue Examination
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.soft_tissue_exam}
                            </p>
                          </div>
                        )}
                        {exam.hard_tissue_exam && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Hard Tissue Examination
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.hard_tissue_exam}
                            </p>
                          </div>
                        )}
                        {exam.tmj_assessment && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              TMJ Assessment
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.tmj_assessment}
                            </p>
                          </div>
                        )}
                        {(exam.occlusion_notes || exam.occlusion_class) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Occlusion
                            </p>
                            {exam.occlusion_class && (
                              <p className="text-gray-900 text-sm font-medium">
                                {exam.occlusion_class.replace(/_/g, ' ')}
                              </p>
                            )}
                            {exam.occlusion_notes && (
                              <p className="text-gray-700 text-sm mt-1">
                                {exam.occlusion_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Periodontal Assessment */}
                        {(exam.gingival_status ||
                          exam.bleeding_on_probing !== undefined ||
                          exam.plaque_score !== undefined ||
                          exam.calculus_present !== undefined ||
                          exam.pocket_depth_notes) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Periodontal Assessment
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {exam.gingival_status && (
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <span className="text-xs text-gray-500 block">
                                    Gingival Status
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${exam.gingival_status === 'Healthy' ? 'text-green-600' : 'text-amber-600'}`}
                                  >
                                    {exam.gingival_status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}
                              {exam.bleeding_on_probing !== undefined && (
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <span className="text-xs text-gray-500 block">
                                    Bleeding on Probing
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${exam.bleeding_on_probing ? 'text-red-600' : 'text-green-600'}`}
                                  >
                                    {exam.bleeding_on_probing ? 'Yes' : 'No'}
                                  </span>
                                </div>
                              )}
                              {exam.plaque_score !== undefined && (
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <span className="text-xs text-gray-500 block">
                                    Plaque Score
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {exam.plaque_score}
                                  </span>
                                </div>
                              )}
                              {exam.calculus_present !== undefined && (
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <span className="text-xs text-gray-500 block">
                                    Calculus
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${exam.calculus_present ? 'text-amber-600' : 'text-green-600'}`}
                                  >
                                    {exam.calculus_present
                                      ? 'Present'
                                      : 'Absent'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {exam.pocket_depth_notes && (
                              <p className="text-gray-700 text-sm mt-2">
                                {exam.pocket_depth_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Radiographic Findings */}
                        {exam.radiograph_taken && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Radiographic Findings
                            </p>
                            {exam.radiograph_type && (
                              <p className="text-gray-600 text-sm">
                                Type:{' '}
                                <span className="font-medium text-gray-900">
                                  {exam.radiograph_type}
                                </span>
                              </p>
                            )}
                            {exam.radiograph_findings && (
                              <p className="text-gray-900 text-sm mt-1">
                                {exam.radiograph_findings}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Diagnosis */}
                        {exam.provisional_diagnosis && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Provisional Diagnosis
                            </p>
                            <p className="text-gray-900 text-sm font-medium">
                              {exam.provisional_diagnosis}
                            </p>
                          </div>
                        )}
                        {exam.final_diagnosis && (
                          <div className="bg-white p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                            <p className="text-xs text-emerald-600 uppercase font-medium mb-1">
                              Final Diagnosis
                            </p>
                            <p className="text-emerald-800 text-sm font-medium">
                              {exam.final_diagnosis}
                            </p>
                          </div>
                        )}

                        {/* Treatment Plan */}
                        {exam.treatment_plan && (
                          <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50 md:col-span-2">
                            <p className="text-xs text-blue-600 uppercase font-medium mb-1">
                              Treatment Plan
                            </p>
                            <p className="text-blue-800 text-sm whitespace-pre-wrap">
                              {exam.treatment_plan}
                            </p>
                            {exam.urgency && (
                              <span
                                className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                                  exam.urgency === 'Emergency'
                                    ? 'bg-red-100 text-red-700'
                                    : exam.urgency === 'Urgent'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {exam.urgency}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Follow-up */}
                        {(exam.follow_up_required ||
                          exam.follow_up_date ||
                          exam.follow_up_notes) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Follow-up
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {exam.follow_up_required !== undefined && (
                                <span className="text-gray-600">
                                  Required:{' '}
                                  <span
                                    className={`font-medium ${exam.follow_up_required ? 'text-amber-600' : 'text-gray-900'}`}
                                  >
                                    {exam.follow_up_required ? 'Yes' : 'No'}
                                  </span>
                                </span>
                              )}
                              {exam.follow_up_date && (
                                <span className="text-gray-600">
                                  Date:{' '}
                                  <span className="font-medium text-gray-900">
                                    {new Date(
                                      exam.follow_up_date,
                                    ).toLocaleDateString()}
                                  </span>
                                </span>
                              )}
                            </div>
                            {exam.follow_up_notes && (
                              <p className="text-gray-700 text-sm mt-1">
                                {exam.follow_up_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Teeth Charting (legacy) */}
                        {exam.teeth_charting && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Teeth Charting
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {typeof exam.teeth_charting === 'object'
                                ? JSON.stringify(exam.teeth_charting, null, 2)
                                : exam.teeth_charting}
                            </p>
                          </div>
                        )}

                        {/* Clinical Notes (legacy) */}
                        {exam.clinical_notes && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Clinical Notes
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {exam.clinical_notes}
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

      {/* Dental Procedures */}
      {dentalData.procedures.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Dental Procedures
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {dentalData.procedures.map((proc, idx) => {
              const isExpanded = expandedProcId === proc.procedure_id;
              return (
                <div
                  key={proc.procedure_id}
                  className={idx > 0 ? 'border-t border-gray-100' : ''}
                >
                  <button
                    onClick={() => toggleProc(proc.procedure_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-100">
                        <Syringe size={16} className="text-violet-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {proc.procedure_type ||
                            proc.procedure_description ||
                            'Dental Procedure'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {proc.tooth_numbers && (
                            <span>
                              Teeth: {proc.tooth_numbers.join(', ')} •{' '}
                            </span>
                          )}
                          <span>
                            {formatDateTime(
                              proc.procedure_date || proc.created_at,
                            )}
                          </span>
                          {proc.performed_by_staff && (
                            <span>
                              {' '}
                              • By Dr. {proc.performed_by_staff.first_name}{' '}
                              {proc.performed_by_staff.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <StatusBadge status={proc.status} />
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-violet-50/50 border-t border-violet-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {proc.procedure_type && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Procedure Type
                            </p>
                            <p className="text-gray-900 text-sm">
                              {proc.procedure_type}
                            </p>
                          </div>
                        )}
                        {proc.tooth_numbers &&
                          proc.tooth_numbers.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-100">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                                Teeth Involved
                              </p>
                              <p className="text-gray-900 text-sm">
                                {proc.tooth_numbers.join(', ')}
                              </p>
                            </div>
                          )}
                        {proc.procedure_description && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Description
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.procedure_description}
                            </p>
                          </div>
                        )}
                        {proc.anesthesia_used && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Anesthesia Used
                            </p>
                            <p className="text-gray-900 text-sm">
                              {proc.anesthesia_used}
                            </p>
                          </div>
                        )}
                        {proc.materials_used && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Materials Used
                            </p>
                            <p className="text-gray-900 text-sm">
                              {proc.materials_used}
                            </p>
                          </div>
                        )}
                        {proc.complications && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Complications
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.complications}
                            </p>
                          </div>
                        )}
                        {proc.post_procedure_instructions && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Post-Procedure Instructions
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.post_procedure_instructions}
                            </p>
                          </div>
                        )}
                        {proc.notes && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Notes
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.notes}
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
