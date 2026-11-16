/**
 * Theatre Rooms Management Component
 * Manage theatre/operating rooms configuration and status
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  AlertTriangle,
  Edit2,
  Trash2,
  Activity,
  X,
} from 'lucide-react';
import { useTheatreRooms } from '../hooks/useSurgery';
import {
  TheatreRoom,
  TheatreRoomFormData,
  TheatreRoomType,
  TheatreRoomStatus,
  getTheatreRoomStatusColor,
} from '../types/surgery.types';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

const TheatreRoomsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { listTheatreRooms, createTheatreRoom, updateRoomStatus, loading } =
    useTheatreRooms();

  const [rooms, setRooms] = useState<TheatreRoom[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TheatreRoomStatus | 'all'>(
    'all',
  );
  const [typeFilter, setTypeFilter] = useState<TheatreRoomType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<TheatreRoom | null>(null);

  useEffect(() => {
    loadRooms();
  }, [showInactive]);

  const loadRooms = async () => {
    const data = await listTheatreRooms(!showInactive);
    setRooms(data);
  };

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      !searchTerm ||
      room.room_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.room_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || room.current_status === statusFilter;
    const matchesType = typeFilter === 'all' || room.room_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const availableCount = rooms.filter(
    (r) => r.current_status === 'Available',
  ).length;
  const inUseCount = rooms.filter((r) => r.current_status === 'In_Use').length;
  const maintenanceCount = rooms.filter(
    (r) => r.current_status === 'Maintenance',
  ).length;

  const roomTypes: TheatreRoomType[] = [
    'General',
    'Cardiac',
    'Neuro',
    'Orthopedic',
    'Obstetric',
    'Ophthalmic',
    'ENT',
    'Minor',
    'Emergency',
    'Hybrid',
  ];

  const roomStatuses: TheatreRoomStatus[] = [
    'Available',
    'In_Use',
    'Cleaning',
    'Maintenance',
    'Reserved',
  ];

  const handleStatusChange = async (
    roomId: string,
    newStatus: TheatreRoomStatus,
  ) => {
    const success = await updateRoomStatus(roomId, newStatus);
    if (success) {
      loadRooms();
    }
  };

  const handleAddRoom = async (formData: TheatreRoomFormData) => {
    const room = await createTheatreRoom(formData);
    if (room) {
      setShowAddModal(false);
      loadRooms();
    }
  };

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
              <h1 className="text-xl font-bold text-gray-900">Theatre Rooms</h1>
              <p className="text-sm text-gray-500">
                Manage operating rooms and their status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadRooms}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <StatBadge
            label="Total Rooms"
            value={rooms.length}
            icon={<Building2 className="h-4 w-4" />}
          />
          <div className="w-px h-8 bg-gray-300" />
          <StatBadge
            label="Available"
            value={availableCount}
            color="text-green-600"
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          />
          <StatBadge
            label="In Use"
            value={inUseCount}
            color="text-red-600"
            icon={<Activity className="h-4 w-4 text-red-500" />}
          />
          <StatBadge
            label="Maintenance"
            value={maintenanceCount}
            color="text-yellow-600"
            icon={<Wrench className="h-4 w-4 text-yellow-500" />}
          />
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
              placeholder="Search by room code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TheatreRoomStatus | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            {roomStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as TheatreRoomType | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            {roomTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Show Inactive */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show Inactive Rooms
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && rooms.length === 0 ? (
          <SkeletonList count={4} />
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No theatre rooms found</p>
            <p className="text-sm">Add a new room or adjust your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <TheatreRoomCard
                key={room.id}
                room={room}
                onStatusChange={handleStatusChange}
                onViewDetails={() => setSelectedRoom(room)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <AddRoomModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRoom}
          loading={loading}
        />
      )}

      {/* Room Details Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
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

// Theatre Room Card
interface TheatreRoomCardProps {
  room: TheatreRoom;
  onStatusChange: (roomId: string, status: TheatreRoomStatus) => void;
  onViewDetails: () => void;
}

const TheatreRoomCard: React.FC<TheatreRoomCardProps> = ({
  room,
  onStatusChange,
  onViewDetails,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const getStatusIcon = (status: TheatreRoomStatus) => {
    switch (status) {
      case 'Available':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'In_Use':
        return <Activity className="h-5 w-5 text-red-500" />;
      case 'Cleaning':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'Maintenance':
        return <Wrench className="h-5 w-5 text-yellow-500" />;
      case 'Reserved':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getBorderColor = (status: TheatreRoomStatus) => {
    switch (status) {
      case 'Available':
        return 'border-green-300';
      case 'In_Use':
        return 'border-red-300';
      case 'Cleaning':
        return 'border-blue-300';
      case 'Maintenance':
        return 'border-yellow-300';
      case 'Reserved':
        return 'border-purple-300';
      default:
        return 'border-gray-200';
    }
  };

  const statuses: TheatreRoomStatus[] = [
    'Available',
    'In_Use',
    'Cleaning',
    'Maintenance',
    'Reserved',
  ];

  return (
    <div
      className={`bg-white rounded-lg border-2 ${getBorderColor(room.current_status)} shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-600" />
            <h3 className="font-bold text-lg text-gray-900">
              {room.room_code}
            </h3>
          </div>
          {getStatusIcon(room.current_status)}
        </div>

        {/* Room Name */}
        <p className="text-sm text-gray-600 mb-2">{room.room_name}</p>

        {/* Room Type Badge */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 mb-3">
          {room.room_type}
        </span>

        {/* Location */}
        {(room.building || room.floor) && (
          <p className="text-xs text-gray-500 mb-3">
            {room.building && `${room.building}`}
            {room.building && room.floor && ' • '}
            {room.floor && `Floor ${room.floor}`}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex px-3 py-1 text-sm rounded-full ${getTheatreRoomStatusColor(room.current_status)}`}
          >
            {room.current_status.replace('_', ' ')}
          </span>

          {/* Status Change Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <Settings className="h-4 w-4" />
            </button>

            {showStatusMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowStatusMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(room.id, status);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        room.current_status === status
                          ? 'bg-blue-50 text-blue-600'
                          : ''
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2">
        <button
          onClick={onViewDetails}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

// Add Room Modal
interface AddRoomModalProps {
  onClose: () => void;
  onSubmit: (data: TheatreRoomFormData) => void;
  loading: boolean;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({
  onClose,
  onSubmit,
  loading,
}) => {
  const [formData, setFormData] = useState<TheatreRoomFormData>({
    room_code: '',
    room_name: '',
    room_type: 'General',
    capacity_level: '',
    standard_equipment: [],
    special_equipment: [],
    floor: '',
    building: '',
  });

  const roomTypes: TheatreRoomType[] = [
    'General',
    'Cardiac',
    'Neuro',
    'Orthopedic',
    'Obstetric',
    'Ophthalmic',
    'ENT',
    'Minor',
    'Emergency',
    'Hybrid',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Theatre Room
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Code *
                </label>
                <input
                  type="text"
                  value={formData.room_code}
                  onChange={(e) =>
                    setFormData({ ...formData, room_code: e.target.value })
                  }
                  required
                  placeholder="e.g., OR-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type *
                </label>
                <select
                  value={formData.room_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      room_type: e.target.value as TheatreRoomType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Name *
              </label>
              <input
                type="text"
                value={formData.room_name}
                onChange={(e) =>
                  setFormData({ ...formData, room_name: e.target.value })
                }
                required
                placeholder="e.g., Main Operating Room 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building
                </label>
                <input
                  type="text"
                  value={formData.building || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, building: e.target.value })
                  }
                  placeholder="e.g., Main Building"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <input
                  type="text"
                  value={formData.floor || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  placeholder="e.g., 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity Level
              </label>
              <select
                value={formData.capacity_level || ''}
                onChange={(e) =>
                  setFormData({ ...formData, capacity_level: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select capacity</option>
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Advanced">Advanced</option>
                <option value="Specialized">Specialized</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.room_code || !formData.room_name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Room Detail Modal
interface RoomDetailModalProps {
  room: TheatreRoom;
  onClose: () => void;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {room.room_code}
                </h3>
                <p className="text-sm text-gray-500">{room.room_name}</p>
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
          <div className="p-6 space-y-6">
            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Current Status
              </h4>
              <span
                className={`inline-flex px-3 py-1 text-sm rounded-full ${getTheatreRoomStatusColor(room.current_status)}`}
              >
                {room.current_status.replace('_', ' ')}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </h4>
                <p className="text-gray-900">{room.room_type}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Capacity Level
                </h4>
                <p className="text-gray-900">
                  {room.capacity_level || 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Building
                </h4>
                <p className="text-gray-900">
                  {room.building || 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Floor
                </h4>
                <p className="text-gray-900">{room.floor || 'Not specified'}</p>
              </div>
            </div>

            {/* Equipment */}
            {room.standard_equipment && room.standard_equipment.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Standard Equipment
                </h4>
                <div className="flex flex-wrap gap-2">
                  {room.standard_equipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {room.special_equipment && room.special_equipment.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Special Equipment
                </h4>
                <div className="flex flex-wrap gap-2">
                  {room.special_equipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Active:</span>
                <span
                  className={room.is_active ? 'text-green-600' : 'text-red-600'}
                >
                  {room.is_active ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Audit */}
            <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
              <p>Created: {new Date(room.created_at).toLocaleString()}</p>
              {room.updated_at !== room.created_at && (
                <p>Updated: {new Date(room.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
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

export default TheatreRoomsManagement;
