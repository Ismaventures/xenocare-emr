import React from 'react';
import { Shield, Wind, Activity, Brain, Eye, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAePrimarySurvey } from '../../hooks/useAe';

export default function PrimarySurveySummary({
  encounterId,
}: {
  encounterId: string;
}) {
  const { data: survey, isLoading } = useAePrimarySurvey(encounterId);

  if (isLoading)
    return (
      <div className="animate-pulse flex space-x-4 p-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    );

  if (!survey)
    return (
      <div className="p-4 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        No primary survey record found.
      </div>
    );

  const renderSection = (
    title: string,
    icon: any,
    findings: any,
    actions: any,
  ) => {
    if (!findings && !actions) return null;
    const Icon = icon;
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          <h4 className="font-bold text-sm text-slate-800 uppercase tracking-widest">
            {title}
          </h4>
        </div>
        <div className="p-4 space-y-3">
          {findings && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Findings
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {findings}
              </p>
            </div>
          )}
          {actions && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Interventions / Actions
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="text-green-500 flex-shrink-0 mt-0.5"
                />
                {actions}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Primary Survey
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
          {survey.survey_time && !isNaN(new Date(survey.survey_time).getTime())
            ? format(new Date(survey.survey_time), 'PP p')
            : survey.created_at && !isNaN(new Date(survey.created_at).getTime())
              ? format(new Date(survey.created_at), 'PP p')
              : 'N/A'}
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSection(
          'A - Airway & C-Spine',
          Wind,
          survey.airway_notes,
          survey.airway_interventions?.join(', '),
        )}
        {renderSection(
          'B - Breathing',
          Wind,
          survey.chest_findings,
          survey.breathing_interventions?.join(', '),
        )}
        {renderSection(
          'C - Circulation',
          Activity,
          survey.circulation_notes,
          survey.circulation_interventions?.join(', '),
        )}
        {renderSection('D - Disability', Brain, survey.disability_notes, null)}
        {renderSection(
          'E - Exposure',
          Eye,
          survey.exposure_findings,
          survey.exposure_notes,
        )}
      </div>
    </div>
  );
}
