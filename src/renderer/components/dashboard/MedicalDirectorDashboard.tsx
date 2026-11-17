import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Banknote,
  Bed,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DEPLOYMENT } from '../../config/deployment';
import { MUHEDA_LOGO_DATA_URI } from '../../shared/constants/muhedaLogo';
import {
  getMedicalDirectorDashboardData,
  resolveDashboardRange,
  type DashboardRangePreset,
  type MedicalDirectorDashboardData,
} from '../../modules/billing/api/medicalDirectorDashboard.api';
import {
  dispatchExport,
} from '../../modules/reports/services/export.service';
import type {
  ExcelSheet,
  ExportFormat,
} from '../../modules/reports/types/report.types';

const RANGE_OPTIONS: { key: DashboardRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
];

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-NG').format(value || 0);
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

interface MetricCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'teal' | 'blue' | 'amber' | 'rose' | 'slate';
}

const TONE_STYLES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  teal: 'bg-[#e7f4f2] text-[#0d5e56]',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
};

function MetricCard({
  title,
  value,
  hint,
  icon,
  tone = 'teal',
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`rounded-xl p-3 ${TONE_STYLES[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function buildExportSheets(
  data: MedicalDirectorDashboardData,
): ExcelSheet[] {
  const summaryRows: (string | number)[][] = [
    ['Period', data.periodLabel],
    ['Patients seen', data.patientsSeen],
    ['Total visits', data.totalVisits],
    ['New patients', data.newPatients],
    ['Returning patients', data.returningPatients],
    ['Consultations', data.consultations],
    ['Admissions', data.admissions],
    ['Currently admitted', data.currentlyAdmitted],
    ['Collected in period', data.collectedSelected],
    ['Collected today', data.collectedToday],
    ['Collected this month', data.collectedMonth],
    ['Collected this year', data.collectedYear],
    ['Collected last year', data.collectedPreviousYear],
    ['Billed in period', data.billedSelected],
    ['Outstanding in period', data.outstandingSelected],
    ['Total outstanding', data.outstandingTotal],
    ['Open bills', data.openBillCount],
    ['Partially paid bills', data.partialBillCount],
    ['Patients owing', data.patientsOwing],
    ['Visits last year', data.visitsPreviousYear],
    ['Generated at', new Date(data.generatedAt).toLocaleString('en-GB')],
  ];

  const departmentSheet: ExcelSheet = {
    name: 'Departments',
    headers: ['Department', 'Billed', 'Collected', 'Outstanding'],
    rows: data.departments.map((department) => [
      department.department,
      department.billed,
      department.collected,
      department.outstanding,
    ]),
  };

  const trendSheet: ExcelSheet = {
    name: 'Monthly trend',
    headers: ['Month', 'Revenue', 'Visits'],
    rows: data.monthlyTrend.map((point) => [
      point.label,
      point.revenue,
      point.visits,
    ]),
  };

  const methodSheet: ExcelSheet = {
    name: 'Payment methods',
    headers: ['Payment method', 'Amount', 'Payments'],
    rows: data.paymentMethods.map((method) => [
      method.method,
      method.amount,
      method.count,
    ]),
  };

  return [
    { name: 'Summary', headers: ['Metric', 'Value'], rows: summaryRows },
    departmentSheet,
    trendSheet,
    methodSheet,
  ];
}

export default function MedicalDirectorDashboard() {
  const { staff } = useAuth();
  const now = new Date();
  const [preset, setPreset] = useState<DashboardRangePreset>('month');
  const [customFrom, setCustomFrom] = useState(toDateInput(now));
  const [customTo, setCustomTo] = useState(toDateInput(now));

  const range = useMemo(
    () => resolveDashboardRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['medical-director-dashboard', range.from, range.to],
    queryFn: () => getMedicalDirectorDashboardData(range),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const yearChange = data
    ? percentChange(data.collectedYear, data.collectedPreviousYear)
    : null;
  const maxDepartmentCollected = Math.max(
    ...(data?.departments.map((department) => department.collected) ?? [0]),
    1,
  );

  const handleExport = (format: ExportFormat) => {
    if (!data) return;
    const safePeriod = data.periodLabel
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const generatedBy = [staff?.first_name, staff?.last_name]
      .filter(Boolean)
      .join(' ');

    dispatchExport(
      format,
      buildExportSheets(data),
      {
        title: 'Medical Director Report',
        subtitle: DEPLOYMENT.facilityName,
        facility: DEPLOYMENT.facilityName,
        period: data.periodLabel,
        generatedBy: generatedBy || 'Medical Director',
        sections: [
          {
            title: 'Summary',
            summaryRows: [
              { label: 'Period', value: data.periodLabel },
              { label: 'Patients seen', value: data.patientsSeen },
              { label: 'Total visits', value: data.totalVisits },
              { label: 'New patients', value: data.newPatients },
              { label: 'Returning patients', value: data.returningPatients },
              { label: 'Consultations', value: data.consultations },
              { label: 'Admissions', value: data.admissions },
              { label: 'Currently admitted', value: data.currentlyAdmitted },
              {
                label: 'Collected in period',
                value: formatCurrency(data.collectedSelected),
              },
              {
                label: 'Billed in period',
                value: formatCurrency(data.billedSelected),
              },
              {
                label: 'Outstanding in period',
                value: formatCurrency(data.outstandingSelected),
              },
              {
                label: 'Total outstanding',
                value: formatCurrency(data.outstandingTotal),
              },
              { label: 'Open bills', value: data.openBillCount },
              { label: 'Patients owing', value: data.patientsOwing },
            ],
          },
          {
            title: 'Department Summary',
            tableHeaders: [
              'Department',
              'Billed',
              'Collected',
              'Outstanding',
            ],
            tableRows: data.departments.map((department) => [
              department.department,
              formatCurrency(department.billed),
              formatCurrency(department.collected),
              formatCurrency(department.outstanding),
            ]),
          },
          {
            title: 'Monthly Trend',
            tableHeaders: ['Month', 'Revenue', 'Visits'],
            tableRows: data.monthlyTrend.map((point) => [
              point.label,
              formatCurrency(point.revenue),
              point.visits,
            ]),
          },
        ],
      },
      `MUHEDA-Medical-Director-${safePeriod || 'Report'}`,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5">
              <img
                src={MUHEDA_LOGO_DATA_URI}
                alt="MUHEDA Clinic"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d5e56]">
                {DEPLOYMENT.facilityName}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Medical Director Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Clinic performance, patient activity and verified revenue.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="text-left text-sm text-slate-500 sm:text-right">
              <p className="font-medium text-slate-700">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {data && (
                <p className="text-xs">
                  Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={isFetching ? 'animate-spin' : undefined}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-slate-600">
              Period
            </span>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPreset(option.key)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  preset === option.key
                    ? 'bg-[#0d5e56] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {preset === 'custom' && (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </>
            )}
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              <CalendarDays size={15} />
              {range.label}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExport('Excel')}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0d5e56] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a44] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSpreadsheet size={15} />
                Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('PDF')}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText size={15} />
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport('CSV')}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={15} />
                CSV
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="text-lg font-semibold text-rose-800">
              Dashboard could not load
            </h2>
            <p className="mt-1 text-sm text-rose-700">
              {error instanceof Error
                ? error.message
                : 'Please check your connection and try again.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">
                  Money at a glance
                </h2>
                <span className="text-xs font-medium text-slate-500">
                  Verified receipts only
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Collected in period"
                  value={formatCurrency(data.collectedSelected)}
                  hint={`${formatNumber(data.paymentMethods.reduce((total, method) => total + method.count, 0))} verified payments`}
                  icon={<Wallet size={22} />}
                />
                <MetricCard
                  title="Billed in period"
                  value={formatCurrency(data.billedSelected)}
                  hint={`Outstanding in period: ${formatCurrency(data.outstandingSelected)}`}
                  icon={<ClipboardList size={22} />}
                  tone="blue"
                />
                <MetricCard
                  title="Total outstanding"
                  value={formatCurrency(data.outstandingTotal)}
                  hint={`${formatNumber(data.patientsOwing)} patients owing`}
                  icon={<Banknote size={22} />}
                  tone="amber"
                />
                <MetricCard
                  title="Open bills"
                  value={formatNumber(data.openBillCount)}
                  hint={`${formatNumber(data.partialBillCount)} partially paid`}
                  icon={<Activity size={22} />}
                  tone={data.openBillCount > 0 ? 'rose' : 'teal'}
                />
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Collected today
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(data.collectedToday)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Collected this month
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(data.collectedMonth)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Collected this year
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(data.collectedYear)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Last year comparison
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(data.collectedPreviousYear)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <TrendingUp size={14} />
                  {yearChange === null
                    ? 'No prior-year revenue'
                    : `${yearChange >= 0 ? '+' : ''}${yearChange.toFixed(1)}% vs last year`}
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-base font-bold text-slate-800">
                Patient activity
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Patients seen"
                  value={formatNumber(data.patientsSeen)}
                  hint={`${formatNumber(data.totalVisits)} total visits`}
                  icon={<Users size={22} />}
                />
                <MetricCard
                  title="New patients"
                  value={formatNumber(data.newPatients)}
                  hint="Registered in period"
                  icon={<UserPlus size={22} />}
                  tone="blue"
                />
                <MetricCard
                  title="Returning patients"
                  value={formatNumber(data.returningPatients)}
                  hint="Existing patients seen"
                  icon={<Users size={22} />}
                  tone="slate"
                />
                <MetricCard
                  title="Consultations"
                  value={formatNumber(data.consultations)}
                  hint="Doctor consultations"
                  icon={<Stethoscope size={22} />}
                  tone="teal"
                />
                <MetricCard
                  title="Admissions"
                  value={formatNumber(data.admissions)}
                  hint="Admitted in period"
                  icon={<Bed size={22} />}
                  tone="blue"
                />
                <MetricCard
                  title="Currently admitted"
                  value={formatNumber(data.currentlyAdmitted)}
                  hint="Still on admission"
                  icon={<Bed size={22} />}
                  tone="amber"
                />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Revenue by department
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Billed, collected and outstanding for {data.periodLabel}.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Department</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Billed
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Collected
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Outstanding
                        </th>
                        <th className="px-5 py-3 font-semibold">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.departments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-10 text-center text-sm text-slate-500"
                          >
                            No billing activity for this period.
                          </td>
                        </tr>
                      ) : (
                        data.departments.map((department) => {
                          return (
                            <tr key={department.department}>
                              <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                                {department.department}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                                {formatCurrency(department.billed)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
                                {formatCurrency(department.collected)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                                {formatCurrency(department.outstanding)}
                              </td>
                              <td className="w-40 px-5 py-3">
                                <div className="h-2 rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-[#0d5e56]"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (department.collected /
                                          maxDepartmentCollected) *
                                          100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-800">
                    Payment methods
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Verified collections in {data.periodLabel}.
                  </p>
                </div>
                {data.paymentMethods.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No verified payments for this period.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.paymentMethods.map((method) => {
                      const total = data.paymentMethods.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                      );
                      const share = total > 0 ? (method.amount / total) * 100 : 0;
                      return (
                        <div key={method.method}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium capitalize text-slate-700">
                              {method.method.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(method.amount)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-[#0d5e56]"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatNumber(method.count)} payments
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Monthly trend
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Revenue and visit volume over the last six months.
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Last year visits: {formatNumber(data.visitsPreviousYear)}
                </p>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {data.monthlyTrend.map((point) => {
                  const maxRevenue = Math.max(
                    ...data.monthlyTrend.map((item) => item.revenue),
                    1,
                  );
                  const maxVisits = Math.max(
                    ...data.monthlyTrend.map((item) => item.visits),
                    1,
                  );
                  return (
                    <div
                      key={point.key}
                      className="flex min-w-0 flex-col items-center gap-2"
                    >
                      <div className="flex h-36 w-full items-end justify-center gap-1.5">
                        <div
                          className="w-4 rounded-t bg-[#0d5e56]"
                          style={{
                            height: `${Math.max(
                              3,
                              (point.revenue / maxRevenue) * 100,
                            )}%`,
                          }}
                          title={`Revenue ${formatCurrency(point.revenue)}`}
                        />
                        <div
                          className="w-4 rounded-t bg-blue-400"
                          style={{
                            height: `${Math.max(
                              3,
                              (point.visits / maxVisits) * 100,
                            )}%`,
                          }}
                          title={`${point.visits} visits`}
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        {point.label}
                      </p>
                      <p className="text-[11px] leading-tight text-slate-500">
                        {formatCurrency(point.revenue)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatNumber(point.visits)} visits
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-5 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#0d5e56]" />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
                  Visits
                </span>
              </div>
            </section>

            <p className="pb-4 text-center text-xs text-slate-400">
              Figures are generated live from central billing, patient visits and
              admissions. Only verified receipts are counted as collected
              revenue.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
