// =============================================================================
// ANC Module — Risk Alerts Banner
// Prominent banner showing active risk flags for the pregnancy episode
// Displayed between pregnancy summary and tabs on every ANC screen
// =============================================================================

import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useActiveRiskFlags } from '../hooks/useAnc';

interface Props {
  pregnancyEpisodeId: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-red-600',
  medium: 'bg-orange-500',
  low: 'bg-yellow-500',
};

export default function AncRiskAlertsBanner({ pregnancyEpisodeId }: Props) {
  const { data: risks = [] } = useActiveRiskFlags(pregnancyEpisodeId);

  if (risks.length === 0) return null;

  const highCount = risks.filter((r: any) => r.severity === 'high').length;
  const isHigh = highCount > 0;

  return (
    <div
      className={`px-6 py-2.5 flex items-center gap-3 text-sm ${
        isHigh
          ? 'bg-red-50 border-b border-red-200'
          : 'bg-amber-50 border-b border-amber-200'
      }`}
    >
      <ShieldAlert
        className={`h-5 w-5 flex-shrink-0 ${isHigh ? 'text-red-600' : 'text-amber-600'}`}
      />
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span
          className={`font-semibold ${isHigh ? 'text-red-700' : 'text-amber-700'}`}
        >
          {risks.length} Active Risk{risks.length > 1 ? 's' : ''}
          {highCount > 0 && ` (${highCount} HIGH)`}
        </span>
        <span className="text-gray-400">|</span>
        {risks.slice(0, 5).map((risk: any) => (
          <span
            key={risk.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
              SEVERITY_STYLES[risk.severity] || 'bg-gray-500'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {risk.flag_code || risk.description?.slice(0, 25)}
          </span>
        ))}
        {risks.length > 5 && (
          <span className="text-xs text-gray-500">
            +{risks.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}
