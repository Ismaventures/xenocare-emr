// =============================================================================
// XENOCARE EMR - NHIS Reconciliation Dashboard
// Comprehensive NHIS claims tracking, reconciliation, and reporting
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { Card, StatsCard, DataTable } from '../../../components/ui';
import {
  Bar3DChart,
  Pie3DChart,
  formatCurrency,
  chartColors,
} from './AdvancedCharts';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

interface NhisClaim {
  id: string;
  claim_number: string;
  patient_name: string;
  nhis_number: string;
  service_date: string;
  claim_amount: number;
  approved_amount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'pending' | 'partial';
  batch_number?: string;
}

interface NhisSummary {
  total_claims: number;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  total_claimed: number;
  total_approved: number;
  total_rejected: number;
  approval_rate: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function getNhisClaimsSummary(filters: {
  startDate: string;
  endDate: string;
}): Promise<NhisSummary> {
  const { startDate, endDate } = filters;

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('payment_method', 'NHIS')
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw error;

  const totalClaims = invoices?.length || 0;
  const totalClaimed =
    invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const totalPaid =
    invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

  let submitted = 0;
  let approved = 0;
  let rejected = 0;
  let pending = 0;

  invoices?.forEach((inv) => {
    if (inv.status === 'paid') approved++;
    else if (inv.status === 'cancelled') rejected++;
    else pending++;
    submitted++;
  });

  return {
    total_claims: totalClaims,
    submitted,
    approved,
    rejected,
    pending,
    total_claimed: totalClaimed,
    total_approved: totalPaid,
    total_rejected: totalClaimed - totalPaid,
    approval_rate:
      totalClaims > 0 ? Math.round((approved / totalClaims) * 100) : 0,
  };
}

async function getNhisClaimsList(filters: {
  startDate: string;
  endDate: string;
  status?: string;
}): Promise<NhisClaim[]> {
  const { startDate, endDate, status } = filters;

  let query = supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      total_amount,
      amount_paid,
      status,
      created_at,
      patient:patients(first_name, surname, nhis_number)
    `,
    )
    .eq('payment_method', 'NHIS')
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') {
    if (status === 'approved') query = query.eq('status', 'paid');
    else if (status === 'rejected') query = query.eq('status', 'cancelled');
    else if (status === 'pending') query = query.eq('status', 'pending');
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((inv) => {
    const patient = inv.patient as any;
    let claimStatus: NhisClaim['status'] = 'pending';
    if (inv.status === 'paid') claimStatus = 'approved';
    else if (inv.status === 'cancelled') claimStatus = 'rejected';
    else if (inv.status === 'partial') claimStatus = 'partial';

    return {
      id: inv.id,
      claim_number: `NHIS-${inv.invoice_number || inv.id.substring(0, 8)}`,
      patient_name: patient
        ? `${patient.first_name} ${patient.surname}`
        : 'Unknown',
      nhis_number: patient?.nhis_number || 'N/A',
      service_date: inv.created_at,
      claim_amount: inv.total_amount || 0,
      approved_amount: inv.amount_paid || 0,
      status: claimStatus,
      batch_number: `BATCH-${new Date(inv.created_at).toISOString().slice(0, 7)}`,
    };
  });
}

async function getNhisMonthlyTrends(year: number) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const results = [];

  for (let month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    if (startDate > new Date()) break;

    const { data } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status')
      .eq('payment_method', 'NHIS')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const claimed =
      data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

    results.push({
      label: months[month],
      value: claimed,
      color: chartColors.financial.nhis,
    });
  }

  return results;
}

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge: React.FC<{ status: NhisClaim['status'] }> = ({ status }) => {
  const styles = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    partial: 'bg-blue-100 text-blue-800',
    submitted: 'bg-gray-100 text-gray-800',
  };

  const icons = {
    approved: <CheckCircle2 className="w-3 h-3 mr-1" />,
    pending: <Clock className="w-3 h-3 mr-1" />,
    rejected: <XCircle className="w-3 h-3 mr-1" />,
    partial: <AlertTriangle className="w-3 h-3 mr-1" />,
    submitted: <Receipt className="w-3 h-3 mr-1" />,
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

const NhisReconciliationDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['nhis-summary', dateRange],
    queryFn: () => getNhisClaimsSummary(dateRange),
  });

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['nhis-claims', dateRange, statusFilter],
    queryFn: () => getNhisClaimsList({ ...dateRange, status: statusFilter }),
  });

  const { data: trends } = useQuery({
    queryKey: ['nhis-trends', new Date().getFullYear()],
    queryFn: () => getNhisMonthlyTrends(new Date().getFullYear()),
  });

  const filteredClaims = useMemo(() => {
    if (!claims) return [];
    if (!searchQuery) return claims;
    const query = searchQuery.toLowerCase();
    return claims.filter(
      (claim) =>
        claim.patient_name.toLowerCase().includes(query) ||
        claim.nhis_number.toLowerCase().includes(query) ||
        claim.claim_number.toLowerCase().includes(query),
    );
  }, [claims, searchQuery]);

  const statusPieData = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Approved', value: summary.approved, color: '#22c55e' },
      { label: 'Pending', value: summary.pending, color: '#f59e0b' },
      { label: 'Rejected', value: summary.rejected, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [summary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isLoading = summaryLoading || claimsLoading;

  if (isLoading && !summary && !claims) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const columns = [
    { key: 'claim_number', header: 'Claim #' },
    { key: 'patient_name', header: 'Patient' },
    { key: 'nhis_number', header: 'NHIS #' },
    {
      key: 'service_date',
      header: 'Service Date',
      render: (item: NhisClaim) =>
        new Date(item.service_date).toLocaleDateString(),
    },
    {
      key: 'claim_amount',
      header: 'Claimed',
      render: (item: NhisClaim) => formatCurrency(item.claim_amount),
    },
    {
      key: 'approved_amount',
      header: 'Approved',
      render: (item: NhisClaim) => (
        <span
          className={
            item.approved_amount < item.claim_amount
              ? 'text-red-600'
              : 'text-green-600'
          }
        >
          {formatCurrency(item.approved_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: NhisClaim) => <StatusBadge status={item.status} />,
    },
    { key: 'batch_number', header: 'Batch' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            NHIS Reconciliation Dashboard
          </h1>
          <p className="text-gray-500">
            Track, manage, and reconcile NHIS claims
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Claims"
          value={summary?.total_claims || 0}
          icon={Receipt}
          variant="info"
        />
        <StatsCard
          title="Approved"
          value={summary?.approved || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Pending"
          value={summary?.pending || 0}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Rejected"
          value={summary?.rejected || 0}
          icon={XCircle}
          variant="error"
        />
        <StatsCard
          title="Approval Rate"
          value={`${summary?.approval_rate || 0}%`}
          icon={TrendingUp}
          variant="info"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Claimed">
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(summary?.total_claimed || 0)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {summary?.total_claims || 0} claims submitted
          </p>
        </Card>
        <Card title="Total Approved">
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(summary?.total_approved || 0)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {summary?.approval_rate || 0}% approval rate
          </p>
        </Card>
        <Card title="Outstanding/Rejected">
          <div className="text-3xl font-bold text-red-600">
            {formatCurrency(summary?.total_rejected || 0)}
          </div>
          <p className="text-sm text-gray-500 mt-1">Requires attention</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Pie3DChart
          data={statusPieData}
          title="Claims Status Distribution"
          subtitle="Breakdown of NHIS claims by status"
        />
        <Bar3DChart
          data={trends || []}
          title="Monthly NHIS Claims Trend"
          subtitle="Claims amount over time"
          formatValue={formatCurrency}
        />
      </div>

      {/* Claims Table */}
      <Card title="NHIS Claims Register">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patient, NHIS #..."
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
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <DataTable
          data={filteredClaims}
          columns={columns}
          keyField="id"
          emptyMessage="No claims found for the selected criteria"
        />
      </Card>
    </div>
  );
};

export default NhisReconciliationDashboard;
