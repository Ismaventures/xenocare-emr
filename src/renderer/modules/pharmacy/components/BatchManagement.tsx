import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  RotateCcw,
  ArrowUpDown,
  BoxSelect,
} from 'lucide-react';
import { Button, Input, Card } from '../../../components/ui';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import {
  useDrugBatches,
  useWriteOffBatch,
  useUpdateBatch,
  useCreateMultipleBatches,
} from '../hooks/usePharmacy';
import {
  DrugBatchDTO,
  BatchFilters,
  BatchStatus,
  CreateBatchDTO,
} from '../dtos/pharmacy.dto';
import { useToast } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/Modal';
import BatchFormModal from './BatchFormModal';
import BatchDetailModal from './BatchDetailModal';
import MultiBatchFormModal from './MultiBatchFormModal';

// =============================================================================
// Types
// =============================================================================

interface BatchManagementProps {
  drugId?: string;
  drugName?: string;
  showDrugColumn?: boolean;
}

type StatusTab = 'all' | BatchStatus;
type SortField = 'expiry' | 'stock' | 'received' | 'drug';
type SortDir = 'asc' | 'desc';

// =============================================================================
// Helper Functions
// =============================================================================

const getExpiryInfo = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const days = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0)
    return {
      days,
      label: `${Math.abs(days)}d expired`,
      color: 'text-red-600',
      bg: 'bg-red-50',
      ring: 'ring-red-200',
    };
  if (days <= 30)
    return {
      days,
      label: `${days}d left`,
      color: 'text-red-600',
      bg: 'bg-red-50',
      ring: 'ring-red-200',
    };
  if (days <= 60)
    return {
      days,
      label: `${days}d left`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-200',
    };
  if (days <= 90)
    return {
      days,
      label: `${days}d left`,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      ring: 'ring-yellow-200',
    };
  return {
    days,
    label: `${days}d left`,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
  };
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStockPercent = (remaining: number, received: number) => {
  if (received === 0) return 0;
  return Math.round((remaining / received) * 100);
};

const STATUS_CONFIG: Record<
  StatusTab,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgActive: string;
    textActive: string;
  }
> = {
  all: {
    label: 'All Batches',
    icon: Package,
    color: 'text-gray-500',
    bgActive: 'bg-indigo-600',
    textActive: 'text-white',
  },
  active: {
    label: 'Active',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgActive: 'bg-emerald-600',
    textActive: 'text-white',
  },
  depleted: {
    label: 'Depleted',
    icon: TrendingDown,
    color: 'text-gray-400',
    bgActive: 'bg-gray-600',
    textActive: 'text-white',
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgActive: 'bg-red-600',
    textActive: 'text-white',
  },
  quarantine: {
    label: 'Quarantine',
    icon: Shield,
    color: 'text-amber-500',
    bgActive: 'bg-amber-600',
    textActive: 'text-white',
  },
  recalled: {
    label: 'Recalled',
    icon: Ban,
    color: 'text-purple-500',
    bgActive: 'bg-purple-600',
    textActive: 'text-white',
  },
};

// =============================================================================
// BatchRow Component
// =============================================================================

