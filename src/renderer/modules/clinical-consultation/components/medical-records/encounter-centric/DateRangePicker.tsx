import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: -1 },
] as const;

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return 'All dates';
  const fmt = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  return `Until ${fmt(dateTo)}`;
}

function MiniCalendar({
  year,
  month,
  selectedDate,
  onSelect,
  onMonthChange,
  rangeStart,
  rangeEnd,
}: {
  year: number;
  month: number;
  selectedDate: string;
  onSelect: (dateStr: string) => void;
  onMonthChange: (delta: number) => void;
  rangeStart?: string;
  rangeEnd?: string;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-[240px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="h-8" />;
          }
          const dateStr = toDateStr(new Date(year, month, day));
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const inRange =
            rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={`h-8 w-full rounded-lg text-xs font-medium transition-all
                ${isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : inRange
                    ? 'bg-emerald-50 text-emerald-700'
                    : isToday
                      ? 'bg-gray-100 text-gray-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Calendar view months
  const now = new Date();
  const initFrom = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const initTo = dateTo ? new Date(dateTo + 'T00:00:00') : now;

  const [leftYear, setLeftYear] = useState(initFrom.getFullYear());
  const [leftMonth, setLeftMonth] = useState(initFrom.getMonth());
  const [rightYear, setRightYear] = useState(initTo.getFullYear());
  const [rightMonth, setRightMonth] = useState(initTo.getMonth());

  // Reset calendar months when opening
  useEffect(() => {
    if (open) {
      const f = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = dateTo ? new Date(dateTo + 'T00:00:00') : now;
      setLeftYear(f.getFullYear());
      setLeftMonth(f.getMonth());
      setRightYear(t.getFullYear());
      setRightMonth(t.getMonth());
      // If same month, show previous month on left
      if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) {
        const prev = new Date(f.getFullYear(), f.getMonth() - 1, 1);
        setLeftYear(prev.getFullYear());
        setLeftMonth(prev.getMonth());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleLeftMonthChange = useCallback((delta: number) => {
    setLeftMonth((prev) => {
      const d = new Date(leftYear, prev + delta, 1);
      setLeftYear(d.getFullYear());
      return d.getMonth();
    });
  }, [leftYear]);

  const handleRightMonthChange = useCallback((delta: number) => {
    setRightMonth((prev) => {
      const d = new Date(rightYear, prev + delta, 1);
      setRightYear(d.getFullYear());
      return d.getMonth();
    });
  }, [rightYear]);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    const today = new Date();
    if (preset.days === -1) {
      // This year
      onDateFromChange(toDateStr(new Date(today.getFullYear(), 0, 1)));
      onDateToChange(toDateStr(today));
    } else {
      const from = new Date(today);
      from.setDate(from.getDate() - preset.days);
      onDateFromChange(toDateStr(from));
      onDateToChange(toDateStr(today));
    }
    setOpen(false);
  }, [onDateFromChange, onDateToChange]);

  const clearDates = useCallback(() => {
    onDateFromChange('');
    onDateToChange('');
    setOpen(false);
  }, [onDateFromChange, onDateToChange]);

  const hasFilter = dateFrom || dateTo;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer
          ${hasFilter
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-800'
          }`}
      >
        <Calendar size={13} className={hasFilter ? 'text-emerald-500' : 'text-gray-400'} />
        <span className="whitespace-nowrap">{formatDisplay(dateFrom, dateTo)}</span>
        {hasFilter && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); clearDates(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); clearDates(); } }}
            className="ml-0.5 p-0.5 rounded hover:bg-emerald-200 transition"
            title="Clear dates"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {/* Dropdown popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-gray-100">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
            {hasFilter && (
              <button
                type="button"
                onClick={clearDates}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition ml-auto"
              >
                Clear
              </button>
            )}
          </div>

          {/* Two side-by-side calendars */}
          <div className="flex gap-6">
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">From</div>
              <MiniCalendar
                year={leftYear}
                month={leftMonth}
                selectedDate={dateFrom}
                onSelect={onDateFromChange}
                onMonthChange={handleLeftMonthChange}
                rangeStart={dateFrom}
                rangeEnd={dateTo}
              />
            </div>
            <div className="w-px bg-gray-100 self-stretch" />
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">To</div>
              <MiniCalendar
                year={rightYear}
                month={rightMonth}
                selectedDate={dateTo}
                onSelect={onDateToChange}
                onMonthChange={handleRightMonthChange}
                rangeStart={dateFrom}
                rangeEnd={dateTo}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
