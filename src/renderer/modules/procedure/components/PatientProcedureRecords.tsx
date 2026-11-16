// =============================================================================
// NDC MEDICAL CENTRE EMR - Patient Procedure Records Component
// Complete view of all procedures for a patient with notes, findings, timeline
// Standard EMR practice: comprehensive patient procedure history
// =============================================================================

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  FileText,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Syringe,
  ClipboardList,
  Eye,
  Printer,
  Package,
  DollarSign,
  Droplets,
  Users,
  ScrollText,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  LayoutList,
  CircleDot,
  Clipboard,
} from 'lucide-react';
import type { ProcedureHistoryItem } from '../api/procedures.api';
import { useProcedureHistory } from '../hooks/useProcedures';
import { getPatientById } from '../../patient-registration/api/patient.api';
import type { PatientDTO } from '../../patient-registration/dtos/patient.dto';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';

interface PatientProcedureRecordsProps {
  patientId: string;
  patientName: string;
  emrNumber: string;
  onClose: () => void;
  onViewProcedure: (procedureId: string) => void;
}

interface ProcedureStats {
  total: number;
  completed: number;
  cancelled: number;
  inProgress: number;
  scheduled: number;
  complications: number;
}

type ViewMode = 'cards' | 'timeline';

// Helper to calculate age
const calculateAge = (dob: string | null | undefined): string => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${days}d`;
  }
  if (years === 0) {
    const parts = [`${months}m`];
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  }
  const parts = [`${years}y`];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(' ');
};

const statusConfig: Record<
  string,
  { color: string; bgColor: string; icon: React.ReactNode; label: string }
> = {
  scheduled: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <Calendar className="h-4 w-4" />,
    label: 'Scheduled',
  },
  pre_op: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: <Clock className="h-4 w-4" />,
    label: 'Pre-Op',
  },
  in_progress: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: <Activity className="h-4 w-4" />,
    label: 'In Progress',
  },
  completed: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Completed',
  },
  cancelled: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Cancelled',
  },
  postponed: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: <Clock className="h-4 w-4" />,
    label: 'Postponed',
  },
  complications: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Complications',
  },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  emergency: {
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Emergency',
  },
  urgent: {
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    label: 'Urgent',
  },
  routine: {
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    label: 'Routine',
  },
  elective: {
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Elective',
  },
};

const PatientProcedureRecords: React.FC<PatientProcedureRecordsProps> = ({
  patientId,
  patientName,
  emrNumber,
  onClose,
  onViewProcedure,
}) => {
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch patient details
  const { data: patientDetails, isLoading: loadingPatient } =
    useQuery<PatientDTO>({
      queryKey: ['patient', patientId],
      queryFn: () => getPatientById(patientId),
      enabled: !!patientId,
    });

  // Fetch all procedures for this patient
  const { data: historyData, isLoading } = useProcedureHistory(
    { patientId },
    1,
    100, // Get all procedures for patient
  );

  const procedures: ProcedureHistoryItem[] =
    (historyData as { data: ProcedureHistoryItem[]; total: number } | undefined)
      ?.data || [];

  // Calculate statistics
  const stats: ProcedureStats = procedures.reduce(
    (acc, proc) => {
      acc.total++;
      if (proc.status === 'completed') acc.completed++;
      else if (proc.status === 'cancelled') acc.cancelled++;
      else if (proc.status === 'in_progress') acc.inProgress++;
      else if (proc.status === 'scheduled') acc.scheduled++;
      if (proc.complications) acc.complications++;
      return acc;
    },
    {
      total: 0,
      completed: 0,
      cancelled: 0,
      inProgress: 0,
      scheduled: 0,
      complications: 0,
    },
  );

  // Filter procedures
  const filteredProcedures = procedures.filter((proc) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'complications') return !!proc.complications;
    return proc.status === activeFilter;
  });

  // Sort by date descending (most recent first)
  const sortedProcedures = [...filteredProcedures].sort((a, b) => {
    const dateA = new Date(a.scheduled_date || a.created_at).getTime();
    const dateB = new Date(b.scheduled_date || b.created_at).getTime();
    return dateB - dateA;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const toggleExpand = (procedureId: string) => {
    setExpandedProcedure(
      expandedProcedure === procedureId ? null : procedureId,
    );
  };

  // Handle print
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Procedure Records - ${patientName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .patient-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
              .procedure { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
              .procedure-header { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
              .label { color: #666; font-size: 12px; }
              .value { font-weight: 500; }
              @media print { body { -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>NDC Medical Centre - Procedure Records</h1>
              <p>Patient: ${patientName} | EMR: ${emrNumber}</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header with Patient Demographics */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{patientName}</h2>
                <div className="flex items-center gap-3 text-blue-100 text-sm">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    EMR: {emrNumber}
                  </span>
                  {patientDetails?.gender && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {patientDetails.gender}
                    </span>
                  )}
                  {patientDetails?.date_of_birth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {calculateAge(patientDetails.date_of_birth)}
                    </span>
                  )}
                  {patientDetails?.blood_group && (
                    <span className="flex items-center gap-1 bg-red-500/30 px-2 py-0.5 rounded">
                      <Droplets className="h-3.5 w-3.5" />
                      {patientDetails.blood_group}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Print Records"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Extended Patient Info Bar */}
          {patientDetails && (
            <div className="flex items-center gap-4 text-xs text-blue-100 bg-white/10 rounded-lg px-3 py-2 mt-2 flex-wrap">
              {patientDetails.contact_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {patientDetails.contact_phone}
                </span>
              )}
              {patientDetails.residential_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {patientDetails.residential_address.substring(0, 40)}
                  {patientDetails.residential_address.length > 40 ? '...' : ''}
                </span>
              )}
              {patientDetails.staff_category && (
                <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
                  <Shield className="h-3 w-3" />
                  {patientDetails.staff_category}
                </span>
              )}
              {patientDetails.service_number && (
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  SN: {patientDetails.service_number}
                </span>
              )}
              {patientDetails.nhis_number && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  NHIS: {patientDetails.nhis_number}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Statistics and View Toggle */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Procedure Summary
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <LayoutList className="h-4 w-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <CircleDot className="h-4 w-4" />
                Timeline
              </button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <button
              onClick={() => setActiveFilter('all')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'all'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'completed'
                  ? 'bg-green-100 ring-2 ring-green-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'in_progress'
                  ? 'bg-amber-100 ring-2 ring-amber-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-amber-600">
                {stats.inProgress}
              </p>
              <p className="text-xs text-gray-500">In Progress</p>
            </button>
            <button
              onClick={() => setActiveFilter('scheduled')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'scheduled'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-blue-600">
                {stats.scheduled}
              </p>
              <p className="text-xs text-gray-500">Scheduled</p>
            </button>
            <button
              onClick={() => setActiveFilter('cancelled')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'cancelled'
                  ? 'bg-gray-200 ring-2 ring-gray-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-gray-600">
                {stats.cancelled}
              </p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </button>
            <button
              onClick={() => setActiveFilter('complications')}
              className={`p-3 rounded-lg text-center transition-all ${
                activeFilter === 'complications'
                  ? 'bg-red-100 ring-2 ring-red-500'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <p className="text-2xl font-bold text-red-600">
                {stats.complications}
              </p>
              <p className="text-xs text-gray-500">Complications</p>
            </button>
          </div>
        </div>

        {/* Procedures List */}
        <div className="flex-1 overflow-auto p-6" ref={printRef}>
          {isLoading || loadingPatient ? (
            <SkeletonTable rows={5} columns={3} />
          ) : sortedProcedures.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No procedures found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeFilter !== 'all'
                  ? 'Try selecting a different filter'
                  : 'No procedure records for this patient'}
              </p>
            </div>
          ) : viewMode === 'timeline' ? (
            /* Timeline View */
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
              {sortedProcedures.map((procedure, index) => {
                const status =
                  statusConfig[procedure.status] || statusConfig.scheduled;
                const priority =
                  priorityConfig[procedure.priority] || priorityConfig.routine;

                return (
                  <div key={procedure.id} className="relative pl-12 pb-8">
                    {/* Timeline Dot */}
                    <div
                      className={`absolute left-4 w-5 h-5 rounded-full border-2 border-white shadow ${status.bgColor} flex items-center justify-center`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          procedure.status === 'completed'
                            ? 'bg-green-600'
                            : procedure.status === 'cancelled'
                              ? 'bg-gray-500'
                              : procedure.status === 'in_progress'
                                ? 'bg-amber-600'
                                : 'bg-blue-600'
                        }`}
                      />
                    </div>

                    {/* Timeline Card */}
                    <div
                      className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                        procedure.complications
                          ? 'border-l-4 border-l-red-500'
                          : ''
                      }`}
                      onClick={() => onViewProcedure(procedure.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {procedure.procedure_number}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                            >
                              {status.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${priority.color}`}
                            >
                              {priority.label}
                            </span>
                          </div>
                          <p className="font-medium text-gray-800">
                            {procedure.procedure_name}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium text-gray-900">
                            {formatDate(
                              procedure.scheduled_date || procedure.created_at,
                            )}
                          </p>
                          <p className="text-gray-500">
                            {formatTime(
                              procedure.actual_start_time ||
                                procedure.scheduled_date,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
                        {procedure.surgeon_name && (
                          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                            <Stethoscope className="h-3 w-3" />
                            {procedure.surgeon_name}
                          </span>
                        )}
                        {procedure.location && (
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <MapPin className="h-3 w-3" />
                            {procedure.location}
                          </span>
                        )}
                        {procedure.actual_duration_minutes && (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            {formatDuration(procedure.actual_duration_minutes)}
                          </span>
                        )}
                        {procedure.anesthesia_type && (
                          <span className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-1 rounded">
                            <Syringe className="h-3 w-3" />
                            {procedure.anesthesia_type}
                          </span>
                        )}
                        {procedure.complications && (
                          <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded">
                            <AlertTriangle className="h-3 w-3" />
                            Complications
                          </span>
                        )}
                      </div>

                      {/* Brief findings/notes preview */}
                      {(procedure.findings || procedure.procedure_notes) && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {procedure.findings || procedure.procedure_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-4">
              {sortedProcedures.map((procedure) => {
                const status =
                  statusConfig[procedure.status] || statusConfig.scheduled;
                const priority =
                  priorityConfig[procedure.priority] || priorityConfig.routine;
                const isExpanded = expandedProcedure === procedure.id;

                // Parse pre_op_checklist if it exists
                const preOpChecklist = procedure.pre_op_checklist
                  ? typeof procedure.pre_op_checklist === 'string'
                    ? JSON.parse(procedure.pre_op_checklist)
                    : procedure.pre_op_checklist
                  : null;

                return (
                  <div
                    key={procedure.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all ${
                      isExpanded
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'shadow-sm hover:shadow-md'
                    } ${procedure.complications ? 'border-l-4 border-l-red-500' : ''}`}
                  >
                    {/* Procedure Header */}
                    <div
                      className="px-5 py-4 cursor-pointer"
                      onClick={() => toggleExpand(procedure.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${status.bgColor}`}>
                            {status.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {procedure.procedure_number}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                              >
                                {status.label}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${priority.color}`}
                              >
                                {priority.label}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">
                              {procedure.procedure_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(
                                procedure.scheduled_date ||
                                  procedure.created_at,
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(
                                procedure.actual_start_time ||
                                  procedure.scheduled_date,
                              )}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Quick Info Row */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                        {procedure.surgeon_name && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" />
                            {procedure.surgeon_name}
                            {procedure.surgeon_specialty && (
                              <span className="text-xs text-gray-400">
                                ({procedure.surgeon_specialty})
                              </span>
                            )}
                          </span>
                        )}
                        {procedure.location && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5" />
                            {procedure.location}
                            {procedure.room_number &&
                              ` - ${procedure.room_number}`}
                          </span>
                        )}
                        {procedure.actual_duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Duration:{' '}
                            {formatDuration(procedure.actual_duration_minutes)}
                          </span>
                        )}
                        {procedure.anesthesia_type && (
                          <span className="flex items-center gap-1">
                            <Syringe className="h-3.5 w-3.5" />
                            {procedure.anesthesia_type}
                          </span>
                        )}
                        {(procedure.consumables_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {procedure.consumables_count} items
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 px-5 py-4">
                        {/* Surgical Team Section */}
                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            Surgical Team
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-indigo-600">
                                Primary Surgeon
                              </p>
                              <p className="font-medium text-indigo-900">
                                {procedure.surgeon_name || 'Not assigned'}
                                {procedure.surgeon_specialty && (
                                  <span className="text-sm text-indigo-600 ml-2">
                                    ({procedure.surgeon_specialty})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-indigo-600">
                                Anesthesiologist
                              </p>
                              <p className="font-medium text-indigo-900">
                                {procedure.anesthesiologist_name ||
                                  'Not assigned'}
                              </p>
                            </div>
                            {procedure.assistant_surgeons &&
                              procedure.assistant_surgeons.length > 0 && (
                                <div>
                                  <p className="text-xs text-indigo-600">
                                    Participating Staff
                                  </p>
                                  <div className="space-y-1">
                                    {procedure.assistant_surgeons.map(
                                      (asst, idx) => (
                                        <p
                                          key={idx}
                                          className="text-sm text-indigo-900"
                                        >
                                          {asst.name}{' '}
                                          <span className="text-indigo-500">
                                            - {asst.role}
                                          </span>
                                        </p>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Pre-Operative Checklist Section */}
                        {(preOpChecklist?.pre_op_instructions ||
                          preOpChecklist?.special_equipment ||
                          procedure.scheduling_notes) && (
                          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                              <Clipboard className="h-3.5 w-3.5" />
                              Pre-Operative Requirements
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              {preOpChecklist?.pre_op_instructions && (
                                <div>
                                  <p className="text-xs text-orange-600">
                                    Pre-Op Instructions
                                  </p>
                                  <p className="text-sm text-orange-900 whitespace-pre-wrap">
                                    {preOpChecklist.pre_op_instructions}
                                  </p>
                                </div>
                              )}
                              {preOpChecklist?.special_equipment && (
                                <div>
                                  <p className="text-xs text-orange-600">
                                    Special Equipment
                                  </p>
                                  <p className="text-sm text-orange-900 whitespace-pre-wrap">
                                    {preOpChecklist.special_equipment}
                                  </p>
                                </div>
                              )}
                              {procedure.scheduling_notes && (
                                <div className="col-span-2">
                                  <p className="text-xs text-orange-600">
                                    Scheduling Notes
                                  </p>
                                  <p className="text-sm text-orange-900 whitespace-pre-wrap">
                                    {procedure.scheduling_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                          {/* Left Column - Clinical Information */}
                          <div className="space-y-4">
                            {/* Indication */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Indication
                              </h4>
                              <p className="text-gray-900">
                                {procedure.indication || 'Not documented'}
                              </p>
                            </div>

                            {/* Pre-Procedure Diagnosis */}
                            {procedure.pre_procedure_diagnosis && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                  Pre-Procedure Diagnosis
                                </h4>
                                <p className="text-gray-900">
                                  {procedure.pre_procedure_diagnosis}
                                </p>
                              </div>
                            )}

                            {/* Post-Procedure Diagnosis */}
                            {procedure.post_procedure_diagnosis && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                  Post-Procedure Diagnosis
                                </h4>
                                <p className="text-gray-900">
                                  {procedure.post_procedure_diagnosis}
                                </p>
                              </div>
                            )}

                            {/* Findings */}
                            {procedure.findings && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  Findings
                                </h4>
                                <p className="text-purple-900 whitespace-pre-wrap">
                                  {procedure.findings}
                                </p>
                              </div>
                            )}

                            {/* Technique Description */}
                            {procedure.technique_description && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <ScrollText className="h-3.5 w-3.5" />
                                  Technique Description
                                </h4>
                                <p className="text-blue-900 whitespace-pre-wrap">
                                  {procedure.technique_description}
                                </p>
                              </div>
                            )}

                            {/* Procedure Notes */}
                            {procedure.procedure_notes && (
                              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5" />
                                  Procedure Notes
                                </h4>
                                <p className="text-gray-900 whitespace-pre-wrap">
                                  {procedure.procedure_notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Right Column - Timing, Complications, Consumables */}
                          <div className="space-y-4">
                            {/* Timing Details */}
                            <div className="bg-white border rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Timing Details
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500">Scheduled</p>
                                  <p className="font-medium">
                                    {formatDate(procedure.scheduled_date)}{' '}
                                    {formatTime(procedure.scheduled_date)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Started</p>
                                  <p className="font-medium">
                                    {procedure.actual_start_time
                                      ? `${formatDate(procedure.actual_start_time)} ${formatTime(procedure.actual_start_time)}`
                                      : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Ended</p>
                                  <p className="font-medium">
                                    {procedure.actual_end_time
                                      ? `${formatDate(procedure.actual_end_time)} ${formatTime(procedure.actual_end_time)}`
                                      : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Duration</p>
                                  <p className="font-medium">
                                    {formatDuration(
                                      procedure.actual_duration_minutes,
                                    )}
                                    {procedure.scheduled_duration_minutes && (
                                      <span className="text-gray-400 text-xs ml-1">
                                        (Est:{' '}
                                        {formatDuration(
                                          procedure.scheduled_duration_minutes,
                                        )}
                                        )
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Anesthesia */}
                            {(procedure.anesthesia_type ||
                              procedure.anesthesia_notes) && (
                              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Syringe className="h-3.5 w-3.5" />
                                  Anesthesia
                                </h4>
                                <p className="text-teal-900 font-medium">
                                  {procedure.anesthesia_type}
                                </p>
                                {procedure.anesthesia_notes && (
                                  <p className="text-teal-800 text-sm mt-1">
                                    {procedure.anesthesia_notes}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Blood Loss */}
                            {procedure.estimated_blood_loss_ml && (
                              <div
                                className={`border rounded-lg p-3 ${
                                  procedure.estimated_blood_loss_ml > 500
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-rose-50 border-rose-200'
                                }`}
                              >
                                <h4
                                  className={`text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 ${
                                    procedure.estimated_blood_loss_ml > 500
                                      ? 'text-red-700'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  <Droplets className="h-3.5 w-3.5" />
                                  Estimated Blood Loss
                                </h4>
                                <p
                                  className={`text-lg font-bold ${
                                    procedure.estimated_blood_loss_ml > 500
                                      ? 'text-red-900'
                                      : 'text-rose-900'
                                  }`}
                                >
                                  {procedure.estimated_blood_loss_ml} mL
                                  {procedure.estimated_blood_loss_ml > 500 && (
                                    <span className="text-xs font-normal ml-2">
                                      (Significant)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Complications */}
                            {procedure.complications && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Complications
                                </h4>
                                <p className="text-red-900 whitespace-pre-wrap">
                                  {procedure.complications}
                                </p>
                              </div>
                            )}

                            {/* Consumables Summary */}
                            {(procedure.consumables_count ?? 0) > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Package className="h-3.5 w-3.5" />
                                  Consumables Used
                                </h4>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-2xl font-bold text-amber-900">
                                      {procedure.consumables_count}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                      items used
                                    </p>
                                  </div>
                                  {(procedure.consumables_total_cost ?? 0) >
                                    0 && (
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-amber-900 flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        {procedure.consumables_total_cost?.toLocaleString()}
                                      </p>
                                      <p className="text-xs text-amber-600">
                                        total cost
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Post-Op Instructions */}
                            {procedure.post_op_instructions && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  Post-Op Instructions
                                </h4>
                                <p className="text-green-900 whitespace-pre-wrap">
                                  {procedure.post_op_instructions}
                                </p>
                              </div>
                            )}

                            {/* Documentation Status */}
                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                Documentation Status
                              </h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    procedure.procedure_notes
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {procedure.procedure_notes
                                    ? '✓ Notes'
                                    : '○ Notes'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    procedure.findings
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {procedure.findings
                                    ? '✓ Findings'
                                    : '○ Findings'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    procedure.technique_description
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {procedure.technique_description
                                    ? '✓ Technique'
                                    : '○ Technique'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    procedure.post_procedure_diagnosis
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {procedure.post_procedure_diagnosis
                                    ? '✓ Post-Op Dx'
                                    : '○ Post-Op Dx'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    procedure.complications
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {procedure.complications
                                    ? '⚠ Complications'
                                    : '○ No Complications'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-xs text-gray-400">
                            Created: {formatDate(procedure.created_at)}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewProcedure(procedure.id);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View Full Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {sortedProcedures.length} of {stats.total} procedures
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProcedureRecords;
