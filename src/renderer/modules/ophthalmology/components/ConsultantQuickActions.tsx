import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarPlus,
  FileText,
  BarChart3,
  GitCompareArrows,
  ClipboardList,
  MoreVertical,
} from 'lucide-react';

interface ConsultantQuickActionsProps {
  onAddFollowUp: () => void;
  onAddNote: () => void;
  onOpenOrders: () => void;
  onViewVisionChart: () => void;
  onCompareVisits: () => void;
  isConsultant: boolean;
}

export default function ConsultantQuickActions({
  onAddFollowUp,
  onAddNote,
  onOpenOrders,
  onViewVisionChart,
  onCompareVisits,
  isConsultant,
}: ConsultantQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    ...(isConsultant
      ? [
          {
            icon: CalendarPlus,
            label: 'Add Follow-Up',
            onClick: onAddFollowUp,
            primary: true,
          },
        ]
      : []),
    { icon: FileText, label: 'Add Clinical Note', onClick: onAddNote },
    { icon: ClipboardList, label: 'Orders & Services', onClick: onOpenOrders },
    {
      icon: GitCompareArrows,
      label: 'Compare Visits',
      onClick: onCompareVisits,
    },
    { icon: BarChart3, label: 'Vision Progress', onClick: onViewVisionChart },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
      >
        <MoreVertical size={14} />
        Actions
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                item.primary
                  ? 'text-teal-700 hover:bg-teal-50 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <item.icon
                className={`h-4 w-4 ${item.primary ? 'text-teal-600' : 'text-slate-400'}`}
              />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
