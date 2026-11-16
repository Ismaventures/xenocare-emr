/**
 * Pending Requests Dashboard Widget
 * ==================================
 * A summary card showing pending request counts for dashboards
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Bed,
  Stethoscope,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useTodaysPendingCount } from '../hooks/useClinicalRequests';

interface PendingRequestsWidgetProps {
  showLink?: boolean;
  className?: string;
}

export const PendingRequestsWidget: React.FC<PendingRequestsWidgetProps> = ({
  showLink = true,
  className = '',
}) => {
  const { data: counts, isLoading, refetch } = useTodaysPendingCount();

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Pending Requests</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Total */}
            <div className="col-span-2 p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-700">
                {counts?.total || 0}
              </p>
              <p className="text-sm text-blue-600">Total Pending</p>
            </div>

            {/* Admissions */}
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Bed className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">Admissions</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {counts?.admissions || 0}
              </p>
            </div>

            {/* Procedures */}
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">Procedures</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {counts?.procedures || 0}
              </p>
            </div>

            {/* Emergency */}
            {(counts?.emergency || 0) > 0 && (
              <div className="col-span-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">
                      Emergency Requests
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-red-700">
                    {counts?.emergency}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {showLink && (
          <Link
            to="/clinical-requests"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-800 py-2"
          >
            View All Requests <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default PendingRequestsWidget;
