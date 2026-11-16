// =============================================================================
// AeConsultationTab — Shows previous consultations + allows new ones
// Repeatable: Doctors can add multiple consultations during an A&E encounter
// =============================================================================

import React, { useState, lazy, Suspense } from 'react';
import {
  Plus,
  Stethoscope,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAeConsultations } from '../../hooks/useAe';

const AeConsultationWizard = lazy(() => import('./AeConsultationWizard'));

interface AeConsultationTabProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-8 w-8 border-3 border-red-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-400 font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default function AeConsultationTab({
  encounterId,
  patientId,
  onSuccess,
}: AeConsultationTabProps) {
  const { data: consultations = [], isLoading } =
    useAeConsultations(encounterId);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSuccess = () => {
    setShowNewForm(false);
    onSuccess?.();
  };

  if (isLoading) return <TabSpinner />;

  // If no consultations exist, show the form directly
  if (consultations.length === 0 && !showNewForm) {
    return (
      <Suspense fallback={<TabSpinner />}>
        <AeConsultationWizard
          encounterId={encounterId}
          patientId={patientId}
          onSuccess={onSuccess}
        />
      </Suspense>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Previous Consultations */}
      {consultations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Previous Consultations ({consultations.length})
            </h3>
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Consultation
              </button>
            )}
          </div>

          <div className="space-y-3">
            {consultations.map((c: any) => {
              const isExpanded = expandedId === c.id;
              const { doctor } = c;
              const doctorName = doctor
                ? `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
                : 'Unknown';
              const createdAt = c.created_at ? new Date(c.created_at) : null;

              return (
                <div
                  key={c.id}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {doctorName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {createdAt
                            ? createdAt.toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'N/A'}
                          {c.complaints && (
                            <span className="text-slate-400">
                              &bull; {c.complaints.substring(0, 80)}
                              {c.complaints.length > 80 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 py-4 space-y-3 bg-white border-t border-slate-100">
                      {c.subjective && (
                        <div>
                          <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                            Subjective
                          </h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {c.subjective}
                          </p>
                        </div>
                      )}
                      {c.objective && (
                        <div>
                          <h5 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                            Objective
                          </h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {c.objective}
                          </p>
                        </div>
                      )}
                      {c.assessment && (
                        <div>
                          <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
                            Assessment
                          </h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {c.assessment}
                          </p>
                        </div>
                      )}
                      {(c.diagnosis_text || c.working_diagnosis) && (
                        <div>
                          <h5 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                            Working Diagnosis
                          </h5>
                          <p className="text-sm text-slate-700">
                            {c.diagnosis_text || c.working_diagnosis}
                          </p>
                        </div>
                      )}
                      {c.plan && (
                        <div>
                          <h5 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                            Plan
                          </h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {c.plan}
                          </p>
                        </div>
                      )}
                      {c.treatment_plan && !c.plan && (
                        <div>
                          <h5 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                            Plan
                          </h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {c.treatment_plan}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Consultation Form */}
      {showNewForm && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" />
              New Consultation
            </h3>
            <button
              onClick={() => setShowNewForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Cancel
            </button>
          </div>
          <Suspense fallback={<TabSpinner />}>
            <AeConsultationWizard
              encounterId={encounterId}
              patientId={patientId}
              onSuccess={handleSuccess}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
