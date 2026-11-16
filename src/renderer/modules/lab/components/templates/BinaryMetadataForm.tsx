import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  ClipboardList,
} from 'lucide-react';
import { Input, Textarea } from '../../../../components/ui';
import { BinaryMetadataResult } from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface BinaryMetadataFormProps {
  value: BinaryMetadataResult;
  onChange: (value: BinaryMetadataResult) => void;
  testName?: string;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const QC_CHECKLIST_ITEMS = [
  { id: 'sampleValid', label: 'Sample adequacy verified' },
  { id: 'controlsValid', label: 'Positive & negative controls valid' },
  { id: 'kitValid', label: 'Kit within expiry date' },
  { id: 'procedureFollowed', label: 'Standard procedure followed' },
  { id: 'timingCorrect', label: 'Incubation timing correct' },
  { id: 'resultsRead', label: 'Results read within window' },
];

// =============================================================================
// Component
// =============================================================================

export default function BinaryMetadataForm({
  value,
  onChange,
  testName,
  readOnly = false,
}: BinaryMetadataFormProps) {
  const isRapidTest =
    testName?.toLowerCase().includes('rapid') ||
    testName?.toLowerCase().includes('rdt') ||
    testName?.toLowerCase().includes('card');

  const isMolecularTest =
    testName?.toLowerCase().includes('pcr') ||
    testName?.toLowerCase().includes('genotype') ||
    testName?.toLowerCase().includes('molecular');

  const getResultDisplay = () => {
    if (value.detected === true) {
      return {
        text: 'DETECTED',
        altText: 'POSITIVE',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        icon: AlertTriangle,
      };
    }
    if (value.detected === false) {
      return {
        text: 'NOT DETECTED',
        altText: 'NEGATIVE',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        icon: CheckCircle,
      };
    }
    return {
      text: 'INDETERMINATE',
      altText: 'INCONCLUSIVE',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: AlertTriangle,
    };
  };

  const resultDisplay = getResultDisplay();
  const ResultIcon = resultDisplay.icon;

  const updateQcItem = (itemId: string, checked: boolean) => {
    const currentQc = value.qcChecklist || {};
    onChange({
      ...value,
      qcChecklist: { ...currentQc, [itemId]: checked },
    });
  };

  const allQcPassed = QC_CHECKLIST_ITEMS.every(
    (item) => value.qcChecklist?.[item.id] === true,
  );

  return (
    <div className="space-y-6">
      {/* Result Selection */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
          <h3 className="font-semibold text-blue-800">Test Result</h3>
        </div>
        <div className="p-6">
          {readOnly ? (
            <div
              className={`flex items-center justify-center gap-3 p-6 rounded-xl ${resultDisplay.bgColor} ${resultDisplay.borderColor} border-2`}
            >
              <ResultIcon className={`h-8 w-8 ${resultDisplay.textColor}`} />
              <span className={`text-2xl font-bold ${resultDisplay.textColor}`}>
                {resultDisplay.text}
              </span>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => onChange({ ...value, detected: false })}
                className={`flex-1 max-w-xs flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  value.detected === false
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CheckCircle className="h-10 w-10" />
                <span className="text-lg font-bold">NOT DETECTED</span>
                <span className="text-sm opacity-75">Negative</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ ...value, detected: true })}
                className={`flex-1 max-w-xs flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  value.detected === true
                    ? 'bg-red-100 border-red-400 text-red-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <XCircle className="h-10 w-10" />
                <span className="text-lg font-bold">DETECTED</span>
                <span className="text-sm opacity-75">Positive</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ ...value, detected: undefined })}
                className={`flex-1 max-w-xs flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                  value.detected === undefined || value.detected === null
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <AlertTriangle className="h-10 w-10" />
                <span className="text-lg font-bold">INDETERMINATE</span>
                <span className="text-sm opacity-75">Repeat test</span>
              </button>
            </div>
          )}

          {/* Target/Analyte Info */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target/Analyte
              </label>
              {readOnly ? (
                <span className="text-gray-900">{value.target || '-'}</span>
              ) : (
                <Input
                  value={value.target || ''}
                  onChange={(e) =>
                    onChange({ ...value, target: e.target.value })
                  }
                  placeholder="e.g., SARS-CoV-2, HBsAg, HIV-1/2"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              {readOnly ? (
                <span className="text-gray-900">{value.method || '-'}</span>
              ) : (
                <Input
                  value={value.method || ''}
                  onChange={(e) =>
                    onChange({ ...value, method: e.target.value })
                  }
                  placeholder="e.g., Lateral Flow, RT-PCR, ELISA"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kit/Reagent Information */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
          <h3 className="font-semibold text-purple-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Kit / Reagent Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kit Name
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.kitInfo?.name || '-'}
                </span>
              ) : (
                <Input
                  value={value.kitInfo?.name || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      kitInfo: { ...value.kitInfo, name: e.target.value },
                    })
                  }
                  placeholder="e.g., Panbio COVID-19"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.kitInfo?.manufacturer || '-'}
                </span>
              ) : (
                <Input
                  value={value.kitInfo?.manufacturer || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      kitInfo: {
                        ...value.kitInfo,
                        manufacturer: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., Abbott"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lot Number
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.kitInfo?.lotNumber || '-'}
                </span>
              ) : (
                <Input
                  value={value.kitInfo?.lotNumber || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      kitInfo: { ...value.kitInfo, lotNumber: e.target.value },
                    })
                  }
                  placeholder="e.g., LOT123456"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {value.kitInfo?.expiryDate
                    ? new Date(value.kitInfo.expiryDate).toLocaleDateString()
                    : '-'}
                </span>
              ) : (
                <Input
                  type="date"
                  value={value.kitInfo?.expiryDate || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      kitInfo: { ...value.kitInfo, expiryDate: e.target.value },
                    })
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QC Checklist */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex justify-between items-center">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quality Control Checklist
          </h3>
          {allQcPassed && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              All Passed
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {QC_CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  readOnly
                    ? value.qcChecklist?.[item.id]
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                    : 'cursor-pointer hover:bg-gray-50 border-gray-200'
                }`}
              >
                {readOnly ? (
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${
                      value.qcChecklist?.[item.id]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {value.qcChecklist?.[item.id] && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    checked={value.qcChecklist?.[item.id] || false}
                    onChange={(e) => updateQcItem(item.id, e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded border-gray-300"
                  />
                )}
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Control Results (for molecular/immunoassays) */}
      {(isMolecularTest || !isRapidTest) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Control Results</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Positive Control
                </label>
                {readOnly ? (
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                      value.controlResults?.positiveControl === 'Valid'
                        ? 'bg-green-100 text-green-800'
                        : value.controlResults?.positiveControl === 'Invalid'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {value.controlResults?.positiveControl || '-'}
                  </span>
                ) : (
                  <select
                    value={value.controlResults?.positiveControl || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        controlResults: {
                          ...value.controlResults,
                          positiveControl: e.target.value as
                            | 'Valid'
                            | 'Invalid'
                            | 'N/A',
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select</option>
                    <option value="Valid">Valid</option>
                    <option value="Invalid">Invalid</option>
                    <option value="N/A">N/A</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Negative Control
                </label>
                {readOnly ? (
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                      value.controlResults?.negativeControl === 'Valid'
                        ? 'bg-green-100 text-green-800'
                        : value.controlResults?.negativeControl === 'Invalid'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {value.controlResults?.negativeControl || '-'}
                  </span>
                ) : (
                  <select
                    value={value.controlResults?.negativeControl || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        controlResults: {
                          ...value.controlResults,
                          negativeControl: e.target.value as
                            | 'Valid'
                            | 'Invalid'
                            | 'N/A',
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select</option>
                    <option value="Valid">Valid</option>
                    <option value="Invalid">Invalid</option>
                    <option value="N/A">N/A</option>
                  </select>
                )}
              </div>
            </div>

            {/* Ct Values for PCR */}
            {isMolecularTest && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ct Value (if applicable)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">{value.ctValue ?? '-'}</span>
                ) : (
                  <Input
                    type="number"
                    step="0.1"
                    value={value.ctValue ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        ctValue: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 25.5"
                    className="max-w-xs"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes / Interpretation */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">
            Notes & Interpretation
          </h3>
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
                rows={2}
                placeholder="Clinical interpretation..."
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
