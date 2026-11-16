/**
 * Admin panel for configuring encounter expiry durations.
 * Reads/writes from system_configurations table via useEncounterSettings hooks.
 */
import React, { useState, useEffect } from 'react';
import { Clock, Save, RotateCcw, Settings2 } from 'lucide-react';
import {
  useEncounterSettingsRaw,
  useUpdateEncounterSetting,
} from '../hooks/useEncounterSettings';
import { SystemConfigurationDTO } from '../../configurations/dtos/configurations.dto';
import { useToast } from '../../../components/ui/Toast';

const DISPLAY_INFO: Record<
  string,
  { label: string; hint: string; unit: string; category: string }
> = {
  'encounter.expiry.gopd_outpatient_hours': {
    label: 'GOPD Outpatient',
    hint: 'General OPD outpatient encounters (Main OPD)',
    unit: 'hours',
    category: 'Expiry Duration',
  },
  'encounter.expiry.specialty_outpatient_hours': {
    label: 'Specialty Outpatient',
    hint: 'Specialty OPD encounters (Dental, Eye, Surgery, etc.)',
    unit: 'hours',
    category: 'Expiry Duration',
  },
  'encounter.expiry.emergency_hours': {
    label: 'Emergency',
    hint: 'A&E / Emergency encounters',
    unit: 'hours',
    category: 'Expiry Duration',
  },
  'encounter.expiry.day_case_hours': {
    label: 'Day Case',
    hint: 'Day case / short-stay encounters',
    unit: 'hours',
    category: 'Expiry Duration',
  },
  'encounter.overdue_warning_minutes': {
    label: 'Overdue Warning',
    hint: 'Flag encounters as overdue after this many minutes',
    unit: 'minutes',
    category: 'Alerts',
  },
};

function hoursToReadable(hours: number): string {
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = hours / 24;
  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export default function EncounterSettingsPanel() {
  const { data: configs, isLoading } = useEncounterSettingsRaw();
  const updateConfig = useUpdateEncounterSetting();
  const { showToast } = useToast();

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // Sync loaded values into edit state
  useEffect(() => {
    if (configs) {
      const vals: Record<string, string> = {};
      for (const c of configs) {
        vals[c.config_id] = c.value;
      }
      setEditValues(vals);
      setDirty(new Set());
    }
  }, [configs]);

  const handleChange = (configId: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [configId]: value }));
    setDirty((prev) => new Set(prev).add(configId));
  };

  const handleSave = async (config: SystemConfigurationDTO) => {
    const newValue = editValues[config.config_id];
    if (!newValue || isNaN(Number(newValue)) || Number(newValue) <= 0) {
      showToast('Please enter a valid positive number', 'error');
      return;
    }
    try {
      await updateConfig.mutateAsync({
        config_id: config.config_id,
        value: newValue,
      });
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(config.config_id);
        return next;
      });
      showToast(`Updated ${DISPLAY_INFO[config.key]?.label || config.key}`, 'success');
    } catch {
      showToast('Failed to save setting', 'error');
    }
  };

  const handleReset = (config: SystemConfigurationDTO) => {
    setEditValues((prev) => ({ ...prev, [config.config_id]: config.value }));
    setDirty((prev) => {
      const next = new Set(prev);
      next.delete(config.config_id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
        <Settings2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-500">
          No encounter settings found
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Run migration 234 to seed the encounter expiry configuration
        </p>
      </div>
    );
  }

  // Group by category
  const expiryConfigs = configs.filter((c) =>
    c.key.startsWith('encounter.expiry.'),
  );
  const alertConfigs = configs.filter(
    (c) => !c.key.startsWith('encounter.expiry.'),
  );

  return (
    <div className="space-y-4">
      {/* Expiry Duration Settings */}
      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="text-sm font-medium text-gray-800">
            Encounter Expiry Duration
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            How long encounters remain active before auto-expiring. Inpatient
            encounters expire on discharge regardless of these settings.
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {expiryConfigs.map((config) => {
            const info = DISPLAY_INFO[config.key];
            const val = editValues[config.config_id] || config.value;
            const numVal = Number(val);
            const isDirty = dirty.has(config.config_id);

            return (
              <div
                key={config.config_id}
                className="flex items-center justify-between px-4 py-3 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700">
                      {info?.label || config.key}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 ml-5.5">
                    {info?.hint || config.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={val}
                      onChange={(e) =>
                        handleChange(config.config_id, e.target.value)
                      }
                      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-right tabular-nums focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 w-12">
                    {info?.unit || 'hours'}
                  </span>
                  {!isNaN(numVal) && numVal > 0 && info?.unit === 'hours' && (
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      = {hoursToReadable(numVal)}
                    </span>
                  )}
                  {isDirty && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReset(config)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                        title="Reset"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSave(config)}
                        disabled={updateConfig.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary-800 disabled:opacity-50 transition-colors"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Settings */}
      {alertConfigs.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-medium text-gray-800">
              Alert Thresholds
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              When to show warnings for long-waiting encounters
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {alertConfigs.map((config) => {
              const info = DISPLAY_INFO[config.key];
              const val = editValues[config.config_id] || config.value;
              const isDirty = dirty.has(config.config_id);

              return (
                <div
                  key={config.config_id}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        {info?.label || config.key}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 ml-5.5">
                      {info?.hint || config.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={val}
                      onChange={(e) =>
                        handleChange(config.config_id, e.target.value)
                      }
                      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-right tabular-nums focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20"
                    />
                    <span className="text-[11px] text-gray-400 w-12">
                      {info?.unit || 'min'}
                    </span>
                    {isDirty && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReset(config)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                          title="Reset"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleSave(config)}
                          disabled={updateConfig.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary-800 disabled:opacity-50 transition-colors"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
        <p className="text-xs font-medium text-blue-700">How it works</p>
        <ul className="text-[11px] text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
          <li>
            <strong>GOPD Outpatient:</strong> Applies to Main OPD (MOPD)
            encounters
          </li>
          <li>
            <strong>Specialty Outpatient:</strong> Applies to all Specialty OPD
            (SOPD) encounters — Dental, Eye, Surgery, etc.
          </li>
          <li>
            <strong>Inpatient encounters</strong> always expire on discharge,
            not by time
          </li>
          <li>
            Changes take effect immediately for all new expiry calculations
          </li>
        </ul>
      </div>
    </div>
  );
}
