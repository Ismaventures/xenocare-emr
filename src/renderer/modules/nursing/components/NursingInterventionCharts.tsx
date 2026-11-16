import React, { useMemo, useState, Component, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Activity,
  Clock,
  User,
  Filter,
  List,
  BarChart2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

import { getNursingInterventions } from '../api/nursing-interventions.api';
import { INTERVENTION_CATEGORIES } from '../config/intervention-codes.config';
import { NursingInterventionDTO } from '../dtos/nursing-interventions.dto';

// Safe recharts import with fallback for HMR edge cases
let ResponsiveContainer: any;
let BarChart: any;
let Bar: any;
let XAxis: any;
let YAxis: any;
let CartesianGrid: any;
let Tooltip: any;
let Legend: any;
let rechartsAvailable = false;

try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const recharts = require('recharts');
  ResponsiveContainer = recharts.ResponsiveContainer;
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  Legend = recharts.Legend;
  rechartsAvailable = Boolean(
    ResponsiveContainer &&
    BarChart &&
    Bar &&
    XAxis &&
    YAxis &&
    CartesianGrid &&
    Tooltip &&
    Legend,
  );
} catch (e) {
  console.warn('[NursingInterventionCharts] recharts not available:', e);
  rechartsAvailable = false;
}

// Error Boundary for Chart rendering issues
interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[ChartErrorBoundary] Chart rendering error:',
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// =============================================================================
// Constants & Config
// =============================================================================

const CHART_COLORS: Record<string, string> = {
  MED_THERAPY: '#3b82f6', // blue-500
  IV_FLUIDS: '#06b6d4', // cyan-500
  WOUND_CARE: '#ef4444', // red-500
  RESPIRATORY: '#8b5cf6', // violet-500
  MONITORING: '#10b981', // emerald-500
  NUTRITION: '#f59e0b', // amber-500
  ELIMINATION: '#d946ef', // fuchsia-500
  HYGIENE: '#6366f1', // indigo-500
  MOBILITY: '#84cc16', // lime-500
  DOCTOR_COMM: '#ec4899', // pink-500
  OTHER: '#94a3b8', // slate-400
};

const CATEGORY_NAMES: Record<string, string> = {};
INTERVENTION_CATEGORIES.forEach((cat) => {
  CATEGORY_NAMES[cat.categoryCode] = cat.category;
});

// =============================================================================
// Helper Functions
// =============================================================================

function getCategoryName(code: string) {
  return CATEGORY_NAMES[code] || 'Other';
}

