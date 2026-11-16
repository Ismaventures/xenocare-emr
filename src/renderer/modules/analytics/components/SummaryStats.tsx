import React, { useState } from 'react';
import { useSummaryStats } from '../hooks/useAnalytics';
import { SkeletonStatsCard } from '../../../components/ui/SkeletonLoader';

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="text-sm font-medium text-gray-600 underline decoration-1 underline-offset-4 mb-3">
      {title}
    </h3>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SummaryStats() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: stats, isLoading } = useSummaryStats(
    selectedYear,
    selectedMonth,
  );

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const monthValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          General Summary Stats
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Select a Month:</span>
          <div className="relative">
            <input
              type="month"
              value={monthValue}
              onChange={handleMonthChange}
              className="pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Encounters By Departments */}
      <div>
        <SectionHeader title="Encounters By Departments" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {stats?.encountersByDepartment &&
          stats.encountersByDepartment.length > 0 ? (
            stats.encountersByDepartment.map((dept) => (
              <StatCard
                key={dept.department}
                label={dept.department}
                value={dept.count}
              />
            ))
          ) : (
            <StatCard label="GOPD" value={0} />
          )}
        </div>
      </div>

      {/* Encounters By Clinics */}
      <div>
        <SectionHeader title="Encounters By Clinics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {stats?.encountersByClinic && stats.encountersByClinic.length > 0 ? (
            stats.encountersByClinic.map((clinic, index) => (
              <StatCard
                key={`${clinic.clinic}-${index}`}
                label={clinic.clinic.toUpperCase()}
                value={clinic.count}
              />
            ))
          ) : (
            <>
              <StatCard label="ANTENATAL" value={0} />
              <StatCard label="CARDIOLOGY" value={0} />
              <StatCard label="GOPD" value={0} />
            </>
          )}
        </div>
      </div>

      {/* Laboratory */}
      <div>
        <SectionHeader title="Laboratory" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="LAB ORDERS" value={stats?.labOrders || 0} />
        </div>
      </div>

      {/* Imaging */}
      <div>
        <SectionHeader title="Imaging" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="IMAGING ORDERS" value={stats?.imagingOrders || 0} />
        </div>
      </div>

      {/* Admission */}
      <div>
        <SectionHeader title="Admission" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="ADMISSIONS" value={stats?.admissions || 0} />
        </div>
      </div>

      {/* Registration */}
      <div>
        <SectionHeader title="Registration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="REGISTRATIONS" value={stats?.registrations || 0} />
        </div>
      </div>

      {/* Discharge */}
      <div>
        <SectionHeader title="Discharge" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="DISCHARGES" value={stats?.discharges || 0} />
        </div>
      </div>

      {/* DAMA */}
      <div>
        <SectionHeader title="DAMA" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="DISCHARGES AGAINST MEDICAL ADVICE"
            value={stats?.dama || 0}
          />
        </div>
      </div>
    </div>
  );
}
