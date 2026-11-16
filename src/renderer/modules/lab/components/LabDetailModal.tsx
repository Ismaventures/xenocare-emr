import React, { useState } from 'react';
import {
  X,
  User,
  FlaskConical,
  Stethoscope,
  Clock,
  FileText,
  Beaker,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Droplets,
  CreditCard,
  Receipt,
  ClipboardList,
  Printer,
  Download,
  Activity,
  Microscope,
  Pill,
  Thermometer,
  ChevronLeft, // Added
  ChevronRight, // Added
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { StatusBadge } from '../../../components/ui/DataDisplay';
import {
  PaymentStatusBadge,
  getPaymentStatusFromBillingOrder,
} from '../../../components/workflow';
import {
  LabRequestDTO,
  LabRequestStatus,
  getLabCategoryColor,
  getSampleTypeColor,
  getResultStatusColor,
  LabCategory,
  SampleType,
} from '../dtos/lab.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import type { PaymentStatusMap } from '../../billing/hooks/useBillingOrders';
import { formatCurrency } from '../../billing/dtos/billing-order.dto';

// NDC Logo component
function NDCLogo() {
  return (
    <img
      src={require('../../../../../assets/ndclogo.png')}
      alt="NDC Logo"
      className="h-12 w-auto"
    />
  );
}

interface LabDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LabRequestDTO | null;
  onCollectSample?: (request: LabRequestDTO) => void;
  onEnterResult?: (request: LabRequestDTO) => void;
  paymentInfo?: PaymentStatusMap[string];
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Map status to StatusBadge variant
function getStatusVariant(
  status: LabRequestStatus,
): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Sample Collected':
      return 'info';
    case 'In Progress':
      return 'info';
    case 'Completed':
      return 'success';
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

// Helper function to render structured result based on template type
function renderStructuredResult(
  structuredResult: Record<string, unknown> | undefined | null,
  templateType: string | undefined | null,
): React.ReactNode {
  if (!structuredResult) return null;

  const data = structuredResult as Record<string, any>;

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

  switch (templateType) {
    case 'numeric_table':
    case 'panel_numeric': {
      // Handle both formats: parameters/results (numeric_table) and panels (panel_numeric)
      const params = data.parameters || data.results || [];
      const panels = data.panels || [];

      // Handle panel_numeric format with panels[].analytes[]
      if (panels.length > 0) {
        const rows = panels.flatMap(
          (g: any) =>
            g.analytes?.map((a: any) => ({ group: g.groupName, ...a })) || [],
        );
        if (rows.length === 0) {
          return (
            <p className="text-sm text-gray-500 italic py-2">
              No parameters recorded
            </p>
          );
        }
        return (
          <div className="overflow-x-auto border border-gray-200 rounded-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Panel / Analyte
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ref. Range
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Flag
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((a: any, idx: number) => {
                  const isAbnormal =
                    a.flag === 'H' ||
                    a.flag === 'L' ||
                    a.flag === 'High' ||
                    a.flag === 'Low' ||
                    a.isAbnormal;
                  const isCritical =
                    a.flag === 'C' ||
                    a.flag === 'CC' ||
                    a.flag === 'Critical Low' ||
                    a.flag === 'Critical High' ||
                    a.isCritical;
                  return (
                    <tr
                      key={idx}
                      className={
                        isCritical
                          ? 'bg-red-50'
                          : isAbnormal
                            ? 'bg-amber-50'
                            : 'hover:bg-gray-50'
                      }
                    >
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {a.group && a.group !== 'Additional Parameters'
                          ? `${a.group}: `
                          : ''}
                        {a.analyte || a.parameter || a.name}
                      </td>
                      <td
                        className={`px-4 py-2 text-sm font-bold ${isCritical ? 'text-red-700' : isAbnormal ? 'text-amber-700' : 'text-gray-900'}`}
                      >
                        {a.resultValue ?? a.value ?? a.result ?? 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {a.unit || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                        {a.referenceRange || a.reference || '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {(a.flag || a.isAbnormal || a.isCritical) && (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                              isCritical
                                ? 'bg-red-100 text-red-800'
                                : isAbnormal
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {a.flag ||
                              (isCritical
                                ? 'Critical'
                                : isAbnormal
                                  ? 'Abnormal'
                                  : 'Normal')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      // Handle numeric_table format with parameters/results array
      if (!Array.isArray(params) || params.length === 0) {
        return (
          <p className="text-sm text-gray-500 italic py-2">
            No parameters recorded
          </p>
        );
      }
      return (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Test / Analyte
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ref. Range
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Flag
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {params.map((param: any, idx: number) => {
                const isAbnormal =
                  param.flag === 'H' ||
                  param.flag === 'L' ||
                  param.flag === 'High' ||
                  param.flag === 'Low' ||
                  param.isAbnormal;
                const isCritical =
                  param.flag === 'C' ||
                  param.flag === 'CC' ||
                  param.flag === 'Critical Low' ||
                  param.flag === 'Critical High' ||
                  param.isCritical;
                return (
                  <tr
                    key={idx}
                    className={
                      isCritical
                        ? 'bg-red-50'
                        : isAbnormal
                          ? 'bg-amber-50'
                          : 'hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {param.name || param.parameter}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm font-bold ${isCritical ? 'text-red-700' : isAbnormal ? 'text-amber-700' : 'text-gray-900'}`}
                    >
                      {param.resultValue ??
                        param.value ??
                        param.result ??
                        'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {param.unit || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                      {param.referenceRange || param.reference || '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {(param.flag || param.isAbnormal || param.isCritical) && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                            isCritical
                              ? 'bg-red-100 text-red-800'
                              : isAbnormal
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {param.flag ||
                            (isCritical
                              ? 'Critical'
                              : isAbnormal
                                ? 'Abnormal'
                                : 'Normal')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                            {sens.antibiotics.map((ab: any, abIdx: number) => {
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
                            })}
                          </tbody>
                        </table>
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
        </div>
      );
    }

    case 'urinalysis_checklist': {
      const sections = ['physical', 'chemical', 'microscopy'];

      // Helper to format array values nicely
      const formatValue = (value: unknown): string => {
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : '-';
        }
        if (value === null || value === undefined || value === '') {
          return '-';
        }
        return String(value);
      };

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => {
              const sectionData = data[section];
              if (!sectionData || typeof sectionData !== 'object') return null;
              return (
                <div
                  key={section}
                  className="border border-gray-200 rounded bg-white"
                >
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {section} Examination
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(sectionData).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        <span className="text-gray-600 capitalize">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/_/g, ' ')
                            .trim()}
                        </span>
                        <span className="font-semibold text-gray-900 text-right max-w-[60%]">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comments/Interpretation */}
          {data.comments && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">
                Technician Comments
              </p>
              <p className="text-sm text-amber-900">{data.comments}</p>
            </div>
          )}
          {data.interpretation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-bold text-blue-700 uppercase mb-1">
                Interpretation
              </p>
              <p className="text-sm text-blue-900">{data.interpretation}</p>
            </div>
          )}
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
                {(data.parasitesFound || data.detections).map(
                  (det: any, idx: number) => (
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
                  ),
                )}
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

          {/* Notes/Remarks */}
          {(data.remarks || data.notes) && (
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">
                Remarks / Notes
              </h5>
              <p className="text-sm text-gray-700 p-3 bg-amber-50 rounded border border-amber-200">
                {data.remarks || data.notes}
              </p>
            </div>
          )}
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
      const interpretation = data.interpretation || data.notes;
      const titerVal = quantObj?.titer;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {qualResult && (
              <div
                className={`p-6 rounded border text-center ${
                  qualResult === 'Positive' ||
                  qualResult === 'Reactive' ||
                  qualResult === 'Detected'
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

          {/* Signal/Cutoff */}
          {data.signalCutoff !== undefined && (
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                Signal / Cutoff Ratio
              </p>
              <p className="text-lg font-bold text-gray-900">
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
        </div>
      );
    }

    case 'binary_metadata': {
      // Form saves: detected (boolean), target, method, kitInfo: {name, manufacturer, lotNumber, expiryDate}
      // qcChecklist: Record<string, boolean>, controlResults: {positiveControl, negativeControl}, ctValue, interpretation, notes
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
                      {key.replace(/([A-Z])/g, ' $1').trim()}: {val ? '✓' : '✗'}
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
        </div>
      );
    }

    case 'narrative_diagnostic': {
      // Form saves: macroscopy.grossDescription, microscopy.microscopicFindings, finalDiagnosis, diagnosis.finalDiagnosis
      // Also: specimenType, specimenSite, specimenDescription, fixationType, clinicalHistory, specialStains, specialStainResults
      // tumorGrade, ptnmStage, marginStatus, comments, addendum
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
      const findings = data.findings || grossDesc; // legacy fallback
      const impression = data.impression || finalDx; // legacy fallback
      const recommendation = data.recommendation || data.comments; // legacy fallback

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
                {data.specimenSize && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Size
                    </span>
                    <span className="font-medium text-gray-900">
                      {data.specimenSize}
                    </span>
                  </div>
                )}
                {data.specimenWeight && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Weight
                    </span>
                    <span className="font-medium text-gray-900">
                      {data.specimenWeight}g
                    </span>
                  </div>
                )}
                {data.blocksSubmitted && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase block">
                      Blocks
                    </span>
                    <span className="font-medium text-gray-900">
                      {data.blocksSubmitted}
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
        </div>
      );
    }

    case 'numeric_timing': {
      // Support both 'readings' and 'results' field names (form saves as 'results')
      const readings = data.readings || data.results || [];
      return (
        <div className="space-y-3">
          {Array.isArray(readings) && readings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Parameter / Time Point
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Value
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Unit
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Reference Range
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {readings.map((reading: any, idx: number) => (
                    <tr
                      key={idx}
                      className={
                        reading.isCritical
                          ? 'bg-red-50'
                          : reading.isAbnormal
                            ? 'bg-amber-50'
                            : ''
                      }
                    >
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {reading.timePoint ||
                          reading.time ||
                          reading.parameter ||
                          `Reading ${idx + 1}`}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                        {reading.value ?? reading.resultValue ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {reading.unit || data.unit || ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {reading.reference || reading.referenceRange || ''}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {reading.isCritical ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                            CRITICAL
                          </span>
                        ) : reading.isAbnormal ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                            ABNORMAL
                          </span>
                        ) : reading.flag ? (
                          <span className="text-gray-600">{reading.flag}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No timing readings recorded</p>
          )}

          {/* Additional Fields */}
          {data.interpretation && (
            <div className="mt-4 p-3 bg-purple-50 border-l-4 border-purple-500 rounded-r">
              <p className="text-xs font-semibold text-purple-700 uppercase mb-1">
                Clinical Interpretation
              </p>
              <p className="text-sm text-purple-800">{data.interpretation}</p>
            </div>
          )}
          {data.remarks && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                Technician Remarks
              </p>
              <p className="text-sm text-gray-700">{data.remarks}</p>
            </div>
          )}
          {data.methodology && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                Methodology
              </p>
              <p className="text-sm text-blue-800">{data.methodology}</p>
            </div>
          )}
        </div>
      );
    }

    default:
      // Fallback: render as key-value pairs
      return (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm text-gray-600 capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
  }
}

export default function LabDetailModal({
  isOpen,
  onClose,
  request,
  onCollectSample,
  onEnterResult,
  paymentInfo,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: LabDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'report'>('details');

  if (!isOpen || !request) return null;

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

  const patientName = request.patient
    ? `${request.patient.first_name || ''} ${request.patient.surname || ''}`.trim()
    : 'Unknown Patient';
  const patientAge = request.patient?.date_of_birth
    ? formatDetailedAge(request.patient.date_of_birth)
    : 'N/A';

  // Print Lab Report Function
  const handlePrintLabReport = async () => {
    // Load NDC logo as base64 (using canvas conversion for proper data URI)
    let ndcLogoBase64 = '';
    try {
      const logoModule = require('../../../../../assets/ndclogo.png');
      const logoSrc = logoModule.default || logoModule;
      // Convert to proper data URI via canvas for PDF/print compatibility
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            ndcLogoBase64 = canvas.toDataURL('image/png');
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = logoSrc;
      });
    } catch (error) {
      console.warn('Could not load NDC logo:', error);
    }

    const labResult = request.lab_result;

    // Build components table or structured result HTML
    let componentsHtml = '';
    const structured: any = labResult?.structured_result || {};
    const template = labResult?.result_template_type;

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
        const list =
          Array.isArray(structured.parasitesFound) &&
          structured.parasitesFound.length
            ? structured.parasitesFound
            : structured.detections;
        componentsHtml += `<table class="report-table"><thead><tr><th>Parasite</th><th>Stage</th><th>Density</th><th>Count</th></tr></thead><tbody>`;
        list.forEach((det: any) => {
          componentsHtml += `<tr><td>${det.species || det.parasite || det.name}</td><td>${det.stage || '-'}</td><td>${det.density || det.form || '-'}</td><td>${det.count || '-'}${det.countPer ? ` / ${det.countPer}` : ''}</td></tr>`;
        });
        componentsHtml += `</tbody></table>`;
      }
    } else if (template === 'urinalysis_checklist') {
      // ─── Urinalysis Checklist (physical / chemical / microscopy) ───
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
        componentsHtml += `<div class="note-box" style="margin-top:12px;"><div class="note-title">Technician Comments</div><div class="note-content">${structured.comments}</div></div>`;
      }
      if (structured.interpretation) {
        componentsHtml += `<div class="note-box"><div class="note-title">Interpretation</div><div class="note-content">${structured.interpretation}</div></div>`;
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
      const titerVal = quantObj?.titer;

      componentsHtml += `<div class="result-section"><div class="grid-2">`;
      if (qualResult) {
        const isPositive =
          qualResult === 'Positive' ||
          qualResult === 'Reactive' ||
          qualResult === 'Detected';
        componentsHtml += `
            <div class="summary-box ${isPositive ? 'abnormal-bg' : 'normal-bg'}" style="text-align:center;">
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
      if (titerVal && quantObj?.concentration !== undefined) {
        componentsHtml += `<div style="margin-top:12px;padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Titer</div><div style="font-size:13pt;font-weight:800;color:#1a1a1a;">${titerVal}</div></div>`;
      }
      if (structured.signalCutoff !== undefined) {
        componentsHtml += `<div style="margin-top:12px;padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Signal / Cutoff Ratio</div><div style="font-size:13pt;font-weight:800;color:#1a1a1a;">${structured.signalCutoff}</div></div>`;
      }
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
    } else if (template === 'binary_metadata') {
      // ─── Binary Metadata (detected boolean + kitInfo object + qcChecklist + controlResults) ───
      const binResult =
        structured.result ||
        (structured.detected === true
          ? 'Detected'
          : structured.detected === false
            ? 'Not Detected'
            : '');
      const isPositive =
        binResult === 'Positive' ||
        binResult === 'Reactive' ||
        binResult === 'Detected';
      const kitLotDisplay =
        structured.kitLot || structured.kitInfo?.lotNumber || '';
      const kitNameDisplay = structured.kitInfo?.name || '';
      componentsHtml += `<div class="result-section">`;
      if (binResult) {
        componentsHtml += `
            <div class="summary-box ${isPositive ? 'abnormal-bg' : 'normal-bg'}" style="text-align:center;">
              <div style="font-size:8pt;font-weight:800;text-transform:uppercase;opacity:0.7;margin-bottom:4px;">Test Result</div>
              <div style="font-size:20pt;font-weight:900;">${binResult}</div>
            </div>`;
      }
      if (structured.target) {
        componentsHtml += `<div style="margin-top:12px;padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Target</div><div style="font-size:10pt;font-weight:600;">${structured.target}</div></div>`;
      }
      componentsHtml += `<div class="grid-2" style="margin-top:12px;">`;
      if (structured.method) {
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Method</div><div style="font-size:10pt;font-weight:600;">${structured.method}</div></div>`;
      }
      if (kitLotDisplay) {
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Kit / Lot #</div><div style="font-size:10pt;font-weight:600;">${kitLotDisplay}</div></div>`;
      }
      if (kitNameDisplay) {
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Kit Name</div><div style="font-size:10pt;font-weight:600;">${kitNameDisplay}${structured.kitInfo?.manufacturer ? ` (${structured.kitInfo.manufacturer})` : ''}</div></div>`;
      }
      if (structured.kitInfo?.expiryDate) {
        componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Kit Expiry</div><div style="font-size:10pt;font-weight:600;">${structured.kitInfo.expiryDate}</div></div>`;
      }
      componentsHtml += `</div>`;
      if (structured.ctValue !== undefined && structured.ctValue !== null) {
        componentsHtml += `<div style="margin-top:12px;padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Ct Value</div><div style="font-size:14pt;font-weight:800;">${structured.ctValue}</div></div>`;
      }
      if (
        structured.qcChecklist &&
        Object.keys(structured.qcChecklist).length > 0
      ) {
        componentsHtml += `<div style="margin-top:12px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;margin-bottom:6px;">QC Checklist</div><div class="grid-3">`;
        Object.entries(structured.qcChecklist).forEach(
          ([key, val]: [string, any]) => {
            componentsHtml += `<div style="padding:6px 10px;background:${val ? '#f0fdf4' : '#fef2f2'};border:1px solid ${val ? '#bbf7d0' : '#fecaca'};border-radius:4px;font-size:8pt;font-weight:600;color:${val ? '#166534' : '#991b1b'};">${key.replace(/([A-Z])/g, ' $1').trim()}: ${val ? '✓' : '✗'}</div>`;
          },
        );
        componentsHtml += `</div></div>`;
      }
      if (structured.controlResults) {
        componentsHtml += `<div class="grid-2" style="margin-top:12px;">`;
        if (structured.controlResults.positiveControl)
          componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Positive Control</div><div style="font-size:10pt;font-weight:600;">${structured.controlResults.positiveControl}</div></div>`;
        if (structured.controlResults.negativeControl)
          componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Negative Control</div><div style="font-size:10pt;font-weight:600;">${structured.controlResults.negativeControl}</div></div>`;
        componentsHtml += `</div>`;
      }
      if (structured.interpretation || structured.notes) {
        componentsHtml += `<div class="note-box" style="margin-top:12px;"><div class="note-title">Interpretation / Notes</div><div class="note-content">${structured.interpretation || structured.notes}</div></div>`;
      }
      componentsHtml += `</div>`;
    } else if (template === 'narrative_diagnostic') {
      // ─── Narrative Diagnostic (macroscopy, microscopy, diagnosis, comments, specimen, stains, staging) ───
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
      const findings = structured.findings || grossDesc;
      const impression = structured.impression || finalDx;
      const recommendation = structured.recommendation || structured.comments;

      componentsHtml += `<div class="result-section">`;
      if (structured.specimenType || structured.specimenSite) {
        componentsHtml += `<div class="grid-3" style="margin-bottom:16px;">
              ${structured.specimenType ? `<div><div class="label">Specimen Type</div><div class="value">${structured.specimenType}</div></div>` : ''}
              ${structured.specimenSite ? `<div><div class="label">Specimen Site</div><div class="value">${structured.specimenSite}</div></div>` : ''}
              ${structured.fixationType ? `<div><div class="label">Fixation</div><div class="value">${structured.fixationType}</div></div>` : ''}
            </div>`;
      }
      if (structured.clinicalHistory) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Clinical History</div><div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;line-height:1.7;white-space:pre-wrap;">${structured.clinicalHistory}</div></div>`;
      }
      if (findings) {
        componentsHtml += `
            <div style="margin-bottom:16px;">
              <div class="section-header">Macroscopic Findings</div>
              <div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;line-height:1.7;white-space:pre-wrap;">${findings}</div>
            </div>`;
      }
      if (structured.specimenDescription) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Specimen Description</div><div style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;line-height:1.7;white-space:pre-wrap;">${structured.specimenDescription}</div></div>`;
      }
      if (microDesc) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Microscopic Findings</div><div style="padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:9.5pt;line-height:1.7;white-space:pre-wrap;">${microDesc}</div></div>`;
      }
      if (
        structured.specialStains?.length > 0 ||
        structured.specialStainResults
      ) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header">Special Stains</div>`;
        if (structured.specialStains?.length > 0) {
          componentsHtml += `<div style="margin-bottom:8px;">${structured.specialStains.map((s: string) => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;background:#faf5ff;border:1px solid #d8b4fe;border-radius:4px;font-size:8pt;font-weight:600;color:#6b21a8;">${s}</span>`).join('')}</div>`;
        }
        if (structured.specialStainResults)
          componentsHtml += `<div style="padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:9pt;white-space:pre-wrap;">${structured.specialStainResults}</div>`;
        componentsHtml += `</div>`;
      }
      if (impression) {
        componentsHtml += `
            <div style="margin-bottom:16px;">
              <div class="section-header" style="color:#1e40af;border-color:#1e40af;">Diagnosis</div>
              <div style="padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:9.5pt;line-height:1.7;font-weight:500;white-space:pre-wrap;">${impression}</div>
            </div>`;
      }
      if (
        structured.tumorGrade ||
        structured.ptnmStage ||
        structured.marginStatus
      ) {
        componentsHtml += `<div class="grid-3" style="margin-bottom:16px;">`;
        if (structured.tumorGrade)
          componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Tumor Grade</div><div style="font-size:10pt;font-weight:700;">${structured.tumorGrade}</div></div>`;
        if (structured.ptnmStage)
          componentsHtml += `<div style="padding:10px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">pTNM Stage</div><div style="font-size:10pt;font-weight:700;">${structured.ptnmStage}</div></div>`;
        if (structured.marginStatus)
          componentsHtml += `<div style="padding:10px;background:${structured.marginStatus === 'Involved' ? '#fef2f2' : '#f0fdf4'};border:1px solid ${structured.marginStatus === 'Involved' ? '#fecaca' : '#bbf7d0'};border-radius:6px;"><div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#666;">Margin Status</div><div style="font-size:10pt;font-weight:700;color:${structured.marginStatus === 'Involved' ? '#991b1b' : '#166534'};">${structured.marginStatus}</div></div>`;
        componentsHtml += `</div>`;
      }
      if (recommendation) {
        componentsHtml += `
            <div style="margin-bottom:16px;">
              <div class="section-header" style="color:#92400e;border-color:#92400e;">Comments / Recommendations</div>
              <div style="padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:9.5pt;line-height:1.7;font-weight:500;white-space:pre-wrap;">${recommendation}</div>
            </div>`;
      }
      if (structured.addendum) {
        componentsHtml += `<div style="margin-bottom:16px;"><div class="section-header" style="color:#854d0e;border-color:#854d0e;">Addendum</div><div style="padding:14px;background:#fefce8;border:1px solid #fde047;border-radius:8px;font-size:9.5pt;line-height:1.7;white-space:pre-wrap;">${structured.addendum}</div></div>`;
      }
      componentsHtml += `</div>`;
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
                      <tr class="${r.isCritical ? 'row-abnormal' : isAbn ? 'row-abnormal' : ''}">
                        <td>${r.timePoint || r.time || r.parameter || `Reading ${idx + 1}`}</td>
                        <td class="res-val">${r.value ?? r.resultValue ?? '-'}</td>
                        <td class="unit">${r.unit || structured.unit || ''}</td>
                        <td>${r.reference || r.referenceRange || ''}</td>
                        <td style="text-align:center;font-weight:bold;color:${r.isCritical ? 'red' : isAbn ? '#d97706' : 'inherit'};">
                          ${r.isCritical ? 'CRIT' : r.isAbnormal ? 'ABN' : r.flag || ''}
                        </td>
                      </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`;
      }
      if (structured.interpretation) {
        componentsHtml += `<div class="note-box" style="margin-top:12px;border-left:4px solid #7c3aed;"><div class="note-title" style="color:#7c3aed;">Clinical Interpretation</div><div class="note-content">${structured.interpretation}</div></div>`;
      }
      if (structured.remarks) {
        componentsHtml += `<div class="note-box"><div class="note-title">Technician Remarks</div><div class="note-content">${structured.remarks}</div></div>`;
      }
      if (structured.methodology) {
        componentsHtml += `<div class="note-box"><div class="note-title" style="color:#1e40af;">Methodology</div><div class="note-content">${structured.methodology}</div></div>`;
      }
    } else if (
      template === 'panel_numeric' &&
      structured.panels &&
      structured.panels.length > 0
    ) {
      // ─── Panel Numeric with panels[].analytes[] grouping ───
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
    } else if (labResult?.components && labResult.components.length > 0) {
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
            ${labResult.components
              .map((comp) => {
                const isAbnormal =
                  comp.result_status === 'Abnormal' ||
                  comp.result_status === 'Critical' ||
                  comp.result_status === 'H' ||
                  comp.result_status === 'L';
                return `
              <tr class="${isAbnormal ? 'row-abnormal' : ''}">
                <td>${comp.component_name || 'N/A'}</td>
                <td class="res-val">${comp.result_value || comp.result_text || 'N/A'}</td>
                <td class="unit">${comp.result_unit || ''}</td>
                <td>${comp.reference_range || ''}</td>
                <td style="text-align:center; font-weight:bold; color:${isAbnormal ? 'red' : 'inherit'};">
                  ${comp.result_status !== 'Normal' ? comp.result_status?.substring(0, 1) : ''}
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    } else if (
      structured &&
      Object.keys(structured).length > 0 &&
      !componentsHtml
    ) {
      // ─── Default fallback: render structured data as key-value pairs ───
      componentsHtml = `
        <div class="result-section">
          <div class="section-header">Test Results</div>
          <table class="report-table">
            <thead><tr><th width="40%">Parameter</th><th>Value</th></tr></thead>
            <tbody>
              ${Object.entries(structured)
                .map(([k, v]: [string, any]) => {
                  const displayVal =
                    v === null || v === undefined
                      ? '-'
                      : typeof v === 'object'
                        ? JSON.stringify(v)
                        : String(v);
                  return `<tr><td style="text-transform:capitalize;">${k.replace(/_/g, ' ')}</td><td class="res-val">${displayVal}</td></tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`;
    }

    // ─── Build physician name from doctor object (correct source) ───
    const physicianName = request.doctor
      ? `Dr. ${request.doctor.first_name || ''} ${request.doctor.last_name || ''}`.trim()
      : request.ordered_by && typeof request.ordered_by === 'object'
        ? `Dr. ${(request.ordered_by as any).last_name || ''}`
        : 'N/A';

    // ─── Build all diagnoses ───
    const allDiagnoses =
      request.diagnosis && request.diagnosis.length > 0
        ? request.diagnosis.join(', ')
        : '-';

    // ─── Status & Priority labels ───
    const requestStatus = request.status || 'Pending';
    const requestPriority = request.priority || 'Routine';
    const workflowStatus = labResult?.workflow_status || '';

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Report - ${request.test?.test_name || 'Laboratory Test'} | NDC Medical Centre</title>
        <style>
          @page { size: A4; margin: 10mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif; 
            width: 210mm; min-height: 297mm; margin: 0 auto;
            color: #1a1a1a; font-size: 9.5pt; line-height: 1.5; background: #f8f9fa;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .page { padding: 0; background: white; position: relative; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
          
          /* ─── Action Bar ─── */
          .action-bar { position:fixed; top:0; left:0; width:100%; background: linear-gradient(135deg, #006838, #008545); padding:12px 20px; display:flex; justify-content:center; align-items:center; gap:12px; z-index:9999; box-shadow: 0 2px 12px rgba(0,104,56,0.3); }
          .action-bar .brand { color:#fff; font-weight:800; font-size:11pt; letter-spacing:1px; margin-right:auto; }
          .btn { background:#fff; border:none; padding:10px 28px; font-weight:700; cursor:pointer; border-radius:8px; font-size:10pt; text-transform:uppercase; letter-spacing:0.5px; transition: all 0.2s; }
          .btn:hover { background:#f0f0f0; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
          .btn-print { background: #fbbf24; color: #1a1a1a; }
          .btn-print:hover { background: #f59e0b; }
          @media print { .action-bar { display:none !important; } body { padding:0; background:white; } .page { box-shadow:none; padding: 5mm; } }

          /* ─── Header ─── */
          .header { background: linear-gradient(135deg, #006838 0%, #008545 60%, #00a050 100%); padding: 20px 30px; display:flex; justify-content:space-between; align-items:center; }
          .header-left { display:flex; gap:15px; align-items:center; }
          .logo { width:55px; height:55px; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 6px; border: 1px solid rgba(255,255,255,0.2); }
          .logo img { width:100%; height:100%; object-fit:contain; filter: brightness(1.1); }
          .logo-fallback { width:55px; height:55px; background: rgba(255,255,255,0.15); border-radius: 12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:16pt; border: 1px solid rgba(255,255,255,0.2); }
          .hospital-text h1 { font-size:15pt; font-weight:900; color:#fff; text-transform:uppercase; line-height:1.15; letter-spacing: 0.5px; }
          .hospital-text .subtitle { font-size:8.5pt; text-transform:uppercase; letter-spacing:2px; color: rgba(255,255,255,0.8); font-weight:600; margin-top:2px; }
          
          .header-right { text-align:right; }
          .report-badge { background: rgba(255,255,255,0.15); color: #fff; font-size:12pt; font-weight:900; text-transform:uppercase; padding: 6px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); letter-spacing: 1.5px; display:inline-block; margin-bottom:6px; backdrop-filter: blur(4px); }
          .header-meta { font-size:8.5pt; color: rgba(255,255,255,0.75); font-weight: 500; }
          .header-meta strong { color: #fbbf24; font-weight: 700; }

          /* ─── Green accent line ─── */
          .accent-line { height: 3px; background: linear-gradient(to right, #fbbf24, #006838, #fbbf24); }

          /* ─── Patient Info Grid ─── */
          .info-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:0; border-bottom: 1px solid #e5e7eb; }
          .info-item { padding: 12px 16px; border-right: 1px solid #f0f0f0; }
          .info-item:last-child { border-right: none; }
          .info-item:nth-child(odd) { background: #fafbfc; }
          .label { font-size:7pt; color:#006838; text-transform:uppercase; font-weight:800; margin-bottom:3px; letter-spacing: 1px; }
          .value { font-size:10pt; font-weight:700; color:#1a1a1a; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
          
          /* ─── Test Title ─── */
          .test-header { text-align:center; padding: 18px 20px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(to bottom, #f8fdf9, #fff); }
          .test-name { font-size:14pt; font-weight:900; color: #006838; display:inline-block; padding-bottom:4px; border-bottom: 3px solid #006838; margin-bottom:5px; text-transform: uppercase; letter-spacing: 0.5px; }
          .test-category { font-size:8.5pt; font-weight:600; color:#666; margin-top: 5px; }
          .test-category span { background: #e8f5e9; color: #006838; padding: 2px 10px; border-radius: 20px; font-weight: 700; font-size: 8pt; display: inline-block; margin: 0 3px; }

          /* ─── Results ─── */
          .results-area { padding: 20px 30px; }
          .section-header { font-size:9pt; font-weight:800; text-transform:uppercase; color: #006838; border-bottom: 2px solid #006838; margin-bottom:12px; padding-bottom:4px; display:inline-block; min-width:150px; letter-spacing: 0.5px; }
          .result-section { margin-bottom:20px; }
          
          /* ─── Tables ─── */
          .report-table { width:100%; border-collapse:collapse; font-size:9pt; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
          .report-table thead { background: linear-gradient(135deg, #006838, #008545); }
          .report-table th { text-align:left; padding:8px 10px; text-transform:uppercase; font-size:7.5pt; color:#fff; font-weight:700; letter-spacing: 0.8px; border-bottom: none; }
          .report-table td { padding:7px 10px; border-bottom:1px solid #f0f0f0; vertical-align:top; font-size: 9pt; }
          .report-table tbody tr:last-child td { border-bottom:none; }
          .report-table tbody tr:nth-child(even) { background: #fafbfc; }
          .report-table tbody tr:hover { background: #f0fdf4; }
          .report-table.compact td { padding: 5px 8px; }
          
          .res-val { font-weight:700; color: #1a1a1a; }
          .unit { color:#666; font-size:8.5pt; }
          .row-abnormal { background: #fff5f5 !important; }
          .row-abnormal td { color:#dc2626; }
          .row-abnormal td:first-child { border-left: 3px solid #dc2626; }
          
          /* ─── Single Analyte Card ─── */
          .single-analyte-card { border: 2px solid #006838; padding:24px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-radius:12px; background: linear-gradient(135deg, #f0fdf4, #fff); }
          .sa-main { display:flex; align-items:baseline; gap:10px; }
          .sa-value { font-size:28pt; font-weight:900; color: #006838; }
          .sa-unit { font-size:12pt; font-weight:600; color:#666; }
          .sa-meta { text-align:right; font-size:9pt; color: #555; }
          .sa-flag { display:inline-block; background: #dc2626; color:#fff; padding:3px 12px; font-weight:800; font-size:9pt; border-radius:6px; margin-left:10px; letter-spacing: 0.5px; }

          /* ─── Microbiology ─── */
          .grid-3 { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
          .grid-2 { display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; }
          .culture-box { background: #f8fdf9; padding:12px 14px; border-left:4px solid #006838; margin-bottom:10px; border-radius: 0 8px 8px 0; }
          .culture-name { font-weight:800; color: #006838; font-size: 10pt; }
          .culture-meta { font-size:9pt; margin-top:4px; color: #555; }
          .abnormal-text { color:#dc2626; font-weight:bold; }
          .res-flag { font-weight:bold; color:#dc2626; }
          .summary-box { padding:16px; text-align:center; font-weight:900; font-size:12pt; border-radius: 10px; margin-bottom:15px; letter-spacing: 0.5px; }
          .abnormal-bg { background: linear-gradient(135deg, #fef2f2, #fee2e2); color:#dc2626; border: 2px solid #fca5a5; }
          .normal-bg { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color:#166534; border: 2px solid #86efac; }

          /* ─── Notes ─── */
          .notes-section { padding: 16px 30px 20px; border-top: 1px solid #e5e7eb; }
          .note-box { background: linear-gradient(135deg, #f9fafb, #f3f4f6); padding:14px 16px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom:12px; page-break-inside:avoid; }
          .note-title { font-size:7.5pt; font-weight:800; text-transform:uppercase; margin-bottom:6px; color:#006838; letter-spacing: 1px; }
          .note-content { font-size:9.5pt; line-height: 1.6; color: #374151; }

          /* ─── Signatures ─── */
          .signatures-section { padding: 0 30px 20px; }
          .signatures { display:grid; grid-template-columns: 1fr 1fr; gap:60px; page-break-inside:avoid; }
          .sig-block { text-align:center; }
          .sig-line-decoration { height: 40px; border-bottom: 2px solid #006838; margin-bottom: 8px; position: relative; }
          .sig-name { font-weight:800; font-size:10.5pt; color: #1a1a1a; }
          .sig-title { font-size:8.5pt; text-transform:uppercase; color:#006838; font-weight: 700; letter-spacing: 0.5px; margin-top: 2px; }
          .sig-date { font-size:8pt; color:#888; margin-top:3px; }

          /* ─── Footer ─── */
          .footer { background: linear-gradient(135deg, #006838, #008545); padding: 10px 30px; display:flex; justify-content:space-between; align-items:center; color: rgba(255,255,255,0.8); font-size:7.5pt; font-weight: 500; }
          .footer strong { color: #fbbf24; }

          /* ─── Status & Badge Pills ─── */
          .status-bar { display:flex; align-items:center; justify-content:space-between; padding:8px 30px; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
          .status-pill { display:inline-block; padding:3px 12px; border-radius:20px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
          .status-completed { background:#dcfce7; color:#166534; }
          .status-progress { background:#dbeafe; color:#1e40af; }
          .status-pending { background:#fef3c7; color:#92400e; }
          .status-cancelled { background:#fee2e2; color:#991b1b; }
          .priority-emergency { background:#fee2e2; color:#991b1b; }
          .priority-urgent { background:#ffedd5; color:#9a3412; }
          .priority-routine { background:#f3f4f6; color:#374151; }
          .workflow-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:7pt; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
          
          /* ─── Extended Info Grid ─── */
          .info-grid-extended { display:grid; grid-template-columns: repeat(3, 1fr); gap:0; border-bottom: 1px solid #e5e7eb; }
          .info-grid-extended .info-item { padding: 10px 16px; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; }
          .info-grid-extended .info-item:nth-child(3n) { border-right: none; }

          /* ─── Clinical & Timeline ─── */
          .clinical-section { padding: 12px 30px; border-bottom: 1px solid #e5e7eb; background: #fffbeb; }
          .timeline-section { padding: 12px 30px; border-bottom: 1px solid #e5e7eb; background: #fafbfc; }
          .timeline-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
          .timeline-item { padding:8px 12px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; }
          .timeline-item .tl-label { font-size:7pt; color:#006838; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:2px; }
          .timeline-item .tl-value { font-size:9pt; font-weight:600; color:#1a1a1a; }
          .diagnosis-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:4px; }
          .dx-tag { display:inline-block; background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:12px; font-size:7.5pt; font-weight:700; border:1px solid #fde68a; }
        </style>
      </head>
      <body>
        <div class="action-bar">
          <span class="brand">NDC MEDICAL CENTRE — LAB REPORT</span>
          <button onclick="window.print()" class="btn btn-print">⎙ PRINT REPORT</button>
          <button onclick="window.close()" class="btn">✕ CLOSE</button>
        </div>

        <div class="page">
          <!-- Header with NDC Branding -->
          <div class="header">
            <div class="header-left">
              <div class="${ndcLogoBase64 ? 'logo' : 'logo-fallback'}">
                ${ndcLogoBase64 ? `<img src="${ndcLogoBase64}" alt="NDC" />` : 'NDC'}
              </div>
              <div class="hospital-text">
                <h1>NDC Medical Centre</h1>
                <div class="subtitle">Department of Laboratory Medicine</div>
              </div>
            </div>
            <div class="header-right">
              <div class="report-badge">Laboratory Report</div>
              <div class="header-meta">
                <div>REF: <strong>${request.request_id.slice(0, 8).toUpperCase()}</strong></div>
                <div>Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
          <div class="accent-line"></div>

          <!-- Status Bar -->
          <div class="status-bar">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="status-pill ${
                requestStatus === 'Completed'
                  ? 'status-completed'
                  : requestStatus === 'In Progress' ||
                      requestStatus === 'Sample Collected'
                    ? 'status-progress'
                    : requestStatus === 'Cancelled'
                      ? 'status-cancelled'
                      : 'status-pending'
              }">${requestStatus}</span>
              <span class="status-pill ${
                requestPriority === 'Emergency'
                  ? 'priority-emergency'
                  : requestPriority === 'Urgent'
                    ? 'priority-urgent'
                    : 'priority-routine'
              }">Priority: ${requestPriority}</span>
              ${workflowStatus ? `<span class="workflow-pill" style="background:#e0e7ff;color:#3730a3;">${workflowStatus}</span>` : ''}
            </div>
            <div style="font-size:8pt;color:#666;">${request.test?.turnaround_time ? `TAT: ${request.test.turnaround_time}` : ''}</div>
          </div>

          <!-- Patient & Request Grid (Extended) -->
          <div class="info-grid-extended">
            <div class="info-item">
              <div class="label">Patient Name</div>
              <div class="value">${patientName}</div>
            </div>
            <div class="info-item">
              <div class="label">EMR Number</div>
              <div class="value">${request.patient?.emr_number || request.patient?.patient_id || '-'}</div>
            </div>
            <div class="info-item">
              <div class="label">Age / Sex</div>
              <div class="value">${patientAge} / ${request.patient?.gender || '-'}</div>
            </div>
            <div class="info-item">
              <div class="label">Ordering Physician</div>
              <div class="value">${physicianName}</div>
            </div>
            <div class="info-item">
              <div class="label">Test Code</div>
              <div class="value">${request.test?.test_code || '-'}</div>
            </div>
            <div class="info-item">
              <div class="label">Diagnoses / Indication</div>
              <div class="value" style="white-space:normal;" title="${allDiagnoses}">${allDiagnoses}</div>
            </div>
          </div>

          ${
            request.clinical_notes
              ? `
          <!-- Clinical Notes -->
          <div class="clinical-section">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <div class="label" style="margin-bottom:0;white-space:nowrap;padding-top:2px;">Clinical Notes</div>
              <div style="font-size:9pt;color:#92400e;line-height:1.5;">${request.clinical_notes}</div>
            </div>
          </div>
          `
              : ''
          }

          <!-- Timeline -->
          <div class="timeline-section">
            <div class="timeline-grid">
              <div class="timeline-item">
                <div class="tl-label">Requested</div>
                <div class="tl-value">${request.request_date || request.created_at ? formatDate(request.request_date || request.created_at) : 'N/A'}</div>
              </div>
              <div class="timeline-item">
                <div class="tl-label">Sample Collected</div>
                <div class="tl-value">${request.sample_collected_at ? formatDate(request.sample_collected_at) : 'N/A'}</div>
              </div>
              <div class="timeline-item">
                <div class="tl-label">Processed</div>
                <div class="tl-value">${request.processed_at ? formatDate(request.processed_at) : 'N/A'}</div>
              </div>
              <div class="timeline-item">
                <div class="tl-label">Lab Technician</div>
                <div class="tl-value">${request.technician ? `${request.technician.first_name} ${request.technician.last_name}` : labResult?.uploader ? `${labResult.uploader.first_name} ${labResult.uploader.last_name}` : (request as any).processed_by_name || 'N/A'}</div>
              </div>
            </div>
          </div>

          <!-- Test Title -->
          <div class="test-header">
            <div class="test-name">${request.test?.test_name || 'Laboratory Test'}</div>
            <div class="test-category"><span>${request.test?.category || 'General'}</span> • <span>Sample: ${request.test?.sample_type || (request as any).sample_type || 'N/A'}</span>${request.test?.test_code ? ` • <span>Code: ${request.test.test_code}</span>` : ''}</div>
          </div>

          <!-- Main Results -->
          <div class="results-area">
            <div class="result-section">
              ${
                componentsHtml ||
                `
                  <!-- Single Result Card Fallback -->
                  <div class="single-analyte-card">
                    <div class="sa-main">
                      <div class="sa-value">${labResult?.result || request.result || 'Pending'}</div>
                      <div class="sa-unit">${labResult?.result_unit || ''}</div>
                       ${labResult?.result_status && labResult.result_status !== 'Normal' ? `<div class="sa-flag">${labResult.result_status}</div>` : ''}
                    </div>
                    <div class="sa-meta">
                       ${labResult?.reference_range || request.test?.normal_range ? `<div><strong>Ref Range:</strong> ${labResult?.reference_range || request.test?.normal_range}</div>` : ''}
                    </div>
                  </div>
              `
              }
            </div>
          </div>

          <!-- Interpretation & Notes -->
          <div class="notes-section">
            ${
              labResult?.interpretation
                ? `
              <div class="note-box">
                <div class="note-title">Pathologist Interpretation</div>
                <div class="note-content">${labResult.interpretation}</div>
              </div>
            `
                : ''
            }

            ${
              labResult?.remarks || request.result_notes
                ? `
              <div class="note-box">
                <div class="note-title">Scientist Remarks</div>
                <div class="note-content">${labResult?.remarks || request.result_notes}</div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Signatures -->
          <div class="signatures-section">
            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line-decoration"></div>
                <div class="sig-name">${labResult?.uploader ? `${labResult.uploader.first_name} ${labResult.uploader.last_name}` : '______________________'}</div>
                <div class="sig-title">Laboratory Scientist</div>
                <div class="sig-date">${labResult?.upload_date ? formatDate(labResult.upload_date) : ''}</div>
              </div>
              <div class="sig-block">
                <div class="sig-line-decoration"></div>
                <div class="sig-name">${labResult?.verifier ? `${labResult.verifier.first_name} ${labResult.verifier.last_name}` : '______________________'}</div>
                <div class="sig-title">Verified By / Pathologist</div>
                <div class="sig-date">${labResult?.verified_at ? formatDate(labResult.verified_at) : ''}</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div>Printed: ${new Date().toLocaleString()} | User: ${labResult?.verifier?.last_name || 'System'}</div>
            <div><strong>NDC Medical Centre</strong> — Laboratory Information System • Page 1 of 1</div>
          </div>
        </div>

        <script>
          function downloadReport() {
            var content = document.documentElement.outerHTML;
            var blob = new Blob([content], {type: 'text/html'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'LabReport_${request.request_id}.html';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }
        </script>
      </body>
      </html>
    `;

    // Open in system default browser
    if (window.electron?.html?.saveAndOpen) {
      const filename = `Lab_Report_${request.request_id.slice(0, 8)}_${Date.now()}.html`;
      window.electron.html.saveAndOpen(filename, reportContent);
    } else {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.write(reportContent);
        printWindow.document.close();
        printWindow.focus();
      }
    }
  };

  const labResult = request.lab_result;
  const paymentStatus = getPaymentStatusFromBillingOrder(
    paymentInfo?.payment_status,
  );
  const outstandingAmount = paymentInfo?.balance_amount ?? 0;
  const paidAmount = paymentInfo?.paid_amount ?? 0;
  const baseAmount =
    paymentInfo?.patient_payable ?? paymentInfo?.amount_due ?? 0;

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
                    Medical Centre - Laboratory Request
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
                      title="Previous Request"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="w-[1px] h-5 bg-white/20 self-center" />
                    <button
                      onClick={onNext}
                      disabled={!hasNext}
                      className="p-2 hover:bg-white/10 rounded-r-lg transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next Request"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <div className="text-right mr-4">
                  <p className="text-white text-sm font-medium">
                    REQ #{request.request_id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-green-100 text-xs">
                    {new Date(request.created_at).toLocaleDateString('en-NG', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
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
                  {(labResult || request.result) && (
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
            {activeTab === 'details' && (
              <div className="p-6 space-y-5">
                {/* Status Banner */}
                <div
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    request.status === 'Completed'
                      ? 'bg-green-50 border-green-200'
                      : request.status === 'In Progress'
                        ? 'bg-blue-50 border-blue-200'
                        : request.status === 'Sample Collected'
                          ? 'bg-cyan-50 border-cyan-200'
                          : request.status === 'Cancelled'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {request.status === 'Completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : request.status === 'In Progress' ||
                      request.status === 'Sample Collected' ? (
                      <TestTube className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-amber-600" />
                    )}
                    <div>
                      <StatusBadge
                        status={request.status}
                        variant={getStatusVariant(
                          request.status as LabRequestStatus,
                        )}
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Priority:{' '}
                        <span
                          className={`font-medium ${
                            request.priority === 'Emergency'
                              ? 'text-red-600'
                              : request.priority === 'Urgent'
                                ? 'text-orange-600'
                                : 'text-gray-700'
                          }`}
                        >
                          {request.priority}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient & Test Info */}
                <div className="grid grid-cols-2 gap-5">
                  {/* Patient Info Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Patient
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow">
                        {request.patient?.first_name?.charAt(0)}
                        {request.patient?.surname?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {request.patient
                            ? formatPatientName(request.patient)
                            : 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.patient?.gender} •{' '}
                          {request.patient?.date_of_birth
                            ? formatDetailedAge(request.patient.date_of_birth)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Test Info Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FlaskConical className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Laboratory Test
                      </h3>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {request.test?.category && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLabCategoryColor(
                              request.test.category as LabCategory,
                            )}`}
                          >
                            {request.test.category}
                          </span>
                        )}
                        {request.test?.sample_type && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getSampleTypeColor(
                              request.test.sample_type as SampleType,
                            )}`}
                          >
                            <Droplets className="h-3 w-3 inline mr-1" />
                            {request.test.sample_type}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">
                        {request.test?.test_name || request.test?.test_name}
                      </p>
                      {request.test?.test_code && (
                        <p className="text-xs text-gray-500">
                          Code: {request.test.test_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing & Payment */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Billing & Payment
                    </h3>
                  </div>

                  {paymentInfo ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <PaymentStatusBadge status={paymentStatus} />
                        {paymentInfo.order_number && (
                          <span className="text-xs font-mono text-gray-500">
                            {paymentInfo.order_number}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {outstandingAmount > 0 ? 'Outstanding' : 'Amount'}
                          </p>
                          <p
                            className={`text-base font-semibold ${outstandingAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}
                          >
                            {formatCurrency(
                              outstandingAmount > 0
                                ? outstandingAmount
                                : baseAmount,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Paid
                          </p>
                          <p className="text-base font-semibold text-green-700">
                            {paidAmount > 0 ? formatCurrency(paidAmount) : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Payment Category:</span>
                        <span className="font-medium text-gray-700">
                          {paymentInfo.visit_payment_category || '—'}
                        </span>
                      </div>

                      {paymentInfo.receipt_number && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Receipt className="h-4 w-4 text-gray-400" />
                          <span>Receipt #{paymentInfo.receipt_number}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No billing order linked to this request yet.
                    </p>
                  )}
                </div>

                {/* Ordering Physician */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
                        Ordered By
                      </p>
                      <p className="font-semibold text-gray-900">
                        Dr. {request.doctor?.first_name}{' '}
                        {request.doctor?.last_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clinical Context */}
                {(request.diagnosis?.length || request.clinical_notes) && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">
                          Clinical Context
                        </p>
                        <p className="text-xs text-gray-500">
                          Why this test was ordered
                        </p>
                      </div>
                    </div>

                    {request.diagnosis && request.diagnosis.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 font-medium mb-2">
                          Diagnosis / Indication:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {request.diagnosis.map((dx, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"
                            >
                              {dx}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.clinical_notes && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Clinical Notes:
                        </p>
                        <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-2 border border-orange-100">
                          {request.clinical_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className="p-2.5 bg-amber-100 rounded-xl">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Timeline
                      </h3>
                      <p className="text-xs text-gray-500">
                        Request workflow history
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Requested
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(request.request_date || request.created_at)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Sample Collected
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(request.sample_collected_at)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Processed
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(request.processed_at)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Technician
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {request.technician
                          ? `${request.technician.first_name} ${request.technician.last_name}`
                          : labResult?.uploader
                            ? `${labResult.uploader.first_name} ${labResult.uploader.last_name}`
                            : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Report Tab */}
            {activeTab === 'report' && (
              <div className="p-6 space-y-5">
                {/* Results Section - HOSPITAL GRADE REPORT LAYOUT */}
                {labResult || request.result ? (
                  <div className="bg-white rounded-sm border border-gray-200 shadow-sm print:shadow-none min-h-[600px] flex flex-col">
                    {/* Report Header - Internal View */}
                    <div className="p-8 border-b-2 border-primary-700">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center border-2 border-primary-700 shadow-md overflow-hidden p-1.5">
                            <NDCLogo />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
                              NDC Medical Centre
                            </h2>
                            <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">
                              Department of Laboratory Medicine
                            </p>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">
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
                                labResult?.workflow_status === 'approved' ||
                                labResult?.workflow_status === 'released'
                                  ? 'text-green-700'
                                  : 'text-amber-600'
                              }`}
                            >
                              {labResult?.workflow_status || 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Report Reference
                          </p>
                          <p className="text-lg font-mono font-bold text-gray-900">
                            {request.request_id.slice(0, 12).toUpperCase()}
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
                            {request.patient?.emr_number ||
                              request.patient?.patient_id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Gender / Age
                          </p>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {request.patient?.gender || 'N/A'} / {patientAge}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Physician
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            Dr. {request.doctor?.first_name}{' '}
                            {request.doctor?.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Test Ordered
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {request.test?.test_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Category
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {request.test?.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Sample Collected
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {request.sample_collected_at
                              ? formatDate(request.sample_collected_at)
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                            Reported
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {labResult?.verified_at
                              ? formatDate(labResult.verified_at)
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

                      {labResult?.structured_result ? (
                        <div className="animate-fade-in">
                          {renderStructuredResult(
                            labResult.structured_result as Record<
                              string,
                              unknown
                            >,
                            labResult.result_template_type,
                          )}
                        </div>
                      ) : (
                        /* Fallback for unstructured */
                        <div className="p-6 bg-gray-50 border border-gray-200 rounded min-h-[100px] flex items-center justify-center">
                          <p className="text-xl font-mono text-gray-800 font-bold">
                            {labResult?.result ||
                              (typeof request.result === 'string'
                                ? request.result
                                : 'Result data not formatted')}
                          </p>
                          {labResult?.result_unit && (
                            <span className="ml-2 text-gray-500">
                              {labResult.result_unit}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Reference Range (if basic result) */}
                      {!labResult?.structured_result &&
                        (labResult?.reference_range ||
                          request.test?.normal_range) && (
                          <div className="mt-4 p-3 bg-gray-50 border-l-4 border-gray-400 text-sm">
                            <span className="font-bold text-gray-600 mr-2">
                              Reference Range:
                            </span>
                            <span className="font-mono">
                              {labResult?.reference_range ||
                                request.test?.normal_range}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Footer / Interpretation Area */}
                    <div className="bg-gray-50 p-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Pathologist Comments */}
                        <div className="space-y-4">
                          {labResult?.interpretation && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Pathologist Interpretation
                              </h4>
                              <p className="text-sm text-gray-800 italic bg-white p-3 border border-gray-200 rounded">
                                {labResult.interpretation}
                              </p>
                            </div>
                          )}
                          {(labResult?.remarks || request.result_notes) && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Scientist Remarks
                              </h4>
                              <p className="text-sm text-gray-800 bg-white p-3 border border-gray-200 rounded">
                                {labResult?.remarks || request.result_notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Signatures */}
                        <div className="flex flex-col justify-end">
                          <div className="grid grid-cols-2 gap-8">
                            {labResult?.uploader && (
                              <div className="text-center">
                                <div className="h-10 border-b border-gray-400 mb-2" />
                                <p className="text-sm font-bold text-gray-900">
                                  {labResult.uploader.first_name}{' '}
                                  {labResult.uploader.last_name}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">
                                  Medical Lab Scientist
                                </p>
                              </div>
                            )}
                            {labResult?.verifier && (
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
                                  {labResult.verifier.first_name}{' '}
                                  {labResult.verifier.last_name}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">
                                  Verified By
                                </p>
                              </div>
                            )}
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
                      <Beaker className="h-10 w-10 text-gray-300" />
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
                <span>
                  Turnaround: {request.test?.turnaround_time || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Print Button - Show when results are available */}
                {(request.status === 'Completed' ||
                  labResult ||
                  request.result) && (
                  <button
                    onClick={handlePrintLabReport}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </button>
                )}
                {request.status === 'Pending' && onCollectSample && (
                  <Button
                    variant="secondary"
                    onClick={() => onCollectSample(request)}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Collect Sample
                  </Button>
                )}
                {(request.status === 'Sample Collected' ||
                  request.status === 'In Progress') &&
                  onEnterResult && (
                    <button
                      onClick={() => onEnterResult(request)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-800 hover:to-[#007538] text-white font-semibold rounded-lg shadow-md transition-all"
                    >
                      <Beaker className="h-4 w-4 mr-2" />
                      Enter Result
                    </button>
                  )}
                <Button variant="secondary" onClick={onClose}>
                  Back to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
