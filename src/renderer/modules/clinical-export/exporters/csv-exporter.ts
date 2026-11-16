/**
 * Clinical Export System - CSV Exporter
 * NDC MEDICAL CENTRE EMR
 *
 * Flat CSV export for data analysis and spreadsheet import
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { PatientJourneyExport, MultiPatientExport } from '../api';
import type { CSVExportOptions, ExportModule } from '../types';
import { getICD10ChapterTitle } from '../standards';

// ==================== HELPER FUNCTIONS ====================

/**
 * Escape CSV value
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format date for CSV
 */
function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime for CSV
 */
function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch {
    return dateStr;
  }
}

/**
 * Convert array of arrays to CSV string
 */
function arrayToCSV(
  headers: string[],
  data: (string | number | null | undefined)[][],
  delimiter: string = ',',
): string {
  const headerRow = headers.map((h) => escapeCSV(h)).join(delimiter);
  const dataRows = data.map((row) =>
    row.map((cell) => escapeCSV(cell)).join(delimiter),
  );
  return [headerRow, ...dataRows].join('\n');
}

// ==================== CSV GENERATOR CLASS ====================

/**
 * Clinical CSV Exporter class
 */
export class ClinicalCSVExporter {
  private options: CSVExportOptions;

  constructor(options: CSVExportOptions) {
    this.options = options;
  }

  /**
   * Generate demographics CSV
   */
  public generateDemographicsCSV(data: PatientJourneyExport): string {
    const { patient } = data;

    const headers = [
      'EMR Number',
      'First Name',
      'Middle Name',
      'Surname',
      'Date of Birth',
      'Age',
      'Gender',
      'Blood Group',
      'Genotype',
      'Marital Status',
      'Occupation',
      'Nationality',
      'State of Origin',
      'LGA',
      'Address',
      'City',
      'State',
      'Contact Phone',
      'Contact Email',
      'Patient Category',
      'NHIS Number',
      'HMO Name',
      'Company Name',
      'Staff ID',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Emergency Contact Relationship',
    ];

    const row = [
      patient.emr_number,
      patient.first_name,
      patient.middle_name || '',
      patient.surname,
      formatDate(patient.date_of_birth),
      patient.age,
      patient.gender,
      patient.blood_group || '',
      patient.genotype || '',
      patient.marital_status || '',
      patient.occupation || '',
      patient.nationality || '',
      patient.state_of_origin || '',
      patient.lga || '',
      patient.address || '',
      patient.city || '',
      patient.state || '',
      patient.contact_phone || '',
      patient.contact_email || '',
      patient.patient_category,
      patient.nhis_number || '',
      patient.hmo_name || '',
      patient.company_name || '',
      patient.staff_id || '',
      patient.emergency_contact?.name || '',
      patient.emergency_contact?.phone || '',
      patient.emergency_contact?.relationship || '',
    ];

    return arrayToCSV(headers, [row], this.options.delimiter);
  }

