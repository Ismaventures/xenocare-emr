import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Eye,
  CreditCard,
  XCircle,
  Printer,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  List,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FlaskConical,
  Pill,
  Stethoscope,
  Activity,
  Syringe,
  Bed,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import {
  DataTable,
  StatusBadge,
  EmptyState,
} from '../../../components/ui/DataDisplay';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import {
  InvoiceDTO,
  InvoiceFilters,
  INVOICE_STATUS,
  InvoiceStatus,
  getInvoiceStatusColor,
  formatCurrency,
} from '../dtos/billing.dto';
import {
  useInvoices,
  useCancelInvoice,
  useDeleteMultipleInvoices,
} from '../hooks/useBilling';
import {
  getSourceModuleLabel,
  SOURCE_MODULES,
} from '../dtos/billing-order.dto';

// Category group interface
interface CategoryGroup {
  category: string;
  categoryLabel: string;
  invoices: InvoiceDTO[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

// Get icon for each category
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'lab':
      return <FlaskConical className="h-5 w-5" />;
    case 'pharmacy':
      return <Pill className="h-5 w-5" />;
    case 'consultation':
      return <Stethoscope className="h-5 w-5" />;
    case 'radiology':
      return <Activity className="h-5 w-5" />;
    case 'nursing':
      return <Syringe className="h-5 w-5" />;
    case 'admission':
      return <Bed className="h-5 w-5" />;
    case 'registration':
      return <FileText className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
};

// Get color for each category
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'lab':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'pharmacy':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'consultation':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'radiology':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'nursing':
      return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'admission':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'registration':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

interface InvoiceListProps {
  onViewInvoice: (invoice: InvoiceDTO) => void;
  onRecordPayment: (invoice: InvoiceDTO) => void;
  onPrintInvoice: (invoice: InvoiceDTO) => void;
  externalFilters?: Partial<InvoiceFilters>;
  onDeleteInvoice?: (invoice: InvoiceDTO) => void;
}

export function InvoiceList({
  onViewInvoice,
  onRecordPayment,
  onPrintInvoice,
  externalFilters,
  onDeleteInvoice,
}: InvoiceListProps) {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{
    open: boolean;
    invoiceId: string | null;
  }>({ open: false, invoiceId: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    invoice: InvoiceDTO | null;
  }>({ open: false, invoice: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // View mode: grouped (by category) or list
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  // Merge external filters with local filters + pagination
  const mergedFilters = {
    ...filters,
    ...externalFilters,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data: invoices, isLoading, refetch } = useInvoices(mergedFilters);
  const cancelInvoice = useCancelInvoice();
  const deleteMultipleInvoices = useDeleteMultipleInvoices();

  // Reset page when filters change
  const handleSearch = useCallback((search: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      status: status ? (status as InvoiceStatus) : undefined,
    }));
  }, []);

  const handleCancelInvoice = () => {
    if (cancelConfirm.invoiceId) {
      cancelInvoice.mutate(cancelConfirm.invoiceId);
      setCancelConfirm({ open: false, invoiceId: null });
    }
  };

  const handleDeleteInvoice = () => {
    if (deleteConfirm.invoice && onDeleteInvoice) {
      onDeleteInvoice(deleteConfirm.invoice);
      setDeleteConfirm({ open: false, invoice: null });
    }
  };

  const toggleSelect = (invoiceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    deleteMultipleInvoices.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setShowBulkDeleteConfirm(false);
      },
      onError: () => {
        setShowBulkDeleteConfirm(false);
      },
    });
  };

  // Filter invoices by search query and category
  const filteredInvoices = useMemo(() => {
    return invoices?.filter((invoice) => {
      // Category filter
      if (categoryFilter) {
        const invoiceCategory = (invoice as any)._sourceModule || 'other';
        if (invoiceCategory !== categoryFilter) {
          return false;
        }
      }

      // Search query filter
      if (!filters.search) return true;
      const query = filters.search.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.patient?.first_name?.toLowerCase().includes(query) ||
        invoice.patient?.surname?.toLowerCase().includes(query)
      );
    });
  }, [invoices, filters.search, categoryFilter]);

  // Group invoices by category (source_module)
  const groupedInvoices = useMemo((): CategoryGroup[] => {
    if (!filteredInvoices) return [];

    const groups = new Map<string, CategoryGroup>();

    for (const invoice of filteredInvoices) {
      const category = (invoice as any)._sourceModule || 'other';

      if (!groups.has(category)) {
        groups.set(category, {
          category,
          categoryLabel: getSourceModuleLabel(category),
          invoices: [],
          totalAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
        });
      }

      const group = groups.get(category)!;
      group.invoices.push(invoice);
      group.totalAmount += invoice.total_amount || 0;
      group.paidAmount += invoice.amount_paid || 0;
      group.balanceAmount += invoice.balance || 0;
    }

    // Sort by category label
    return Array.from(groups.values()).sort((a, b) =>
      a.categoryLabel.localeCompare(b.categoryLabel),
    );
  }, [filteredInvoices]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAllCategories = () => {
    setExpandedCategories(new Set(groupedInvoices.map((g) => g.category)));
  };

  // Collapse all categories
  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  const columns = [
    {
      key: 'select',
      header: '',
      render: (invoice: InvoiceDTO) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(invoice.invoice_id);
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {selectedIds.has(invoice.invoice_id) ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
      ),
    },
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (invoice: InvoiceDTO) => (
        <span className="font-medium text-gray-900">
          {invoice.invoice_number}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (invoice: InvoiceDTO) => (
        <div>
          <p className="font-medium text-gray-900">
            {invoice.patient?.first_name} {invoice.patient?.surname}
          </p>
          <p className="text-sm text-gray-500">
            {invoice.patient?.contact_phone}
          </p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (invoice: InvoiceDTO) => (
        <span className="text-sm text-gray-600">
          {invoice.items?.length || 0} item
          {(invoice.items?.length || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total',
      render: (invoice: InvoiceDTO) => (
        <span className="font-medium">
          {formatCurrency(invoice.total_amount)}
        </span>
      ),
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      render: (invoice: InvoiceDTO) => (
        <span className="text-green-600">
          {formatCurrency(invoice.amount_paid)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (invoice: InvoiceDTO) => (
        <span
          className={
            invoice.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'
          }
        >
          {formatCurrency(invoice.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice: InvoiceDTO) => (
        <StatusBadge
          status={invoice.status}
          color={getInvoiceStatusColor(invoice.status)}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (invoice: InvoiceDTO) => (
        <span className="text-sm text-gray-500">
          {new Date(invoice.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice: InvoiceDTO) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewInvoice(invoice)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {invoice.status !== 'Paid' &&
            invoice.status !== 'Cancelled' &&
            !(invoice as any)._source?.includes('billing_order') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRecordPayment(invoice)}
                title="Record Payment"
              >
                <CreditCard className="h-4 w-4 text-green-600" />
              </Button>
            )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPrintInvoice(invoice)}
            title="Print Invoice"
          >
            <Printer className="h-4 w-4" />
          </Button>
          {invoice.status === 'Draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCancelConfirm({ open: true, invoiceId: invoice.invoice_id })
              }
              title="Cancel Invoice"
            >
              <XCircle className="h-4 w-4 text-red-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ open: true, invoice });
            }}
            title="Delete Invoice"
            className="hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  // Get unique categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (!invoices) return [];
    const categories = new Set<string>();
    for (const invoice of invoices) {
      const cat = (invoice as any)._sourceModule;
      if (cat) categories.add(cat);
    }
    return Array.from(categories).map((cat) => ({
      value: cat,
      label: getSourceModuleLabel(
        cat as
          | 'registration'
          | 'consultation'
          | 'nursing'
          | 'admission'
          | 'lab'
          | 'radiology'
          | 'pharmacy',
      ),
    }));
  }, [invoices]);

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-medium text-red-800">
            {selectedIds.size} invoice{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={deleteMultipleInvoices.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Search, Filters, and View Toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search invoices..."
            className="pl-10"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...SOURCE_MODULES.map((mod) => ({
              value: mod,
              label: getSourceModuleLabel(mod),
            })),
          ]}
        />

        {/* Status Filter */}
        <Select
          value={filters.status || ''}
          onChange={(e) => handleStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            ...INVOICE_STATUS.map((s) => ({ value: s, label: s })),
          ]}
        />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            Grouped
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>

        {/* Refresh Button */}
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <Input
            type="date"
            label="From Date"
            value={filters.from_date || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, from_date: e.target.value }))
            }
          />
          <Input
            type="date"
            label="To Date"
            value={filters.to_date || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, to_date: e.target.value }))
            }
          />
          <div className="col-span-2 flex items-end">
            <Button variant="secondary" onClick={() => setFilters({})}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Grouped View Controls */}
      {viewMode === 'grouped' && groupedInvoices.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {groupedInvoices.length} categor
            {groupedInvoices.length === 1 ? 'y' : 'ies'} •{' '}
            {filteredInvoices?.length || 0} invoice
            {(filteredInvoices?.length || 0) !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAllCategories}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAllCategories}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : viewMode === 'grouped' ? (
        /* Grouped View */
        groupedInvoices.length > 0 ? (
          <div className="space-y-3">
            {groupedInvoices.map((group) => {
              const isExpanded = expandedCategories.has(group.category);
              const colorClass = getCategoryColor(group.category);

              return (
                <div
                  key={group.category}
                  className="border rounded-lg overflow-hidden bg-white"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.category)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${colorClass.split(' ')[0]}`}
                      >
                        {getCategoryIcon(group.category)}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">
                          {group.categoryLabel}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {group.invoices.length} invoice
                          {group.invoices.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(group.totalAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Paid</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(group.paidAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p
                          className={`font-semibold ${group.balanceAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}
                        >
                          {formatCurrency(group.balanceAmount)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Invoices */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Invoice #
                              </th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Patient
                              </th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Items
                              </th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Total
                              </th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Paid
                              </th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Balance
                              </th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Status
                              </th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Date
                              </th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.invoices.map((invoice) => (
                              <tr
                                key={invoice.invoice_id}
                                className="hover:bg-white transition-colors cursor-pointer"
                                onClick={() => onViewInvoice(invoice)}
                              >
                                <td className="px-4 py-3">
                                  <span className="font-mono font-medium text-gray-900">
                                    {invoice.invoice_number}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {invoice.patient?.first_name}{' '}
                                      {invoice.patient?.surname}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {invoice.patient?.contact_phone ||
                                        'No phone'}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {invoice.items?.length || 0} item
                                    {(invoice.items?.length || 0) !== 1
                                      ? 's'
                                      : ''}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(invoice.total_amount)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-green-600">
                                    {formatCurrency(invoice.amount_paid)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span
                                    className={
                                      invoice.balance > 0
                                        ? 'text-red-600 font-medium'
                                        : 'text-gray-500'
                                    }
                                  >
                                    {formatCurrency(invoice.balance)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge
                                    status={invoice.status}
                                    color={getInvoiceStatusColor(
                                      invoice.status,
                                    )}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-500">
                                    {new Date(
                                      invoice.created_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewInvoice(invoice);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                      title="View Invoice"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPrintInvoice(invoice);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                      title="Print Invoice"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No invoices found"
            description="Invoices will appear here when billing orders are created"
          />
        )
      ) : /* List View */
      filteredInvoices && filteredInvoices.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredInvoices}
          onRowClick={onViewInvoice}
        />
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No invoices found"
          description="Create a new invoice to get started"
        />
      )}

      {/* Pagination Controls */}
      {filteredInvoices && filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-600">
            Page {page} &middot; {filteredInvoices.length} item
            {filteredInvoices.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={filteredInvoices.length < PAGE_SIZE}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={cancelConfirm.open}
        onClose={() => setCancelConfirm({ open: false, invoiceId: null })}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice? This action cannot be undone."
        variant="danger"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, invoice: null })}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteConfirm.invoice?.invoice_number}? This will permanently delete the invoice, all associated items, and payment records. This action cannot be undone.`}
        variant="danger"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Invoices"
        message={`Are you sure you want to delete ${selectedIds.size} invoice${selectedIds.size > 1 ? 's' : ''}? This will permanently delete all selected invoices, their items, and payment records. This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
