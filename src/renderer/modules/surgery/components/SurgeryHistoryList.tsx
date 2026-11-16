/**
 * Surgery History List Component
 * Displays all completed surgeries with filtering by category and other criteria
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle,
  ChevronRight,
  Download,
  Filter,
  Activity,
  Stethoscope,
  Heart,
  Brain,
  Bone,
  Eye as EyeIcon,
  Baby,
  Ear,
  AlertTriangle,
  FileText,
  X,
  Building2,
} from 'lucide-react';
import { useSurgeries } from '../hooks/useSurgery';
import {
  SurgeryWithDetails,
  SurgeryPriority,
  TheatreRoomType,
  WoundClassification,
  SurgeryDisposition,
  getSurgeryStatusColor,
  getPriorityColor,
} from '../types/surgery.types';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';

// Surgery categories for filtering
const SURGERY_CATEGORIES = [
  { id: 'all', label: 'All Surgeries', icon: Activity },
  { id: 'General', label: 'General Surgery', icon: Stethoscope },
  { id: 'Cardiac', label: 'Cardiac Surgery', icon: Heart },
  { id: 'Neuro', label: 'Neurosurgery', icon: Brain },
  { id: 'Orthopedic', label: 'Orthopedic Surgery', icon: Bone },
  { id: 'Ophthalmic', label: 'Ophthalmic Surgery', icon: EyeIcon },
  { id: 'Obstetric', label: 'Obstetric Surgery', icon: Baby },
  { id: 'ENT', label: 'ENT Surgery', icon: Ear },
  { id: 'Minor', label: 'Minor Procedures', icon: FileText },
  { id: 'Emergency', label: 'Emergency Surgery', icon: AlertTriangle },
];

const SurgeryHistoryList: React.FC = () => {
  const navigate = useNavigate();
  const { listSurgeries, loading } = useSurgeries();

  const [surgeries, setSurgeries] = useState<SurgeryWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState<
    SurgeryPriority | 'all'
  >('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSurgery, setSelectedSurgery] =
    useState<SurgeryWithDetails | null>(null);

  useEffect(() => {
    loadSurgeries();
  }, [dateFrom, dateTo]);

  const loadSurgeries = async () => {
    const filters: any = {
      status: ['Completed'],
    };
    if (dateFrom) {
      filters.scheduled_date_from = dateFrom;
    }
    if (dateTo) {
      filters.scheduled_date_to = dateTo;
    }
    const data = await listSurgeries(filters);
    setSurgeries(data);
  };

  // Filter surgeries
  const filteredSurgeries = useMemo(() => {
    let filtered = [...surgeries];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.surgery_number.toLowerCase().includes(term) ||
          s.patient_name?.toLowerCase().includes(term) ||
          s.primary_procedure.toLowerCase().includes(term) ||
          s.surgeon_name?.toLowerCase().includes(term) ||
          s.patient_emr_number?.toLowerCase().includes(term),
      );
    }

    // Category filter (based on theatre room type or procedure name)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) => {
        // Try to match by theatre room type or procedure keywords
        const procedureLower = s.primary_procedure.toLowerCase();
        switch (selectedCategory) {
          case 'Cardiac':
            return (
              procedureLower.includes('cardiac') ||
              procedureLower.includes('heart') ||
              procedureLower.includes('cabg')
            );
          case 'Neuro':
            return (
              procedureLower.includes('neuro') ||
              procedureLower.includes('brain') ||
              procedureLower.includes('spine') ||
              procedureLower.includes('cranio')
            );
          case 'Orthopedic':
            return (
              procedureLower.includes('ortho') ||
              procedureLower.includes('bone') ||
              procedureLower.includes('fracture') ||
              procedureLower.includes('joint') ||
              procedureLower.includes('arthr')
            );
          case 'Ophthalmic':
            return (
              procedureLower.includes('eye') ||
              procedureLower.includes('cataract') ||
              procedureLower.includes('ophthal')
            );
          case 'Obstetric':
            return (
              procedureLower.includes('caesar') ||
              procedureLower.includes('c-section') ||
              procedureLower.includes('hyster') ||
              procedureLower.includes('obstet')
            );
          case 'ENT':
            return (
              procedureLower.includes('ent') ||
              procedureLower.includes('ear') ||
              procedureLower.includes('nose') ||
              procedureLower.includes('throat') ||
              procedureLower.includes('tonsil')
            );
          case 'Minor':
            return (
              procedureLower.includes('minor') ||
              procedureLower.includes('biopsy') ||
              procedureLower.includes('excision') ||
              procedureLower.includes('debridement')
            );
          case 'Emergency':
            return s.priority === 'Emergency';
          case 'General':
          default:
            return true;
        }
      });
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter((s) => s.priority === selectedPriority);
    }

    return filtered;
  }, [surgeries, searchTerm, selectedCategory, selectedPriority]);

  // Stats
  const totalCompleted = surgeries.length;
  const emergencyCount = surgeries.filter(
    (s) => s.priority === 'Emergency',
  ).length;
  const electiveCount = surgeries.filter(
    (s) => s.priority === 'Elective',
  ).length;
  const nhisCount = surgeries.filter((s) => s.requires_nhis_approval).length;

  const priorities: SurgeryPriority[] = [
    'Emergency',
    'Urgent',
    'Routine',
    'Elective',
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/surgery')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Surgery History
              </h1>
              <p className="text-sm text-gray-500">
                All completed surgical procedures
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSurgeries}
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
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <StatBadge
            label="Total Completed"
            value={totalCompleted}
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          />
          <div className="w-px h-8 bg-gray-300" />
          <StatBadge
            label="Emergency"
            value={emergencyCount}
            color="text-red-600"
          />
          <StatBadge
            label="Elective"
            value={electiveCount}
            color="text-blue-600"
          />
          <StatBadge
            label="NHIS Cases"
            value={nhisCount}
            color="text-purple-600"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex items-center gap-1 py-2">
          {SURGERY_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
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
              placeholder="Search patient, procedure, surgeon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) =>
              setSelectedPriority(e.target.value as SurgeryPriority | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
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
        {loading && surgeries.length === 0 ? (
          <SkeletonTable rows={5} columns={4} />
        ) : filteredSurgeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Activity className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No completed surgeries found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Surgery #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Procedure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Surgeon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Theatre
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSurgeries.map((surgery) => (
                  <tr
                    key={surgery.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedSurgery(surgery)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">
                        {surgery.surgery_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {surgery.patient_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {surgery.patient_emr_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 max-w-xs truncate">
                        {surgery.primary_procedure}
                      </p>
                      {surgery.secondary_procedures &&
                        surgery.secondary_procedures.length > 0 && (
                          <p className="text-xs text-gray-500">
                            +{surgery.secondary_procedures.length} more
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {surgery.scheduled_date
                              ? new Date(
                                  surgery.scheduled_date,
                                ).toLocaleDateString()
                              : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {surgery.scheduled_time?.substring(0, 5) || '--:--'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {surgery.surgeon_name || 'Not assigned'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getPriorityColor(surgery.priority)}`}
                      >
                        {surgery.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {surgery.theatre_room || 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/surgery/${surgery.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Surgery Detail Modal */}
      {selectedSurgery && (
        <SurgeryDetailModal
          surgery={selectedSurgery}
          onClose={() => setSelectedSurgery(null)}
        />
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredSurgeries.length} of {surgeries.length} completed
            surgeries
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
  icon?: React.ReactNode;
}

