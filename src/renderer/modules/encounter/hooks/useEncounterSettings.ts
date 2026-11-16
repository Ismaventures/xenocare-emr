import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackgroundMutation } from '../../../hooks/useBackgroundMutation';
import { configurationsApi } from '../../configurations/api/configurations.api';
import { UpdateSystemConfigurationDTO } from '../../configurations/dtos/configurations.dto';

const ENCOUNTER_CONFIG_PREFIX = 'encounter.';

export interface EncounterExpirySettings {
  gopdOutpatientHours: number;
  specialtyOutpatientHours: number;
  emergencyHours: number;
  dayCaseHours: number;
  overdueWarningMinutes: number;
}

const DEFAULT_SETTINGS: EncounterExpirySettings = {
  gopdOutpatientHours: 504, // 3 weeks
  specialtyOutpatientHours: 504,
  emergencyHours: 72,
  dayCaseHours: 48,
  overdueWarningMinutes: 30,
};

const KEY_MAP: Record<string, keyof EncounterExpirySettings> = {
  'encounter.expiry.gopd_outpatient_hours': 'gopdOutpatientHours',
  'encounter.expiry.specialty_outpatient_hours': 'specialtyOutpatientHours',
  'encounter.expiry.emergency_hours': 'emergencyHours',
  'encounter.expiry.day_case_hours': 'dayCaseHours',
  'encounter.overdue_warning_minutes': 'overdueWarningMinutes',
};

export const encounterSettingsKeys = {
  all: ['encounter-settings'] as const,
};

export function useEncounterSettings() {
  return useQuery({
    queryKey: encounterSettingsKeys.all,
    queryFn: async (): Promise<EncounterExpirySettings> => {
      const configs =
        await configurationsApi.getConfigurationsByPrefix(
          ENCOUNTER_CONFIG_PREFIX,
        );

      const settings = { ...DEFAULT_SETTINGS };
      for (const config of configs) {
        const field = KEY_MAP[config.key];
        if (field) {
          const parsed = Number(config.value);
          if (!isNaN(parsed) && parsed > 0) {
            settings[field] = parsed;
          }
        }
      }
      return settings;
    },
    staleTime: 1000 * 60 * 5, // cache 5 minutes
  });
}

/** Raw config rows for the admin settings panel */
export function useEncounterSettingsRaw() {
  return useQuery({
    queryKey: [...encounterSettingsKeys.all, 'raw'],
    queryFn: () =>
      configurationsApi.getConfigurationsByPrefix(ENCOUNTER_CONFIG_PREFIX),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateEncounterSetting() {
  const qc = useQueryClient();
  return useBackgroundMutation({
    mutationFn: (payload: UpdateSystemConfigurationDTO) =>
      configurationsApi.updateConfiguration(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: encounterSettingsKeys.all }),
    backgroundScope: 'encounter-settings:write',
    maxRetries: 3,
  });
}

/**
 * Get the expiry hours for a given encounter based on its classification.
 * Used by components that have the settings already loaded.
 */
export function getExpiryHoursForEncounter(
  settings: EncounterExpirySettings,
  opdClassification?: string | null,
  encounterCategory?: string | null,
): number {
  // Emergency category overrides
  if (encounterCategory === 'emergency') return settings.emergencyHours;
  if (encounterCategory === 'day_case') return settings.dayCaseHours;

  // OPD classification: MOPD = GOPD, SOPD = Specialty
  if (opdClassification === 'SOPD') return settings.specialtyOutpatientHours;

  // Default to GOPD outpatient
  return settings.gopdOutpatientHours;
}
