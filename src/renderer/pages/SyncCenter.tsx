import React from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Trash2,
} from 'lucide-react';
import { useBackgroundMutationQueue } from '../hooks/useBackgroundMutationQueue';
import { backgroundMutationManager } from '../lib/mutations/backgroundMutationManager';
import { useSyncStatus } from '../lib/offline/hooks/useSyncStatus';

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return 'Unknown time';
  }
}

function statusBadge(status: string): string {
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'saved') return 'bg-green-100 text-green-700';
  if (status === 'syncing' || status === 'retrying')
    return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export default function SyncCenter(): React.ReactElement {
  const { records, summary } = useBackgroundMutationQueue();
  const syncStatus = useSyncStatus();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sync Center</h1>
            <p className="text-sm text-gray-600">
              Monitor offline saves, retries, and background sync status.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
            {syncStatus.isOnline ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Online
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Offline
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-semibold text-gray-900">
              {summary.active}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Queued</p>
            <p className="text-lg font-semibold text-gray-900">
              {summary.queued}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Syncing</p>
            <p className="text-lg font-semibold text-gray-900">
              {summary.syncing + summary.retrying}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Failed</p>
            <p className="text-lg font-semibold text-red-700">
              {summary.failed}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Saved</p>
            <p className="text-lg font-semibold text-green-700">
              {summary.saved}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Queue Records</h2>
        </div>

        {records.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No sync records yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((record) => {
              const canRetry = record.status === 'failed';
              const canDismiss =
                record.status === 'failed' || record.status === 'saved';

              return (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(record.status)}`}
                      >
                        {record.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {record.scope}
                      </span>
                    </div>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {record.id}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Updated: {formatTime(record.updatedAt)}
                      </span>
                      <span>
                        Attempts: {record.attempts}/{record.maxRetries}
                      </span>
                      {record.errorMessage ? (
                        <span className="text-red-600">
                          Error: {record.errorMessage}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canRetry}
                      onClick={() =>
                        backgroundMutationManager.retryFailed(record.id)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                    <button
                      type="button"
                      disabled={!canDismiss}
                      onClick={() =>
                        backgroundMutationManager.dismissRecord(record.id)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