const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  color = 'text-gray-900',
  icon,
}) => (
  <div className="flex items-center gap-2">
    {icon}
    <div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

// Surgery Detail Modal
interface SurgeryDetailModalProps {
  surgery: SurgeryWithDetails;
  onClose: () => void;
}

const SurgeryDetailModal: React.FC<SurgeryDetailModalProps> = ({
  surgery,
  onClose,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const calculateDuration = () => {
    if (surgery.incision_time && surgery.closure_time) {
      const incision = new Date(`2000-01-01T${surgery.incision_time}`);
      const closure = new Date(`2000-01-01T${surgery.closure_time}`);
      const diffMs = closure.getTime() - incision.getTime();
      const diffMins = Math.round(diffMs / 60000);
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    }
    return 'N/A';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {surgery.surgery_number}
                </h3>
                <p className="text-sm text-gray-500">Completed Surgery</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
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
                    {surgery.patient_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {surgery.patient_emr_number}
                  </p>
                  {surgery.patient_insurance_type && (
                    <span className="inline-flex mt-2 px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                      {surgery.patient_insurance_type}
                    </span>
                  )}
                </div>

                {/* Procedure Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Primary Procedure
                  </h4>
                  <p className="font-semibold text-gray-900">
                    {surgery.primary_procedure}
                  </p>
                  {surgery.laterality && (
                    <p className="text-sm text-gray-500 mt-1">
                      Laterality: {surgery.laterality}
                    </p>
                  )}
                  {surgery.body_site && (
                    <p className="text-sm text-gray-500">
                      Site: {surgery.body_site}
                    </p>
                  )}
                </div>

                {/* Secondary Procedures */}
                {surgery.secondary_procedures &&
                  surgery.secondary_procedures.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Secondary Procedures
                      </h4>
                      <ul className="space-y-1">
                        {surgery.secondary_procedures.map((proc, idx) => (
                          <li key={idx} className="text-sm text-gray-600">
                            • {proc.procedure_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Diagnosis */}
                {surgery.post_op_diagnosis && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Post-Op Diagnosis
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {surgery.post_op_diagnosis}
                    </p>
                  </div>
                )}

                {/* Wound Classification */}
                {surgery.wound_classification && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Wound Classification
                    </h4>
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
                      {surgery.wound_classification.replace('_', ' ')}
                    </span>
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
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-900">
                        {surgery.scheduled_date
                          ? new Date(
                              surgery.scheduled_date,
                            ).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Theatre Entry:</span>
                      <span className="text-gray-900">
                        {surgery.theatre_entry_time?.substring(0, 5) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Incision:</span>
                      <span className="text-gray-900">
                        {surgery.incision_time?.substring(0, 5) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Closure:</span>
                      <span className="text-gray-900">
                        {surgery.closure_time?.substring(0, 5) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Theatre Exit:</span>
                      <span className="text-gray-900">
                        {surgery.theatre_exit_time?.substring(0, 5) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                      <span className="text-gray-700">Duration:</span>
                      <span className="text-blue-600">
                        {calculateDuration()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Surgical Team */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Surgical Team
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">Surgeon:</span>{' '}
                      <span className="text-gray-900">
                        {surgery.surgeon_name || 'N/A'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Anesthetist:</span>{' '}
                      <span className="text-gray-900">
                        {surgery.anesthetist_name || 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Theatre */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Theatre
                  </h4>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {surgery.theatre_room || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Blood Loss */}
                {surgery.estimated_blood_loss_ml !== null && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Estimated Blood Loss
                    </h4>
                    <p className="text-gray-900">
                      {surgery.estimated_blood_loss_ml} ml
                    </p>
                  </div>
                )}

                {/* Disposition */}
                {surgery.disposition && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Disposition
                    </h4>
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                      {surgery.disposition.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Findings - Full Width */}
            {surgery.findings && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Operative Findings
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {surgery.findings}
                </p>
              </div>
            )}

            {/* Procedure Details */}
            {surgery.procedure_details && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Procedure Details
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {surgery.procedure_details}
                </p>
              </div>
            )}

            {/* Complications */}
            {(surgery.intraop_complications ||
              surgery.postop_complications) && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Complications</span>
                </div>
                {surgery.intraop_complications && (
                  <div className="mb-2">
                    <span className="text-xs text-red-600 font-medium">
                      Intraoperative:
                    </span>
                    <p className="text-sm text-red-700">
                      {surgery.intraop_complications}
                    </p>
                  </div>
                )}
                {surgery.postop_complications && (
                  <div>
                    <span className="text-xs text-red-600 font-medium">
                      Postoperative:
                    </span>
                    <p className="text-sm text-red-700">
                      {surgery.postop_complications}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sign-offs */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Sign-offs
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Surgeon:</span>
                  <p
                    className={
                      surgery.surgeon_signoff_at
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }
                  >
                    {surgery.surgeon_signoff_at ? '✓ Signed' : 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Anesthetist:</span>
                  <p
                    className={
                      surgery.anesthetist_signoff_at
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }
                  >
                    {surgery.anesthetist_signoff_at ? '✓ Signed' : 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Nurse:</span>
                  <p
                    className={
                      surgery.nurse_signoff_at
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }
                  >
                    {surgery.nurse_signoff_at ? '✓ Signed' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Info */}
            <div className="border-t border-gray-200 pt-4 mt-6 text-xs text-gray-400">
              <p>Created: {new Date(surgery.created_at).toLocaleString()}</p>
              {surgery.updated_at !== surgery.created_at && (
                <p>Updated: {new Date(surgery.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
            <button
              onClick={() => navigate(`/surgery/${surgery.id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              View Full Details
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurgeryHistoryList;
