import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { Button, Input, Textarea } from '../../../../components/ui';
import {
  CultureSensitivityResult,
  CultureResult,
  SensitivityMatrix,
  AntibioticSensitivity,
  GrowthLevel,
  GROWTH_LEVELS,
  SensitivityResult,
  SENSITIVITY_RESULTS,
  SENSITIVITY_LABELS,
  getCommonAntibiotics,
} from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface CultureSensitivityFormProps {
  value: CultureSensitivityResult;
  onChange: (value: CultureSensitivityResult) => void;
  readOnly?: boolean;
}

// =============================================================================
// Subcomponents
// =============================================================================

const SensitivityCell: React.FC<{
  result?: SensitivityResult;
  onChange: (result: SensitivityResult) => void;
  readOnly?: boolean;
}> = ({ result, onChange, readOnly }) => {
  const getColor = (r: SensitivityResult | undefined) => {
    switch (r) {
      case 'S':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'I':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'R':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  if (readOnly) {
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-bold ${getColor(result)}`}
      >
        {result || '-'}
      </span>
    );
  }

  return (
    <div className="flex gap-0.5">
      {SENSITIVITY_RESULTS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-2 py-1 text-xs font-bold rounded transition-all ${
            result === r
              ? getColor(r)
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={SENSITIVITY_LABELS[r]}
        >
          {r}
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function CultureSensitivityForm({
  value,
  onChange,
  readOnly = false,
}: CultureSensitivityFormProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    specimen: true,
    microscopy: true,
    culture: true,
    sensitivity: true,
    comments: true,
  });

  const commonAntibiotics = getCommonAntibiotics();

  // Safe accessors for potentially undefined arrays
  const cultures = value.cultures || [];
  const sensitivities = value.sensitivities || [];
  const specimenInfo = value.specimenInfo || {
    specimenType: '',
    specimenQuality: 'Adequate' as const,
  };
  const microscopy = value.microscopy || {};

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Culture handlers
  const addCulture = useCallback(() => {
    const newCulture: CultureResult = {
      id: `culture-${Date.now()}`,
      growth: 'No Growth',
    };
    onChange({ ...value, cultures: [...cultures, newCulture] });
  }, [value, cultures, onChange]);

  const updateCulture = useCallback(
    (cultureId: string, field: keyof CultureResult, fieldValue: unknown) => {
      const updated = cultures.map((c) =>
        c.id === cultureId ? { ...c, [field]: fieldValue } : c,
      );
      onChange({ ...value, cultures: updated });

      // Auto-add sensitivity matrix when organism is identified
      if (field === 'organismIsolated' && fieldValue) {
        const existingMatrix = sensitivities.find(
          (s) => s.organismId === cultureId,
        );
        if (!existingMatrix) {
          const newMatrix: SensitivityMatrix = {
            organismId: cultureId,
            antibiotics: commonAntibiotics.slice(0, 10).map((ab) => ({
              antibiotic: ab,
              result: 'S' as SensitivityResult,
            })),
          };
          onChange({
            ...value,
            cultures: updated,
            sensitivities: [...sensitivities, newMatrix],
          });
        }
      }
    },
    [value, cultures, sensitivities, onChange, commonAntibiotics],
  );

  const removeCulture = useCallback(
    (cultureId: string) => {
      onChange({
        ...value,
        cultures: cultures.filter((c) => c.id !== cultureId),
        sensitivities: sensitivities.filter((s) => s.organismId !== cultureId),
      });
    },
    [value, cultures, sensitivities, onChange],
  );

  // Sensitivity handlers
  const updateSensitivity = useCallback(
    (organismId: string, antibiotic: string, result: SensitivityResult) => {
      const updated = sensitivities.map((matrix) => {
        if (matrix.organismId !== organismId) return matrix;

        const abExists = matrix.antibiotics.find(
          (ab) => ab.antibiotic === antibiotic,
        );
        if (abExists) {
          return {
            ...matrix,
            antibiotics: matrix.antibiotics.map((ab) =>
              ab.antibiotic === antibiotic ? { ...ab, result } : ab,
            ),
          };
        }
        return {
          ...matrix,
          antibiotics: [...matrix.antibiotics, { antibiotic, result }],
        };
      });
      onChange({ ...value, sensitivities: updated });
    },
    [value, sensitivities, onChange],
  );

  const addAntibioticToMatrix = useCallback(
    (organismId: string, antibiotic: string) => {
      const updated = sensitivities.map((matrix) => {
        if (matrix.organismId !== organismId) return matrix;
        if (matrix.antibiotics.find((ab) => ab.antibiotic === antibiotic))
          return matrix;

        return {
          ...matrix,
          antibiotics: [
            ...matrix.antibiotics,
            { antibiotic, result: 'S' as SensitivityResult },
          ],
        };
      });
      onChange({ ...value, sensitivities: updated });
    },
    [value, sensitivities, onChange],
  );

  const SectionHeader: React.FC<{
    title: string;
    section: string;
    icon?: React.ReactNode;
  }> = ({ title, section, icon }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-5 w-5 text-gray-500" />
      ) : (
        <ChevronDown className="h-5 w-5 text-gray-500" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Specimen Information */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Specimen Information" section="specimen" />
        {expandedSections.specimen && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Type
                </label>
                {readOnly ? (
                  <p className="text-gray-900">
                    {specimenInfo.specimenType || '-'}
                  </p>
                ) : (
                  <Input
                    value={specimenInfo.specimenType}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        specimenInfo: {
                          ...value.specimenInfo,
                          specimenType: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., Urine, Blood, Wound Swab"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Quality
                </label>
                {readOnly ? (
                  <p className="text-gray-900">
                    {specimenInfo.specimenQuality}
                  </p>
                ) : (
                  <select
                    value={specimenInfo.specimenQuality}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        specimenInfo: {
                          ...value.specimenInfo,
                          specimenQuality: e.target.value as
                            | 'Adequate'
                            | 'Inadequate'
                            | 'Contaminated',
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-700/20"
                  >
                    <option value="Adequate">Adequate</option>
                    <option value="Inadequate">Inadequate</option>
                    <option value="Contaminated">Contaminated</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Date/Time
                </label>
                {readOnly ? (
                  <p className="text-gray-900">
                    {specimenInfo.collectionDate
                      ? new Date(specimenInfo.collectionDate).toLocaleString()
                      : '-'}
                  </p>
                ) : (
                  <Input
                    type="datetime-local"
                    value={specimenInfo.collectionDate || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        specimenInfo: {
                          ...value.specimenInfo,
                          collectionDate: e.target.value,
                        },
                      })
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Microscopy */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Microscopy" section="microscopy" />
        {expandedSections.microscopy && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gram Stain
                </label>
                {readOnly ? (
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {microscopy.gramStain || '-'}
                  </p>
                ) : (
                  <Textarea
                    value={microscopy.gramStain || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        microscopy: {
                          ...value.microscopy,
                          gramStain: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    placeholder="Describe gram stain findings..."
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wet Mount
                </label>
                {readOnly ? (
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {microscopy.wetMount || '-'}
                  </p>
                ) : (
                  <Textarea
                    value={microscopy.wetMount || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        microscopy: {
                          ...value.microscopy,
                          wetMount: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    placeholder="Describe wet mount findings..."
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WBC/RBC Count
                </label>
                {readOnly ? (
                  <p className="text-gray-900">{microscopy.cellCount || '-'}</p>
                ) : (
                  <Input
                    value={microscopy.cellCount || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        microscopy: {
                          ...value.microscopy,
                          cellCount: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., WBC: 10-15/HPF"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Epithelial Cells
                </label>
                {readOnly ? (
                  <p className="text-gray-900">
                    {microscopy.epithelialCells || '-'}
                  </p>
                ) : (
                  <Input
                    value={microscopy.epithelialCells || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        microscopy: {
                          ...value.microscopy,
                          epithelialCells: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., Few, Moderate, Many"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Findings
                </label>
                {readOnly ? (
                  <p className="text-gray-900">
                    {microscopy.otherFindings || '-'}
                  </p>
                ) : (
                  <Input
                    value={microscopy.otherFindings || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        microscopy: {
                          ...value.microscopy,
                          otherFindings: e.target.value,
                        },
                      })
                    }
                    placeholder="Any additional findings..."
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Culture Results */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Culture Results" section="culture" />
        {expandedSections.culture && (
          <div className="p-4 space-y-4">
            {cultures.map((culture, idx) => (
              <div
                key={culture.id}
                className="p-4 bg-gray-50 rounded-lg relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">
                    Organism #{idx + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeCulture(culture.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Growth
                    </label>
                    {readOnly ? (
                      <p className="text-gray-900">{culture.growth}</p>
                    ) : (
                      <select
                        value={culture.growth}
                        onChange={(e) =>
                          updateCulture(culture.id, 'growth', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {GROWTH_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Organism Isolated
                    </label>
                    {readOnly ? (
                      <p className="text-gray-900 font-medium">
                        {culture.organismIsolated || '-'}
                      </p>
                    ) : (
                      <Input
                        value={culture.organismIsolated || ''}
                        onChange={(e) =>
                          updateCulture(
                            culture.id,
                            'organismIsolated',
                            e.target.value,
                          )
                        }
                        placeholder="e.g., E. coli"
                        className="text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Colony Count
                    </label>
                    {readOnly ? (
                      <p className="text-gray-900">
                        {culture.colonyCount || '-'}
                      </p>
                    ) : (
                      <Input
                        value={culture.colonyCount || ''}
                        onChange={(e) =>
                          updateCulture(
                            culture.id,
                            'colonyCount',
                            e.target.value,
                          )
                        }
                        placeholder="e.g., >10^5 CFU/mL"
                        className="text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Incubation Time
                    </label>
                    {readOnly ? (
                      <p className="text-gray-900">
                        {culture.incubationTime || '-'}
                      </p>
                    ) : (
                      <Input
                        value={culture.incubationTime || ''}
                        onChange={(e) =>
                          updateCulture(
                            culture.id,
                            'incubationTime',
                            e.target.value,
                          )
                        }
                        placeholder="e.g., 48 hours"
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!readOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addCulture}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Culture Result
              </Button>
            )}

            {cultures.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No culture results added yet
              </p>
            )}
          </div>
        )}
      </div>

      {/* Antibiotic Sensitivity Matrix */}
      {cultures.some((c) => c.organismIsolated) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <SectionHeader title="Antibiotic Sensitivity" section="sensitivity" />
          {expandedSections.sensitivity && (
            <div className="p-4">
              {sensitivities.map((matrix) => {
                const culture = cultures.find(
                  (c) => c.id === matrix.organismId,
                );
                if (!culture?.organismIsolated) return null;

                return (
                  <div key={matrix.organismId} className="mb-6 last:mb-0">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      {culture.organismIsolated}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium text-gray-600">
                              Antibiotic
                            </th>
                            <th className="text-center py-2 px-3 font-medium text-gray-600">
                              Result
                            </th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">
                              MIC (µg/mL)
                            </th>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">
                              Zone (mm)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {matrix.antibiotics.map((ab, idx) => (
                            <tr
                              key={ab.antibiotic}
                              className={idx % 2 === 0 ? 'bg-gray-50' : ''}
                            >
                              <td className="py-2 px-3 font-medium">
                                {ab.antibiotic}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <SensitivityCell
                                  result={ab.result}
                                  onChange={(result) =>
                                    updateSensitivity(
                                      matrix.organismId,
                                      ab.antibiotic,
                                      result,
                                    )
                                  }
                                  readOnly={readOnly}
                                />
                              </td>
                              <td className="py-2 px-3">
                                {readOnly ? (
                                  ab.mic || '-'
                                ) : (
                                  <Input
                                    value={ab.mic || ''}
                                    onChange={(e) => {
                                      const updated = sensitivities.map((m) => {
                                        if (m.organismId !== matrix.organismId)
                                          return m;
                                        return {
                                          ...m,
                                          antibiotics: m.antibiotics.map((a) =>
                                            a.antibiotic === ab.antibiotic
                                              ? { ...a, mic: e.target.value }
                                              : a,
                                          ),
                                        };
                                      });
                                      onChange({
                                        ...value,
                                        sensitivities: updated,
                                      });
                                    }}
                                    placeholder="Optional"
                                    className="text-xs py-1"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {readOnly ? (
                                  ab.zoneDiameter || '-'
                                ) : (
                                  <Input
                                    value={ab.zoneDiameter || ''}
                                    onChange={(e) => {
                                      const updated = sensitivities.map((m) => {
                                        if (m.organismId !== matrix.organismId)
                                          return m;
                                        return {
                                          ...m,
                                          antibiotics: m.antibiotics.map((a) =>
                                            a.antibiotic === ab.antibiotic
                                              ? {
                                                  ...a,
                                                  zoneDiameter: e.target.value,
                                                }
                                              : a,
                                          ),
                                        };
                                      });
                                      onChange({
                                        ...value,
                                        sensitivities: updated,
                                      });
                                    }}
                                    placeholder="Optional"
                                    className="text-xs py-1"
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add more antibiotics */}
                    {!readOnly && (
                      <div className="mt-3">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addAntibioticToMatrix(
                                matrix.organismId,
                                e.target.value,
                              );
                              e.target.value = '';
                            }
                          }}
                          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            + Add Antibiotic
                          </option>
                          {commonAntibiotics
                            .filter(
                              (ab) =>
                                !matrix.antibiotics.find(
                                  (a) => a.antibiotic === ab,
                                ),
                            )
                            .map((ab) => (
                              <option key={ab} value={ab}>
                                {ab}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 text-xs">
                <span className="font-medium text-gray-600">Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                    S
                  </span>
                  Sensitive
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold">
                    I
                  </span>
                  Intermediate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                    R
                  </span>
                  Resistant
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments & Recommendations */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader title="Comments & Recommendations" section="comments" />
        {expandedSections.comments && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              {readOnly ? (
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {value.comments || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.comments || ''}
                  onChange={(e) =>
                    onChange({ ...value, comments: e.target.value })
                  }
                  rows={3}
                  placeholder="Additional comments..."
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommendations
              </label>
              {readOnly ? (
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {value.recommendations || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.recommendations || ''}
                  onChange={(e) =>
                    onChange({ ...value, recommendations: e.target.value })
                  }
                  rows={3}
                  placeholder="Treatment recommendations based on sensitivity pattern..."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