function getCategoryColor(code: string) {
  return CHART_COLORS[code] || CHART_COLORS.OTHER;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface TimelineItemProps {
  intervention: NursingInterventionDTO;
  isLast: boolean;
}

function TimelineItem({ intervention, isLast }: TimelineItemProps) {
  const date = parseISO(intervention.performed_at);
  const categoryName = getCategoryName(intervention.category_code);
  const color = getCategoryColor(intervention.category_code);

  return (
    <div className="flex gap-4 relative">
      {/* Timeline Connector */}
      {!isLast && (
        <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-gray-100" />
      )}

      {/* Icon/Dot */}
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm z-10"
        style={{ backgroundColor: color }}
      >
        <Activity size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:border-gray-200 transition-colors">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-medium text-gray-900 text-sm">
              {intervention.intervention_code.replace(/_/g, ' ')}
            </h4>
            <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
              <Clock size={12} />
              {format(date, 'HH:mm')}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
              {categoryName}
            </span>
            {intervention.shift && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-medium">
                {intervention.shift} Shift
              </span>
            )}
          </div>

          {intervention.notes && (
            <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded mb-2">
              "{intervention.notes}"
            </p>
          )}

          <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={12} className="text-gray-500" />
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {intervention.nurse
                  ? `${intervention.nurse.first_name} ${intervention.nurse.last_name}`
                  : 'Nurse'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {format(date, 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface NursingInterventionChartsProps {
  encounterId: string;
}

export function NursingInterventionCharts({
  encounterId,
}: NursingInterventionChartsProps) {
  // Use the module-level flag determined at require time
  const isChartReady = rechartsAvailable;

  const [viewMode, setViewMode] = useState<'chart' | 'timeline'>(
    isChartReady ? 'chart' : 'timeline',
  );

  const handleViewModeChange = (mode: 'chart' | 'timeline') => {
    if (mode === 'chart' && !isChartReady) return;
    setViewMode(mode);
  };

  // 1. Fetch Data
  const { data, isLoading, error } = useQuery({
    queryKey: ['nursing-interventions', encounterId],
    queryFn: () =>
      getNursingInterventions({ encounter_id: encounterId, limit: 100 }),
    enabled: !!encounterId,
  });

  const interventions = data?.data || [];

  // 2. Process Data for Chart
  const chartData = useMemo(() => {
    if (!interventions.length) return [];

    // Group by Date + Shift (bucketing)
    // Map key: "YYYY-MM-DD" or "YYYY-MM-DD_SHIFT"
    // For simplicity and clarity, let's group by Day
    // But requirement says "X-axis: Time (by shift or by day)"

    // Let's create a map where key is the date/label
    const groupedData: Record<string, any> = {};

    interventions.forEach((item) => {
      const date = parseISO(item.performed_at);
      // Grouping by Date for X Axis
      const key = format(date, 'MMM dd');

      if (!groupedData[key]) {
        groupedData[key] = {
          name: key,
          originalDate: date, // for sorting
          // Initialize counts for all known categories to 0? Or just partial?
          // Recharts handles missing keys fine, but stacking order matters.
        };
      }

      const catCode = item.category_code;
      groupedData[key][catCode] = (groupedData[key][catCode] || 0) + 1;
      groupedData[key].total = (groupedData[key].total || 0) + 1;
    });

    // Convert map to array and sort by date
    return Object.values(groupedData).sort(
      (a: any, b: any) => a.originalDate.getTime() - b.originalDate.getTime(),
    );
  }, [interventions]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
        <Activity className="animate-spin text-indigo-500 mr-2" />
        <span className="text-gray-500">Loading intervention records...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <AlertCircle size={20} />
        <span>Failed to load interventions. Please try again.</span>
      </div>
    );
  }

  // Empty State
  if (!interventions.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <div className="bg-gray-100 p-3 rounded-full mb-3">
          <Activity className="text-gray-400" size={24} />
        </div>
        <h3 className="font-semibold text-gray-700">
          No Interventions Recorded
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Nursing staff haven't logged any interventions for this encounter yet.
        </p>
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 font-mono">
          Encounter ID: {encounterId}
          <br />
          Data Status: {isLoading ? 'Loading...' : 'Loaded (0 records)'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header / Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Activity size={18} className="text-indigo-600" />
          Nursing Activity
        </h3>

        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            onClick={() => handleViewModeChange('chart')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              viewMode === 'chart'
                ? 'bg-white text-indigo-700 shadow-sm'
                : isChartReady
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
            }`}
            disabled={!isChartReady}
          >
            <BarChart2 size={14} />
            Chart
          </button>
          <button
            onClick={() => handleViewModeChange('timeline')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              viewMode === 'timeline'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={14} />
            Timeline
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5">
        {viewMode === 'chart' && (
          <div className="h-[320px] w-full">
            {!isChartReady ? (
              <div className="flex flex-col items-center justify-center h-full bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="text-amber-500 mb-2" size={24} />
                <p className="text-sm text-amber-700 font-medium">
                  Chart library unavailable
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Switch to Timeline view or restart the app
                </p>
                <button
                  onClick={() => handleViewModeChange('timeline')}
                  className="mt-3 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-200"
                >
                  View as Timeline
                </button>
              </div>
            ) : (
              <ChartErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-full bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="text-amber-500 mb-2" size={24} />
                    <p className="text-sm text-amber-700 font-medium">
                      Chart rendering error
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      The chart library couldn't load properly
                    </p>
                    <button
                      onClick={() => handleViewModeChange('timeline')}
                      className="mt-3 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-200"
                    >
                      View as Timeline
                    </button>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ fontSize: '12px', padding: 0 }}
                      labelStyle={{
                        marginBottom: '8px',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                    />

                    {Object.keys(CHART_COLORS).map((code) => (
                      <Bar
                        key={code}
                        dataKey={code}
                        name={CATEGORY_NAMES[code] || code}
                        stackId="a"
                        fill={CHART_COLORS[code]}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            )}
            <div className="text-center mt-2 text-xs text-gray-400">
              Shows volume of nursing tasks performed per day
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <div className="space-y-0">
              {interventions.map((item, idx) => (
                <TimelineItem
                  key={item.id}
                  intervention={item}
                  isLast={idx === interventions.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
