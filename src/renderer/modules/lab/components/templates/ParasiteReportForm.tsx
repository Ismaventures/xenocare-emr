import React from 'react';
import { Plus, Trash2, Bug, AlertTriangle } from 'lucide-react';
import { Button, Input, Textarea } from '../../../../components/ui';
import {
  ParasiteReportResult,
  ParasiteDensity,
  PARASITE_DENSITIES,
} from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface ParasiteReportFormProps {
  value: ParasiteReportResult;
  onChange: (value: ParasiteReportResult) => void;
  testName?: string;
  readOnly?: boolean;
}

interface ParasiteEntry {
  species: string;
  stage?: string;
  density: ParasiteDensity;
  count?: number;
  countPer?: string;
}

// =============================================================================
// Constants
// =============================================================================

const COMMON_PARASITES = {
  Malaria: [
    'Plasmodium falciparum',
    'Plasmodium vivax',
    'Plasmodium malariae',
    'Plasmodium ovale',
    'Mixed Plasmodium species',
  ],
  'Intestinal Protozoa': [
    'Giardia lamblia',
    'Entamoeba histolytica',
    'Cryptosporidium parvum',
    'Cyclospora cayetanensis',
    'Isospora belli',
    'Blastocystis hominis',
  ],
  Helminths: [
    'Ascaris lumbricoides',
    'Trichuris trichiura',
    'Hookworm (Ancylostoma/Necator)',
    'Strongyloides stercoralis',
    'Enterobius vermicularis',
    'Schistosoma mansoni',
    'Schistosoma haematobium',
    'Taenia species',
    'Hymenolepis nana',
  ],
  'Blood Parasites': [
    'Trypanosoma species',
    'Microfilaria (Wuchereria bancrofti)',
    'Microfilaria (Loa loa)',
  ],
};

const MALARIA_STAGES = [
  'Ring forms',
  'Trophozoites',
  'Schizonts',
  'Gametocytes',
  'Mixed stages',
];

const SPECIMEN_TYPES = [
  'Blood (thick film)',
  'Blood (thin film)',
  'Stool (direct)',
  'Stool (concentration)',
  'Urine',
  'Duodenal aspirate',
  'CSF',
  'Other',
];

// =============================================================================
// Component
// =============================================================================

