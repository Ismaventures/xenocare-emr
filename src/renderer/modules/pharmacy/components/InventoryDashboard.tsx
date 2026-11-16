import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Activity,
  RefreshCw,
  ChevronRight,
  Pill,
  Ban,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  StatusBadge,
  DataTable,
  EmptyState,
} from '../../../components/ui';
import {
  SkeletonTable,
  SkeletonStatsCard,
} from '../../../components/ui/SkeletonLoader';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import {
  usePharmacyInventoryStats,
  useNearExpiryDrugs,
  useExpiredDrugs,
  useDrugInventorySummary,
  useWriteOffBatch,
  pharmacyKeys,
} from '../hooks/usePharmacy';
import { NearExpiryDrug, ExpiredDrug } from '../dtos/pharmacy.dto';
import { useToast } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/Modal';

// =============================================================================
// Types
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const { isNightMode } = useTimeTheme();
  const variants = {
    default: isNightMode
      ? 'bg-slate-800 border-slate-700'
      : 'bg-white border-gray-200',
    success: isNightMode
      ? 'bg-green-900/50 border-green-800'
      : 'bg-green-50 border-green-200',
    warning: isNightMode
      ? 'bg-yellow-900/50 border-yellow-800'
      : 'bg-yellow-50 border-yellow-200',
    danger: isNightMode
      ? 'bg-red-900/50 border-red-800'
      : 'bg-red-50 border-red-200',
    info: isNightMode
      ? 'bg-blue-900/50 border-blue-800'
      : 'bg-blue-50 border-blue-200',
  };

  const iconVariants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <div
      className={`p-5 rounded-xl border ${variants[variant]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${iconVariants[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.value >= 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p
          className={`text-2xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'} mt-1`}
        >
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function InventoryDashboard() {
  const { isNightMode } = useTimeTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeSection, setActiveSection] = useState<
    'overview' | 'near-expiry' | 'expired'
  >('overview');
  const [writeOffBatch, setWriteOffBatch] = useState<ExpiredDrug | null>(null);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = usePharmacyInventoryStats();
  const { data: nearExpiryDrugs, isLoading: nearExpiryLoading } =
    useNearExpiryDrugs(90);
  const { data: expiredDrugs, isLoading: expiredLoading } = useExpiredDrugs();

  // Mutations
  const writeOffMutation = useWriteOffBatch();

  // Refresh all data
  const handleRefresh = () => {
    refetchStats();
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.nearExpiry() });
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.expired() });
    showToast({
      type: 'info',
      title: 'Refreshing',
      message: 'Updating inventory data...',
    });
  };

  // Handle write off
  const handleWriteOff = (drug: ExpiredDrug) => {
    setWriteOffBatch(drug);
  };

  const confirmWriteOff = () => {
    if (writeOffBatch) {
      writeOffMutation.mutate(
        {
          batchId: writeOffBatch.batch_id,
          reason: 'Expired stock write-off',
          performedBy: 'system',
          approvedBy: 'system',
        },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Written Off',
              message: 'Expired batch removed from inventory',
            });
            setWriteOffBatch(null);
          },
          onError: (error) => {
            showToast({
              type: 'error',
              title: 'Failed',
              message: 'Could not write off batch',
            });
            console.error('Write-off error:', error);
          },
        },
      );
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount?.toLocaleString() || 0}`;
  };

  // Near-expiry columns
  const nearExpiryColumns = [
    {
      key: 'drug_name',
      header: 'Drug',
      render: (item: NearExpiryDrug) => (
        <div>
          <div
            className={`font-medium ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {item.drug_name}
          </div>
          <div className="text-xs text-gray-500">{item.generic_name}</div>
        </div>
      ),
    },
    {
      key: 'batch_number',
      header: 'Batch',
      render: (item: NearExpiryDrug) => (
        <span className="font-mono text-sm">{item.batch_number}</span>
      ),
    },
    {
      key: 'quantity_remaining',
      header: 'Stock',
      render: (item: NearExpiryDrug) => (
        <span className="font-semibold">{item.quantity_remaining}</span>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Expiry',
      render: (item: NearExpiryDrug) => (
        <div>
          <div className="text-sm">
            {new Date(item.expiry_date).toLocaleDateString()}
          </div>
          <div
            className={`text-xs font-medium ${
              item.days_to_expiry <= 30
                ? 'text-red-600'
                : item.days_to_expiry <= 60
                  ? 'text-yellow-600'
                  : 'text-orange-600'
            }`}
          >
            {item.days_to_expiry} days left
          </div>
        </div>
      ),
    },
    {
      key: 'urgency_level',
      header: 'Status',
      render: (item: NearExpiryDrug) => {
        const variants: Record<string, 'danger' | 'warning' | 'info'> = {
          critical: 'danger',
          warning: 'warning',
          caution: 'info',
        };
        return (
          <StatusBadge
            status={
              item.urgency_level.charAt(0).toUpperCase() +
              item.urgency_level.slice(1)
            }
            variant={variants[item.urgency_level] || 'info'}
          />
        );
      },
    },
    {
      key: 'batch_value',
      header: 'Value',
      render: (item: NearExpiryDrug) => (
        <span className="text-sm text-gray-600">
          {formatCurrency(item.batch_value)}
        </span>
      ),
    },
  ];

  // Expired columns
  const expiredColumns = [
    {
      key: 'drug_name',
      header: 'Drug',
      render: (item: ExpiredDrug) => (
        <div>
          <div
            className={`font-medium ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {item.drug_name}
          </div>
          <div className="text-xs text-gray-500">{item.generic_name}</div>
        </div>
      ),
    },
    {
      key: 'batch_number',
      header: 'Batch',
      render: (item: ExpiredDrug) => (
        <span className="font-mono text-sm">{item.batch_number}</span>
      ),
    },
    {
      key: 'quantity_remaining',
      header: 'Stock',
      render: (item: ExpiredDrug) => (
        <span className="font-semibold text-red-600">
          {item.quantity_remaining}
        </span>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Expired On',
      render: (item: ExpiredDrug) => (
        <div>
          <div className="text-sm">
            {new Date(item.expiry_date).toLocaleDateString()}
          </div>
          <div className="text-xs text-red-600 font-medium">
            {item.days_expired} days ago
          </div>
        </div>
      ),
    },
    {
      key: 'loss_value',
      header: 'Loss Value',
      render: (item: ExpiredDrug) => (
        <span className="text-sm font-medium text-red-600">
          {formatCurrency(item.loss_value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: ExpiredDrug) => (
        <Button
          size="sm"
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            handleWriteOff(item);
          }}
        >
          Write Off
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            Inventory Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Stock levels and expiry alerts
          </p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatsCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Drugs"
              value={stats?.total_drugs || 0}
              icon={Pill}
              variant="info"
            />
            <StatCard
              title="Active Batches"
              value={stats?.total_batches || 0}
              icon={Package}
              variant="default"
            />
            <StatCard
              title="Low Stock Items"
              value={stats?.low_stock_count || 0}
              subtitle="Need reorder"
              icon={AlertTriangle}
              variant={
                (stats?.low_stock_count ?? 0) > 0 ? 'warning' : 'default'
              }
            />
            <StatCard
              title="Out of Stock"
              value={stats?.out_of_stock_count || 0}
              icon={XCircle}
              variant={
                (stats?.out_of_stock_count ?? 0) > 0 ? 'danger' : 'default'
              }
            />
          </>
        )}
      </div>

      {/* Expiry Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Expiring in 30 Days"
          value={stats?.expiring_30_days || 0}
          icon={Clock}
          variant={(stats?.expiring_30_days ?? 0) > 0 ? 'danger' : 'success'}
          onClick={() => setActiveSection('near-expiry')}
        />
        <StatCard
          title="Expiring in 60 Days"
          value={stats?.expiring_60_days || 0}
          icon={Calendar}
          variant={(stats?.expiring_60_days ?? 0) > 0 ? 'warning' : 'success'}
          onClick={() => setActiveSection('near-expiry')}
        />
        <StatCard
          title="Expiring in 90 Days"
          value={stats?.expiring_90_days || 0}
          icon={AlertCircle}
          variant="info"
          onClick={() => setActiveSection('near-expiry')}
        />
        <StatCard
          title="Expired Batches"
          value={stats?.expired_batches || 0}
          icon={Ban}
          variant={(stats?.expired_batches ?? 0) > 0 ? 'danger' : 'success'}
          onClick={() => setActiveSection('expired')}
        />
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Stock Value (Cost)
              </p>
              <p
                className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                {formatCurrency(stats?.total_stock_value_cost || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Stock Value (Selling)
              </p>
              <p
                className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                {formatCurrency(stats?.total_stock_value_selling || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Today's Activity
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-green-600">
                  {stats?.dispensed_today_count || 0}
                </span>{' '}
                dispensed,{' '}
                <span className="font-semibold text-blue-600">
                  {stats?.received_today_count || 0}
                </span>{' '}
                received
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'overview'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSection('near-expiry')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'near-expiry'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={14} />
          Near Expiry
          {nearExpiryDrugs && nearExpiryDrugs.length > 0 && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
              {nearExpiryDrugs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSection('expired')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'expired'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Ban size={14} />
          Expired
          {expiredDrugs && expiredDrugs.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {expiredDrugs.length}
            </span>
          )}
        </button>
      </div>

      {/* Section Content */}
      {activeSection === 'overview' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3
              className={`text-lg font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
            >
              Inventory Overview
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Use the tabs above to view near-expiry and expired items
            </p>
          </div>
        </Card>
      )}

      {activeSection === 'near-expiry' && (
        <DataTable
          data={nearExpiryDrugs || []}
          columns={nearExpiryColumns}
          keyField="batch_id"
          isLoading={nearExpiryLoading}
          emptyState={
            <EmptyState
              icon={CheckCircle}
              title="No Near-Expiry Items"
              description="All batches have expiry dates beyond 90 days"
            />
          }
        />
      )}

      {activeSection === 'expired' && (
        <DataTable
          data={expiredDrugs || []}
          columns={expiredColumns}
          keyField="batch_id"
          isLoading={expiredLoading}
          emptyState={
            <EmptyState
              icon={CheckCircle}
              title="No Expired Items"
              description="No expired batches in inventory"
            />
          }
        />
      )}

      {/* Write Off Confirmation */}
      <ConfirmDialog
        isOpen={!!writeOffBatch}
        onClose={() => setWriteOffBatch(null)}
        onConfirm={confirmWriteOff}
        title="Write Off Expired Batch"
        message={`Are you sure you want to write off batch "${writeOffBatch?.batch_number}" of "${writeOffBatch?.drug_name}"? This will remove ${writeOffBatch?.quantity_remaining} units with a value of ${formatCurrency(writeOffBatch?.loss_value || 0)}.`}
        confirmText="Write Off"
        variant="danger"
        isLoading={writeOffMutation.isPending}
      />
    </div>
  );
}
