/**
 * LabsPanel - Professional Laboratory Result View
 *
 * Features:
 * - Formal laboratory result sheet layout
 * - Comprehensive data capture (Methodology, interpretation, etc.)
 * - Professional document-style aesthetics
 * - Print-ready design
 */

import React, { useState, useRef } from 'react';
import {
  FlaskConical,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  X,
  Edit3,
  Printer,
  User,
  ExternalLink,
  Download,
  AlertCircle,
  Search,
  Filter,
  Eye,
  TestTube,
  Stethoscope,
  Microscope,
  Pill,
  Thermometer,
  CreditCard,
  Receipt,
  ClipboardList,
  Droplets,
  Beaker,
} from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import {
  StatusBadge,
  formatDateTime,
  formatDate,
  calculateAge,
  getRelativeTime,
} from '../shared';
import { ClinicalNotesModal } from '../../ClinicalNotesModal';

// =============================================================================
// Structured Result Renderer - Supports all template types
// =============================================================================
function renderStructuredResult(
  structured: any,
  templateType?: string,
): React.ReactNode {
  if (!structured) return null;
  const t = templateType || structured.templateType;
  const data = structured as Record<string, any>;

  // Reusable Section Header for uniformity
  function ResultSectionHeader({
    title,
    icon: Icon,
  }: {
    title: string;
    icon?: any;
  }) {
    return (
      <div className="flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-gray-200 first:mt-0">
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {title}
        </h4>
      </div>
    );
  }

  // Common additional fields renderer (maintained from LabsPanel specific requirements)
  const renderAdditionalFields = () => (
    <>
      {/* Interpretation */}
      {data.interpretation && (
        <div className="bg-purple-50 border-l-4 border-purple-600 rounded-r-xl p-4 mt-4">
          <h4 className="text-xs font-black text-purple-900 uppercase tracking-widest mb-2">
            Clinical Interpretation
          </h4>
          <p className="text-sm text-purple-800 leading-relaxed italic">
            {data.interpretation}
          </p>
        </div>
      )}

      {/* Remarks/Comments */}
      {(data.remarks || data.notes) && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
            Technician Observations
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.remarks || data.notes}
          </p>
        </div>
      )}

      {/* Methodology */}
      {data.methodology && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-4">
          <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">
            Methodology
          </h4>
          <p className="text-sm text-blue-800">{data.methodology}</p>
        </div>
      )}
    </>
  );

  switch (t) {
    case 'numeric_table':
    case 'panel_numeric': {
      // Handle both formats
      const params = data.parameters || data.results || [];
      const panels = data.panels || [];

      if (panels.length > 0) {
        const rows = panels.flatMap(
          (g: any) =>
            g.analytes?.map((a: any) => ({ group: g.groupName, ...a })) || [],
        );
        return (
          <div className="space-y-0">
            {rows.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                        Panel / Analyte
                      </th>
                      <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                        Result
                      </th>
                      <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                        Reference Range
                      </th>
                      <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase text-right">
                        Flag
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((a: any, idx: number) => {
                      const isAbnormal =
                        a.flag === 'H' ||
                        a.flag === 'L' ||
                        a.status === 'Abnormal';
                      const isCritical =
                        a.flag === 'C' ||
                        a.flag === 'CC' ||
                        a.status === 'Critical' ||
                        a.isCritical;
                      return (
                        <tr
                          key={idx}
                          className={`${isCritical ? 'bg-red-50/50' : isAbnormal ? 'bg-amber-50/50' : ''}`}
                        >
                          <td className="px-6 py-3 font-bold text-slate-900 text-sm">
                            {a.group ? `${a.group}: ${a.analyte}` : a.analyte}
                          </td>
                          <td className="px-6 py-3 font-black text-lg">
                            {a.resultValue ?? '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500">
                            {a.unit || '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500">
                            {a.referenceRange || '—'}
                          </td>
                          <td className="px-6 py-3 text-right text-xs font-black">
                            {a.flag || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {renderAdditionalFields()}
          </div>
        );
      }

      return (
        <div className="space-y-0">
          {params.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Parameter
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Result
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Reference Range
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase text-right">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {params.map((p: any, idx: number) => {
                    const isAbnormal =
                      p.flag === 'H' ||
                      p.flag === 'L' ||
                      p.status === 'Abnormal';
                    const isCritical =
                      p.flag === 'C' ||
                      p.flag === 'CC' ||
                      p.status === 'Critical' ||
                      p.isCritical;
                    return (
                      <tr
                        key={idx}
                        className={`${isCritical ? 'bg-red-50/50' : isAbnormal ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-6 py-3 font-bold text-slate-900 text-sm">
                          {p.parameter || p.name}
                        </td>
                        <td className="px-6 py-3 font-black text-lg">
                          {p.resultValue ?? p.result ?? '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">
                          {p.unit || '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">
                          {p.referenceRange || p.reference || '—'}
                        </td>
                        <td className="px-6 py-3 text-right text-xs font-black">
                          {p.flag || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {renderAdditionalFields()}
        </div>
      );
    }

    case 'numeric_timing': {
      // Support both 'readings' and 'results' field names (form saves as 'results')
      const readings = data.readings || data.results || [];
      return (
        <div className="space-y-0">
          {readings.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Parameter / Timepoint
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Result
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase">
                      Reference Range
                    </th>
                    <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase text-right">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readings.map((r: any, idx: number) => (
                    <tr
                      key={idx}
                      className={`${r.isCritical ? 'bg-red-50/50' : r.isAbnormal ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="px-6 py-3 font-bold text-slate-900 text-sm">
                        {r.timepoint ||
                          r.parameter ||
                          r.time ||
                          `Reading ${idx + 1}`}
                      </td>
                      <td className="px-6 py-3 font-black text-lg">
                        {r.resultValue ?? r.value ?? '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {r.unit || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {r.referenceRange || r.reference || '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {r.isCritical ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-black uppercase">
                            Critical
                          </span>
                        ) : r.isAbnormal ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black uppercase">
                            Abnormal
                          </span>
                        ) : r.flag ? (
                          <span className="text-xs font-black text-slate-600">
                            {r.flag}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 p-4">
              No timing readings recorded
            </p>
          )}
          {renderAdditionalFields()}
        </div>
      );
    }

    case 'qualitative_quantitative': {
      // Form saves: qualitativeResult, signalCutoff, quantitative: {concentration, titer, unit, referenceRange}
      // confirmation: {test, result, date}, interpretation, notes
      const qualResult = data.qualitative || data.qualitativeResult;
      const quantObj =
        typeof data.quantitative === 'object' && data.quantitative !== null
          ? data.quantitative
          : null;
      const quantValue = quantObj
        ? (quantObj.concentration ?? quantObj.titer ?? quantObj.value)
        : (data.quantitative ?? data.quantitativeValue);
      const unitVal = quantObj?.unit || data.unit || data.resultUnit;
      const refRange =
        quantObj?.referenceRange || data.reference || data.referenceRange;
      const isPositive =
        qualResult === 'Positive' ||
        qualResult === 'Reactive' ||
        qualResult === 'Detected';
      const titerVal = quantObj?.titer;
      const interpretation = data.interpretation || data.notes;

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {qualResult && (
              <div
                className={`p-6 rounded border text-center ${
                  isPositive
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-green-50 border-green-200 text-green-900'
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-wider opacity-70 mb-2">
                  Qualitative Result
                </p>
                <p className="text-3xl font-extrabold">{qualResult}</p>
              </div>
            )}

            {quantValue !== undefined &&
              quantValue !== null &&
              quantValue !== '' && (
                <div className="p-6 bg-white rounded border border-gray-200 text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Quantitative Value
                  </p>
                  <p className="text-3xl font-extrabold text-blue-900">
                    {quantValue}{' '}
                    <span className="text-lg text-gray-500 font-normal">
                      {unitVal || ''}
                    </span>
                  </p>
                  {refRange && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-1 rounded">
                      Ref: {refRange}
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* Titer (if separate from concentration) */}
          {titerVal && quantObj?.concentration !== undefined && (
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                Titer
              </p>
              <p className="text-lg font-bold text-gray-900">{titerVal}</p>
            </div>
          )}

          {/* Signal/Cutoff Ratio */}
          {data.signalCutoff !== undefined && (
            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                Signal / Cutoff Ratio
              </p>
              <p className="text-lg font-bold text-slate-900">
                {data.signalCutoff}
              </p>
            </div>
          )}

          {/* Confirmation Testing */}
          {data.confirmation &&
            (data.confirmation.test || data.confirmation.result) && (
              <div className="p-4 bg-purple-50 rounded border border-purple-200">
                <p className="text-xs text-purple-700 uppercase font-bold mb-2">
                  Confirmation Testing
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {data.confirmation.test && (
                    <div>
                      <span className="text-purple-600 text-xs block">
                        Test
                      </span>
                      <span className="font-bold">
                        {data.confirmation.test}
                      </span>
                    </div>
                  )}
                  {data.confirmation.result && (
                    <div>
                      <span className="text-purple-600 text-xs block">
                        Result
                      </span>
                      <span className="font-bold">
                        {data.confirmation.result}
                      </span>
                    </div>
                  )}
                  {data.confirmation.date && (
                    <div>
                      <span className="text-purple-600 text-xs block">
                        Date
                      </span>
                      <span className="font-medium">
                        {data.confirmation.date}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {interpretation && (
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700 uppercase font-bold mb-1">
                Interpretation
              </p>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">
                {interpretation}
              </p>
            </div>
          )}

          {renderAdditionalFields()}
        </div>
      );
    }

    case 'urinalysis_checklist': {
      // Enhanced urinalysis display with dipstick type, specimen info, and all parameters
      const physical = data.physical || {};
      const chemical = data.chemical || {};
      const microscopy = data.microscopy || {};

      // Define reference ranges and abnormal detection
      const isAbnormalChemical = (key: string, value: string): boolean => {
        if (!value || value === '') return false;
        const normalValues: Record<string, string[]> = {
          protein: ['Negative', 'Trace'],
          glucose: ['Negative'],
          ketones: ['Negative'],
          blood: ['Negative'],
          bilirubin: ['Negative'],
          nitrite: ['Negative'],
          leukocyteEsterase: ['Negative'],
          ascorbicAcid: ['Negative'],
        };
        return normalValues[key] ? !normalValues[key].includes(value) : false;
      };

      return (
        <div className="space-y-4">
          {/* Dipstick Type & Specimen Info */}
          {(data.dipstickType ||
            data.specimenType ||
            data.collectionTime ||
            data.testMethod) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-3">
                Test Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {data.dipstickType && (
                  <div>
                    <span className="text-blue-600 block text-xs uppercase">
                      Dipstick Type
                    </span>
                    <span className="font-semibold text-blue-900">
                      {data.dipstickType.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                )}
                {data.specimenType && (
                  <div>
                    <span className="text-blue-600 block text-xs uppercase">
                      Specimen Type
                    </span>
                    <span className="font-semibold text-blue-900">
                      {data.specimenType}
                    </span>
                  </div>
                )}
                {data.collectionTime && (
                  <div>
                    <span className="text-blue-600 block text-xs uppercase">
                      Collection Time
                    </span>
                    <span className="font-semibold text-blue-900">
                      {new Date(data.collectionTime).toLocaleString()}
                    </span>
                  </div>
                )}
                {data.testMethod && (
                  <div>
                    <span className="text-blue-600 block text-xs uppercase">
                      Test Method
                    </span>
                    <span className="font-semibold text-blue-900">
                      {data.testMethod}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Physical Examination */}
            {Object.keys(physical).length > 0 && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-gray-200 rounded-t-xl">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-slate-500" />
                    Physical Examination
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {physical.color && (
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-gray-600 text-sm">Color</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border border-gray-300 ${
                            physical.color === 'Colorless'
                              ? 'bg-gray-100'
                              : physical.color === 'Pale Yellow'
                                ? 'bg-yellow-100'
                                : physical.color === 'Yellow'
                                  ? 'bg-yellow-300'
                                  : physical.color === 'Dark Yellow'
                                    ? 'bg-yellow-500'
                                    : physical.color === 'Amber'
                                      ? 'bg-amber-500'
                                      : physical.color === 'Orange'
                                        ? 'bg-orange-400'
                                        : physical.color === 'Pink/Red'
                                          ? 'bg-red-400'
                                          : physical.color === 'Brown'
                                            ? 'bg-amber-800'
                                            : physical.color === 'Green'
                                              ? 'bg-green-400'
                                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="font-semibold text-gray-900 text-sm">
                          {physical.color}
                        </span>
                      </div>
                    </div>
                  )}
                  {physical.appearance && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600 text-sm">Appearance</span>
                      <span
                        className={`font-semibold text-sm ${physical.appearance !== 'Clear' ? 'text-amber-600' : 'text-gray-900'}`}
                      >
                        {physical.appearance}
                      </span>
                    </div>
                  )}
                  {physical.specificGravity && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600 text-sm">
                        Specific Gravity
                      </span>
                      <span
                        className={`font-semibold text-sm font-mono ${
                          physical.specificGravity < 1.005 ||
                          physical.specificGravity > 1.03
                            ? 'text-amber-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {physical.specificGravity}
                      </span>
                    </div>
                  )}
                  {physical.volume && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600 text-sm">Volume</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {physical.volume} mL
                      </span>
                    </div>
                  )}
                  {physical.odor && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600 text-sm">Odor</span>
                      <span
                        className={`font-semibold text-sm ${physical.odor !== 'Normal' ? 'text-amber-600' : 'text-gray-900'}`}
                      >
                        {physical.odor}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chemical Examination - Infection Markers */}
            {Object.keys(chemical).length > 0 && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-3 border-b border-red-200 rounded-t-xl">
                  <h4 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-red-500" />
                    Chemical Analysis
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {chemical.ph !== undefined && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600 text-sm">pH</span>
                      <span
                        className={`font-semibold text-sm font-mono ${
                          chemical.ph < 5.0 || chemical.ph > 8.0
                            ? 'text-amber-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {chemical.ph}
                      </span>
                    </div>
                  )}
                  {[
                    'leukocyteEsterase',
                    'nitrite',
                    'protein',
                    'glucose',
                    'ketones',
                    'blood',
                    'bilirubin',
                    'urobilinogen',
                    'ascorbicAcid',
                    'microalbumin',
                    'creatinine',
                    'calcium',
                  ].map((key) => {
                    const value = chemical[key];
                    if (!value) return null;
                    const isAbnormal = isAbnormalChemical(key, value);
                    return (
                      <div
                        key={key}
                        className={`flex justify-between px-4 py-2.5 ${isAbnormal ? 'bg-red-50' : ''}`}
                      >
                        <span className="text-gray-600 text-sm capitalize">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/_/g, ' ')
                            .trim()}
                        </span>
                        <span
                          className={`font-semibold text-sm ${isAbnormal ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                  {/* ACR Calculation */}
                  {chemical.albumin_creatinine_ratio !== undefined && (
                    <div
                      className={`flex justify-between px-4 py-2.5 ${chemical.albumin_creatinine_ratio > 3 ? 'bg-amber-50' : ''}`}
                    >
                      <span className="text-gray-600 text-sm">
                        Albumin/Creatinine Ratio
                      </span>
                      <span
                        className={`font-semibold text-sm font-mono ${
                          chemical.albumin_creatinine_ratio > 30
                            ? 'text-red-600'
                            : chemical.albumin_creatinine_ratio > 3
                              ? 'text-amber-600'
                              : 'text-gray-900'
                        }`}
                      >
                        {chemical.albumin_creatinine_ratio.toFixed(1)} mg/mmol
                      </span>
                    </div>
                  )}
                  {/* Numeric values if present */}
                  {chemical.protein_numeric && (
                    <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-500 text-xs">
                        Protein (quantitative)
                      </span>
                      <span className="text-gray-700 text-xs font-mono">
                        {chemical.protein_numeric} mg/dL
                      </span>
                    </div>
                  )}
                  {chemical.glucose_numeric && (
                    <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-500 text-xs">
                        Glucose (quantitative)
                      </span>
                      <span className="text-gray-700 text-xs font-mono">
                        {chemical.glucose_numeric} mg/dL
                      </span>
                    </div>
                  )}
                  {chemical.microalbumin_numeric && (
                    <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-500 text-xs">
                        Microalbumin (quantitative)
                      </span>
                      <span className="text-gray-700 text-xs font-mono">
                        {chemical.microalbumin_numeric} mg/L
                      </span>
                    </div>
                  )}
                  {chemical.creatinine_numeric && (
                    <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-500 text-xs">
                        Creatinine (quantitative)
                      </span>
                      <span className="text-gray-700 text-xs font-mono">
                        {chemical.creatinine_numeric} mmol/L
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Microscopic Examination */}
            {Object.keys(microscopy).length > 0 && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 border-b border-purple-200 rounded-t-xl">
                  <h4 className="text-xs font-black text-purple-700 uppercase tracking-widest flex items-center gap-2">
                    <Microscope className="h-4 w-4 text-purple-500" />
                    Microscopy
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    'rbc',
                    'wbc',
                    'epithelialCells',
                    'bacteria',
                    'yeast',
                    'casts',
                    'crystals',
                    'mucus',
                    'parasites',
                  ].map((key) => {
                    const value = microscopy[key];
                    if (!value) return null;
                    const isElevated =
                      (key === 'rbc' || key === 'wbc') &&
                      !['None', '0-2'].includes(value);
                    const isBacteria =
                      key === 'bacteria' && value !== 'None Seen';
                    return (
                      <div
                        key={key}
                        className={`flex justify-between px-4 py-2.5 ${isElevated || isBacteria ? 'bg-red-50' : ''}`}
                      >
                        <span className="text-gray-600 text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span
                          className={`font-semibold text-sm ${isElevated || isBacteria ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                  {microscopy.castTypes && microscopy.castTypes.length > 0 && (
                    <div className="px-4 py-2.5">
                      <span className="text-gray-600 text-sm block mb-1">
                        Cast Types
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {microscopy.castTypes.map((type: string) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {microscopy.crystalTypes &&
                    microscopy.crystalTypes.length > 0 && (
                      <div className="px-4 py-2.5">
                        <span className="text-gray-600 text-sm block mb-1">
                          Crystal Types
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {microscopy.crystalTypes.map((type: string) => (
                            <span
                              key={type}
                              className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  {microscopy.otherFindings && (
                    <div className="px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-500 text-xs block mb-1">
                        Other Findings
                      </span>
                      <p className="text-gray-700 text-sm">
                        {microscopy.otherFindings}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {renderAdditionalFields()}
        </div>
      );
    }

    case 'culture_sensitivity': {
      return (
        <div className="space-y-6">
          {/* Specimen Info */}
          {data.specimenInfo && (
            <div>
              <ResultSectionHeader
                title="Specimen Information"
                icon={Droplets}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                {data.specimenInfo.specimenType && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">
                      Specimen Type
                    </span>{' '}
                    <span className="font-semibold text-gray-900">
                      {data.specimenInfo.specimenType}
                    </span>
                  </div>
                )}
                {data.specimenInfo.collectionDate && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">
                      Collection Date
                    </span>{' '}
                    <span className="font-semibold text-gray-900">
                      {new Date(
                        data.specimenInfo.collectionDate,
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {data.specimenInfo.specimenQuality && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">
                      Quality / Appearance
                    </span>{' '}
                    <span className="font-semibold text-gray-900">
                      {data.specimenInfo.specimenQuality}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Microscopy */}
          {data.microscopy && (
            <div>
              <ResultSectionHeader
                title="Microscopy Findings"
                icon={Microscope}
              />
              <div className="bg-white border border-gray-200 rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(data.microscopy).map(([key, value]) => {
                      if (!value || key === 'otherFindings') return null;
                      return (
                        <tr key={key}>
                          <td className="px-4 py-2 bg-gray-50 w-1/3 text-xs font-bold text-gray-500 uppercase">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                            {String(value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.microscopy.otherFindings && (
                  <div className="p-3 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Other Microscopy Findings
                    </span>
                    <p className="text-sm text-gray-900">
                      {data.microscopy.otherFindings}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cultures */}
          {data.cultures &&
            Array.isArray(data.cultures) &&
            data.cultures.length > 0 && (
              <div>
                <ResultSectionHeader
                  title="Culture Results"
                  icon={FlaskConical}
                />
                <div className="space-y-4">
                  {data.cultures.map((culture: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-gray-200 rounded shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase">
                            Isolate #{idx + 1}
                          </span>
                          <h5 className="text-lg font-bold text-gray-900">
                            {culture.organismIsolated || 'No Organism Isolated'}
                          </h5>
                        </div>
                        {culture.growth && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                              culture.growth === 'No Growth'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {culture.growth}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        {culture.colonyCount && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase block">
                              Colony Count
                            </span>{' '}
                            <span className="font-medium">
                              {culture.colonyCount}
                            </span>
                          </div>
                        )}
                        {culture.incubationTime && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase block">
                              Incubation Period
                            </span>{' '}
                            <span className="font-medium">
                              {culture.incubationTime} hours
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Legacy Organism field */}
          {data.organism && !data.cultures && (
            <div>
              <ResultSectionHeader
                title="Culture Results"
                icon={FlaskConical}
              />
              <div className="p-4 bg-white border border-gray-200 rounded">
                <h5 className="text-lg font-bold text-gray-900">
                  {data.organism}
                </h5>
                {data.colonyCount && (
                  <p className="text-sm text-gray-600 mt-1">
                    Colony Count: {data.colonyCount}
                  </p>
                )}
                {data.growthStatus && (
                  <div
                    className={`mt-2 inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
                      data.growthStatus.toLowerCase().includes('no')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {data.growthStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sensitivities */}
          {data.sensitivities &&
            Array.isArray(data.sensitivities) &&
            data.sensitivities.length > 0 && (
              <div>
                <ResultSectionHeader
                  title="Antibiotic Susceptibility Testing"
                  icon={Pill}
                />
                <div className="space-y-4">
                  {data.sensitivities.map((sens: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="bg-white border border-gray-200 rounded overflow-hidden"
                    >
                      {/* If sensitivities has nested antibiotics array (new format) */}
                      {sens.antibiotics && Array.isArray(sens.antibiotics) ? (
                        <div className="w-full">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <span className="font-bold text-gray-700 text-sm">
                              Organism: {sens.organism || '-'}
                            </span>
                          </div>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                                  Antibiotic Agent
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">
                                  Interpretation
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {sens.antibiotics.map(
                                (ab: any, abIdx: number) => {
                                  const res = (ab.result || '').toUpperCase();
                                  const colorClass = res.startsWith('S')
                                    ? 'text-green-700 bg-green-50'
                                    : res.startsWith('R')
                                      ? 'text-red-700 bg-red-50'
                                      : 'text-amber-700 bg-amber-50';
                                  return (
                                    <tr key={abIdx}>
                                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                        {ab.antibiotic}
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold w-16 text-center ${colorClass}`}
                                        >
                                          {ab.result}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Legacy flat format */
                        <div className="p-3 flex justify-between items-center hover:bg-gray-50 border-b last:border-0 border-gray-100">
                          <span className="font-medium text-gray-900">
                            {sens.antibiotic || sens.name}
                          </span>
                          <span
                            className={`font-bold text-sm px-2 py-1 rounded ${
                              (sens.result || sens.sensitivity) ===
                                'Sensitive' ||
                              (sens.result || sens.sensitivity) === 'S'
                                ? 'bg-green-100 text-green-800'
                                : (sens.result || sens.sensitivity) ===
                                      'Resistant' ||
                                    (sens.result || sens.sensitivity) === 'R'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sens.result || sens.sensitivity}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {renderAdditionalFields()}
        </div>
      );
    }

    case 'parasite_report': {
      return (
        <div className="space-y-6">
          {/* Specimen Info */}
          {(data.specimenType || data.specimenInfo?.specimenType) && (
            <div>
              <ResultSectionHeader title="Specimen Details" icon={Droplets} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                  <span className="text-gray-500 text-xs uppercase block">
                    Specimen
                  </span>{' '}
                  <span className="font-bold text-gray-900">
                    {data.specimenType || data.specimenInfo?.specimenType}
                  </span>
                </div>
                {data.collectionTime && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Collection Time
                    </span>{' '}
                    <span className="font-medium text-gray-900">
                      {data.collectionTime}
                    </span>
                  </div>
                )}
                {data.examinationMethod && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Method
                    </span>{' '}
                    <span className="font-medium text-gray-900">
                      {data.examinationMethod}
                    </span>
                  </div>
                )}
                {data.fieldsExamined && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Fields Examined
                    </span>{' '}
                    <span className="font-medium text-gray-900">
                      {data.fieldsExamined}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parasite Detection Status */}
          {data.parasitesFound !== undefined && (
            <div
              className={`p-4 rounded border-l-4 ${
                data.parasitesFound
                  ? 'bg-red-50 border-red-500 text-red-900'
                  : 'bg-green-50 border-green-500 text-green-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {data.parasitesFound ? (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
                <div>
                  <span className="block text-lg font-bold uppercase tracking-tight">
                    {data.parasitesFound
                      ? 'Parasites Detected'
                      : 'No Parasites Detected'}
                  </span>
                  <span className="text-sm opacity-80">
                    {data.parasitesFound
                      ? 'See detailed findings below.'
                      : 'No parasitic organisms were observed in the sample.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detections (new format: parasitesFound from form, or legacy detections) */}
          {((data.parasitesFound &&
            Array.isArray(data.parasitesFound) &&
            data.parasitesFound.length > 0) ||
            (data.detections &&
              Array.isArray(data.detections) &&
              data.detections.length > 0)) && (
            <div>
              <ResultSectionHeader
                title="Detailed Findings"
                icon={Microscope}
              />
              <div className="space-y-2">
                {(Array.isArray(data.parasitesFound) &&
                data.parasitesFound.length > 0
                  ? data.parasitesFound
                  : data.detections
                ).map((det: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded"
                  >
                    <div>
                      <p className="font-bold text-red-900">
                        {det.species || det.parasite || det.name}
                      </p>
                      <div className="flex gap-4 text-xs text-red-700 mt-1">
                        {det.stage && (
                          <span>
                            <strong>Stage:</strong> {det.stage}
                          </span>
                        )}
                        {(det.form || det.density) && (
                          <span>
                            <strong>{det.form ? 'Form' : 'Density'}:</strong>{' '}
                            {det.form || det.density}
                          </span>
                        )}
                        {det.countPer && (
                          <span>
                            <strong>Per:</strong> {det.countPer}
                          </span>
                        )}
                      </div>
                    </div>
                    {det.count && (
                      <div className="text-right">
                        <span className="text-xs uppercase text-red-600 block">
                          Count
                        </span>
                        <span className="font-bold text-red-900">
                          {det.count}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy organisms field */}
          {data.organisms &&
            Array.isArray(data.organisms) &&
            data.organisms.length > 0 && (
              <div className="space-y-2">
                <ResultSectionHeader
                  title="Organisms Detected"
                  icon={Microscope}
                />
                {data.organisms.map((org: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-gray-200 rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{org.name}</p>
                      {org.stage && (
                        <p className="text-xs text-gray-500">
                          Stage: {org.stage}
                        </p>
                      )}
                    </div>
                    {org.count && (
                      <div className="text-right">
                        <span className="text-xs uppercase text-gray-500 block">
                          Count
                        </span>
                        <span className="font-bold text-gray-900">
                          {org.count}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* Other Findings */}
          {data.otherFindings && (
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">
                Other Findings
              </h5>
              <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded border border-gray-200">
                {data.otherFindings}
              </p>
            </div>
          )}

          {renderAdditionalFields()}
        </div>
      );
    }

    case 'binary_metadata': {
      // Form saves: detected (boolean), target, method, kitInfo: {name, manufacturer, lotNumber, expiryDate}
      // qcChecklist, controlResults, ctValue, interpretation, notes
      const binResult =
        data.result ||
        (data.detected === true
          ? 'Detected'
          : data.detected === false
            ? 'Not Detected'
            : undefined);
      const kitLotDisplay = data.kitLot || data.kitInfo?.lotNumber;
      const kitNameDisplay = data.kitInfo?.name;
      const kitManufacturer = data.kitInfo?.manufacturer;
      const isPositive =
        binResult === 'Positive' ||
        binResult === 'Reactive' ||
        binResult === 'Detected';
      return (
        <div className="space-y-6">
          {binResult && (
            <div
              className={`p-6 rounded border text-center ${
                isPositive
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-green-50 border-green-200 text-green-900'
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-wider opacity-70 mb-2">
                Test Result
              </p>
              <p className="text-3xl font-extrabold">{binResult}</p>
            </div>
          )}
          {data.target && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Target
              </p>
              <p className="text-sm font-medium">{data.target}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {data.method && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold">
                  Method
                </p>
                <p className="text-sm font-medium">{data.method}</p>
              </div>
            )}
            {kitLotDisplay && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold">
                  Kit / Lot #
                </p>
                <p className="text-sm font-medium">{kitLotDisplay}</p>
              </div>
            )}
            {kitNameDisplay && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold">
                  Kit Name
                </p>
                <p className="text-sm font-medium">
                  {kitNameDisplay}
                  {kitManufacturer ? ` (${kitManufacturer})` : ''}
                </p>
              </div>
            )}
            {data.kitInfo?.expiryDate && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold">
                  Kit Expiry
                </p>
                <p className="text-sm font-medium">{data.kitInfo.expiryDate}</p>
              </div>
            )}
          </div>
          {data.ctValue !== undefined && data.ctValue !== null && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Ct Value
              </p>
              <p className="text-lg font-bold">{data.ctValue}</p>
            </div>
          )}
          {/* QC Checklist */}
          {data.qcChecklist && Object.keys(data.qcChecklist).length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">
                QC Checklist
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(data.qcChecklist).map(
                  ([key, val]: [string, any]) => (
                    <div
                      key={key}
                      className={`px-3 py-2 rounded border text-xs font-medium ${val ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                    >
                      {key.replace(/([A-Z])/g, ' $1').trim()}:{' '}
                      {val ? '\u2713' : '\u2717'}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
          {/* Control Results */}
          {data.controlResults && (
            <div className="grid grid-cols-2 gap-4">
              {data.controlResults.positiveControl && (
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-xs text-gray-500 uppercase block">
                    Positive Control
                  </span>
                  <span className="font-bold">
                    {data.controlResults.positiveControl}
                  </span>
                </div>
              )}
              {data.controlResults.negativeControl && (
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-xs text-gray-500 uppercase block">
                    Negative Control
                  </span>
                  <span className="font-bold">
                    {data.controlResults.negativeControl}
                  </span>
                </div>
              )}
            </div>
          )}
          {(data.interpretation || data.notes) && (
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700 uppercase font-bold mb-1">
                Interpretation / Notes
              </p>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">
                {data.interpretation || data.notes}
              </p>
            </div>
          )}
          {renderAdditionalFields()}
        </div>
      );
    }

    case 'narrative_diagnostic': {
      // Form saves: macroscopy.grossDescription, microscopy.microscopicFindings, finalDiagnosis, comments
      // specimenType, specimenSite, fixationType, clinicalHistory, specialStains, tumorGrade, ptnmStage, marginStatus, addendum
      const grossDesc =
        typeof data.macroscopy === 'object'
          ? data.macroscopy?.grossDescription
          : data.macroscopy;
      const microDesc =
        typeof data.microscopy === 'object'
          ? data.microscopy?.microscopicFindings
          : data.microscopy;
      const finalDx =
        data.finalDiagnosis ||
        (typeof data.diagnosis === 'object'
          ? data.diagnosis?.finalDiagnosis
          : data.diagnosis);
      const findings = data.findings || grossDesc;
      const impression = data.impression || finalDx;
      const recommendation = data.recommendation || data.comments;

      return (
        <div className="space-y-6">
          {/* Specimen Info */}
          {(data.specimenType || data.specimenSite) && (
            <div>
              <ResultSectionHeader title="Specimen Details" icon={FileText} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                {data.specimenType && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Type
                    </span>
                    <span className="font-bold text-gray-900">
                      {data.specimenType}
                    </span>
                  </div>
                )}
                {data.specimenSite && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Site
                    </span>
                    <span className="font-bold text-gray-900">
                      {data.specimenSite}
                    </span>
                  </div>
                )}
                {data.fixationType && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Fixation
                    </span>
                    <span className="font-medium text-gray-900">
                      {data.fixationType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {data.clinicalHistory && (
            <div>
              <ResultSectionHeader title="Clinical History" icon={FileText} />
              <div className="p-4 bg-white border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-wrap">
                {data.clinicalHistory}
              </div>
            </div>
          )}
          {/* Macroscopy / Gross Description */}
          {(grossDesc || findings) && (
            <div>
              <ResultSectionHeader
                title="Macroscopic Findings"
                icon={FileText}
              />
              <div className="p-4 bg-white border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {grossDesc || findings}
              </div>
            </div>
          )}
          {data.specimenDescription && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">
                Specimen Description
              </h5>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-wrap">
                {data.specimenDescription}
              </div>
            </div>
          )}
          {/* Microscopy */}
          {microDesc && (
            <div>
              <ResultSectionHeader
                title="Microscopic Findings"
                icon={Microscope}
              />
              <div className="p-4 bg-white border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {microDesc}
              </div>
            </div>
          )}
          {/* Special Stains */}
          {(data.specialStains?.length > 0 || data.specialStainResults) && (
            <div>
              <ResultSectionHeader title="Special Stains" icon={Stethoscope} />
              {data.specialStains?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {data.specialStains.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-purple-50 text-purple-800 text-xs font-medium rounded border border-purple-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {data.specialStainResults && (
                <p className="text-sm text-gray-800 p-3 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                  {data.specialStainResults}
                </p>
              )}
            </div>
          )}
          {/* Diagnosis */}
          {(finalDx || impression) && (
            <div>
              <ResultSectionHeader title="Diagnosis" icon={Stethoscope} />
              <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 font-medium whitespace-pre-wrap">
                {finalDx || impression}
              </div>
            </div>
          )}
          {/* Tumor staging */}
          {(data.tumorGrade || data.ptnmStage || data.marginStatus) && (
            <div className="grid grid-cols-3 gap-4">
              {data.tumorGrade && (
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-xs text-gray-500 uppercase block">
                    Tumor Grade
                  </span>
                  <span className="font-bold">{data.tumorGrade}</span>
                </div>
              )}
              {data.ptnmStage && (
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-xs text-gray-500 uppercase block">
                    pTNM Stage
                  </span>
                  <span className="font-bold">{data.ptnmStage}</span>
                </div>
              )}
              {data.marginStatus && (
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-xs text-gray-500 uppercase block">
                    Margin Status
                  </span>
                  <span
                    className={`font-bold ${data.marginStatus === 'Involved' ? 'text-red-700' : data.marginStatus === 'Clear' ? 'text-green-700' : ''}`}
                  >
                    {data.marginStatus}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Comments / Recommendation */}
          {recommendation && (
            <div>
              <ResultSectionHeader
                title="Comments / Recommendations"
                icon={Stethoscope}
              />
              <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 font-medium whitespace-pre-wrap">
                {recommendation}
              </div>
            </div>
          )}
          {data.addendum && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">
                Addendum
              </h5>
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-900 whitespace-pre-wrap">
                {data.addendum}
              </div>
            </div>
          )}
          {renderAdditionalFields()}
        </div>
      );
    }

    default:
      // Fallback: render as key-value pairs for any unknown template type
      if (typeof structured === 'object') {
        return (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-black text-slate-500 uppercase mb-2">
              Result Data
            </h4>
            {Object.entries(structured)
              .filter(([k]) => k !== 'templateType')
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-slate-500 capitalize">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold text-slate-800">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        );
      }
      return null;
  }
}

interface LabsPanelProps {
  encounter: EncounterDetail;
  onBack?: () => void;
}

export function LabsPanel({ encounter, onBack }: LabsPanelProps) {
  const [selectedLab, setSelectedLab] = useState<any | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'completed' | 'pending'
  >('all');

  const labs = encounter.lab_results || [];
  const labRequests = encounter.lab_requests || [];

  // Combine results and requests for comprehensive view - use lab_results as primary, fallback to lab_requests
  const allLabs =
    labs.length > 0
      ? labs
      : labRequests.map((req) => ({
          request_id: req.id,
          test_name: req.test_name,
          category: req.category || 'Pending',
          category_code: req.category_code,
          status: req.status,
          result: null,
          normal_range: null,
          is_abnormal: false,
          requested_date: req.requested_at,
          result_date: null,
          results: req.results,
          structured_result: req.structured_result,
          result_template_type: req.result_template_type,
          clinical_notes: req.clinical_indication,
        }));

  // Sort labs: Verified/Resulted first, then by date descending
  const filteredLabs = allLabs
    .sort((a, b) => {
      const dateA = new Date(a.result_date || a.requested_date || 0).getTime();
      const dateB = new Date(b.result_date || b.requested_date || 0).getTime();
      return dateB - dateA; // Descending
    })
    .filter((lab: any) => {
      // Status filter
      if (statusFilter === 'completed') {
        if (lab.status !== 'Completed' && lab.status !== 'Result_Ready')
          return false;
      } else if (statusFilter === 'pending') {
        if (lab.status === 'Completed' || lab.status === 'Result_Ready')
          return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const testName = (lab.test_name || '').toLowerCase();
        const category = (lab.category || '').toLowerCase();
        return testName.includes(query) || category.includes(query);
      }

      return true;
    });

  const getStatusVariant = (
    status: string,
  ): 'success' | 'info' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Result_Ready':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Sample Collected':
        return 'info';
      case 'Pending':
        return 'warning';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  if (allLabs.length === 0) {
    return (
      <EmptyState
        title="No Lab Tests"
        description="No laboratory tests ordered for this encounter."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1 hover:bg-gray-100 rounded-full mr-1 transition-colors"
                  title="Go Back"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600" />
                Laboratory Tests
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-1">
              {filteredLabs.length} of {allLabs.length} test(s)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as 'all' | 'completed' | 'pending',
                  )
                }
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {filteredLabs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Lab Tests Found
          </h3>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'No lab tests match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLabs.map((lab: any, idx: number) => {
                  const hasData =
                    lab.result ||
                    lab.result_value ||
                    (lab.results && lab.results.length > 0) ||
                    (lab.lab_results_items &&
                      lab.lab_results_items.length > 0) ||
                    lab.structured_result;
                  const isCritical = lab.is_critical;
                  const isAbnormal = lab.is_abnormal;

                  return (
                    <tr
                      key={lab.request_id || idx}
                      className={`hover:bg-gray-50 transition-colors ${
                        isCritical
                          ? 'bg-red-50'
                          : isAbnormal
                            ? 'bg-amber-50'
                            : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isCritical ? 'bg-red-100' : 'bg-blue-100'
                            }`}
                          >
                            <FlaskConical
                              className={`h-4 w-4 ${
                                isCritical ? 'text-red-600' : 'text-blue-600'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {lab.test_name || 'Unknown Test'}
                            </p>
                            {isCritical && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                CRITICAL
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {lab.category || 'Laboratory'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {lab.status === 'Completed' ||
                          lab.status === 'Result_Ready' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              {lab.status === 'Result_Ready'
                                ? 'Ready'
                                : 'Completed'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3" />
                              {lab.status || 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="flex gap-1 items-center">
                              {formatDate(
                                lab.result_date || lab.requested_date,
                              )}
                              {getRelativeTime(
                                lab.result_date || lab.requested_date,
                              ) && (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
                                  {getRelativeTime(
                                    lab.result_date || lab.requested_date,
                                  )}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-5 mt-0.5">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {lab.result_date || lab.requested_date
                              ? new Date(
                                  lab.result_date || lab.requested_date,
                                ).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--:--'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedLab(lab)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {hasData ? 'View Result' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lab Result Detail Modal */}
      {selectedLab &&
        (() => {
          // Find current index for navigation
          const currentIndex = filteredLabs.findIndex(
            (l) =>
              (l.request_id &&
                selectedLab.request_id &&
                l.request_id === selectedLab.request_id) ||
              l === selectedLab,
          );
          const hasPrev = currentIndex > 0;
          const hasNext =
            currentIndex !== -1 && currentIndex < filteredLabs.length - 1;

          return (
            <LabResultModal
              lab={selectedLab}
              patientName={encounter.patient_name || 'Patient'}
              emrNumber={encounter.emr_number}
              // Fallback logic since EncounterDetail may not directly expose patient object in all contexts
              patientGender={
                (encounter as any).patient?.gender ||
                (encounter as any).gender ||
                'N/A'
              }
              patientAge={
                (encounter as any).patient?.age ||
                ((encounter as any).patient?.date_of_birth
                  ? calculateAge((encounter as any).patient.date_of_birth)
                  : (encounter as any).patient_age || 'N/A')
              }
              onClose={() => setSelectedLab(null)}
              onDocumentReview={() => {
                setSelectedResult({
                  id: selectedLab.request_id || '0',
                  name: selectedLab.test_name,
                });
                setShowReviewModal(true);
              }}
              onNext={() =>
                hasNext && setSelectedLab(filteredLabs[currentIndex + 1])
              }
              onPrev={() =>
                hasPrev && setSelectedLab(filteredLabs[currentIndex - 1])
              }
              hasNext={hasNext}
              hasPrev={hasPrev}
            />
          );
        })()}

      {/* Clinical Notes Modal for Lab Result Review */}
      {showReviewModal && selectedResult && (
        <ClinicalNotesModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedResult(null);
          }}
          encounterId={encounter.encounter_id}
          encounterNumber={encounter.encounter_number}
          visitId={encounter.visit_id}
          patientId={encounter.patient_id}
          patientName={encounter.patient_name || 'Patient'}
          encounterContext={{
            encounterId: encounter.encounter_id,
            patientId: encounter.patient_id,
            currentStage: encounter.status as any,
            status: encounter.status,
            createdAt: encounter.encounter_date,
            encounterType: (encounter.visit_type?.includes('Patient')
              ? 'In-Patient'
              : encounter.visit_type?.includes('Emergency')
                ? 'Emergency'
                : 'OPD') as 'OPD' | 'In-Patient' | 'Emergency',
            hasUnresolvedResults: false,
            consultationCount: 1,
          }}
          resultContext={{
            type: 'lab',
            resultId: selectedResult.id,
            resultName: selectedResult.name,
          }}
          initialNoteType="result_review"
        />
      )}
    </div>
  );
}

// =============================================================================
// NDC Logo Component
// =============================================================================
function NDCLogo() {
  return (
    <img
      src={require('../../../../../../../../assets/ndclogo.png')}
      alt="NDC Logo"
      className="h-12 w-auto"
    />
  );
}

// =============================================================================
// Lab Result Modal - NDC Medical Centre-Grade Design (Matching LabDetailModal)
// =============================================================================
function LabResultModal({
  lab,
  patientName,
  emrNumber,
  patientGender,
  patientAge,
  onClose,
  onDocumentReview,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: {
  lab: any;
  patientName: string;
  emrNumber: string;
  patientGender?: string;
  patientAge?: string | number;
  onClose: () => void;
  onDocumentReview: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'report'>('details');

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Print Lab Report Function - Hospital Grade
  const handlePrintLabReport = () => {
    let ndcLogoBase64 = '';
    try {
      // Load NDC logo as base64
      const logoModule = require('../../../../../../../../assets/ndclogo.png');
      ndcLogoBase64 = logoModule.default || logoModule;
    } catch (error) {
      console.warn('Could not load NDC logo:', error);
    }

    // Build components table HTML
    let componentsHtml = '';
    const structured: any = lab.structured_result || {};
    const template = lab.result_template_type;

    if (template === 'culture_sensitivity') {
      if (structured.specimenInfo) {
        componentsHtml += `
            <div class="result-section">
                <div class="section-header">Microbiology Specimen</div>
                <div class="grid-3">
                     <div><div class="label">Specimen</div><div class="value">${structured.specimenInfo.specimenType || '-'}</div></div>
                     <div><div class="label">Collection Date</div><div class="value">${structured.specimenInfo.collectionDate ? new Date(structured.specimenInfo.collectionDate).toLocaleDateString() : '-'}</div></div>
                     <div><div class="label">Quality</div><div class="value">${structured.specimenInfo.specimenQuality || '-'}</div></div>
                </div>
            </div>`;
      }
      if (structured.microscopy) {
        componentsHtml += `
             <div class="result-section">
               <div class="section-header">Microscopy</div>
               <table class="report-table"><tbody>`;
        Object.entries(structured.microscopy).forEach(([k, v]) => {
          if (v && k !== 'otherFindings')
            componentsHtml += `<tr><td width="40%">${k.replace(/([A-Z])/g, ' $1').trim()}</td><td class="res-val">${v}</td></tr>`;
        });
        componentsHtml += `</tbody></table></div>`;
      }
      if (structured.cultures && structured.cultures.length) {
        componentsHtml += `<div class="result-section"><div class="section-header">Culture Results</div>`;
        structured.cultures.forEach((cult: any, i: number) => {
          componentsHtml += `
                    <div class="culture-box">
                         <div class="culture-name">Isolate ${i + 1}: ${cult.organismIsolated}</div>
                         <div class="culture-meta">Growth: <span class="${cult.growth === 'No Growth' ? '' : 'abnormal-text'}">${cult.growth}</span> | Count: ${cult.colonyCount || '-'}</div>
                    </div>
                `;
        });
        componentsHtml += `</div>`;
      }
      if (structured.sensitivities && structured.sensitivities.length) {
        componentsHtml += `<div class="result-section"><div class="section-header">Antibiotic Susceptibility</div>`;
        structured.sensitivities.forEach((sens: any) => {
          if (sens.antibiotics && sens.antibiotics.length) {
            componentsHtml += `
                    <div style="margin-bottom:15px; font-weight:bold; font-size:9pt;">Organism: ${sens.organism || '-'}</div>
                    <table class="report-table compact">
                      <thead><tr><th>Antibiotic</th><th>Result</th></tr></thead>
                      <tbody>`;
            sens.antibiotics.forEach((ab: any) => {
              const res = ab.result || ab.sensitivity;
              const isResistant =
                String(res).startsWith('R') || String(res) === 'Resistant';
              componentsHtml += `<tr><td>${ab.antibiotic}</td><td><span class="${isResistant ? 'res-flag' : ''}">${res}</span></td></tr>`;
            });
            componentsHtml += `</tbody></table>`;
          }
        });
        componentsHtml += `</div>`;
      }
    } else if (template === 'parasite_report') {
      if (structured.specimenType) {
        componentsHtml += `
             <div class="result-section" style="margin-bottom:15px;">
                 <div class="grid-2">
                   <div><div class="label">Specimen</div><div class="value">${structured.specimenType}</div></div>
                   ${structured.collectionTime ? `<div><div class="label">Collection</div><div class="value">${structured.collectionTime}</div></div>` : ''}
                 </div>
             </div>`;
      }
      if (
        structured.parasitesFound !== undefined ||
        structured.detected !== undefined
      ) {
        const found = structured.parasitesFound ?? structured.detected;
        componentsHtml += `
             <div class="summary-box ${found ? 'abnormal-bg' : 'normal-bg'}">
                ${found ? 'PARASITES DETECTED' : 'NO PARASITES DETECTED'}
             </div>`;
      }
      if (
        (structured.parasitesFound &&
          Array.isArray(structured.parasitesFound) &&
          structured.parasitesFound.length) ||
        (structured.detections && structured.detections.length)
      ) {
        const pList =
          Array.isArray(structured.parasitesFound) &&
          structured.parasitesFound.length
            ? structured.parasitesFound
            : structured.detections;
        componentsHtml += `<table class="report-table"><thead><tr><th>Parasite</th><th>Stage</th><th>Density</th><th>Count</th></tr></thead><tbody>`;
        pList.forEach((det: any) => {
          componentsHtml += `<tr><td>${det.species || det.parasite || det.name}</td><td>${det.stage || '-'}</td><td>${det.density || det.form || '-'}</td><td>${det.count || '-'}${det.countPer ? ` / ${det.countPer}` : ''}</td></tr>`;
        });
        componentsHtml += `</tbody></table>`;
      }
    } else if (template === 'numeric_timing') {
      // ─── Numeric Timing (readings / time-point values) ───
      const readings = structured.readings || structured.results || [];
      if (Array.isArray(readings) && readings.length > 0) {
        componentsHtml += `
            <div class="result-section">
              <div class="section-header">Timed Readings</div>
              <table class="report-table">
                <thead><tr><th>Parameter / Time Point</th><th>Value</th><th>Unit</th><th>Ref. Range</th><th style="text-align:center;">Flag</th></tr></thead>
                <tbody>
                  ${readings
                    .map((r: any, idx: number) => {
                      const isAbn =
                        r.isCritical ||
                        r.isAbnormal ||
                        r.flag === 'H' ||
                        r.flag === 'L';
                      return `
                      <tr class="${isAbn ? 'row-abnormal' : ''}">
                        <td>${r.timePoint || r.time || r.parameter || `Reading ${idx + 1}`}</td>
                        <td class="res-val">${r.value ?? r.resultValue ?? '-'}</td>
                        <td class="unit">${r.unit || structured.unit || ''}</td>
                        <td>${r.reference || r.referenceRange || ''}</td>
                        <td style="text-align:center;font-weight:bold;color:${r.isCritical ? 'red' : isAbn ? '#d97706' : 'inherit'};">${r.isCritical ? 'CRIT' : r.isAbnormal ? 'ABN' : r.flag || ''}</td>
                      </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`;
      }
      if (structured.interpretation) {
        componentsHtml += `<div class="note-box"><div class="note-title">Interpretation</div><div class="note-content">${structured.interpretation}</div></div>`;
      }
    } else if (
      template === 'panel_numeric' &&
      structured.panels &&
      structured.panels.length > 0
    ) {
      // ─── Panel Numeric with panels[].analytes[] ───
      const rows = structured.panels.flatMap(
        (g: any) =>
          g.analytes?.map((a: any) => ({ group: g.groupName, ...a })) || [],
      );
      if (rows.length > 0) {
        componentsHtml += `
            <table class="report-table">
              <thead><tr><th>Panel / Analyte</th><th>Result</th><th>Unit</th><th>Ref. Range</th><th style="text-align:center;">Flag</th></tr></thead>
              <tbody>
                ${rows
                  .map((a: any) => {
                    const isAbnormal =
                      a.flag === 'H' ||
                      a.flag === 'L' ||
                      a.flag === 'High' ||
                      a.flag === 'Low' ||
                      a.isAbnormal;
                    const isCritical =
                      a.flag === 'C' || a.flag === 'CC' || a.isCritical;
                    return `
                    <tr class="${isCritical ? 'row-abnormal' : isAbnormal ? 'row-abnormal' : ''}">
                        <td>${a.group && a.group !== 'Additional Parameters' ? `${a.group}: ` : ''}${a.analyte || a.parameter || a.name}</td>
                        <td class="res-val" style="color:${isCritical ? '#dc2626' : isAbnormal ? '#d97706' : 'inherit'};">${a.resultValue ?? a.value ?? a.result ?? 'N/A'}</td>
                        <td class="unit">${a.unit || '-'}</td>
                        <td>${a.referenceRange || a.reference || '-'}</td>
                        <td style="text-align:center;font-weight:bold;color:${isCritical ? 'red' : isAbnormal ? '#d97706' : 'inherit'};">${a.flag || (isCritical ? 'C' : isAbnormal ? '!' : '')}</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>`;
      }
    } else if (template === 'qualitative_quantitative') {
      // ─── Qualitative / Quantitative ───
      const qualResult =
        structured.qualitative || structured.qualitativeResult || '';
      const quantObj =
        typeof structured.quantitative === 'object' &&
        structured.quantitative !== null
          ? structured.quantitative
          : null;
      const quantValue = quantObj
        ? (quantObj.concentration ?? quantObj.titer ?? quantObj.value)
        : (structured.quantitative ?? structured.quantitativeValue ?? '');
      const unitVal =
        quantObj?.unit || structured.unit || structured.resultUnit || '';
      const refRange =
        quantObj?.referenceRange ||
        structured.reference ||
        structured.referenceRange ||
        '';
      const qqInterpretation =
        structured.interpretation || structured.notes || '';

      componentsHtml += `<div class="result-section"><div class="grid-2">`;
      if (qualResult) {
        const isQPositive =
          qualResult === 'Positive' ||
          qualResult === 'Reactive' ||
          qualResult === 'Detected';
        componentsHtml += `
            <div class="summary-box ${isQPositive ? 'abnormal-bg' : 'normal-bg'}" style="text-align:center;">
              <div style="font-size:8pt;font-weight:800;text-transform:uppercase;opacity:0.7;margin-bottom:4px;">Qualitative Result</div>
              <div style="font-size:18pt;font-weight:900;">${qualResult}</div>
            </div>`;
      }
      if (
        quantValue !== '' &&
        quantValue !== undefined &&
        quantValue !== null
      ) {
        componentsHtml += `
            <div style="border:2px solid #006838;padding:16px;border-radius:10px;text-align:center;background:linear-gradient(135deg,#f0fdf4,#fff);">
              <div style="font-size:8pt;font-weight:800;text-transform:uppercase;color:#666;margin-bottom:4px;">Quantitative Value</div>
              <div style="font-size:20pt;font-weight:900;color:#006838;">${quantValue} <span style="font-size:11pt;font-weight:600;color:#666;">${unitVal}</span></div>
              ${refRange ? `<div style="font-size:8pt;color:#666;margin-top:6px;background:#f0f0f0;display:inline-block;padding:2px 8px;border-radius:4px;">Ref: ${refRange}</div>` : ''}
            </div>`;
      }
      componentsHtml += `</div>`;
      if (
        structured.confirmation &&
        (structured.confirmation.test || structured.confirmation.result)
      ) {
        componentsHtml += `<div style="margin-top:12px;padding:12px;background:#faf5ff;border:1px solid #d8b4fe;border-radius:6px;">
              <div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#7c3aed;margin-bottom:6px;">Confirmation Testing</div>
              <div class="grid-3">
                ${structured.confirmation.test ? `<div><div class="label">Test</div><div class="value">${structured.confirmation.test}</div></div>` : ''}
                ${structured.confirmation.result ? `<div><div class="label">Result</div><div class="value">${structured.confirmation.result}</div></div>` : ''}
                ${structured.confirmation.date ? `<div><div class="label">Date</div><div class="value">${structured.confirmation.date}</div></div>` : ''}
              </div>
            </div>`;
      }
      if (qqInterpretation) {
        componentsHtml += `<div class="note-box" style="margin-top:12px;"><div class="note-title">Interpretation</div><div class="note-content">${qqInterpretation}</div></div>`;
      }
      componentsHtml += `</div>`;
    } else if (template === 'urinalysis_checklist') {
      // ─── Urinalysis Checklist ───
      const uSections = ['physical', 'chemical', 'microscopy'];
      uSections.forEach((sec) => {
        const secData = structured[sec];
        if (!secData || typeof secData !== 'object') return;
        componentsHtml += `
            <div class="result-section">
              <div class="section-header">${sec.charAt(0).toUpperCase() + sec.slice(1)} Examination</div>
              <table class="report-table">
                <thead><tr><th width="45%">Parameter</th><th>Result</th></tr></thead>
                <tbody>
                  ${Object.entries(secData)
                    .map(([k, v]: [string, any]) => {
                      const displayVal = Array.isArray(v)
                        ? v.length > 0
                          ? v.join(', ')
                          : '-'
                        : v === null || v === undefined || v === ''
                          ? '-'
                          : String(v);
                      return `<tr><td style="text-transform:capitalize;">${k
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/_/g, ' ')
                        .trim()}</td><td class="res-val">${displayVal}</td></tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`;
      });
      if (structured.comments) {
        componentsHtml += `<div class="note-box"><div class="note-title">Comments</div><div class="note-content">${structured.comments}</div></div>`;
      }
    } else if (template === 'binary_metadata') {
      // ─── Binary Metadata ───
      const binResult =
        structured.result ||
        (structured.detected === true
          ? 'Detected'
          : structured.detected === false
            ? 'Not Detected'
            : '');
      const isBPositive =
        binResult === 'Positive' ||
        binResult === 'Reactive' ||
        binResult === 'Detected';
      const kitLotDisplay =
        structured.kitLot || structured.kitInfo?.lotNumber || '';
      componentsHtml += `<div class="result-section">`;
      if (binResult) {
        componentsHtml += `<div class="summary-box ${isBPositive ? 'abnormal-bg' : 'normal-bg'}" style="text-align:center;"><div style="font-size:8pt;font-weight:800;text-transform:uppercase;opacity:0.7;margin-bottom:4px;">Test Result</div><div style="font-size:20pt;font-weight:900;">${binResult}</div></div>`;
      }
      if (structured.target) {
        componentsHtml += `<div style="margin-top:12px;padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Target</div><div style="font-size:10pt;font-weight:600;">${structured.target}</div></div>`;
      }
      componentsHtml += `<div class="grid-2" style="margin-top:12px;">`;
      if (structured.method)
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Method</div><div style="font-size:10pt;font-weight:600;">${structured.method}</div></div>`;
      if (kitLotDisplay)
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Kit / Lot #</div><div style="font-size:10pt;font-weight:600;">${kitLotDisplay}</div></div>`;
      componentsHtml += `</div>`;
      if (structured.interpretation || structured.notes) {
        componentsHtml += `<div class="note-box" style="margin-top:12px;"><div class="note-title">Interpretation</div><div class="note-content">${structured.interpretation || structured.notes}</div></div>`;
      }
      componentsHtml += `</div>`;
    } else if (template === 'narrative_diagnostic') {
      // ─── Narrative Diagnostic ───
      const grossDesc =
        typeof structured.macroscopy === 'object'
          ? structured.macroscopy?.grossDescription
          : structured.macroscopy;
      const microDesc =
        typeof structured.microscopy === 'object'
          ? structured.microscopy?.microscopicFindings
          : structured.microscopy;
      const finalDx =
        structured.finalDiagnosis ||
        (typeof structured.diagnosis === 'object'
          ? structured.diagnosis?.finalDiagnosis
          : structured.diagnosis);
      const ndFindings = structured.findings || grossDesc;
      const ndImpression = structured.impression || finalDx;
      const ndRecommendation = structured.recommendation || structured.comments;
      componentsHtml += `<div class="result-section">`;
      if (structured.specimenType || structured.specimenSite) {
        componentsHtml += `<div class="grid-3" style="margin-bottom:16px;">${structured.specimenType ? `<div><div class="label">Specimen</div><div class="value">${structured.specimenType}</div></div>` : ''}${structured.specimenSite ? `<div><div class="label">Site</div><div class="value">${structured.specimenSite}</div></div>` : ''}${structured.fixationType ? `<div><div class="label">Fixation</div><div class="value">${structured.fixationType}</div></div>` : ''}</div>`;
      }
      if (structured.clinicalHistory) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Clinical History</div><div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;white-space:pre-wrap;">${structured.clinicalHistory}</div></div>`;
      }
      if (ndFindings) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Macroscopic Findings</div><div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;white-space:pre-wrap;">${ndFindings}</div></div>`;
      }
      if (microDesc) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Microscopic Findings</div><div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;white-space:pre-wrap;">${microDesc}</div></div>`;
      }
      if (ndImpression) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header" style="color:#1e40af;border-color:#1e40af;">Diagnosis</div><div style="padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:9.5pt;font-weight:500;white-space:pre-wrap;">${ndImpression}</div></div>`;
      }
      if (ndRecommendation) {
        componentsHtml += `<div><div class="section-header" style="color:#92400e;border-color:#92400e;">Comments / Recommendations</div><div style="padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:9.5pt;font-weight:500;white-space:pre-wrap;">${ndRecommendation}</div></div>`;
      }
      if (structured.addendum) {
        componentsHtml += `<div style="margin-top:16px;"><div class="section-header" style="color:#854d0e;border-color:#854d0e;">Addendum</div><div style="padding:14px;background:#fefce8;border:1px solid #fde047;border-radius:8px;font-size:9.5pt;white-space:pre-wrap;">${structured.addendum}</div></div>`;
      }
      componentsHtml += `</div>`;
    } else if (
      template === 'checklist' ||
      template === 'panel' ||
      (structured.parameters && structured.parameters.length) ||
      (structured.results && structured.results.length)
    ) {
      const params = structured.parameters || structured.results || [];
      if (params.length > 0) {
        componentsHtml += `
            <table class="report-table">
              <thead><tr><th>Test / Analyte</th><th>Result</th><th>Unit</th><th>Ref. Range</th><th style="text-align:center;">Flag</th></tr></thead>
              <tbody>
                ${params
                  .map((p: any) => {
                    const isAbnormal =
                      p.flag === 'H' ||
                      p.flag === 'L' ||
                      p.flag === 'High' ||
                      p.flag === 'Low' ||
                      p.isAbnormal ||
                      p.status === 'Abnormal';
                    const isCritical =
                      p.flag === 'C' ||
                      p.flag === 'CC' ||
                      p.flag === 'Critical Low' ||
                      p.flag === 'Critical High' ||
                      p.isCritical;
                    return `
                    <tr class="${isCritical ? 'row-critical' : isAbnormal ? 'row-abnormal' : ''}">
                        <td>${p.name || p.parameter}</td>
                        <td class="res-val">${p.resultValue ?? p.value ?? p.result ?? '-'}</td>
                        <td class="unit">${p.unit || ''}</td>
                        <td>${p.reference || p.referenceRange || ''}</td>
                        <td style="text-align:center; font-weight:bold; color:${isCritical ? 'red' : isAbnormal ? '#d97706' : 'inherit'};">${p.flag || (isCritical ? 'Critical' : isAbnormal ? '!' : '') || ''}</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>`;
      }
    } else if (lab.lab_results_items && lab.lab_results_items.length > 0) {
      // Standard Table for Panel
      componentsHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Test Parameter</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Ref. Range</th>
              <th style="text-align:center;">Flag</th>
            </tr>
          </thead>
          <tbody>
            ${lab.lab_results_items
              .map((comp: any) => {
                const isAbnormal =
                  comp.is_abnormal || comp.result_status === 'Abnormal';
                return `
              <tr class="${isAbnormal ? 'row-abnormal' : ''}">
                <td>${comp.component_name || 'N/A'}</td>
                <td class="res-val">${comp.result_value || 'N/A'}</td>
                <td class="unit">${comp.unit || ''}</td>
                <td>${comp.reference_range || ''}</td>
                <td style="text-align:center; font-weight:bold; color:${isAbnormal ? 'red' : 'inherit'};">
                  ${isAbnormal ? '!' : ''}
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Report - ${lab.test_name || 'Laboratory Test'}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
            width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto;
            color: #000; font-size: 10pt; line-height: 1.4; background: white;
          }
          .page { padding: 10mm; background: white; position: relative; }
          
          /* Header */
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #000; padding-bottom:15px; margin-bottom: 20px; }
          .header-left { display:flex; gap:15px; align-items:center; }
          .logo { width:60px; height:60px; }
          .logo img { width:100%; height:100%; object-fit:contain; }
          .hospital-text h1 { margin:0; font-size:16pt; font-weight:900; color:#000; text-transform:uppercase; line-height:1.1; }
          .hospital-text p { margin:0; font-size:9pt; text-transform:uppercase; letter-spacing:1px; color:#444; }
          
          .header-right { text-align:right; }
          .report-type { font-size:14pt; font-weight:800; text-transform:uppercase; margin-bottom:5px; border:2px solid #000; padding:2px 10px; display:inline-block; }
          .report-meta { font-size:9pt; color:#333; }

          /* Info Grid */
          .info-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; padding-bottom:15px; border-bottom:1px solid #ccc; margin-bottom:25px; }
          .info-item { display:flex; flex-direction:column; }
          .label { font-size:7pt; color:#666; text-transform:uppercase; font-weight:700; margin-bottom:2px; }
          .value { font-size:9.5pt; font-weight:600; color:#000; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
          
          /* Test Header */
          .test-header { text-align:center; margin-bottom:20px; text-transform:uppercase; }
          .test-name { font-size:14pt; font-weight:900; border-bottom:2px solid #000; display:inline-block; padding-bottom:2px; margin-bottom:5px; }
          .test-category { font-size:9pt; font-weight:600; color:#444; }

          /* Results */
          .section-header { font-size:10pt; font-weight:800; text-transform:uppercase; border-bottom:1px solid #000; margin-bottom:10px; padding-bottom:2px; display:inline-block; min-width:150px; }
          .result-section { margin-bottom:20px; }
          
          /* Tables */
          .report-table { width:100%; border-collapse:collapse; font-size:9.5pt; }
          .report-table th { text-align:left; border-bottom:1px solid #000; padding:6px 4px; text-transform:uppercase; font-size:8pt; }
          .report-table td { padding:6px 4px; border-bottom:1px solid #eee; vertical-align:top; }
          .report-table tr:last-child td { border-bottom:none; }
          .report-table.compact td { padding: 4px; }
          
          .res-val { font-weight:700; }
          .unit { color:#555; font-size:9pt; }
          .row-abnormal td { color:#000; } 
          
          /* Single Analyte Card */
          .single-analyte-card { border:1px solid #000; padding:20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-radius:4px; }
          .sa-main { display:flex; align-items:baseline; gap:10px; }
          .sa-value { font-size:14pt; font-weight:700; }
          .sa-unit { font-size:12pt; font-weight:600; color:#555; }
          .sa-meta { text-align:right; font-size:9pt; }
          .sa-flag { display:inline-block; background:#000; color:#fff; padding:2px 8px; font-weight:bold; font-size:9pt; border-radius:2px; margin-left:10px; }

          /* Microbiology */
          .grid-3 { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
          .culture-box { background:#f9f9f9; padding:10px; border-left:3px solid #000; margin-bottom:10px; }
          .culture-name { font-weight:800; }
          .culture-meta { font-size:9pt; margin-top:3px; }
          .abnormal-text { color:#cc0000; font-weight:bold; }
          .res-flag { font-weight:bold; color:#cc0000; }
          .summary-box { padding:15px; text-align:center; font-weight:900; font-size:12pt; border:1px solid #ccc; margin-bottom:15px; }
          .abnormal-bg { background:#ffeeee; color:#cc0000; border-color:#cc0000; }
          .normal-bg { background:#eeffee; color:#006600; border-color:#006600; }

          /* Interpretation/Remarks */
          .note-box { background:#f5f5f5; padding:10px; border:1px solid #ddd; margin-bottom:15px; page-break-inside:avoid; }
          .note-title { font-size:8pt; font-weight:800; text-transform:uppercase; margin-bottom:5px; color:#444; }
          .note-content { font-size:9.5pt; }

          /* Signatures */
          .signatures { display:grid; grid-template-columns: 1fr 1fr; gap:50px; margin-top:40px; page-break-inside:avoid; }
          .sig-line { border-top:1px solid #000; padding-top:5px; display:flex; flex-direction:column; align-items:center; }
          .sig-name { font-weight:700; font-size:11pt; }
          .sig-title { font-size:9pt; text-transform:uppercase; color:#555; }
          .sig-date { font-size:8pt; color:#777; margin-top:2px; }

          /* Footer */
          .footer { margin-top:30px; border-top:1px solid #000; padding-top:10px; display:flex; justify-content:space-between; font-size:8pt; color:#555; }
          
          /* Action Bar */
          .action-bar { position:fixed; top:0; left:0; width:100%; background:#222; padding:10px; display:flex; justify-content:center; gap:10px; z-index:9999; }
          .btn { background:#fff; border:none; padding:8px 20px; font-weight:bold; cursor:pointer; }
          @media print { .action-bar { display:none; } body { padding:0; } .page { padding:0; } }
        </style>
      </head>
      <body>
        <div class="action-bar">
          <button onclick="window.print()" class="btn">PRINT REPORT</button>
          <button onclick="window.close()" class="btn">CLOSE</button>
        </div>

        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="logo">
                ${ndcLogoBase64 ? `<img src="${ndcLogoBase64}" alt="NDC" />` : '<div style="width:100%;height:100%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;">NDC</div>'}
              </div>
              <div class="hospital-text">
                <h1>NDC Medical Centre</h1>
                <p>National Diagnostic Center • Lab Medicine</p>
              </div>
            </div>
            <div class="header-right">
              <div class="report-type">Laboratory Report</div>
              <div class="report-meta">
                <div>REF: ${(lab.request_id || lab.id || '').slice(0, 8).toUpperCase()}</div>
                <div>Date: ${new Date().toLocaleDateString('en-GB')}</div>
              </div>
            </div>
          </div>

          <!-- Patient & Request Grid -->
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Patient Name</div>
              <div class="value" style="font-size:11pt;">${patientName}</div>
            </div>
            <div class="info-item">
              <div class="label">EMR / ID</div>
              <div class="value">${emrNumber}</div>
            </div>
            <div class="info-item">
              <div class="label">Ordering Physician</div>
              <div class="value">${lab.doctor_name || lab.clinician_name || 'Medical Officer'}</div>
            </div>
            <div class="info-item">
              <div class="label">Clinical Indication</div>
              <div class="value" title="${lab.clinical_notes || '-'}">${lab.clinical_notes || '-'}</div>
            </div>
          </div>

          <!-- Test Title -->
          <div class="test-header">
            <div class="test-name">${lab.test_name || 'Laboratory Test'}</div>
            <div class="test-category">${lab.category || 'General'} • Sample: ${lab.sample_type || 'Standard'}</div>
          </div>

          <!-- Main Results -->
          <div class="result-section">
            ${
              componentsHtml ||
              `
                <!-- Single Result Card Fallback -->
                <div class="single-analyte-card">
                  <div class="sa-main">
                    <div class="sa-value">${lab.result || lab.result_value || 'Pending'}</div>
                    <div class="sa-unit">${lab.result_unit || ''}</div>
                     ${lab.is_abnormal || lab.is_critical ? `<div class="sa-flag">${lab.is_critical ? 'CRITICAL' : 'ABNORMAL'}</div>` : ''}
                  </div>
                  <div class="sa-meta">
                     ${lab.reference_range || lab.normal_range ? `<div><strong>Ref Range:</strong> ${lab.reference_range || lab.normal_range}</div>` : ''}
                  </div>
                </div>
            `
            }
          </div>

          <!-- Interpretation & Notes -->
          ${
            lab.interpretation
              ? `
            <div class="note-box">
              <div class="note-title">Interpretation</div>
              <div class="note-content">${lab.interpretation}</div>
            </div>
          `
              : ''
          }

          ${
            lab.result_notes || lab.remarks
              ? `
            <div class="note-box">
              <div class="note-title">Remarks</div>
              <div class="note-content">${lab.result_notes || lab.remarks}</div>
            </div>
          `
              : ''
          }

          <!-- Signatures -->
          <div class="signatures">
            <div class="sig-line">
              <div class="sig-name">${lab.technician?.name || lab.result_entered_by_name || '______________________'}</div>
              <div class="sig-title">Laboratory Scientist</div>
              <div class="sig-date">${lab.result_date ? formatDate(lab.result_date) : ''}</div>
            </div>
            <div class="sig-line">
               <div class="sig-name">${lab.verifier?.name || lab.verified_by_name || '______________________'}</div>
               <div class="sig-title">Verified By / Pathologist</div>
               <div class="sig-date">${lab.verified_at ? formatDate(lab.verified_at) : ''}</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div>Printed: ${new Date().toLocaleString()} | User: System</div>
            <div>NDC Medical Centre LIS • Page 1 of 1</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Open in system default browser
    if ((window as any).electron?.html?.saveAndOpen) {
      const filename = `Lab_Report_${(lab.request_id || lab.id).slice(0, 8)}_${Date.now()}.html`;
      (window as any).electron.html.saveAndOpen(filename, reportContent);
    } else {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.write(reportContent);
        printWindow.document.close();
        printWindow.focus();
      }
    }
  };

  const hasResult =
    lab.result ||
    lab.result_value ||
    lab.structured_result ||
    (lab.lab_results_items && lab.lab_results_items.length > 0);
  const isCritical = lab.is_critical;
  const isAbnormal = lab.is_abnormal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-gray-50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* EMR Header with NDC Branding */}
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary-700 to-primary-600">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-1.5 shadow-md">
                  <NDCLogo />
                </div>
                <div className="border-l border-white/30 pl-4">
                  <h1 className="text-white font-bold text-lg tracking-wide">
                    NATIONAL DEFENCE COLLEGE
                  </h1>
                  <p className="text-green-100 text-xs font-medium">
                    Medical Centre - Laboratory Result
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Navigation Controls */}
                {(onPrev || onNext) && (
                  <div className="hidden md:flex items-center bg-black/20 rounded-lg mr-2 max-h-[40px]">
                    <button
                      onClick={onPrev}
                      disabled={!hasPrev}
                      className="p-2 hover:bg-white/10 rounded-l-lg transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous Result"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="w-[1px] h-5 bg-white/20 self-center" />
                    <button
                      onClick={onNext}
                      disabled={!hasNext}
                      className="p-2 hover:bg-white/10 rounded-r-lg transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next Result"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <div className="text-right mr-4">
                  <p className="text-white text-sm font-medium">
                    REQ #
                    {(lab.request_id || lab.id || '').slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-green-100 text-xs">
                    {lab.requested_date
                      ? new Date(lab.requested_date).toLocaleDateString('en-GB')
                      : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 bg-gray-50">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-primary-700 border-b-2 border-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Request Details
                </div>
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'report'
                    ? 'text-primary-700 border-b-2 border-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Lab Report
                  {hasResult && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      1
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-5">
                {/* Status Banner */}
                <div
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    lab.status === 'Completed'
                      ? 'bg-green-50 border-green-200'
                      : lab.status === 'In Progress'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lab.status === 'Completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-amber-600" />
                    )}
                    <div>
                      <div
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase inline-block ${
                          lab.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lab.status}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Test Category:{' '}
                        <span className="font-semibold text-gray-800">
                          {lab.category}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Patient Info */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Patient
                      </h3>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {patientName}
                      </p>
                      <p className="text-xs text-gray-500">EMR: {emrNumber}</p>
                    </div>
                  </div>

                  {/* Test info */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FlaskConical className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Lab Test
                      </h3>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {lab.test_name}
                      </p>
                      <p className="text-xs text-gray-500">{lab.category}</p>
                    </div>
                  </div>
                </div>

                {/* Clinical Notes */}
                {lab.clinical_notes && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <h3 className="text-sm font-bold text-orange-800">
                        Clinical Indication
                      </h3>
                    </div>
                    <p className="text-sm text-gray-800">
                      {lab.clinical_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Report Tab */}
            {activeTab === 'report' && (
              <div className="p-6 space-y-5">
                {hasResult ? (
                  <div className="bg-white rounded-sm border border-gray-200 shadow-sm print:shadow-none min-h-[600px] flex flex-col">
                    {/* Report Header - HOSPITAL GRADE */}
                    <div className="p-8 border-b-2 border-green-700">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-700 font-bold text-2xl border-2 border-green-700">
                            NDC
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                              NDC MEDICAL CENTRE
                            </h2>
                            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                              Department of Laboratory Medicine
                            </p>
                            <p className="text-xs text-gray-500">
                              Excellence in Diagnostics
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-block bg-gray-100 rounded px-3 py-1 mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase mr-2">
                              Status
                            </span>
                            <span
                              className={`text-xs font-bold uppercase ${
                                lab.status === 'Completed' ||
                                lab.status === 'Result_Ready'
                                  ? 'text-green-700'
                                  : 'text-amber-600'
                              }`}
                            >
                              {lab.status || 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Report Reference
                          </p>
                          <p className="text-lg font-mono font-bold text-gray-900">
                            {(lab.request_id || lab.id || '')
                              .slice(0, 12)
                              .toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Patient & Order Context */}
                    <div className="bg-gray-50 p-6 border-b border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Patient Name
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {patientName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            EMR / ID
                          </p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {emrNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Gender / Age
                          </p>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {patientGender || 'N/A'} / {patientAge || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Physician
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {lab.doctor_name ||
                              lab.clinician_name ||
                              'Medical Officer'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Test Ordered
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {lab.test_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Category
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {lab.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Sample Collected
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {lab.sample_collected_at
                              ? formatDate(lab.sample_collected_at)
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Reported
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {lab.verified_at
                              ? formatDate(lab.verified_at)
                              : lab.result_date
                                ? formatDate(lab.result_date)
                                : 'Pending Verification'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Results Area */}
                    <div className="p-8 flex-grow">
                      <div className="mb-6 flex items-center gap-3 pb-2 border-b-2 border-gray-100">
                        <div className="p-2 bg-gray-900 rounded-sm">
                          <Microscope className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                          Examination Results
                        </h3>
                      </div>

                      {renderStructuredResult(
                        lab.structured_result,
                        lab.result_template_type,
                      ) ||
                        (lab.lab_results_items &&
                        lab.lab_results_items.length > 0 ? (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-2 font-bold text-xs text-gray-600 uppercase">
                                  Parameter
                                </th>
                                <th className="px-4 py-2 font-bold text-xs text-gray-600 uppercase">
                                  Result
                                </th>
                                <th className="px-4 py-2 font-bold text-xs text-gray-600 uppercase">
                                  Unit
                                </th>
                                <th className="px-4 py-2 font-bold text-xs text-gray-600 uppercase">
                                  Range
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.lab_results_items.map(
                                (item: any, i: number) => (
                                  <tr
                                    key={i}
                                    className={`border-b border-gray-100 ${item.is_abnormal ? 'bg-amber-50' : ''}`}
                                  >
                                    <td className="px-4 py-3 text-sm font-medium">
                                      {item.component_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold">
                                      {item.result_value}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {item.unit}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {item.reference_range}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        ) : (
                          /* Fallback for simple unstructured result */
                          <div className="p-6 bg-gray-50 border border-gray-200 rounded min-h-[100px] flex items-center justify-center">
                            <div>
                              <div
                                className={`text-xl font-bold font-mono text-center ${
                                  isCritical
                                    ? 'text-red-600'
                                    : isAbnormal
                                      ? 'text-amber-600'
                                      : 'text-gray-900'
                                }`}
                              >
                                {lab.result || lab.result_value || 'Pending'}{' '}
                                {lab.result_unit || ''}
                              </div>
                              <div className="text-xs text-gray-400 text-center mt-1 uppercase tracking-widest">
                                Result
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Reference Range (if basic result) */}
                      {!lab.structured_result &&
                        !lab.lab_results_items?.length &&
                        (lab.reference_range || lab.normal_range) && (
                          <div className="mt-4 p-3 bg-gray-50 border-l-4 border-gray-400 text-sm">
                            <span className="font-bold text-gray-600 mr-2">
                              Reference Range:
                            </span>
                            <span className="font-mono">
                              {lab.reference_range || lab.normal_range}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Interpretation & Notes Footer */}
                    <div className="bg-gray-50 p-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Pathologist Comments */}
                        <div className="space-y-4">
                          {lab.interpretation && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Pathologist Interpretation
                              </h4>
                              <p className="text-sm text-gray-800 italic bg-white p-3 border border-gray-200 rounded">
                                {lab.interpretation}
                              </p>
                            </div>
                          )}
                          {(lab.result_notes || lab.remarks) && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Scientist Remarks
                              </h4>
                              <p className="text-sm text-gray-800 bg-white p-3 border border-gray-200 rounded">
                                {lab.result_notes || lab.remarks}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Signatures */}
                        <div className="flex flex-col justify-end">
                          <div className="grid grid-cols-2 gap-8">
                            <div className="text-center">
                              <div className="h-10 border-b border-gray-400 mb-2" />
                              <p className="text-sm font-bold text-gray-900">
                                {lab.technician?.name ||
                                  lab.result_entered_by_name ||
                                  'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 uppercase">
                                Medical Lab Scientist
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="h-10 border-b border-gray-400 mb-2 relative">
                                <div
                                  className="absolute bottom-0 left-0 right-0 mx-auto w-16 h-8 bg-contain bg-no-repeat bg-center opacity-50"
                                  style={{
                                    backgroundImage:
                                      'url(/signature-placeholder.png)',
                                  }}
                                />
                              </div>
                              <p className="text-sm font-bold text-gray-900">
                                {lab.verifier?.name ||
                                  lab.verified_by_name ||
                                  'Pending'}
                              </p>
                              <p className="text-xs text-gray-500 uppercase">
                                Verified By
                              </p>
                            </div>
                          </div>
                          <div className="mt-6 text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-widest">
                              Electronic Report Generated by NDC EMR System
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
                    <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <FlaskConical className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Awaiting Results
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Lab results have not been entered or verified for this
                      request yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Actions */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FlaskConical className="h-4 w-4" />
                <span>{lab.category || 'Laboratory Test'}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Print Button - Show when results are available */}
                {hasResult && (
                  <button
                    onClick={handlePrintLabReport}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </button>
                )}
                {hasResult && (
                  <button
                    onClick={onDocumentReview}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-800 hover:to-[#007538] text-white font-semibold rounded-lg shadow-md transition-all"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Document Review
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
