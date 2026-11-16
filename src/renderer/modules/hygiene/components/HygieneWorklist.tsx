/**
 * Hygiene Worklist Component
 * Ward-based activity worklist for nursing staff
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Bed,
  ChevronRight,
  Play,
  SkipForward,
  Users,
} from 'lucide-react';
import {
  useHygieneDashboard,
  useHygieneActivityCatalogue,
} from '../hooks/useHygiene';
import {
  HygieneWorklistItem,
  HygieneActivityCategory,
  getHygieneCategoryLabel,
  Shift,
  getShiftFromTime,
} from '../types/hygiene.types';

interface HygieneWorklistProps {
  wardId?: string;
}

const HygieneWorklist: React.FC<HygieneWorklistProps> = ({
  wardId: propWardId,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wardId = propWardId || searchParams.get('wardId') || '';

  const { getWorklist, loading } = useHygieneDashboard();
  const { activities } = useHygieneActivityCatalogue();

  const [worklist, setWorklist] = useState<HygieneWorklistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    HygieneActivityCategory | 'all'
  >('all');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [showOnlyTwoStaff, setShowOnlyTwoStaff] = useState(false);
  const [currentShift] = useState<Shift>(getShiftFromTime());

  useEffect(() => {
    if (wardId) {
      loadWorklist();
    }
  }, [wardId]);

  const loadWorklist = async () => {
    if (!wardId) return;
    const data = await getWorklist(wardId);
    setWorklist(data);
  };

  // Filter and sort worklist
  const filteredWorklist = useMemo(() => {
    let filtered = [...worklist];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.patient_name.toLowerCase().includes(term) ||
          item.activity_name.toLowerCase().includes(term) ||
          (item.bed_number && item.bed_number.toLowerCase().includes(term)),
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (item) => item.activity_category === selectedCategory,
      );
    }

    // Overdue filter
    if (showOnlyOverdue) {
      filtered = filtered.filter((item) => item.is_overdue);
    }

    // Two-staff filter
    if (showOnlyTwoStaff) {
      filtered = filtered.filter((item) => item.requires_two_staff);
    }

    // Sort by urgency (overdue first, then by due time)
    filtered.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      return a.minutes_until_due - b.minutes_until_due;
    });

    return filtered;
  }, [
    worklist,
    searchTerm,
    selectedCategory,
    showOnlyOverdue,
    showOnlyTwoStaff,
  ]);

  // Group by patient
  const groupedByPatient = useMemo(() => {
    const groups: Record<string, HygieneWorklistItem[]> = {};
    filteredWorklist.forEach((item) => {
      if (!groups[item.patient_id]) {
        groups[item.patient_id] = [];
      }
      groups[item.patient_id].push(item);
    });
    return groups;
  }, [filteredWorklist]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: worklist.length };
    worklist.forEach((item) => {
      counts[item.activity_category] =
        (counts[item.activity_category] || 0) + 1;
    });
    return counts;
  }, [worklist]);

  const categories: HygieneActivityCategory[] = [
    'BATH',
    'ORAL',
    'WOUND',
    'CATH',
    'LINE',
    'DRAIN',
    'SKIN',
    'LINEN',
  ];

  if (!wardId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select a ward to view the worklist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hygiene')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Hygiene Worklist
              </h1>
              <p className="text-sm text-gray-500">
                {currentShift} Shift • {filteredWorklist.length} activities
              </p>
            </div>
          </div>
          <button
            onClick={loadWorklist}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient or activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({categoryCounts.all || 0})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getHygieneCategoryLabel(cat)} ({categoryCounts[cat] || 0})
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyOverdue(!showOnlyOverdue)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                showOnlyOverdue
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              Overdue
            </button>
            <button
              onClick={() => setShowOnlyTwoStaff(!showOnlyTwoStaff)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                showOnlyTwoStaff
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              2-Person
            </button>
          </div>
        </div>
      </div>

      {/* Worklist Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && worklist.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredWorklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No pending hygiene activities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByPatient).map(([patientId, items]) => (
              <PatientWorklistGroup
                key={patientId}
                patientId={patientId}
                items={items}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Overdue: {worklist.filter((i) => i.is_overdue).length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Due in 30m:{' '}
              {
                worklist.filter(
                  (i) => !i.is_overdue && i.minutes_until_due <= 30,
                ).length
              }
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Later:{' '}
              {
                worklist.filter(
                  (i) => !i.is_overdue && i.minutes_until_due > 30,
                ).length
              }
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Showing {filteredWorklist.length} of {worklist.length} activities
          </p>
        </div>
      </div>
    </div>
  );
};

// Patient Worklist Group
interface PatientWorklistGroupProps {
  patientId: string;
  items: HygieneWorklistItem[];
}

const PatientWorklistGroup: React.FC<PatientWorklistGroupProps> = ({
  patientId,
  items,
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const firstItem = items[0];
  const hasOverdue = items.some((i) => i.is_overdue);

  return (
    <div
      className={`bg-white rounded-lg border ${
        hasOverdue ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* Patient Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className={`p-4 flex items-center justify-between cursor-pointer ${
          hasOverdue ? 'bg-red-50' : 'bg-gray-50'
        } rounded-t-lg`}
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {firstItem.patient_name}
            </p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                {firstItem.bed_number || 'No bed'}
              </span>
              <span>{firstItem.ward_name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {hasOverdue && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                {items.filter((i) => i.is_overdue).length} overdue
              </span>
            )}
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {items.length} activities
            </span>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-gray-400 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>

      {/* Activities */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <WorklistActivityRow
              key={item.schedule_id}
              item={item}
              onDocument={() =>
                navigate(
                  `/hygiene/record?patientId=${item.patient_id}&scheduleId=${item.schedule_id}&activityCode=${item.activity_code}`,
                )
              }
              onDefer={() => {
                // Handle defer action
                console.log('Defer:', item.schedule_id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Worklist Activity Row
interface WorklistActivityRowProps {
  item: HygieneWorklistItem;
  onDocument: () => void;
  onDefer: () => void;
}

const WorklistActivityRow: React.FC<WorklistActivityRowProps> = ({
  item,
  onDocument,
  onDefer,
}) => {
  const getUrgencyColor = () => {
    if (item.is_overdue) return 'bg-red-500';
    if (item.minutes_until_due <= 15) return 'bg-orange-500';
    if (item.minutes_until_due <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getDueText = () => {
    if (item.is_overdue) {
      const minutes = Math.abs(item.minutes_until_due);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        return `${hours}h overdue`;
      }
      return `${minutes}m overdue`;
    }
    if (item.minutes_until_due <= 0) return 'Due now';
    if (item.minutes_until_due < 60) return `In ${item.minutes_until_due}m`;
    const hours = Math.floor(item.minutes_until_due / 60);
    return `In ${hours}h`;
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <div className={`w-1 h-10 rounded-full ${getUrgencyColor()}`} />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{item.activity_name}</p>
            {item.requires_two_staff && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                2-person
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {getHygieneCategoryLabel(item.activity_category)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p
            className={`text-sm font-medium ${
              item.is_overdue ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {getDueText()}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(item.next_due).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDefer();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Defer"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDocument();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Play className="h-4 w-4" />
            Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default HygieneWorklist;
