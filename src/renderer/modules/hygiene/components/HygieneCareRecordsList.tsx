/**
 * Hygiene Care Records List Component
 * Displays all documented hygiene care records with filtering and search
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Plus,
  Droplets,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  ChevronRight,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useHygieneCareRecords } from '../hooks/useHygiene';
import {
  HygieneCareRecordWithDetails,
  HygieneActivityCategory,
  HygieneStatus,
  Shift,
  getHygieneCategoryLabel,
  getHygieneStatusColor,
  getShiftFromTime,
} from '../types/hygiene.types';

const HygieneCareRecordsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const { listRecords, loading } = useHygieneCareRecords();

  const [records, setRecords] = useState<HygieneCareRecordWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    HygieneActivityCategory | 'all'
  >('all');
  const [selectedStatus, setSelectedStatus] = useState<HygieneStatus | 'all'>(
    'all',
  );
  const [selectedShift, setSelectedShift] = useState<Shift | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRecord, setSelectedRecord] =
    useState<HygieneCareRecordWithDetails | null>(null);

  useEffect(() => {
    loadRecords();
  }, [patientId]);

  const loadRecords = async () => {
    const filters: any = {};
    if (patientId) {
      filters.patient_id = patientId;
    }
    if (dateFrom) {
      filters.date_from = dateFrom;
    }
    if (dateTo) {
      filters.date_to = dateTo;
    }
    const data = await listRecords(filters);
    setRecords(data);
  };

  // Apply filters
  useEffect(() => {
    loadRecords();
  }, [dateFrom, dateTo]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rec) =>
          rec.patient_name?.toLowerCase().includes(term) ||
          rec.activity_name?.toLowerCase().includes(term) ||
          rec.performed_by_name?.toLowerCase().includes(term) ||
          rec.patient_emr_number?.toLowerCase().includes(term),
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (rec) => rec.activity_category === selectedCategory,
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((rec) => rec.status === selectedStatus);
    }

    // Shift filter
    if (selectedShift !== 'all') {
      filtered = filtered.filter((rec) => rec.shift === selectedShift);
    }

    return filtered;
  }, [records, searchTerm, selectedCategory, selectedStatus, selectedShift]);

  const categories: HygieneActivityCategory[] = [
    'BATH',
    'ORAL',
    'WOUND',
    'CATH',
    'LINE',
    'DRAIN',
    'SKIN',
    'LINEN',
    'ISOL',
    'HAND',
    'DEVICE',
    'OTHER',
  ];

  const statuses: HygieneStatus[] = [
    'Completed',
    'Missed',
    'Refused',
    'Deferred',
    'In_Progress',
  ];
  const shifts: Shift[] = ['Morning', 'Afternoon', 'Night'];

  // Stats
  const completedCount = records.filter((r) => r.status === 'Completed').length;
  const missedCount = records.filter((r) => r.status === 'Missed').length;
  const refusedCount = records.filter((r) => r.status === 'Refused').length;

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
                Hygiene Care Records
              </h1>
              <p className="text-sm text-gray-500">
                All documented patient care activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => navigate('/hygiene/record')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Document Care
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <StatBadge label="Total Records" value={records.length} />
          <div className="w-px h-8 bg-gray-300" />
          <StatBadge
            label="Completed"
            value={completedCount}
            color="text-green-600"
          />
          <StatBadge label="Missed" value={missedCount} color="text-red-600" />
          <StatBadge
            label="Refused"
            value={refusedCount}
            color="text-yellow-600"
          />
          <div className="flex-1" />
          <span className="text-sm text-gray-500">
            Compliance:{' '}
            {records.length > 0
              ? Math.round((completedCount / records.length) * 100)
              : 0}
            %
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, activity, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value as HygieneActivityCategory | 'all',
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {getHygieneCategoryLabel(cat)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as HygieneStatus | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as Shift | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Shifts</option>
            {shifts.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && records.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Droplets className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No records found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward/Bed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.patient_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.patient_emr_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.activity_name}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {getHygieneCategoryLabel(record.activity_category)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(
                              record.performed_time,
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.performed_time).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}{' '}
                            • {record.shift}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {record.performed_by_name || 'N/A'}
                      </p>
                      {record.assisted_by_name && (
                        <p className="text-xs text-gray-500">
                          Assisted: {record.assisted_by_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {record.ward_name || 'N/A'}
                      </p>
                      {record.bed_number && (
                        <p className="text-xs text-gray-500">
                          Bed: {record.bed_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredRecords.length} of {records.length} records
          </p>
        </div>
      </div>
    </div>
  );
};

// Stat Badge Component
interface StatBadgeProps {
  label: string;
  value: number | string;
  color?: string;
}

const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  color = 'text-gray-900',
}) => (
  <div className="text-center">
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Status Badge Component
interface StatusBadgeProps {
  status: HygieneStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getIcon = () => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Missed':
        return <XCircle className="h-4 w-4" />;
      case 'Refused':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Deferred':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const colorClass = getHygieneStatusColor(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
    >
      {getIcon()}
      {status}
    </span>
  );
};

// Record Detail Modal
interface RecordDetailModalProps {
  record: HygieneCareRecordWithDetails;
  onClose: () => void;
}

const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Care Record Details
                </h3>
                <p className="text-sm text-gray-500">{record.activity_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Patient Information
                    </h4>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {record.patient_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {record.patient_emr_number}
                  </p>
                  {record.ward_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      {record.ward_name}{' '}
                      {record.bed_number && `• Bed ${record.bed_number}`}
                    </p>
                  )}
                </div>

                {/* Activity Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Activity
                  </h4>
                  <p className="font-semibold text-gray-900">
                    {record.activity_name}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 mt-2">
                    {getHygieneCategoryLabel(record.activity_category)}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Status
                  </h4>
                  <StatusBadge status={record.status} />
                  {record.status === 'Missed' && record.missed_reason && (
                    <p className="text-sm text-red-600 mt-2">
                      Reason: {record.missed_reason}
                    </p>
                  )}
                </div>

                {/* Patient Response */}
                {record.patient_tolerance && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Patient Response
                    </h4>
                    <p className="text-sm text-gray-900">
                      Tolerance: {record.patient_tolerance}
                    </p>
                    {record.patient_response && (
                      <p className="text-sm text-gray-500 mt-1">
                        {record.patient_response}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Timing */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Timing
                    </h4>
                  </div>
                  <p className="text-sm text-gray-900">
                    {new Date(record.performed_time).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Shift: {record.shift}
                  </p>
                  {record.duration_minutes && (
                    <p className="text-sm text-gray-500">
                      Duration: {record.duration_minutes} minutes
                    </p>
                  )}
                </div>

                {/* Staff */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Staff
                  </h4>
                  <p className="text-sm text-gray-900">
                    <span className="text-gray-500">Performed by:</span>{' '}
                    {record.performed_by_name || 'N/A'}
                  </p>
                  {record.assisted_by_name && (
                    <p className="text-sm text-gray-900 mt-1">
                      <span className="text-gray-500">Assisted by:</span>{' '}
                      {record.assisted_by_name}
                    </p>
                  )}
                  {record.supervisor_name && (
                    <p className="text-sm text-gray-900 mt-1">
                      <span className="text-gray-500">Supervisor:</span>{' '}
                      {record.supervisor_name}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {record.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {record.notes}
                    </p>
                  </div>
                )}

                {/* Findings */}
                {record.findings && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Findings
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {record.findings}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Required - Full Width */}
            {record.requires_follow_up && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Follow-up Required</span>
                </div>
                {record.follow_up_notes && (
                  <p className="text-sm text-yellow-700 mt-2">
                    {record.follow_up_notes}
                  </p>
                )}
              </div>
            )}

            {/* Audit Info */}
            <div className="border-t border-gray-200 pt-4 mt-6 flex items-center justify-between text-xs text-gray-400">
              <span>
                Created: {new Date(record.created_at).toLocaleString()}
              </span>
              {record.updated_at !== record.created_at && (
                <span>
                  Updated: {new Date(record.updated_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HygieneCareRecordsList;
