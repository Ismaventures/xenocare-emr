// =============================================================================
// XENOCARE EMR - Laboratory TAT Dashboard
// Comprehensive Lab Turnaround Time tracking and analysis
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlaskConical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { Card, StatsCard, DataTable } from '../../../components/ui';
import { Bar3DChart, Pie3DChart, chartColors } from './AdvancedCharts';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

interface LabTatMetrics {
  test_id: string;
  test_name: string;
  category: string;
  ordered_at: string;
  collected_at?: string;
  resulted_at?: string;
  tat_minutes?: number;
  target_tat: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  patient_name: string;
}

interface TatSummary {
  total_tests: number;
  completed: number;
  pending: number;
  in_progress: number;
  on_time_rate: number;
  avg_tat_minutes: number;
  delayed_count: number;
  target_met_percentage: number;
}

interface CategoryTat {
  category: string;
  avg_tat: number;
  target_tat: number;
  volume: number;
  compliance_rate: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function getLabTatSummary(filters: {
  startDate: string;
  endDate: string;
}): Promise<TatSummary> {
  const { startDate, endDate } = filters;

  const { data: labRequests, error } = await supabase
    .from('lab_requests')
    .select(
      `
      id,
      status,
      created_at,
      collected_at,
      resulted_at,
      test_category
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw error;

  const totalTests = labRequests?.length || 0;
  let completed = 0;
  let pending = 0;
  let inProgress = 0;
  let delayed = 0;
  let totalTatMinutes = 0;
  let completedWithTat = 0;
  let onTimeCount = 0;

  const TARGET_TAT_MINUTES = 120; // 2 hours default target

  labRequests?.forEach((request) => {
    if (request.status === 'completed' || request.resulted_at) {
      completed++;
      if (request.resulted_at && request.created_at) {
        const tat = Math.round(
          (new Date(request.resulted_at).getTime() -
            new Date(request.created_at).getTime()) /
            60000,
        );
        totalTatMinutes += tat;
        completedWithTat++;
        if (tat <= TARGET_TAT_MINUTES) onTimeCount++;
        else delayed++;
      }
    } else if (request.status === 'in_progress' || request.collected_at) {
      inProgress++;
    } else {
      pending++;
    }
  });

  const avgTat =
    completedWithTat > 0 ? Math.round(totalTatMinutes / completedWithTat) : 0;

  return {
    total_tests: totalTests,
    completed,
    pending,
    in_progress: inProgress,
    on_time_rate:
      completedWithTat > 0
        ? Math.round((onTimeCount / completedWithTat) * 100)
        : 0,
    avg_tat_minutes: avgTat,
    delayed_count: delayed,
    target_met_percentage:
      completedWithTat > 0
        ? Math.round((onTimeCount / completedWithTat) * 100)
        : 0,
  };
}

async function getLabTatByCategory(filters: {
  startDate: string;
  endDate: string;
}): Promise<CategoryTat[]> {
  const { startDate, endDate } = filters;

  const { data: labRequests } = await supabase
    .from('lab_requests')
    .select(
      `
      id,
      test_category,
      status,
      created_at,
      resulted_at
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .not('resulted_at', 'is', null);

  const categoryMap = new Map<
    string,
    {
      totalTat: number;
      count: number;
      onTime: number;
    }
  >();

  const TARGET_TAT: Record<string, number> = {
    Hematology: 60,
    Chemistry: 120,
    Microbiology: 1440,
    Urinalysis: 30,
    Serology: 120,
    default: 120,
  };

  labRequests?.forEach((request) => {
    const category = request.test_category || 'General';
    const existing = categoryMap.get(category) || {
      totalTat: 0,
      count: 0,
      onTime: 0,
    };

    if (request.resulted_at && request.created_at) {
      const tat = Math.round(
        (new Date(request.resulted_at).getTime() -
          new Date(request.created_at).getTime()) /
          60000,
      );
      existing.totalTat += tat;
      existing.count++;
      const targetTat = TARGET_TAT[category] || TARGET_TAT.default;
      if (tat <= targetTat) existing.onTime++;
    }

    categoryMap.set(category, existing);
  });

  return Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    avg_tat: stats.count > 0 ? Math.round(stats.totalTat / stats.count) : 0,
    target_tat: TARGET_TAT[category] || TARGET_TAT.default,
    volume: stats.count,
    compliance_rate:
      stats.count > 0 ? Math.round((stats.onTime / stats.count) * 100) : 0,
  }));
}

