import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useBackgroundMutationQueue } from '../../hooks/useBackgroundMutationQueue';

const SHOW_SYNC_INDICATOR =
  (process.env.REACT_APP_SHOW_SYNC_INDICATOR || '').toLowerCase() === 'true';

export function GlobalMutationSyncIndicator(): React.ReactElement | null {
  const { summary } = useBackgroundMutationQueue();

  if (!SHOW_SYNC_INDICATOR) {
    return null;
  }
  const [showActiveState, setShowActiveState] = useState(false);

  useEffect(() => {
    if (summary.active <= 0) {
      setShowActiveState(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowActiveState(true);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [summary.active]);

  const isSyncing = summary.active > 0 && showActiveState;
  const hasFailures = summary.failed > 0;
  const hasRecentSaved = summary.saved > 0;

  if (!isSyncing && !hasFailures && !hasRecentSaved) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="rounded-full border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
          {isSyncing && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
          )}
          {!isSyncing && hasRecentSaved && !hasFailures && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          )}
          {hasFailures && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          )}

          {isSyncing && <span>Saving in background...</span>}
          {!isSyncing && hasRecentSaved && !hasFailures && <span>Saved</span>}
          {hasFailures && <span>Background sync issue</span>}
        </div>
      </div>
    </div>
  );
}
