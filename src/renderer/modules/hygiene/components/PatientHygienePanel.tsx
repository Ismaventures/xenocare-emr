/**
 * Patient Hygiene Panel Component
 * Patient-level hygiene profile and care tracking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Shield,
  ChevronRight,
  Plus,
  RefreshCw,
  Scissors,
  Eye,
  FileText,
  User,
} from 'lucide-react';
import {
  useHygieneActivityCatalogue,
  useHygieneCareRecords,
  useHygieneCareSchedules,
  useHygieneDashboard,
} from '../hooks/useHygiene';
import {
  PatientHygieneProfile,
  HygieneCareRecordWithDetails,
  HygieneCareSchedule,
  HygieneActivityCatalogue,
  getHygieneStatusColor,
  getHygieneStatusLabel,
  getHygieneCategoryLabel,
  Shift,
  getShiftFromTime,
} from '../types/hygiene.types';

interface PatientHygienePanelProps {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  isExpanded?: boolean;
}

const PatientHygienePanel: React.FC<PatientHygienePanelProps> = ({
  patientId,
  encounterId,
  admissionId,
  isExpanded = true,
}) => {
  const navigate = useNavigate();
  const { getPatientProfile, loading: profileLoading } = useHygieneDashboard();
  const {
    records,
    loading: recordsLoading,
    fetchRecords,
  } = useHygieneCareRecords();
  const {
    schedules,
    loading: schedulesLoading,
    fetchSchedules,
  } = useHygieneCareSchedules();
  const { activities } = useHygieneActivityCatalogue();

  const [profile, setProfile] = useState<PatientHygieneProfile | null>(null);
  const [activeTab, setActiveTab] = useState<
    'schedules' | 'records' | 'infections'
  >('schedules');
  const [expanded, setExpanded] = useState(isExpanded);
  const [currentShift] = useState<Shift>(getShiftFromTime());

  useEffect(() => {
    loadData();
  }, [patientId, encounterId, admissionId]);

  const loadData = async () => {
    if (!encounterId) return;

    const profileData = await getPatientProfile(patientId, encounterId);
    setProfile(profileData);

    if (admissionId) {
      await fetchSchedules({ admission_id: admissionId });
    }

    // Fetch recent records
    await fetchRecords({ patient_id: patientId });
  };

  const loading = profileLoading || recordsLoading || schedulesLoading;

  const activeSchedules = schedules.filter((s) => s.is_active);
  const recentRecords = records.slice(0, 10);

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900">
              Hygiene Care
            </span>
          </div>
          <div className="flex items-center gap-2">
            {profile?.has_active_infection && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                Active Infection
              </span>
            )}
            <span className="text-xs text-gray-500">
              {activeSchedules.length} active schedules
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Droplets className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hygiene & Care</h3>
              <p className="text-xs text-gray-500">{currentShift} Shift</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw
                className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() =>
                navigate(
                  `/hygiene/record?patientId=${patientId}&encounterId=${encounterId}`,
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Document Care
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {profile && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            <QuickStat
              label="Today Completed"
              value={profile.today_completed}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            />
            <QuickStat
              label="Today Missed"
              value={profile.today_missed}
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              highlight={profile.today_missed > 0}
            />
            <QuickStat
              label="Compliance"
              value={`${profile.compliance_rate}%`}
              icon={<Activity className="h-4 w-4 text-blue-500" />}
              highlight={profile.compliance_rate < 80}
            />
            <QuickStat
              label="Active Schedules"
              value={profile.active_schedules}
              icon={<Calendar className="h-4 w-4 text-purple-500" />}
            />
          </div>
        )}

        {/* Alert Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {profile?.has_active_infection && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
              <Shield className="h-3 w-3" />
              Active Infection
            </span>
          )}
          {profile?.linked_surgery_ids &&
            profile.linked_surgery_ids.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                <Scissors className="h-3 w-3" />
                {profile.linked_surgery_ids.length} Surgery Link(s)
              </span>
            )}
          {profile?.overdue_activities && profile.overdue_activities > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
              <AlertCircle className="h-3 w-3" />
              {profile.overdue_activities} Overdue
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <TabButton
          active={activeTab === 'schedules'}
          onClick={() => setActiveTab('schedules')}
          icon={<Calendar className="h-4 w-4" />}
          label="Schedules"
          count={activeSchedules.length}
        />
        <TabButton
          active={activeTab === 'records'}
          onClick={() => setActiveTab('records')}
          icon={<FileText className="h-4 w-4" />}
          label="Recent Records"
          count={recentRecords.length}
        />
        <TabButton
          active={activeTab === 'infections'}
          onClick={() => setActiveTab('infections')}
          icon={<Shield className="h-4 w-4" />}
          label="Infections"
          highlight={profile?.has_active_infection}
        />
      </div>

      {/* Tab Content */}
      <div className="max-h-80 overflow-auto">
        {activeTab === 'schedules' && (
          <SchedulesTab
            schedules={activeSchedules}
            activities={activities}
            patientId={patientId}
            encounterId={encounterId}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab records={recentRecords} activities={activities} />
        )}
        {activeTab === 'infections' && <InfectionsTab patientId={patientId} />}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <button
          onClick={() => setExpanded(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Collapse
        </button>
        <button
          onClick={() => navigate(`/hygiene/patient/${patientId}`)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          View Full Profile →
        </button>
      </div>
    </div>
  );
};

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}

