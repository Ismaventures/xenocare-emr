// =============================================================================
// ANC Module — Investigations Panel (Lab + Radiology Orders)
// Shows encounter-level lab and radiology orders for ANC visits WITH results
// =============================================================================

import React, { useState } from 'react';
import { FlaskConical, Scan } from 'lucide-react';
import { useAncLabRequests, useAncRadiologyRequests } from '../hooks/useAnc';

interface Props {
  encounterId: string | undefined;
}

type SubTab = 'labs' | 'radiology';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function AncOrdersPanel({ encounterId }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('labs');
  const { data: labs = [] } = useAncLabRequests(encounterId);
  const { data: radiology = [] } = useAncRadiologyRequests(encounterId);

  if (!encounterId) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">
        No encounter linked to this visit.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setSubTab('labs')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'labs'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Lab Orders
          {labs.length > 0 && (
            <span className="ml-1 bg-pink-100 text-pink-700 text-xs px-1.5 rounded-full">
              {labs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('radiology')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'radiology'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Scan className="h-4 w-4" />
          Radiology
          {radiology.length > 0 && (
            <span className="ml-1 bg-pink-100 text-pink-700 text-xs px-1.5 rounded-full">
              {radiology.length}
            </span>
          )}
        </button>
      </div>

      {/* Lab Orders */}
      {subTab === 'labs' && (
        <div>
          <div className="bg-pink-50 border border-pink-200 rounded p-2 text-xs text-pink-700 mb-3">
            Lab investigations ordered during this ANC visit.
          </div>
          {labs.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">
              No lab orders for this visit.
            </p>
          ) : (
            <div className="space-y-4">
              {labs.map((l: any) => {
                const testName = l.test?.name || l.test_name || 'Lab Test';
                const results: any[] = Array.isArray(l.results) ? l.results : [];
                const latestResult = results.length > 0
                  ? results.reduce((best: any, curr: any) => {
                      if (!best) return curr;
                      const bTs = new Date(best.reported_at || best.approved_at || 0).getTime();
                      const cTs = new Date(curr.reported_at || curr.approved_at || 0).getTime();
                      return cTs > bTs ? curr : best;
                    }, null)
                  : null;
                const hasResult = Boolean(
                  latestResult?.result_value ||
                  latestResult?.interpretation ||
                  latestResult?.comments
                );
                const isCritical = latestResult?.is_critical === true;
                const isAbnormal = latestResult?.is_abnormal === true;

                return (
                  <div
                    key={l.request_id || l.id}
                    className={`rounded-xl border shadow-sm overflow-hidden ${
                      isCritical ? 'border-red-200 bg-white' : isAbnormal ? 'border-amber-200 bg-white' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Header bar */}
                    <div className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                      isCritical ? 'bg-red-50' : isAbnormal ? 'bg-amber-50' : 'bg-pink-50/60'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{testName}</p>
                        {isCritical && (
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-600 text-white">CRITICAL</span>
                        )}
                        {!isCritical && isAbnormal && (
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white">ABNORMAL</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          l.priority === 'stat' || l.priority === 'STAT'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {l.priority || 'Routine'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          l.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : l.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {l.status || 'Pending'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          hasResult ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {hasResult ? latestResult?.workflow_status || 'Result Available' : 'Awaiting Result'}
                        </span>
                      </div>
                    </div>
                    {/* Meta row */}
                    <div className="px-4 py-2 border-b border-slate-100 text-xs text-gray-500">
                      {fmtDate(l.created_at)}
                    </div>
                    {/* Clinical notes */}
                    {l.clinical_notes && (
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{l.clinical_notes}</p>
                      </div>
                    )}
                    {/* Result section */}
                    {hasResult && latestResult && (
                      <div className={`px-4 py-4 space-y-3 ${isCritical ? 'bg-gradient-to-b from-red-50/50 to-white' : isAbnormal ? 'bg-gradient-to-b from-amber-50/50 to-white' : 'bg-gradient-to-b from-emerald-50/50 to-white'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500' : isAbnormal ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <p className={`text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-800' : isAbnormal ? 'text-amber-800' : 'text-emerald-800'}`}>Lab Result</p>
                          </div>
                          {(latestResult.reported_at || latestResult.approved_at) && (
                            <span className="text-[11px] text-slate-400">{fmtDate(latestResult.reported_at || latestResult.approved_at)}</span>
                          )}
                        </div>
                        {latestResult.result_value && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Value</p>
                            </div>
                            <div className="px-3 py-2.5 flex items-baseline gap-2 flex-wrap">
                              <span className={`text-lg font-bold ${isCritical ? 'text-red-700' : isAbnormal ? 'text-amber-700' : 'text-slate-900'}`}>
                                {String(latestResult.result_value)}
                              </span>
                              {latestResult.unit && (
                                <span className="text-sm text-slate-500 font-medium">{latestResult.unit}</span>
                              )}
                              {latestResult.reference_range && (
                                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  Ref: {latestResult.reference_range}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {latestResult.interpretation && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Interpretation</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{latestResult.interpretation}</p>
                            </div>
                          </div>
                        )}
                        {latestResult.comments && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Notes</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{latestResult.comments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Radiology Orders */}
      {subTab === 'radiology' && (
        <div>
          <div className="bg-pink-50 border border-pink-200 rounded p-2 text-xs text-pink-700 mb-3">
            Radiology/imaging orders for this ANC visit (ultrasound scans, etc).
          </div>
          {radiology.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">
              No radiology orders for this visit.
            </p>
          ) : (
            <div className="space-y-4">
              {radiology.map((r: any) => {
                const studyName = r.imaging?.name || r.imaging_type || r.study_type || 'Imaging';
                const bodyPart = r.imaging?.body_part || r.body_part || '';
                const modality = r.imaging?.modality || r.modality || '';
                const hasReport = Boolean(r.findings || r.impression || r.report);

                return (
                  <div
                    key={r.request_id || r.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Header bar */}
                    <div className="px-4 py-2.5 bg-pink-50/60 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{studyName}</p>
                        {(bodyPart || modality) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[bodyPart, modality].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          r.priority === 'stat' || r.priority === 'STAT'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {r.priority || 'Routine'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          r.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : r.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {r.status || 'Pending'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          hasReport ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {hasReport ? 'Report Available' : 'Awaiting Report'}
                        </span>
                      </div>
                    </div>
                    {/* Meta row */}
                    <div className="px-4 py-2 border-b border-slate-100 text-xs text-gray-500">
                      {fmtDate(r.created_at)}
                    </div>
                    {/* Clinical indication */}
                    {(r.clinical_indication || r.clinical_history) && (
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Indication</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{r.clinical_indication || r.clinical_history}</p>
                      </div>
                    )}
                    {/* Report section */}
                    {hasReport && (
                      <div className="px-4 py-4 bg-gradient-to-b from-sky-50/50 to-white space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Radiology Report</p>
                          </div>
                          {(r.report_uploaded_at || r.performed_at) && (
                            <span className="text-[11px] text-slate-400">
                              {fmtDate(r.report_uploaded_at || r.performed_at)}
                            </span>
                          )}
                        </div>
                        {r.findings && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Findings</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{r.findings}</p>
                            </div>
                          </div>
                        )}
                        {r.impression && (
                          <div className="rounded-lg border-2 border-sky-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-sky-50 border-b border-sky-200">
                              <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Impression</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-900 font-semibold whitespace-pre-line leading-relaxed">{r.impression}</p>
                            </div>
                          </div>
                        )}
                        {r.report && !r.findings && !r.impression && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Report</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{r.report}</p>
                            </div>
                          </div>
                        )}
                        {r.notes && (
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Notes</p>
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{r.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
