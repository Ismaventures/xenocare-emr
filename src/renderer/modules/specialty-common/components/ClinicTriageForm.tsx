/**
 * =============================================================================
 * CLINIC TRIAGE FORM
 * =============================================================================
 * Nurse/technician interface for recording pre-consultation triage observations.
 * Renders a dynamic form based on the clinic's triage configuration.
 *
 * Usage:
 *   <ClinicTriageForm
 *     specialtyCode="CARDIOLOGY"
 *     encounterId={encounter.id}
 *     patientId={patient.id}
 *     performedBy={currentStaff.id}
 *     onComplete={() => refetch()}
 *   />
 * =============================================================================
 */

import React, { useState, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import {
  useTriageConfigs,
  useCreateTriageObservations,
} from '../hooks/useSpecialtyClinic';
import type {
  ClinicTriageConfig,
  CreateTriageObservationDTO,
} from '../dtos/specialty-clinic.dto';

interface ClinicTriageFormProps {
  specialtyCode: string;
  encounterId: string;
  patientId: string;
  performedBy: string;
  onComplete?: () => void;
}

export default function ClinicTriageForm({
  specialtyCode,
  encounterId,
  patientId,
  performedBy,
  onComplete,
}: ClinicTriageFormProps) {
  const { data: configs, isLoading: configsLoading } =
    useTriageConfigs(specialtyCode);
  const createMutation = useCreateTriageObservations();

  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const handleValueChange = useCallback((testCode: string, value: string) => {
    setValues((prev) => ({ ...prev, [testCode]: value }));
  }, []);

  const isAbnormal = (config: ClinicTriageConfig, value: string): boolean => {
    if (
      !value ||
      config.input_type === 'text' ||
      config.input_type === 'select'
    )
      return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (config.normal_min != null && num < config.normal_min) return true;
    if (config.normal_max != null && num > config.normal_max) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!configs) return;

    const observations: CreateTriageObservationDTO[] = configs
      .filter((c) => values[c.test_code]?.trim())
      .map((c) => ({
        patient_id: patientId,
        encounter_id: encounterId,
        clinic_type: specialtyCode,
        observation_type: c.test_code,
        observation_value: values[c.test_code].trim(),
        observation_unit: c.unit || undefined,
        observation_category: 'vitals',
        normal_range:
          c.normal_min != null && c.normal_max != null
            ? `${c.normal_min}–${c.normal_max} ${c.unit || ''}`
            : undefined,
        is_abnormal: isAbnormal(c, values[c.test_code]),
        performed_by: performedBy,
        notes: notes.trim() || undefined,
      }));

    if (observations.length === 0) return;

    await createMutation.mutateAsync(observations);
    onComplete?.();
  };

  const requiredMissing = (configs || [])
    .filter((c) => c.is_required)
    .some((c) => !values[c.test_code]?.trim());

  if (configsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading triage configuration...
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No triage tests configured for this clinic.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">
          Pre-Consultation Triage
        </h3>
        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
          {specialtyCode.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Test Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {configs.map((config) => {
          const val = values[config.test_code] || '';
          const abnormal = isAbnormal(config, val);

          return (
            <div key={config.test_code} className="space-y-1">
              <label className="flex items-center gap-1 text-sm text-gray-300">
                {config.test_name}
                {config.is_required && <span className="text-red-400">*</span>}
                {config.unit && (
                  <span className="text-gray-500 text-xs">({config.unit})</span>
                )}
              </label>

              {config.input_type === 'select' && config.options ? (
                <select
                  value={val}
                  onChange={(e) =>
                    handleValueChange(config.test_code, e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white
                    focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  {config.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <Input
                    type={config.input_type === 'number' ? 'number' : 'text'}
                    value={val}
                    onChange={(e) =>
                      handleValueChange(config.test_code, e.target.value)
                    }
                    placeholder={
                      config.normal_min != null && config.normal_max != null
                        ? `Normal: ${config.normal_min}–${config.normal_max}`
                        : `Enter ${config.test_name.toLowerCase()}`
                    }
                    className={`${abnormal ? '!border-red-500 !ring-red-500/30' : ''}`}
                  />
                  {abnormal && (
                    <AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                  )}
                </div>
              )}

              {/* Normal range hint */}
              {config.normal_min != null && config.normal_max != null && (
                <p className="text-xs text-gray-500">
                  Normal: {config.normal_min}–{config.normal_max}{' '}
                  {config.unit || ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm text-gray-300 mb-1 block">
          Additional Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any observations, patient complaints, or concerns..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white
            resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={requiredMissing || createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Record Triage
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
