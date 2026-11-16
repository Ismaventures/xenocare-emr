// =============================================================================
// Billing Orders Queue Panel
// Shows pending billing orders grouped by patient/visit for verification
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  Building,
  Banknote,
  Search,
} from 'lucide-react';
import { useBillingQueue } from '../hooks/useBillingOrders';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import {
  BillingQueueItem,
  formatCurrency,
  getSourceModuleLabel,
  getSourceModuleColor,
  getBillingOrderStatusColor,
} from '../dtos/billing-order.dto';

interface BillingOrdersQueuePanelProps {
  onSelectItem: (item: BillingQueueItem) => void;
  onVerifyPayment: (item: BillingQueueItem) => void;
  selectedVisitId?: string;
}

export function BillingOrdersQueuePanel({
  onSelectItem,
  onVerifyPayment,
  selectedVisitId,
}: BillingOrdersQueuePanelProps) {
  const { data: queue, isLoading } = useBillingQueue();
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (visitId: string) => {
    const newExpanded = new Set(expandedVisits);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
    }
    setExpandedVisits(newExpanded);
  };

  const formatWaitTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPaymentCategoryIcon = (category: string) => {
    switch (category) {
      case 'Cash':
        return <Banknote className="h-3 w-3" />;
      case 'POS':
        return <CreditCard className="h-3 w-3" />;
      case 'NHIS':
      case 'Retainership':
        return <Building className="h-3 w-3" />;
      default:
        return <CreditCard className="h-3 w-3" />;
    }
  };

  const getPatientAge = (dob?: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const prev = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prev.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0 && months === 0) {
      const weeks = Math.floor(days / 7);
      const rem = days % 7;
      if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
      if (weeks > 0) return `${weeks}w`;
      return `${days}d`;
    }
    if (years === 0) {
      const parts = [`${months}m`];
      if (days > 0) parts.push(`${days}d`);
      return parts.join(' ');
    }
    const parts = [`${years}y`];
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  };

  // Filter queue items by search query (client-side)
  const filteredQueueItems = useMemo(() => {
    const items = queue || [];
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const patientName =
        `${item.patient.first_name} ${item.patient.surname}`.toLowerCase();
      return patientName.includes(query);
    });
  }, [queue, searchQuery]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
        <SkeletonList count={5} hasAvatar={false} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <Receipt className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Payment Queue</h3>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
          {filteredQueueItems.length}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {filteredQueueItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-7 w-7 text-emerald-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              {searchQuery ? 'No matching patients' : 'All caught up!'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? 'Try a different search'
                : 'No pending billing orders'}
            </p>
          </div>
        ) : (
          filteredQueueItems.map((item) => {
            const isExpanded = expandedVisits.has(item.visit_id);
            const isSelected = selectedVisitId === item.visit_id;

            return (
              <div
                key={item.visit_id || item.patient_id}
                className={`rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                    : 'bg-white border-gray-200 hover:border-emerald-200 hover:shadow-sm'
                }`}
              >
                {/* Patient Header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => onSelectItem(item)}
                >
                  <div className="flex items-start gap-3 mb-2.5">
                    {/* Avatar */}
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                      {item.patient.first_name?.[0]}
                      {item.patient.surname?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {item.patient.first_name} {item.patient.surname}
                        </h4>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            item.visit.priority === 'Emergency'
                              ? 'bg-red-100 text-red-700'
                              : item.visit.priority === 'Urgent'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {item.visit.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>
                          {item.patient.gender}
                          {item.patient.date_of_birth &&
                            ` • ${getPatientAge(item.patient.date_of_birth)}`}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1">
                          {getPaymentCategoryIcon(item.visit.payment_category)}
                          {item.visit.payment_category}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatWaitTime(item.visit.start_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Actions Row */}
                  <div className="flex items-center justify-between pl-12">
                    <div className="flex items-center gap-2">
                      {item.is_nhis ? (
                        <>
                          {item.total_patient_payable === 0 ||
                          item.total_patient_payable === undefined ? (
                            <span className="text-base font-bold text-emerald-600">
                              ₦0
                            </span>
                          ) : (
                            <span className="text-base font-bold text-gray-900">
                              {formatCurrency(item.total_patient_payable)}
                            </span>
                          )}
                          {item.total_gross_amount !== undefined &&
                            item.total_gross_amount !==
                              item.total_patient_payable && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(
                                  item.total_gross_amount ||
                                    item.total_amount_due,
                                )}
                              </span>
                            )}
                          {item.total_patient_payable === 0 ||
                          item.total_patient_payable === undefined ? (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                              Covered
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                              NHIS
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(item.total_amount_due)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-medium">
                        {item.pending_count} item
                        {item.pending_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerifyPayment(item);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          item.is_nhis
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        {item.is_nhis ? 'Verify NHIS' : 'Verify'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.visit_id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isExpanded
                            ? 'bg-gray-100 text-gray-700'
                            : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Order Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 space-y-1">
                    {item.orders.flatMap((order) =>
                      order.items && order.items.length > 0
                        ? order.items.map((billingItem) => (
                            <div
                              key={billingItem.id}
                              className="flex items-center justify-between py-1.5 text-sm"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${getSourceModuleColor(
                                      billingItem.item_type ||
                                        order.source_module,
                                    )}`}
                                  >
                                    {getSourceModuleLabel(
                                      billingItem.item_type ||
                                        order.source_module,
                                    )}
                                  </span>
                                  <span className="text-gray-700 text-xs">
                                    {billingItem.service_name ||
                                      billingItem.item_name ||
                                      order.service_description}
                                  </span>
                                </div>
                                {/* Service fee details for billing admin verification */}
                                <div className="text-[11px] text-gray-500 ml-1 flex items-center gap-2">
                                  <span>
                                    Fee:{' '}
                                    {formatCurrency(
                                      billingItem.gross_amount ||
                                        billingItem.total_price,
                                    )}
                                  </span>
                                  {billingItem.nhis_covered && (
                                    <>
                                      <span className="text-emerald-600">
                                        NHIS (
                                        {billingItem.nhis_percentage || 100}%):{' '}
                                        {formatCurrency(
                                          billingItem.nhis_payable || 0,
                                        )}
                                      </span>
                                      <span className="text-amber-600">
                                        Patient:{' '}
                                        {formatCurrency(
                                          billingItem.patient_payable ??
                                            (billingItem.gross_amount ||
                                              billingItem.total_price),
                                        )}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {billingItem.nhis_covered && (
                                  <>
                                    <span className="text-xs text-gray-400 line-through">
                                      {formatCurrency(
                                        billingItem.gross_amount ||
                                          billingItem.total_price,
                                      )}
                                    </span>
                                    <span className="text-xs px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                                      -{billingItem.nhis_percentage || 100}%
                                    </span>
                                  </>
                                )}
                                <span className="font-semibold text-gray-900 text-xs">
                                  {billingItem.nhis_covered &&
                                  billingItem.patient_payable === 0
                                    ? '₦0'
                                    : formatCurrency(
                                        billingItem.patient_payable ||
                                          billingItem.gross_amount,
                                      )}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${getBillingOrderStatusColor(billingItem.status)}`}
                                >
                                  {billingItem.status}
                                </span>
                              </div>
                            </div>
                          ))
                        : [
                            <div
                              key={order.billing_id}
                              className="flex items-center justify-between py-1.5 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${getSourceModuleColor(order.source_module)}`}
                                >
                                  {getSourceModuleLabel(order.source_module)}
                                </span>
                                <span className="text-gray-700 text-xs">
                                  {order.service_description}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-xs">
                                  {formatCurrency(
                                    order.patient_payable || order.amount_due,
                                  )}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${getBillingOrderStatusColor(order.payment_status)}`}
                                >
                                  {order.payment_status}
                                </span>
                              </div>
                            </div>,
                          ],
                    )}

                    {/* NHIS Summary */}
                    {item.is_nhis && (
                      <div className="pt-2 mt-1 border-t border-gray-200 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Service Cost</span>
                          <span>
                            {formatCurrency(
                              item.total_gross_amount || item.total_amount_due,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-600">
                          <span>NHIS Coverage</span>
                          <span>
                            −{formatCurrency(item.total_nhis_payable || 0)}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between text-sm font-semibold pt-1 border-t border-gray-100 ${
                            item.total_patient_payable === 0
                              ? 'text-emerald-700'
                              : 'text-gray-900'
                          }`}
                        >
                          <span>Patient Pays</span>
                          <span>
                            {item.total_patient_payable === 0
                              ? '₦0 (Fully Covered)'
                              : formatCurrency(item.total_patient_payable)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
