// =============================================================================
// DentalChart Component
// Interactive dental chart using FDI notation
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Check,
  X,
  AlertCircle,
  Info,
  ChevronDown,
  Plus,
  Minus,
  RefreshCw,
  Save,
} from 'lucide-react';
import type {
  DentalChartEntryDTO,
  CreateDentalChartEntryDTO,
  ToothStatus,
  ToothCondition,
  CariesClassification,
} from '../types/dental.types';
import { ADULT_TEETH, DECIDUOUS_TEETH } from '../types/dental.types';

// =============================================================================
// Types
// =============================================================================

interface ToothData {
  tooth_number: number;
  status: ToothStatus;
  condition?: ToothCondition;
  caries_classification?: CariesClassification;
  mobility_grade?: number;
  surfaces: {
    mesial: boolean;
    occlusal: boolean;
    distal: boolean;
    buccal: boolean;
    lingual: boolean;
  };
  periapical_status?: string;
  restoration_material?: string;
  notes?: string;
  // For tracking if this is saved or modified
  chart_id?: string;
  isModified?: boolean;
}

interface DentalChartProps {
  patientId: string;
  examId: string;
  encounterId: string;
  existingEntries?: DentalChartEntryDTO[];
  onSaveEntry: (entry: CreateDentalChartEntryDTO) => Promise<void>;
  onUpdateEntry?: (
    chartId: string,
    entry: Partial<CreateDentalChartEntryDTO>,
  ) => Promise<void>;
  isAdult?: boolean;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const TOOTH_STATUS_OPTIONS: {
  value: ToothStatus;
  label: string;
  color: string;
}[] = [
  { value: 'Present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'Missing', label: 'Missing', color: 'bg-gray-300 text-gray-600' },
  {
    value: 'Impacted',
    label: 'Impacted',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'Deciduous',
    label: 'Deciduous',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'Unerupted',
    label: 'Unerupted',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    value: 'Partial_Eruption',
    label: 'Partial Eruption',
    color: 'bg-yellow-100 text-yellow-800',
  },
];

const TOOTH_CONDITION_OPTIONS: {
  value: ToothCondition;
  label: string;
  color: string;
}[] = [
  { value: 'Healthy', label: 'Healthy', color: 'bg-green-500' },
  { value: 'Caries', label: 'Caries', color: 'bg-red-500' },
  { value: 'Filled', label: 'Filled', color: 'bg-blue-500' },
  { value: 'Crown', label: 'Crown', color: 'bg-yellow-500' },
  {
    value: 'Bridge_Abutment',
    label: 'Bridge Abutment',
    color: 'bg-purple-500',
  },
  { value: 'Root_Canal_Treated', label: 'RCT', color: 'bg-pink-500' },
  { value: 'Fractured', label: 'Fractured', color: 'bg-orange-500' },
  { value: 'Mobile', label: 'Mobile', color: 'bg-amber-500' },
  { value: 'Extracted', label: 'Extracted', color: 'bg-gray-500' },
];

const CARIES_CLASS_OPTIONS: { value: CariesClassification; label: string }[] = [
  { value: 'Class_I', label: 'Class I (Occlusal)' },
  { value: 'Class_II', label: 'Class II (Proximal posterior)' },
  { value: 'Class_III', label: 'Class III (Proximal anterior)' },
  { value: 'Class_IV', label: 'Class IV (Incisal edge)' },
  { value: 'Class_V', label: 'Class V (Cervical)' },
  { value: 'Class_VI', label: 'Class VI (Cusp tip)' },
];

// =============================================================================
// Helper Functions
// =============================================================================

function getToothLabel(toothNumber: number): string {
  const quadrant = Math.floor(toothNumber / 10);
  const position = toothNumber % 10;

  const quadrantNames: Record<number, string> = {
    1: 'UR',
    2: 'UL',
    3: 'LL',
    4: 'LR',
    5: 'UR',
    6: 'UL',
    7: 'LL',
    8: 'LR',
  };

  return `${quadrantNames[quadrant] || ''}${position}`;
}

function getDefaultToothData(toothNumber: number): ToothData {
  return {
    tooth_number: toothNumber,
    status: 'Present',
    condition: 'Healthy',
    surfaces: {
      mesial: false,
      occlusal: false,
      distal: false,
      buccal: false,
      lingual: false,
    },
  };
}

// =============================================================================
// Single Tooth Component
// =============================================================================

interface ToothProps {
  toothNumber: number;
  data: ToothData;
  isSelected: boolean;
  onClick: () => void;
  isUpper: boolean;
}

function Tooth({
  toothNumber,
  data,
  isSelected,
  onClick,
  isUpper,
}: ToothProps) {
  const conditionOption = TOOTH_CONDITION_OPTIONS.find(
    (c) => c.value === data.condition,
  );
  const statusOption = TOOTH_STATUS_OPTIONS.find(
    (s) => s.value === data.status,
  );

  const isMissing = data.status === 'Missing' || data.condition === 'Extracted';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-1 rounded-lg transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
        ${isMissing ? 'opacity-50' : ''}
      `}
    >
      {/* Tooth number label */}
      <span
        className={`text-xs font-semibold text-gray-500 ${isUpper ? 'order-2 mt-1' : 'order-first mb-1'}`}
      >
        {toothNumber}
      </span>

      {/* Tooth visual */}
      <div
        className={`
          w-8 h-10 rounded-sm border-2 flex items-center justify-center
          ${isMissing ? 'border-dashed border-gray-300 bg-gray-100' : 'border-gray-400'}
          ${conditionOption ? conditionOption.color : 'bg-white'}
          ${isUpper ? 'order-1' : 'order-2'}
        `}
      >
        {isMissing ? (
          <X className="h-4 w-4 text-gray-400" />
        ) : data.condition === 'Caries' ? (
          <span className="text-white text-xs font-bold">C</span>
        ) : data.condition === 'Filled' ? (
          <span className="text-white text-xs font-bold">F</span>
        ) : data.condition === 'Crown' ? (
          <span className="text-white text-xs font-bold">Cr</span>
        ) : data.condition === 'Root_Canal_Treated' ? (
          <span className="text-white text-xs font-bold">R</span>
        ) : null}
      </div>

      {/* Modified indicator */}
      {data.isModified && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
      )}
    </button>
  );
}

// =============================================================================
// Tooth Detail Panel
// =============================================================================

interface ToothDetailPanelProps {
  tooth: ToothData;
  onUpdate: (updates: Partial<ToothData>) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  readOnly?: boolean;
}

function ToothDetailPanel({
  tooth,
  onUpdate,
  onClose,
  onSave,
  isSaving,
  readOnly,
}: ToothDetailPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-bold text-gray-900">
            Tooth #{tooth.tooth_number}
          </h3>
          <p className="text-sm text-gray-500">
            {getToothLabel(tooth.tooth_number)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Tooth Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <div className="grid grid-cols-3 gap-2">
          {TOOTH_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => !readOnly && onUpdate({ status: option.value })}
              disabled={readOnly}
              className={`
                px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${tooth.status === option.value ? `${option.color} ring-2 ring-offset-1` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tooth Condition */}
      {tooth.status === 'Present' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Condition</label>
          <div className="grid grid-cols-3 gap-2">
            {TOOTH_CONDITION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  !readOnly && onUpdate({ condition: option.value })
                }
                disabled={readOnly}
                className={`
                  px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${tooth.condition === option.value ? `${option.color} text-white ring-2 ring-offset-1` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Caries Classification - only show if condition is Caries */}
      {tooth.condition === 'Caries' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Caries Classification
          </label>
          <select
            value={tooth.caries_classification || ''}
            onChange={(e) =>
              !readOnly &&
              onUpdate({
                caries_classification: e.target.value as CariesClassification,
              })
            }
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select classification...</option>
            {CARIES_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Surface Involvement */}
      {tooth.status === 'Present' && tooth.condition !== 'Healthy' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Surface Involvement (MODBL)
          </label>
          <div className="flex gap-2">
            {(
              ['mesial', 'occlusal', 'distal', 'buccal', 'lingual'] as const
            ).map((surface) => (
              <button
                key={surface}
                type="button"
                onClick={() =>
                  !readOnly &&
                  onUpdate({
                    surfaces: {
                      ...tooth.surfaces,
                      [surface]: !tooth.surfaces[surface],
                    },
                  })
                }
                disabled={readOnly}
                className={`
                  w-10 h-10 rounded-lg text-xs font-bold transition-all uppercase
                  ${tooth.surfaces[surface] ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                `}
              >
                {surface[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobility Grade */}
      {tooth.status === 'Present' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Mobility Grade
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => !readOnly && onUpdate({ mobility_grade: grade })}
                disabled={readOnly}
                className={`
                  w-10 h-10 rounded-lg text-sm font-bold transition-all
                  ${tooth.mobility_grade === grade ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                `}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={tooth.notes || ''}
          onChange={(e) => !readOnly && onUpdate({ notes: e.target.value })}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={2}
          placeholder="Additional notes..."
        />
      </div>

      {/* Save Button */}
      {!readOnly && (
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Tooth Entry
            </>
          )}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DentalChart({
  patientId,
  examId,
  encounterId,
  existingEntries = [],
  onSaveEntry,
  onUpdateEntry,
  isAdult = true,
  readOnly = false,
}: DentalChartProps) {
  const teeth = isAdult ? ADULT_TEETH : DECIDUOUS_TEETH;

  // Initialize tooth data from existing entries
  const [toothDataMap, setToothDataMap] = useState<Map<number, ToothData>>(
    () => {
      const map = new Map<number, ToothData>();

      // Initialize all teeth with default values
      const allTeeth = [
        ...teeth.upperRight,
        ...teeth.upperLeft,
        ...teeth.lowerLeft,
        ...teeth.lowerRight,
      ];
      allTeeth.forEach((toothNumber) => {
        map.set(toothNumber, getDefaultToothData(toothNumber));
      });

      // Override with existing data
      existingEntries.forEach((entry) => {
        map.set(entry.tooth_number, {
          tooth_number: entry.tooth_number,
          status: entry.tooth_status,
          condition: entry.condition,
          caries_classification: entry.caries_classification,
          mobility_grade: entry.mobility_grade,
          surfaces: {
            mesial: entry.mesial || false,
            occlusal: entry.occlusal || false,
            distal: entry.distal || false,
            buccal: entry.buccal || false,
            lingual: entry.lingual || false,
          },
          periapical_status: entry.periapical_status,
          restoration_material: entry.restoration_material,
          notes: entry.notes,
          chart_id: entry.chart_id,
          isModified: false,
        });
      });

      return map;
    },
  );

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleToothClick = useCallback((toothNumber: number) => {
    setSelectedTooth((prev) => (prev === toothNumber ? null : toothNumber));
  }, []);

  const handleToothUpdate = useCallback(
    (toothNumber: number, updates: Partial<ToothData>) => {
      setToothDataMap((prev) => {
        const newMap = new Map(prev);
        const existingData =
          newMap.get(toothNumber) || getDefaultToothData(toothNumber);
        newMap.set(toothNumber, {
          ...existingData,
          ...updates,
          isModified: true,
        });
        return newMap;
      });
    },
    [],
  );

  const handleSaveTooth = useCallback(
    async (toothNumber: number) => {
      const toothData = toothDataMap.get(toothNumber);
      if (!toothData) return;

      setIsSaving(true);
      try {
        const entry: CreateDentalChartEntryDTO = {
          exam_id: examId,
          patient_id: patientId,
          encounter_id: encounterId,
          tooth_number: toothNumber,
          tooth_status: toothData.status,
          condition: toothData.condition,
          caries_classification: toothData.caries_classification,
          mobility_grade: toothData.mobility_grade,
          mesial: toothData.surfaces.mesial,
          occlusal: toothData.surfaces.occlusal,
          distal: toothData.surfaces.distal,
          buccal: toothData.surfaces.buccal,
          lingual: toothData.surfaces.lingual,
          notes: toothData.notes,
        };

        await onSaveEntry(entry);

        // Mark as saved
        setToothDataMap((prev) => {
          const newMap = new Map(prev);
          const data = newMap.get(toothNumber);
          if (data) {
            newMap.set(toothNumber, { ...data, isModified: false });
          }
          return newMap;
        });
      } catch (error) {
        console.error('Failed to save tooth entry:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [toothDataMap, examId, patientId, encounterId, onSaveEntry],
  );

  const selectedToothData = selectedTooth
    ? toothDataMap.get(selectedTooth)
    : null;

  // Calculate summary stats
  const stats = useMemo(() => {
    let caries = 0;
    let missing = 0;
    let filled = 0;
    let healthy = 0;

    toothDataMap.forEach((tooth) => {
      if (tooth.status === 'Missing' || tooth.condition === 'Extracted') {
        missing++;
      } else if (tooth.condition === 'Caries') {
        caries++;
      } else if (tooth.condition === 'Filled') {
        filled++;
      } else if (tooth.condition === 'Healthy') {
        healthy++;
      }
    });

    return {
      caries,
      missing,
      filled,
      healthy,
      dmft: caries + missing + filled,
    };
  }, [toothDataMap]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">🦷</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Dental Chart</h3>
            <p className="text-sm text-gray-500">
              {isAdult ? 'Adult Dentition (FDI)' : 'Deciduous Dentition'}
            </p>
          </div>
        </div>

        {/* DMFT Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
            <span className="text-red-500 font-bold">{stats.caries}</span>
            <span className="text-gray-500">Decayed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
            <span className="text-gray-500 font-bold">{stats.missing}</span>
            <span className="text-gray-500">Missing</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
            <span className="text-blue-500 font-bold">{stats.filled}</span>
            <span className="text-gray-500">Filled</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg border border-amber-200">
            <span className="text-amber-700 font-bold">DMFT: {stats.dmft}</span>
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Dental Chart Grid */}
          <div className="flex-1">
            {/* Upper Arch */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 mb-2 text-center">
                UPPER ARCH
              </div>
              <div className="flex justify-center gap-1">
                {/* Upper Right (Q1) */}
                <div className="flex gap-0.5 border-r-2 border-gray-300 pr-2">
                  {teeth.upperRight.map((toothNumber) => (
                    <Tooth
                      key={toothNumber}
                      toothNumber={toothNumber}
                      data={
                        toothDataMap.get(toothNumber) ||
                        getDefaultToothData(toothNumber)
                      }
                      isSelected={selectedTooth === toothNumber}
                      onClick={() => handleToothClick(toothNumber)}
                      isUpper
                    />
                  ))}
                </div>
                {/* Upper Left (Q2) */}
                <div className="flex gap-0.5 pl-2">
                  {teeth.upperLeft.map((toothNumber) => (
                    <Tooth
                      key={toothNumber}
                      toothNumber={toothNumber}
                      data={
                        toothDataMap.get(toothNumber) ||
                        getDefaultToothData(toothNumber)
                      }
                      isSelected={selectedTooth === toothNumber}
                      onClick={() => handleToothClick(toothNumber)}
                      isUpper
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Midline separator */}
            <div className="flex justify-center items-center gap-2 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">MIDLINE</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Lower Arch */}
            <div className="mt-4">
              <div className="flex justify-center gap-1">
                {/* Lower Right (Q4) */}
                <div className="flex gap-0.5 border-r-2 border-gray-300 pr-2">
                  {teeth.lowerRight.map((toothNumber) => (
                    <Tooth
                      key={toothNumber}
                      toothNumber={toothNumber}
                      data={
                        toothDataMap.get(toothNumber) ||
                        getDefaultToothData(toothNumber)
                      }
                      isSelected={selectedTooth === toothNumber}
                      onClick={() => handleToothClick(toothNumber)}
                      isUpper={false}
                    />
                  ))}
                </div>
                {/* Lower Left (Q3) */}
                <div className="flex gap-0.5 pl-2">
                  {teeth.lowerLeft.map((toothNumber) => (
                    <Tooth
                      key={toothNumber}
                      toothNumber={toothNumber}
                      data={
                        toothDataMap.get(toothNumber) ||
                        getDefaultToothData(toothNumber)
                      }
                      isSelected={selectedTooth === toothNumber}
                      onClick={() => handleToothClick(toothNumber)}
                      isUpper={false}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-500 mt-2 text-center">
                LOWER ARCH
              </div>
            </div>
          </div>

          {/* Tooth Detail Panel */}
          {selectedToothData && (
            <div className="w-80 flex-shrink-0">
              <ToothDetailPanel
                tooth={selectedToothData}
                onUpdate={(updates) =>
                  handleToothUpdate(selectedTooth!, updates)
                }
                onClose={() => setSelectedTooth(null)}
                onSave={() => handleSaveTooth(selectedTooth!)}
                isSaving={isSaving}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">LEGEND</div>
        <div className="flex flex-wrap gap-3">
          {TOOTH_CONDITION_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${option.color}`} />
              <span className="text-xs text-gray-600">{option.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
