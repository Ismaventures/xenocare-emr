/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER EXPORT UTILITIES
 * Description: Functions for exporting encounter data to CSV/Excel
 * =============================================================================
 */

import { Encounter } from '../dtos/encounter.dto';
import { AdvancedEncounterFilters } from '../components/EncounterFilterPanel';

// =============================================================================
// Types
// =============================================================================

export interface ExportOptions {
  format: 'csv' | 'excel';
  filename?: string;
  includePatientDetails: boolean;
  includeDiagnosis: boolean;
  includeVitals: boolean;
  dateRange?: { from: string; to: string };
}

export interface EncounterExportData {
  encounter_number: string;
  patient_name: string;
  emr_number: string;
  patient_category: string;
  insurance_type: string;
  visit_type: string;
  status: string;
  priority: string;
  department: string;
  attending_doctor: string;
  encounter_date: string;
  chief_complaint: string;
  payment_category: string;
  gender: string;
  age: string;
  phone: string;
  created_at: string;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Format encounter data for export
 */
export function formatEncounterForExport(
  encounter: Encounter,
): EncounterExportData {
  const encounterDate = encounter.encounter_date
    ? new Date(encounter.encounter_date)
    : encounter.created_at
      ? new Date(encounter.created_at)
      : null;

  // Build doctor name from parts
  const doctorName = encounter.attending_doctor
    ? `${encounter.attending_doctor.rank ? `${encounter.attending_doctor.rank} ` : ''}${encounter.attending_doctor.first_name} ${encounter.attending_doctor.last_name}`.trim()
    : '';

  return {
    encounter_number:
      encounter.encounter_number ||
      encounter.visit_id ||
      encounter.id?.slice(0, 8) ||
      '',
    patient_name: encounter.patient
      ? `${encounter.patient.first_name} ${encounter.patient.surname || encounter.patient.last_name || ''}`.trim()
      : 'N/A',
    emr_number: encounter.patient?.emr_number || encounter.emr_number || '',
    patient_category: '', // Not available in current schema
    insurance_type: '', // Not available in current schema
    visit_type: encounter.visit_type || '',
    status: encounter.status || '',
    priority: encounter.priority || 'Normal',
    department: encounter.clinic?.clinic_name || 'GOPD',
    attending_doctor: doctorName,
    encounter_date: encounterDate ? encounterDate.toLocaleDateString() : '',
    chief_complaint: encounter.chief_complaint || '',
    payment_category: encounter.payment_category || '',
    gender: encounter.patient?.gender || '',
    age: calculateAge(encounter.patient?.date_of_birth),
    phone: encounter.patient?.contact_phone || encounter.patient?.phone || '',
    created_at: encounter.created_at
      ? new Date(encounter.created_at).toLocaleString()
      : '',
  };
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${days}d`;
  }
  if (years === 0) {
    const parts = [`${months}m`];
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  }
  const parts = [`${years}y`];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(' ');
}

/**
 * Convert encounters to CSV format
 */
export function encountersToCSV(
  encounters: Encounter[],
  options?: Partial<ExportOptions>,
): string {
  const exportData = encounters.map(formatEncounterForExport);

  // Define headers based on options
  const headers = [
    'Encounter #',
    'Patient Name',
    'EMR Number',
    'Visit Type',
    'Status',
    'Priority',
    'Department',
    'Attending Doctor',
    'Encounter Date',
    'Chief Complaint',
    'Payment Category',
    'Gender',
    'Age',
    'Phone',
    'Created At',
  ];

  // Build CSV content
  const csvRows = [headers.join(',')];

  exportData.forEach((row) => {
    const values = [
      escapeCSV(row.encounter_number),
      escapeCSV(row.patient_name),
      escapeCSV(row.emr_number),
      escapeCSV(row.visit_type),
      escapeCSV(row.status),
      escapeCSV(row.priority),
      escapeCSV(row.department),
      escapeCSV(row.attending_doctor),
      escapeCSV(row.encounter_date),
      escapeCSV(row.chief_complaint),
      escapeCSV(row.payment_category),
      escapeCSV(row.gender),
      escapeCSV(row.age),
      escapeCSV(row.phone),
      escapeCSV(row.created_at),
    ];

    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export encounters with applied filters
 */
export function exportEncounters(
  encounters: Encounter[],
  filters: AdvancedEncounterFilters,
  options: ExportOptions = {
    format: 'csv',
    includePatientDetails: true,
    includeDiagnosis: true,
    includeVitals: false,
  },
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = options.filename || `ndc_encounters_${timestamp}.csv`;

  if (options.format === 'csv') {
    const csvContent = encountersToCSV(encounters, options);
    downloadCSV(csvContent, filename);
  }
}

// =============================================================================
// Statistics Calculation
// =============================================================================

export interface EncounterStatsSummary {
  total: number;
  byStatus: Record<string, number>;
  byVisitType: Record<string, number>;
  byDepartment: Record<string, number>;
  byDoctor: Record<string, number>;
  byPatientCategory: Record<string, number>;
  byInsuranceType: Record<string, number>;
  byGender: Record<string, number>;
  byPriority: Record<string, number>;
  averageAge: number;
  dateRange: { earliest: string; latest: string };
}

/**
 * Calculate comprehensive statistics from encounters
 */
export function calculateEncounterStats(
  encounters: Encounter[],
): EncounterStatsSummary {
  const stats: EncounterStatsSummary = {
    total: encounters.length,
    byStatus: {},
    byVisitType: {},
    byDepartment: {},
    byDoctor: {},
    byPatientCategory: {},
    byInsuranceType: {},
    byGender: {},
    byPriority: {},
    averageAge: 0,
    dateRange: { earliest: '', latest: '' },
  };

  let totalAge = 0;
  let ageCount = 0;
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  encounters.forEach((encounter) => {
    // Status
    const status = encounter.status || 'Unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Visit Type
    const visitType = encounter.visit_type || 'Unknown';
    stats.byVisitType[visitType] = (stats.byVisitType[visitType] || 0) + 1;

    // Department
    const dept = encounter.clinic?.clinic_name || 'GOPD';
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;

    // Doctor
    const doctorName = encounter.attending_doctor
      ? `${encounter.attending_doctor.rank ? `${encounter.attending_doctor.rank} ` : ''}${encounter.attending_doctor.first_name} ${encounter.attending_doctor.last_name}`.trim()
      : 'Unassigned';
    stats.byDoctor[doctorName] = (stats.byDoctor[doctorName] || 0) + 1;

    // Payment Category (using as proxy for patient category in this context)
    const paymentCategory = encounter.payment_category || 'Unknown';
    stats.byPatientCategory[paymentCategory] =
      (stats.byPatientCategory[paymentCategory] || 0) + 1;

    // Insurance Type - use payment category as well
    stats.byInsuranceType[paymentCategory] =
      (stats.byInsuranceType[paymentCategory] || 0) + 1;

    // Gender
    const gender = encounter.patient?.gender || 'Unknown';
    stats.byGender[gender] = (stats.byGender[gender] || 0) + 1;

    // Priority
    const priority = encounter.priority || 'Normal';
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

    // Age calculation
    if (encounter.patient?.date_of_birth) {
      const age = parseInt(calculateAge(encounter.patient.date_of_birth));
      if (!isNaN(age)) {
        totalAge += age;
        ageCount++;
      }
    }

    // Date range
    const dateToCheck = encounter.encounter_date || encounter.created_at;
    if (dateToCheck) {
      const encounterDate = new Date(dateToCheck);
      if (!earliestDate || encounterDate < earliestDate)
        earliestDate = encounterDate;
      if (!latestDate || encounterDate > latestDate) latestDate = encounterDate;
    }
  });

  stats.averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
  stats.dateRange = {
    earliest:
      earliestDate !== null ? (earliestDate as Date).toLocaleDateString() : '',
    latest:
      latestDate !== null ? (latestDate as Date).toLocaleDateString() : '',
  };

  return stats;
}
