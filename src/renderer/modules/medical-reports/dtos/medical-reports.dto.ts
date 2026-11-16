import { Patient, Staff } from '../../../types';

// =============================================================================
// Medical Reports DTOs
// =============================================================================

export interface MedicalReportDTO {
  id?: string;
  report_id: string;
  patient_id: string;
  visit_id: string | null;
  report_type: ReportType;
  report_title: string;
  report_content: string;
  valid_from: string | null;
  valid_to: string | null;
  status: ReportStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  issued_at: string | null;
  document_url: string | null;
  document_number: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  creator?: Staff;
  approver?: Staff;
}

export type ReportType =
  | 'Medical Certificate'
  | 'Sick Leave'
  | 'Fitness Report'
  | 'Referral Letter'
  | 'Discharge Summary'
  | 'Death Certificate'
  | 'Medical Report';

export type ReportStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Issued'
  | 'Revoked';

export interface CreateMedicalReportDTO {
  patient_id: string; // Foreign key to patients.id (UUID)
  visit_id?: string;
  report_type: ReportType;
  report_title: string;
  report_content: string;
  valid_from?: string;
  valid_to?: string;
}

export interface UpdateMedicalReportDTO {
  report_title?: string;
  report_content?: string;
  valid_from?: string;
  valid_to?: string;
  status?: ReportStatus;
}

export interface MedicalReportStatsDTO {
  total: number;
  pending: number;
  approved: number;
  issued_today: number;
  trend?: number;
}

export interface ReportTemplateDTO {
  template_id: string;
  report_type: ReportType;
  template_name: string;
  template_content: string;
  placeholders: Record<string, string>[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

export const getReportTypeLabel = (type: ReportType): string => {
  const labels: Record<ReportType, string> = {
    'Medical Certificate': 'Medical Certificate',
    'Sick Leave': 'Sick Leave Certificate',
    'Fitness Report': 'Fitness Report',
    'Referral Letter': 'Referral Letter',
    'Discharge Summary': 'Discharge Summary',
    'Death Certificate': 'Death Certificate',
    'Medical Report': 'Medical Report',
  };
  return labels[type] || type;
};

export const getReportStatusColor = (status: ReportStatus): string => {
  const colors: Record<ReportStatus, string> = {
    Draft: 'gray',
    'Pending Approval': 'yellow',
    Approved: 'blue',
    Issued: 'green',
    Revoked: 'red',
  };
  return colors[status] || 'gray';
};

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'Medical Certificate', label: 'Medical Certificate' },
  { value: 'Sick Leave', label: 'Sick Leave Certificate' },
  { value: 'Fitness Report', label: 'Fitness Report' },
  { value: 'Referral Letter', label: 'Referral Letter' },
  { value: 'Discharge Summary', label: 'Discharge Summary' },
  { value: 'Death Certificate', label: 'Death Certificate' },
  { value: 'Medical Report', label: 'Medical Report' },
];
