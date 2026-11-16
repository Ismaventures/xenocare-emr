import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Headphones,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
  MessageSquare,
  CalendarPlus,
  User,
  Phone,
  Stethoscope,
  RefreshCw,
  X,
  Eye,
  MoreHorizontal,
  ArrowUpRight,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Modal } from '../../components/ui/Modal';
import { useAppointments, useFeedback } from './hooks/useCustomerService';
import {
  AppointmentDTO,
  AppointmentStatus,
  CustomerFeedbackDTO,
  FeedbackStatus,
  FeedbackPriority,
} from './dtos/customer-service.dto';
import { FeedbackForm } from './components/FeedbackForm';
import { AppointmentForm } from './components/AppointmentForm';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

const EMPTY_FEEDBACK: CustomerFeedbackDTO[] = [];
const EMPTY_APPOINTMENTS: AppointmentDTO[] = [];

/* ── Status config maps ── */
const APPT_STATUS: Record<
  AppointmentStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  Scheduled: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Scheduled' },
  Confirmed: { dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Confirmed' },
  'Checked-in': { dot: 'bg-cyan-400', bg: 'bg-cyan-50', text: 'text-cyan-700', label: 'Checked-in' },
  'In Progress': { dot: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', label: 'In Progress' },
  Completed: { dot: 'bg-green-400', bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
  Cancelled: { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
  'No Show': { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: 'No Show' },
};

const FB_STATUS: Record<
  FeedbackStatus,
  { dot: string; bg: string; text: string }
> = {
  Open: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  'In Progress': { dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
  Resolved: { dot: 'bg-green-400', bg: 'bg-green-50', text: 'text-green-700' },
  Closed: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' },
  Escalated: { dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700' },
};

const FB_PRIORITY: Record<FeedbackPriority, { bg: string; text: string }> = {
  Low: { bg: 'bg-gray-50', text: 'text-gray-600' },
  Normal: { bg: 'bg-blue-50', text: 'text-blue-600' },
  High: { bg: 'bg-orange-50', text: 'text-orange-600' },
  Urgent: { bg: 'bg-red-50', text: 'text-red-600' },
};

const APPT_TYPE_ICON: Record<string, { bg: string; text: string }> = {
  Consultation: { bg: 'bg-blue-50', text: 'text-blue-600' },
  'Follow-up': { bg: 'bg-purple-50', text: 'text-purple-600' },
  Lab: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Radiology: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  Procedure: { bg: 'bg-orange-50', text: 'text-orange-600' },
};

function StatusPill({ status, map }: { status: string; map: Record<string, { dot: string; bg: string; text: string }> }) {
  const s = map[status] || { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function formatApptDate(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM dd, yyyy');
}

function formatApptTime(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getInitials(firstName?: string, surname?: string) {
  return `${(firstName || '')[0] || ''}${(surname || '')[0] || ''}`.toUpperCase() || '?';
}

export default function CustomerService() {
  const { isNightMode } = useTimeTheme();
  const [activeTab, setActiveTab] = useState<'appointments' | 'feedback'>('appointments');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  const feedbackQuery = useFeedback({
    query,
    status: activeTab === 'feedback' ? statusFilter : undefined,
  });

  const appointmentsQuery = useAppointments({
    query,
    status: activeTab === 'appointments' ? statusFilter : undefined,
  });

  const feedback = useMemo(() => feedbackQuery.data || EMPTY_FEEDBACK, [feedbackQuery.data]);
  const appointments = useMemo(() => appointmentsQuery.data || EMPTY_APPOINTMENTS, [appointmentsQuery.data]);

  // Filter appointments by date segment
  const filteredAppointments = useMemo(() => {
    if (dateFilter === 'all') return appointments;
    const today = new Date().toISOString().split('T')[0];
    switch (dateFilter) {
      case 'today':
        return appointments.filter((a) => a.appointment_date === today);
      case 'upcoming':
        return appointments.filter((a) => a.appointment_date > today);
      case 'past':
        return appointments.filter((a) => a.appointment_date < today);
      default:
        return appointments;
    }
  }, [appointments, dateFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      todayAppointments: appointments.filter((a) => a.appointment_date === today).length,
      scheduled: appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length,
      completed: appointments.filter((a) => a.status === 'Completed').length,
      cancelled: appointments.filter((a) => a.status === 'Cancelled' || a.status === 'No Show').length,
      openFeedback: feedback.filter((f) => f.status === 'Open').length,
      inProgressFeedback: feedback.filter((f) => f.status === 'In Progress').length,
    };
  }, [feedback, appointments]);

  const isFeedback = activeTab === 'feedback';
  const isLoading = isFeedback ? feedbackQuery.isLoading : appointmentsQuery.isLoading;
  const displayData = isFeedback ? feedback : filteredAppointments;

  const tabs = [
    {
      id: 'appointments' as const,
      label: 'Appointments',
      icon: CalendarCheck,
      count: appointments.length,
    },
    {
      id: 'feedback' as const,
      label: 'Feedback',
      icon: MessageSquare,
      count: feedback.length,
    },
  ];

  const statsCards = [
    { label: "Today's Appts", value: stats.todayAppointments, icon: Calendar, lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Scheduled', value: stats.scheduled, icon: Clock, lightColor: 'bg-amber-50', textColor: 'text-amber-700' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, lightColor: 'bg-green-50', textColor: 'text-green-700' },
    { label: 'Cancelled / No Show', value: stats.cancelled, icon: XCircle, lightColor: 'bg-red-50', textColor: 'text-red-700' },
    { label: 'Open Feedback', value: stats.openFeedback, icon: AlertCircle, lightColor: 'bg-orange-50', textColor: 'text-orange-700' },
    { label: 'In Progress', value: stats.inProgressFeedback, icon: ArrowUpRight, lightColor: 'bg-purple-50', textColor: 'text-purple-700' },
  ];

  const appointmentStatusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Checked-in', label: 'Checked-in' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'No Show', label: 'No Show' },
  ];

  const feedbackStatusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Escalated', label: 'Escalated' },
  ];

  const statusOptions = isFeedback ? feedbackStatusOptions : appointmentStatusOptions;
  const dateSegments = [
    { id: 'all' as const, label: 'All' },
    { id: 'today' as const, label: 'Today' },
    { id: 'upcoming' as const, label: 'Upcoming' },
    { id: 'past' as const, label: 'Past' },
  ];

  return (
    <div className={`min-h-screen p-6 ${isNightMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isNightMode ? 'bg-slate-800' : 'bg-white'} border border-gray-100 shadow-sm`}>
            <Headphones className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className={`text-lg font-semibold ${isNightMode ? 'text-white' : 'text-gray-900'}`}>
              Customer Service
            </h1>
            <p className="text-xs text-gray-400">
              Appointments, feedback &amp; patient communications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFeedback ? (
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Feedback
            </button>
          ) : (
            <button
              onClick={() => setShowAppointmentForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary-800 transition-colors"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-3.5 transition-all hover:shadow-sm ${
              isNightMode ? 'border-slate-700 bg-slate-800/80' : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.lightColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.textColor}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</div>
                <div className="text-[11px] font-medium text-gray-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100/80 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setStatusFilter(''); setDateFilter('all'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === tab.id ? 'bg-primary-700/10 text-primary-700' : 'bg-gray-200/80 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isFeedback ? 'Search feedback by subject...' : 'Search by patient name, department, or reason...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date segments (appointments only) */}
        {!isFeedback && (
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
            {dateSegments.map((seg) => (
              <button
                key={seg.id}
                onClick={() => setDateFilter(seg.id)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  dateFilter === seg.id
                    ? 'bg-primary-700 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={() => isFeedback ? feedbackQuery.refetch() : appointmentsQuery.refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* Active filter chips */}
        {(statusFilter || dateFilter !== 'all' || query) && (
          <div className="flex items-center gap-1.5 ml-1">
            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-700/10 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {statusFilter}
                <button onClick={() => setStatusFilter('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {dateFilter !== 'all' && !isFeedback && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                {dateFilter}
                <button onClick={() => setDateFilter('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <SkeletonTable rows={6} columns={5} />
        </div>
      ) : displayData.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            {isFeedback ? <MessageSquare className="h-5 w-5 text-gray-400" /> : <CalendarCheck className="h-5 w-5 text-gray-400" />}
          </div>
          <p className="text-sm font-medium text-gray-900">
            {isFeedback ? 'No feedback found' : 'No appointments found'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {query || statusFilter ? 'Try adjusting your search or filters' : isFeedback ? 'Click "New Feedback" to submit one' : 'Click "Book Appointment" to schedule one'}
          </p>
        </div>
      ) : !isFeedback ? (
        /* ── Appointments List ── */
        <div className="space-y-2">
          {(filteredAppointments as AppointmentDTO[]).map((appt) => {
            const dateLabel = formatApptDate(appt.appointment_date);
            const timeLabel = formatApptTime(appt.appointment_time);
            const isDatePast = isPast(parseISO(appt.appointment_date)) && !isToday(parseISO(appt.appointment_date));
            const statusCfg = APPT_STATUS[appt.status] || APPT_STATUS.Scheduled;
            const typeCfg = APPT_TYPE_ICON[appt.appointment_type] || { bg: 'bg-gray-50', text: 'text-gray-600' };

            return (
              <div
                key={appt.appointment_id}
                className={`group rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:border-gray-200 ${
                  isDatePast && appt.status !== 'Completed' ? 'border-gray-100 opacity-75' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Patient avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700/10 text-sm font-bold text-primary-700 flex-shrink-0">
                    {getInitials(appt.patient?.first_name, appt.patient?.surname)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {appt.patient?.first_name} {appt.patient?.surname}
                      </span>
                      <StatusPill status={appt.status} map={APPT_STATUS} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeLabel}
                      </span>
                      {appt.duration_minutes && (
                        <span>{appt.duration_minutes} min</span>
                      )}
                      {appt.doctor && (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          Dr. {appt.doctor.first_name} {appt.doctor.last_name}
                        </span>
                      )}
                      {appt.department && (
                        <span className="text-gray-400">• {appt.department}</span>
                      )}
                    </div>
                  </div>

                  {/* Type badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ${typeCfg.bg} ${typeCfg.text}`}>
                    {appt.appointment_type}
                  </span>

                  {/* Reason preview */}
                  {appt.reason && (
                    <span className="hidden lg:block max-w-[180px] truncate text-[11px] text-gray-400 italic">
                      &ldquo;{appt.reason}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Result count footer */}
          <div className="mt-3 text-center">
            <span className="text-[11px] text-gray-400">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </span>
          </div>
        </div>
      ) : (
        /* ── Feedback List ── */
        <div className="space-y-2">
          {(feedback as CustomerFeedbackDTO[]).map((fb) => {
            const fbStatusCfg = FB_STATUS[fb.status] || FB_STATUS.Open;
            const priorityCfg = FB_PRIORITY[fb.priority] || FB_PRIORITY.Normal;
            const createdDate = format(parseISO(fb.created_at), 'MMM dd, yyyy');

            return (
              <div
                key={fb.feedback_id}
                className="group rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md hover:border-gray-200"
              >
                <div className="flex items-center gap-4">
                  {/* Type icon */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                    fb.feedback_type === 'Complaint' ? 'bg-red-50 text-red-500'
                    : fb.feedback_type === 'Compliment' ? 'bg-green-50 text-green-500'
                    : fb.feedback_type === 'Suggestion' ? 'bg-blue-50 text-blue-500'
                    : 'bg-gray-50 text-gray-500'
                  }`}>
                    <MessageSquare className="h-4 w-4" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{fb.subject}</span>
                      <StatusPill status={fb.status} map={FB_STATUS} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      <span>{createdDate}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityCfg.bg} ${priorityCfg.text}`}>
                        {fb.priority}
                      </span>
                      <span className="text-gray-400">• {fb.feedback_type}</span>
                      {fb.contact_name && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {fb.contact_name}
                        </span>
                      )}
                      {fb.contact_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {fb.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient name */}
                  {fb.patient && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <User className="h-3 w-3" />
                      {fb.patient.first_name} {fb.patient.surname}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Result count footer */}
          <div className="mt-3 text-center">
            <span className="text-[11px] text-gray-400">
              Showing {feedback.length} feedback entries
            </span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showFeedbackForm && (
        <Modal
          isOpen={showFeedbackForm}
          onClose={() => setShowFeedbackForm(false)}
          title="Submit Feedback"
          size="lg"
        >
          <FeedbackForm
            onCancel={() => setShowFeedbackForm(false)}
            onSuccess={() => setShowFeedbackForm(false)}
          />
        </Modal>
      )}

      {showAppointmentForm && (
        <Modal
          isOpen={showAppointmentForm}
          onClose={() => setShowAppointmentForm(false)}
          title="Book Appointment"
          size="lg"
        >
          <AppointmentForm
            onCancel={() => setShowAppointmentForm(false)}
            onSuccess={() => setShowAppointmentForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
