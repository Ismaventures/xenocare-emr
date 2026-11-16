/**
 * OphthalmologyPanel - Shows eye exams and procedures for an encounter
 */

import React, { useState, useEffect } from 'react';
import { Eye, Syringe, ChevronDown, Loader2 } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { StatusBadge, formatDateTime } from '../shared';
import { supabase } from '../../../../../../api/supabaseClient';

interface OphthalmologyPanelProps {
  encounter: EncounterDetail;
}

export function OphthalmologyPanel({ encounter }: OphthalmologyPanelProps) {
  const [eyeData, setEyeData] = useState<{ exams: any[]; procedures: any[] }>({
    exams: [],
    procedures: [],
  });
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedProcId, setExpandedProcId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEyeData() {
      setLoading(true);
      try {
        // Fetch eye exams for this encounter
        const { data: exams, error: examsError } = await supabase
          .from('eye_exams')
          .select('*, created_by_staff:staff(first_name, last_name)')
          .eq('encounter_id', encounter.encounter_id)
          .order('created_at', { ascending: false });

        // Fetch eye procedures for this encounter
        const { data: procedures, error: procsError } = await supabase
          .from('eye_procedures')
          .select('*, performed_by_staff:staff(first_name, last_name)')
          .eq('encounter_id', encounter.encounter_id)
          .order('created_at', { ascending: false });

        if (!examsError && !procsError) {
          setEyeData({
            exams: exams || [],
            procedures: procedures || [],
          });
        }
      } catch (err) {
        console.error('Error fetching ophthalmology data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (encounter.encounter_id) {
      fetchEyeData();
    }
  }, [encounter.encounter_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Loading eye records...</span>
      </div>
    );
  }

  const hasData = eyeData.exams.length > 0 || eyeData.procedures.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No Ophthalmology Records"
        description="No eye examinations or procedures recorded for this encounter."
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
          <Eye size={18} className="text-blue-600" />
          Ophthalmology Records
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {eyeData.exams.length + eyeData.procedures.length}
          </span>
        </h2>
      </div>

      {/* Eye Exams */}
      {eyeData.exams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Eye Examinations
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {eyeData.exams.map((exam, idx) => {
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                        <Eye size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {exam.chief_complaint || 'Eye Examination'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {exam.diagnosis && <span>{exam.diagnosis} • </span>}
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
                    <div className="px-4 pb-4 pt-2 bg-blue-50/50 border-t border-blue-100">
                      <div className="space-y-4">
                        {/* Chief Complaint & History */}
                        {(exam.chief_complaint ||
                          exam.complaint_duration ||
                          exam.affected_eye) && (
                          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-3">
                            <p className="text-xs text-amber-700 uppercase font-bold mb-1">
                              Chief Complaint
                            </p>
                            <p className="text-gray-900 text-sm font-medium">
                              {exam.chief_complaint || '—'}
                            </p>
                            <div className="flex gap-4 mt-1 text-xs text-amber-700">
                              {exam.complaint_duration && (
                                <span>Duration: {exam.complaint_duration}</span>
                              )}
                              {exam.affected_eye && (
                                <span>
                                  Affected:{' '}
                                  {exam.affected_eye === 'Both'
                                    ? 'OU'
                                    : exam.affected_eye === 'Right'
                                      ? 'OD'
                                      : 'OS'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* History Section */}
                        {(exam.ocular_history ||
                          exam.ocular_surgery_history ||
                          exam.systemic_history ||
                          exam.family_history ||
                          exam.drug_allergy ||
                          exam.current_medications ||
                          exam.glasses_history ||
                          exam.contact_lens_history) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Clinical History
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {exam.ocular_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Ocular History:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.ocular_history}
                                  </span>
                                </div>
                              )}
                              {exam.ocular_surgery_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Ocular Surgery:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.ocular_surgery_history}
                                  </span>
                                </div>
                              )}
                              {exam.systemic_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Systemic History:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.systemic_history}
                                  </span>
                                </div>
                              )}
                              {exam.family_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Family History:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.family_history}
                                  </span>
                                </div>
                              )}
                              {exam.drug_allergy && (
                                <div className="text-red-600">
                                  <span className="text-xs">Drug Allergy:</span>{' '}
                                  <span className="font-medium">
                                    {exam.drug_allergy}
                                  </span>
                                </div>
                              )}
                              {exam.current_medications && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Medications:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.current_medications}
                                  </span>
                                </div>
                              )}
                              {exam.glasses_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Glasses History:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.glasses_history}
                                  </span>
                                </div>
                              )}
                              {exam.contact_lens_history && (
                                <div>
                                  <span className="text-gray-500 text-xs">
                                    Contact Lens:
                                  </span>{' '}
                                  <span className="text-gray-900">
                                    {exam.contact_lens_history}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Visual Acuity - OD/OS Table */}
                        {(exam.va_right_unaided ||
                          exam.va_left_unaided ||
                          exam.va_right_aided ||
                          exam.va_left_aided ||
                          exam.va_right_pinhole ||
                          exam.va_left_pinhole ||
                          exam.va_right_near ||
                          exam.va_left_near ||
                          exam.bcva_right ||
                          exam.bcva_left ||
                          exam.va_od_uncorrected ||
                          exam.va_os_uncorrected ||
                          exam.va_od_corrected ||
                          exam.va_os_corrected) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Visual Acuity
                            </p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="py-1.5 px-2 text-left text-xs font-medium text-gray-500">
                                    Parameter
                                  </th>
                                  <th className="py-1.5 px-2 text-center text-xs font-semibold text-blue-600">
                                    OD (Right)
                                  </th>
                                  <th className="py-1.5 px-2 text-center text-xs font-semibold text-emerald-600">
                                    OS (Left)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(exam.va_right_unaided ||
                                  exam.va_left_unaided ||
                                  exam.va_od_uncorrected ||
                                  exam.va_os_uncorrected) && (
                                  <tr>
                                    <td className="py-1.5 px-2 text-gray-600">
                                      Unaided (Distance)
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_right_unaided ||
                                        exam.va_od_uncorrected ||
                                        '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_left_unaided ||
                                        exam.va_os_uncorrected ||
                                        '—'}
                                    </td>
                                  </tr>
                                )}
                                {(exam.va_right_aided ||
                                  exam.va_left_aided ||
                                  exam.va_od_corrected ||
                                  exam.va_os_corrected) && (
                                  <tr>
                                    <td className="py-1.5 px-2 text-gray-600">
                                      Aided (Distance)
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_right_aided ||
                                        exam.va_od_corrected ||
                                        '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_left_aided ||
                                        exam.va_os_corrected ||
                                        '—'}
                                    </td>
                                  </tr>
                                )}
                                {(exam.va_right_pinhole ||
                                  exam.va_left_pinhole) && (
                                  <tr>
                                    <td className="py-1.5 px-2 text-gray-600">
                                      Pinhole
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_right_pinhole || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_left_pinhole || '—'}
                                    </td>
                                  </tr>
                                )}
                                {(exam.va_right_near || exam.va_left_near) && (
                                  <tr>
                                    <td className="py-1.5 px-2 text-gray-600">
                                      Near Vision
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_right_near || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono">
                                      {exam.va_left_near || '—'}
                                    </td>
                                  </tr>
                                )}
                                {(exam.bcva_right || exam.bcva_left) && (
                                  <tr className="bg-blue-50">
                                    <td className="py-1.5 px-2 text-gray-700 font-medium">
                                      BCVA
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono font-semibold">
                                      {exam.bcva_right || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono font-semibold">
                                      {exam.bcva_left || '—'}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* IOP */}
                        {(exam.iop_right ||
                          exam.iop_left ||
                          exam.iop_od ||
                          exam.iop_os ||
                          exam.iop_time ||
                          exam.iop_method) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Intraocular Pressure
                            </p>
                            <div className="flex gap-6 items-center">
                              <div className="text-center">
                                <span className="text-xs text-blue-600 font-semibold block">
                                  OD (Right)
                                </span>
                                <span
                                  className={`text-xl font-bold font-mono ${(exam.iop_right || exam.iop_od) > 21 ? 'text-red-600' : 'text-gray-900'}`}
                                >
                                  {exam.iop_right || exam.iop_od || '—'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {' '}
                                  mmHg
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="text-xs text-emerald-600 font-semibold block">
                                  OS (Left)
                                </span>
                                <span
                                  className={`text-xl font-bold font-mono ${(exam.iop_left || exam.iop_os) > 21 ? 'text-red-600' : 'text-gray-900'}`}
                                >
                                  {exam.iop_left || exam.iop_os || '—'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {' '}
                                  mmHg
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 ml-auto">
                                {exam.iop_method && (
                                  <span className="block">
                                    Method: {exam.iop_method}
                                  </span>
                                )}
                                {exam.iop_time && (
                                  <span className="block">
                                    Time: {exam.iop_time}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Refraction - Auto & Subjective */}
                        {(exam.ar_right_sphere ||
                          exam.ar_left_sphere ||
                          exam.rx_right_sphere ||
                          exam.rx_left_sphere ||
                          exam.refraction_od ||
                          exam.refraction_os) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Refraction
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Auto-Refraction */}
                              {(exam.ar_right_sphere ||
                                exam.ar_left_sphere) && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">
                                    Auto-Refraction
                                  </p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th />
                                        <th className="text-blue-600">OD</th>
                                        <th className="text-emerald-600">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="text-gray-500">
                                          Sphere
                                        </td>
                                        <td className="text-center font-mono">
                                          {exam.ar_right_sphere ?? '—'}
                                        </td>
                                        <td className="text-center font-mono">
                                          {exam.ar_left_sphere ?? '—'}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="text-gray-500">
                                          Cylinder
                                        </td>
                                        <td className="text-center font-mono">
                                          {exam.ar_right_cylinder ?? '—'}
                                        </td>
                                        <td className="text-center font-mono">
                                          {exam.ar_left_cylinder ?? '—'}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="text-gray-500">Axis</td>
                                        <td className="text-center font-mono">
                                          {exam.ar_right_axis
                                            ? `${exam.ar_right_axis}°`
                                            : '—'}
                                        </td>
                                        <td className="text-center font-mono">
                                          {exam.ar_left_axis
                                            ? `${exam.ar_left_axis}°`
                                            : '—'}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {/* Subjective/Final Rx */}
                              {(exam.rx_right_sphere ||
                                exam.rx_left_sphere) && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">
                                    Subjective (Final Rx)
                                  </p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-blue-50">
                                        <th />
                                        <th className="text-blue-600">OD</th>
                                        <th className="text-emerald-600">OS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="text-gray-500">
                                          Sphere
                                        </td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_right_sphere ?? '—'}
                                        </td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_left_sphere ?? '—'}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="text-gray-500">
                                          Cylinder
                                        </td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_right_cylinder ?? '—'}
                                        </td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_left_cylinder ?? '—'}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="text-gray-500">Axis</td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_right_axis
                                            ? `${exam.rx_right_axis}°`
                                            : '—'}
                                        </td>
                                        <td className="text-center font-mono font-semibold">
                                          {exam.rx_left_axis
                                            ? `${exam.rx_left_axis}°`
                                            : '—'}
                                        </td>
                                      </tr>
                                      {(exam.rx_right_add ||
                                        exam.rx_left_add) && (
                                        <tr>
                                          <td className="text-gray-500">Add</td>
                                          <td className="text-center font-mono">
                                            {exam.rx_right_add ?? '—'}
                                          </td>
                                          <td className="text-center font-mono">
                                            {exam.rx_left_add ?? '—'}
                                          </td>
                                        </tr>
                                      )}
                                      {(exam.rx_right_prism ||
                                        exam.rx_left_prism) && (
                                        <tr>
                                          <td className="text-gray-500">
                                            Prism
                                          </td>
                                          <td className="text-center font-mono">
                                            {exam.rx_right_prism ?? '—'}
                                          </td>
                                          <td className="text-center font-mono">
                                            {exam.rx_left_prism ?? '—'}
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {/* Legacy refraction fields */}
                              {(exam.refraction_od || exam.refraction_os) &&
                                !exam.rx_right_sphere && (
                                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-xs text-gray-500">
                                        Refraction OD:
                                      </span>{' '}
                                      <span className="font-mono">
                                        {exam.refraction_od}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">
                                        Refraction OS:
                                      </span>{' '}
                                      <span className="font-mono">
                                        {exam.refraction_os}
                                      </span>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}

                        {/* Pupil & Motility */}
                        {(exam.pupil_right_size ||
                          exam.pupil_left_size ||
                          exam.pupil_right_reaction ||
                          exam.pupil_left_reaction ||
                          exam.cover_test ||
                          exam.ocular_motility ||
                          exam.convergence ||
                          exam.npc) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Pupils & Motility
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {(exam.pupil_right_size ||
                                exam.pupil_left_size) && (
                                <>
                                  <div>
                                    <span className="text-xs text-gray-500 block">
                                      Pupil Size OD
                                    </span>
                                    <span className="font-mono">
                                      {exam.pupil_right_size ?? '—'} mm
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 block">
                                      Pupil Size OS
                                    </span>
                                    <span className="font-mono">
                                      {exam.pupil_left_size ?? '—'} mm
                                    </span>
                                  </div>
                                </>
                              )}
                              {(exam.pupil_right_reaction ||
                                exam.pupil_left_reaction) && (
                                <>
                                  <div>
                                    <span className="text-xs text-gray-500 block">
                                      Reaction OD
                                    </span>
                                    <span
                                      className={
                                        exam.pupil_right_reaction === 'RAPD'
                                          ? 'text-red-600 font-medium'
                                          : ''
                                      }
                                    >
                                      {exam.pupil_right_reaction ?? '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-500 block">
                                      Reaction OS
                                    </span>
                                    <span
                                      className={
                                        exam.pupil_left_reaction === 'RAPD'
                                          ? 'text-red-600 font-medium'
                                          : ''
                                      }
                                    >
                                      {exam.pupil_left_reaction ?? '—'}
                                    </span>
                                  </div>
                                </>
                              )}
                              {exam.cover_test && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Cover Test
                                  </span>
                                  {exam.cover_test}
                                </div>
                              )}
                              {exam.ocular_motility && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Ocular Motility
                                  </span>
                                  {exam.ocular_motility}
                                </div>
                              )}
                              {exam.convergence && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Convergence
                                  </span>
                                  {exam.convergence}
                                </div>
                              )}
                              {exam.npc && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    NPC
                                  </span>
                                  {exam.npc}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Anterior Segment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(exam.anterior_right_lids ||
                            exam.anterior_right_conjunctiva ||
                            exam.anterior_right_cornea ||
                            exam.anterior_right_ac ||
                            exam.anterior_right_iris ||
                            exam.anterior_right_lens ||
                            exam.anterior_segment_od) && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-600 uppercase font-medium mb-2">
                                Anterior Segment OD
                              </p>
                              <div className="space-y-1 text-sm">
                                {exam.anterior_right_lids && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Lids:
                                    </span>{' '}
                                    {exam.anterior_right_lids}
                                  </div>
                                )}
                                {exam.anterior_right_conjunctiva && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Conjunctiva:
                                    </span>{' '}
                                    {exam.anterior_right_conjunctiva}
                                  </div>
                                )}
                                {exam.anterior_right_cornea && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Cornea:
                                    </span>{' '}
                                    {exam.anterior_right_cornea}
                                  </div>
                                )}
                                {exam.anterior_right_ac && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      AC:
                                    </span>{' '}
                                    {exam.anterior_right_ac}
                                  </div>
                                )}
                                {exam.anterior_right_iris && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Iris:
                                    </span>{' '}
                                    {exam.anterior_right_iris}
                                  </div>
                                )}
                                {exam.anterior_right_lens && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Lens:
                                    </span>{' '}
                                    {exam.anterior_right_lens}
                                  </div>
                                )}
                                {exam.anterior_segment_od && (
                                  <div className="text-gray-700 whitespace-pre-wrap">
                                    {exam.anterior_segment_od}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {(exam.anterior_left_lids ||
                            exam.anterior_left_conjunctiva ||
                            exam.anterior_left_cornea ||
                            exam.anterior_left_ac ||
                            exam.anterior_left_iris ||
                            exam.anterior_left_lens ||
                            exam.anterior_segment_os) && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                              <p className="text-xs text-emerald-600 uppercase font-medium mb-2">
                                Anterior Segment OS
                              </p>
                              <div className="space-y-1 text-sm">
                                {exam.anterior_left_lids && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Lids:
                                    </span>{' '}
                                    {exam.anterior_left_lids}
                                  </div>
                                )}
                                {exam.anterior_left_conjunctiva && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Conjunctiva:
                                    </span>{' '}
                                    {exam.anterior_left_conjunctiva}
                                  </div>
                                )}
                                {exam.anterior_left_cornea && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Cornea:
                                    </span>{' '}
                                    {exam.anterior_left_cornea}
                                  </div>
                                )}
                                {exam.anterior_left_ac && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      AC:
                                    </span>{' '}
                                    {exam.anterior_left_ac}
                                  </div>
                                )}
                                {exam.anterior_left_iris && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Iris:
                                    </span>{' '}
                                    {exam.anterior_left_iris}
                                  </div>
                                )}
                                {exam.anterior_left_lens && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Lens:
                                    </span>{' '}
                                    {exam.anterior_left_lens}
                                  </div>
                                )}
                                {exam.anterior_segment_os && (
                                  <div className="text-gray-700 whitespace-pre-wrap">
                                    {exam.anterior_segment_os}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Gonioscopy */}
                        {(exam.gonioscopy_right ||
                          exam.gonioscopy_left ||
                          exam.angle_right ||
                          exam.angle_left) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Gonioscopy
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-xs text-blue-600 block">
                                  OD
                                </span>
                                {exam.gonioscopy_right ||
                                  exam.angle_right ||
                                  '—'}
                              </div>
                              <div>
                                <span className="text-xs text-emerald-600 block">
                                  OS
                                </span>
                                {exam.gonioscopy_left || exam.angle_left || '—'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Posterior Segment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(exam.posterior_right_disc ||
                            exam.posterior_right_macula ||
                            exam.posterior_right_vessels ||
                            exam.posterior_right_periphery ||
                            exam.posterior_right_vitreous ||
                            exam.posterior_segment_od) && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-600 uppercase font-medium mb-2">
                                Posterior Segment OD
                              </p>
                              <div className="space-y-1 text-sm">
                                {exam.posterior_right_disc && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Disc:
                                    </span>{' '}
                                    {exam.posterior_right_disc}
                                  </div>
                                )}
                                {exam.cdr_right && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      C/D Ratio:
                                    </span>{' '}
                                    <span className="font-mono">
                                      {exam.cdr_right}
                                    </span>
                                  </div>
                                )}
                                {exam.posterior_right_macula && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Macula:
                                    </span>{' '}
                                    {exam.posterior_right_macula}
                                  </div>
                                )}
                                {exam.posterior_right_vessels && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Vessels:
                                    </span>{' '}
                                    {exam.posterior_right_vessels}
                                  </div>
                                )}
                                {exam.posterior_right_periphery && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Periphery:
                                    </span>{' '}
                                    {exam.posterior_right_periphery}
                                  </div>
                                )}
                                {exam.posterior_right_vitreous && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Vitreous:
                                    </span>{' '}
                                    {exam.posterior_right_vitreous}
                                  </div>
                                )}
                                {exam.posterior_segment_od && (
                                  <div className="text-gray-700 whitespace-pre-wrap">
                                    {exam.posterior_segment_od}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {(exam.posterior_left_disc ||
                            exam.posterior_left_macula ||
                            exam.posterior_left_vessels ||
                            exam.posterior_left_periphery ||
                            exam.posterior_left_vitreous ||
                            exam.posterior_segment_os) && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                              <p className="text-xs text-emerald-600 uppercase font-medium mb-2">
                                Posterior Segment OS
                              </p>
                              <div className="space-y-1 text-sm">
                                {exam.posterior_left_disc && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Disc:
                                    </span>{' '}
                                    {exam.posterior_left_disc}
                                  </div>
                                )}
                                {exam.cdr_left && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      C/D Ratio:
                                    </span>{' '}
                                    <span className="font-mono">
                                      {exam.cdr_left}
                                    </span>
                                  </div>
                                )}
                                {exam.posterior_left_macula && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Macula:
                                    </span>{' '}
                                    {exam.posterior_left_macula}
                                  </div>
                                )}
                                {exam.posterior_left_vessels && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Vessels:
                                    </span>{' '}
                                    {exam.posterior_left_vessels}
                                  </div>
                                )}
                                {exam.posterior_left_periphery && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Periphery:
                                    </span>{' '}
                                    {exam.posterior_left_periphery}
                                  </div>
                                )}
                                {exam.posterior_left_vitreous && (
                                  <div>
                                    <span className="text-gray-500 text-xs">
                                      Vitreous:
                                    </span>{' '}
                                    {exam.posterior_left_vitreous}
                                  </div>
                                )}
                                {exam.posterior_segment_os && (
                                  <div className="text-gray-700 whitespace-pre-wrap">
                                    {exam.posterior_segment_os}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Additional Tests */}
                        {(exam.color_vision ||
                          exam.contrast_sensitivity ||
                          exam.amsler_grid ||
                          exam.schirmer_test_right ||
                          exam.schirmer_test_left ||
                          exam.visual_field_notes) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                              Additional Tests
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              {exam.color_vision && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Color Vision
                                  </span>
                                  {exam.color_vision}
                                </div>
                              )}
                              {exam.contrast_sensitivity && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Contrast Sensitivity
                                  </span>
                                  {exam.contrast_sensitivity}
                                </div>
                              )}
                              {exam.amsler_grid && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Amsler Grid
                                  </span>
                                  {exam.amsler_grid}
                                </div>
                              )}
                              {(exam.schirmer_test_right ||
                                exam.schirmer_test_left) && (
                                <div>
                                  <span className="text-xs text-gray-500 block">
                                    Schirmer Test
                                  </span>
                                  OD: {exam.schirmer_test_right ?? '—'} / OS:{' '}
                                  {exam.schirmer_test_left ?? '—'} mm
                                </div>
                              )}
                              {exam.visual_field_notes && (
                                <div className="md:col-span-3">
                                  <span className="text-xs text-gray-500 block">
                                    Visual Field
                                  </span>
                                  {exam.visual_field_notes}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {(exam.diagnosis ||
                          exam.provisional_diagnosis ||
                          exam.final_diagnosis) && (
                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                            <p className="text-xs text-emerald-700 uppercase font-medium mb-1">
                              Diagnosis
                            </p>
                            <p className="text-emerald-800 text-sm font-medium">
                              {exam.final_diagnosis ||
                                exam.diagnosis ||
                                exam.provisional_diagnosis}
                            </p>
                          </div>
                        )}

                        {/* Treatment Plan */}
                        {exam.treatment_plan && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 uppercase font-medium mb-1">
                              Treatment Plan
                            </p>
                            <p className="text-blue-800 text-sm whitespace-pre-wrap">
                              {exam.treatment_plan}
                            </p>
                          </div>
                        )}

                        {/* Follow-up */}
                        {(exam.follow_up_date ||
                          exam.follow_up_notes ||
                          exam.follow_up_interval) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Follow-up
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {exam.follow_up_interval && (
                                <span className="text-gray-600">
                                  Interval:{' '}
                                  <span className="font-medium text-gray-900">
                                    {exam.follow_up_interval}
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

                        {/* Clinical Notes (legacy) */}
                        {exam.clinical_notes && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
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

      {/* Eye Procedures */}
      {eyeData.procedures.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Eye Procedures
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {eyeData.procedures.map((proc, idx) => {
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100">
                        <Syringe size={16} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {proc.procedure_type ||
                            proc.procedure_name ||
                            'Eye Procedure'}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {proc.eye && <span>Eye: {proc.eye} • </span>}
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
                    <div className="px-4 pb-4 pt-2 bg-indigo-50/50 border-t border-indigo-100">
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
                        {proc.eye && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Eye
                            </p>
                            <p className="text-gray-900 text-sm">{proc.eye}</p>
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
                        {proc.anesthesia_type && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Anesthesia Type
                            </p>
                            <p className="text-gray-900 text-sm">
                              {proc.anesthesia_type}
                            </p>
                          </div>
                        )}
                        {proc.intraoperative_findings && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Intraoperative Findings
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.intraoperative_findings}
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
                        {proc.post_op_instructions && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                              Post-Op Instructions
                            </p>
                            <p className="text-gray-900 text-sm whitespace-pre-wrap">
                              {proc.post_op_instructions}
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
