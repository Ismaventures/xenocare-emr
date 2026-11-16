// =============================================================================
// NHIS Pre-Authorization Configuration Component
// =============================================================================
// Allows admins to search across all service catalogues (drugs, lab tests,
// imaging, procedures) and batch-toggle the requires_nhis_authorization flag.
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Loader2,
  Pill,
  FlaskConical,
  ScanLine,
  Scissors,
  Filter,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  usePreAuthRequiredServices,
  useSearchCatalogueServices,
  useTogglePreAuth,
} from '../hooks';
import type { CatalogueServiceItem } from '../api/nhis.api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVICE_TYPE_META: Record<
  CatalogueServiceItem['service_type'],
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  Drug: {
    label: 'Drug',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: Pill,
  },
  Lab: {
    label: 'Lab Test',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: FlaskConical,
  },
  Imaging: {
    label: 'Imaging',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: ScanLine,
  },
  Procedure: {
    label: 'Procedure',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50 border-teal-200',
    icon: Scissors,
  },
};

type ServiceTypeFilter = CatalogueServiceItem['service_type'] | 'All';

function Badge({ item }: { item: CatalogueServiceItem }) {
  const meta = SERVICE_TYPE_META[item.service_type];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bgColor} ${meta.color}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '—';
  return `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NhisPreAuthConfig() {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ServiceTypeFilter>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removeSelectedIds, setRemoveSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Debounce search
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 350);
  }, []);

  // --- Queries & Mutations ---
  const {
    data: preAuthServices = [],
    isLoading: loadingPreAuth,
    refetch: refetchPreAuth,
  } = usePreAuthRequiredServices();
  const { data: searchResults = [], isFetching: searching } =
    useSearchCatalogueServices(debouncedQuery);
  const toggleMutation = useTogglePreAuth();

  // Filter search results: remove items already in preAuth list, apply type filter
  const preAuthIdSet = useMemo(
    () => new Set(preAuthServices.map((s) => s.id)),
    [preAuthServices],
  );

  const filteredSearchResults = useMemo(() => {
    let list = searchResults.filter((s) => !preAuthIdSet.has(s.id));
    if (typeFilter !== 'All')
      list = list.filter((s) => s.service_type === typeFilter);
    return list;
  }, [searchResults, preAuthIdSet, typeFilter]);

  const filteredPreAuth = useMemo(() => {
    if (typeFilter === 'All') return preAuthServices;
    return preAuthServices.filter((s) => s.service_type === typeFilter);
  }, [preAuthServices, typeFilter]);

  // --- Handlers ---
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRemoveSelect = (id: string) => {
    setRemoveSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSearch = () => {
    setSelectedIds(new Set(filteredSearchResults.map((s) => s.id)));
  };

  const clearSearchSelection = () => setSelectedIds(new Set());

  const selectAllPreAuth = () => {
    setRemoveSelectedIds(new Set(filteredPreAuth.map((s) => s.id)));
  };

  const clearPreAuthSelection = () => setRemoveSelectedIds(new Set());

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    const items = searchResults
      .filter((s) => selectedIds.has(s.id))
      .map((s) => ({ id: s.id, service_type: s.service_type }));
    try {
      const result = await toggleMutation.mutateAsync({ items, value: true });
      if (result.success) {
        showToast(
          'success',
          `${result.updated} service(s) now require NHIS pre-authorization`,
        );
        setSelectedIds(new Set());
        setSearchQuery('');
        setDebouncedQuery('');
        refetchPreAuth();
      } else {
        showToast('error', result.errors.join(', '));
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to update');
    }
  };

  const handleRemoveSelected = async () => {
    if (removeSelectedIds.size === 0) return;
    const items = preAuthServices
      .filter((s) => removeSelectedIds.has(s.id))
      .map((s) => ({ id: s.id, service_type: s.service_type }));
    try {
      const result = await toggleMutation.mutateAsync({ items, value: false });
      if (result.success) {
        showToast(
          'success',
          `${result.updated} service(s) no longer require NHIS pre-authorization`,
        );
        setRemoveSelectedIds(new Set());
        refetchPreAuth();
      } else {
        showToast('error', result.errors.join(', '));
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to update');
    }
  };

  const handleRemoveSingle = async (item: CatalogueServiceItem) => {
    try {
      const result = await toggleMutation.mutateAsync({
        items: [{ id: item.id, service_type: item.service_type }],
        value: false,
      });
      if (result.success) {
        showToast(
          'success',
          `"${item.name}" no longer requires pre-authorization`,
        );
        refetchPreAuth();
      } else {
        showToast('error', result.errors.join(', '));
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to update');
    }
  };

  // --- Render ---
  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pb-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">
            Pre-Authorization Configuration
          </p>
          <p className="text-xs text-green-700 mt-1">
            Services flagged here will require NHIS desk approval before they
            can be performed for NHIS patients. Search for any service — drugs,
            lab tests, imaging scans, or procedures — and add them in bulk.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEARCH & ADD SECTION                                               */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Search &amp; Add Services
            </h2>
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            {(
              [
                'All',
                'Drug',
                'Lab',
                'Imaging',
                'Procedure',
              ] as ServiceTypeFilter[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  typeFilter === t
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700'
                }`}
              >
                {t === 'All' ? 'All Types' : SERVICE_TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services by name or code (e.g. Paracetamol, MRI, CBC, Appendectomy)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 animate-spin" />
            )}
          </div>
        </div>

        {/* Search results */}
        {debouncedQuery.length >= 2 && (
          <div className="max-h-[420px] overflow-y-auto">
            {/* Toolbar */}
            {filteredSearchResults.length > 0 && (
              <div className="sticky top-0 z-10 bg-gray-50 px-5 py-2 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={
                      selectedIds.size === filteredSearchResults.length
                        ? clearSearchSelection
                        : selectAllSearch
                    }
                    className="text-xs text-green-700 font-medium hover:underline"
                  >
                    {selectedIds.size === filteredSearchResults.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  <span className="text-xs text-gray-500">
                    {selectedIds.size} of {filteredSearchResults.length}{' '}
                    selected
                  </span>
                </div>
                <button
                  disabled={selectedIds.size === 0 || toggleMutation.isPending}
                  onClick={handleAddSelected}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {toggleMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add Selected ({selectedIds.size})
                </button>
              </div>
            )}

            {/* List */}
            {filteredSearchResults.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                {searching
                  ? 'Searching…'
                  : 'No services found matching your search.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-[41px] bg-white z-[5]">
                  <tr className="border-b border-gray-100">
                    <th className="w-10 px-3 py-2" />
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                      Service
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                      Type
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                      Code
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">
                      Price
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">
                      NHIS Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSearchResults.map((item) => {
                    const checked = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`cursor-pointer border-b border-gray-50 transition-colors ${
                          checked ? 'bg-green-50/60' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge item={item} />
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                          {item.code || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {formatCurrency(item.nhis_price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Idle state */}
        {debouncedQuery.length < 2 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Type at least 2 characters to search across all service catalogues.
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* CURRENT PRE-AUTH SERVICES LIST                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Services Requiring Pre-Authorization
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({filteredPreAuth.length})
              </span>
            </h2>
          </div>

          {filteredPreAuth.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={
                  removeSelectedIds.size === filteredPreAuth.length
                    ? clearPreAuthSelection
                    : selectAllPreAuth
                }
                className="text-xs text-gray-600 font-medium hover:underline"
              >
                {removeSelectedIds.size === filteredPreAuth.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              {removeSelectedIds.size > 0 && (
                <button
                  disabled={toggleMutation.isPending}
                  onClick={handleRemoveSelected}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {toggleMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Remove Selected ({removeSelectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>

        {loadingPreAuth ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pre-authorization services…
          </div>
        ) : filteredPreAuth.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShieldCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No services are currently flagged as requiring pre-authorization.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Use the search above to find and add services.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-[5]">
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-3 py-2" />
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                    Service
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                    Type
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">
                    Code
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">
                    Price
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">
                    NHIS Price
                  </th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredPreAuth.map((item) => {
                  const checked = removeSelectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 transition-colors ${
                        checked ? 'bg-red-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => toggleRemoveSelect(item.id)}>
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-red-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge item={item} />
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                        {item.code || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700">
                        {formatCurrency(item.nhis_price)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveSingle(item)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove pre-auth requirement"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
