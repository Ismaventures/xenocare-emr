/**
 * Records History Module - Export Utilities
 * NDC MEDICAL CENTRE EMR
 *
 * PDF (via jsPDF + autoTable) and CSV export for filtered records.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  UnifiedRecord,
  RecordsExportOptions,
} from '../types/records-history.types';
import { RECORD_CATEGORIES } from '../types/records-history.types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const NDC_HEADER = {
  name: 'NDC Medical Centre',
  fullName: 'National Defence College Medical Centre, Abuja',
  tagline: 'Excellence in Healthcare & Service to Nation',
};

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function filterSummary(opts: RecordsExportOptions): string {
  const parts: string[] = [];
  const { filters } = opts;
  const catLabel =
    filters.category === 'all'
      ? 'All Categories'
      : (RECORD_CATEGORIES.find((c) => c.key === filters.category)?.label ??
        filters.category);
  parts.push(`Category: ${catLabel}`);
  if (filters.dateFrom || filters.dateTo) {
    parts.push(`Period: ${filters.dateFrom || '∞'} — ${filters.dateTo || '∞'}`);
  }
  if (filters.searchTerm) parts.push(`Search: "${filters.searchTerm}"`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.department) parts.push(`Dept: ${filters.department}`);
  return parts.join('  |  ');
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
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

export function exportRecordsCSV(
  records: UnifiedRecord[],
  opts: RecordsExportOptions,
): void {
  const headers = [
    'S/N',
    'Date',
    'Category',
    'Patient',
    'EMR No.',
    'Title',
    'Description',
    'Status',
    'Department',
    'Staff',
    'NHIS',
    'Amount',
  ];

  const rows = records.map((r, i) => [
    escapeCSV(i + 1),
    escapeCSV(fmtDate(r.date)),
    escapeCSV(r.categoryLabel),
    escapeCSV(r.patientName),
    escapeCSV(r.emrNumber),
    escapeCSV(r.title),
    escapeCSV(r.description),
    escapeCSV(r.status),
    escapeCSV(r.department),
    escapeCSV(r.staffName),
    escapeCSV(r.nhisRelated ? 'Yes' : 'No'),
    escapeCSV(r.amount != null ? r.amount : ''),
  ]);

  const csv = [
    `"${NDC_HEADER.fullName}"`,
    `"Records History Export — ${opts.title}"`,
    `"${filterSummary(opts)}"`,
    `"Generated: ${new Date().toLocaleString()} by ${opts.generatedBy}"`,
    '',
    headers.map((h) => escapeCSV(h)).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `Records_History_${dateStamp()}.csv`);
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

export async function exportRecordsPDF(
  records: UnifiedRecord[],
  opts: RecordsExportOptions,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(NDC_HEADER.name, pageW / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(NDC_HEADER.tagline, pageW / 2, 19, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title || 'Records History', pageW / 2, 27, {
    align: 'center',
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(filterSummary(opts), 14, 33);
  doc.text(
    `Generated: ${new Date().toLocaleString()} by ${opts.generatedBy}`,
    14,
    37,
  );
  doc.text(`Total Records: ${records.length}`, pageW - 14, 37, {
    align: 'right',
  });

  // Confidentiality notice
  doc.setFontSize(6);
  doc.setTextColor(180, 0, 0);
  doc.text('CONFIDENTIAL MEDICAL RECORD — DO NOT DISTRIBUTE', pageW / 2, 42, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0);

  // Table
  const tableHeaders = [
    'S/N',
    'Date',
    'Category',
    'Patient',
    'EMR',
    'Title',
    'Status',
    'Dept',
    'Staff',
    'NHIS',
  ];

  const tableRows = records.map((r, i) => [
    String(i + 1),
    fmtDate(r.date),
    r.categoryLabel,
    r.patientName,
    r.emrNumber,
    r.title.length > 35 ? r.title.slice(0, 35) + '…' : r.title,
    r.status,
    r.department || '—',
    r.staffName || '—',
    r.nhisRelated ? 'Yes' : '—',
  ]);

  autoTable(doc, {
    startY: 45,
    head: [tableHeaders],
    body: tableRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    },
  });

  const blob = doc.output('blob');
  downloadBlob(blob, `Records_History_${dateStamp()}.pdf`);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().split('T')[0];
}
