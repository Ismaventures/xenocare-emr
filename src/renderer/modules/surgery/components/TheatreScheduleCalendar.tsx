/**
 * Theatre Schedule Calendar Component
 * Visual schedule board for theatre/OR bookings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useTheatreRooms, useTheatreSchedules } from '../hooks/useSurgery';
import {
  TheatreRoom,
  TheatreScheduleWithDetails,
  getPriorityColor,
} from '../types/surgery.types';

interface TheatreScheduleCalendarProps {
  facilityId?: string;
}

const TheatreScheduleCalendar: React.FC<TheatreScheduleCalendarProps> = () => {
  const navigate = useNavigate();
  const { listTheatreRooms, loading: roomsLoading } = useTheatreRooms();
  const { listSchedules, loading: schedulesLoading } = useTheatreSchedules();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [theatreRooms, setTheatreRooms] = useState<TheatreRoom[]>([]);
  const [schedules, setSchedules] = useState<TheatreScheduleWithDetails[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const loadData = async () => {
    const [rooms, scheduleData] = await Promise.all([
      listTheatreRooms(true),
      loadSchedules(),
    ]);

    setTheatreRooms(rooms);
    setSchedules(scheduleData);
  };

  const loadSchedules = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];

    if (viewMode === 'day') {
      return await listSchedules({
        date_from: dateStr,
        date_to: dateStr,
      });
    }
    // Week view - get 7 days
    const weekEnd = new Date(selectedDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return await listSchedules({
      date_from: dateStr,
      date_to: weekEnd.toISOString().split('T')[0],
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Generate time slots (7 AM to 7 PM in 30-min increments)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 7; hour <= 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Group schedules by room
  const schedulesByRoom = useMemo(() => {
    const grouped = new Map<string, TheatreScheduleWithDetails[]>();

    theatreRooms.forEach((room) => {
      grouped.set(room.id, []);
    });

    schedules.forEach((schedule) => {
      const roomSchedules = grouped.get(schedule.theatre_room_id) || [];
      roomSchedules.push(schedule);
      grouped.set(schedule.theatre_room_id, roomSchedules);
    });

    return grouped;
  }, [theatreRooms, schedules]);

  const loading = roomsLoading || schedulesLoading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/surgery')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Theatre Schedule
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
              <span className="ml-2 text-lg font-medium text-gray-900">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  viewMode === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  viewMode === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Week
              </button>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`}
              />
            </button>

            <Link
              to="/surgery/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Book Surgery
            </Link>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'day' ? (
          <DayView
            theatreRooms={theatreRooms}
            schedulesByRoom={schedulesByRoom}
            timeSlots={timeSlots}
            selectedDate={selectedDate}
            onSurgeryClick={(surgeryId) => navigate(`/surgery/${surgeryId}`)}
          />
        ) : (
          <WeekView
            theatreRooms={theatreRooms}
            schedules={schedules}
            startDate={selectedDate}
            onSurgeryClick={(surgeryId) => navigate(`/surgery/${surgeryId}`)}
          />
        )}
      </div>
    </div>
  );
};

// Day View Component
interface DayViewProps {
  theatreRooms: TheatreRoom[];
  schedulesByRoom: Map<string, TheatreScheduleWithDetails[]>;
  timeSlots: string[];
  selectedDate: Date;
  onSurgeryClick: (surgeryId: string) => void;
}

const DayView: React.FC<DayViewProps> = ({
  theatreRooms,
  schedulesByRoom,
  timeSlots,
  selectedDate,
  onSurgeryClick,
}) => {
  // Calculate position and height for a schedule block
  const getScheduleStyle = (schedule: TheatreScheduleWithDetails) => {
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const startSlot = (startMinutes - 7 * 60) / 30; // 7 AM is slot 0
    const duration = (endMinutes - startMinutes) / 30;

    return {
      top: `${startSlot * 40}px`, // 40px per slot
      height: `${duration * 40}px`,
    };
  };

  return (
    <div className="min-w-full">
      <div className="flex">
        {/* Time Column */}
        <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200">
          <div className="h-12 border-b border-gray-200" />
          {timeSlots.map((time, index) => (
            <div
              key={time}
              className="h-10 flex items-center justify-end pr-2 text-xs text-gray-500"
            >
              {index % 2 === 0 ? time : ''}
            </div>
          ))}
        </div>

        {/* Room Columns */}
        <div className="flex flex-1">
          {theatreRooms.map((room) => {
            const roomSchedules = schedulesByRoom.get(room.id) || [];

            return (
              <div
                key={room.id}
                className="flex-1 min-w-[200px] border-r border-gray-200 last:border-r-0"
              >
                {/* Room Header */}
                <div className="h-12 bg-gray-50 border-b border-gray-200 px-2 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {room.room_code}
                    </p>
                    <p className="text-xs text-gray-500">{room.room_type}</p>
                  </div>
                </div>

                {/* Schedule Slots */}
                <div className="relative">
                  {/* Grid Lines */}
                  {timeSlots.map((time, index) => (
                    <div
                      key={time}
                      className={`h-10 border-b ${
                        index % 2 === 0 ? 'border-gray-200' : 'border-gray-100'
                      }`}
                    />
                  ))}

                  {/* Schedule Blocks */}
                  {roomSchedules.map((schedule) => (
                    <ScheduleBlock
                      key={schedule.id}
                      schedule={schedule}
                      style={getScheduleStyle(schedule)}
                      onClick={() => onSurgeryClick(schedule.surgery_id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Week View Component
interface WeekViewProps {
  theatreRooms: TheatreRoom[];
  schedules: TheatreScheduleWithDetails[];
  startDate: Date;
  onSurgeryClick: (surgeryId: string) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  theatreRooms,
  schedules,
  startDate,
  onSurgeryClick,
}) => {
  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startDate]);

  // Group schedules by day and room
  const schedulesByDayRoom = useMemo(() => {
    const grouped = new Map<string, TheatreScheduleWithDetails[]>();

    schedules.forEach((schedule) => {
      const key = `${schedule.scheduled_date}-${schedule.theatre_room_id}`;
      const existing = grouped.get(key) || [];
      existing.push(schedule);
      grouped.set(key, existing);
    });

    return grouped;
  }, [schedules]);

  return (
    <div className="min-w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-24 bg-gray-50 border border-gray-200 p-2 text-left text-xs font-medium text-gray-500">
              Room
            </th>
            {weekDays.map((day) => (
              <th
                key={day.toISOString()}
                className="bg-gray-50 border border-gray-200 p-2 text-center"
              >
                <p className="text-xs text-gray-500">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {day.getDate()}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {theatreRooms.map((room) => (
            <tr key={room.id}>
              <td className="border border-gray-200 p-2 bg-gray-50">
                <p className="text-sm font-medium text-gray-900">
                  {room.room_code}
                </p>
                <p className="text-xs text-gray-500">{room.room_type}</p>
              </td>
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayRoomSchedules =
                  schedulesByDayRoom.get(`${dateStr}-${room.id}`) || [];

                return (
                  <td
                    key={day.toISOString()}
                    className="border border-gray-200 p-1 align-top min-h-[100px] bg-white"
                  >
                    <div className="space-y-1">
                      {dayRoomSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          onClick={() => onSurgeryClick(schedule.surgery_id)}
                          className="p-1.5 bg-blue-50 border border-blue-200 rounded text-xs cursor-pointer hover:bg-blue-100"
                        >
                          <p className="font-medium text-blue-900 truncate">
                            {schedule.start_time.substring(0, 5)}
                          </p>
                          <p className="text-blue-700 truncate">
                            {schedule.patient_name}
                          </p>
                          <p className="text-blue-600 truncate">
                            {schedule.primary_procedure}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Schedule Block Component
interface ScheduleBlockProps {
  schedule: TheatreScheduleWithDetails;
  style: React.CSSProperties;
  onClick: () => void;
}

const ScheduleBlock: React.FC<ScheduleBlockProps> = ({
  schedule,
  style,
  onClick,
}) => {
  const getStatusColor = () => {
    switch (schedule.schedule_status) {
      case 'Completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'In_Progress':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'Cancelled':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      case 'Delayed':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={`absolute left-1 right-1 rounded border p-1.5 overflow-hidden cursor-pointer hover:opacity-90 ${getStatusColor()}`}
    >
      <p className="text-xs font-medium truncate">
        {schedule.start_time.substring(0, 5)} -{' '}
        {schedule.end_time.substring(0, 5)}
      </p>
      <p className="text-xs font-semibold truncate">{schedule.patient_name}</p>
      <p className="text-xs truncate">{schedule.primary_procedure}</p>
      <p className="text-xs truncate opacity-75">{schedule.surgeon_name}</p>
    </div>
  );
};

// Helper function to convert time string to minutes
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default TheatreScheduleCalendar;
