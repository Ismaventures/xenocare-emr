/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import {
  X,
  Calendar,
  CreditCard,
  CheckCircle,
  User,
  FileText,
  Building2,
  DollarSign,
  Tag,
  RefreshCcw,
  Filter,
  Search,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface BillingFilters {
  // Search Filters
  searchQuery: string;
  receiptNumber: string;
  invoiceNumber: string;
  patientName: string;

  // Date Filters
  dateFrom: string;
  dateTo: string;

  // Payment Filters
  paymentMethod: string;
  paymentStatus: string;
  paymentCategory: string;

  // Invoice Filters
  invoiceStatus: string;
  invoiceType: string;

  // Amount Filters
  amountMin: string;
  amountMax: string;

  // Staff/Department Filters
  cashierId: string;
  department: string;

  // Patient/Category Filters
  patientCategory: string;
  insuranceProvider: string;

  // Service Filters
  serviceCategory: string;
}

export const defaultFilters: BillingFilters = {
  searchQuery: '',
  receiptNumber: '',
  invoiceNumber: '',
  patientName: '',
  dateFrom: '',
  dateTo: '',
  paymentMethod: 'all',
  paymentStatus: 'all',
  paymentCategory: 'all',
  invoiceStatus: 'all',
  invoiceType: 'all',
  amountMin: '',
  amountMax: '',
  cashierId: 'all',
  department: 'all',
  patientCategory: 'all',
  insuranceProvider: 'all',
  serviceCategory: 'all',
};

interface BillingFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: BillingFilters;
  onFiltersChange: (filters: BillingFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  staffList?: Array<{ id: string; name: string }>;
}

// =============================================================================
// Component
// =============================================================================

export function BillingFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  staffList = [],
}: BillingFilterPanelProps) {
  const updateFilter = <K extends keyof BillingFilters>(
    key: K,
    value: BillingFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Get active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    // Text search fields - count if not empty
    if (
      [
        'dateFrom',
        'dateTo',
        'amountMin',
        'amountMax',
        'searchQuery',
        'receiptNumber',
        'invoiceNumber',
        'patientName',
      ].includes(key)
    ) {
      return value !== '';
    }
    // Select fields - count if not 'all'
    return value !== 'all' && value !== '';
  }).length;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel - From Right */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Advanced Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Date Range Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Today', days: 0 },
                { label: 'Yesterday', days: 1 },
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'This Month', days: -1 },
                { label: 'Last Month', days: -2 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const today = new Date();
                    let fromDate: Date;
                    let toDate = new Date();

                    if (preset.days === 0) {
                      fromDate = today;
                    } else if (preset.days === 1) {
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - 1);
                      toDate = fromDate;
                    } else if (preset.days === -1) {
                      // This month
                      fromDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1,
                      );
                    } else if (preset.days === -2) {
                      // Last month
                      fromDate = new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        1,
                      );
                      toDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        0,
                      );
                    } else {
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - preset.days);
                    }

                    updateFilter(
                      'dateFrom',
                      fromDate.toISOString().split('T')[0],
                    );
                    updateFilter('dateTo', toDate.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              Payment Method
            </h3>
            <select
              value={filters.paymentMethod}
              onChange={(e) => updateFilter('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="POS">POS/Card</option>
              <option value="Bank_Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Payment Category Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500" />
              Payment Category
            </h3>
            <select
              value={filters.paymentCategory}
              onChange={(e) => updateFilter('paymentCategory', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Categories</option>
              <option value="Cash">Cash Payment</option>
              <option value="NHIS">NHIS</option>
              <option value="DHML">DHML</option>
              <option value="Retainership">Retainership</option>
              <option value="Private">Private/Insurance</option>
            </select>
          </div>

          {/* Invoice Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              Invoice Status
            </h3>
            <select
              value={filters.invoiceStatus}
              onChange={(e) => updateFilter('invoiceStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="outstanding">Outstanding (Unpaid/Partial)</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Outstanding Payment Filter Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Outstanding Payments
            </h3>
            <select
              value={filters.paymentStatus}
              onChange={(e) => updateFilter('paymentStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Payment Status</option>
              <option value="outstanding">Outstanding Only</option>
              <option value="fully_paid">Fully Paid Only</option>
              <option value="overdue">Overdue Only (Past Due Date)</option>
            </select>
            <p className="text-xs text-gray-500">
              Filter by payment status to view debtors and outstanding balances
            </p>
          </div>

          {/* Amount Range Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              Amount Range
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Min (₦)
                </label>
                <input
                  type="number"
                  value={filters.amountMin}
                  onChange={(e) => updateFilter('amountMin', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Max (₦)
                </label>
                <input
                  type="number"
                  value={filters.amountMax}
                  onChange={(e) => updateFilter('amountMax', e.target.value)}
                  placeholder="No limit"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Staff/Cashier Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              Cashier/Staff
            </h3>
            <select
              value={filters.cashierId}
              onChange={(e) => updateFilter('cashierId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Staff</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Department/Source
            </h3>
            <select
              value={filters.department}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Departments</option>
              <option value="Consultation">Consultation</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Radiology">Radiology</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Nursing">Nursing</option>
              <option value="Admission">Admission</option>
              <option value="Emergency">Emergency</option>
              <option value="Procedure">Procedure</option>
            </select>
          </div>

          {/* Service Category Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Service Category
            </h3>
            <select
              value={filters.serviceCategory}
              onChange={(e) => updateFilter('serviceCategory', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Services</option>
              <option value="Consultation">Consultation Fees</option>
              <option value="Laboratory">Lab Tests</option>
              <option value="Radiology">Radiology/Imaging</option>
              <option value="Pharmacy">Medications</option>
              <option value="Procedure">Procedures</option>
              <option value="Admission">Admission/Ward</option>
              <option value="Supplies">Medical Supplies</option>
              <option value="Other">Other Services</option>
            </select>
          </div>

          {/* Patient Category Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              Patient Category
            </h3>
            <select
              value={filters.patientCategory}
              onChange={(e) => updateFilter('patientCategory', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Categories</option>
              <option value="OPD">Out-Patient (OPD)</option>
              <option value="IPD">In-Patient (IPD)</option>
              <option value="Emergency">Emergency</option>
              <option value="VIP">VIP</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          {/* Insurance Provider Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Insurance/HMO Provider
            </h3>
            <select
              value={filters.insuranceProvider}
              onChange={(e) =>
                updateFilter('insuranceProvider', e.target.value)
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="all">All Providers</option>
              <option value="NHIS">NHIS</option>
              <option value="DHML">DHML</option>
              <option value="HMO1">Hygeia HMO</option>
              <option value="HMO2">AXA Mansard</option>
              <option value="HMO3">Leadway Health</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white space-y-3">
          <button
            onClick={onApplyFilters}
            className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Filter Summary Badge
// =============================================================================

export function FilterSummaryBadge({
  filters,
  onClick,
}: {
  filters: BillingFilters;
  onClick: () => void;
}) {
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    // Text search fields - count if not empty
    if (
      [
        'dateFrom',
        'dateTo',
        'amountMin',
        'amountMax',
        'searchQuery',
        'receiptNumber',
        'invoiceNumber',
        'patientName',
      ].includes(key)
    ) {
      return value !== '';
    }
    // Select fields - count if not 'all'
    return value !== 'all' && value !== '';
  });

  if (activeFilters.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
    >
      <Filter className="h-3.5 w-3.5" />
      <span>
        {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''}{' '}
        active
      </span>
    </button>
  );
}
