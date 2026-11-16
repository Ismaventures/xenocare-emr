/**
 * Infection Surveillance List Component
 * HAI (Healthcare-Associated Infection) tracking and management
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Search,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  ChevronRight,
  FileText,
  Activity,
  Scissors,
  Eye,
  TrendingUp,
  Download,
  X,
} from 'lucide-react';
import { useInfectionSurveillance } from '../hooks/useHygiene';
import {
  InfectionSurveillance,
  InfectionSurveillanceWithDetails,
  InfectionType,
  InfectionSeverity,
  InfectionOutcome,
  InfectionDashboardStats,
  getInfectionTypeLabel,
  getInfectionTypeColor,
  getSeverityColor as getInfectionSeverityColor,
  getOutcomeColor as getInfectionOutcomeColor,
  getInfectionOutcomeLabel,
} from '../types/hygiene.types';

const InfectionSurveillanceList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const {
    infections,
    loading,
    fetchInfections,
    getDashboardStats,
    resolveInfection,
  } = useInfectionSurveillance();

  const [stats, setStats] = useState<InfectionDashboardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<InfectionType | 'all'>(
    'all',
  );
  const [selectedSeverity, setSelectedSeverity] = useState<
    InfectionSeverity | 'all'
  >('all');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [selectedInfection, setSelectedInfection] =
    useState<InfectionSurveillanceWithDetails | null>(null);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    await fetchInfections(patientId ? { patient_id: patientId } : {});
    const statsData = await getDashboardStats();
    setStats(statsData);
  };

  // Filter infections
  const filteredInfections = useMemo(() => {
    let filtered = [...infections];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inf) =>
          inf.patient?.full_name?.toLowerCase().includes(term) ||
          inf.organism?.toLowerCase().includes(term) ||
          inf.infection_type.toLowerCase().includes(term),
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((inf) => inf.infection_type === selectedType);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((inf) => inf.severity === selectedSeverity);
    }

    // Active filter
    if (showOnlyActive) {
      filtered = filtered.filter((inf) => inf.outcome === 'Ongoing');
    }

    // Sort by date (most recent first)
    filtered.sort(
      (a, b) =>
        new Date(b.detected_date).getTime() -
        new Date(a.detected_date).getTime(),
    );

    return filtered;
  }, [infections, searchTerm, selectedType, selectedSeverity, showOnlyActive]);

  const infectionTypes: InfectionType[] = [
    'SSI',
    'CAUTI',
    'CLABSI',
    'VAP',
    'CDI',
    'MRSA',
    'Other_HAI',
  ];

  const severityLevels: InfectionSeverity[] = ['Mild', 'Moderate', 'Severe'];

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
                Infection Surveillance
              </h1>
              <p className="text-sm text-gray-500">
                Healthcare-Associated Infection Tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
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
              onClick={() => navigate('/hygiene/infections/report')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              Report Infection
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <StatBadge
              label="Active"
              value={stats.active_infections}
              highlight={stats.active_infections > 0}
            />
            <div className="w-px h-8 bg-gray-300" />
            <StatBadge label="SSI" value={stats.ssi_count} />
            <StatBadge label="CAUTI" value={stats.cauti_count} />
            <StatBadge label="CLABSI" value={stats.clabsi_count} />
            <StatBadge label="VAP" value={stats.vap_count} />
            <div className="w-px h-8 bg-gray-300" />
            <StatBadge
              label="Device-Related"
              value={`${stats.device_related_percentage}%`}
            />
            <StatBadge label="New This Week" value={stats.new_this_week} />
            <div className="flex-1" />
            <span className="text-sm text-gray-500">
              {stats.resolved_this_month} resolved this month
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, organism..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as InfectionType | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            {infectionTypes.map((type) => (
              <option key={type} value={type}>
                {getInfectionTypeLabel(type)}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) =>
              setSelectedSeverity(e.target.value as InfectionSeverity | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Severities</option>
            {severityLevels.map((sev) => (
              <option key={sev} value={sev}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </option>
            ))}
          </select>

          {/* Active Only Toggle */}
          <button
            onClick={() => setShowOnlyActive(!showOnlyActive)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border ${
              showOnlyActive
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            Active Only
          </button>
        </div>
      </div>

      {/* Main Content */}
      {/* Infection List */}
      <div className="flex-1 overflow-auto p-4">
        {loading && infections.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredInfections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Shield className="h-12 w-12 text-green-400 mb-4" />
            <p className="text-lg font-medium">
              {showOnlyActive ? 'No active infections' : 'No infections found'}
            </p>
            <p className="text-sm">
              {showOnlyActive
                ? 'All infections have been resolved'
                : 'No matching infection records'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInfections.map((infection) => (
              <InfectionCard
                key={infection.id}
                infection={infection}
                isSelected={selectedInfection?.id === infection.id}
                onClick={() => setSelectedInfection(infection)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInfection && (
        <InfectionDetailModal
          infection={selectedInfection}
          onClose={() => setSelectedInfection(null)}
          onResolve={async (id, outcome) => {
            await resolveInfection(id, outcome);
            await loadData();
            setSelectedInfection(null);
          }}
        />
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredInfections.length} of {infections.length}{' '}
            infections
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Severe: {infections.filter((i) => i.severity === 'Severe').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Moderate:{' '}
              {infections.filter((i) => i.severity === 'Moderate').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Mild: {infections.filter((i) => i.severity === 'Mild').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Badge Component
interface StatBadgeProps {
  label: string;
  value: number | string;
  highlight?: boolean;
}

const StatBadge: React.FC<StatBadgeProps> = ({ label, value, highlight }) => (
  <div className="text-center">
    <p
      className={`text-lg font-bold ${
        highlight ? 'text-red-600' : 'text-gray-900'
      }`}
    >
      {value}
    </p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Infection Card Component
interface InfectionCardProps {
  infection: InfectionSurveillanceWithDetails;
  isSelected: boolean;
  onClick: () => void;
}

const InfectionCard: React.FC<InfectionCardProps> = ({
  infection,
  isSelected,
  onClick,
}) => {
  const { bg: typeBg, text: typeText } = getInfectionTypeColor(
    infection.infection_type,
  );
  const { bg: sevBg, text: sevText } = getInfectionSeverityColor(
    infection.severity,
  );
  const { bg: outBg, text: outText } = getInfectionOutcomeColor(
    infection.outcome,
  );

  const daysSinceDetection = Math.floor(
    (new Date().getTime() - new Date(infection.detected_date).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Severity Indicator */}
          <div
            className={`w-2 h-16 rounded-full ${
              infection.severity === 'Severe'
                ? 'bg-red-500'
                : infection.severity === 'Moderate'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
          />

          {/* Main Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${typeBg} ${typeText}`}
              >
                {getInfectionTypeLabel(infection.infection_type)}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${sevBg} ${sevText}`}
              >
                {infection.severity || 'Unknown'}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${outBg} ${outText}`}
              >
                {getInfectionOutcomeLabel(infection.outcome)}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {infection.patient?.full_name || 'Unknown Patient'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Detected:{' '}
                {new Date(infection.detected_date).toLocaleDateString()}
              </span>
              <span>Day {daysSinceDetection}</span>
              {infection.organism && (
                <span className="text-purple-600 font-medium">
                  {infection.organism}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Flags */}
          <div className="flex flex-col gap-1">
            {infection.is_device_related && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                Device-Related
              </span>
            )}
            {infection.linked_surgery_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                <Scissors className="h-3 w-3" />
                Linked Surgery
              </span>
            )}
            {infection.reported_to_ic && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                Reported to IC
              </span>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Notes Preview */}
      {infection.notes && (
        <p className="mt-3 pl-6 text-sm text-gray-600 line-clamp-2 border-l-2 border-gray-200">
          {infection.notes}
        </p>
      )}
    </div>
  );
};

// Infection Detail Modal
interface InfectionDetailModalProps {
  infection: InfectionSurveillanceWithDetails;
  onClose: () => void;
  onResolve: (id: string, outcome: InfectionOutcome) => Promise<void>;
}

const InfectionDetailModal: React.FC<InfectionDetailModalProps> = ({
  infection,
  onClose,
  onResolve,
}) => {
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (outcome: InfectionOutcome) => {
    setResolving(true);
    try {
      await onResolve(infection.id, outcome);
    } finally {
      setResolving(false);
    }
  };

  const daysSinceDetection = Math.floor(
    (new Date().getTime() - new Date(infection.detected_date).getTime()) /
      (1000 * 60 * 60 * 24),
  );

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
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Infection Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    {infection.patient?.full_name || 'Unknown Patient'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Type & Severity Badges */}
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-2.5 py-1 text-sm font-medium rounded-md ${
                  getInfectionTypeColor(infection.infection_type).bg
                } ${getInfectionTypeColor(infection.infection_type).text}`}
              >
                {getInfectionTypeLabel(infection.infection_type)}
              </span>
              <span
                className={`px-2.5 py-1 text-sm font-medium rounded-md capitalize ${
                  getInfectionSeverityColor(infection.severity).bg
                } ${getInfectionSeverityColor(infection.severity).text}`}
              >
                {infection.severity || 'Unknown'}
              </span>
              <span
                className={`px-2.5 py-1 text-sm font-medium rounded-md ${
                  getInfectionOutcomeColor(infection.outcome).bg
                } ${getInfectionOutcomeColor(infection.outcome).text}`}
              >
                {getInfectionOutcomeLabel(infection.outcome)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700">
                      Patient Information
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {infection.patient?.full_name || 'Unknown'}
                      </p>
                      <button
                        onClick={() =>
                          navigate(`/patients/${infection.patient_id}`)
                        }
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View Patient →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Timeline
                  </h3>
                  <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Detected</span>
                      <span className="font-medium">
                        {new Date(infection.detected_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Days Active</span>
                      <span className="font-medium">{daysSinceDetection}</span>
                    </div>
                    {infection.resolution_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Resolved</span>
                        <span className="font-medium">
                          {new Date(
                            infection.resolution_date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organism */}
                {infection.organism && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Organism
                    </h3>
                    <p className="text-sm font-medium text-purple-600 bg-purple-50 rounded-lg p-3">
                      {infection.organism}
                    </p>
                  </div>
                )}

                {/* Site */}
                {infection.infection_site && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Infection Site
                    </h3>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                      {infection.infection_site}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Flags */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Infection Flags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {infection.is_device_related && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                        Device-Related
                      </span>
                    )}
                    {infection.is_post_surgical && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                        Post-Surgical
                      </span>
                    )}
                    {infection.is_community_onset && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                        Community Onset
                      </span>
                    )}
                    {infection.reported_to_ic && (
                      <span className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-md">
                        Reported to IC
                      </span>
                    )}
                    {!infection.is_device_related &&
                      !infection.is_post_surgical &&
                      !infection.is_community_onset &&
                      !infection.reported_to_ic && (
                        <span className="text-sm text-gray-500">
                          No flags set
                        </span>
                      )}
                  </div>
                </div>

                {/* Linked Surgery */}
                {infection.linked_surgery_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Linked Surgery
                    </h3>
                    <button
                      onClick={() =>
                        navigate(`/surgery/${infection.linked_surgery_id}`)
                      }
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg p-3 w-full"
                    >
                      <Scissors className="h-4 w-4" />
                      View Surgery Details
                    </button>
                  </div>
                )}

                {/* Treatment Notes */}
                {infection.treatment_notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Treatment Notes
                    </h3>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {infection.treatment_notes}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {infection.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </h3>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {infection.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Created: {new Date(infection.created_at).toLocaleString()}
              </p>
              <div className="flex items-center gap-3">
                {infection.outcome === 'Ongoing' && (
                  <button
                    onClick={() => handleResolve('Resolved')}
                    disabled={resolving}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Resolved
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfectionSurveillanceList;
