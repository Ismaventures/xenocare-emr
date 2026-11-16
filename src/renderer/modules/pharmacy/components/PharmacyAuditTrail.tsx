import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Filter,
  Clock,
  Package,
  DollarSign,
  Edit3,
  ArrowRight,
  User,
  Activity,
  Layers,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button, Card, EmptyState } from '../../../components/ui';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import { usePharmacyAuditTrail } from '../hooks/usePharmacy';
import { useToast } from '../../../components/ui/Toast';
import type { PharmacyAuditEntry } from '../api/pharmacy.api';

// =============================================================================
// Event Type Config
// =============================================================================

const eventTypeConfig: Record<
  PharmacyAuditEntry['event_type'],
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    dotColor: string;
  }
> = {
  stock_movement: {
    label: 'Stock Movement',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  price_change: {
    label: 'Price Change',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  batch_update: {
    label: 'Batch Update',
    icon: Layers,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    dotColor: 'bg-purple-500',
  },
  drug_update: {
    label: 'Drug Update',
    icon: Edit3,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
  },
};

type EventFilter = 'all' | PharmacyAuditEntry['event_type'];

// =============================================================================
// Helpers
// =============================================================================

function fmtTimestamp(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// =============================================================================
// Audit Entry Row
// =============================================================================

function AuditRow({
  entry,
  isNightMode,
}: {
  entry: PharmacyAuditEntry;
  isNightMode: boolean;
}) {
  const cfg = eventTypeConfig[entry.event_type] || eventTypeConfig.drug_update;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex gap-4 p-4 rounded-xl border transition-colors ${
        isNightMode
          ? 'bg-slate-800 border-slate-700 hover:bg-slate-750'
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 p-2.5 rounded-xl ${cfg.bgColor} self-start`}
      >
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-sm font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
              >
                {entry.action}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bgColor} ${cfg.color}`}
              >
                {cfg.label}
              </span>
            </div>
            <p
              className={`text-sm mt-0.5 ${isNightMode ? 'text-slate-300' : 'text-gray-600'}`}
            >
              {entry.description}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400">{timeAgo(entry.timestamp)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fmtTimestamp(entry.timestamp)}
            </p>
          </div>
        </div>

        {/* Entity name */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <FileText size={12} className="text-gray-400" />
            <span
              className={`text-xs font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}
            >
              {entry.entity_name}
            </span>
          </div>

          {/* Old → New Value */}
          {(entry.old_value || entry.new_value) && (
            <div className="flex items-center gap-1.5 text-xs">
              {entry.old_value && (
                <span
                  className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'} line-through`}
                >
                  {entry.old_value}
                </span>
              )}
              {entry.old_value && entry.new_value && (
                <ArrowRight size={12} className="text-gray-400" />
              )}
              {entry.new_value && (
                <span
                  className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}
                >
                  {entry.new_value}
                </span>
              )}
            </div>
          )}

          {/* Performer */}
          <div className="flex items-center gap-1.5 ml-auto">
            <User size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">
              {entry.performer_name || 'System'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PharmacyAuditTrail() {
  const { isNightMode } = useTimeTheme();
  const { showToast } = useToast();
  const { data: entries = [], isLoading, refetch } = usePharmacyAuditTrail();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter>('all');

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let rows = entries;
    if (filter !== 'all') {
      rows = rows.filter((e) => e.event_type === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.entity_name.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.performer_name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [entries, filter, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: entries.length,
      stock_movement: entries.filter((e) => e.event_type === 'stock_movement')
        .length,
      price_change: entries.filter((e) => e.event_type === 'price_change')
        .length,
      batch_update: entries.filter((e) => e.event_type === 'batch_update')
        .length,
      drug_update: entries.filter((e) => e.event_type === 'drug_update').length,
    };
  }, [entries]);

  const handleRefresh = () => {
    refetch();
    showToast({
      type: 'info',
      title: 'Refreshing',
      message: 'Updating audit trail...',
    });
  };

  const filterOptions: { id: EventFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Activity', count: stats.total },
    {
      id: 'stock_movement',
      label: 'Stock Movements',
      count: stats.stock_movement,
    },
    { id: 'price_change', label: 'Price Changes', count: stats.price_change },
    { id: 'batch_update', label: 'Batch Updates', count: stats.batch_update },
    { id: 'drug_update', label: 'Drug Updates', count: stats.drug_update },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
            >
              Audit Trail
            </h2>
            <p className="text-sm text-gray-500">Loading audit data...</p>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border animate-pulse ${
                isNightMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-72 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-xl font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            Pharmacy Audit Trail
          </h2>
          <p className="text-sm text-gray-500">
            Track all changes, stock movements, and price modifications in the
            pharmacy module
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRefresh}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div
        className={`flex items-center gap-6 px-5 py-3 rounded-xl border ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-indigo-500" />
          <span className="text-xs text-gray-500">Total Events:</span>
          <span
            className={`text-sm font-bold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
          >
            {stats.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Package size={14} className="text-blue-500" />
          <span className="text-xs text-gray-500">Stock:</span>
          <span className="text-sm font-bold text-blue-600">
            {stats.stock_movement}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-amber-500" />
          <span className="text-xs text-gray-500">Price:</span>
          <span className="text-sm font-bold text-amber-600">
            {stats.price_change}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-purple-500" />
          <span className="text-xs text-gray-500">Batch:</span>
          <span className="text-sm font-bold text-purple-600">
            {stats.batch_update}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Edit3 size={14} className="text-green-500" />
          <span className="text-xs text-gray-500">Drug:</span>
          <span className="text-sm font-bold text-green-600">
            {stats.drug_update}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries by drug, action, or performer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
              isNightMode
                ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-primary-500`}
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-gray-400 mr-1" />
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === opt.id
                  ? isNightMode
                    ? 'bg-primary-700 text-white'
                    : 'bg-primary-100 text-primary-700'
                  : isNightMode
                    ? 'text-slate-400 hover:bg-slate-700'
                    : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
              {opt.count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0 rounded-full text-[10px] ${
                    filter === opt.id
                      ? 'bg-white/20'
                      : isNightMode
                        ? 'bg-slate-600'
                        : 'bg-gray-200'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Entries */}
      {filteredEntries.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Shield}
            title="No Audit Entries"
            description={
              search || filter !== 'all'
                ? 'No entries match your current filter. Try adjusting your search or filter.'
                : 'Audit records will appear here as changes are made in the pharmacy module — stock movements, price changes, batch updates, and drug modifications.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} isNightMode={isNightMode} />
          ))}

          {filteredEntries.length >= 300 && (
            <div
              className={`text-center py-4 text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-400'}`}
            >
              <AlertTriangle size={14} className="inline mr-1" />
              Showing most recent 300 entries. Older entries may not be
              displayed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
