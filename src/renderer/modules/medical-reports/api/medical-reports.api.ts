import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import {
  MedicalReportDTO,
  CreateMedicalReportDTO,
  UpdateMedicalReportDTO,
  MedicalReportStatsDTO,
  ReportTemplateDTO,
  ReportType,
} from '../dtos/medical-reports.dto';

// =============================================================================
// Medical Reports API
// =============================================================================

export interface MedicalReportFilters {
  search?: string;
  status?: string;
  report_type?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
}

interface IssueValidationReport {
  report_id?: string;
  id?: string;
  report_type: ReportType;
  report_title: string;
  report_content: string;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
}

const PLACEHOLDER_REGEX = /\[[^\]\n]{2,}\]|\{[^}\n]{2,}\}/g;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let medicalReportIdColumnCache: 'id' | 'report_id' | null = null;

type MedicalReportRow = MedicalReportDTO & { id?: string; report_id?: string };

function normalizeMedicalReportRow(row: MedicalReportRow): MedicalReportDTO {
  return {
    ...row,
    report_id: row.report_id || row.id || '',
  };
}

function ensureReportIdOrThrow(reportId: string): string {
  const normalized = reportId?.trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    throw new Error(
      'Report ID is missing. Refresh and reopen the report, then retry.',
    );
  }
  return normalized;
}

async function resolveMedicalReportIdColumn(): Promise<'id' | 'report_id'> {
  if (medicalReportIdColumnCache) {
    return medicalReportIdColumnCache;
  }

  const probeId = await supabase.from('medical_reports').select('id').limit(1);

  if (!probeId.error) {
    medicalReportIdColumnCache = 'id';
    return medicalReportIdColumnCache;
  }

  if (probeId.error.code !== '42703') {
    throw probeId.error;
  }

  const probeReportId = await supabase
    .from('medical_reports')
    .select('report_id')
    .limit(1);

  if (!probeReportId.error) {
    medicalReportIdColumnCache = 'report_id';
    return medicalReportIdColumnCache;
  }

  throw probeReportId.error;
}

async function resolveMedicalReportPatientId(
  patientKey: string,
): Promise<string> {
  const normalizedKey = patientKey?.trim();
  if (!normalizedKey) {
    throw new Error('Patient is required to create a medical report.');
  }

  if (UUID_REGEX.test(normalizedKey)) {
    const { data: byId, error: byIdError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', normalizedKey)
      .maybeSingle();

    if (byIdError) throw byIdError;
    if (byId?.id) return byId.id;
  }

  const { data: byPatientId, error: byPatientIdError } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_id', normalizedKey)
    .maybeSingle();

  if (byPatientIdError) throw byPatientIdError;
  if (byPatientId?.id) return byPatientId.id;

  throw new Error(
    'Selected patient could not be resolved. Refresh patient search and try again.',
  );
}

async function resolveMedicalReportPatientIdOrNull(
  patientKey: string,
): Promise<string | null> {
  try {
    return await resolveMedicalReportPatientId(patientKey);
  } catch {
    return null;
  }
}

function normalizeOptionalDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  // Preserve YYYY-MM-DD format when provided by date input.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return parsed.toISOString().slice(0, 10);
}

function validateReportBeforeIssue(report: IssueValidationReport): string[] {
  const issues: string[] = [];
  const content = (report.report_content || '').trim();
  const title = (report.report_title || '').trim();

  if (!title) {
    issues.push('Report title is missing.');
  }

  if (!content || content.length < 80) {
    issues.push('Report content is too short for issuance.');
  }

  const placeholders = content.match(PLACEHOLDER_REGEX) || [];
  if (placeholders.length > 0) {
    const sample = placeholders.slice(0, 3).join(', ');
    issues.push(`Report still contains unresolved placeholders (${sample}).`);
  }

  const requiresValidityRange =
    report.report_type === 'Sick Leave' ||
    report.report_type === 'Medical Certificate' ||
    report.report_type === 'Fitness Report';

  if (requiresValidityRange) {
    if (!report.valid_from) {
      issues.push('Valid From date is required for this report type.');
    }
    if (!report.valid_to) {
      issues.push('Valid To date is required for this report type.');
    }
  }

  if (report.report_type === 'Death Certificate') {
    const lowerContent = content.toLowerCase();
    if (!lowerContent.includes('immediate cause')) {
      issues.push('Death certificate should include immediate cause of death.');
    }
    if (!lowerContent.includes('underlying cause')) {
      issues.push(
        'Death certificate should include underlying cause of death.',
      );
    }
  }

  return issues;
}