export default function ParasiteReportForm({
  value,
  onChange,
  testName,
  readOnly = false,
}: ParasiteReportFormProps) {
  const isMalariaTest =
    testName?.toLowerCase().includes('malaria') ||
    testName?.toLowerCase().includes('mp') ||
    testName?.toLowerCase().includes('plasmodium');

  const addParasite = () => {
    const newParasite: ParasiteEntry = {
      species: '',
      density: 'Not Seen',
    };
    onChange({
      ...value,
      parasitesFound: [...(value.parasitesFound || []), newParasite],
      detected: true,
    });
  };

  const removeParasite = (index: number) => {
    const updated = [...(value.parasitesFound || [])];
    updated.splice(index, 1);
    onChange({
      ...value,
      parasitesFound: updated,
      detected: updated.length > 0,
    });
  };

  const updateParasite = (
    index: number,
    field: keyof ParasiteEntry,
    fieldValue: string | number | ParasiteDensity,
  ) => {
    const updated = [...(value.parasitesFound || [])];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange({ ...value, parasitesFound: updated });
  };

  const getDensityColor = (density: ParasiteDensity): string => {
    switch (density) {
      case '++++':
        return 'bg-red-600 text-white';
      case '+++':
        return 'bg-red-500 text-white';
      case '++':
        return 'bg-orange-500 text-white';
      case '+':
        return 'bg-yellow-500 text-white';
      case 'Scanty':
        return 'bg-yellow-400 text-black';
      case 'Not Seen':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const hasHighParasitemia = value.parasitesFound?.some(
    (p) =>
      p.density === '+++' ||
      p.density === '++++' ||
      (p.count && p.count > 100000),
  );

  return (
    <div className="space-y-6">
      {/* High Parasitemia Warning */}
      {hasHighParasitemia && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">
              ⚠️ High Parasitemia Detected
            </p>
            <p className="text-sm text-red-700 mt-1">
              This patient may require urgent attention. Consider IV
              antimalarials and close monitoring for severe malaria
              complications.
            </p>
          </div>
        </div>
      )}

      {/* Specimen Information */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
          <h3 className="font-semibold text-purple-800">
            Specimen Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specimen Type *
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.specimenType || '-'}
                </span>
              ) : (
                <select
                  value={value.specimenType || ''}
                  onChange={(e) =>
                    onChange({ ...value, specimenType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Type</option>
                  {SPECIMEN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Time
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.collectionTime || '-'}
                </span>
              ) : (
                <Input
                  type="time"
                  value={value.collectionTime || ''}
                  onChange={(e) =>
                    onChange({ ...value, collectionTime: e.target.value })
                  }
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Examination Method
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.examinationMethod || '-'}
                </span>
              ) : (
                <Input
                  value={value.examinationMethod || ''}
                  onChange={(e) =>
                    onChange({ ...value, examinationMethod: e.target.value })
                  }
                  placeholder="e.g., Direct, Concentration"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fields Examined
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.fieldsExamined ?? '-'}
                </span>
              ) : (
                <Input
                  type="number"
                  value={value.fieldsExamined ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      fieldsExamined: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 100"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detection Status */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
          <h3 className="font-semibold text-blue-800">Detection Status</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Parasites Detected?
            </label>
            {readOnly ? (
              <span
                className={`px-4 py-2 rounded-lg font-semibold ${
                  value.detected
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-green-100 text-green-800 border border-green-300'
                }`}
              >
                {value.detected ? 'POSITIVE' : 'NEGATIVE'}
              </span>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...value, detected: false, parasitesFound: [] })
                  }
                  className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all ${
                    !value.detected
                      ? 'bg-green-100 text-green-800 border-green-400'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Negative
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...value, detected: true });
                    if (!value.parasitesFound?.length) addParasite();
                  }}
                  className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all ${
                    value.detected
                      ? 'bg-red-100 text-red-800 border-red-400'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Positive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parasites Found */}
      {value.detected && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex justify-between items-center">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Parasites Identified
            </h3>
            {!readOnly && (
              <Button onClick={addParasite} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Parasite
              </Button>
            )}
          </div>
          <div className="p-4 space-y-4">
            {(value.parasitesFound || []).map((parasite, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="font-medium text-gray-700">
                    Parasite #{index + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeParasite(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Species *
                    </label>
                    {readOnly ? (
                      <span className="text-gray-900 font-semibold">
                        {parasite.species || '-'}
                      </span>
                    ) : (
                      <select
                        value={parasite.species}
                        onChange={(e) =>
                          updateParasite(index, 'species', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Species</option>
                        {Object.entries(COMMON_PARASITES).map(
                          ([group, species]) => (
                            <optgroup key={group} label={group}>
                              {species.map((sp) => (
                                <option key={sp} value={sp}>
                                  {sp}
                                </option>
                              ))}
                            </optgroup>
                          ),
                        )}
                        <option value="Other">Other (specify in notes)</option>
                      </select>
                    )}
                  </div>

                  {/* Stage (for Malaria) */}
                  {isMalariaTest &&
                    parasite.species?.includes('Plasmodium') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage
                        </label>
                        {readOnly ? (
                          <span className="text-gray-900">
                            {parasite.stage || '-'}
                          </span>
                        ) : (
                          <select
                            value={parasite.stage || ''}
                            onChange={(e) =>
                              updateParasite(index, 'stage', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select Stage</option>
                            {MALARIA_STAGES.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Density *
                    </label>
                    {readOnly ? (
                      <span
                        className={`inline-block px-3 py-1 rounded-lg font-semibold ${getDensityColor(parasite.density)}`}
                      >
                        {parasite.density}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {PARASITE_DENSITIES.filter((d) => d !== 'Not Seen').map(
                          (density) => (
                            <button
                              key={density}
                              type="button"
                              onClick={() =>
                                updateParasite(index, 'density', density)
                              }
                              className={`px-2 py-1 text-xs rounded font-semibold transition-all ${
                                parasite.density === density
                                  ? getDensityColor(density)
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {density}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Count
                    </label>
                    {readOnly ? (
                      <span className="text-gray-900">
                        {parasite.count
                          ? `${parasite.count.toLocaleString()} ${parasite.countPer || '/μL'}`
                          : '-'}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={parasite.count ?? ''}
                          onChange={(e) =>
                            updateParasite(
                              index,
                              'count',
                              e.target.value ? parseInt(e.target.value) : '',
                            )
                          }
                          placeholder="Count"
                          className="w-24"
                        />
                        <select
                          value={parasite.countPer || '/μL'}
                          onChange={(e) =>
                            updateParasite(index, 'countPer', e.target.value)
                          }
                          className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="/μL">/μL</option>
                          <option value="/100 WBCs">/100 WBCs</option>
                          <option value="/HPF">/HPF</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!value.parasitesFound || value.parasitesFound.length === 0) &&
              !readOnly && (
                <p className="text-gray-500 text-center py-4">
                  No parasites added. Click "Add Parasite" to add findings.
                </p>
              )}
          </div>
        </div>
      )}

      {/* Additional Findings */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">
            Additional Findings & Notes
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Observations
            </label>
            {readOnly ? (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {value.otherFindings || '-'}
              </p>
            ) : (
              <Textarea
                value={value.otherFindings || ''}
                onChange={(e) =>
                  onChange({ ...value, otherFindings: e.target.value })
                }
                rows={2}
                placeholder="e.g., RBC abnormalities, WBC counts, other organisms seen..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Notes
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
                placeholder="Clinical interpretation and recommendations..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
