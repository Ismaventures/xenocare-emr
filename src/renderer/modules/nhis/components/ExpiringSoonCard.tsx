// =============================================================================
// Expiring Soon Card Component
// =============================================================================
// Dashboard widget showing authorizations that will expire within 7 days

import React from 'react';
import {
  AlertCircle,
  Calendar,
  RefreshCw,
  ChevronRight,
  User,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuthorizationsExpiringSoon } from '../hooks';

interface ExpiringAuthorization {
  authorization_id: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  auth_code: string;
  specific_service_type: string | null;
  is_provisional: boolean;
  expiry_date: string;
  days_until_expiry: number;
  expiry_status: 'expired' | 'critical' | 'warning';
}

function getExpiryConfig(status: string, daysLeft: number) {
  switch (status) {
    case 'expired':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Expired',
        urgent: true,
      };
    case 'critical':
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        label: `${Math.ceil(daysLeft)} days left`,
        urgent: true,
      };
    default:
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: `${Math.ceil(daysLeft)} days left`,
        urgent: false,
      };
  }
}

function formatExpiryDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ExpiringSoonCard() {
  const { data: expiringAuthorizations, isLoading } =
    useAuthorizationsExpiringSoon(20);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-full">
            <AlertCircle size={20} className="text-orange-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Expiring Soon</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const authorizations =
    (expiringAuthorizations as ExpiringAuthorization[]) || [];
  const expiredCount = authorizations.filter(
    (a) => a.expiry_status === 'expired',
  ).length;
  const criticalCount = authorizations.filter(
    (a) => a.expiry_status === 'critical',
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-full">
            <AlertCircle size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Expiring Soon
            </h2>
            <p className="text-sm text-gray-500">
              Authorizations expiring within 7 days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {expiredCount} expired
            </span>
          )}
          {criticalCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {criticalCount} critical
            </span>
          )}
          <span className="text-sm font-medium text-gray-600">
            {authorizations.length} total
          </span>
        </div>
      </div>

      {authorizations.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Shield size={32} className="mx-auto text-green-400 mb-2" />
          <p className="text-gray-500">No authorizations expiring soon</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {authorizations.slice(0, 10).map((auth) => {
              const expiryConfig = getExpiryConfig(
                auth.expiry_status,
                auth.days_until_expiry,
              );
              return (
                <div
                  key={auth.authorization_id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${expiryConfig.bgColor}`}
                      >
                        <User size={16} className={expiryConfig.color} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {auth.patient_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {auth.emr_number} • {auth.auth_code}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {auth.is_provisional && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Clock size={10} />
                              Provisional
                            </span>
                          )}
                          {auth.specific_service_type && (
                            <span className="text-xs text-gray-500">
                              {auth.specific_service_type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${expiryConfig.bgColor} ${expiryConfig.color}`}
                      >
                        <Calendar size={12} />
                        {expiryConfig.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatExpiryDate(auth.expiry_date)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {authorizations.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mx-auto">
                View all {authorizations.length} expiring authorizations
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ExpiringSoonCard;