export const medicalReportsApi = {
  // Get all medical reports with filters
  async getReports(
    filters: MedicalReportFilters = {},
  ): Promise<MedicalReportDTO[]> {
    let query = supabase
      .from('medical_reports')
      .select(
        `
        *,
        patient:patients(*),
        creator:staff!medical_reports_created_by_fkey(*),
        approver:staff!medical_reports_approved_by_fkey(*)
      `,
      )
      .order('created_at', { ascending: false });

    if (filters.search) {
      const safeSearch = sanitizeFilterValue(filters.search);
      query = query.or(
        `document_number.ilike.%${safeSearch}%,report_title.ilike.%${safeSearch}%`,
      );
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.report_type) {
      query = query.eq('report_type', filters.report_type);
    }

    if (filters.patient_id) {
      const canonicalPatientId = await resolveMedicalReportPatientIdOrNull(
        filters.patient_id,
      );
      if (!canonicalPatientId) {
        return [];
      }
      query = query.eq('patient_id', canonicalPatientId);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as MedicalReportRow[]).map((row) =>
      normalizeMedicalReportRow(row),
    );
  },

  // Get single report by ID
  async getReportById(reportId: string): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const { data, error } = await supabase
      .from('medical_reports')
      .select(
        `
        *,
        patient:patients(*),
        creator:staff!medical_reports_created_by_fkey(*),
        approver:staff!medical_reports_approved_by_fkey(*)
      `,
      )
      .eq(idColumn, safeReportId)
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(data as MedicalReportRow);
  },

  // Create new medical report
  async createReport(
    data: CreateMedicalReportDTO,
    staffId: string,
  ): Promise<MedicalReportDTO> {
    const canonicalPatientId = await resolveMedicalReportPatientId(
      data.patient_id,
    );

    const payload = {
      ...data,
      patient_id: canonicalPatientId,
      valid_from: normalizeOptionalDate(data.valid_from),
      valid_to: normalizeOptionalDate(data.valid_to),
      created_by: staffId,
      status: 'Draft',
    };

    const { data: report, error } = await supabase
      .from('medical_reports')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Update medical report
  async updateReport(
    reportId: string,
    data: UpdateMedicalReportDTO,
  ): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const payload = {
      ...data,
      valid_from: normalizeOptionalDate(data.valid_from),
      valid_to: normalizeOptionalDate(data.valid_to),
      updated_at: new Date().toISOString(),
    };

    const { data: report, error } = await supabase
      .from('medical_reports')
      .update(payload)
      .eq(idColumn, safeReportId)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Submit report for approval
  async submitForApproval(reportId: string): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const { data: report, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'Pending Approval',
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, safeReportId)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Approve report
  async approveReport(
    reportId: string,
    staffId: string,
  ): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const { data: report, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'Approved',
        approved_by: staffId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, safeReportId)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Issue report (generate document number)
  async issueReport(reportId: string): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const { data: sourceReport, error: sourceError } = await supabase
      .from('medical_reports')
      .select(
        `${idColumn}, report_type, report_title, report_content, valid_from, valid_to, status`,
      )
      .eq(idColumn, safeReportId)
      .single();

    if (sourceError) throw sourceError;

    const issueValidationErrors = validateReportBeforeIssue(
      sourceReport as IssueValidationReport,
    );
    if ((sourceReport as IssueValidationReport).status !== 'Approved') {
      issueValidationErrors.unshift('Only approved reports can be issued.');
    }
    if (issueValidationErrors.length > 0) {
      throw new Error(
        `Cannot issue report:\n- ${issueValidationErrors.join('\n- ')}`,
      );
    }

    // First get report number
    const { data: numberData } = await supabase.rpc('generate_report_number');

    const { data: report, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'Issued',
        document_number: numberData,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, safeReportId)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Revoke report
  async revokeReport(reportId: string): Promise<MedicalReportDTO> {
    const safeReportId = ensureReportIdOrThrow(reportId);
    const idColumn = await resolveMedicalReportIdColumn();

    const { data: report, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'Revoked',
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, safeReportId)
      .select()
      .single();

    if (error) throw error;
    return normalizeMedicalReportRow(report as MedicalReportRow);
  },

  // Get report statistics
  async getStats(): Promise<MedicalReportStatsDTO> {
    const today = new Date().toISOString().split('T')[0];
    const idColumn = await resolveMedicalReportIdColumn();

    const [totalRes, pendingRes, approvedRes, issuedTodayRes] =
      await Promise.all([
        supabase
          .from('medical_reports')
          .select(idColumn, { count: 'exact', head: true }),
        supabase
          .from('medical_reports')
          .select(idColumn, { count: 'exact', head: true })
          .eq('status', 'Pending Approval'),
        supabase
          .from('medical_reports')
          .select(idColumn, { count: 'exact', head: true })
          .eq('status', 'Approved'),
        supabase
          .from('medical_reports')
          .select(idColumn, { count: 'exact', head: true })
          .eq('status', 'Issued')
          .gte('issued_at', today),
      ]);

    return {
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      approved: approvedRes.count || 0,
      issued_today: issuedTodayRes.count || 0,
    };
  },

  // Get report templates
  async getTemplates(): Promise<ReportTemplateDTO[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('report_type');

    if (error) throw error;
    return data as ReportTemplateDTO[];
  },

  // Get template by type
  async getTemplateByType(
    reportType: string,
  ): Promise<ReportTemplateDTO | null> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('report_type', reportType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as ReportTemplateDTO | null;
  },
};
