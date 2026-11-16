/**
 * Clinical Export System - Excel Exporter
 * NDC MEDICAL CENTRE EMR
 *
 * Multi-sheet Excel export with formatting for clinical data analysis
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import * as XLSX from 'xlsx';
import type { PatientJourneyExport, MultiPatientExport } from '../api';
import type { ExcelExportOptions } from '../types';
import { getICD10ChapterTitle } from '../standards';

// ==================== TYPES ====================

interface SheetData {
  name: string;
  data: (string | number | null | undefined)[][];
  headers: string[];
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format date for Excel
 */
function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime for Excel
 */
function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB');
  } catch {
    return dateStr;
  }
}

/**
 * Format currency value
 */
function formatCurrency(amount: number | undefined | null): number | string {
  if (amount === undefined || amount === null) return '';
  return amount;
}

/**
 * Sanitize sheet name for Excel (max 31 chars, no special chars)
 */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?[\]]/g, '_').substring(0, 31);
}

// ==================== EXCEL GENERATOR CLASS ====================

/**
 * Clinical Excel Exporter class
 */
export class ClinicalExcelExporter {
  private options: ExcelExportOptions;

  private workbook: XLSX.WorkBook;

  constructor(options: ExcelExportOptions) {
    this.options = options;
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Apply column widths
   */
  private applyColumnWidths(worksheet: XLSX.WorkSheet, widths: number[]) {
    worksheet['!cols'] = widths.map((w) => ({ wch: w }));
  }

  /**
   * Add sheet to workbook
   */
  private addSheet(sheetData: SheetData) {
    const data = [sheetData.headers, ...sheetData.data];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Auto-width columns (estimate based on header length)
    const colWidths = sheetData.headers.map((h, i) => {
      const maxDataLen = Math.max(
        h.length,
        ...sheetData.data.map((row) => String(row[i] || '').length),
      );
      return Math.min(Math.max(maxDataLen + 2, 10), 50);
    });
    this.applyColumnWidths(worksheet, colWidths);

    XLSX.utils.book_append_sheet(
      this.workbook,
      worksheet,
      sanitizeSheetName(sheetData.name),
    );
  }

  // ==================== SHEET GENERATORS ====================

  /**
   * Generate summary sheet
   */
  private generateSummarySheet(data: PatientJourneyExport): SheetData {
    const { patient, exportMetadata } = data;

    return {
      name: 'Summary',
      headers: ['Field', 'Value'],
      data: [
        ['PATIENT INFORMATION', ''],
        [
          'Full Name',
          `${patient.first_name} ${patient.middle_name || ''} ${patient.surname}`.trim(),
        ],
        ['EMR Number', patient.emr_number],
        ['Date of Birth', formatDate(patient.date_of_birth)],
        ['Age', patient.age],
        ['Gender', patient.gender],
        ['Blood Group', patient.blood_group || ''],
        ['Genotype', patient.genotype || ''],
        ['Patient Category', patient.patient_category],
        ['', ''],
        ['EXPORT INFORMATION', ''],
        ['Export Date', exportMetadata.exportDate],
        ['Export ID', exportMetadata.exportId],
        ['Exported By', exportMetadata.exportedBy.name],
        ['Date Range From', formatDate(exportMetadata.dateRange.from)],
        ['Date Range To', formatDate(exportMetadata.dateRange.to)],
        ['', ''],
        ['RECORD COUNTS', ''],
        ['Encounters', exportMetadata.recordCounts.encounters],
        ['Diagnoses', exportMetadata.recordCounts.diagnoses],
        ['Vitals Records', exportMetadata.recordCounts.vitals],
        ['Prescriptions', exportMetadata.recordCounts.prescriptions],
        ['Lab Requests', exportMetadata.recordCounts.labRequests],
        ['Radiology Requests', exportMetadata.recordCounts.radiologyRequests],
        ['Procedures', exportMetadata.recordCounts.procedures],
        ['Admissions', exportMetadata.recordCounts.admissions],
        ['Billing Records', exportMetadata.recordCounts.billingRecords],
        ['Nursing Notes', exportMetadata.recordCounts.nursingRecords],
      ],
    };
  }

  /**
   * Generate demographics sheet
   */
  private generateDemographicsSheet(data: PatientJourneyExport): SheetData {
    const { patient } = data;

    return {
      name: 'Demographics',
      headers: ['Field', 'Value'],
      data: [
        ['First Name', patient.first_name],
        ['Middle Name', patient.middle_name || ''],
        ['Surname', patient.surname],
        ['EMR Number', patient.emr_number],
        ['Date of Birth', formatDate(patient.date_of_birth)],
        ['Age', patient.age],
        ['Gender', patient.gender],
        ['Blood Group', patient.blood_group || ''],
        ['Genotype', patient.genotype || ''],
        ['Marital Status', patient.marital_status || ''],
        ['Occupation', patient.occupation || ''],
        ['Nationality', patient.nationality || ''],
        ['State of Origin', patient.state_of_origin || ''],
        ['LGA', patient.lga || ''],
        ['Address', patient.address || ''],
        ['City', patient.city || ''],
        ['State', patient.state || ''],
        ['Contact Phone', patient.contact_phone || ''],
        ['Contact Email', patient.contact_email || ''],
        ['Patient Category', patient.patient_category],
        ['NHIS Number', patient.nhis_number || ''],
        ['HMO Name', patient.hmo_name || ''],
        ['Company Name', patient.company_name || ''],
        ['Staff ID', patient.staff_id || ''],
        ['Service Number', patient.service_number || ''],
        ['Emergency Contact Name', patient.emergency_contact?.name || ''],
        [
          'Emergency Contact Relationship',
          patient.emergency_contact?.relationship || '',
        ],
        ['Emergency Contact Phone', patient.emergency_contact?.phone || ''],
      ],
    };
  }

  /**
   * Generate encounters sheet
   */
  private generateEncountersSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Encounters',
      headers: [
        'Date',
        'Encounter Number',
        'Type',
        'Status',
        'Department',
        'Clinic',
        'Attending Doctor',
        'Chief Complaint',
        'Present Illness',
        'Facility',
        'Created At',
      ],
      data: data.encounters.map((enc) => [
        formatDate(enc.encounter_date),
        enc.encounter_number || '',
        enc.encounter_type,
        enc.status,
        enc.department_name || '',
        enc.clinic_name || '',
        enc.attending_doctor_name || '',
        enc.chief_complaint || '',
        enc.history_present_illness || '',
        enc.facility_name || '',
        formatDateTime(enc.created_at),
      ]),
    };
  }

  /**
   * Generate diagnoses sheet
   */
  private generateDiagnosesSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Diagnoses',
      headers: [
        'Date Diagnosed',
        'ICD-10 Code',
        'ICD-10 Category',
        'Diagnosis Text',
        'Type',
        'Certainty',
        'Notes',
        'Encounter Number',
        'Diagnosed By',
      ],
      data: data.diagnoses.map((dx) => [
        formatDateTime(dx.diagnosed_at),
        dx.icd10_code || '',
        getICD10ChapterTitle(dx.icd10_code) || '',
        dx.diagnosis_text,
        dx.diagnosis_type,
        dx.certainty || '',
        dx.notes || '',
        dx.encounter_number || '',
        dx.diagnosed_by_name || '',
      ]),
    };
  }

  /**
   * Generate vitals sheet
   */
  private generateVitalsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Vital Signs',
      headers: [
        'Date/Time',
        'Temperature (°C)',
        'LOINC Temp',
        'BP Systolic',
        'BP Diastolic',
        'LOINC BP',
        'Pulse Rate',
        'LOINC Pulse',
        'Respiratory Rate',
        'LOINC RR',
        'Oxygen Saturation (%)',
        'LOINC SpO2',
        'Weight (kg)',
        'LOINC Weight',
        'Height (cm)',
        'LOINC Height',
        'BMI',
        'Pain Score (0-10)',
        'Blood Glucose',
        'Notes',
        'Recorded By',
        'Encounter Number',
      ],
      data: data.vitals.map((v) => [
        formatDateTime(v.recorded_at),
        v.temperature ?? '',
        v.temperature_loinc || '8310-5',
        v.blood_pressure_systolic ?? '',
        v.blood_pressure_diastolic ?? '',
        v.bp_systolic_loinc || '85354-9',
        v.pulse_rate ?? '',
        v.pulse_loinc || '8867-4',
        v.respiratory_rate ?? '',
        v.respiratory_loinc || '9279-1',
        v.oxygen_saturation ?? '',
        v.oxygen_loinc || '2708-6',
        v.weight ?? '',
        v.weight_loinc || '29463-7',
        v.height ?? '',
        v.height_loinc || '8302-2',
        v.bmi ?? '',
        v.pain_score ?? '',
        v.blood_glucose ?? '',
        v.notes || '',
        v.recorded_by_name || '',
        v.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate prescriptions sheet
   */
  private generatePrescriptionsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Prescriptions',
      headers: [
        'Prescribed Date',
        'Drug Name',
        'ATC Code',
        'Generic Name',
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
        'Encounter Number',
      ],
      data: data.prescriptions.map((rx) => [
        formatDateTime(rx.prescribed_at),
        rx.drug_name,
        rx.atc_code || '',
        rx.generic_name || '',
        rx.dosage || '',
        rx.route,
        rx.frequency,
        rx.duration || '',
        rx.quantity_prescribed,
        rx.quantity_dispensed || '',
        rx.status,
        rx.instructions || '',
        rx.prescribed_by_name || '',
        rx.dispensed_by_name || '',
        rx.dispensed_at ? formatDateTime(rx.dispensed_at) : '',
        rx.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate lab requests sheet
   */
  private generateLabRequestsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Lab Requests',
      headers: [
        'Order Date',
        'Test Name',
        'LOINC Code',
        'Category',
        'Priority',
        'Status',
        'Clinical Notes',
        'Ordered By',
        'Collected At',
        'Processed At',
        'Encounter Number',
      ],
      data: data.labRequests.map((lab) => [
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
        lab.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate lab results sheet
   */
  private generateLabResultsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Lab Results',
      headers: [
        'Test Name',
        'LOINC Code',
        'Result Value',
        'Unit',
        'Reference Range',
        'Abnormal Flag',
        'Interpretation',
        'Verified By',
        'Verified At',
      ],
      data: data.labResults.map((result) => [
        result.test_name,
        result.loinc_code || '',
        result.result_value,
        result.unit || '',
        result.reference_range_text ||
          (result.reference_range_low !== undefined &&
          result.reference_range_high !== undefined
            ? `${result.reference_range_low}-${result.reference_range_high}`
            : ''),
        result.abnormal_flag || 'N',
        result.interpretation || '',
        result.verified_by_name || '',
        result.verified_at ? formatDateTime(result.verified_at) : '',
      ]),
    };
  }

  /**
   * Generate radiology requests sheet
   */
  private generateRadiologyRequestsSheet(
    data: PatientJourneyExport,
  ): SheetData {
    return {
      name: 'Radiology',
      headers: [
        'Order Date',
        'Imaging Type',
        'Examination',
        'Body Part',
        'Laterality',
        'Priority',
        'Status',
        'Clinical Indication',
        'Ordered By',
        'Performed At',
        'Encounter Number',
      ],
      data: data.radiologyRequests.map((rad) => [
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
        rad.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate radiology reports sheet
   */
  private generateRadiologyReportsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Radiology Reports',
      headers: [
        'Report Date',
        'Findings',
        'Impression',
        'Recommendation',
        'Contrast Used',
        'Radiation Dose',
        'Reported By',
        'Verified By',
      ],
      data: data.radiologyReports.map((report) => [
        formatDateTime(report.reported_at),
        report.findings || '',
        report.impression || '',
        report.recommendation || '',
        report.contrast_used ? 'Yes' : 'No',
        report.radiation_dose || '',
        report.reported_by_name || '',
        report.verified_by_name || '',
      ]),
    };
  }

  /**
   * Generate procedures sheet
   */
  private generateProceduresSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Procedures',
      headers: [
        'Date Performed',
        'Procedure Name',
        'Type',
        'CPT Code',
        'ICD-10-PCS Code',
        'Outcome',
        'Complications',
        'Duration (min)',
        'Anesthesia Type',
        'Notes',
        'Performed By',
        'Assistant',
        'Encounter Number',
      ],
      data: data.procedures.map((proc) => [
        formatDateTime(proc.performed_at),
        proc.procedure_name,
        proc.procedure_type,
        proc.cpt_code || '',
        proc.icd10_pcs_code || '',
        proc.outcome || '',
        proc.complications || '',
        proc.duration_minutes ?? '',
        proc.anesthesia_type || '',
        proc.notes || '',
        proc.performed_by_name || '',
        proc.assistant_name || '',
        proc.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate admissions sheet
   */
  private generateAdmissionsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Admissions',
      headers: [
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
      ],
      data: data.admissions.map((adm) => [
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
      ]),
    };
  }

  /**
   * Generate billing sheet
   */
  private generateBillingSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Billing',
      headers: [
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
        'Encounter Number',
      ],
      data: data.billingRecords.map((bill) => [
        formatDateTime(bill.created_at),
        bill.order_number,
        bill.payment_category,
        formatCurrency(bill.sub_total),
        formatCurrency(bill.discount),
        formatCurrency(bill.tax),
        formatCurrency(bill.total_amount),
        formatCurrency(bill.amount_paid),
        formatCurrency(bill.balance),
        bill.status,
        bill.payment_method || '',
        bill.hmo_code || '',
        bill.created_by_name || '',
        bill.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate nursing sheet
   */
  private generateNursingSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Nursing Notes',
      headers: [
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
        'Encounter Number',
      ],
      data: data.nursingRecords.map((note) => [
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
        note.encounter_number || '',
      ]),
    };
  }

  /**
   * Generate ward rounds sheet
   */
  private generateWardRoundsSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Ward Rounds',
      headers: [
        'Date/Time',
        'Clinical Notes',
        'Assessment',
        'Plan',
        'Doctor',
        'Admission Number',
      ],
      data: data.wardRoundNotes.map((note) => [
        formatDateTime(note.created_at),
        note.clinical_notes || '',
        note.assessment || '',
        note.plan || '',
        note.doctor_name || '',
        note.admission_number || '',
      ]),
    };
  }

  /**
   * Generate bed transfers sheet
   */
  private generateBedTransfersSheet(data: PatientJourneyExport): SheetData {
    return {
      name: 'Bed Transfers',
      headers: [
        'Transfer Date',
        'From Ward',
        'From Bed',
        'To Ward',
        'To Bed',
        'Reason',
        'Transferred By',
        'Admission Number',
      ],
      data: data.bedTransfers.map((transfer) => [
        formatDateTime(transfer.transfer_date),
        transfer.from_ward_name || '',
        transfer.from_bed_number || '',
        transfer.to_ward_name || '',
        transfer.to_bed_number || '',
        transfer.reason || '',
        transfer.transferred_by_name || '',
        transfer.admission_number || '',
      ]),
    };
  }

  // ==================== MAIN EXPORT FUNCTION ====================

  /**
   * Generate Excel workbook for single patient export
   */
  public async generate(data: PatientJourneyExport): Promise<Blob> {
    const modules = data.exportMetadata.modulesCovered;

    // Always include summary sheet
    this.addSheet(this.generateSummarySheet(data));

    // Add sheets based on modules
    if (modules.includes('demographics')) {
      this.addSheet(this.generateDemographicsSheet(data));
    }

    if (modules.includes('encounters') && data.encounters.length > 0) {
      this.addSheet(this.generateEncountersSheet(data));
    }

    if (modules.includes('diagnoses') && data.diagnoses.length > 0) {
      this.addSheet(this.generateDiagnosesSheet(data));
    }

    if (modules.includes('vitals') && data.vitals.length > 0) {
      this.addSheet(this.generateVitalsSheet(data));
    }

    if (modules.includes('prescriptions') && data.prescriptions.length > 0) {
      this.addSheet(this.generatePrescriptionsSheet(data));
    }

    if (modules.includes('laboratory') && data.labRequests.length > 0) {
      this.addSheet(this.generateLabRequestsSheet(data));

      if (data.labResults.length > 0) {
        this.addSheet(this.generateLabResultsSheet(data));
      }
    }

    if (modules.includes('radiology') && data.radiologyRequests.length > 0) {
      this.addSheet(this.generateRadiologyRequestsSheet(data));

      if (data.radiologyReports.length > 0) {
        this.addSheet(this.generateRadiologyReportsSheet(data));
      }
    }

    if (modules.includes('procedures') && data.procedures.length > 0) {
      this.addSheet(this.generateProceduresSheet(data));
    }

    if (modules.includes('admissions') && data.admissions.length > 0) {
      this.addSheet(this.generateAdmissionsSheet(data));
    }

    if (modules.includes('billing') && data.billingRecords.length > 0) {
      this.addSheet(this.generateBillingSheet(data));
    }

    if (modules.includes('nursing') && data.nursingRecords.length > 0) {
      this.addSheet(this.generateNursingSheet(data));
    }

    if (data.wardRoundNotes.length > 0) {
      this.addSheet(this.generateWardRoundsSheet(data));
    }

    if (data.bedTransfers.length > 0) {
      this.addSheet(this.generateBedTransfersSheet(data));
    }

    // Generate buffer
    const buffer = XLSX.write(this.workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Generate and download Excel file
   */
  public async download(
    data: PatientJourneyExport,
    filename?: string,
  ): Promise<void> {
    const blob = await this.generate(data);

    const defaultFilename = `${data.patient.emr_number}_Clinical_Export_${data.exportMetadata.exportDate}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

// ==================== MULTI-PATIENT EXCEL EXPORTER ====================

/**
 * Generate Excel for multi-patient export (aggregate analysis)
 */
export class MultiPatientExcelExporter {
  private options: ExcelExportOptions;

  private workbook: XLSX.WorkBook;

  constructor(options: ExcelExportOptions) {
    this.options = options;
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Add sheet to workbook
   */
  private addSheet(
    name: string,
    headers: string[],
    data: (string | number | null | undefined)[][],
  ) {
    const sheetData = [headers, ...data];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-width columns
    const colWidths = headers.map((h, i) => {
      const maxDataLen = Math.max(
        h.length,
        ...data.map((row) => String(row[i] || '').length),
      );
      return Math.min(Math.max(maxDataLen + 2, 10), 50);
    });
    worksheet['!cols'] = colWidths.map((w) => ({ wch: w }));

    XLSX.utils.book_append_sheet(
      this.workbook,
      worksheet,
      sanitizeSheetName(name),
    );
  }

  /**
   * Generate multi-patient export
   */
  public async generate(data: MultiPatientExport): Promise<Blob> {
    // Summary sheet
    this.addSheet(
      'Export Summary',
      ['Metric', 'Value'],
      [
        ['Export Date', data.exportMetadata.exportDate],
        ['Export ID', data.exportMetadata.exportId],
        ['Total Patients', data.patients.length],
        ['Date Range From', formatDate(data.exportMetadata.dateRange.from)],
        ['Date Range To', formatDate(data.exportMetadata.dateRange.to)],
        ['Exported By', data.exportMetadata.exportedBy.name],
      ],
    );

    // Patients overview sheet
    this.addSheet(
      'Patients',
      [
        'EMR Number',
        'Name',
        'DOB',
        'Age',
        'Gender',
        'Category',
        'Encounters',
        'Diagnoses',
        'Admissions',
      ],
      data.patients.map((p: PatientJourneyExport) => [
        p.patient.emr_number,
        `${p.patient.first_name} ${p.patient.surname}`,
        formatDate(p.patient.date_of_birth),
        p.patient.age,
        p.patient.gender,
        p.patient.patient_category,
        p.exportMetadata.recordCounts.encounters,
        p.exportMetadata.recordCounts.diagnoses,
        p.exportMetadata.recordCounts.admissions,
      ]),
    );

    // All diagnoses sheet
    const allDiagnoses: (string | number)[][] = [];
    for (const patientExport of data.patients) {
      for (const dx of patientExport.diagnoses) {
        allDiagnoses.push([
          patientExport.patient.emr_number,
          `${patientExport.patient.first_name} ${patientExport.patient.surname}`,
          formatDate(dx.diagnosed_at),
          dx.icd10_code || '',
          dx.diagnosis_text,
          dx.diagnosis_type,
          getICD10ChapterTitle(dx.icd10_code) || '',
        ]);
      }
    }

    if (allDiagnoses.length > 0) {
      this.addSheet(
        'All Diagnoses',
        [
          'EMR Number',
          'Patient Name',
          'Date',
          'ICD-10',
          'Diagnosis',
          'Type',
          'Category',
        ],
        allDiagnoses,
      );
    }

    // All admissions sheet
    const allAdmissions: (string | number)[][] = [];
    for (const patientExport of data.patients) {
      for (const adm of patientExport.admissions) {
        allAdmissions.push([
          patientExport.patient.emr_number,
          `${patientExport.patient.first_name} ${patientExport.patient.surname}`,
          adm.admission_number,
          formatDate(adm.admission_date),
          adm.discharge_date ? formatDate(adm.discharge_date) : '',
          adm.length_of_stay ?? '',
          adm.ward_name || '',
          adm.status,
          adm.outcome || '',
        ]);
      }
    }

    if (allAdmissions.length > 0) {
      this.addSheet(
        'All Admissions',
        [
          'EMR Number',
          'Patient Name',
          'Admission #',
          'Admission Date',
          'Discharge Date',
          'LOS',
          'Ward',
          'Status',
          'Outcome',
        ],
        allAdmissions,
      );
    }

    // All prescriptions sheet
    const allRx: (string | number)[][] = [];
    for (const patientExport of data.patients) {
      for (const rx of patientExport.prescriptions) {
        allRx.push([
          patientExport.patient.emr_number,
          `${patientExport.patient.first_name} ${patientExport.patient.surname}`,
          formatDate(rx.prescribed_at),
          rx.drug_name,
          rx.atc_code || '',
          rx.dosage || '',
          rx.quantity_prescribed,
          rx.status,
        ]);
      }
    }

    if (allRx.length > 0) {
      this.addSheet(
        'All Prescriptions',
        [
          'EMR Number',
          'Patient Name',
          'Date',
          'Drug',
          'ATC Code',
          'Dosage',
          'Quantity',
          'Status',
        ],
        allRx,
      );
    }

    // Generate buffer
    const buffer = XLSX.write(this.workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Generate and download
   */
  public async download(
    data: MultiPatientExport,
    filename?: string,
  ): Promise<void> {
    const blob = await this.generate(data);

    const defaultFilename = `MultiPatient_Clinical_Export_${data.exportMetadata.exportDate}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Generate clinical export Excel
 */
export async function generateClinicalExportExcel(
  data: PatientJourneyExport,
  options?: Partial<ExcelExportOptions>,
): Promise<Blob> {
  const defaultOptions: ExcelExportOptions = {
    separateSheets: true,
    splitByModule: true,
    includeFormatting: true,
    includeFormulas: false,
    includeCharts: false,
    includeSummarySheet: true,
    freezeHeaders: true,
    autoFitColumns: true,
    autoFilter: true,
    includeFilters: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
  };

  const exporter = new ClinicalExcelExporter({ ...defaultOptions, ...options });
  return exporter.generate(data);
}

/**
 * Download clinical export Excel
 */
export async function downloadClinicalExportExcel(
  data: PatientJourneyExport,
  options?: Partial<ExcelExportOptions>,
  filename?: string,
): Promise<void> {
  const defaultOptions: ExcelExportOptions = {
    separateSheets: true,
    splitByModule: true,
    includeFormatting: true,
    includeFormulas: false,
    includeCharts: false,
    includeSummarySheet: true,
    freezeHeaders: true,
    autoFitColumns: true,
    autoFilter: true,
    includeFilters: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
  };

  const exporter = new ClinicalExcelExporter({ ...defaultOptions, ...options });
  return exporter.download(data, filename);
}

/**
 * Generate multi-patient export Excel
 */
export async function generateMultiPatientExportExcel(
  data: MultiPatientExport,
  options?: Partial<ExcelExportOptions>,
): Promise<Blob> {
  const defaultOptions: ExcelExportOptions = {
    separateSheets: true,
    splitByModule: true,
    includeFormatting: true,
    includeFormulas: false,
    includeCharts: false,
    includeSummarySheet: true,
    freezeHeaders: true,
    autoFitColumns: true,
    autoFilter: true,
    includeFilters: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
  };

  const exporter = new MultiPatientExcelExporter({
    ...defaultOptions,
    ...options,
  });
  return exporter.generate(data);
}

/**
 * Download multi-patient export Excel
 */
export async function downloadMultiPatientExportExcel(
  data: MultiPatientExport,
  options?: Partial<ExcelExportOptions>,
  filename?: string,
): Promise<void> {
  const defaultOptions: ExcelExportOptions = {
    separateSheets: true,
    splitByModule: true,
    includeFormatting: true,
    includeFormulas: false,
    includeCharts: false,
    includeSummarySheet: true,
    freezeHeaders: true,
    autoFitColumns: true,
    autoFilter: true,
    includeFilters: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
  };

  const exporter = new MultiPatientExcelExporter({
    ...defaultOptions,
    ...options,
  });
  return exporter.download(data, filename);
}