  /**
   * Generate encounters CSV
   */
  public generateEncountersCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Encounter Date',
      'Type',
      'Status',
      'Department',
      'Clinic',
      'Attending Doctor',
      'Chief Complaint',
      'Present Illness',
      'Facility',
      'Created At',
      'Updated At',
    ];

    const rows = data.encounters.map((enc) => [
      data.patient.emr_number,
      enc.encounter_number || '',
      formatDate(enc.encounter_date),
      enc.encounter_type,
      enc.status,
      enc.department_name || '',
      enc.clinic_name || '',
      enc.attending_doctor_name || '',
      enc.chief_complaint || '',
      enc.history_present_illness || '',
      enc.facility_name || '',
      formatDateTime(enc.created_at),
      formatDateTime(enc.updated_at),
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate diagnoses CSV
   */
  public generateDiagnosesCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Diagnosed At',
      'ICD-10 Code',
      'ICD-10 Category',
      'Diagnosis Text',
      'Type',
      'Certainty',
      'Notes',
      'Diagnosed By',
      'Created At',
    ];

    const rows = data.diagnoses.map((dx) => [
      data.patient.emr_number,
      dx.encounter_number || '',
      formatDateTime(dx.diagnosed_at),
      dx.icd10_code || '',
      getICD10ChapterTitle(dx.icd10_code) || '',
      dx.diagnosis_text,
      dx.diagnosis_type,
      dx.certainty || '',
      dx.notes || '',
      dx.diagnosed_by_name || '',
      formatDateTime(dx.created_at),
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate vitals CSV
   */
  public generateVitalsCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Recorded At',
      'Temperature',
      'LOINC Temp',
      'BP Systolic',
      'BP Diastolic',
      'LOINC BP',
      'Pulse Rate',
      'LOINC Pulse',
      'Respiratory Rate',
      'LOINC RR',
      'Oxygen Saturation',
      'LOINC SpO2',
      'Weight',
      'LOINC Weight',
      'Height',
      'LOINC Height',
      'BMI',
      'Pain Score',
      'Blood Glucose',
      'Notes',
      'Recorded By',
    ];

    const rows = data.vitals.map((v) => [
      data.patient.emr_number,
      v.encounter_number || '',
      formatDateTime(v.recorded_at),
      v.temperature ?? '',
      '8310-5',
      v.blood_pressure_systolic ?? '',
      v.blood_pressure_diastolic ?? '',
      '85354-9',
      v.pulse_rate ?? '',
      '8867-4',
      v.respiratory_rate ?? '',
      '9279-1',
      v.oxygen_saturation ?? '',
      '2708-6',
      v.weight ?? '',
      '29463-7',
      v.height ?? '',
      '8302-2',
      v.bmi ?? '',
      v.pain_score ?? '',
      v.blood_glucose ?? '',
      v.notes || '',
      v.recorded_by_name || '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate prescriptions CSV
   */
  public generatePrescriptionsCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Prescribed At',
      'Drug Name',
      'Generic Name',
      'ATC Code',
      'Dosage',
      'Route',
      'Frequency',
      'Duration',
      'Qty Prescribed',
      'Qty Dispensed',
      'Status',
      'Instructions',
      'Prescribed By',
      'Dispensed By',
      'Dispensed At',
    ];

    const rows = data.prescriptions.map((rx) => [
      data.patient.emr_number,
      rx.encounter_number || '',
      formatDateTime(rx.prescribed_at),
      rx.drug_name,
      rx.generic_name || '',
      rx.atc_code || '',
      rx.dosage || '',
      rx.route,
      rx.frequency,
      rx.duration || '',
      rx.quantity_prescribed,
      rx.quantity_dispensed ?? '',
      rx.status,
      rx.instructions || '',
      rx.prescribed_by_name || '',
      rx.dispensed_by_name || '',
      rx.dispensed_at ? formatDateTime(rx.dispensed_at) : '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate lab requests CSV
   */
  public generateLabRequestsCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Ordered At',
      'Test Name',
      'LOINC Code',
      'Category',
      'Priority',
      'Status',
      'Clinical Notes',
      'Ordered By',
      'Collected At',
      'Processed At',
    ];

    const rows = data.labRequests.map((lab) => [
      data.patient.emr_number,
      lab.encounter_number || '',
      formatDateTime(lab.ordered_at),
      lab.test_name,
      lab.loinc_code || '',
      lab.test_category || '',
      lab.priority,
      lab.status,
      lab.clinical_notes || '',
      lab.ordered_by_name || '',
      lab.collected_at ? formatDateTime(lab.collected_at) : '',
      lab.processed_at ? formatDateTime(lab.processed_at) : '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate lab results CSV
   */
  public generateLabResultsCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Test Name',
      'LOINC Code',
      'Result Value',
      'Unit',
      'Reference Range Low',
      'Reference Range High',
      'Reference Range Text',
      'Abnormal Flag',
      'Interpretation',
      'Verified By',
      'Verified At',
    ];

    const rows = data.labResults.map((result) => [
      data.patient.emr_number,
      result.test_name,
      result.loinc_code || '',
      result.result_value,
      result.unit || '',
      result.reference_range_low ?? '',
      result.reference_range_high ?? '',
      result.reference_range_text || '',
      result.abnormal_flag || 'N',
      result.interpretation || '',
      result.verified_by_name || '',
      result.verified_at ? formatDateTime(result.verified_at) : '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate radiology CSV
   */
  public generateRadiologyCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Ordered At',
      'Imaging Type',
      'Examination',
      'Body Part',
      'Laterality',
      'Priority',
      'Status',
      'Clinical Indication',
      'Ordered By',
      'Performed At',
    ];

    const rows = data.radiologyRequests.map((rad) => [
      data.patient.emr_number,
      rad.encounter_number || '',
      formatDateTime(rad.ordered_at),
      rad.imaging_type,
      rad.examination_name,
      rad.body_part,
      rad.laterality || '',
      rad.priority,
      rad.status,
      rad.clinical_indication || '',
      rad.ordered_by_name || '',
      rad.performed_at ? formatDateTime(rad.performed_at) : '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate procedures CSV
   */
  public generateProceduresCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Performed At',
      'Procedure Name',
      'Type',
      'CPT Code',
      'ICD-10-PCS Code',
      'Status',
      'Outcome',
      'Complications',
      'Duration (min)',
      'Anesthesia Type',
      'Notes',
      'Performed By',
      'Assistant',
    ];

    const rows = data.procedures.map((proc) => [
      data.patient.emr_number,
      proc.encounter_number || '',
      formatDateTime(proc.performed_at),
      proc.procedure_name,
      proc.procedure_type,
      proc.cpt_code || '',
      proc.icd10_pcs_code || '',
      proc.status,
      proc.outcome || '',
      proc.complications || '',
      proc.duration_minutes ?? '',
      proc.anesthesia_type || '',
      proc.notes || '',
      proc.performed_by_name || '',
      proc.assistant_name || '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate admissions CSV
   */
  public generateAdmissionsCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Admission Number',
      'Admission Date',
      'Discharge Date',
      'Type',
      'Status',
      'Ward',
      'Bed',
      'LOS (days)',
      'Admission Diagnosis',
      'Discharge Diagnosis',
      'Outcome',
      'Discharge Disposition',
      'Attending Doctor',
      'Source',
    ];

    const rows = data.admissions.map((adm) => [
      data.patient.emr_number,
      adm.admission_number,
      formatDateTime(adm.admission_date),
      adm.discharge_date ? formatDateTime(adm.discharge_date) : '',
      adm.admission_type,
      adm.status,
      adm.ward_name || '',
      adm.bed_number || '',
      adm.length_of_stay ?? '',
      adm.admission_diagnosis || '',
      adm.discharge_diagnosis || '',
      adm.outcome || '',
      adm.discharge_disposition || '',
      adm.attending_doctor_name || '',
      adm.source || '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate billing CSV
   */
  public generateBillingCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Date',
      'Order Number',
      'Payment Category',
      'Sub Total',
      'Discount',
      'Tax',
      'Total Amount',
      'Amount Paid',
      'Balance',
      'Status',
      'Payment Method',
      'HMO Code',
      'Created By',
    ];

    const rows = data.billingRecords.map((bill) => [
      data.patient.emr_number,
      bill.encounter_number || '',
      formatDateTime(bill.created_at),
      bill.order_number,
      bill.payment_category,
      bill.sub_total ?? '',
      bill.discount ?? '',
      bill.tax ?? '',
      bill.total_amount ?? '',
      bill.amount_paid ?? '',
      bill.balance ?? '',
      bill.status,
      bill.payment_method || '',
      bill.hmo_code || '',
      bill.created_by_name || '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate nursing CSV
   */
  public generateNursingCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Encounter Number',
      'Date/Time',
      'Note Type',
      'Patient Condition',
      'Notes',
      'Assessment',
      'Nursing Diagnosis',
      'Interventions',
      'Pain Level',
      'Response to Treatment',
      'Nurse',
    ];

    const rows = data.nursingRecords.map((note) => [
      data.patient.emr_number,
      note.encounter_number || '',
      formatDateTime(note.created_at),
      note.note_type,
      note.patient_condition,
      note.notes || '',
      note.assessment || '',
      note.nursing_diagnosis || '',
      (note.interventions || []).join('; '),
      note.pain_level ?? '',
      note.response_to_treatment || '',
      note.nurse_name || '',
    ]);

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate combined/flattened CSV
   */
  public generateCombinedCSV(data: PatientJourneyExport): string {
    const headers = [
      'Patient EMR',
      'Patient Name',
      'Record Type',
      'Date',
      'Description',
      'Details',
      'Code',
      'Code System',
      'Status',
      'Provider',
    ];

    const rows: (string | number)[][] = [];
    const patientName = `${data.patient.first_name} ${data.patient.surname}`;

    // Add encounters
    for (const enc of data.encounters) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Encounter',
        formatDate(enc.encounter_date),
        enc.chief_complaint || enc.encounter_type,
        `${enc.department_name || ''} - ${enc.clinic_name || ''}`,
        enc.encounter_number || '',
        'Local',
        enc.status,
        enc.attending_doctor_name || '',
      ]);
    }

    // Add diagnoses
    for (const dx of data.diagnoses) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Diagnosis',
        formatDate(dx.diagnosed_at),
        dx.diagnosis_text,
        dx.diagnosis_type,
        dx.icd10_code || '',
        'ICD-10',
        dx.certainty || '',
        dx.diagnosed_by_name || '',
      ]);
    }

    // Add prescriptions
    for (const rx of data.prescriptions) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Prescription',
        formatDate(rx.prescribed_at),
        rx.drug_name,
        `${rx.dosage || ''} ${rx.route} ${rx.frequency}`,
        rx.atc_code || '',
        'ATC',
        rx.status,
        rx.prescribed_by_name || '',
      ]);
    }

    // Add lab requests
    for (const lab of data.labRequests) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Lab Request',
        formatDate(lab.ordered_at),
        lab.test_name,
        lab.test_category || '',
        lab.loinc_code || '',
        'LOINC',
        lab.status,
        lab.ordered_by_name || '',
      ]);
    }

    // Add radiology
    for (const rad of data.radiologyRequests) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Radiology',
        formatDate(rad.ordered_at),
        rad.examination_name,
        `${rad.imaging_type} - ${rad.body_part}`,
        '',
        'Local',
        rad.status,
        rad.ordered_by_name || '',
      ]);
    }

    // Add procedures
    for (const proc of data.procedures) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Procedure',
        formatDate(proc.performed_at),
        proc.procedure_name,
        proc.procedure_type,
        proc.cpt_code || proc.icd10_pcs_code || '',
        proc.cpt_code ? 'CPT' : 'ICD-10-PCS',
        proc.status || '',
        proc.performed_by_name || '',
      ]);
    }

    // Add admissions
    for (const adm of data.admissions) {
      rows.push([
        data.patient.emr_number,
        patientName,
        'Admission',
        formatDate(adm.admission_date),
        adm.admission_diagnosis || 'Admission',
        `Ward: ${adm.ward_name || ''}, LOS: ${adm.length_of_stay || ''}`,
        adm.admission_number,
        'Local',
        adm.status,
        adm.attending_doctor_name || '',
      ]);
    }

    // Sort by date
    rows.sort((a, b) => {
      const dateA = String(a[3]);
      const dateB = String(b[3]);
      return dateB.localeCompare(dateA);
    });

    return arrayToCSV(headers, rows, this.options.delimiter);
  }

  /**
   * Generate all CSVs as a zip (returns individual CSV strings)
   */
  public generateAllCSVs(data: PatientJourneyExport): Map<string, string> {
    const csvs = new Map<string, string>();
    const modules = data.exportMetadata.modulesCovered;

    if (modules.includes('demographics')) {
      csvs.set('demographics.csv', this.generateDemographicsCSV(data));
    }

    if (modules.includes('encounters') && data.encounters.length > 0) {
      csvs.set('encounters.csv', this.generateEncountersCSV(data));
    }

    if (modules.includes('diagnoses') && data.diagnoses.length > 0) {
      csvs.set('diagnoses.csv', this.generateDiagnosesCSV(data));
    }

    if (modules.includes('vitals') && data.vitals.length > 0) {
      csvs.set('vitals.csv', this.generateVitalsCSV(data));
    }

    if (modules.includes('prescriptions') && data.prescriptions.length > 0) {
      csvs.set('prescriptions.csv', this.generatePrescriptionsCSV(data));
    }

    if (modules.includes('laboratory') && data.labRequests.length > 0) {
      csvs.set('lab_requests.csv', this.generateLabRequestsCSV(data));
      if (data.labResults.length > 0) {
        csvs.set('lab_results.csv', this.generateLabResultsCSV(data));
      }
    }

    if (modules.includes('radiology') && data.radiologyRequests.length > 0) {
      csvs.set('radiology.csv', this.generateRadiologyCSV(data));
    }

    if (modules.includes('procedures') && data.procedures.length > 0) {
      csvs.set('procedures.csv', this.generateProceduresCSV(data));
    }

    if (modules.includes('admissions') && data.admissions.length > 0) {
      csvs.set('admissions.csv', this.generateAdmissionsCSV(data));
    }

    if (modules.includes('billing') && data.billingRecords.length > 0) {
      csvs.set('billing.csv', this.generateBillingCSV(data));
    }

    if (modules.includes('nursing') && data.nursingRecords.length > 0) {
      csvs.set('nursing.csv', this.generateNursingCSV(data));
    }

    // Always include combined view
    csvs.set('combined_records.csv', this.generateCombinedCSV(data));

    return csvs;
  }

  /**
   * Generate single combined CSV blob
   */
  public async generate(data: PatientJourneyExport): Promise<Blob> {
    const csv = this.generateCombinedCSV(data);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Generate and download single CSV
   */
  public async download(
    data: PatientJourneyExport,
    filename?: string,
  ): Promise<void> {
    const blob = await this.generate(data);

    const defaultFilename = `${data.patient.emr_number}_Clinical_Export_${data.exportMetadata.exportDate}.csv`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * Download specific module CSV
   */
  public async downloadModule(
    data: PatientJourneyExport,
    module:
      | 'demographics'
      | 'encounters'
      | 'diagnoses'
      | 'vitals'
      | 'prescriptions'
      | 'lab_requests'
      | 'lab_results'
      | 'radiology'
      | 'procedures'
      | 'admissions'
      | 'billing'
      | 'nursing'
      | 'combined',
  ): Promise<void> {
    let csv: string;

    switch (module) {
      case 'demographics':
        csv = this.generateDemographicsCSV(data);
        break;
      case 'encounters':
        csv = this.generateEncountersCSV(data);
        break;
      case 'diagnoses':
        csv = this.generateDiagnosesCSV(data);
        break;
      case 'vitals':
        csv = this.generateVitalsCSV(data);
        break;
      case 'prescriptions':
        csv = this.generatePrescriptionsCSV(data);
        break;
      case 'lab_requests':
        csv = this.generateLabRequestsCSV(data);
        break;
      case 'lab_results':
        csv = this.generateLabResultsCSV(data);
        break;
      case 'radiology':
        csv = this.generateRadiologyCSV(data);
        break;
      case 'procedures':
        csv = this.generateProceduresCSV(data);
        break;
      case 'admissions':
        csv = this.generateAdmissionsCSV(data);
        break;
      case 'billing':
        csv = this.generateBillingCSV(data);
        break;
      case 'nursing':
        csv = this.generateNursingCSV(data);
        break;
      case 'combined':
      default:
        csv = this.generateCombinedCSV(data);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `${data.patient.emr_number}_${module}_${data.exportMetadata.exportDate}.csv`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Generate clinical export CSV
 */
export async function generateClinicalExportCSV(
  data: PatientJourneyExport,
  options?: Partial<CSVExportOptions>,
): Promise<Blob> {
  const defaultOptions: CSVExportOptions = {
    delimiter: ',',
    includeHeaders: true,
    dateFormat: 'ISO',
    encoding: 'UTF-8',
    quoteStrings: true,
    nullValue: '',
  };

  const exporter = new ClinicalCSVExporter({ ...defaultOptions, ...options });
  return exporter.generate(data);
}

/**
 * Download clinical export CSV
 */
export async function downloadClinicalExportCSV(
  data: PatientJourneyExport,
  options?: Partial<CSVExportOptions>,
  filename?: string,
): Promise<void> {
  const defaultOptions: CSVExportOptions = {
    delimiter: ',',
    includeHeaders: true,
    dateFormat: 'ISO',
    encoding: 'UTF-8',
    quoteStrings: true,
    nullValue: '',
  };

  const exporter = new ClinicalCSVExporter({ ...defaultOptions, ...options });
  return exporter.download(data, filename);
}

/**
 * Generate all module CSVs
 */
export function generateAllModuleCSVs(
  data: PatientJourneyExport,
  options?: Partial<CSVExportOptions>,
): Map<string, string> {
  const defaultOptions: CSVExportOptions = {
    delimiter: ',',
    includeHeaders: true,
    dateFormat: 'ISO',
    encoding: 'UTF-8',
    quoteStrings: true,
    nullValue: '',
  };

  const exporter = new ClinicalCSVExporter({ ...defaultOptions, ...options });
  return exporter.generateAllCSVs(data);
}
