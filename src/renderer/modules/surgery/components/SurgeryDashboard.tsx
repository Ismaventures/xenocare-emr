/**
 * Surgery Dashboard Component
 * Main entry point for surgery/theatre module
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  FileText,
  Plus,
  Filter,
  Search,
  ChevronRight,
  Stethoscope,
  Building2,
} from 'lucide-react';
import { useSurgeries, useTheatreRooms } from '../hooks/useSurgery';
import {
  SurgeryDashboardStats,
  SurgeryWithDetails,
  TheatreRoom,
  getSurgeryStatusColor,
  getPriorityColor,
  getTheatreRoomStatusColor,
} from '../types/surgery.types';
import { SkeletonDashboard } from '../../../components/ui/SkeletonLoader';

interface SurgeryDashboardProps {
  facilityId?: string;
}

const SurgeryDashboard: React.FC<SurgeryDashboardProps> = ({ facilityId }) => {
  const navigate = useNavigate();
  const {
    listSurgeries,
    getDashboardStats,
    loading: surgeriesLoading,
  } = useSurgeries();
  const { listTheatreRooms, loading: roomsLoading } = useTheatreRooms();

  const [stats, setStats] = useState<SurgeryDashboardStats | null>(null);
  const [todaySurgeries, setTodaySurgeries] = useState<SurgeryWithDetails[]>(
    [],
  );
  const [theatreRooms, setTheatreRooms] = useState<TheatreRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [statsData, surgeries, rooms] = await Promise.all([
      getDashboardStats(),
      listSurgeries({
        scheduled_date_from: today,
        scheduled_date_to: today,
      }),
      listTheatreRooms(true),
    ]);

    setStats(statsData);
    setTodaySurgeries(surgeries);
    setTheatreRooms(rooms);
  };

  const filteredSurgeries = todaySurgeries.filter((surgery) => {
    const matchesSearch =
      !searchQuery ||
      surgery.surgery_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      surgery.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surgery.primary_procedure
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || surgery.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const loading = surgeriesLoading || roomsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Surgery Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Theatre schedule and surgery management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/surgery/history"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" />
            Surgery History
          </Link>
          <Link
            to="/surgery/schedule"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-4 w-4" />
            Theatre Schedule
          </Link>
          <Link
            to="/surgery/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Surgery
          </Link>
        </div>
      </div>

      {/* Navigation Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <h3 className="font-semibold mb-1">
            How to navigate the Surgery Module
          </h3>
          <p>
            Manage your surgical cases and theatre schedules here. Use the{' '}
            <strong>'New Surgery'</strong> button to book a case. Click on any
            surgery card below to access the{' '}
            <strong>Clinical Detail View</strong>. From there, you can complete
            the
            <strong>WHO Safe Surgery Checklist</strong>, document{' '}
            <strong>Anesthesia</strong> vitals, record <strong>Intra-op</strong>{' '}
            findings, and track <strong>Consumables</strong> usage.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            title="Today Scheduled"
            value={stats.today_scheduled}
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
            color="blue"
          />
          <StatCard
            title="In Theatre"
            value={stats.today_in_progress}
            icon={<Activity className="h-5 w-5 text-red-500" />}
            color="red"
          />
          <StatCard
            title="Completed"
            value={stats.today_completed}
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            color="green"
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled_today}
            icon={<XCircle className="h-5 w-5 text-gray-500" />}
            color="gray"
          />
          <StatCard
            title="Pending Consent"
            value={stats.pending_consent}
            icon={<FileText className="h-5 w-5 text-yellow-500" />}
            color="yellow"
            highlight={stats.pending_consent > 0}
          />
          <StatCard
            title="Pending Pre-Op"
            value={stats.pending_preop}
            icon={<Stethoscope className="h-5 w-5 text-purple-500" />}
            color="purple"
            highlight={stats.pending_preop > 0}
          />
          <StatCard
            title="Awaiting NHIS"
            value={stats.awaiting_nhis}
            icon={<Clock className="h-5 w-5 text-orange-500" />}
            color="orange"
            highlight={stats.awaiting_nhis > 0}
          />
          <StatCard
            title="Emergency"
            value={stats.emergency_pending}
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            color="red"
            highlight={stats.emergency_pending > 0}
          />
        </div>
      )}

      {/* Theatre Rooms Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Theatre Rooms</h2>
          <Link
            to="/surgery/rooms"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Manage Rooms
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {theatreRooms.map((room) => (
            <TheatreRoomCard key={room.id} room={room} />
          ))}
          {theatreRooms.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-4">
              No theatre rooms configured
            </p>
          )}
        </div>
      </div>

      {/* Today's Surgery List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Today's Surgeries
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Planned">Planned</option>
                <option value="Pre_Op">Pre-Op</option>
                <option value="In_Theatre">In Theatre</option>
                <option value="Recovery">Recovery</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <SkeletonDashboard />
          ) : filteredSurgeries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No surgeries scheduled for today
            </div>
          ) : (
            filteredSurgeries.map((surgery) => (
              <SurgeryListItem
                key={surgery.id}
                surgery={surgery}
                onClick={() => navigate(`/surgery/${surgery.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
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

// Theatre Room Card Component
interface TheatreRoomCardProps {
  room: TheatreRoom;
}

const TheatreRoomCard: React.FC<TheatreRoomCardProps> = ({ room }) => (
  <div
    className={`rounded-lg border p-3 ${
      room.current_status === 'In_Use'
        ? 'border-red-300 bg-red-50'
        : room.current_status === 'Available'
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      <Building2 className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-sm">{room.room_code}</span>
    </div>
    <span
      className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getTheatreRoomStatusColor(
        room.current_status,
      )}`}
    >
      {room.current_status.replace('_', ' ')}
    </span>
  </div>
);

// Surgery List Item Component
interface SurgeryListItemProps {
  surgery: SurgeryWithDetails;
  onClick: () => void;
}

const SurgeryListItem: React.FC<SurgeryListItemProps> = ({
  surgery,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
  >
    <div className="flex items-center gap-4">
      {/* Time */}
      <div className="text-center w-16">
        <p className="text-sm font-medium text-gray-900">
          {surgery.scheduled_time?.substring(0, 5) || '--:--'}
        </p>
        <p className="text-xs text-gray-500">{surgery.theatre_room || 'TBD'}</p>
      </div>

      {/* Priority Badge */}
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getPriorityColor(
          surgery.priority,
        )}`}
      >
        {surgery.priority}
      </span>

      {/* Patient & Procedure Info */}
      <div>
        <p className="font-medium text-gray-900">
          {surgery.patient_name || 'Unknown Patient'}
        </p>
        <p className="text-sm text-gray-600">{surgery.primary_procedure}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {surgery.surgery_number}
          </span>
          {surgery.requires_nhis_approval && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                surgery.nhis_authorization_code
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {surgery.nhis_authorization_code
                ? 'NHIS Approved'
                : 'NHIS Pending'}
            </span>
          )}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-4">
      {/* Surgeon */}
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {surgery.surgeon_name || 'Not assigned'}
        </p>
        <p className="text-xs text-gray-500">Surgeon</p>
      </div>

      {/* Status */}
      <span
        className={`inline-flex px-3 py-1 text-sm rounded-full ${getSurgeryStatusColor(
          surgery.status,
        )}`}
      >
        {surgery.status.replace('_', ' ')}
      </span>

      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
  </div>
);

export default SurgeryDashboard;
