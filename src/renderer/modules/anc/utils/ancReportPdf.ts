/**
 * ANC Report PDF Export
 * Comprehensive antenatal patient records export with full filtering
 * for monthly report generation by any category, insurance, risk, trimester, etc.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PregnancyEpisode } from '../api/anc.types';
import { calculateGestationalAge } from '../api/anc.types';

export interface AncReportFilters {
  // Patient demographics
  patient_category?: string;
  insurance_type?: string;
  // Pregnancy clinical
  risk_level?: string;
  status?: string;
  booking_status?: string;
  trimester?: string;        // '1' | '2' | '3'
  gravida_type?: string;     // 'primigravida' | 'multigravida'
  blood_group?: string;
  rhesus_factor?: string;
  genotype?: string;
  // Date ranges
  enrollment_from?: string;  // ISO date
  enrollment_to?: string;
  edd_from?: string;
  edd_to?: string;
}

interface AncReportPdfOptions {
  filters?: AncReportFilters;
  generatedBy?: string;
}

// ── NDC Unified PDF Theme ────────────────────────────────────────────────────
const FACILITY_NAME = 'XenoCare';
const REPORT_TITLE = 'Antenatal Care (ANC) — Monthly Report';
const NDC_GREEN: [number, number, number] = [22, 101, 52];
const NDC_GREEN_LIGHT: [number, number, number] = [240, 253, 244];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_200: [number, number, number] = [226, 232, 240];
const TEXT_COLOR: [number, number, number] = [17, 24, 39];
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTrimesterFromGA(lmp: string | null): number | null {
  if (!lmp) return null;
  const ga = calculateGestationalAge(lmp);
  if (!ga) return null;
  const weeks = ga.weeks;
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

function getTrimesterLabel(lmp: string | null): string {
  const t = getTrimesterFromGA(lmp);
  if (t === 1) return '1st';
  if (t === 2) return '2nd';
  if (t === 3) return '3rd';
  return '—';
}

function buildFilterSummary(filters?: AncReportFilters): string {
  if (!filters) return 'Filters: All ANC patients';
  const parts: string[] = [];
  if (filters.patient_category) parts.push(`Category: ${filters.patient_category}`);
  if (filters.insurance_type) parts.push(`Insurance: ${filters.insurance_type}`);
  if (filters.risk_level) parts.push(`Risk: ${filters.risk_level}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.booking_status) parts.push(`Booking: ${filters.booking_status}`);
  if (filters.trimester) {
    const labels: Record<string, string> = { '1': '1st Trimester', '2': '2nd Trimester', '3': '3rd Trimester' };
    parts.push(labels[filters.trimester] || `Trimester ${filters.trimester}`);
  }
  if (filters.gravida_type) parts.push(`Gravida: ${filters.gravida_type === 'primigravida' ? 'Primigravida' : 'Multigravida'}`);
  if (filters.blood_group) parts.push(`Blood Group: ${filters.blood_group}`);
  if (filters.rhesus_factor) parts.push(`Rhesus: ${filters.rhesus_factor}`);
  if (filters.genotype) parts.push(`Genotype: ${filters.genotype}`);
  if (filters.enrollment_from || filters.enrollment_to) {
    parts.push(`Enrolled: ${formatDate(filters.enrollment_from) || 'Any'} – ${formatDate(filters.enrollment_to) || 'Any'}`);
  }
  if (filters.edd_from || filters.edd_to) {
    parts.push(`EDD: ${formatDate(filters.edd_from) || 'Any'} – ${formatDate(filters.edd_to) || 'Any'}`);
  }
  return parts.length > 0 ? `Filters: ${parts.join(' | ')}` : 'Filters: All ANC patients';
}

function buildFilename(filters?: AncReportFilters): string {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const suffix = filters?.patient_category ? `_${filters.patient_category.replace(/\s+/g, '_')}` : '';
  return `ANC_Report${suffix}_${stamp}_${time}.pdf`;
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

function inDateRange(dateStr: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function filterPregnancies(
  pregnancies: PregnancyEpisode[],
  filters: AncReportFilters,
): PregnancyEpisode[] {
  return pregnancies.filter((ep) => {
    if (filters.patient_category && ep.patient?.patient_category !== filters.patient_category) return false;
    if (filters.insurance_type && ep.patient?.insurance_type !== filters.insurance_type) return false;
    if (filters.risk_level && ep.risk_level !== filters.risk_level) return false;
    if (filters.status && ep.status !== filters.status) return false;
    if (filters.booking_status && ep.booking_status !== filters.booking_status) return false;
    if (filters.blood_group) {
      const bg = ep.blood_group || ep.patient?.blood_group;
      if (bg !== filters.blood_group) return false;
    }
    if (filters.rhesus_factor && ep.rhesus_factor !== filters.rhesus_factor) return false;
    if (filters.genotype && ep.genotype !== filters.genotype) return false;
    if (filters.trimester) {
      const t = getTrimesterFromGA(ep.lmp);
      if (t !== Number(filters.trimester)) return false;
    }
    if (filters.gravida_type) {
      if (filters.gravida_type === 'primigravida' && ep.gravida !== 1) return false;
      if (filters.gravida_type === 'multigravida' && ep.gravida <= 1) return false;
    }
    if (!inDateRange(ep.enrollment_date, filters.enrollment_from, filters.enrollment_to)) return false;
    if (!inDateRange(ep.edd, filters.edd_from, filters.edd_to)) return false;
    return true;
  });
}

export async function exportAncReportPdf(
  pregnancies: PregnancyEpisode[],
  options: AncReportPdfOptions = {},
): Promise<{ filename: string }> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filename = buildFilename(options.filters);

  // ── NDC Header ─────────────────────────────────────────────────────────────
  // Green branded banner
  doc.setFillColor(...NDC_GREEN);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(FACILITY_NAME.toUpperCase(), pageWidth / 2, 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(REPORT_TITLE, pageWidth / 2, 11, { align: 'center' });

  // Filter summary + metadata
  let yPos = 20;
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(8);
  const filterText = buildFilterSummary(options.filters);
  const filterLines: string[] = doc.splitTextToSize(filterText, pageWidth - 28);
  filterLines.forEach((line: string) => {
    doc.text(line, 14, yPos);
    yPos += 3.5;
  });
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 14, yPos);
  doc.text(`By: ${options.generatedBy || 'System'}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Records: ${pregnancies.length}`, pageWidth - 14, yPos, { align: 'right' });
  yPos += 2;

  // Thin divider
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 4;
  doc.setTextColor(...TEXT_COLOR);

  // Table
  autoTable(doc, {
    startY: yPos,
    head: [
      [
        'S/N',
        'EMR No.',
        'Patient Name',
        'Age',
        'Phone',
        'Category',
        'Insurance',
        'NHIS No.',
        'G/P/A',
        'Living',
        'GA',
        'Trimester',
        'EDD',
        'Risk',
        'Blood Grp',
        'Rh',
        'Genotype',
        'Doctor',
        'Enrolled',
        'Status',
      ],
    ],
    body: pregnancies.map((ep, i) => {
      const ga = calculateGestationalAge(ep.lmp);
      const dob = ep.patient?.date_of_birth;
      const age = dob
        ? `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))}y`
        : '—';
      return [
        String(i + 1),
        ep.patient?.emr_number || '—',
        `${ep.patient?.first_name || ''} ${ep.patient?.surname || ''}`.trim() || '—',
        age,
        ep.patient?.contact_phone || '—',
        ep.patient?.patient_category || '—',
        ep.patient?.insurance_type || '—',
        ep.patient?.nhis_number || '—',
        `G${ep.gravida}P${ep.parity}A${ep.abortions}`,
        String(ep.living_children),
        ga ? `${ga.weeks}w ${ga.days}d` : '—',
        getTrimesterLabel(ep.lmp),
        formatDate(ep.edd),
        ep.risk_level || '—',
        ep.blood_group || ep.patient?.blood_group || '—',
        ep.rhesus_factor || '—',
        ep.genotype || '—',
        ep.primary_doctor ? `Dr. ${ep.primary_doctor.last_name}` : '—',
        formatDate(ep.enrollment_date),
        ep.status || '—',
      ];
    }),
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: NDC_GREEN,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: SLATE_50,
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (hookData) => {
      // Re-draw branded header on subsequent pages
      if (hookData.pageNumber > 1) {
        doc.setFillColor(...NDC_GREEN);
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
      doc.setTextColor(...MUTED_COLOR);
      doc.text(
        `XenoCare  •  Page ${hookData.pageNumber}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' },
      );
      doc.setTextColor(...TEXT_COLOR);
    },
  });

  // ── Summary Statistics Table ───────────────────────────────────────────────
  const lastY = (doc as any).lastAutoTable?.finalY || yPos + 20;
  const highRisk = pregnancies.filter((e) => e.risk_level === 'high').length;
  const modRisk = pregnancies.filter((e) => e.risk_level === 'moderate').length;
  const lowRisk = pregnancies.filter((e) => e.risk_level === 'low').length;
  const t1 = pregnancies.filter((e) => getTrimesterFromGA(e.lmp) === 1).length;
  const t2 = pregnancies.filter((e) => getTrimesterFromGA(e.lmp) === 2).length;
  const t3 = pregnancies.filter((e) => getTrimesterFromGA(e.lmp) === 3).length;
  const primi = pregnancies.filter((e) => e.gravida === 1).length;

  autoTable(doc, {
    startY: lastY + 6,
    head: [['Metric', 'Count', 'Metric', 'Count']],
    body: [
      ['Total Patients', String(pregnancies.length), '1st Trimester', String(t1)],
      ['High Risk', String(highRisk), '2nd Trimester', String(t2)],
      ['Moderate Risk', String(modRisk), '3rd Trimester', String(t3)],
      ['Low Risk', String(lowRisk), 'Primigravida', String(primi)],
      ['', '', 'Multigravida', String(pregnancies.length - primi)],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: SLATE_700,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: SLATE_50 },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 30 },
      2: { fontStyle: 'bold', cellWidth: 50 },
      3: { halign: 'center', cellWidth: 30 },
    },
    tableWidth: 'wrap',
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
