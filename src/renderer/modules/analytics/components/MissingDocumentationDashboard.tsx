// =============================================================================
// NDC MEDICAL CENTRE EMR - Missing Documentation Dashboard
// Track incomplete records, unsigned notes, and documentation compliance
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileX,
  FileWarning,
  FileCheck,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Card, StatsCard, DataTable } from '../../../components/ui';
import { Bar3DChart, Pie3DChart, chartColors } from './AdvancedCharts';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

interface MissingDocRecord {
  id: string;
  patient_name: string;
  encounter_date: string;
  doctor_name: string;
  department: string;
  missing_items: string[];
  days_overdue: number;
  status: 'critical' | 'warning' | 'pending';
  encounter_id: string;
}

interface DocumentationSummary {
  total_encounters: number;
  complete: number;
  incomplete: number;
  unsigned: number;
  critical_count: number;
  warning_count: number;
  compliance_rate: number;
  avg_completion_time: number;
}

interface DoctorDocStats {
  doctor_id: string;
  doctor_name: string;
  total_encounters: number;
  complete: number;
  incomplete: number;
  compliance_rate: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function getDocumentationSummary(filters: {
  startDate: string;
  endDate: string;
}): Promise<DocumentationSummary> {
  const { startDate, endDate } = filters;

  const { data: encounters, error } = await supabase
    .from('visits')
    .select(
      `
      id,
      status,
      created_at,
      end_time,
      consultations(id, diagnosis, notes, signed_at),
      vitals(id)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw error;

  const totalEncounters = encounters?.length || 0;
  let complete = 0;
  let incomplete = 0;
  let unsigned = 0;
  let critical = 0;
  let warning = 0;
  let totalCompletionTime = 0;
  let completedWithTime = 0;

  const CRITICAL_DAYS = 7;
  const WARNING_DAYS = 3;

  encounters?.forEach((enc) => {
    const consultations = (enc.consultations as any[]) || [];
    const vitals = (enc.vitals as any[]) || [];

    const hasConsultation = consultations.length > 0;
    const hasDiagnosis = consultations.some((c) => c.diagnosis);
    const hasNotes = consultations.some((c) => c.notes);
    const hasVitals = vitals.length > 0;
    const isSigned = consultations.some((c) => c.signed_at);

    const isComplete = hasConsultation && hasDiagnosis && hasVitals;

    if (isComplete && isSigned) {
      complete++;
      if ((enc as any).end_time) {
        const completionTime = Math.round(
          (new Date((enc as any).end_time).getTime() -
            new Date(enc.created_at).getTime()) /
            3600000,
        );
        totalCompletionTime += completionTime;
        completedWithTime++;
      }
    } else {
      incomplete++;
      if (!isSigned && hasConsultation) unsigned++;

      const daysSince = Math.round(
        (Date.now() - new Date(enc.created_at).getTime()) / 86400000,
      );
      if (daysSince >= CRITICAL_DAYS) critical++;
      else if (daysSince >= WARNING_DAYS) warning++;
    }
  });

  return {
    total_encounters: totalEncounters,
    complete,
    incomplete,
    unsigned,
    critical_count: critical,
    warning_count: warning,
    compliance_rate:
      totalEncounters > 0 ? Math.round((complete / totalEncounters) * 100) : 0,
    avg_completion_time:
      completedWithTime > 0
        ? Math.round(totalCompletionTime / completedWithTime)
        : 0,
  };
}

async function getMissingDocumentationList(filters: {
  startDate: string;
  endDate: string;
  status?: string;
}): Promise<MissingDocRecord[]> {
  const { startDate, endDate, status } = filters;

  const { data: encounters, error } = await supabase
    .from('visits')
    .select(
      `
      id,
      status,
      created_at,
      patient:patients!visits_patient_id_fkey(first_name, surname),
      consultations(id, diagnosis, notes, signed_at, doctor:staff(first_name, last_name, department)),
      vitals(id)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const CRITICAL_DAYS = 7;
  const WARNING_DAYS = 3;

  const records: MissingDocRecord[] = [];

  encounters?.forEach((enc) => {
    const patient = enc.patient as any;
    const consultations = (enc.consultations as any[]) || [];
    const vitals = (enc.vitals as any[]) || [];

    const hasConsultation = consultations.length > 0;
    const hasDiagnosis = consultations.some((c) => c.diagnosis);
    const hasNotes = consultations.some((c) => c.notes);
    const hasVitals = vitals.length > 0;
    const isSigned = consultations.some((c) => c.signed_at);

    const isComplete = hasConsultation && hasDiagnosis && hasVitals && isSigned;

    if (!isComplete) {
      const missingItems: string[] = [];
      if (!hasConsultation) missingItems.push('Consultation');
      if (!hasDiagnosis) missingItems.push('Diagnosis');
      if (!hasNotes) missingItems.push('Clinical Notes');
      if (!hasVitals) missingItems.push('Vitals');
      if (!isSigned && hasConsultation) missingItems.push('Signature');

      const daysSince = Math.round(
        (Date.now() - new Date(enc.created_at).getTime()) / 86400000,
      );

      let recordStatus: MissingDocRecord['status'] = 'pending';
      if (daysSince >= CRITICAL_DAYS) recordStatus = 'critical';
      else if (daysSince >= WARNING_DAYS) recordStatus = 'warning';

      // Filter by status if provided
      if (status && status !== 'all' && recordStatus !== status) return;

      const doctor = consultations[0]?.doctor as any;

      records.push({
        id: enc.id,
        patient_name: patient
          ? `${patient.first_name} ${patient.surname}`
          : 'Unknown',
        encounter_date: enc.created_at,
        doctor_name: doctor
          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
          : 'Unassigned',
        department: doctor?.department || 'General',
        missing_items: missingItems,
        days_overdue: daysSince,
        status: recordStatus,
        encounter_id: enc.id,
      });
    }
  });

  return records;
}

async function getDoctorDocumentationStats(filters: {
  startDate: string;
  endDate: string;
}): Promise<DoctorDocStats[]> {
  const { startDate, endDate } = filters;

  const { data: consultations } = await supabase
    .from('consultations')
    .select(
      `
      id,
      diagnosis,
      notes,
      signed_at,
      doctor_id,
      doctor:staff(first_name, last_name)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  const doctorMap = new Map<
    string,
    {
      name: string;
      total: number;
      complete: number;
    }
  >();

  consultations?.forEach((consultation) => {
    const doctorId = consultation.doctor_id || 'unknown';
    const doctor = consultation.doctor as any;
    const doctorName = doctor
      ? `Dr. ${doctor.first_name} ${doctor.last_name}`
      : 'Unknown';

    const existing = doctorMap.get(doctorId) || {
      name: doctorName,
      total: 0,
      complete: 0,
    };
    existing.total++;

    const isComplete =
      consultation.diagnosis && consultation.notes && consultation.signed_at;
    if (isComplete) existing.complete++;

    doctorMap.set(doctorId, existing);
  });

  return Array.from(doctorMap.entries())
    .map(([id, stats]) => ({
      doctor_id: id,
      doctor_name: stats.name,
      total_encounters: stats.total,
      complete: stats.complete,
      incomplete: stats.total - stats.complete,
      compliance_rate:
        stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.compliance_rate - b.compliance_rate);
}

async function getMissingByType(filters: {
  startDate: string;
  endDate: string;
}) {
  const list = await getMissingDocumentationList(filters);

  const typeCount = new Map<string, number>();
  list.forEach((record) => {
    record.missing_items.forEach((item) => {
      typeCount.set(item, (typeCount.get(item) || 0) + 1);
    });
  });

  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
  return Array.from(typeCount.entries())
    .map(([type, count], index) => ({
      label: type,
      value: count,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
}

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge: React.FC<{ status: MissingDocRecord['status'] }> = ({
  status,
}) => {
  const styles = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
  };

  const icons = {
    critical: <AlertTriangle className="w-3 h-3 mr-1" />,
    warning: <Clock className="w-3 h-3 mr-1" />,
    pending: <FileWarning className="w-3 h-3 mr-1" />,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      <span className="capitalize">{status}</span>
    </span>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const MissingDocumentationDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['doc-summary', dateRange],
    queryFn: () => getDocumentationSummary(dateRange),
  });

  const { data: missingDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['missing-docs', dateRange, statusFilter],
    queryFn: () =>
      getMissingDocumentationList({ ...dateRange, status: statusFilter }),
  });

  const { data: doctorStats } = useQuery({
    queryKey: ['doctor-doc-stats', dateRange],
    queryFn: () => getDoctorDocumentationStats(dateRange),
  });

  const { data: missingByType } = useQuery({
    queryKey: ['missing-by-type', dateRange],
    queryFn: () => getMissingByType(dateRange),
  });

  const filteredDocs = useMemo(() => {
    if (!missingDocs) return [];
    if (!searchQuery) return missingDocs;
    const query = searchQuery.toLowerCase();
    return missingDocs.filter(
      (doc) =>
        doc.patient_name.toLowerCase().includes(query) ||
        doc.doctor_name.toLowerCase().includes(query) ||
        doc.department.toLowerCase().includes(query),
    );
  }, [missingDocs, searchQuery]);

  const statusDistribution = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Complete', value: summary.complete, color: '#22c55e' },
      { label: 'Incomplete', value: summary.incomplete, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [summary]);

  const doctorComplianceChart = useMemo(() => {
    if (!doctorStats) return [];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];
    return doctorStats.slice(0, 10).map((doc, index) => ({
      label: doc.doctor_name.replace('Dr. ', ''),
      value: doc.compliance_rate,
      color:
        doc.compliance_rate >= 80
          ? '#22c55e'
          : doc.compliance_rate >= 60
            ? '#f59e0b'
            : '#ef4444',
    }));
  }, [doctorStats]);

  const isLoading = summaryLoading || docsLoading;

  if (isLoading && !summary && !missingDocs) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const columns = [
    {
      key: 'patient_name',
      header: 'Patient',
      render: (item: MissingDocRecord) => (
        <div className="font-medium">{item.patient_name}</div>
      ),
    },
    {
      key: 'encounter_date',
      header: 'Encounter Date',
      render: (item: MissingDocRecord) =>
        new Date(item.encounter_date).toLocaleDateString(),
    },
    { key: 'doctor_name', header: 'Doctor' },
    { key: 'department', header: 'Department' },
    {
      key: 'missing_items',
      header: 'Missing Items',
      render: (item: MissingDocRecord) => (
        <div className="flex flex-wrap gap-1">
          {item.missing_items.map((mi, idx) => (
            <span
              key={idx}
              className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded"
            >
              {mi}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'days_overdue',
      header: 'Days',
      render: (item: MissingDocRecord) => (
        <span
          className={item.days_overdue >= 7 ? 'text-red-600 font-medium' : ''}
        >
          {item.days_overdue}d
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: MissingDocRecord) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileX className="w-6 h-6 text-red-600" />
            Missing Documentation Dashboard
          </h1>
          <p className="text-gray-500">
            Track incomplete records and documentation compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
            className="w-40"
          />
          <span className="text-gray-500">to</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
            className="w-40"
          />
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatsCard
          title="Total Encounters"
          value={summary?.total_encounters || 0}
          icon={FileCheck}
          variant="info"
        />
        <StatsCard
          title="Complete"
          value={summary?.complete || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Incomplete"
          value={summary?.incomplete || 0}
          icon={FileWarning}
          variant="error"
        />
        <StatsCard
          title="Unsigned"
          value={summary?.unsigned || 0}
          icon={User}
          variant="warning"
        />
        <StatsCard
          title="Critical"
          value={summary?.critical_count || 0}
          icon={AlertTriangle}
          variant="error"
        />
        <StatsCard
          title="Compliance Rate"
          value={`${summary?.compliance_rate || 0}%`}
          icon={FileCheck}
          variant={(summary?.compliance_rate || 0) >= 80 ? 'success' : 'error'}
        />
      </div>

      {/* Alert for critical items */}
      {(summary?.critical_count || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">
            <strong>{summary?.critical_count}</strong> encounters have
            documentation overdue by 7+ days. Immediate action required!
          </span>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Pie3DChart
          data={statusDistribution}
          title="Documentation Status"
          subtitle="Complete vs Incomplete"
        />
        <Pie3DChart
          data={missingByType || []}
          title="Missing Items Breakdown"
          subtitle="By documentation type"
        />
        <Bar3DChart
          data={doctorComplianceChart}
          title="Doctor Compliance Rates"
          subtitle="Documentation completion by physician"
          formatValue={(v) => `${v}%`}
        />
      </div>

      {/* Doctor Performance Table */}
      {doctorStats && doctorStats.length > 0 && (
        <Card title="Doctor Documentation Performance">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Complete
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Incomplete
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctorStats.map((doc) => (
                  <tr key={doc.doctor_id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {doc.doctor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.total_encounters}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                      {doc.complete}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">
                      {doc.incomplete}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              doc.compliance_rate >= 80
                                ? 'bg-green-500'
                                : doc.compliance_rate >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${doc.compliance_rate}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            doc.compliance_rate >= 80
                              ? 'text-green-600'
                              : doc.compliance_rate >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {doc.compliance_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Missing Documentation Table */}
      <Card title="Incomplete Records">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patient, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Status</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="pending">Pending</option>
          </Select>
        </div>
        <DataTable
          data={filteredDocs}
          columns={columns}
          keyField="id"
          emptyMessage="No incomplete documentation found - great job!"
        />
      </Card>
    </div>
  );
};

export default MissingDocumentationDashboard;
