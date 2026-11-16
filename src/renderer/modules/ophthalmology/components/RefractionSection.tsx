// =============================================================================
// RefractionSection Component
// Auto-refraction and subjective refraction recording
// =============================================================================

import React from 'react';
import { INPUT_CLS, TABLE_INPUT_CLS, LABEL_CLS, SECTION_HEADING_CLS } from '../../../components/ui/ConsultationFormUI';
import type { EyeExamDTO } from '../types/ophthalmology.types';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';

// =============================================================================
// Types
// =============================================================================

interface RefractionSectionProps {
  data: Partial<EyeExamDTO>;
  onChange: (updates: Partial<EyeExamDTO>) => void;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const VA_VALUES = [
  '6/6',
  '6/9',
  '6/12',
  '6/18',
  '6/24',
  '6/36',
  '6/60',
  '3/60',
  '1/60',
  'CF',
  'HM',
  'PL',
  'NPL',
];
const VA_OPTIONS: SelectOption[] = VA_VALUES.map((v) => ({
  value: v,
  label: v,
}));

const CYCLO_AGENT_OPTIONS: SelectOption[] = [
  { value: 'Cyclopentolate 1%', label: 'Cyclopentolate 1%' },
  { value: 'Atropine 1%', label: 'Atropine 1%' },
  { value: 'Tropicamide 1%', label: 'Tropicamide 1%' },
  { value: 'Homatropine 2%', label: 'Homatropine 2%' },
];

const SPECTACLE_REC_OPTIONS: SelectOption[] = [
  { value: 'New prescription', label: 'New prescription' },
  { value: 'Continue current glasses', label: 'Continue current glasses' },
  { value: 'Review later', label: 'Review later' },
  { value: 'Not indicated', label: 'Not indicated' },
];

const REFRACTIVE_ERROR_LABELS: { value: string; label: string }[] = [
  { value: 'Emmetropia', label: 'Emmetropia' },
  { value: 'Myopia (OD)', label: 'Myopia (OD)' },
  { value: 'Myopia (OS)', label: 'Myopia (OS)' },
  { value: 'Hypermetropia (OD)', label: 'Hypermetropia (OD)' },
  { value: 'Hypermetropia (OS)', label: 'Hypermetropia (OS)' },
  { value: 'Astigmatism (OD)', label: 'Astigmatism (OD)' },
  { value: 'Astigmatism (OS)', label: 'Astigmatism (OS)' },
  { value: 'Anisometropia', label: 'Anisometropia' },
  { value: 'Presbyopia', label: 'Presbyopia' },
];

// =============================================================================
// Component
// =============================================================================

export default function RefractionSection({
  data,
  onChange,
  readOnly = false,
}: RefractionSectionProps) {
  return (
    <div className="space-y-6">
      {/* Auto-Refraction */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>Auto-Refraction</h4>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">
                Eye
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Sphere
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Cylinder
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Axis
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OD
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.ar_right_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_right_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="±0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.ar_right_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_right_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="-0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.ar_right_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_right_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="°"
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OS
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.ar_left_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_left_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="±0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.ar_left_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_left_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="-0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.ar_left_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      ar_left_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="°"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cycloplegic Refraction (Wet Refraction) */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Cycloplegic Refraction (Wet Refraction)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label className={LABEL_CLS}>
              Cycloplegic Agent
            </label>
            <SelectWithOther
              fieldId="eye:cyclo_agent"
              value={data.cyclo_agent || ''}
              onChange={(v) => onChange({ cyclo_agent: v || undefined })}
              options={CYCLO_AGENT_OPTIONS}
              disabled={readOnly}
              placeholder="Select agent..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Instillation Time
            </label>
            <input
              type="time"
              value={data.cyclo_instillation_time || ''}
              onChange={(e) =>
                onChange({
                  cyclo_instillation_time: e.target.value || undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">
                Eye
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Sphere
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Cylinder
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Axis
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OD
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.cyclo_right_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_right_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="±0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.cyclo_right_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_right_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="-0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.cyclo_right_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_right_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="°"
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OS
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.cyclo_left_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_left_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="±0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.cyclo_left_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_left_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="-0.00"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.cyclo_left_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      cyclo_left_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="°"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Final Rx / Subjective Refraction */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Final Prescription (Subjective Refraction)
        </h4>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">
                Eye
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Sphere
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Cylinder
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Axis
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Add
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                Prism
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OD
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_right_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_right_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_right_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_right_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.rx_right_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_right_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_right_add ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_right_add: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.rx_right_prism || ''}
                  onChange={(e) => onChange({ rx_right_prism: e.target.value })}
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="e.g., 2Δ BI"
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-sm font-medium text-gray-700 border">
                OS
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_left_sphere ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_left_sphere: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_left_cylinder ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_left_cylinder: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={data.rx_left_axis ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_left_axis: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="number"
                  step={0.25}
                  value={data.rx_left_add ?? ''}
                  onChange={(e) =>
                    onChange({
                      rx_left_add: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.rx_left_prism || ''}
                  onChange={(e) => onChange({ rx_left_prism: e.target.value })}
                  disabled={readOnly}
                  className={`${TABLE_INPUT_CLS} text-center`}
                  placeholder="e.g., 2Δ BI"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PD and BCVA */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Pupillary Distance & BCVA
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className={LABEL_CLS}>
              Total PD (mm)
            </label>
            <input
              type="number"
              step={0.5}
              value={data.rx_pd ?? ''}
              onChange={(e) =>
                onChange({
                  rx_pd: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Total"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              PD OD (mm)
            </label>
            <input
              type="number"
              step={0.5}
              value={data.rx_pd_right ?? ''}
              onChange={(e) =>
                onChange({
                  rx_pd_right: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Right"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              PD OS (mm)
            </label>
            <input
              type="number"
              step={0.5}
              value={data.rx_pd_left ?? ''}
              onChange={(e) =>
                onChange({
                  rx_pd_left: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Left"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              BCVA OD
            </label>
            <SelectWithOther
              fieldId="eye:bcva"
              value={data.bcva_right || ''}
              onChange={(v) => onChange({ bcva_right: v })}
              options={VA_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              BCVA OS
            </label>
            <SelectWithOther
              fieldId="eye:bcva"
              value={data.bcva_left || ''}
              onChange={(v) => onChange({ bcva_left: v })}
              options={VA_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Refractive Error Classification */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Refractive Error Classification
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {REFRACTIVE_ERROR_LABELS.map(({ value, label }) => {
            const selected = (data.refractive_error_classification || '')
              .split(',')
              .map((s) => s.trim())
              .includes(value);
            const toggle = () => {
              if (readOnly) return;
              const current = (data.refractive_error_classification || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              const updated = selected
                ? current.filter((v) => v !== value)
                : [...current, value];
              onChange({ refractive_error_classification: updated.join(', ') });
            };
            return (
              <label
                key={value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${selected ? 'bg-blue-50 border-blue-300 text-blue-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} ${readOnly ? 'cursor-default' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={toggle}
                  disabled={readOnly}
                  className="w-4 h-4 rounded-md border-gray-300 text-blue-500 focus:ring-blue-100 focus:ring-2 transition-colors"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {/* Spectacle Recommendation */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Spectacle Recommendation
        </h4>
        <SelectWithOther
          fieldId="eye:spectacle_recommendation"
          value={data.spectacle_recommendation || ''}
          onChange={(v) => onChange({ spectacle_recommendation: v })}
          options={SPECTACLE_REC_OPTIONS}
          disabled={readOnly}
          placeholder="Select recommendation..."
          className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>
    </div>
  );
}
