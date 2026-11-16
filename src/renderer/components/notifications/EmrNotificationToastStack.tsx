import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  useNotifications,
  type Notification,
} from '../../hooks/useNotifications';

const MAX_VISIBLE = 4;

/**
 * In-app notification toasts (mobile-style): new rows in `notifications` surface as
 * dismissible cards; use with the global bell / notification feed.
 */
export function EmrNotificationToastStack() {
  const { notifications, markAsRead, isLoading } = useNotifications({
    limit: 50,
  });
  const [queue, setQueue] = useState<Notification[]>([]);
  const primedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isLoading) return;
    if (!primedRef.current) {
      notifications.forEach((n) => seenRef.current.add(n.id));
      primedRef.current = true;
      return;
    }
    notifications.forEach((n) => {
      if (!seenRef.current.has(n.id)) {
        seenRef.current.add(n.id);
        setQueue((prev) => [n, ...prev].slice(0, MAX_VISIBLE));
      }
    });
  }, [notifications, isLoading]);

  const dismiss = useCallback(
    async (id: string) => {
      setQueue((prev) => prev.filter((n) => n.id !== id));
      try {
        await markAsRead(id);
      } catch {
        // non-fatal
      }
    },
    [markAsRead],
  );

  if (queue.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-[min(70vh,520px)] w-[min(22rem,calc(100vw-2rem))] flex-col-reverse gap-2 overflow-hidden">
      {queue.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-lg ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {n.type.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">
                {n.title}
              </p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {n.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void dismiss(n.id)}
              className="-m-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
