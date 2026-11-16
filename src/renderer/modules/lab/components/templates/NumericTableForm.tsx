import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button, Input, Textarea } from '../../../../components/ui';
import {
  NumericTableResult,
  NumericParameter,
  ResultFlag,
  RESULT_FLAGS,
  calculateResultFlag,
  isAbnormalFlag,
  isCriticalFlag,
} from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface NumericTableFormProps {
  value: NumericTableResult;
  onChange: (value: NumericTableResult) => void;
  testParameters?: {
    components: Array<{
      name: string;
      unit: string;
      reference_range: string;
      critical_low?: number;
      critical_high?: number;
    }>;
  };
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function NumericTableForm({
  value,
  onChange,
  testParameters,
  readOnly = false,
}: NumericTableFormProps) {
  const [showMorphology, setShowMorphology] = useState(
    !!value.morphologyComments,
  );

  // Initialize parameters from test definition if empty
  const initializeParameters = useCallback(() => {
    if (
      (!value.parameters || value.parameters.length === 0) &&
      testParameters?.components
    ) {
      const initialParams: NumericParameter[] = testParameters.components.map(
        (comp, idx) => ({
          id: `param-init-${idx}-${Math.random().toString(36).substring(2, 9)}`,
          parameter: comp.name,
          resultValue: null,
          unit: comp.unit,
          referenceRange: comp.reference_range,
          flag: null,
          isAbnormal: false,
          isCritical: false,
        }),
      );
      onChange({ ...value, parameters: initialParams });
    }
  }, [value, testParameters, onChange]);

  React.useEffect(() => {
    initializeParameters();
  }, [initializeParameters]);

  const handleParameterChange = useCallback(
    (paramId: string, field: keyof NumericParameter, fieldValue: unknown) => {
      if (!value.parameters) return;
      const updatedParams = value.parameters.map((param) => {
        if (param.id !== paramId) return param;

        const updated = { ...param, [field]: fieldValue };

        // Auto-calculate flag when result value changes
        if (field === 'resultValue' && typeof fieldValue === 'number') {
          const testParam = testParameters?.components?.find(
            (c) => c.name === param.parameter,
          );
          const flag = calculateResultFlag(
            fieldValue,
            param.referenceRange,
            testParam?.critical_low,
            testParam?.critical_high,
          );
          updated.flag = flag;
          updated.isAbnormal = isAbnormalFlag(flag);
          updated.isCritical = isCriticalFlag(flag);
        }

        return updated;
      });

      onChange({ ...value, parameters: updatedParams });
    },
    [value, onChange, testParameters],
  );

  const addParameter = useCallback(() => {
    const newParam: NumericParameter = {
      id: `param-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      parameter: '',
      resultValue: null,
      unit: '',
      referenceRange: '',
      flag: null,
      isAbnormal: false,
      isCritical: false,
    };
    onChange({ ...value, parameters: [...(value.parameters || []), newParam] });
  }, [value, onChange]);

  const removeParameter = useCallback(
    (paramId: string) => {
      onChange({
        ...value,
        parameters: (value.parameters || []).filter((p) => p.id !== paramId),
      });
    },
    [value, onChange],
  );

  const getFlagColor = (flag: ResultFlag | null): string => {
    switch (flag) {
      case 'Low':
        return 'text-blue-600 bg-blue-50';
      case 'High':
        return 'text-orange-600 bg-orange-50';
      case 'Critical Low':
      case 'Critical High':
        return 'text-red-600 bg-red-50 font-bold';
      case 'Normal':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const hasCriticalValues = useMemo(
    () => value.parameters?.some((p) => p.isCritical) || false,
    [value.parameters],
  );

  return (
    <div className="space-y-4">
      {/* Critical Value Alert */}
      {hasCriticalValues && (
        <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">
              Critical Values Detected
            </p>
            <p className="text-sm text-red-700">
              One or more results are in critical range. Immediate notification
              to ordering physician required.
            </p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Parameter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                Result
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                Reference Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                Flag
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(value.parameters || []).map((param) => (
              <tr
                key={param.id}
                className={`${param.isCritical ? 'bg-red-50' : param.isAbnormal ? 'bg-orange-50' : ''}`}
              >
                <td className="px-4 py-2">
                  {readOnly ? (
                    <span className="font-medium text-gray-900">
                      {param.parameter}
                    </span>
                  ) : (
                    <Input
                      value={param.parameter}
                      onChange={(e) =>
                        handleParameterChange(
                          param.id,
                          'parameter',
                          e.target.value,
                        )
                      }
                      placeholder="Parameter name"
                      className="text-sm"
                    />
                  )}
                </td>
                <td className="px-4 py-2">
                  {readOnly ? (
                    <span
                      className={`font-semibold ${param.isCritical ? 'text-red-700' : param.isAbnormal ? 'text-orange-700' : 'text-gray-900'}`}
                    >
                      {param.resultValue ?? '-'}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      value={param.resultValue ?? ''}
                      onChange={(e) =>
                        handleParameterChange(
                          param.id,
                          'resultValue',
                          e.target.value ? parseFloat(e.target.value) : null,
                        )
                      }
                      placeholder="0.0"
                      className={`text-sm font-semibold ${param.isCritical ? 'border-red-400 bg-red-50' : param.isAbnormal ? 'border-orange-400 bg-orange-50' : ''}`}
                    />
                  )}
                </td>
                <td className="px-4 py-2">
                  {readOnly ? (
                    <span className="text-gray-600 text-sm">{param.unit}</span>
                  ) : (
                    <Input
                      value={param.unit || ''}
                      onChange={(e) =>
                        handleParameterChange(param.id, 'unit', e.target.value)
                      }
                      placeholder="unit"
                      className="text-sm"
                    />
                  )}
                </td>
                <td className="px-4 py-2">
                  {readOnly ? (
                    <span className="text-gray-600 text-sm">
                      {param.referenceRange}
                    </span>
                  ) : (
                    <Input
                      value={param.referenceRange || ''}
                      onChange={(e) =>
                        handleParameterChange(
                          param.id,
                          'referenceRange',
                          e.target.value,
                        )
                      }
                      placeholder="e.g., 4.0-11.0"
                      className="text-sm"
                    />
                  )}
                </td>
                <td className="px-4 py-2">
                  {readOnly ? (
                    param.flag && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getFlagColor(param.flag)}`}
                      >
                        {param.flag}
                      </span>
                    )
                  ) : (
                    <select
                      value={param.flag || ''}
                      onChange={(e) => {
                        const flag = (e.target.value as ResultFlag) || null;
                        handleParameterChange(param.id, 'flag', flag);
                        handleParameterChange(
                          param.id,
                          'isAbnormal',
                          isAbnormalFlag(flag),
                        );
                        handleParameterChange(
                          param.id,
                          'isCritical',
                          isCriticalFlag(flag),
                        );
                      }}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${getFlagColor(param.flag)}`}
                    >
                      <option value="">Select</option>
                      {RESULT_FLAGS.map((flag) => (
                        <option key={flag} value={flag}>
                          {flag}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                {!readOnly && (
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeParameter(param.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove parameter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Parameter Button */}
      {!readOnly && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addParameter}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Parameter
        </Button>
      )}

      {/* Morphology Comments */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        {!showMorphology && !readOnly ? (
          <button
            type="button"
            onClick={() => setShowMorphology(true)}
            className="text-sm text-primary-700 hover:text-primary-800 font-medium flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Morphology Comments
          </button>
        ) : (
          (showMorphology || value.morphologyComments) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Morphology / Additional Comments
              </label>
              {readOnly ? (
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {value.morphologyComments || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.morphologyComments || ''}
                  onChange={(e) =>
                    onChange({ ...value, morphologyComments: e.target.value })
                  }
                  rows={3}
                  placeholder="Enter morphology findings or additional comments..."
                  className="text-sm"
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Total:</span>
          <span className="font-semibold">
            {(value.parameters || []).length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-gray-500">Normal:</span>
          <span className="font-semibold text-green-600">
            {(value.parameters || []).filter((p) => p.flag === 'Normal').length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-gray-500">Abnormal:</span>
          <span className="font-semibold text-orange-600">
            {
              (value.parameters || []).filter(
                (p) => p.isAbnormal && !p.isCritical,
              ).length
            }
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-gray-500">Critical:</span>
          <span className="font-semibold text-red-600">
            {(value.parameters || []).filter((p) => p.isCritical).length}
          </span>
        </div>
      </div>
    </div>
  );
}
