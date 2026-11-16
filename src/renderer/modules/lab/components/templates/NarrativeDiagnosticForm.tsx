import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Microscope,
  ClipboardCheck,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Input, Textarea } from '../../../../components/ui';
import { NarrativeDiagnosticResult } from '../../dtos/lab-templates.dto';

// =============================================================================
// Types
// =============================================================================

interface NarrativeDiagnosticFormProps {
  value: NarrativeDiagnosticResult;
  onChange: (value: NarrativeDiagnosticResult) => void;
  testName?: string;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SPECIMEN_TYPES = [
  'Tissue biopsy',
  'Excision specimen',
  'Fine needle aspirate',
  'Core biopsy',
  'Curettings',
  'Resection specimen',
  'Fluid cytology',
  'Bone marrow aspirate',
  'Bone marrow trephine',
  'Lymph node',
  'Skin biopsy',
  'Cervical smear',
  'Other',
];

const FIXATION_TYPES = [
  '10% Formalin',
  'Buffered formalin',
  '70% Alcohol',
  'Cytology fixative',
  'Fresh',
  'Frozen',
  'Other',
];

const COMMON_STAINS = [
  { name: 'H&E', fullName: 'Hematoxylin & Eosin' },
  { name: 'PAS', fullName: 'Periodic Acid-Schiff' },
  { name: 'Giemsa', fullName: 'Giemsa' },
  { name: 'Gram', fullName: 'Gram stain' },
  { name: 'ZN', fullName: 'Ziehl-Neelsen' },
  { name: 'Congo Red', fullName: 'Congo Red (Amyloid)' },
  { name: 'Masson Trichrome', fullName: 'Masson Trichrome' },
  { name: 'Reticulin', fullName: 'Reticulin' },
  { name: 'IHC', fullName: 'Immunohistochemistry' },
];

// =============================================================================
// Component
// =============================================================================

export default function NarrativeDiagnosticForm({
  value,
  onChange,
  testName,
  readOnly = false,
}: NarrativeDiagnosticFormProps) {
  const [activeSection, setActiveSection] = useState<
    'specimen' | 'macro' | 'micro' | 'diagnosis'
  >('specimen');

  const sections = [
    { id: 'specimen', label: 'Specimen', icon: FileText, color: 'purple' },
    { id: 'macro', label: 'Macroscopy', icon: Eye, color: 'blue' },
    { id: 'micro', label: 'Microscopy', icon: Microscope, color: 'green' },
    {
      id: 'diagnosis',
      label: 'Diagnosis',
      icon: ClipboardCheck,
      color: 'orange',
    },
  ] as const;

  const getSectionCompleteness = (section: typeof activeSection): boolean => {
    switch (section) {
      case 'specimen':
        return !!(value.specimenDescription && value.specimenSite);
      case 'macro':
        return !!value.macroscopy;
      case 'micro':
        return !!value.microscopy;
      case 'diagnosis':
        return !!value.diagnosis;
    }
  };

  const toggleStain = (stainName: string) => {
    const currentStains = value.specialStains || [];
    if (currentStains.includes(stainName)) {
      onChange({
        ...value,
        specialStains: currentStains.filter((s) => s !== stainName),
      });
    } else {
      onChange({
        ...value,
        specialStains: [...currentStains, stainName],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {sections.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeSection === id
                ? `bg-white text-${color}-700 shadow-sm`
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {getSectionCompleteness(id) ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-gray-300" />
            )}
          </button>
        ))}
      </div>

      {/* Specimen Section */}
      {activeSection === 'specimen' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
            <h3 className="font-semibold text-purple-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Specimen Information
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  Anatomical Site *
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.specimenSite || '-'}
                  </span>
                ) : (
                  <Input
                    value={value.specimenSite || ''}
                    onChange={(e) =>
                      onChange({ ...value, specimenSite: e.target.value })
                    }
                    placeholder="e.g., Left breast, upper outer quadrant"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specimen Description *
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {value.specimenDescription || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.specimenDescription || ''}
                  onChange={(e) =>
                    onChange({ ...value, specimenDescription: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe the specimen received, including container, labeling, and number of pieces..."
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fixation
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.fixationType || '-'}
                  </span>
                ) : (
                  <select
                    value={value.fixationType || ''}
                    onChange={(e) =>
                      onChange({ ...value, fixationType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Fixation</option>
                    {FIXATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical History
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.clinicalHistory || '-'}
                  </span>
                ) : (
                  <Input
                    value={value.clinicalHistory || ''}
                    onChange={(e) =>
                      onChange({ ...value, clinicalHistory: e.target.value })
                    }
                    placeholder="Relevant clinical information..."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Macroscopy Section */}
      {activeSection === 'macro' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Macroscopic Examination
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Macroscopic Description *
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {(typeof value.macroscopy === 'string'
                    ? value.macroscopy
                    : value.macroscopy?.grossDescription) || '-'}
                </p>
              ) : (
                <Textarea
                  value={
                    (typeof value.macroscopy === 'string'
                      ? value.macroscopy
                      : value.macroscopy?.grossDescription) || ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      macroscopy: { grossDescription: e.target.value },
                    })
                  }
                  rows={6}
                  placeholder="Describe gross appearance: size, shape, color, consistency, cut surface, margins, any lesions..."
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size (cm)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.specimenSize || '-'}
                  </span>
                ) : (
                  <Input
                    value={value.specimenSize || ''}
                    onChange={(e) =>
                      onChange({ ...value, specimenSize: e.target.value })
                    }
                    placeholder="e.g., 3.5 x 2.0 x 1.5"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (g)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.specimenWeight ?? '-'}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="0.1"
                    value={value.specimenWeight ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        specimenWeight: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 25.5"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blocks Submitted
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.blocksSubmitted ?? '-'}
                  </span>
                ) : (
                  <Input
                    type="number"
                    value={value.blocksSubmitted ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        blocksSubmitted: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 4"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Microscopy Section */}
      {activeSection === 'micro' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-200">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <Microscope className="h-5 w-5" />
              Microscopic Examination
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microscopic Description *
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {(typeof value.microscopy === 'string'
                    ? value.microscopy
                    : value.microscopy?.microscopicFindings) || '-'}
                </p>
              ) : (
                <Textarea
                  value={
                    (typeof value.microscopy === 'string'
                      ? value.microscopy
                      : value.microscopy?.microscopicFindings) || ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      microscopy: { microscopicFindings: e.target.value },
                    })
                  }
                  rows={8}
                  placeholder="Describe histological features: architecture, cell types, nuclear features, mitoses, stroma, inflammation, necrosis, margins, special features..."
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Stains Performed
              </label>
              {readOnly ? (
                <div className="flex flex-wrap gap-2">
                  {(value.specialStains || []).map((stain) => (
                    <span
                      key={stain}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm"
                    >
                      {stain}
                    </span>
                  ))}
                  {(!value.specialStains ||
                    value.specialStains.length === 0) && (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {COMMON_STAINS.map(({ name, fullName }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleStain(name)}
                      title={fullName}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        value.specialStains?.includes(name)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Stain Results
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {value.specialStainResults || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.specialStainResults || ''}
                  onChange={(e) =>
                    onChange({ ...value, specialStainResults: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe results of special stains/IHC..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Section */}
      {activeSection === 'diagnosis' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
            <h3 className="font-semibold text-orange-800 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Diagnosis & Conclusion
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis *
              </label>
              {readOnly ? (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap font-medium">
                    {(typeof value.diagnosis === 'string'
                      ? value.diagnosis
                      : value.diagnosis?.finalDiagnosis) ||
                      value.finalDiagnosis ||
                      '-'}
                  </p>
                </div>
              ) : (
                <Textarea
                  value={
                    (typeof value.diagnosis === 'string'
                      ? value.diagnosis
                      : value.diagnosis?.finalDiagnosis) ||
                    value.finalDiagnosis ||
                    ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      finalDiagnosis: e.target.value,
                      diagnosis: { finalDiagnosis: e.target.value },
                    })
                  }
                  rows={4}
                  placeholder="Final diagnosis with anatomical site..."
                  className="font-medium"
                />
              )}
            </div>

            {/* Staging/Grading (for malignancies) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tumor Grade
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.tumorGrade || '-'}
                  </span>
                ) : (
                  <Input
                    value={value.tumorGrade || ''}
                    onChange={(e) =>
                      onChange({ ...value, tumorGrade: e.target.value })
                    }
                    placeholder="e.g., Grade 2 (moderately differentiated)"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  pTNM Staging
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {value.ptnmStage || '-'}
                  </span>
                ) : (
                  <Input
                    value={value.ptnmStage || ''}
                    onChange={(e) =>
                      onChange({ ...value, ptnmStage: e.target.value })
                    }
                    placeholder="e.g., pT2N0Mx"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margin Status
              </label>
              {readOnly ? (
                <span
                  className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                    value.marginStatus === 'Clear'
                      ? 'bg-green-100 text-green-800'
                      : value.marginStatus === 'Involved'
                        ? 'bg-red-100 text-red-800'
                        : value.marginStatus === 'Close'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {value.marginStatus || '-'}
                </span>
              ) : (
                <select
                  value={value.marginStatus || ''}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      marginStatus: e.target.value as
                        | 'Clear'
                        | 'Involved'
                        | 'Close'
                        | 'Not Applicable',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg max-w-xs"
                >
                  <option value="">Select</option>
                  <option value="Clear">Clear</option>
                  <option value="Close">Close (&lt;1mm)</option>
                  <option value="Involved">Involved</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments / Recommendations
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {value.comments || '-'}
                </p>
              ) : (
                <Textarea
                  value={value.comments || ''}
                  onChange={(e) =>
                    onChange({ ...value, comments: e.target.value })
                  }
                  rows={3}
                  placeholder="Additional comments, limitations, recommendations for further workup..."
                />
              )}
            </div>

            {/* Addendum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Addendum
              </label>
              {readOnly ? (
                value.addendum ? (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      ADDENDUM
                    </p>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {value.addendum}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-500">-</span>
                )
              ) : (
                <Textarea
                  value={value.addendum || ''}
                  onChange={(e) =>
                    onChange({ ...value, addendum: e.target.value })
                  }
                  rows={2}
                  placeholder="Additional information added after initial report..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Strip */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Report Completeness</span>
          <div className="flex items-center gap-2">
            {sections.map(({ id, label }) => (
              <div
                key={id}
                className={`px-2 py-1 text-xs rounded ${
                  getSectionCompleteness(id)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
