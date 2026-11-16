import React, { useId } from 'react';

const COMMON_SPECIMEN_TYPES = [
  'Blood',
  'Blood (EDTA)',
  'Blood (Plain)',
  'Urine',
  'Stool',
  'Sputum',
  'Swab',
  'Cerebrospinal Fluid',
  'Semen',
  'Other',
];

interface LabSpecimenFieldsProps {
  specimenType?: string;
  specimenIdentifier?: string;
  onChange: (patch: {
    specimen_type?: string;
    specimen_identifier?: string;
  }) => void;
  disabled?: boolean;
}

export default function LabSpecimenFields({
  specimenType,
  specimenIdentifier,
  onChange,
  disabled = false,
}: LabSpecimenFieldsProps) {
  const listId = useId();

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-gray-500">
          Specimen type
        </label>
        <input
          type="text"
          list={listId}
          value={specimenType || ''}
          onChange={(event) =>
            onChange({ specimen_type: event.target.value || undefined })
          }
          disabled={disabled}
          placeholder="Blood, Urine, Sputum..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-gray-500">
          Specimen identification no.
        </label>
        <input
          type="text"
          value={specimenIdentifier || ''}
          onChange={(event) =>
            onChange({
              specimen_identifier: event.target.value || undefined,
            })
          }
          disabled={disabled}
          placeholder="Optional"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600/30"
        />
      </div>
      <datalist id={listId}>
        {COMMON_SPECIMEN_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
    </div>
  );
}
