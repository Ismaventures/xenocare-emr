import React, { useState, useMemo } from 'react';
import {
  Eye,
  Search,
  Filter,
  Activity,
  Lock,
  ChevronDown,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';
import {
  format,
  isAfter,
  startOfDay,
  subDays,
  subMonths,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
} from 'date-fns';
import type { EyeExamDTO } from '../types/ophthalmology.types';

interface EncounterTimelineProps {
  exams: EyeExamDTO[];
  selectedExamId?: string;
  onSelectExam: (exam: EyeExamDTO) => void;
}

function getDisplayStatus(exam: EyeExamDTO): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (exam.status === 'Completed' || exam.finalized_at) {
    return {
      label: 'Completed',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    };
  }
  if (exam.status === 'In Progress') {
    return {
      label: 'In Progress',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
    };
  }
  return {
    label: 'In Progress',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  };
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'This Week';
  if (isThisMonth(date)) return 'This Month';
  return format(date, 'MMMM yyyy');
}

type TimeFilter = 'all' | '7d' | '30d' | '3m';

export default function EncounterTimeline({
  exams,
  selectedExamId,
  onSelectExam,
}: EncounterTimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedExams = useMemo(() => {
    return [...exams].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [exams]);

  const examsWithIndex = useMemo(() => {
    const total = sortedExams.length;
    return sortedExams.map((exam, idx) => {
      const isInitial = idx === total - 1;
      const visitLabel = isInitial ? 'Initial' : `Visit #${total - idx}`;
      return { ...exam, visitLabel };
    });
  }, [sortedExams]);

  const filteredExams = useMemo(() => {
    let result = examsWithIndex;

    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoff: Date = new Date(0);
      switch (timeFilter) {
        case '7d':
          cutoff = subDays(now, 7);
          break;
        case '30d':
          cutoff = subDays(now, 30);
          break;
        case '3m':
          cutoff = subMonths(now, 3);
          break;
      }
      result = result.filter((e) =>
        isAfter(new Date(e.created_at), startOfDay(cutoff)),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.chief_complaint?.toLowerCase().includes(q) ||
          e.provisional_diagnosis?.toLowerCase().includes(q) ||
          e.final_diagnosis?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [examsWithIndex, timeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-teal-700 transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Visits ({filteredExams.length})
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
              title="Search and Filter"
            >
              <Search size={14} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              <Filter size={10} className="text-slate-400 flex-shrink-0 mr-1" />
              {(['all', '7d', '30d', '3m'] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors whitespace-nowrap ${
                    timeFilter === f
                      ? 'bg-teal-100 text-teal-800'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all'
                    ? 'All'
                    : f === '7d'
                      ? '7 Days'
                      : f === '30d'
                        ? '30 Days'
                        : '3 Months'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2.5">
          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center bg-white rounded-lg border border-slate-200 border-dashed m-1">
              <Activity className="h-6 w-6 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                {searchQuery || timeFilter !== 'all'
                  ? 'No matches'
                  : 'No examinations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-0 relative">
              {filteredExams.map((exam, idx) => {
                const isSelected = exam.exam_id === selectedExamId;
                const examDate = new Date(exam.created_at);
                const status = getDisplayStatus(exam);

                const currentGroup = getDateGroup(exam.created_at);
                const prevGroup =
                  idx > 0
                    ? getDateGroup(filteredExams[idx - 1].created_at)
                    : null;
                const showGroupHeader = currentGroup !== prevGroup;
                const isLast = idx === filteredExams.length - 1;

                const hasVA = !!(
                  exam.va_right_unaided ||
                  exam.va_left_unaided ||
                  exam.va_right_aided ||
                  exam.va_left_aided
                );
                const hasIOP = exam.iop_right != null || exam.iop_left != null;
                const hasRx = !!(exam.rx_right_sphere || exam.rx_left_sphere);

                const isAmended =
                  (exam as any).amendment_count > 0 ||
                  (exam as any).addendum_attached === true;

                return (
                  <div key={exam.exam_id} className="relative">
                    {showGroupHeader && (
                      <div className="pb-2.5 pt-1.5 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {currentGroup}
                          </span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                      </div>
                    )}

                    <div className="flex">
                      <div className="flex flex-col items-center mx-2 mt-1.5 relative w-3 flex-shrink-0">
                        <div
                          className={`w-2.5 h-2.5 rounded-full z-10 flex-shrink-0 transition-colors ${
                            status.label === 'Completed'
                              ? 'bg-emerald-400'
                              : 'bg-blue-400 border border-white'
                          } ${isSelected ? 'ring-4 ring-teal-100 bg-teal-500' : ''}`}
                        />
                        {!isLast && (
                          <div className="w-[1.5px] absolute top-2 bottom-[-16px] bg-slate-200" />
                        )}
                      </div>

                      <button
                        onClick={() => onSelectExam(exam)}
                        className={`flex-1 min-w-0 text-left mb-3 p-2.5 rounded-lg border transition-all duration-150 ${
                          isSelected
                            ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/10'
                            : 'bg-white border-slate-100 hover:border-teal-300 hover:shadow-sm'
                        } ${status.label === 'Completed' ? 'opacity-[0.98]' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <div className="flex items-center flex-wrap gap-1 min-w-0">
                            <h4
                              className={`text-xs font-bold truncate ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}
                            >
                              {exam.visitLabel}
                            </h4>
                            {isAmended && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-bold uppercase rounded bg-amber-100 text-amber-800 tracking-wider flex-shrink-0">
                                Amended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-slate-400">
                            {status.label === 'Completed' ? (
                              <Lock size={8} />
                            ) : null}
                            <span className="font-medium">
                              {format(examDate, 'h:mm a')}
                            </span>
                          </div>
                        </div>

                        {isSelected &&
                          (exam.chief_complaint ||
                            exam.provisional_diagnosis) && (
                            <div className="mb-1.5 text-[11px] text-slate-500 truncate w-full pr-1">
                              {exam.chief_complaint && (
                                <>
                                  <span className="font-medium text-slate-600">
                                    CC:
                                  </span>{' '}
                                  {exam.chief_complaint}{' '}
                                </>
                              )}
                              {exam.provisional_diagnosis && (
                                <>
                                  <span className="font-medium text-slate-600 ml-1">
                                    Dx:
                                  </span>{' '}
                                  {exam.provisional_diagnosis}
                                </>
                              )}
                            </div>
                          )}

                        <div className="flex flex-wrap gap-1 mt-1">
                          {hasVA && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-600 rounded border border-indigo-100/50">
                              <Eye size={8} /> VA
                            </span>
                          )}
                          {hasIOP && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold bg-orange-50 text-orange-600 rounded border border-orange-100/50">
                              <Activity size={8} /> IOP
                            </span>
                          )}
                          {hasRx && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-600 rounded border border-emerald-100/50">
                              <Stethoscope size={8} /> Rx
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
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
