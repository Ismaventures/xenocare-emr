import React, { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '../../../../components/ui';
import {
  QualitativeQuantitativeResult,
  QualitativeResult,
  QUALITATIVE_RESULTS,
} from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface QualitativeQuantitativeFormProps {
  value: QualitativeQuantitativeResult;
  onChange: (value: QualitativeQuantitativeResult) => void;
  testName?: string;
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function QualitativeQuantitativeForm({
  value,
  onChange,
  testName,
  readOnly = false,
}: QualitativeQuantitativeFormProps) {
  const [showQuantitative, setShowQuantitative] = useState(
    !!value.quantitative?.concentration || !!value.quantitative?.titer,
  );
  const [showConfirmation, setShowConfirmation] = useState(
    !!value.confirmation?.test,
  );

  const getResultColor = (result: QualitativeResult): string => {
    switch (result) {
      case 'Positive':
      case 'Reactive':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Negative':
      case 'Non-Reactive':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Indeterminate':
      case 'Equivocal':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isSensitiveTest =
    testName?.toLowerCase().includes('hiv') ||
    testName?.toLowerCase().includes('hepatitis');

  return (
    <div className="space-y-6">
      {/* Sensitive Test Warning */}
      {isSensitiveTest && value.qualitativeResult === 'Positive' && (
        <div className="p-4 bg-orange-100 border border-orange-300 rounded-xl">
          <p className="font-semibold text-orange-800">⚠️ Sensitive Result</p>
          <p className="text-sm text-orange-700 mt-1">
            This is a sensitive test result. Ensure proper counseling protocols
            are followed and confirmatory testing is performed before
            communicating results to the patient.
          </p>
        </div>
      )}

      {/* Qualitative Result */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
          <h3 className="font-semibold text-purple-800">Qualitative Result</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Result *
            </label>
            {readOnly ? (
              <span
                className={`px-4 py-2 rounded-lg font-semibold ${getResultColor(value.qualitativeResult)}`}
              >
                {value.qualitativeResult}
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {QUALITATIVE_RESULTS.map((result) => (
                  <button
                    key={result}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, qualitativeResult: result })
                    }
                    className={`px-4 py-2 rounded-lg font-semibold border-2 transition-all ${
                      value.qualitativeResult === result
                        ? getResultColor(result)
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {result}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signal/Cutoff Ratio (if applicable)
            </label>
            {readOnly ? (
              <span className="text-gray-900">{value.signalCutoff ?? '-'}</span>
            ) : (
              <Input
                type="number"
                step="0.01"
                value={value.signalCutoff ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    signalCutoff: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="e.g., 1.5"
                className="max-w-xs"
              />
            )}
          </div>
        </div>
      </div>

      {/* Quantitative Result */}
      {!showQuantitative && !readOnly ? (
        <button
          type="button"
          onClick={() => setShowQuantitative(true)}
          className="text-sm text-primary-700 hover:text-primary-800 font-medium flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Quantitative Result
        </button>
      ) : (
        (showQuantitative ||
          value.quantitative?.concentration ||
          value.quantitative?.titer) && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex justify-between items-center">
              <h3 className="font-semibold text-blue-800">
                Quantitative Result
              </h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowQuantitative(false);
                    onChange({ ...value, quantitative: undefined });
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titer
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.quantitative?.titer || '-'}
                    </span>
                  ) : (
                    <Input
                      value={value.quantitative?.titer || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          quantitative: {
                            ...value.quantitative,
                            titer: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 1:8, 1:32"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concentration
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.quantitative?.concentration ?? '-'}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      value={value.quantitative?.concentration ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          quantitative: {
                            ...value.quantitative,
                            concentration: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      placeholder="Value"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.quantitative?.unit || '-'}
                    </span>
                  ) : (
                    <Input
                      value={value.quantitative?.unit || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          quantitative: {
                            ...value.quantitative,
                            unit: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., IU/mL"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Range
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.quantitative?.referenceRange || '-'}
                    </span>
                  ) : (
                    <Input
                      value={value.quantitative?.referenceRange || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          quantitative: {
                            ...value.quantitative,
                            referenceRange: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., <20 IU/mL"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Confirmation Status */}
      {!showConfirmation && !readOnly ? (
        <button
          type="button"
          onClick={() => setShowConfirmation(true)}
          className="text-sm text-primary-700 hover:text-primary-800 font-medium flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Confirmation Status
        </button>
      ) : (
        (showConfirmation || value.confirmation?.test) && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex justify-between items-center">
              <h3 className="font-semibold text-amber-800">
                Confirmation Status
              </h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(false);
                    onChange({ ...value, confirmation: undefined });
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmatory Test
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.confirmation?.test || '-'}
                    </span>
                  ) : (
                    <Input
                      value={value.confirmation?.test || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          confirmation: {
                            ...value.confirmation,
                            test: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Western Blot, PCR"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation Result
                  </label>
                  {readOnly ? (
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${
                        value.confirmation?.result === 'Confirmed Positive'
                          ? 'bg-red-100 text-red-800'
                          : value.confirmation?.result === 'Confirmed Negative'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {value.confirmation?.result || '-'}
                    </span>
                  ) : (
                    <select
                      value={value.confirmation?.result || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          confirmation: {
                            ...value.confirmation,
                            result: e.target.value as
                              | 'Confirmed Positive'
                              | 'Confirmed Negative'
                              | 'Pending'
                              | 'Not Required',
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="Confirmed Positive">
                        Confirmed Positive
                      </option>
                      <option value="Confirmed Negative">
                        Confirmed Negative
                      </option>
                      <option value="Pending">Pending</option>
                      <option value="Not Required">Not Required</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation Date
                  </label>
                  {readOnly ? (
                    <span className="text-gray-900">
                      {value.confirmation?.date
                        ? new Date(value.confirmation.date).toLocaleDateString()
                        : '-'}
                    </span>
                  ) : (
                    <Input
                      type="date"
                      value={value.confirmation?.date || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          confirmation: {
                            ...value.confirmation,
                            date: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Notes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Clinical Notes</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interpretation
            </label>
            {readOnly ? (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {value.interpretation || '-'}
              </p>
            ) : (
              <Textarea
                value={value.interpretation || ''}
                onChange={(e) =>
                  onChange({ ...value, interpretation: e.target.value })
                }
                rows={3}
                placeholder="Clinical interpretation of result..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            {readOnly ? (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {value.notes || '-'}
              </p>
            ) : (
              <Textarea
                value={value.notes || ''}
                onChange={(e) => onChange({ ...value, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
