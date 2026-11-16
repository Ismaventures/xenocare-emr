// =============================================================================
// Approved Requests History Component
// Shows history of all approved/verified requests across all modules
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Building,
  FlaskConical,
  Stethoscope,
  Pill,
  X,
  Download,
  Printer,
} from 'lucide-react';
import { useVerifiedReceipts } from '../hooks/useBillingOrders';
import {
  BillingOrderDTO,
  BillingOrderItemDTO,
  SourceModule,
  formatCurrency,
} from '../dtos/billing-order.dto';
import { useAuth } from '../../../contexts/AuthContext';
import {
  billingOrderToReceiptData,
  generateReceiptPDF,
} from '../utils/receiptPrint';

// =============================================================================
// Types
// =============================================================================

interface ApprovedRequestsHistoryProps {
  /** Filter by specific source module (lab, radiology, pharmacy, etc.) */
  sourceModule?: SourceModule;
  /** Title override for the component header */
  title?: string;
  /** Whether to show the module filter dropdown */
  showModuleFilter?: boolean;
}

interface ExpandedReceiptDetails {
  receipt: BillingOrderDTO;
  isExpanded: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

const getSourceModuleIcon = (module: SourceModule | string | undefined) => {
  switch (module) {
    case 'lab':
      return <FlaskConical className="h-4 w-4 text-purple-600" />;
    case 'radiology':
      return <FileText className="h-4 w-4 text-blue-600" />;
    case 'pharmacy':
      return <Pill className="h-4 w-4 text-green-600" />;
    case 'consultation':
      return <Stethoscope className="h-4 w-4 text-teal-600" />;
    case 'nursing':
      return <User className="h-4 w-4 text-pink-600" />;
    case 'admission':
      return <Building className="h-4 w-4 text-orange-600" />;
    case 'procedure':
      return <FileText className="h-4 w-4 text-indigo-600" />;
    default:
      return <CreditCard className="h-4 w-4 text-gray-600" />;
  }
};

const getSourceModuleLabel = (
  module: SourceModule | string | undefined,
): string => {
  switch (module) {
    case 'lab':
      return 'Laboratory';
    case 'radiology':
      return 'Radiology';
    case 'pharmacy':
      return 'Pharmacy';
    case 'consultation':
      return 'Consultation';
    case 'nursing':
      return 'Nursing';
    case 'admission':
      return 'Admission';
    case 'procedure':
      return 'Procedure';
    case 'registration':
      return 'Registration';
    default:
      return module
        ? module.charAt(0).toUpperCase() + module.slice(1)
        : 'Service';
  }
};

const getSourceModuleColor = (
  module: SourceModule | string | undefined,
): string => {
  switch (module) {
    case 'lab':
      return 'bg-purple-100 text-purple-800';
    case 'radiology':
      return 'bg-blue-100 text-blue-800';
    case 'pharmacy':
      return 'bg-green-100 text-green-800';
    case 'consultation':
      return 'bg-teal-100 text-teal-800';
    case 'nursing':
      return 'bg-pink-100 text-pink-800';
    case 'admission':
      return 'bg-orange-100 text-orange-800';
    case 'procedure':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =============================================================================
// Component
// =============================================================================

export function ApprovedRequestsHistory({
  sourceModule,
  title = 'Approved Requests History',
  showModuleFilter = true,
}: ApprovedRequestsHistoryProps) {
  const { staff } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [moduleFilter, setModuleFilter] = useState<SourceModule | ''>(
    sourceModule || '',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedReceipt, setSelectedReceipt] =
    useState<BillingOrderDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch verified receipts
  const { data: receipts, isLoading } = useVerifiedReceipts({
    from_date: dateFrom || undefined,
    to_date: dateTo || undefined,
    search: searchQuery || undefined,
  });

  // Filter receipts by source module if specified
  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];

    let filtered = receipts;

    // Filter by module
    const activeModuleFilter = moduleFilter || sourceModule;
    if (activeModuleFilter) {
      filtered = filtered.filter((r) => r.source_module === activeModuleFilter);
    }

    // Filter by search query (patient name, receipt number, EMR)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const patientName =
          `${r.patient?.first_name || ''} ${r.patient?.surname || ''}`.toLowerCase();
        const receiptNumber = (r.receipt_number || '').toLowerCase();
        const emr = ((r.patient as any)?.emr_number || '').toLowerCase();
        return (
          patientName.includes(query) ||
          receiptNumber.includes(query) ||
          emr.includes(query)
        );
      });
    }

    return filtered;
  }, [receipts, moduleFilter, sourceModule, searchQuery]);

  // Toggle row expansion
  const toggleRowExpansion = (receiptId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });
  };

  // View receipt details
  const handleViewReceipt = (receipt: BillingOrderDTO) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  // Print receipt
  const handlePrintReceipt = async (receipt: BillingOrderDTO) => {
    try {
      const issuerName = staff
        ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
        : 'System';
      const receiptData = billingOrderToReceiptData(receipt, issuerName);
      const doc = await generateReceiptPDF(receiptData);

      if (window.electron?.pdf?.saveAndOpen) {
        const pdfBlob = doc.output('blob');
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const pdfData = Array.from(new Uint8Array(pdfArrayBuffer));
        const filename = `Receipt_${receiptData.receiptNumber}_${Date.now()}.pdf`;
        await window.electron.pdf.saveAndOpen(filename, pdfData);
      } else {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to print receipt:', error);
    }
  };

  // Download receipt
  const handleDownloadReceipt = async (receipt: BillingOrderDTO) => {
    try {
      const issuerName = staff
        ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
        : 'System';
      const receiptData = billingOrderToReceiptData(receipt, issuerName);
      const doc = await generateReceiptPDF(receiptData);
      doc.save(`Receipt_${receiptData.receiptNumber}.pdf`);
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    if (!sourceModule) {
      setModuleFilter('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <History className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              View all approved and verified payment requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredReceipts.length} record
            {filteredReceipts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              showFilters
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Patient, Receipt #, EMR..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Module Filter */}
            {showModuleFilter && !sourceModule && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module
                </label>
                <select
                  value={moduleFilter}
                  onChange={(e) =>
                    setModuleFilter(e.target.value as SourceModule | '')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Modules</option>
                  <option value="consultation">Consultation</option>
                  <option value="lab">Laboratory</option>
                  <option value="radiology">Radiology</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="nursing">Nursing</option>
                  <option value="admission">Admission</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
            )}

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading history...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-8 text-center">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No approved requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || dateFrom || dateTo || moduleFilter
                ? 'Try adjusting your filters'
                : 'Approved requests will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Approved By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map((receipt) => (
                  <React.Fragment key={receipt.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRowExpansion(receipt.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {expandedRows.has(receipt.id) ? (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                          <span className="font-mono text-sm font-medium text-green-700">
                            {receipt.receipt_number || receipt.order_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {receipt.patient?.first_name}{' '}
                            {receipt.patient?.surname}
                          </p>
                          <p className="text-xs text-gray-500">
                            EMR:{' '}
                            {(receipt.patient as Record<string, any>)
                              ?.emr_number || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getSourceModuleColor(
                            receipt.source_module,
                          )}`}
                        >
                          {getSourceModuleIcon(receipt.source_module)}
                          {getSourceModuleLabel(receipt.source_module)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-900">
                            {receipt.requested_by_staff
                              ? `${receipt.requested_by_staff.first_name} ${receipt.requested_by_staff.last_name}`
                              : receipt.created_by_staff
                                ? `${receipt.created_by_staff.first_name} ${receipt.created_by_staff.last_name}`
                                : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-900">
                            {receipt.verified_by_staff
                              ? `${receipt.verified_by_staff.first_name} ${receipt.verified_by_staff.last_name}`
                              : receipt.cashier
                                ? `${receipt.cashier.first_name} ${receipt.cashier.last_name}`
                                : typeof receipt.verified_by === 'string' &&
                                    !receipt.verified_by.includes('-')
                                  ? receipt.verified_by
                                  : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(
                              receipt.verified_at || receipt.created_at,
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(
                              receipt.patient_payable ||
                                receipt.net_amount ||
                                0,
                            )}
                          </p>
                          {receipt.nhis_covered &&
                            (receipt.nhis_payable || 0) > 0 && (
                              <p className="text-xs text-green-600">
                                NHIS:{' '}
                                {formatCurrency(receipt.nhis_payable || 0)}
                              </p>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewReceipt(receipt)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(receipt)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(receipt)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row - Item Details */}
                    {expandedRows.has(receipt.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="ml-8 space-y-3">
                            {/* Items List */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Items ({receipt.items?.length || 0})
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                        Item
                                      </th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">
                                        Qty
                                      </th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                        Unit Price
                                      </th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                        Total
                                      </th>
                                      {receipt.nhis_covered && (
                                        <>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                            NHIS
                                          </th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                            Patient
                                          </th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {receipt.items?.map((item, idx) => (
                                      <tr key={item.id || idx}>
                                        <td className="px-3 py-2 text-sm text-gray-900">
                                          {item.item_name || item.service_name}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-600 text-center">
                                          {item.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                          {formatCurrency(
                                            item.unit_cost ||
                                              item.unit_price ||
                                              0,
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                          {formatCurrency(
                                            item.gross_amount ||
                                              item.total_price ||
                                              0,
                                          )}
                                        </td>
                                        {receipt.nhis_covered && (
                                          <>
                                            <td className="px-3 py-2 text-sm text-green-600 text-right">
                                              {formatCurrency(
                                                item.nhis_payable || 0,
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                              {formatCurrency(
                                                item.patient_payable || 0,
                                              )}
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Additional Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">
                                  Payment Method:
                                </span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {receipt.payment_method || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Order #:</span>
                                <span className="ml-2 font-mono text-gray-900">
                                  {receipt.order_number}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <span className="ml-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {receipt.status}
                                  </span>
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Phone:</span>
                                <span className="ml-2 text-gray-900">
                                  {receipt.patient?.contact_phone || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Request Details
                  </h3>
                  <p className="text-sm text-green-100">
                    {selectedReceipt.receipt_number ||
                      selectedReceipt.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReceipt(null);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Patient & Request Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Patient Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-gray-900">
                      {selectedReceipt.patient?.first_name}{' '}
                      {selectedReceipt.patient?.surname}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">EMR #:</span>{' '}
                      <span className="font-bold text-green-700">
                        {(selectedReceipt.patient as Record<string, any>)
                          ?.emr_number || 'N/A'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>{' '}
                      {selectedReceipt.patient?.contact_phone || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Request Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Module:</span>{' '}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSourceModuleColor(selectedReceipt.source_module)}`}
                      >
                        {getSourceModuleLabel(selectedReceipt.source_module)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Requested By:</span>{' '}
                      <span className="text-gray-900">
                        {selectedReceipt.requested_by_staff
                          ? `${selectedReceipt.requested_by_staff.first_name} ${selectedReceipt.requested_by_staff.last_name}`
                          : selectedReceipt.created_by_staff
                            ? `${selectedReceipt.created_by_staff.first_name} ${selectedReceipt.created_by_staff.last_name}`
                            : 'N/A'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Approved By:</span>{' '}
                      <span className="text-green-700 font-medium">
                        {selectedReceipt.verified_by_staff
                          ? `${selectedReceipt.verified_by_staff.first_name} ${selectedReceipt.verified_by_staff.last_name}`
                          : selectedReceipt.cashier
                            ? `${selectedReceipt.cashier.first_name} ${selectedReceipt.cashier.last_name}`
                            : typeof selectedReceipt.verified_by === 'string' &&
                                !selectedReceipt.verified_by.includes('-')
                              ? selectedReceipt.verified_by
                              : 'N/A'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Date:</span>{' '}
                      {formatDate(
                        selectedReceipt.verified_at ||
                          selectedReceipt.created_at,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Items ({selectedReceipt.items?.length || 0})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          Total
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                          NHIS %
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          NHIS Covers
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                          Patient Pays
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedReceipt.items?.map((item, idx) => {
                        const itemTotal =
                          item.gross_amount || item.total_price || 0;
                        const nhisPercentage = item.nhis_percentage || 0;
                        const nhisPayable = item.nhis_payable || 0;
                        const patientPayable =
                          item.patient_payable ?? itemTotal - nhisPayable;
                        const hasNhis = item.nhis_covered && nhisPercentage > 0;

                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.item_name || item.service_name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-center">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">
                              {formatCurrency(
                                item.unit_cost || item.unit_price || 0,
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(itemTotal)}
                            </td>
                            <td className="px-4 py-2 text-sm text-center">
                              {hasNhis ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  {nhisPercentage}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-emerald-600">
                              {hasNhis
                                ? `-${formatCurrency(nhisPayable)}`
                                : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                              {formatCurrency(patientPayable)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(
                        selectedReceipt.patient_payable ||
                          selectedReceipt.net_amount ||
                          0,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CreditCard className="h-4 w-4 mr-1.5" />
                      {selectedReceipt.payment_method || 'N/A'}
                    </span>
                  </div>
                </div>
                {selectedReceipt.nhis_covered &&
                  (selectedReceipt.nhis_payable || 0) > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gross Amount:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedReceipt.gross_amount ||
                              selectedReceipt.total_amount ||
                              0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-green-700 mt-1">
                        <span>
                          NHIS Coverage ({selectedReceipt.nhis_percentage}%):
                        </span>
                        <span className="font-medium">
                          -{formatCurrency(selectedReceipt.nhis_payable || 0)}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadReceipt(selectedReceipt)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovedRequestsHistory;
