// =============================================================================
// VisualAcuitySection Component
// Visual acuity, IOP, and pupil assessment section
// =============================================================================

import React from 'react';
import { INPUT_CLS, TABLE_INPUT_CLS, LABEL_CLS, SECTION_HEADING_CLS } from '../../../components/ui/ConsultationFormUI';
import type { EyeExamDTO, IOPMethod } from '../types/ophthalmology.types';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';

// =============================================================================
// Types
// =============================================================================

interface VisualAcuitySectionProps {
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
const NEAR_VA_VALUES = [
  'N5',
  'N6',
  'N8',
  'N10',
  'N12',
  'N14',
  'N18',
  'N24',
  'N36',
  'N48',
];
const NEAR_VA_OPTIONS: SelectOption[] = NEAR_VA_VALUES.map((v) => ({
  value: v,
  label: v,
}));
const IOP_METHODS: IOPMethod[] = [
  'NCT',
  'Goldmann',
  'iCare',
  'Schiotz',
  'Palpation',
];
const IOP_METHOD_OPTIONS: SelectOption[] = IOP_METHODS.map((m) => ({
  value: m,
  label: m,
}));
const PUPIL_REACTIONS_LIST = ['Brisk', 'Sluggish', 'Fixed', 'RAPD'];
const PUPIL_REACTION_OPTIONS: SelectOption[] = PUPIL_REACTIONS_LIST.map(
  (r) => ({ value: r, label: r }),
);

const COVER_TEST_OPTIONS: SelectOption[] = [
  { value: 'Orthophoria', label: 'Orthophoria (normal)' },
  { value: 'Exophoria', label: 'Exophoria' },
  { value: 'Esophoria', label: 'Esophoria' },
  { value: 'Exotropia', label: 'Exotropia (XT)' },
  { value: 'Esotropia', label: 'Esotropia (ET)' },
  { value: 'Hyperphoria', label: 'Hyperphoria' },
  { value: 'Hypertropia', label: 'Hypertropia' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const OCULAR_MOTILITY_OPTIONS: SelectOption[] = [
  { value: 'Full in all gazes', label: 'Full in all gazes (normal)' },
  { value: 'Restricted right gaze', label: 'Restricted right gaze' },
  { value: 'Restricted left gaze', label: 'Restricted left gaze' },
  { value: 'Restricted upgaze', label: 'Restricted upgaze' },
  { value: 'Restricted downgaze', label: 'Restricted downgaze' },
  { value: 'Nystagmus', label: 'Nystagmus' },
  { value: 'Diplopia', label: 'Diplopia' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const COLOUR_VISION_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Defective (OD)', label: 'Defective (OD)' },
  { value: 'Defective (OS)', label: 'Defective (OS)' },
  { value: 'Defective (both)', label: 'Defective (both)' },
  { value: 'Not tested', label: 'Not tested' },
];

const VISUAL_FIELDS_OPTIONS: SelectOption[] = [
  { value: 'Full to confrontation', label: 'Full to confrontation (normal)' },
  { value: 'Right temporal defect', label: 'Right temporal defect' },
  { value: 'Left temporal defect', label: 'Left temporal defect' },
  { value: 'Central scotoma (OD)', label: 'Central scotoma (OD)' },
  { value: 'Central scotoma (OS)', label: 'Central scotoma (OS)' },
  { value: 'Bitemporal hemianopia', label: 'Bitemporal hemianopia' },
  { value: 'Left homonymous hemianopia', label: 'Left homonymous hemianopia' },
  {
    value: 'Right homonymous hemianopia',
    label: 'Right homonymous hemianopia',
  },
  { value: 'Tunnel vision', label: 'Tunnel vision' },
  { value: 'Not tested', label: 'Not tested' },
];

// =============================================================================
// Component
// =============================================================================

export default function VisualAcuitySection({
  data,
  onChange,
  readOnly = false,
}: VisualAcuitySectionProps) {
  return (
    <div className="space-y-6">
      {/* Visual Acuity Table */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>Visual Acuity</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700 border">
                  Type
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                  Right Eye (OD)
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-700 border">
                  Left Eye (OS)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Unaided */}
              <tr>
                <td className="px-3 py-2 text-sm text-gray-700 border">
                  Unaided
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_right_unaided"
                    value={data.va_right_unaided || ''}
                    onChange={(v) => onChange({ va_right_unaided: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_left_unaided"
                    value={data.va_left_unaided || ''}
                    onChange={(v) => onChange({ va_left_unaided: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              {/* Aided */}
              <tr>
                <td className="px-3 py-2 text-sm text-gray-700 border">
                  Aided
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_right_aided"
                    value={data.va_right_aided || ''}
                    onChange={(v) => onChange({ va_right_aided: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_left_aided"
                    value={data.va_left_aided || ''}
                    onChange={(v) => onChange({ va_left_aided: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              {/* Pinhole */}
              <tr>
                <td className="px-3 py-2 text-sm text-gray-700 border">
                  Pinhole
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_right_pinhole"
                    value={data.va_right_pinhole || ''}
                    onChange={(v) => onChange({ va_right_pinhole: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_left_pinhole"
                    value={data.va_left_pinhole || ''}
                    onChange={(v) => onChange({ va_left_pinhole: v })}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              {/* Near */}
              <tr>
                <td className="px-3 py-2 text-sm text-gray-700 border">Near</td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_right_near"
                    value={data.va_right_near || ''}
                    onChange={(v) => onChange({ va_right_near: v })}
                    options={NEAR_VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="px-3 py-2 border">
                  <SelectWithOther
                    fieldId="eye:va_left_near"
                    value={data.va_left_near || ''}
                    onChange={(v) => onChange({ va_left_near: v })}
                    options={NEAR_VA_OPTIONS}
                    disabled={readOnly}
                    placeholder="-"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              {/* Colour Vision */}
              <tr>
                <td className="px-3 py-2 text-sm text-gray-700 border">
                  Colour Vision
                </td>
                <td className="px-3 py-2 border" colSpan={2}>
                  <SelectWithOther
                    fieldId="eye:colour_vision"
                    value={data.color_vision || ''}
                    onChange={(v) => onChange({ color_vision: v })}
                    options={COLOUR_VISION_OPTIONS}
                    disabled={readOnly}
                    placeholder="Not tested"
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* IOP */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Intraocular Pressure (IOP)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={LABEL_CLS}>
              OD (mmHg)
            </label>
            <input
              type="number"
              value={data.iop_right ?? ''}
              onChange={(e) =>
                onChange({
                  iop_right: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              OS (mmHg)
            </label>
            <input
              type="number"
              value={data.iop_left ?? ''}
              onChange={(e) =>
                onChange({
                  iop_left: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Method</label>
            <SelectWithOther
              fieldId="eye:iop_method"
              value={data.iop_method || ''}
              onChange={(v) =>
                onChange({ iop_method: (v as IOPMethod) || undefined })
              }
              options={IOP_METHOD_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Time</label>
            <input
              type="time"
              value={data.iop_time || ''}
              onChange={(e) => onChange({ iop_time: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
        {(data.iop_right && data.iop_right > 21) ||
        (data.iop_left && data.iop_left > 21) ? (
          <p className="mt-2 text-sm text-amber-600">
            ⚠️ IOP elevated ({'>'}21 mmHg)
          </p>
        ) : null}
      </div>

      {/* Pupils */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>Pupils</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={LABEL_CLS}>
              OD Size (mm)
            </label>
            <input
              type="number"
              step={0.5}
              value={data.pupil_right_size ?? ''}
              onChange={(e) =>
                onChange({
                  pupil_right_size: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              OD Reaction
            </label>
            <SelectWithOther
              fieldId="eye:pupil_reaction"
              value={data.pupil_right_reaction || ''}
              onChange={(v) =>
                onChange({ pupil_right_reaction: (v as any) || undefined })
              }
              options={PUPIL_REACTION_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              OS Size (mm)
            </label>
            <input
              type="number"
              step={0.5}
              value={data.pupil_left_size ?? ''}
              onChange={(e) =>
                onChange({
                  pupil_left_size: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              OS Reaction
            </label>
            <SelectWithOther
              fieldId="eye:pupil_reaction"
              value={data.pupil_left_reaction || ''}
              onChange={(v) =>
                onChange({ pupil_left_reaction: (v as any) || undefined })
              }
              options={PUPIL_REACTION_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Central Corneal Thickness (Pachymetry) */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>
          Central Corneal Thickness (Pachymetry)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>OD (μm)</label>
            <input
              type="number"
              value={data.cct_right ?? ''}
              onChange={(e) =>
                onChange({
                  cct_right: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 545"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>OS (μm)</label>
            <input
              type="number"
              value={data.cct_left ?? ''}
              onChange={(e) =>
                onChange({
                  cct_left: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 545"
            />
          </div>
        </div>
      </div>

      {/* Ocular Motility */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>Ocular Motility</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>
              Cover Test
            </label>
            <SelectWithOther
              fieldId="eye:cover_test"
              value={data.cover_test || ''}
              onChange={(v) => onChange({ cover_test: v })}
              options={COVER_TEST_OPTIONS}
              disabled={readOnly}
              placeholder="Orthophoria"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Ocular Motility
            </label>
            <SelectWithOther
              fieldId="eye:ocular_motility"
              value={data.ocular_motility || ''}
              onChange={(v) => onChange({ ocular_motility: v })}
              options={OCULAR_MOTILITY_OPTIONS}
              disabled={readOnly}
              placeholder="Full in all gazes"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Convergence
            </label>
            <input
              type="text"
              value={data.convergence || ''}
              onChange={(e) => onChange({ convergence: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., Normal"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>NPC (cm)</label>
            <input
              type="text"
              value={data.npc || ''}
              onChange={(e) => onChange({ npc: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 8 cm"
            />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>
              Visual Fields (Confrontation)
            </label>
            <SelectWithOther
              fieldId="eye:visual_fields_confrontation"
              value={data.visual_fields_confrontation || ''}
              onChange={(v) => onChange({ visual_fields_confrontation: v })}
              options={VISUAL_FIELDS_OPTIONS}
              disabled={readOnly}
              placeholder="Full to confrontation"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
