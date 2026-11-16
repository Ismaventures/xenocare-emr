/**
 * TreatmentPlanPanel - Displays care pathway and nursing interventions in a structured document style
 */

import React from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  FileText,
  Activity,
} from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';

interface TreatmentPlanPanelProps {
  encounter: EncounterDetail;
}

export function TreatmentPlanPanel({ encounter }: TreatmentPlanPanelProps) {
  const consultationPlan =
    encounter.consultation?.treatment_plan ||
    encounter.clinical_notes?.treatment_plan;
  const treatmentPlans = encounter.treatment_plans || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (!consultationPlan && treatmentPlans.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No Treatment Plan"
        description="A treatment plan has not been documented for this encounter."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* 1. Doctor's Clinical Plan */}
      {consultationPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Treatment Strategy</h2>
              <p className="text-xs text-gray-500">
                {encounter.doctor?.name || 'Attending Physician'}
              </p>
            </div>
          </div>

          <div className="pl-4 border-l-2 border-indigo-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {consultationPlan}
            </p>
          </div>
        </div>
      )}

      {/* 2. Structured Care Plans (Nursing & Allied Health) */}
      {treatmentPlans.length === 0 && consultationPlan && (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No structured intervention tasks registered.</p>
        </div>
      )}

      {treatmentPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Intervention Plans ({treatmentPlans.length})
          </h3>

          {treatmentPlans.map((plan) => (
            <div
              key={plan.plan_id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow"
            >
              {/* Plan header */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                    <ClipboardList className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-1.5">
                      {plan.title || 'Care Plan'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusStyle(plan.status)}`}>
                        {plan.status?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> {formatDate(plan.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {plan.created_by_name && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 h-fit">
                    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-[11px] font-bold text-white">
                      {plan.created_by_name.charAt(0)}
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-medium uppercase leading-none mb-0.5">Assigned By</span>
                      <span className="block text-xs font-semibold text-gray-800 leading-none">{plan.created_by_name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Plan Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 pb-5 border-b border-gray-100">
                {plan.description && (
                  <div>
                    <h5 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">Objectives</h5>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {plan.description}
                    </p>
                  </div>
                )}
                {plan.instructions && (
                  <div>
                    <h5 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">Instructions</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">{plan.instructions}</p>
                  </div>
                )}
              </div>

              {/* Intervention Tasks */}
              {plan.tasks && plan.tasks.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Tasks ({plan.tasks.length})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            {task.status === 'completed' ? <CheckCircle2 size={14} /> : <Activity size={14} />}
                          </div>
                          <div>
                            <span className="block text-xs font-semibold text-gray-800">{task.task_type?.replace('_', ' ')}</span>
                            {task.notes && <span className="block text-[11px] text-gray-400">{task.notes}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'ASAP'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