const QuickStat: React.FC<QuickStatProps> = ({
  label,
  value,
  icon,
  highlight,
}) => (
  <div
    className={`p-2 rounded-lg ${
      highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={`text-lg font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}
      >
        {value}
      </span>
    </div>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  highlight?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  count,
  highlight,
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600 bg-blue-50'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span
        className={`px-1.5 py-0.5 text-xs rounded-full ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {count}
      </span>
    )}
    {highlight && (
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    )}
  </button>
);

// Schedules Tab
interface SchedulesTabProps {
  schedules: HygieneCareSchedule[];
  activities: HygieneActivityCatalogue[];
  patientId: string;
  encounterId?: string;
}

const SchedulesTab: React.FC<SchedulesTabProps> = ({
  schedules,
  activities,
  patientId,
  encounterId,
}) => {
  const navigate = useNavigate();

  const getActivityName = (code: string) => {
    const activity = activities.find((a) => a.activity_code === code);
    return activity?.activity_name || code;
  };

  if (schedules.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>No active care schedules</p>
        <button
          onClick={() =>
            navigate(`/hygiene/schedule/create?patientId=${patientId}`)
          }
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          Create Schedule
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="p-3 hover:bg-gray-50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-1 h-8 rounded-full ${
                schedule.next_due && new Date(schedule.next_due) < new Date()
                  ? 'bg-red-500'
                  : 'bg-green-500'
              }`}
            />
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {getActivityName(schedule.activity_code)}
              </p>
              <p className="text-xs text-gray-500">
                Frequency: {schedule.frequency_hours}h • Every{' '}
                {schedule.frequency_hours} hours
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {schedule.requires_two_staff && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                2-person
              </span>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-500">Next due</p>
              <p className="text-sm font-medium text-gray-900">
                {schedule.next_due
                  ? new Date(schedule.next_due).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not set'}
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/hygiene/record?patientId=${patientId}&scheduleId=${schedule.id}&activityCode=${schedule.activity_code}${encounterId ? `&encounterId=${encounterId}` : ''}`,
                )
              }
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Records Tab
interface RecordsTabProps {
  records: HygieneCareRecordWithDetails[];
  activities: HygieneActivityCatalogue[];
}

const RecordsTab: React.FC<RecordsTabProps> = ({ records, activities }) => {
  const getActivityName = (code: string) => {
    const activity = activities.find((a) => a.activity_code === code);
    return activity?.activity_name || code;
  };

  if (records.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>No care records yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {records.map((record) => {
        const { bg, text } = getHygieneStatusColor(record.status);
        return (
          <div key={record.id} className="p-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}
                >
                  {record.status === 'Completed' ? (
                    <CheckCircle className={`h-4 w-4 ${text}`} />
                  ) : record.status === 'Missed' ? (
                    <XCircle className={`h-4 w-4 ${text}`} />
                  ) : (
                    <Clock className={`h-4 w-4 ${text}`} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {getActivityName(record.activity_code)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {record.shift} Shift •{' '}
                    {getHygieneStatusLabel(record.status)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">
                  {new Date(record.performed_time).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(record.performed_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            {record.notes && (
              <p className="mt-2 text-xs text-gray-600 pl-11">{record.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Infections Tab
interface InfectionsTabProps {
  patientId: string;
}

const InfectionsTab: React.FC<InfectionsTabProps> = ({ patientId }) => {
  const navigate = useNavigate();
  // This would fetch actual infection data
  const infections: any[] = []; // Placeholder

  if (infections.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield className="h-8 w-8 mx-auto mb-2 text-green-300" />
        <p className="text-green-600">No active infections</p>
        <button
          onClick={() => navigate(`/hygiene/infections?patientId=${patientId}`)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          View Infection History
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Infection list would go here */}
    </div>
  );
};

export default PatientHygienePanel;
