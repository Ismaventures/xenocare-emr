// =============================================================================
// NHIS Dashboard Component
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
  UserPlus,
  Loader2,
  Activity,
  SlidersHorizontal,
  FileDown,
} from 'lucide-react';
import {
  useNhisDashboardStats,
  useNhisPendingClaimsSummary,
  useAllProvisionalApprovals,
} from '../hooks';
import { ProvisionalApprovalsCard } from './ProvisionalApprovalsCard';
import { ExpiringSoonCard } from './ExpiringSoonCard';
import { downloadNhisClaimsPdf } from '../utils';
import { useToast } from '../../../components/ui/Toast';
import { SkeletonDashboard } from '../../../components/ui/SkeletonLoader';

// Format currency in Naira
const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Stat Card — matches reference design: icon-square + large number + label
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, iconBg, subtitle, badge, onClick }: StatCardProps) {
  return (
    <div
      className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 transition-all duration-200 hover:shadow-md ${onClick ? 'cursor-pointer hover:border-blue-200' : ''}`}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute top-3 right-4 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 leading-none tracking-tight">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1.5">{title}</p>
      {subtitle && (
        <p className="text-[11px] text-gray-400 italic mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

export function NhisDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useNhisDashboardStats();
  const { data: pendingClaimsSummary } = useNhisPendingClaimsSummary();
  const { data: provisionalApprovals = [] } = useAllProvisionalApprovals();
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  // Handle PDF export
  const handleExportClaims = async () => {
    if (!pendingClaimsSummary || pendingClaimsSummary.total_items === 0) {
      showToast({ type: 'warning', message: 'No pending claims to export' });
      return;
    }

    setIsExporting(true);
    try {
      await downloadNhisClaimsPdf(pendingClaimsSummary, {
        facilityName: 'XenoCare',
        facilityAddress: 'XenoCare',
        facilityNhisId: 'NHIS-NDC-001',
      });
      showToast({
        type: 'success',
        message: 'Claims report downloaded successfully',
      });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ type: 'error', message: 'Failed to generate claims report' });
    } finally {
      setIsExporting(false);
    }
  };

  // Use the new pending claims summary for accurate totals
  const totalPendingClaimsAmount =
    pendingClaimsSummary?.total_amount || stats?.total_claims_amount || 0;
  const totalPendingClaimsCount =
    pendingClaimsSummary?.total_items || stats?.pending_claims || 0;
  const claimsByCategory = pendingClaimsSummary?.by_category ?? {
    lab: { count: 0, amount: 0 },
    radiology: { count: 0, amount: 0 },
    pharmacy: { count: 0, amount: 0 },
    procedure: { count: 0, amount: 0 },
    specialty: { count: 0, amount: 0 },
    consultation: { count: 0, amount: 0 },
    admission: { count: 0, amount: 0 },
  };

  // Build breakdown rows from actual data
  const breakdownRows = useMemo(() => {
    const categoryDotColor: Record<string, string> = {
      lab: 'bg-blue-500',
      radiology: 'bg-purple-500',
      pharmacy: 'bg-emerald-500',
      procedure: 'bg-amber-500',
      specialty: 'bg-rose-500',
      consultation: 'bg-indigo-500',
      admission: 'bg-teal-500',
    };
    const categoryLabel: Record<string, string> = {
      lab: 'Laboratory',
      radiology: 'Radiology',
      pharmacy: 'Pharmacy',
      procedure: 'Procedures',
      specialty: 'Specialty',
      consultation: 'Consultation',
      admission: 'Admission',
    };
    const categoryDescription: Record<string, string> = {
      lab: 'Full Blood Count (FBC) + ESR',
      radiology: 'Chest X-Ray (PA View)',
      pharmacy: 'Ceftriaxone 1g Inj. (Pack of 10)',
      procedure: 'Minor Surgical Debridement',
      specialty: 'Ophthalmology Consultation',
      consultation: 'General Consultation',
      admission: 'Inpatient Admission',
    };
    return Object.entries(claimsByCategory)
      .filter(([, v]) => v.count > 0)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([key, val]) => ({
        key,
        department: categoryLabel[key] || key,
        description: categoryDescription[key] || '—',
        units: val.count,
        amount: val.amount,
        dotColor: categoryDotColor[key] || 'bg-gray-400',
      }));
  }, [claimsByCategory]);

  const [claimsTableFilter, setClaimsTableFilter] = useState<'all' | 'critical'>('all');

  // "Critical" = categories with amount > 50k or count > 10
  const filteredRows = claimsTableFilter === 'critical'
    ? breakdownRows.filter((r) => r.amount > 50000 || r.units > 10)
    : breakdownRows;

  // Count badges
  const pendingReviewCount = stats?.pending_authorizations || 0;

  if (statsLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            NHIS Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Welcome to your administrative command center. Below is a real-time summary of enrollee registration
            status, claims throughput, and pending clinical authorizations for the current billing cycle.
          </p>
        </div>
        <button
          onClick={handleExportClaims}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-3 bg-[#0C2340] text-white text-sm font-semibold rounded-xl hover:bg-[#0a1c33] disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex-shrink-0 mt-1"
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileDown size={16} />
          )}
          {isExporting ? 'Generating...' : 'Generate Claims Export'}
        </button>
      </div>

      {/* ── Primary Stat Cards (4-up) ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard
          title="NHIS Registered Patients"
          value={stats?.total_nhis_patients || 0}
          icon={<Users size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="total active enrollees"
          onClick={() => navigate('.', { state: { activeTab: 'verification' } })}
        />
        <StatCard
          title="Active Authorizations"
          value={stats?.active_authorizations || 0}
          icon={<Shield size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          subtitle={`${pendingReviewCount} pending review`}
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pending_approvals || 0}
          icon={<ClipboardCheck size={20} className="text-orange-600" />}
          iconBg="bg-orange-50"
          subtitle={`${provisionalApprovals.length} provisional status`}
          onClick={() => navigate('.', { state: { activeTab: 'specialty' } })}
        />
        <StatCard
          title="NHIS Pending Claims"
          value={formatCurrency(totalPendingClaimsAmount)}
          icon={<FileText size={20} className="text-gray-700" />}
          iconBg="bg-gray-100"
          subtitle={`${totalPendingClaimsCount} approved services`}
          onClick={() => navigate('.', { state: { activeTab: 'claims' } })}
        />
      </div>

      {/* ── Pending Claims Breakdown Table ─────────────────────────── */}
      {pendingClaimsSummary && pendingClaimsSummary.total_items > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Section header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Claims Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">Detailed view of claims awaiting final validation</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle tabs */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setClaimsTableFilter('all')}
                  className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                    claimsTableFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setClaimsTableFilter('critical')}
                  className={`px-4 py-1.5 text-xs font-semibold border-l border-gray-200 transition-colors ${
                    claimsTableFilter === 'critical'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Critical
                </button>
              </div>
              <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <SlidersHorizontal size={14} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-[200px]">Department</th>
                  <th className="text-left pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                  <th className="text-center pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-[90px]">Units</th>
                  <th className="text-right pb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-[150px]">Amount (NGN)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.key} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${row.dotColor}`} />
                        <span className="text-sm font-semibold text-gray-800">{row.department}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-gray-500">{row.description}</td>
                    <td className="py-4 text-sm font-medium text-gray-700 text-center">{row.units}</td>
                    <td className="py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(row.amount)}</span>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                      No {claimsTableFilter === 'critical' ? 'critical' : ''} pending claims
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Total row */}
            {filteredRows.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Total ({filteredRows.reduce((sum, r) => sum + r.units, 0)} items)
                </span>
                <span className="text-lg font-extrabold text-gray-900">
                  {formatCurrency(filteredRows.reduce((sum, r) => sum + r.amount, 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Secondary Stats Row ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard
          title="Provisional Approvals"
          value={provisionalApprovals.length}
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Awaiting official NHIS codes"
        />
        <StatCard
          title="NHIS Billing Total"
          value={formatCurrency(stats?.total_nhis_billing_amount || 0)}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          subtitle="All-time NHIS billing"
        />
        <StatCard
          title="Referred Patients"
          value={stats?.referred_patients_count || 0}
          icon={<UserPlus size={20} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          subtitle="Requires strict verification"
        />
        <StatCard
          title="Emergency Overrides"
          value={stats?.emergency_overrides_count || 0}
          icon={<AlertTriangle size={20} className="text-red-600" />}
          iconBg="bg-red-50"
          subtitle="Pending post-authorization"
        />
      </div>

      {/* ── Provisional Approvals & Expiring Soon ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProvisionalApprovalsCard />
        <ExpiringSoonCard />
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="text-green-600" size={16} />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('.', { state: { activeTab: 'verification' } })}
            className="flex flex-col items-center justify-center p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2.5 group-hover:scale-110 transition-transform">
              <Shield size={18} className="text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Verify Patient</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Check eligibility</span>
          </button>
          <button
            onClick={() => navigate('.', { state: { activeTab: 'specialty' } })}
            className="flex flex-col items-center justify-center p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:bg-green-50 hover:border-green-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2.5 group-hover:scale-110 transition-transform">
              <ClipboardCheck size={18} className="text-green-600" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Process Approvals</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Review requests</span>
          </button>
          <button
            onClick={() => navigate('.', { state: { activeTab: 'claims' } })}
            className="flex flex-col items-center justify-center p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2.5 group-hover:scale-110 transition-transform">
              <FileText size={18} className="text-purple-600" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Generate Claims</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Submit to HMO</span>
          </button>
          <button
            onClick={() => handleExportClaims()}
            className="flex flex-col items-center justify-center p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:bg-amber-50 hover:border-amber-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-2.5 group-hover:scale-110 transition-transform">
              <TrendingUp size={18} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Export Report</span>
            <span className="text-[11px] text-gray-400 mt-0.5">Download analysis</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NhisDashboard;
