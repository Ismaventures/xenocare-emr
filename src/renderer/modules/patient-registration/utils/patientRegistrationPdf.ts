import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  type PatientDTO,
  type PatientSearchParams,
  formatDetailedAge,
  formatPatientName,
} from '../dtos/patient.dto';

interface PatientRegistrationPdfOptions {
  filters?: PatientSearchParams;
  generatedBy?: string;
}

const FACILITY_NAME = 'National Defence College Medical Centre';
const REPORT_TITLE = 'Patient Registration Report';

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildFilterSummary(filters?: PatientSearchParams): string {
  if (!filters) {
    return 'Filters: All registrations';
  }

  const segments: string[] = [];

  if (filters.query?.trim()) {
    segments.push(`Search: "${filters.query.trim()}"`);
  }
  if (filters.status) {
    segments.push(`Status: ${filters.status}`);
  }
  if (filters.staff_category) {
    segments.push(`Staff Category: ${filters.staff_category}`);
  }
  if (filters.patient_category) {
    segments.push(`Patient Category: ${filters.patient_category}`);
  }
  if (filters.patient_type) {
    segments.push(`Patient Type: ${filters.patient_type}`);
  }
  if (filters.insurance_type) {
    segments.push(`Insurance: ${filters.insurance_type}`);
  }
  if (filters.nhis_patient_source) {
    segments.push(`NHIS Source: ${filters.nhis_patient_source}`);
  }
  if (filters.gender) {
    segments.push(`Gender: ${filters.gender}`);
  }
  if (filters.registration_date_from || filters.registration_date_to) {
    segments.push(
      `Registration: ${filters.registration_date_from || 'Any'} to ${filters.registration_date_to || 'Any'}`,
    );
  }

  if (segments.length === 0) {
    return 'Filters: All registrations';
  }

  return `Filters: ${segments.join(' | ')}`;
}

function buildFilename(): string {
  const now = new Date();
  const dayStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toTimeString().slice(0, 5).replace(':', '');
  return `Patient_Registration_Report_${dayStamp}_${timeStamp}.pdf`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportPatientRegistrationPdf(
  patients: PatientDTO[],
  options: PatientRegistrationPdfOptions = {},
): Promise<{ filename: string }> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filename = buildFilename();

  // NDC Green branded header banner
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(FACILITY_NAME.toUpperCase(), pageWidth / 2, 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(REPORT_TITLE, pageWidth / 2, 11, { align: 'center' });

  // Metadata
  let yPos = 20;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(buildFilterSummary(options.filters), 14, yPos);
  yPos += 4;
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 14, yPos);
  doc.text(`By: ${options.generatedBy || 'System'}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Records: ${patients.length}`, pageWidth - 14, yPos, { align: 'right' });
  yPos += 2;

  // Thin divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 4;
  doc.setTextColor(17, 24, 39);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        'S/N',
        'EMR Number',
        'Patient Name',
        'Gender',
        'Age',
        'Patient Category',
        'Patient Type',
        'Insurance',
        'NHIS Source',
        'Phone',
        'Registered',
      ],
    ],
    body: patients.map((patient, index) => [
      String(index + 1),
      patient.emr_number || 'Pending',
      formatPatientName(patient),
      patient.gender || '—',
      formatDetailedAge(patient.date_of_birth),
      patient.patient_category || patient.staff_category || '—',
      patient.patient_type || '—',
      patient.insurance_type || '—',
      patient.nhis_patient_source || '—',
      patient.contact_phone || '—',
      formatDateTime(patient.registration_date),
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (hookData) => {
      // Re-draw header on subsequent pages
      if (hookData.pageNumber > 1) {
        doc.setFillColor(22, 101, 52);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(FACILITY_NAME.toUpperCase(), pageWidth / 2, 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(REPORT_TITLE, pageWidth / 2, 11, { align: 'center' });
      }
      // Footer
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `NDC Medical Centre  •  Page ${hookData.pageNumber}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' },
      );
      doc.setTextColor(17, 24, 39);
    },
  });

  const pdfBlob = doc.output('blob');

  if (window.electron?.pdf?.saveAndOpen) {
    const pdfData = Array.from(new Uint8Array(await pdfBlob.arrayBuffer()));
    await window.electron.pdf.saveAndOpen(filename, pdfData);
  } else {
    downloadBlob(pdfBlob, filename);
  }

  return { filename };
}