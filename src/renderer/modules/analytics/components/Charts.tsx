import React from 'react';

interface TrendData {
  date: string;
  value: number;
}

interface SimpleBarChartProps {
  data: TrendData[];
  title?: string;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
}

/**
 * Simple bar chart using CSS
 * Note: For production, consider using Recharts or similar
 */
export function SimpleBarChart({
  data,
  title,
  color = 'green',
  height = 200,
  formatValue = (v) => v.toString(),
  formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-primary-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    cyan: 'bg-cyan-500',
  };

  const barColor = colorMap[color] || colorMap.blue;

  return (
    <div>
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div
              key={`${item.date}-${item.value}`}
              className="flex-1 flex flex-col items-center group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div>{formatDate(item.date)}</div>
                  <div className="font-bold">{formatValue(item.value)}</div>
                </div>
              </div>
              {/* Bar */}
              <div
                className={`w-full ${barColor} rounded-t transition-all hover:opacity-80`}
                style={{ height: `${Math.max(barHeight, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels - show only some labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.length > 0 && (
          <>
            <span>{formatDate(data[0].date)}</span>
            {data.length > 2 && (
              <span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
            )}
            <span>{formatDate(data[data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}

interface HorizontalBarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  color?: string;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

/**
 * Horizontal bar chart for rankings
 */
export function HorizontalBarChart({
  data,
  title,
  color = 'blue',
  showValues = true,
  formatValue = (v) => v.toString(),
}: HorizontalBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    cyan: 'bg-cyan-500',
  };

  const barColor = colorMap[color] || colorMap.blue;

  return (
    <div>
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const barWidth = (item.value / maxValue) * 100;
          return (
            <div key={`${item.label}-${item.value}`} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 truncate" title={item.label}>
                  {index + 1}. {item.label}
                </span>
                {showValues && (
                  <span className="text-gray-500 font-medium ml-2">
                    {formatValue(item.value)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${barColor} transition-all`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  size?: number;
}

/**
 * Simple donut chart using CSS
 */
export function DonutChart({ data, title, size = 150 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativePercent = 0;

  // Generate conic gradient
  const gradientParts: string[] = [];
  data.forEach((item, index) => {
    const percent = (item.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    gradientParts.push(`${item.color} ${startPercent}% ${cumulativePercent}%`);
  });

  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <div
        className="rounded-full relative"
        style={{
          width: size,
          height: size,
          background: gradient,
        }}
      >
        {/* Inner circle for donut effect */}
        <div
          className="absolute bg-white rounded-full flex items-center justify-center"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="text-xl font-bold text-gray-700">{total}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div
            key={`${item.label}-${item.value}-${item.color}`}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.label}</span>
            <span className="text-gray-400">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatNumberProps {
  value: number | string;
  label: string;
  change?: number;
  format?: 'number' | 'currency' | 'percent';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Large statistic display
 */
export function StatNumber({
  value,
  label,
  change,
  format = 'number',
  size = 'md',
}: StatNumberProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const formattedValue =
    format === 'currency'
      ? new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
        }).format(Number(value))
      : format === 'percent'
        ? `${value}%`
        : value.toLocaleString();

  return (
    <div className="text-center">
      <p className={`${sizeClasses[size]} font-bold text-gray-900`}>
        {formattedValue}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {change !== undefined && (
        <p
          className={`text-sm mt-1 ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </p>
      )}
    </div>
  );
}
