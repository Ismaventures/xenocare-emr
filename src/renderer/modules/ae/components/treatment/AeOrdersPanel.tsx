// =============================================================================
// AeOrdersPanel — Wraps existing Lab, Radiology, Prescription order forms
// with A&E-specific defaults (STAT priority)
// =============================================================================

import React, { useState } from 'react';
import {
  FlaskConical,
  Scan,
  Pill,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  useAeLabRequests,
  useAeRadiologyRequests,
  useAePrescriptions,
} from '../../hooks/useAe';
import { UniversalOrderButton } from '../../../../components/orders/UniversalOrderButton';

interface AeOrdersPanelProps {
  encounterId: string;
  patientId: string;
  patientName?: string;
}

const ORDER_TABS = [
  { key: 'labs', label: 'Lab Orders', icon: FlaskConical },
  { key: 'radiology', label: 'Radiology', icon: Scan },
  { key: 'prescriptions', label: 'Medications', icon: Pill },
  { key: 'summary', label: 'Summary', icon: ClipboardList },
] as const;

type OrderTab = (typeof ORDER_TABS)[number]['key'];

function statusBadge(status: string | null | undefined) {
  const s = (status || 'Pending').toLowerCase();
  if (s === 'completed' || s === 'reported' || s === 'verified' || s === 'approved')
    return 'bg-green-100 text-green-700';
  if (s === 'in_progress' || s === 'in-progress' || s === 'processing' || s === 'collected')
    return 'bg-blue-100 text-blue-700';
  if (s === 'cancelled' || s === 'rejected')
    return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function priorityBadge(priority: string | null | undefined) {
  const p = (priority || '').toLowerCase();
  if (p === 'stat' || p === 'urgent')
    return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

// ── Lab Order Row (expandable with results) ─────────────────────────────────

function LabOrderRow({
  testName,
  category,
  priority,
  status,
  createdAt,
  resultDate,
  isCompleted,
  hasResults,
  inlineResult,
  inlineResultNotes,
  inlineResultValue,
  inlineResultUnit,
  inlineReference,
  isCritical,
  results,
}: {
  testName: string;
  category?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  resultDate?: string;
  isCompleted: boolean;
  hasResults: boolean;
  inlineResult?: any;
  inlineResultNotes?: string;
  inlineResultValue?: number;
  inlineResultUnit?: string;
  inlineReference?: string;
  isCritical?: boolean;
  results?: any[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isCritical
          ? 'border-red-300 bg-red-50'
          : hasResults
            ? 'border-green-200 bg-green-50/30'
            : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={() => hasResults && setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm truncate">
                {testName}
              </span>
              {isCritical && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              )}
            </div>
            <div className="text-xs text-gray-500">
              {category && <span>{category} • </span>}
              {createdAt && (
                <span>
                  Requested: {new Date(createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {resultDate && (
                <span>
                  {' '}
                  • Result: {new Date(resultDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityBadge(priority)}`}>
            {priority || 'Routine'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(status)}`}>
            {status || 'Pending'}
          </span>
          {hasResults && (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )
          )}
        </div>
      </button>

      {expanded && hasResults && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white space-y-2">
          {/* Inline result from lab_requests table */}
          {inlineResult && typeof inlineResult === 'object' ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Result (JSON)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(inlineResult)
                  .filter(([, v]) => v != null && v !== '')
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-1 text-xs">
                      <span className="font-medium text-gray-500 capitalize">
                        {k.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-gray-800">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : inlineResult ? (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Result
              </p>
              <p className="text-sm text-gray-900">{String(inlineResult)}</p>
            </div>
          ) : null}

          {inlineResultValue != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">Value:</span>
              <span className="text-gray-900 font-semibold">
                {inlineResultValue}
                {inlineResultUnit ? ` ${inlineResultUnit}` : ''}
              </span>
              {inlineReference && (
                <span className="text-gray-400 text-xs">
                  (Ref: {inlineReference})
                </span>
              )}
            </div>
          )}

          {inlineResultNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Notes
              </p>
              <p className="text-sm text-gray-800">{inlineResultNotes}</p>
            </div>
          )}

          {/* Detailed results from lab_results table */}
          {results && results.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Detailed Results
              </p>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">
                        Value
                      </th>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">
                        Unit
                      </th>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">
                        Reference
                      </th>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">
                        Status
                      </th>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">
                        Comments
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((res: any) => (
                      <tr
                        key={res.id}
                        className={
                          res.is_critical
                            ? 'bg-red-50'
                            : res.is_abnormal
                              ? 'bg-yellow-50'
                              : ''
                        }
                      >
                        <td className="px-2 py-1.5 font-medium text-gray-900">
                          {res.result_value || '-'}
                          {res.is_abnormal && (
                            <AlertTriangle className="inline h-3 w-3 text-yellow-500 ml-1" />
                          )}
                          {res.is_critical && (
                            <AlertTriangle className="inline h-3 w-3 text-red-500 ml-1" />
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {res.unit || '-'}
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">
                          {res.reference_range || '-'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded ${statusBadge(res.workflow_status)}`}
                          >
                            {res.workflow_status || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-gray-600 max-w-[200px] truncate">
                          {res.comments || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Radiology Order Row (expandable with report) ────────────────────────────

function RadiologyOrderRow({
  studyName,
  modality,
  bodyPart,
  priority,
  status,
  createdAt,
  hasReport,
  findings,
  impression,
  report,
  reportDate,
  resultFileUrl,
}: {
  studyName: string;
  modality?: string;
  bodyPart?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  hasReport: boolean;
  findings?: string;
  impression?: string;
  report?: string;
  reportDate?: string;
  resultFileUrl?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        hasReport ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={() => hasReport && setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {hasReport ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm truncate">
                {studyName}
              </span>
              {modality && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  {modality}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {bodyPart && <span>{bodyPart} • </span>}
              {createdAt && (
                <span>
                  Requested: {new Date(createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {reportDate && (
                <span>
                  {' '}
                  • Reported: {new Date(reportDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityBadge(priority)}`}>
            {priority || 'Routine'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(status)}`}>
            {status || 'Pending'}
          </span>
          {hasReport && (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )
          )}
        </div>
      </button>

      {expanded && hasReport && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white space-y-3">
          {findings && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-0.5">
                Findings
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {findings}
              </p>
            </div>
          )}
          {impression && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-0.5">
                Impression
              </p>
              <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap">
                {impression}
              </p>
            </div>
          )}
          {report && !findings && !impression && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-0.5">
                Report
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {report}
              </p>
            </div>
          )}
          {resultFileUrl && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <a
                href={resultFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View attached report file
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AeOrdersPanel({
  encounterId,
  patientId,
  patientName = 'Patient',
}: AeOrdersPanelProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('labs');

  const { data: labs = [], refetch: refetchLabs } = useAeLabRequests(encounterId);
  const { data: radiology = [], refetch: refetchRadiology } = useAeRadiologyRequests(encounterId);
  const { data: prescriptions = [], refetch: refetchPrescriptions } = useAePrescriptions(encounterId);

  const handleOrdersCreated = () => {
    refetchLabs();
    refetchRadiology();
    refetchPrescriptions();
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="space-y-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        {/* Header with Add Order Button */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Orders</h2>
          <UniversalOrderButton
            encounterId={encounterId}
            patientId={patientId}
            patientName={patientName}
            encounterType="Emergency"
            onOrdersCreated={handleOrdersCreated}
            label="New Order"
          />
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-gray-200">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'labs' && labs.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
                  {labs.length}
                </span>
              )}
              {tab.key === 'radiology' && radiology.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
                  {radiology.length}
                </span>
              )}
              {tab.key === 'prescriptions' && prescriptions.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">
                  {prescriptions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'labs' && (
          <div className="space-y-3">
            {labs.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-8">
                No lab orders yet for this encounter.
              </p>
            ) : (
              <div className="space-y-2">
                {labs.map((l: any) => {
                  const testName =
                    l.test?.name || l.test_name || 'Lab Test';
                  const hasResults =
                    (l.results && l.results.length > 0) ||
                    l.result ||
                    l.result_value != null;
                  const isCompleted =
                    (l.status || '').toLowerCase() === 'completed' ||
                    (l.status || '').toLowerCase() === 'verified';

                  return (
                    <LabOrderRow
                      key={l.request_id || l.id}
                      testName={testName}
                      category={l.test?.category}
                      priority={l.priority}
                      status={l.status}
                      createdAt={l.created_at}
                      resultDate={l.result_date || l.result_entered_at}
                      isCompleted={isCompleted}
                      hasResults={hasResults}
                      inlineResult={l.result}
                      inlineResultNotes={l.result_notes}
                      inlineResultValue={l.result_value}
                      inlineResultUnit={l.result_unit}
                      inlineReference={l.reference_range}
                      isCritical={l.is_critical}
                      results={l.results}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'radiology' && (
          <div className="space-y-3">
            {radiology.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-8">
                No radiology orders yet.
              </p>
            ) : (
              <div className="space-y-2">
                {radiology.map((r: any) => {
                  const studyName =
                    r.imaging?.name || r.imaging_type || r.study_type || 'Imaging';
                  const modality = r.imaging?.modality || r.modality || '';
                  const bodyPart =
                    r.imaging?.body_part || r.body_part || '';
                  const hasReport =
                    !!r.findings || !!r.impression || !!r.report;

                  return (
                    <RadiologyOrderRow
                      key={r.request_id || r.id}
                      studyName={studyName}
                      modality={modality}
                      bodyPart={bodyPart}
                      priority={r.priority}
                      status={r.status}
                      createdAt={r.created_at}
                      hasReport={hasReport}
                      findings={r.findings}
                      impression={r.impression}
                      report={r.report}
                      reportDate={r.report_uploaded_at || r.performed_at}
                      resultFileUrl={r.result_file_url}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              Medications for this encounter. Click <strong>New Order</strong> above to add prescriptions.
            </div>
            {prescriptions.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-8">
                No prescriptions yet.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Medication
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Dosage
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Route
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prescriptions.map((p: any) => (
                      <tr key={p.id || p.prescription_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">
                          {p.drug_name || p.drug?.name || 'Medication'}
                        </td>
                        <td className="px-3 py-2">
                          {p.dosage || '-'} {p.frequency || ''}
                        </td>
                        <td className="px-3 py-2">{p.route || '-'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              p.status === 'dispensed'
                                ? 'bg-green-100 text-green-700'
                                : p.status === 'administered'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {p.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">
              Order Summary
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <FlaskConical className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-700">
                  {labs.length}
                </p>
                <p className="text-xs text-purple-600">Lab Orders</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <Scan className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">
                  {radiology.length}
                </p>
                <p className="text-xs text-orange-600">Radiology</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Pill className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">
                  {prescriptions.length}
                </p>
                <p className="text-xs text-green-600">Medications</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
