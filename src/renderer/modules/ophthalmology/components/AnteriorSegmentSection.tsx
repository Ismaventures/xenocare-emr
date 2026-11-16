// =============================================================================
// AnteriorSegmentSection Component
// Slit-lamp examination findings
// =============================================================================

import React from 'react';
import { INPUT_CLS, TABLE_INPUT_CLS, LABEL_CLS, SECTION_HEADING_CLS } from '../../../components/ui/ConsultationFormUI';
import type { EyeExamDTO, LensStatus } from '../types/ophthalmology.types';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';

// =============================================================================
// Types
// =============================================================================

interface AnteriorSegmentSectionProps {
  data: Partial<EyeExamDTO>;
  onChange: (updates: Partial<EyeExamDTO>) => void;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const LENS_STATUS_VALUES: LensStatus[] = [
  'Clear',
  'Early_Cataract',
  'Immature_Cataract',
  'Mature_Cataract',
  'Hypermature_Cataract',
  'Pseudophakia',
  'Aphakia',
];
const LENS_STATUS_OPTIONS: SelectOption[] = LENS_STATUS_VALUES.map((s) => ({
  value: s,
  label: s.replace(/_/g, ' '),
}));

const LIDS_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Ptosis', label: 'Ptosis' },
  { value: 'Entropion', label: 'Entropion' },
  { value: 'Ectropion', label: 'Ectropion' },
  { value: 'Lagophthalmos', label: 'Lagophthalmos' },
  { value: 'Swelling/Oedema', label: 'Swelling/Oedema' },
  { value: 'Lesion/Mass', label: 'Lesion/Mass' },
  { value: 'Trichiasis', label: 'Trichiasis' },
  { value: 'Blepharitis', label: 'Blepharitis' },
  { value: 'Chalazion/Stye', label: 'Chalazion/Stye' },
];

const CONJUNCTIVA_OPTIONS: SelectOption[] = [
  { value: 'White & quiet', label: 'White & quiet (normal)' },
  { value: 'Conjunctivitis', label: 'Conjunctivitis' },
  { value: 'Follicles', label: 'Follicles' },
  { value: 'Papillae', label: 'Papillae' },
  {
    value: 'Subconjunctival haemorrhage',
    label: 'Subconjunctival haemorrhage',
  },
  { value: 'Chemosis', label: 'Chemosis' },
  { value: 'Discharge', label: 'Discharge' },
  { value: 'Pterygium/Pinguecula', label: 'Pterygium/Pinguecula' },
  { value: 'Symblepharon', label: 'Symblepharon' },
];

const SCLERA_OPTIONS: SelectOption[] = [
  { value: 'White', label: 'White (normal)' },
  { value: 'Injected', label: 'Injected' },
  { value: 'Icterus', label: 'Icterus (jaundice)' },
  { value: 'Episcleritis', label: 'Episcleritis' },
  { value: 'Scleritis', label: 'Scleritis' },
  { value: 'Staphyloma', label: 'Staphyloma' },
];

const CORNEA_OPTIONS: SelectOption[] = [
  { value: 'Clear', label: 'Clear (normal)' },
  { value: 'Corneal ulcer', label: 'Corneal ulcer' },
  { value: 'Opacity/Scar', label: 'Opacity/Scar' },
  { value: 'Infiltrate', label: 'Infiltrate' },
  { value: 'Oedema', label: 'Oedema' },
  { value: 'Vascularisation', label: 'Vascularisation' },
  { value: 'Foreign body', label: 'Foreign body' },
  { value: 'Dystrophy', label: 'Dystrophy' },
  { value: 'Abrasion', label: 'Abrasion' },
  { value: 'Keratoconus', label: 'Keratoconus' },
];

