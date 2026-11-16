/**
 * Hygiene Dashboard Component
 * Main entry point for hygiene/infection control module
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Droplets,
  Shield,
  ChevronRight,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  useHygieneDashboard,
  useInfectionSurveillance,
} from '../hooks/useHygiene';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import {
  HygieneDashboardStats,
  InfectionDashboardStats,
  ShiftComplianceStats,
  HygieneWorklistItem,
  getHygieneStatusColor,
  getInfectionTypeColor,
  getInfectionTypeLabel,
  getHygieneCategoryLabel,
  Shift,
  getShiftFromTime,
} from '../types/hygiene.types';

interface HygieneDashboardProps {
  wardId?: string;
}

const HygieneDashboard: React.FC<HygieneDashboardProps> = ({ wardId }) => {
  const navigate = useNavigate();
  const {
    getDashboardStats,
    getShiftCompliance,
    getWorklist,
    loading: dashboardLoading,
  } = useHygieneDashboard();
  const { getDashboardStats: getInfectionStats, loading: infectionLoading } =
    useInfectionSurveillance();

  const [stats, setStats] = useState<HygieneDashboardStats | null>(null);
  const [infectionStats, setInfectionStats] =
    useState<InfectionDashboardStats | null>(null);
  const [shiftCompliance, setShiftCompliance] = useState<
    ShiftComplianceStats[]
  >([]);
  const [worklist, setWorklist] = useState<HygieneWorklistItem[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>(wardId || '');
  const [currentShift, setCurrentShift] = useState<Shift>(getShiftFromTime());

  useEffect(() => {
    loadDashboardData();
  }, [selectedWard]);

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [statsData, infectionData, shiftData] = await Promise.all([
      getDashboardStats(selectedWard || undefined),
      getInfectionStats(),
      getShiftCompliance(today, selectedWard || undefined),
    ]);

    setStats(statsData);
    setInfectionStats(infectionData);
    setShiftCompliance(shiftData);

    if (selectedWard) {
      const worklistData = await getWorklist(selectedWard);
      setWorklist(worklistData);
    }
  };

  const loading = dashboardLoading || infectionLoading;

  // Separate worklist by urgency
  const overdueItems = worklist.filter((item) => item.is_overdue);
  const upcomingItems = worklist
    .filter((item) => !item.is_overdue)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hygiene & Infection Control
          </h1>
          <p className="text-sm text-gray-500">
            Current Shift: {currentShift} | Ward care tracking and compliance
            monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw
              className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <Link
            to="/hygiene/records"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Activity className="h-4 w-4" />
            Care Records
          </Link>
          <Link
            to="/hygiene/record"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Droplets className="h-4 w-4" />
            Document Care
          </Link>
          <Link
            to="/hygiene/infections"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            <Shield className="h-4 w-4" />
            Infection Surveillance
          </Link>
        </div>
      </div>

      <InlineGuidance
        module="hygiene"
        title="Hygiene & Infection Control"
        message="Monitor hygiene compliance and track infectious cases. Use 'Document Care' to record tasks, and 'Infection Surveillance' for reporting."
      />

      {/* Hygiene Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            title="Completed Today"
            value={stats.today_completed}
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            color="green"
          />
          <StatCard
            title="Missed Care"
            value={stats.today_missed}
            icon={<XCircle className="h-5 w-5 text-red-500" />}
            color="red"
            highlight={stats.today_missed > 0}
          />
          <StatCard
            title="Refused"
            value={stats.today_refused}
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            color="orange"
          />
          <StatCard
            title="Deferred"
            value={stats.today_deferred}
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
            color="yellow"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue_count}
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            color="red"
            highlight={stats.overdue_count > 0}
          />
          <StatCard
            title="Compliance Rate"
            value={`${stats.compliance_rate}%`}
            icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
            color="blue"
            highlight={stats.compliance_rate < 80}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending_supervisor_review}
            icon={<Users className="h-5 w-5 text-purple-500" />}
            color="purple"
          />
          <StatCard
            title="Active Schedules"
            value={stats.active_schedules}
            icon={<Calendar className="h-5 w-5 text-gray-500" />}
            color="gray"
          />
        </div>
      )}

      {/* Infection Stats */}
      {infectionStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Infection Surveillance
            </h2>
            <Link
              to="/hygiene/infections"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <InfectionStatCard
              label="Active"
              value={infectionStats.active_infections}
              highlight={infectionStats.active_infections > 0}
            />
            <InfectionStatCard
              label="New This Week"
              value={infectionStats.new_this_week}
            />
            <InfectionStatCard
              label="SSI"
              value={infectionStats.ssi_count}
              type="SSI"
            />
            <InfectionStatCard
              label="CAUTI"
              value={infectionStats.cauti_count}
              type="CAUTI"
            />
            <InfectionStatCard
              label="CLABSI"
              value={infectionStats.clabsi_count}
              type="CLABSI"
            />
            <InfectionStatCard
              label="VAP"
              value={infectionStats.vap_count}
              type="VAP"
            />
            <InfectionStatCard
              label="Device-Related"
              value={`${infectionStats.device_related_percentage}%`}
            />
            <InfectionStatCard
              label="Resolved (30d)"
              value={infectionStats.resolved_this_month}
              positive
            />
          </div>
        </div>
      )}

      {/* Shift Compliance */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Shift Compliance
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {shiftCompliance.map((shift) => (
            <ShiftComplianceCard
              key={shift.shift}
              data={shift}
              isCurrentShift={shift.shift === currentShift}
            />
          ))}
        </div>
      </div>

      {/* Worklist Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Items */}
        <div className="bg-white rounded-lg border border-red-200">
          <div className="p-4 border-b border-red-100 bg-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-red-900">
                  Overdue Care
                </h2>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                {overdueItems.length} items
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {overdueItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No overdue care activities
              </div>
            ) : (
              overdueItems
                .slice(0, 5)
                .map((item) => (
                  <WorklistItemCard
                    key={item.schedule_id}
                    item={item}
                    isOverdue
                  />
                ))
            )}
          </div>
          {overdueItems.length > 5 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <Link
                to="/hygiene/worklist"
                className="text-sm text-red-600 hover:text-red-700"
              >
                View all {overdueItems.length} overdue items
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Items */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Care
                </h2>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {upcomingItems.length} items
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No upcoming care activities scheduled
              </div>
            ) : (
              upcomingItems.map((item) => (
                <WorklistItemCard key={item.schedule_id} item={item} />
              ))
            )}
          </div>
          {worklist.filter((i) => !i.is_overdue).length > 10 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <Link
                to="/hygiene/worklist"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View full worklist
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  highlight = false,
}) => (
  <div
    className={`bg-white rounded-lg border p-4 ${
      highlight ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      {icon}
      <span
        className={`text-2xl font-bold ${
          highlight ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
    <p className="text-xs text-gray-500">{title}</p>
  </div>
);

// Infection Stat Card
interface InfectionStatCardProps {
  label: string;
  value: number | string;
  type?: string;
  highlight?: boolean;
  positive?: boolean;
}

const InfectionStatCard: React.FC<InfectionStatCardProps> = ({
  label,
  value,
  type,
  highlight,
  positive,
}) => (
  <div
    className={`p-3 rounded-lg text-center ${
      highlight
        ? 'bg-red-50 border border-red-200'
        : positive
          ? 'bg-green-50 border border-green-200'
          : 'bg-gray-50 border border-gray-200'
    }`}
  >
    <p
      className={`text-lg font-bold ${
        highlight
          ? 'text-red-700'
          : positive
            ? 'text-green-700'
            : 'text-gray-900'
      }`}
    >
      {value}
    </p>
    <p className="text-xs text-gray-600">{label}</p>
  </div>
);

// Shift Compliance Card
interface ShiftComplianceCardProps {
  data: ShiftComplianceStats;
  isCurrentShift: boolean;
}

const ShiftComplianceCard: React.FC<ShiftComplianceCardProps> = ({
  data,
  isCurrentShift,
}) => {
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        isCurrentShift
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">
          {data.shift} Shift
          {isCurrentShift && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
              Current
            </span>
          )}
        </h3>
        <span
          className={`px-2 py-1 text-sm font-bold rounded ${getComplianceColor(
            data.compliance_rate,
          )}`}
        >
          {data.compliance_rate}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-green-600">
            {data.completed}
          </p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-600">{data.missed}</p>
          <p className="text-xs text-gray-500">Missed</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-orange-600">
            {data.refused}
          </p>
          <p className="text-xs text-gray-500">Refused</p>
        </div>
      </div>
    </div>
  );
};

// Worklist Item Card
interface WorklistItemCardProps {
  item: HygieneWorklistItem;
  isOverdue?: boolean;
}

const WorklistItemCard: React.FC<WorklistItemCardProps> = ({
  item,
  isOverdue,
}) => {
  const navigate = useNavigate();

  const getDueText = () => {
    if (isOverdue) {
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
    <div
      onClick={() =>
        navigate(
          `/hygiene/record?patientId=${item.patient_id}&activityCode=${item.activity_code}`,
        )
      }
      className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-2 h-12 rounded-full ${
            isOverdue
              ? 'bg-red-500'
              : item.minutes_until_due <= 30
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
        />
        <div>
          <p className="font-medium text-gray-900">{item.patient_name}</p>
          <p className="text-sm text-gray-600">
            {item.activity_name} •{' '}
            {getHygieneCategoryLabel(item.activity_category)}
          </p>
          <p className="text-xs text-gray-500">
            {item.ward_name} {item.bed_number && `• Bed ${item.bed_number}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {item.requires_two_staff && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
            2-person
          </span>
        )}
        <div className="text-right">
          <p
            className={`text-sm font-medium ${
              isOverdue ? 'text-red-600' : 'text-gray-900'
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
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
};

export default HygieneDashboard;
