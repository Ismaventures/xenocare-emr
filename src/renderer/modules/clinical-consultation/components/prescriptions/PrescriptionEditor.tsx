import React, { useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Pill,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { SearchableSelect, SearchableOption } from '../../../../components/ui';
import {
  DOSAGE_OPTIONS,
  DURATION_OPTIONS,
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
} from '../../../pharmacy/dtos/pharmacy.dto';
import { PrescriptionOrderDTO } from '../../dtos/consultation.dto';

interface PrescriptionEditorProps {
  prescriptions: PrescriptionOrderDTO[];
  onChange: (prescriptions: PrescriptionOrderDTO[]) => void;
  drugOptions: SearchableOption[];
  clinicalNotes?: string;
  diagnosis?: string[];
  disabled?: boolean;
}

interface DraftPrescription {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  quantity_prescribed: number;
  instructions: string;
}

const EMPTY_EXTERNAL_DRAFT: DraftPrescription = {
  drug_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: 'Oral',
  quantity_prescribed: 1,
  instructions: '',
};

const FIELD_CLS =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30';

function isComplete(rx: PrescriptionOrderDTO): boolean {
  return Boolean(rx.dosage?.trim() && rx.frequency?.trim());
}

export default function PrescriptionEditor({
  prescriptions,
  onChange,
  drugOptions,
  clinicalNotes,
  diagnosis,
  disabled = false,
}: PrescriptionEditorProps) {
  const dosageListId = useId();
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalDraft, setExternalDraft] =
    useState<DraftPrescription>(EMPTY_EXTERNAL_DRAFT);

  const drugSelectOptions = useMemo(
    () =>
      drugOptions.map((drug) => ({
        value: drug.id,
        label: [drug.name, drug.extraInfo, drug.category]
          .filter(Boolean)
          .join(' ? '),
      })),
    [drugOptions],
  );

  const addClinicMedication = (drugId: string) => {
    setSelectedDrugId('');
    if (!drugId) return;
    if (prescriptions.some((rx) => rx.drug_id === drugId && !rx.is_external)) {
      return;
    }

    const drug = drugOptions.find((option) => option.id === drugId);
    if (!drug) return;

    onChange([
      ...prescriptions,
      {
        drug_id: drug.id,
        drug_name: drug.name,
        dosage: '',
        frequency: '',
        duration: '',
        route: 'Oral',
        quantity_prescribed: 1,
        price: drug.price ?? undefined,
        is_external: false,
        clinical_notes: clinicalNotes,
        diagnosis,
      },
    ]);
  };

  const addExternalMedication = () => {
    const name = externalDraft.drug_name.trim();
    if (!name) return;

    onChange([
      ...prescriptions,
      {
        drug_id: undefined,
        drug_name: name,
        dosage: externalDraft.dosage.trim(),
        frequency: externalDraft.frequency.trim(),
        duration: externalDraft.duration.trim(),
        route: externalDraft.route,
        quantity_prescribed: externalDraft.quantity_prescribed,
        instructions: externalDraft.instructions.trim() || undefined,
        price: 0,
        is_external: true,
        clinical_notes: clinicalNotes,
        diagnosis,
      },
    ]);
    setExternalDraft(EMPTY_EXTERNAL_DRAFT);
    setShowExternalForm(false);
  };

  const updatePrescription = (
    index: number,
    patch: Partial<PrescriptionOrderDTO>,
  ) => {
    onChange(
      prescriptions.map((rx, currentIndex) =>
        currentIndex === index ? { ...rx, ...patch } : rx,
      ),
    );
  };

  const removePrescription = (index: number) => {
    onChange(prescriptions.filter((_, currentIndex) => currentIndex !== index));
  };

  const canAddExternal = externalDraft.drug_name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Add clinic medication
            </label>
            <SearchableSelect
              value={selectedDrugId}
              onChange={addClinicMedication}
              options={drugSelectOptions}
              placeholder="Search clinic pharmacy by name, strength, or category..."
              disabled={disabled}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowExternalForm((open) => !open)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink size={16} />
            Prescribe External Medication
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Clinic medications go to pharmacy for dispensing. External medicines
          are recorded on the consultation only and are not sent to pharmacy or
          billing.
        </p>
      </div>

      {showExternalForm && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <ExternalLink size={16} />
                External medication
              </h4>
              <p className="mt-0.5 text-xs text-amber-700">
                Not available in clinic. Enter the medicine exactly as it should
                appear on the patient record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExternalForm(false)}
              className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-100"
              title="Close external medication form"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Medication name *
              </label>
              <input
                type="text"
                value={externalDraft.drug_name}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    drug_name: event.target.value,
                  }))
                }
                placeholder="e.g. Insulin glargine 100 units/ml"
                className={FIELD_CLS}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Dosage
              </label>
              <input
                type="text"
                list={dosageListId}
                value={externalDraft.dosage}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    dosage: event.target.value,
                  }))
                }
                placeholder="e.g. 10 units"
                className={FIELD_CLS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Frequency
              </label>
              <select
                value={externalDraft.frequency}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    frequency: event.target.value,
                  }))
                }
                className={FIELD_CLS}
              >
                <option value="">Select</option>
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Duration
              </label>
              <select
                value={externalDraft.duration}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    duration: event.target.value,
                  }))
                }
                className={FIELD_CLS}
              >
                <option value="">Select</option>
                {DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Route
              </label>
              <select
                value={externalDraft.route}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    route: event.target.value,
                  }))
                }
                className={FIELD_CLS}
              >
                {ROUTE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={externalDraft.quantity_prescribed}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    quantity_prescribed: parseInt(event.target.value, 10) || 1,
                  }))
                }
                className={FIELD_CLS}
              />
            </div>
            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Instructions
              </label>
              <input
                type="text"
                value={externalDraft.instructions}
                onChange={(event) =>
                  setExternalDraft((draft) => ({
                    ...draft,
                    instructions: event.target.value,
                  }))
                }
                placeholder="e.g. Inject subcutaneously at bedtime; monitor blood glucose"
                className={FIELD_CLS}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addExternalMedication}
                disabled={!canAddExternal}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <datalist id={dosageListId}>
        {DOSAGE_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <Pill className="mx-auto mb-2 h-6 w-6 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">
            No medications added
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Search the clinic pharmacy above or prescribe an external medicine.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx, index) => (
            <div
              key={`${rx.is_external ? 'external' : 'clinic'}-${rx.drug_id || rx.drug_name}-${index}`}
              className={`rounded-2xl border p-4 shadow-sm ${
                rx.is_external
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {rx.drug_name}
                    </span>
                    {rx.is_external ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        <ExternalLink size={10} />
                        External · not dispensed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <CheckCircle2 size={10} />
                        Clinic pharmacy
                      </span>
                    )}
                    {!isComplete(rx) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        <AlertCircle size={10} />
                        Add dosage & frequency
                      </span>
                    )}
                  </div>
                  {!rx.is_external && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Will be sent to pharmacy for review and dispensing.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePrescription(index)}
                  disabled={disabled}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  title="Remove medication"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    list={dosageListId}
                    value={rx.dosage}
                    onChange={(event) =>
                      updatePrescription(index, { dosage: event.target.value })
                    }
                    placeholder="e.g. 1 tablet"
                    className={FIELD_CLS}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Frequency *
                  </label>
                  <select
                    value={rx.frequency}
                    onChange={(event) =>
                      updatePrescription(index, {
                        frequency: event.target.value,
                      })
                    }
                    className={FIELD_CLS}
                  >
                    <option value="">Select</option>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Duration
                  </label>
                  <select
                    value={rx.duration || ''}
                    onChange={(event) =>
                      updatePrescription(index, { duration: event.target.value })
                    }
                    className={FIELD_CLS}
                  >
                    <option value="">Select</option>
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Route
                  </label>
                  <select
                    value={rx.route || 'Oral'}
                    onChange={(event) =>
                      updatePrescription(index, { route: event.target.value })
                    }
                    className={FIELD_CLS}
                  >
                    {ROUTE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rx.quantity_prescribed}
                    onChange={(event) =>
                      updatePrescription(index, {
                        quantity_prescribed: parseInt(event.target.value, 10) || 1,
                      })
                    }
                    className={FIELD_CLS}
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">
                    Instructions
                  </label>
                  <input
                    type="text"
                    value={rx.instructions || ''}
                    onChange={(event) =>
                      updatePrescription(index, {
                        instructions: event.target.value || undefined,
                      })
                    }
                    placeholder="Take with food..."
                    className={FIELD_CLS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
