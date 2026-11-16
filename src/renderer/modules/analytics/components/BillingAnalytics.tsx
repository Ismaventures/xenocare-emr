// =============================================================================
// Billing Analytics Component
// Daily revenue by payment method, NHIS claims, wait times per department
// =============================================================================

import React from 'react';
import {
  CreditCard,
  DollarSign,
  Clock,
  TrendingUp,
  Shield,
  Building2,
  Banknote,
  Activity,
} from 'lucide-react';
import { SkeletonDashboard } from '../../../components/ui/SkeletonLoader';
import { Card, StatsCard } from '../../../components/ui';
import { SimpleBarChart, DonutChart, HorizontalBarChart } from './Charts';
import {
  useRevenueByPaymentMethod,
  useOutstandingNHISClaims,
  useDepartmentWaitTimes,
} from '../hooks/useAnalytics';
import {
  isNhisCategory,
  isNhisFeatureEnabled,
} from '../../../config/features';

// =============================================================================
// Types
// =============================================================================

interface BillingAnalyticsProps {
  date?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function BillingAnalytics({ date }: BillingAnalyticsProps) {
  const { data: revenueByMethod, isLoading: loadingRevenue } =
    useRevenueByPaymentMethod(date);
  const { data: nhisClaimsData, isLoading: loadingNHIS } =
    useOutstandingNHISClaims();
  const { data: waitTimes, isLoading: loadingWaitTimes } =
    useDepartmentWaitTimes();

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const visibleRevenueByMethod = isNhisFeatureEnabled()
    ? revenueByMethod
    : (revenueByMethod || []).filter(
        (item) => !isNhisCategory(item.payment_method),
      );

  // Calculate totals
  const totalRevenue = (visibleRevenueByMethod || []).reduce(
    (sum, item) => sum + item.total_amount,
    0,
  );
  const totalTransactions = (visibleRevenueByMethod || []).reduce(
    (sum, item) => sum + item.count,
    0,
  );

  // Prepare chart data
  const paymentMethodColors: Record<string, string> = {
    CASH: '#10B981',
    NHIS: '#3B82F6',
    RETAINERSHIP: '#8B5CF6',
    CARD: '#F59E0B',
    TRANSFER: '#06B6D4',
  };

  const revenueChartData =
    visibleRevenueByMethod?.map((item) => ({
      label: getPaymentMethodLabel(item.payment_method),
      value: item.total_amount,
      color: paymentMethodColors[item.payment_method] || '#6B7280',
    })) || [];

  const waitTimesChartData =
    waitTimes?.map((item) => ({
      label: item.department,
      value: item.avg_wait_minutes,
    })) || [];

  const isLoading = loadingRevenue || loadingNHIS || loadingWaitTimes;

  if (isLoading && !revenueByMethod && !nhisClaimsData && !waitTimes) {
    return (
      <div className="p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Transactions"
          value={totalTransactions}
          icon={CreditCard}
          variant="info"
        />
        {isNhisFeatureEnabled() && (
          <>
            <StatsCard
              title="NHIS Claims"
              value={nhisClaimsData?.total_claims || 0}
              icon={Shield}
              variant="warning"
            />
            <StatsCard
              title="NHIS Total"
              value={formatCurrency(nhisClaimsData?.total_amount || 0)}
              icon={Building2}
            />
          </>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Payment Method */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Payment Method
          </h3>
          {revenueByMethod && revenueByMethod.length > 0 ? (
            <div className="space-y-4">
              <DonutChart data={revenueChartData} size={180} />
              <div className="space-y-2 mt-4">
                {revenueByMethod.map((item) => (
                  <div
                    key={item.payment_method}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <PaymentMethodIcon method={item.payment_method} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {getPaymentMethodLabel(item.payment_method)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.count} transaction(s)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(item.total_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign size={40} className="mx-auto mb-2 opacity-50" />
              <p>No transactions recorded today</p>
            </div>
          )}
        </Card>

        {/* NHIS Claims Summary */}
        {isNhisFeatureEnabled() && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Outstanding NHIS Claims
          </h3>
          {nhisClaimsData && nhisClaimsData.total_claims > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700 font-medium">
                    Total Claims
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {nhisClaimsData.total_claims}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600">Total Amount</span>
                  <span className="text-lg font-semibold text-blue-700">
                    {formatCurrency(nhisClaimsData.total_amount)}
                  </span>
                </div>
              </div>

              <h4 className="font-medium text-gray-700">Recent Claims</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {nhisClaimsData.by_date.slice(0, 10).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.count} claim(s)
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(day.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield size={40} className="mx-auto mb-2 opacity-50" />
              <p>No outstanding NHIS claims</p>
            </div>
          )}
        </Card>
        )}
      </div>

      {/* Wait Times by Department */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Average Wait Times by Department (Today)
        </h3>
        {waitTimes && waitTimes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChart
              data={waitTimesChartData}
              color="cyan"
              formatValue={(v) => `${v} min`}
            />
            <div className="space-y-3">
              {waitTimes
                .sort((a, b) => b.avg_wait_minutes - a.avg_wait_minutes)
                .map((dept) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {dept.department}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dept.total_served} patients served
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${
                          dept.avg_wait_minutes > 30
                            ? 'text-red-600'
                            : dept.avg_wait_minutes > 15
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      >
                        {dept.avg_wait_minutes} min
                      </div>
                      <div className="text-xs text-gray-500">
                        {dept.min_wait_minutes} - {dept.max_wait_minutes} min
                        range
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock size={40} className="mx-auto mb-2 opacity-50" />
            <p>No wait time data available for today</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'Cash':
      return 'Cash';
    case 'POS':
      return 'POS/Card';
    case 'NHIS':
      return 'NHIS';
    case 'Retainership':
      return 'Retainership';
    default:
      return method || 'Unknown';
  }
}

function PaymentMethodIcon({ method }: { method: string }) {
  const iconClass = 'w-8 h-8 rounded-full flex items-center justify-center';

  switch (method) {
    case 'Cash':
      return (
        <div className={`${iconClass} bg-green-100`}>
          <Banknote size={18} className="text-green-600" />
        </div>
      );
    case 'POS':
      return (
        <div className={`${iconClass} bg-blue-100`}>
          <CreditCard size={18} className="text-blue-600" />
        </div>
      );
    case 'NHIS':
      return (
        <div className={`${iconClass} bg-purple-100`}>
          <Shield size={18} className="text-purple-600" />
        </div>
      );
    case 'Retainership':
      return (
        <div className={`${iconClass} bg-orange-100`}>
          <Building2 size={18} className="text-orange-600" />
        </div>
      );
    default:
      return (
        <div className={`${iconClass} bg-gray-100`}>
          <DollarSign size={18} className="text-gray-600" />
        </div>
      );
  }
}
