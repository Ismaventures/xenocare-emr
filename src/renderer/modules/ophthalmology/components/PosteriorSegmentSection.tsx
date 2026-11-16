// =============================================================================
// PosteriorSegmentSection Component
// Fundoscopy examination findings
// =============================================================================

import React from 'react';
import { INPUT_CLS, TABLE_INPUT_CLS, LABEL_CLS, SECTION_HEADING_CLS, ToggleField } from '../../../components/ui/ConsultationFormUI';
import type {
  EyeExamDTO,
  DiscColor,
  FovealReflex,
} from '../types/ophthalmology.types';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';

// =============================================================================
// Types
// =============================================================================

interface PosteriorSegmentSectionProps {
  data: Partial<EyeExamDTO>;
  onChange: (updates: Partial<EyeExamDTO>) => void;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DILATION_AGENT_OPTIONS: SelectOption[] = [
  { value: 'Tropicamide 1%', label: 'Tropicamide 1%' },
  { value: 'Phenylephrine 2.5%', label: 'Phenylephrine 2.5%' },
  { value: 'Cyclopentolate 1%', label: 'Cyclopentolate 1%' },
  { value: 'Atropine 1%', label: 'Atropine 1%' },
  { value: 'Combination', label: 'Combination' },
];

const DISC_COLOR_VALUES: DiscColor[] = ['Pink', 'Pale', 'Hyperemic'];
const DISC_COLOR_OPTIONS: SelectOption[] = DISC_COLOR_VALUES.map((c) => ({
  value: c,
  label: c,
}));
const FOVEAL_REFLEX_VALUES: FovealReflex[] = ['Present', 'Absent', 'Dull'];
const FOVEAL_REFLEX_OPTIONS: SelectOption[] = FOVEAL_REFLEX_VALUES.map((r) => ({
  value: r,
  label: r,
}));

const MEDIA_OPTIONS: SelectOption[] = [
  { value: 'Clear', label: 'Clear (normal)' },
  { value: 'Haze', label: 'Haze' },
  { value: 'Dense cataract', label: 'Dense cataract' },
  { value: 'Vitreous haemorrhage', label: 'Vitreous haemorrhage' },
  { value: 'Not assessable', label: 'Not assessable' },
];

const DISC_OPTIONS: SelectOption[] = [
  { value: 'Pink, healthy', label: 'Pink, healthy (normal)' },
  { value: 'Pale/Atrophy', label: 'Pale/Atrophy' },
  { value: 'Swollen/Papilloedema', label: 'Swollen/Papilloedema' },
  { value: 'Cupped (glaucoma)', label: 'Cupped (glaucoma)' },
  { value: 'Disc haemorrhage', label: 'Disc haemorrhage' },
  { value: 'NVD (neovascularisation)', label: 'NVD (neovascularisation)' },
  { value: 'Drusen', label: 'Drusen' },
];

const MACULA_OPTIONS: SelectOption[] = [
  { value: 'Healthy', label: 'Healthy (normal foveal reflex)' },
  { value: 'Macular scar', label: 'Macular scar' },
  { value: 'Drusen (AMD)', label: 'Drusen (AMD)' },
  { value: 'Macular haemorrhage', label: 'Macular haemorrhage' },
  { value: 'Hard exudates', label: 'Hard exudates' },
  { value: 'Epiretinal membrane', label: 'Epiretinal membrane (ERM)' },
  { value: 'CMO/Macular oedema', label: 'CMO/Macular oedema' },
  { value: 'Macular hole', label: 'Macular hole' },
  { value: 'CNV (ARMD wet)', label: 'CNV (ARMD wet)' },
];

const VESSELS_OPTIONS: SelectOption[] = [
  { value: 'Normal (A:V 2:3)', label: 'Normal (A:V 2:3)' },
  { value: 'A/V nipping', label: 'A/V nipping' },
  { value: 'Silver/copper wiring', label: 'Silver/copper wiring' },
  {
    value: 'NVE (neovascularisation elsewhere)',
    label: 'NVE (neovascularisation elsewhere)',
  },
  { value: 'Tortuous vessels', label: 'Tortuous vessels' },
  { value: 'Haemorrhages', label: 'Haemorrhages' },
];

const PERIPHERY_OPTIONS: SelectOption[] = [
  { value: 'Flat, no lesions', label: 'Flat, no lesions (normal)' },
  { value: 'Retinal breaks/tears', label: 'Retinal breaks/tears' },
  {
    value: 'RRD (rhegmatogenous detachment)',
    label: 'RRD (rhegmatogenous detachment)',
  },
  { value: 'Lattice degeneration', label: 'Lattice degeneration' },
  { value: 'Haemorrhages', label: 'Haemorrhages' },
  { value: 'Hard exudates', label: 'Hard exudates' },
  { value: 'Pigmentary changes (RP)', label: 'Pigmentary changes (RP)' },
];

const DR_GRADING_OPTIONS: SelectOption[] = [
  { value: 'No DR', label: 'No DR' },
  { value: 'Mild NPDR', label: 'Mild NPDR' },
  { value: 'Moderate NPDR', label: 'Moderate NPDR' },
  { value: 'Severe NPDR', label: 'Severe NPDR' },
  { value: 'PDR', label: 'PDR (Proliferative DR)' },
  { value: 'Advanced PDR', label: 'Advanced PDR' },
  { value: 'DME', label: 'DME (Diabetic Macular Oedema)' },
  { value: 'N/A', label: 'Not applicable' },
];

interface NormalPosteriorValues {
  media: string;
  disc: string;
  disc_color: DiscColor;
  cdr: number;
  rim: string;
  macula: string;
  foveal_reflex: FovealReflex;
  vessels: string;
  av_ratio: string;
  periphery: string;
}

const NORMAL_POSTERIOR: NormalPosteriorValues = {
  media: 'Clear',
  disc: 'Pink, healthy',
  disc_color: 'Pink',
  cdr: 0.3,
  rim: 'ISNT preserved',
  macula: 'Healthy',
  foveal_reflex: 'Present',
  vessels: 'Normal (A:V 2:3)',
  av_ratio: '2:3',
  periphery: 'Flat, no lesions',
};

// =============================================================================
// Component
// =============================================================================

export default function PosteriorSegmentSection({
  data,
  onChange,
  readOnly = false,
}: PosteriorSegmentSectionProps) {
  const applyNormalOD = () => {
    if (readOnly) return;
    onChange({
      posterior_right_media: NORMAL_POSTERIOR.media,
      posterior_right_disc: NORMAL_POSTERIOR.disc,
      posterior_right_disc_color: NORMAL_POSTERIOR.disc_color,
      posterior_right_cdr: NORMAL_POSTERIOR.cdr,
      posterior_right_rim: NORMAL_POSTERIOR.rim,
      posterior_right_macula: NORMAL_POSTERIOR.macula,
      posterior_right_foveal_reflex: NORMAL_POSTERIOR.foveal_reflex,
      posterior_right_vessels: NORMAL_POSTERIOR.vessels,
      posterior_right_av_ratio: NORMAL_POSTERIOR.av_ratio,
      posterior_right_periphery: NORMAL_POSTERIOR.periphery,
    });
  };

  const applyNormalOS = () => {
    if (readOnly) return;
    onChange({
      posterior_left_media: NORMAL_POSTERIOR.media,
      posterior_left_disc: NORMAL_POSTERIOR.disc,
      posterior_left_disc_color: NORMAL_POSTERIOR.disc_color,
      posterior_left_cdr: NORMAL_POSTERIOR.cdr,
      posterior_left_rim: NORMAL_POSTERIOR.rim,
      posterior_left_macula: NORMAL_POSTERIOR.macula,
      posterior_left_foveal_reflex: NORMAL_POSTERIOR.foveal_reflex,
      posterior_left_vessels: NORMAL_POSTERIOR.vessels,
      posterior_left_av_ratio: NORMAL_POSTERIOR.av_ratio,
      posterior_left_periphery: NORMAL_POSTERIOR.periphery,
    });
  };

  return (
    <div className="space-y-4">
      {/* Dilation Info */}
      <div>
        <h4 className={SECTION_HEADING_CLS}>Dilation</h4>
        <div className="flex items-center gap-4">
          <ToggleField
            label="Dilation performed"
            checked={data.dilation_performed ?? false}
            onChange={(val) => onChange({ dilation_performed: val })}
            disabled={readOnly}
          />
          {data.dilation_performed && (
            <SelectWithOther
              fieldId="eye:dilation_agent"
              value={data.dilation_agent || ''}
              onChange={(v) => onChange({ dilation_agent: v })}
              options={DILATION_AGENT_OPTIONS}
              disabled={readOnly}
              placeholder="Select agent"
              className={INPUT_CLS}
            />
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex justify-between items-center">
        <h4 className={SECTION_HEADING_CLS}>Fundoscopy Findings</h4>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyNormalOD}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              Apply Normal (OD)
            </button>
            <button
              type="button"
              onClick={applyNormalOS}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
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
            {/* Media */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Media
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:media_right"
                  value={data.posterior_right_media || ''}
                  onChange={(v) => onChange({ posterior_right_media: v })}
                  options={MEDIA_OPTIONS}
                  disabled={readOnly}
                  placeholder="Clear"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:media_left"
                  value={data.posterior_left_media || ''}
                  onChange={(v) => onChange({ posterior_left_media: v })}
                  options={MEDIA_OPTIONS}
                  disabled={readOnly}
                  placeholder="Clear"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* Disc */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Disc
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:disc_right"
                    value={data.posterior_right_disc || ''}
                    onChange={(v) => onChange({ posterior_right_disc: v })}
                    options={DISC_OPTIONS}
                    disabled={readOnly}
                    placeholder="Pink, healthy"
                    className={TABLE_INPUT_CLS}
                  />
                  <div className="flex gap-2">
                    <SelectWithOther
                      fieldId="eye:disc_color_right"
                      value={data.posterior_right_disc_color || ''}
                      onChange={(v) =>
                        onChange({
                          posterior_right_disc_color:
                            (v as DiscColor) || undefined,
                        })
                      }
                      options={DISC_COLOR_OPTIONS}
                      disabled={readOnly}
                      placeholder="Color"
                      className={`w-1/2 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={data.posterior_right_cdr ?? ''}
                      onChange={(e) =>
                        onChange({
                          posterior_right_cdr: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readOnly}
                      className={`w-1/2 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                      placeholder="C/D ratio"
                    />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:disc_left"
                    value={data.posterior_left_disc || ''}
                    onChange={(v) => onChange({ posterior_left_disc: v })}
                    options={DISC_OPTIONS}
                    disabled={readOnly}
                    placeholder="Pink, healthy"
                    className={TABLE_INPUT_CLS}
                  />
                  <div className="flex gap-2">
                    <SelectWithOther
                      fieldId="eye:disc_color_left"
                      value={data.posterior_left_disc_color || ''}
                      onChange={(v) =>
                        onChange({
                          posterior_left_disc_color:
                            (v as DiscColor) || undefined,
                        })
                      }
                      options={DISC_COLOR_OPTIONS}
                      disabled={readOnly}
                      placeholder="Color"
                      className={`w-1/2 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={data.posterior_left_cdr ?? ''}
                      onChange={(e) =>
                        onChange({
                          posterior_left_cdr: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readOnly}
                      className={`w-1/2 ${TABLE_INPUT_CLS.replace('w-full ','')}`}
                      placeholder="C/D ratio"
                    />
                  </div>
                </div>
              </td>
            </tr>
            {/* Rim */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Rim
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.posterior_right_rim || ''}
                  onChange={(e) =>
                    onChange({ posterior_right_rim: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="ISNT preserved"
                />
              </td>
              <td className="px-3 py-2 border">
                <input
                  type="text"
                  value={data.posterior_left_rim || ''}
                  onChange={(e) =>
                    onChange({ posterior_left_rim: e.target.value })
                  }
                  disabled={readOnly}
                  className={TABLE_INPUT_CLS}
                  placeholder="ISNT preserved"
                />
              </td>
            </tr>
            {/* Macula */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Macula
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:macula_right"
                    value={data.posterior_right_macula || ''}
                    onChange={(v) => onChange({ posterior_right_macula: v })}
                    options={MACULA_OPTIONS}
                    disabled={readOnly}
                    placeholder="Healthy"
                    className={TABLE_INPUT_CLS}
                  />
                  <SelectWithOther
                    fieldId="eye:foveal_reflex_right"
                    value={data.posterior_right_foveal_reflex || ''}
                    onChange={(v) =>
                      onChange({
                        posterior_right_foveal_reflex:
                          (v as FovealReflex) || undefined,
                      })
                    }
                    options={FOVEAL_REFLEX_OPTIONS}
                    disabled={readOnly}
                    placeholder="Foveal reflex"
                    className={TABLE_INPUT_CLS}
                  />
                </div>
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:macula_left"
                    value={data.posterior_left_macula || ''}
                    onChange={(v) => onChange({ posterior_left_macula: v })}
                    options={MACULA_OPTIONS}
                    disabled={readOnly}
                    placeholder="Healthy"
                    className={TABLE_INPUT_CLS}
                  />
                  <SelectWithOther
                    fieldId="eye:foveal_reflex_left"
                    value={data.posterior_left_foveal_reflex || ''}
                    onChange={(v) =>
                      onChange({
                        posterior_left_foveal_reflex:
                          (v as FovealReflex) || undefined,
                      })
                    }
                    options={FOVEAL_REFLEX_OPTIONS}
                    disabled={readOnly}
                    placeholder="Foveal reflex"
                    className={TABLE_INPUT_CLS}
                  />
                </div>
              </td>
            </tr>
            {/* Vessels */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Vessels
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:vessels_right"
                    value={data.posterior_right_vessels || ''}
                    onChange={(v) => onChange({ posterior_right_vessels: v })}
                    options={VESSELS_OPTIONS}
                    disabled={readOnly}
                    placeholder="Normal (A:V 2:3)"
                    className={TABLE_INPUT_CLS}
                  />
                  <input
                    type="text"
                    value={data.posterior_right_av_ratio || ''}
                    onChange={(e) =>
                      onChange({ posterior_right_av_ratio: e.target.value })
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="A/V ratio"
                  />
                </div>
              </td>
              <td className="px-3 py-2 border">
                <div className="space-y-1">
                  <SelectWithOther
                    fieldId="eye:vessels_left"
                    value={data.posterior_left_vessels || ''}
                    onChange={(v) => onChange({ posterior_left_vessels: v })}
                    options={VESSELS_OPTIONS}
                    disabled={readOnly}
                    placeholder="Normal (A:V 2:3)"
                    className={TABLE_INPUT_CLS}
                  />
                  <input
                    type="text"
                    value={data.posterior_left_av_ratio || ''}
                    onChange={(e) =>
                      onChange({ posterior_left_av_ratio: e.target.value })
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="A/V ratio"
                  />
                </div>
              </td>
            </tr>
            {/* Periphery */}
            <tr>
              <td className="px-3 py-2 text-gray-700 border font-medium">
                Periphery
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:periphery_right"
                  value={data.posterior_right_periphery || ''}
                  onChange={(v) => onChange({ posterior_right_periphery: v })}
                  options={PERIPHERY_OPTIONS}
                  disabled={readOnly}
                  placeholder="Flat, no lesions"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:periphery_left"
                  value={data.posterior_left_periphery || ''}
                  onChange={(v) => onChange({ posterior_left_periphery: v })}
                  options={PERIPHERY_OPTIONS}
                  disabled={readOnly}
                  placeholder="Flat, no lesions"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
            {/* DR Grading */}
            <tr className="bg-amber-50">
              <td className="px-3 py-2 text-gray-700 border font-medium">
                DR Grading
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:dr_grading_right"
                  value={data.posterior_right_dr_grading || ''}
                  onChange={(v) => onChange({ posterior_right_dr_grading: v })}
                  options={DR_GRADING_OPTIONS}
                  disabled={readOnly}
                  placeholder="N/A"
                  className={TABLE_INPUT_CLS}
                />
              </td>
              <td className="px-3 py-2 border">
                <SelectWithOther
                  fieldId="eye:dr_grading_left"
                  value={data.posterior_left_dr_grading || ''}
                  onChange={(v) => onChange({ posterior_left_dr_grading: v })}
                  options={DR_GRADING_OPTIONS}
                  disabled={readOnly}
                  placeholder="N/A"
                  className={TABLE_INPUT_CLS}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