async function getRecentLabTests(filters: {
  startDate: string;
  endDate: string;
  status?: string;
}): Promise<LabTatMetrics[]> {
  const { startDate, endDate, status } = filters;

  let query = supabase
    .from('lab_requests')
    .select(
      `
      id,
      test_name,
      test_category,
      status,
      created_at,
      collected_at,
      resulted_at,
      encounter:encounters(
        patient:patients(first_name, surname)
      )
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const TARGET_TAT: Record<string, number> = {
    Hematology: 60,
    Chemistry: 120,
    Microbiology: 1440,
    Urinalysis: 30,
    Serology: 120,
    default: 120,
  };

  return (data || []).map((request) => {
    const encounter = request.encounter as any;
    const patient = encounter?.patient;
    const patientName = patient
      ? `${patient.first_name} ${patient.surname}`
      : 'Unknown';

    let tatMinutes: number | undefined;
    let tatStatus: LabTatMetrics['status'] = 'pending';

    if (request.resulted_at) {
      tatMinutes = Math.round(
        (new Date(request.resulted_at).getTime() -
          new Date(request.created_at).getTime()) /
          60000,
      );
      const targetTat =
        TARGET_TAT[request.test_category || 'default'] || TARGET_TAT.default;
      tatStatus = tatMinutes <= targetTat ? 'completed' : 'delayed';
    } else if (request.collected_at || request.status === 'in_progress') {
      tatStatus = 'in_progress';
    }

    return {
      test_id: request.id,
      test_name: request.test_name || 'General Test',
      category: request.test_category || 'General',
      ordered_at: request.created_at,
      collected_at: request.collected_at,
      resulted_at: request.resulted_at,
      tat_minutes: tatMinutes,
      target_tat:
        TARGET_TAT[request.test_category || 'default'] || TARGET_TAT.default,
      status: tatStatus,
      patient_name: patientName,
    };
  });
}

async function getHourlyDistribution(filters: {
  startDate: string;
  endDate: string;
}) {
  const { data: labRequests } = await supabase
    .from('lab_requests')
    .select('created_at')
    .gte('created_at', filters.startDate)
    .lte('created_at', `${filters.endDate}T23:59:59`);

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    label: `${i.toString().padStart(2, '0')}:00`,
    value: 0,
    color: chartColors.primary[4],
  }));

  labRequests?.forEach((request) => {
    const hour = new Date(request.created_at).getHours();
    hourlyData[hour].value++;
  });

  return hourlyData;
}

// =============================================================================
// Status Badge Component
// =============================================================================

const TatStatusBadge: React.FC<{
  status: LabTatMetrics['status'];
  tat?: number;
  target: number;
}> = ({ status, tat, target }) => {
  const styles = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    delayed: 'bg-red-100 text-red-800',
  };

  const icons = {
    completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
    pending: <Clock className="w-3 h-3 mr-1" />,
    in_progress: <Activity className="w-3 h-3 mr-1" />,
    delayed: <AlertTriangle className="w-3 h-3 mr-1" />,
  };

  const formatTat = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      {tat ? formatTat(tat) : status.replace('_', ' ')}
    </span>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const LabTatDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['lab-tat-summary', dateRange],
    queryFn: () => getLabTatSummary(dateRange),
  });

  const { data: categoryTat } = useQuery({
    queryKey: ['lab-tat-category', dateRange],
    queryFn: () => getLabTatByCategory(dateRange),
  });

  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['lab-tests', dateRange, statusFilter],
    queryFn: () => getRecentLabTests({ ...dateRange, status: statusFilter }),
  });

  const { data: hourlyData } = useQuery({
    queryKey: ['lab-hourly', dateRange],
    queryFn: () => getHourlyDistribution(dateRange),
  });

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    if (!searchQuery) return tests;
    const query = searchQuery.toLowerCase();
    return tests.filter(
      (test) =>
        test.test_name.toLowerCase().includes(query) ||
        test.patient_name.toLowerCase().includes(query) ||
        test.category.toLowerCase().includes(query),
    );
  }, [tests, searchQuery]);

  const categoryChartData = useMemo(() => {
    if (!categoryTat) return [];
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
    ];
    return categoryTat.map((cat, index) => ({
      label: cat.category,
      value: cat.avg_tat,
      color: colors[index % colors.length],
    }));
  }, [categoryTat]);

  const complianceChartData = useMemo(() => {
    if (!categoryTat) return [];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    return categoryTat.map((cat, index) => ({
      label: cat.category,
      value: cat.compliance_rate,
      color: colors[index % colors.length],
    }));
  }, [categoryTat]);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isLoading = summaryLoading || testsLoading;

  if (isLoading && !summary && !tests) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const columns = [
    {
      key: 'test_name',
      header: 'Test',
      render: (item: LabTatMetrics) => (
        <div>
          <div className="font-medium">{item.test_name}</div>
          <div className="text-xs text-gray-500">{item.category}</div>
        </div>
      ),
    },
    { key: 'patient_name', header: 'Patient' },
    {
      key: 'ordered_at',
      header: 'Ordered',
      render: (item: LabTatMetrics) =>
        new Date(item.ordered_at).toLocaleString(),
    },
    {
      key: 'resulted_at',
      header: 'Resulted',
      render: (item: LabTatMetrics) =>
        item.resulted_at ? new Date(item.resulted_at).toLocaleString() : '-',
    },
    {
      key: 'target_tat',
      header: 'Target',
      render: (item: LabTatMetrics) => formatMinutes(item.target_tat),
    },
    {
      key: 'status',
      header: 'TAT / Status',
      render: (item: LabTatMetrics) => (
        <TatStatusBadge
          status={item.status}
          tat={item.tat_minutes}
          target={item.target_tat}
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" />
            Laboratory TAT Dashboard
          </h1>
          <p className="text-gray-500">
            Monitor and optimize lab turnaround times
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
          title="Total Tests"
          value={summary?.total_tests || 0}
          icon={FlaskConical}
          variant="info"
        />
        <StatsCard
          title="Completed"
          value={summary?.completed || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="In Progress"
          value={summary?.in_progress || 0}
          icon={Activity}
          variant="info"
        />
        <StatsCard
          title="Pending"
          value={summary?.pending || 0}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Avg TAT"
          value={formatMinutes(summary?.avg_tat_minutes || 0)}
          icon={TrendingUp}
          variant={
            (summary?.avg_tat_minutes || 0) <= 120 ? 'success' : 'warning'
          }
        />
        <StatsCard
          title="On-Time Rate"
          value={`${summary?.on_time_rate || 0}%`}
          icon={(summary?.on_time_rate || 0) >= 80 ? TrendingUp : TrendingDown}
          variant={(summary?.on_time_rate || 0) >= 80 ? 'success' : 'error'}
        />
      </div>

      {/* Alert for delayed tests */}
      {(summary?.delayed_count || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">
            <strong>{summary?.delayed_count}</strong> tests have exceeded their
            target TAT. Immediate attention required.
          </span>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bar3DChart
          data={categoryChartData}
          title="Average TAT by Category"
          subtitle="Minutes from order to result"
          formatValue={(v) => formatMinutes(v)}
        />
        <Bar3DChart
          data={complianceChartData}
          title="TAT Compliance by Category"
          subtitle="Percentage meeting target"
          formatValue={(v) => `${v}%`}
        />
      </div>

      {/* Hourly Distribution */}
      <Bar3DChart
        data={hourlyData || []}
        title="Test Volume by Hour"
        subtitle="Distribution of lab orders throughout the day"
      />

      {/* Category Performance Table */}
      {categoryTat && categoryTat.length > 0 && (
        <Card title="Category Performance Breakdown">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg TAT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryTat.map((cat) => (
                  <tr key={cat.category}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {cat.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cat.volume}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={
                          cat.avg_tat <= cat.target_tat
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatMinutes(cat.avg_tat)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatMinutes(cat.target_tat)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              cat.compliance_rate >= 80
                                ? 'bg-green-500'
                                : cat.compliance_rate >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${cat.compliance_rate}%` }}
                          />
                        </div>
                        <span className="text-sm">{cat.compliance_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tests Table */}
      <Card title="Recent Lab Tests">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search test, patient..."
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
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
          </Select>
        </div>
        <DataTable
          data={filteredTests}
          columns={columns}
          keyField="test_id"
          emptyMessage="No lab tests found for the selected criteria"
        />
      </Card>
    </div>
  );
};

export default LabTatDashboard;
