import React from 'react';
import { format } from 'date-fns';
import { Settings2 } from 'lucide-react';
import type { EyeExamDTO } from '../types/ophthalmology.types';

interface VisitComparisonModalProps {
  exams: EyeExamDTO[];
}

export default function VisitComparisonModal({
  exams,
}: VisitComparisonModalProps) {
  // Sort from newest to oldest
  const sortedExams = [...exams].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const [exam1Id, setExam1Id] = React.useState<string>(
    sortedExams[0]?.exam_id || '',
  );
  const [exam2Id, setExam2Id] = React.useState<string>(
    sortedExams[1]?.exam_id || '',
  );

  const exam1 = sortedExams.find((e) => e.exam_id === exam1Id);
  const exam2 = sortedExams.find((e) => e.exam_id === exam2Id);

  if (sortedExams.length < 2) {
    return (
      <div className="p-8 text-center text-slate-500">
        You need at least 2 visits to compare.
      </div>
    );
  }

  const renderComparisonRow = (
    label: string,
    e1Val: any,
    e2Val: any,
    highlightIfChanged = false,
  ) => {
    const v1 = e1Val || '—';
    const v2 = e2Val || '—';
    const changed = highlightIfChanged && v1 !== v2 && v1 !== '—' && v2 !== '—';

    return (
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
        <td className="py-2 px-3 text-xs font-medium text-slate-600 w-1/3">
          {label}
        </td>
        <td
          className={`py-2 px-3 text-xs w-1/3 ${changed ? 'text-amber-700 bg-amber-50/30' : 'text-slate-800'}`}
        >
          {v2}
        </td>
        <td
          className={`py-2 px-3 text-xs w-1/3 ${changed ? 'text-amber-700 bg-amber-50/30' : 'text-slate-800'}`}
        >
          {v1}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 w-full max-w-4xl mx-auto h-[70vh] flex flex-col">
      <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <Settings2 className="h-5 w-5 text-slate-400" />
        <div className="flex-1 flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Visit 1 (Older)
            </label>
            <select
              className="w-full text-sm border-slate-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              value={exam2Id}
              onChange={(e) => setExam2Id(e.target.value)}
            >
              {sortedExams.map((ex) => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {format(new Date(ex.created_at), 'dd MMM yyyy')} -{' '}
                  {ex.provisional_diagnosis || 'Visit'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end px-2 pb-2 text-slate-400 font-bold">
            VS
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Visit 2 (Newer)
            </label>
            <select
              className="w-full text-sm border-slate-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              value={exam1Id}
              onChange={(e) => setExam1Id(e.target.value)}
            >
              {sortedExams.map((ex) => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {format(new Date(ex.created_at), 'dd MMM yyyy')} -{' '}
                  {ex.provisional_diagnosis || 'Visit'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left bg-white">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">
                Metric
              </th>
              <th className="py-3 px-3 text-xs font-bold text-slate-700 w-1/3 border-l border-slate-200">
                {exam2
                  ? format(new Date(exam2.created_at), 'dd MMM yyyy')
                  : '...'}
              </th>
              <th className="py-3 px-3 text-xs font-bold text-slate-700 w-1/3 border-l border-slate-200">
                {exam1
                  ? format(new Date(exam1.created_at), 'dd MMM yyyy')
                  : '...'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={3}
                className="bg-slate-100 py-1.5 px-3 text-xs font-bold text-slate-700"
              >
                Visual Acuity
              </td>
            </tr>
            {renderComparisonRow(
              'OD (Right)',
              exam1?.va_right_unaided || exam1?.va_right_aided,
              exam2?.va_right_unaided || exam2?.va_right_aided,
              true,
            )}
            {renderComparisonRow(
              'OS (Left)',
              exam1?.va_left_unaided || exam1?.va_left_aided,
              exam2?.va_left_unaided || exam2?.va_left_aided,
              true,
            )}

            <tr>
              <td
                colSpan={3}
                className="bg-slate-100 py-1.5 px-3 text-xs font-bold text-slate-700 mt-4"
              >
                Intraocular Pressure (IOP)
              </td>
            </tr>
            {renderComparisonRow(
              'OD (Right)',
              exam1?.iop_right ? `${exam1.iop_right} mmHg` : '',
              exam2?.iop_right ? `${exam2.iop_right} mmHg` : '',
              true,
            )}
            {renderComparisonRow(
              'OS (Left)',
              exam1?.iop_left ? `${exam1.iop_left} mmHg` : '',
              exam2?.iop_left ? `${exam2.iop_left} mmHg` : '',
              true,
            )}

            <tr>
              <td
                colSpan={3}
                className="bg-slate-100 py-1.5 px-3 text-xs font-bold text-slate-700 mt-4"
              >
                Refraction (Auto)
              </td>
            </tr>
            {renderComparisonRow(
              'OD Sph',
              exam1?.ar_right_sphere,
              exam2?.ar_right_sphere,
            )}
            {renderComparisonRow(
              'OD Cyl',
              exam1?.ar_right_cylinder,
              exam2?.ar_right_cylinder,
            )}
            {renderComparisonRow(
              'OS Sph',
              exam1?.ar_left_sphere,
              exam2?.ar_left_sphere,
            )}
            {renderComparisonRow(
              'OS Cyl',
              exam1?.ar_left_cylinder,
              exam2?.ar_left_cylinder,
            )}

            <tr>
              <td
                colSpan={3}
                className="bg-slate-100 py-1.5 px-3 text-xs font-bold text-slate-700 mt-4"
              >
                Diagnosis
              </td>
            </tr>
            {renderComparisonRow(
              'Provisional',
              exam1?.provisional_diagnosis,
              exam2?.provisional_diagnosis,
            )}
            {renderComparisonRow(
              'Final',
              exam1?.final_diagnosis,
              exam2?.final_diagnosis,
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