const AC_FINDING_OPTIONS: SelectOption[] = [
  { value: 'Deep & quiet', label: 'Deep & quiet (normal)' },
  { value: 'Shallow', label: 'Shallow' },
  { value: 'Cells & flare (uveitis)', label: 'Cells & flare (uveitis)' },
  { value: 'Hyphaema', label: 'Hyphaema' },
  { value: 'Hypopyon', label: 'Hypopyon' },
  { value: 'Narrow angle', label: 'Narrow angle' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const IRIS_OPTIONS: SelectOption[] = [
  { value: 'Regular', label: 'Regular (normal)' },
  { value: 'Iridodonesis', label: 'Iridodonesis' },
  { value: 'Rubeosis iridis (NVI)', label: 'Rubeosis iridis (NVI)' },
  { value: 'PAS', label: 'PAS (Peripheral anterior synechia)' },
  { value: 'Posterior synechia', label: 'Posterior synechia' },
  { value: 'Coloboma', label: 'Coloboma' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const NORMAL_FINDINGS: Record<string, string> = {
  lids: 'Normal',
  lacrimal: 'Patent',
  conjunctiva: 'White & quiet',
  sclera: 'White',
  cornea: 'Clear',
  ac: 'Deep & quiet',
  iris: 'Regular',
  pupil: 'Round, regular',
  lens: 'Clear',
};

// =============================================================================
// Component
// =============================================================================

export default function AnteriorSegmentSection({
  data,
  onChange,
  readOnly = false,
}: AnteriorSegmentSectionProps) {
  const applyNormalOD = () => {
    if (readOnly) return;
    onChange({
      anterior_right_lids: NORMAL_FINDINGS.lids,
      anterior_right_lacrimal: NORMAL_FINDINGS.lacrimal,
      anterior_right_conjunctiva: NORMAL_FINDINGS.conjunctiva,
      anterior_right_sclera: NORMAL_FINDINGS.sclera,
      anterior_right_cornea: NORMAL_FINDINGS.cornea,
      anterior_right_ac: NORMAL_FINDINGS.ac,
      anterior_right_iris: NORMAL_FINDINGS.iris,
      anterior_right_pupil: NORMAL_FINDINGS.pupil,
      anterior_right_lens: NORMAL_FINDINGS.lens,
      anterior_right_lens_status: 'Clear' as LensStatus,
    });
  };

  const applyNormalOS = () => {
    if (readOnly) return;
    onChange({
      anterior_left_lids: NORMAL_FINDINGS.lids,
      anterior_left_lacrimal: NORMAL_FINDINGS.lacrimal,
      anterior_left_conjunctiva: NORMAL_FINDINGS.conjunctiva,
      anterior_left_sclera: NORMAL_FINDINGS.sclera,
      anterior_left_cornea: NORMAL_FINDINGS.cornea,
      anterior_left_ac: NORMAL_FINDINGS.ac,
      anterior_left_iris: NORMAL_FINDINGS.iris,
      anterior_left_pupil: NORMAL_FINDINGS.pupil,
      anterior_left_lens: NORMAL_FINDINGS.lens,
      anterior_left_lens_status: 'Clear' as LensStatus,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className={SECTION_HEADING_CLS}>Slit-Lamp Examination</h4>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyNormalOD}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Apply Normal (OD)
            </button>
            <button
              type="button"
              onClick={applyNormalOS}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Apply Normal (OS)
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2 text-left font-medium text-gray-700 border">
                Structure
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 border">
                Right Eye (OD)
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 border">
                Left Eye (OS)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Lids */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Lids
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:lids_right"
                  value={data.anterior_right_lids || ''}
                  onChange={(v) => onChange({ anterior_right_lids: v })}
                  options={LIDS_OPTIONS}
                  disabled={readOnly}
                  placeholder="Normal"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:lids_left"
                  value={data.anterior_left_lids || ''}
                  onChange={(v) => onChange({ anterior_left_lids: v })}
                  options={LIDS_OPTIONS}
                  disabled={readOnly}
                  placeholder="Normal"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Lacrimal */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Lacrimal
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.anterior_right_lacrimal || ''}
                  onChange={(e) =>
                    onChange({ anterior_right_lacrimal: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="Patent"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.anterior_left_lacrimal || ''}
                  onChange={(e) =>
                    onChange({ anterior_left_lacrimal: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="Patent"
                />
              </td>
            </tr>
            {/* Conjunctiva */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Conjunctiva
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:conjunctiva_right"
                  value={data.anterior_right_conjunctiva || ''}
                  onChange={(v) => onChange({ anterior_right_conjunctiva: v })}
                  options={CONJUNCTIVA_OPTIONS}
                  disabled={readOnly}
                  placeholder="White & quiet"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:conjunctiva_left"
                  value={data.anterior_left_conjunctiva || ''}
                  onChange={(v) => onChange({ anterior_left_conjunctiva: v })}
                  options={CONJUNCTIVA_OPTIONS}
                  disabled={readOnly}
                  placeholder="White & quiet"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Sclera */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Sclera
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:sclera_right"
                  value={data.anterior_right_sclera || ''}
                  onChange={(v) => onChange({ anterior_right_sclera: v })}
                  options={SCLERA_OPTIONS}
                  disabled={readOnly}
                  placeholder="White"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:sclera_left"
                  value={data.anterior_left_sclera || ''}
                  onChange={(v) => onChange({ anterior_left_sclera: v })}
                  options={SCLERA_OPTIONS}
                  disabled={readOnly}
                  placeholder="White"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Cornea */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Cornea
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:cornea_right"
                  value={data.anterior_right_cornea || ''}
                  onChange={(v) => onChange({ anterior_right_cornea: v })}
                  options={CORNEA_OPTIONS}
                  disabled={readOnly}
                  placeholder="Clear"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:cornea_left"
                  value={data.anterior_left_cornea || ''}
                  onChange={(v) => onChange({ anterior_left_cornea: v })}
                  options={CORNEA_OPTIONS}
                  disabled={readOnly}
                  placeholder="Clear"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Anterior Chamber */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                A/C
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:ac_right"
                  value={data.anterior_right_ac || ''}
                  onChange={(v) => onChange({ anterior_right_ac: v })}
                  options={AC_FINDING_OPTIONS}
                  disabled={readOnly}
                  placeholder="Deep & quiet"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:ac_left"
                  value={data.anterior_left_ac || ''}
                  onChange={(v) => onChange({ anterior_left_ac: v })}
                  options={AC_FINDING_OPTIONS}
                  disabled={readOnly}
                  placeholder="Deep & quiet"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Iris */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Iris
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:iris_right"
                  value={data.anterior_right_iris || ''}
                  onChange={(v) => onChange({ anterior_right_iris: v })}
                  options={IRIS_OPTIONS}
                  disabled={readOnly}
                  placeholder="Regular"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:iris_left"
                  value={data.anterior_left_iris || ''}
                  onChange={(v) => onChange({ anterior_left_iris: v })}
                  options={IRIS_OPTIONS}
                  disabled={readOnly}
                  placeholder="Regular"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Pupil */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Pupil
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.anterior_right_pupil || ''}
                  onChange={(e) =>
                    onChange({ anterior_right_pupil: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="Round, regular"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.anterior_left_pupil || ''}
                  onChange={(e) =>
                    onChange({ anterior_left_pupil: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="Round, regular"
                />
              </td>
            </tr>
            {/* Lens */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Lens
              </td>
              <td className="px-3 py-2 border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={data.anterior_right_lens || ''}
                    onChange={(e) =>
                      onChange({ anterior_right_lens: e.target.value })
                    }
                    disabled={readOnly}
                    className={`flex-1 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                    placeholder="Clear"
                  />
                  <SelectWithOther
                    fieldId="eye:lens_status"
                    value={data.anterior_right_lens_status || ''}
                    onChange={(v) =>
                      onChange({
                        anterior_right_lens_status:
                          (v as LensStatus) || undefined,
                      })
                    }
                    options={LENS_STATUS_OPTIONS}
                    disabled={readOnly}
                    placeholder="Status"
                    className={`w-32 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                  />
                </div>
              </td>
              <td className="px-3 py-2 border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={data.anterior_left_lens || ''}
                    onChange={(e) =>
                      onChange({ anterior_left_lens: e.target.value })
                    }
                    disabled={readOnly}
                    className={`flex-1 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                    placeholder="Clear"
                  />
                  <SelectWithOther
                    fieldId="eye:lens_status"
                    value={data.anterior_left_lens_status || ''}
                    onChange={(v) =>
                      onChange({
                        anterior_left_lens_status:
                          (v as LensStatus) || undefined,
                      })
                    }
                    options={LENS_STATUS_OPTIONS}
                    disabled={readOnly}
                    placeholder="Status"
                    className={`w-32 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Gonioscopy */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Gonioscopy (if performed)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>OD</label>
            <input
              type="text"
              value={data.gonioscopy_right || ''}
              onChange={(e) => onChange({ gonioscopy_right: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Open 360°"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>OS</label>
            <input
              type="text"
              value={data.gonioscopy_left || ''}
              onChange={(e) => onChange({ gonioscopy_left: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Open 360°"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