function BatchRow({
  batch,
  showDrugColumn,
  isNightMode,
  onView,
  onEdit,
  onQuarantine,
  onWriteOff,
}: {
  batch: DrugBatchDTO;
  showDrugColumn: boolean;
  isNightMode: boolean;
  onView: () => void;
  onEdit: () => void;
  onQuarantine: () => void;
  onWriteOff: () => void;
}) {
  const expiry = getExpiryInfo(batch.expiry_date);
  const stockPct = getStockPercent(
    batch.quantity_remaining,
    batch.quantity_received,
  );
  const stockBarColor =
    stockPct > 50
      ? 'bg-emerald-500'
      : stockPct > 20
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div
      onClick={onView}
      className={`group flex items-center gap-4 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-all duration-150
        ${
          isNightMode
            ? 'border-slate-700 hover:bg-slate-700/50'
            : 'border-gray-100 hover:bg-indigo-50/40'
        }`}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            batch.status === 'active'
              ? 'bg-emerald-500'
              : batch.status === 'quarantine'
                ? 'bg-amber-500'
                : batch.status === 'expired'
                  ? 'bg-red-500'
                  : batch.status === 'recalled'
                    ? 'bg-purple-500'
                    : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Drug name (conditional) */}
      {showDrugColumn && (
        <div className="w-44 flex-shrink-0 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {batch.drug_name || 'Unknown Drug'}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {batch.drug_code ? `${batch.drug_code}` : ''}
            {batch.strength ? ` · ${batch.strength}` : ''}
          </div>
        </div>
      )}

      {/* Batch number */}
      <div className="w-32 flex-shrink-0">
        <div
          className={`text-sm font-mono font-medium ${isNightMode ? 'text-slate-200' : 'text-gray-800'}`}
        >
          {batch.batch_number}
        </div>
        <div className="text-xs text-gray-400">
          {batch.supplier_name || 'No supplier'}
        </div>
      </div>

      {/* Stock bar */}
      <div className="w-36 flex-shrink-0">
        <div className="flex items-baseline justify-between mb-1">
          <span
            className={`text-sm font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {batch.quantity_remaining}
          </span>
          <span className="text-xs text-gray-400">
            / {batch.quantity_received}
          </span>
        </div>
        <div
          className={`h-1.5 rounded-full overflow-hidden ${isNightMode ? 'bg-slate-600' : 'bg-gray-200'}`}
        >
          <div
            className={`h-full rounded-full transition-all ${stockBarColor}`}
            style={{ width: `${Math.min(stockPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Expiry */}
      <div className="w-36 flex-shrink-0">
        <div
          className={`text-sm ${isNightMode ? 'text-slate-200' : 'text-gray-700'}`}
        >
          {formatDate(batch.expiry_date)}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${expiry.bg} ${expiry.color}`}
        >
          <Clock size={10} />
          {expiry.label}
        </span>
      </div>

      {/* Pricing */}
      <div className="w-28 flex-shrink-0 text-right">
        <div className="text-xs text-gray-400">Cost</div>
        <div
          className={`text-sm font-medium ${isNightMode ? 'text-slate-200' : 'text-gray-700'}`}
        >
          ₦{(batch.cost_price || 0).toLocaleString()}
        </div>
        <div className="text-xs text-emerald-600 font-medium">
          Sell: ₦{(batch.selling_price || 0).toLocaleString()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-slate-600 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
          title="View Details"
        >
          <Eye size={15} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-slate-600 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}
          title="Edit"
        >
          <Edit2 size={15} />
        </button>
        {batch.status === 'active' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuarantine();
            }}
            className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-slate-600 text-slate-400 hover:text-amber-400' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'}`}
            title="Quarantine"
          >
            <Shield size={15} />
          </button>
        )}
        {(batch.status === 'expired' ||
          batch.status === 'quarantine' ||
          batch.quantity_remaining === 0) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWriteOff();
            }}
            className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-slate-600 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-600'}`}
            title="Write Off"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function BatchManagement({
  drugId,
  drugName,
  showDrugColumn = true,
}: BatchManagementProps) {
  const { isNightMode } = useTimeTheme();
  const { showToast } = useToast();

  // State
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('expiry');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedBatch, setSelectedBatch] = useState<DrugBatchDTO | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMultiBatchOpen, setIsMultiBatchOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<DrugBatchDTO | null>(null);
  const [writeOffConfirm, setWriteOffConfirm] = useState<DrugBatchDTO | null>(
    null,
  );

  // Queries — pass null when no drugId so the hook fetches ALL batches
  const {
    data: batchesData,
    isLoading,
    refetch,
  } = useDrugBatches(drugId || null, {});

  // Mutations
  const writeOffBatch = useWriteOffBatch();
  const updateBatch = useUpdateBatch();
  const createMultipleBatches = useCreateMultipleBatches();

  // Compute stats
  const stats = useMemo(() => {
    const all = batchesData || [];
    const active = all.filter((b) => b.status === 'active');
    const expired = all.filter((b) => b.status === 'expired');
    const quarantine = all.filter((b) => b.status === 'quarantine');
    const depleted = all.filter((b) => b.status === 'depleted');
    const recalled = all.filter((b) => b.status === 'recalled');
    const nearExpiry = active.filter((b) => {
      const d = getExpiryInfo(b.expiry_date).days;
      return d > 0 && d <= 90;
    });
    const totalValue = active.reduce(
      (s, b) => s + (b.selling_price || 0) * b.quantity_remaining,
      0,
    );
    return {
      all: all.length,
      active: active.length,
      expired: expired.length,
      quarantine: quarantine.length,
      depleted: depleted.length,
      recalled: recalled.length,
      nearExpiry: nearExpiry.length,
      totalValue,
    };
  }, [batchesData]);

  // Filter & sort
  const batches = useMemo(() => {
    let result = batchesData || [];

    // Status tab filter
    if (statusTab !== 'all') {
      result = result.filter((b) => b.status === statusTab);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.batch_number.toLowerCase().includes(q) ||
          b.supplier_name?.toLowerCase().includes(q) ||
          b.drug_name?.toLowerCase().includes(q) ||
          b.drug_code?.toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'expiry':
          cmp =
            new Date(a.expiry_date).getTime() -
            new Date(b.expiry_date).getTime();
          break;
        case 'stock':
          cmp = a.quantity_remaining - b.quantity_remaining;
          break;
        case 'received':
          cmp =
            new Date(a.received_date || a.created_at).getTime() -
            new Date(b.received_date || b.created_at).getTime();
          break;
        case 'drug':
          cmp = (a.drug_name || '').localeCompare(b.drug_name || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [batchesData, statusTab, searchQuery, sortField, sortDir]);

  // Handlers
  const handleAddBatch = () => {
    setEditingBatch(null);
    setIsFormOpen(true);
  };
  const handleEditBatch = (batch: DrugBatchDTO) => {
    setEditingBatch(batch);
    setIsFormOpen(true);
  };
  const handleViewBatch = (batch: DrugBatchDTO) => {
    setSelectedBatch(batch);
    setIsDetailOpen(true);
  };

  const confirmWriteOff = () => {
    if (writeOffConfirm) {
      writeOffBatch.mutate(
        {
          batchId: writeOffConfirm.batch_id,
          reason: 'Expired or damaged stock',
          performedBy: 'system',
          approvedBy: 'system',
        },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Written Off',
              message: 'Batch has been written off successfully',
            });
            setWriteOffConfirm(null);
          },
          onError: () => {
            showToast({
              type: 'error',
              title: 'Write-off Failed',
              message: 'Failed to write off batch',
            });
          },
        },
      );
    }
  };

  const handleQuarantine = (batch: DrugBatchDTO) => {
    updateBatch.mutate(
      { batch_id: batch.batch_id, status: 'quarantine' },
      {
        onSuccess: () =>
          showToast({
            type: 'success',
            title: 'Quarantined',
            message: 'Batch has been quarantined',
          }),
        onError: () =>
          showToast({
            type: 'error',
            title: 'Failed',
            message: 'Failed to quarantine batch',
          }),
      },
    );
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Count for each status tab
  const tabCounts: Record<StatusTab, number> = {
    all: stats.all,
    active: stats.active,
    depleted: stats.depleted,
    expired: stats.expired,
    quarantine: stats.quarantine,
    recalled: stats.recalled,
  };

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {drugName ? `${drugName} · Batches` : 'Batch Inventory'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Track batch stock, expiry dates, and movements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RotateCcw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="secondary" onClick={() => setIsMultiBatchOpen(true)}>
            <BoxSelect size={16} className="mr-1" /> Add Multiple
          </Button>
          <Button onClick={handleAddBatch}>
            <Plus size={16} className="mr-1" /> Add Batch
          </Button>
        </div>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Batches',
            value: stats.all,
            icon: Package,
            color: 'indigo',
          },
          {
            label: 'Active',
            value: stats.active,
            icon: CheckCircle,
            color: 'emerald',
          },
          {
            label: 'Near Expiry',
            value: stats.nearExpiry,
            icon: AlertTriangle,
            color: 'amber',
          },
          {
            label: 'Stock Value',
            value: `₦${stats.totalValue.toLocaleString()}`,
            icon: TrendingUp,
            color: 'blue',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-4 flex items-center gap-3 ${
              isNightMode
                ? 'bg-slate-800 border border-slate-700'
                : 'bg-white border border-gray-100 shadow-sm'
            }`}
          >
            <div className={`p-2.5 rounded-lg bg-${s.color}-100`}>
              <s.icon size={18} className={`text-${s.color}-600`} />
            </div>
            <div>
              <div
                className={`text-lg font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                {s.value}
              </div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status tabs (pipeline) ───────────────────────────────── */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto pb-1 ${isNightMode ? '' : ''}`}
      >
        {(Object.keys(STATUS_CONFIG) as StatusTab[]).map((tab) => {
          const cfg = STATUS_CONFIG[tab];
          const count = tabCounts[tab];
          const isActive = statusTab === tab;
          if (tab !== 'all' && count === 0) return null;
          return (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${
                  isActive
                    ? `${cfg.bgActive} ${cfg.textActive} shadow-sm`
                    : isNightMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <cfg.icon size={14} />
              {cfg.label}
              <span
                className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20'
                    : isNightMode
                      ? 'bg-slate-700'
                      : 'bg-gray-200'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort bar ────────────────────────────────────── */}
      <div className={`flex items-center gap-3 ${isNightMode ? '' : ''}`}>
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by batch #, drug name, supplier…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border transition-colors outline-none focus:ring-2
              ${
                isNightMode
                  ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-indigo-500/30 placeholder-slate-500'
                  : 'bg-white border-gray-200 text-gray-900 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder-gray-400'
              }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">Sort:</span>
          {[
            { field: 'expiry' as SortField, label: 'Expiry' },
            { field: 'stock' as SortField, label: 'Stock' },
            { field: 'received' as SortField, label: 'Received' },
            ...(showDrugColumn
              ? [{ field: 'drug' as SortField, label: 'Drug' }]
              : []),
          ].map((s) => (
            <button
              key={s.field}
              onClick={() => toggleSort(s.field)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${
                  sortField === s.field
                    ? isNightMode
                      ? 'bg-indigo-900/50 text-indigo-300'
                      : 'bg-indigo-50 text-indigo-700'
                    : isNightMode
                      ? 'text-slate-400 hover:bg-slate-700'
                      : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              {s.label}
              {sortField === s.field && (
                <ArrowUpDown
                  size={12}
                  className={sortDir === 'desc' ? 'rotate-180' : ''}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Batch list ───────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Column header */}
        <div
          className={`flex items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b
          ${isNightMode ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
        >
          <div className="w-2.5" /> {/* status dot */}
          {showDrugColumn && <div className="w-44">Drug</div>}
          <div className="w-32">Batch #</div>
          <div className="w-36">Stock</div>
          <div className="w-36">Expiry</div>
          <div className="w-28 text-right">Price</div>
          <div className="ml-auto">Actions</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading batches…</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div
              className={`p-4 rounded-2xl ${isNightMode ? 'bg-slate-700' : 'bg-gray-100'}`}
            >
              <BoxSelect size={36} className="text-gray-400" />
            </div>
            <div className="text-center">
              <h3
                className={`text-base font-semibold ${isNightMode ? 'text-slate-200' : 'text-gray-700'}`}
              >
                {searchQuery
                  ? 'No matching batches'
                  : statusTab !== 'all'
                    ? `No ${STATUS_CONFIG[statusTab].label.toLowerCase()} batches`
                    : 'No batches yet'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first batch to start tracking inventory'}
              </p>
            </div>
            {!searchQuery && statusTab === 'all' && (
              <Button onClick={handleAddBatch}>
                <Plus size={16} className="mr-1" /> Add First Batch
              </Button>
            )}
          </div>
        ) : (
          <div>
            {batches.map((batch) => (
              <BatchRow
                key={batch.batch_id}
                batch={batch}
                showDrugColumn={showDrugColumn}
                isNightMode={isNightMode}
                onView={() => handleViewBatch(batch)}
                onEdit={() => handleEditBatch(batch)}
                onQuarantine={() => handleQuarantine(batch)}
                onWriteOff={() => setWriteOffConfirm(batch)}
              />
            ))}
          </div>
        )}

        {/* Footer count */}
        {batches.length > 0 && (
          <div
            className={`px-4 py-2.5 text-xs border-t ${
              isNightMode
                ? 'bg-slate-800/40 text-slate-400 border-slate-700'
                : 'bg-gray-50 text-gray-500 border-gray-100'
            }`}
          >
            Showing {batches.length} of {stats.all} batch
            {stats.all !== 1 ? 'es' : ''}
          </div>
        )}
      </Card>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <BatchFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBatch(null);
        }}
        batch={editingBatch}
        drugId={drugId}
      />

      <MultiBatchFormModal
        isOpen={isMultiBatchOpen}
        onClose={() => setIsMultiBatchOpen(false)}
        isLoading={createMultipleBatches.isPending}
        onSubmit={async (batches: CreateBatchDTO[]) => {
          const result = await createMultipleBatches.mutateAsync(batches);
          if (result.failed.length === 0) {
            showToast({
              type: 'success',
              title: 'Batches Created',
              message: `${result.successful.length} batch${result.successful.length !== 1 ? 'es' : ''} added successfully`,
            });
            setIsMultiBatchOpen(false);
          } else {
            showToast({
              type: 'warning',
              title: 'Partial Success',
              message: `${result.successful.length} created, ${result.failed.length} failed`,
            });
            if (result.successful.length > 0) {
              setIsMultiBatchOpen(false);
            }
          }
        }}
      />

      <BatchDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
        onEdit={(batch) => {
          setIsDetailOpen(false);
          handleEditBatch(batch);
        }}
      />

      <ConfirmDialog
        isOpen={!!writeOffConfirm}
        onClose={() => setWriteOffConfirm(null)}
        onConfirm={confirmWriteOff}
        title="Write Off Batch"
        message={`Are you sure you want to write off batch "${writeOffConfirm?.batch_number}"? This will remove ${writeOffConfirm?.quantity_remaining} units from inventory.`}
        confirmText="Write Off"
        variant="danger"
        isLoading={writeOffBatch.isPending}
      />
    </div>
  );
}
