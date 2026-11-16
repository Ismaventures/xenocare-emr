import React, { useState } from 'react';
import {
  FileText,
  User,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Send,
  Printer,
  AlertTriangle,
  Lock,
  Plus,
} from 'lucide-react';
import { Button, Textarea } from '../../../components/ui/FormElements';
import { StatusBadge } from '../../../components/ui/DataDisplay';
import {
  MedicalReportDTO,
  getReportStatusColor,
  getReportTypeLabel,
} from '../dtos/medical-reports.dto';
import {
  useSubmitForApproval,
  useApproveReport,
  useIssueReport,
  useRevokeReport,
  useUpdateMedicalReport,
} from '../hooks/useMedicalReports';
import { useAuth } from '../../../contexts/AuthContext';
import { printMedicalReport } from '../utils/medicalReportPrint';
import {
  openMedicalReportPdf,
  downloadMedicalReportPdf,
} from '../utils/medicalReportPdf';
import { useToast } from '../../../components/ui/Toast';

interface MedicalReportDetailProps {
  report: MedicalReportDTO;
  onClose: () => void;
}

const PLACEHOLDER_REGEX = /\[[^\]\n]{2,}\]|\{[^}\n]{2,}\}/g;

function stripHtmlTags(value: string): string {
  return value
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateIssueReadiness(report: MedicalReportDTO): string[] {
  const errors: string[] = [];
  const title = (report.report_title || '').trim();
  const rawContent = report.report_content || '';
  const plainContent = stripHtmlTags(rawContent);

  if (!title) {
    errors.push('Report title is missing.');
  }

  if (!plainContent || plainContent.length < 80) {
    errors.push('Report content is too short for issuance.');
  }

  const placeholders = rawContent.match(PLACEHOLDER_REGEX) || [];
  if (placeholders.length > 0) {
    const sample = placeholders.slice(0, 3).join(', ');
    errors.push(`Report still contains unresolved placeholders (${sample}).`);
  }

  const requiresValidityRange =
    report.report_type === 'Sick Leave' ||
    report.report_type === 'Medical Certificate' ||
    report.report_type === 'Fitness Report';

  if (requiresValidityRange && !report.valid_from) {
    errors.push('Valid From date is required for this report type.');
  }
  if (requiresValidityRange && !report.valid_to) {
    errors.push('Valid To date is required for this report type.');
  }

  return errors;
}

export function MedicalReportDetail({
  report,
  onClose,
}: MedicalReportDetailProps) {
  const { hasRole, staff } = useAuth();
  const { showToast } = useToast();
  const submitForApproval = useSubmitForApproval();
  const approveReport = useApproveReport();
  const issueReport = useIssueReport();
  const revokeReport = useRevokeReport();
  const updateReport = useUpdateMedicalReport();

  const [isAddingAddendum, setIsAddingAddendum] = useState(false);
  const [addendumText, setAddendumText] = useState('');

  const resolveReportId = (): string => {
    const resolved = report.report_id || report.id;
    if (!resolved || resolved === 'undefined' || resolved === 'null') {
      throw new Error(
        'Report ID is missing. Refresh reports and reopen this record.',
      );
    }
    return resolved;
  };

  const handleSubmit = () => {
    let reportId: string;
    try {
      reportId = resolveReportId();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Submit Failed',
        message:
          error instanceof Error ? error.message : 'Could not submit report.',
      });
      return;
    }

    onClose();
    showToast({
      type: 'info',
      title: 'Submitting In Background',
      message: 'This report is being submitted while you continue working.',
    });

    void submitForApproval
      .mutateAsync(reportId)
      .then(() => {
        showToast({
          type: 'success',
          title: 'Submitted for Approval',
          message: 'Report has been submitted successfully.',
        });
      })
      .catch((error) => {
        console.error('Failed to submit:', error);
        showToast({
          type: 'error',
          title: 'Submit Failed',
          message:
            error instanceof Error ? error.message : 'Could not submit report.',
        });
      });
  };

  const handleApprove = () => {
    let reportId: string;
    try {
      reportId = resolveReportId();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Approval Failed',
        message:
          error instanceof Error ? error.message : 'Could not approve report.',
      });
      return;
    }

    onClose();
    showToast({
      type: 'info',
      title: 'Approving In Background',
      message: 'Approval is queued and will finish in the background.',
    });

    void approveReport
      .mutateAsync(reportId)
      .then(() => {
        showToast({
          type: 'success',
          title: 'Report Approved',
          message: 'Report approved successfully.',
        });
      })
      .catch((error) => {
        console.error('Failed to approve:', error);
        showToast({
          type: 'error',
          title: 'Approval Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Could not approve report.',
        });
      });
  };

  const handleIssue = () => {
    const validationErrors = validateIssueReadiness(report);
    if (validationErrors.length > 0) {
      showToast({
        type: 'error',
        title: 'Issue Blocked',
        message: `Cannot issue report:\n- ${validationErrors.join('\n- ')}`,
      });
      return;
    }

    let reportId: string;
    try {
      reportId = resolveReportId();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Issue Failed',
        message:
          error instanceof Error ? error.message : 'Could not issue report.',
      });
      return;
    }

    onClose();
    showToast({
      type: 'info',
      title: 'Issuing In Background',
      message:
        'Issuance is queued. You can continue using the app immediately.',
    });

    void issueReport
      .mutateAsync(reportId)
      .then(() => {
        showToast({
          type: 'success',
          title: 'Report Issued',
          message: 'Report has been issued and is ready for official use.',
        });
      })
      .catch((error) => {
        console.error('Failed to issue:', error);
        showToast({
          type: 'error',
          title: 'Issue Failed',
          message:
            error instanceof Error ? error.message : 'Could not issue report.',
        });
      });
  };

  const handleRevoke = () => {
    if (!confirm('Are you sure you want to revoke this report?')) return;

    let reportId: string;
    try {
      reportId = resolveReportId();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Revoke Failed',
        message:
          error instanceof Error ? error.message : 'Could not revoke report.',
      });
      return;
    }

    onClose();
    showToast({
      type: 'info',
      title: 'Revoking In Background',
      message: 'Revoke action is queued and syncing in the background.',
    });

    void revokeReport
      .mutateAsync(reportId)
      .then(() => {
        showToast({
          type: 'warning',
          title: 'Report Revoked',
          message: 'Report has been revoked.',
        });
      })
      .catch((error) => {
        console.error('Failed to revoke:', error);
        showToast({
          type: 'error',
          title: 'Revoke Failed',
          message:
            error instanceof Error ? error.message : 'Could not revoke report.',
        });
      });
  };

  const handlePrint = () => {
    try {
      const printedByName = [staff?.first_name, staff?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      printMedicalReport(report, {
        printedByName: printedByName || undefined,
      });
    } catch (error) {
      console.error('Failed to print report:', error);
      window.print();
    }
  };

  const getGeneratedByName = () =>
    [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim();

  const handleSaveAddendum = async () => {
    if (!addendumText.trim()) return;
    try {
      const timestamp = new Date().toLocaleString();
      const clinicianName = getGeneratedByName();
      const addendumHtml = `\n<br/>\n<hr/>\n<p><strong>ADDENDUM: ${timestamp} - ${clinicianName}</strong></p>\n<p>${addendumText.replace(/\n/g, '<br/>')}</p>`;

      await updateReport.mutateAsync({
        reportId: resolveReportId(),
        data: {
          report_content: report.report_content + addendumHtml,
        },
      });

      showToast({
        type: 'success',
        title: 'Addendum Saved',
        message:
          'The clinical addendum was successfully attached to the report.',
      });
      setIsAddingAddendum(false);
      setAddendumText('');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save the addendum.',
      });
    }
  };

  const handleViewPdf = () => {
    showToast({
      type: 'info',
      title: 'Generating PDF',
      message: 'Opening preview in a new tab...',
    });

    void openMedicalReportPdf(report, {
      generatedByName: getGeneratedByName() || undefined,
    })
      .then(() => {
        showToast({
          type: 'success',
          title: 'PDF Preview Opened',
          message: 'The report PDF has been opened in a new tab.',
        });
      })
      .catch((error) => {
        console.error('Failed to open PDF:', error);
        showToast({
          type: 'error',
          title: 'PDF Preview Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Could not open PDF preview.',
        });
      });
  };

  const handleDownloadPdf = () => {
    showToast({
      type: 'info',
      title: 'Preparing Download',
      message: 'Your PDF is being generated in background.',
    });

    void downloadMedicalReportPdf(report, {
      generatedByName: getGeneratedByName() || undefined,
    })
      .then(() => {
        showToast({
          type: 'success',
          title: 'PDF Download Started',
          message: 'Your report PDF download has started.',
        });
      })
      .catch((error) => {
        console.error('Failed to download PDF:', error);
        showToast({
          type: 'error',
          title: 'Download Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Could not download report PDF.',
        });
      });
  };

  return (
    <div className="space-y-6">
      {/* Status Banners for Clinical Safety */}
      {report.status === 'Draft' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex items-start">
          <AlertTriangle
            className="text-amber-600 mr-3 mt-0.5 flex-shrink-0"
            size={20}
          />
          <div>
            <h4 className="text-amber-800 font-semibold mb-1">
              DRAFT DOCUMENT - NOT FOR CLINICAL USE
            </h4>
            <p className="text-amber-700 text-sm">
              This report is currently in Draft status. Any exported PDFs will
              be heavily watermarked. It must be submitted and approved before
              it can be officially issued or electronically signed.
            </p>
          </div>
        </div>
      )}

      {report.status === 'Issued' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md flex items-start">
          <Lock
            className="text-green-600 mr-3 mt-0.5 flex-shrink-0"
            size={20}
          />
          <div>
            <h4 className="text-green-800 font-semibold mb-1">
              FINALIZED & LOCKED
            </h4>
            <p className="text-green-700 text-sm">
              This report has been officially issued and electronically signed.
              The clinical contents are permanently locked and cannot be edited.
            </p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="text-primary-600" size={24} />
            <h2 className="text-xl font-semibold">{report.report_title}</h2>
          </div>
          <p className="text-gray-500 mt-1">
            {report.document_number || 'Not yet issued'}
          </p>
        </div>
        <StatusBadge
          status={report.status}
          color={getReportStatusColor(report.status)}
        />
      </div>

      {/* Report Details Grid */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Patient</p>
          <p className="font-medium">
            {report.patient?.first_name} {report.patient?.surname}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Report Type</p>
          <p className="font-medium">
            {getReportTypeLabel(report.report_type)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created By</p>
          <p className="font-medium">
            {report.creator?.first_name} {report.creator?.last_name}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created On</p>
          <p className="font-medium">
            {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>
        {report.valid_from && (
          <div>
            <p className="text-sm text-gray-500">Valid From</p>
            <p className="font-medium">
              {new Date(report.valid_from).toLocaleDateString()}
            </p>
          </div>
        )}
        {report.valid_to && (
          <div>
            <p className="text-sm text-gray-500">Valid To</p>
            <p className="font-medium">
              {new Date(report.valid_to).toLocaleDateString()}
            </p>
          </div>
        )}
        {report.approved_by && (
          <>
            <div>
              <p className="text-sm text-gray-500">Approved By</p>
              <p className="font-medium">
                {report.approver?.first_name} {report.approver?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved On</p>
              <p className="font-medium">
                {report.approved_at &&
                  new Date(report.approved_at).toLocaleDateString()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Report Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Report Content
        </h3>
        <div
          className="bg-white border rounded-lg p-4 prose max-w-none text-sm text-gray-800"
          dangerouslySetInnerHTML={{ __html: report.report_content }}
        />
      </div>

      {/* Addendum Form (Active only on Finalized reports) */}
      {isAddingAddendum && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
            <Plus size={16} className="mr-2" /> Append Addendum
          </h4>
          <Textarea
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            placeholder="Type your official addendum here..."
            rows={4}
            className="mb-3"
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingAddendum(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAddendum}
              isLoading={updateReport.isPending}
            >
              Save Addendum
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleViewPdf}>
            <Eye size={16} className="mr-2" />
            View PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download size={16} className="mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print / Save PDF
          </Button>
          {report.status === 'Issued' && report.document_url && (
            <Button
              variant="outline"
              onClick={() => window.open(report.document_url!, '_blank')}
            >
              <Download size={16} className="mr-2" />
              Open Stored File
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {/* Create Addendum Button for issued reports */}
          {report.status === 'Issued' &&
            hasRole(['doctor', 'medical_director']) &&
            !isAddingAddendum && (
              <Button
                variant="outline"
                onClick={() => setIsAddingAddendum(true)}
              >
                <Plus size={16} className="mr-2" />
                Add Addendum
              </Button>
            )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {/* Draft -> Submit for Approval */}
          {report.status === 'Draft' && (
            <Button
              onClick={handleSubmit}
              isLoading={submitForApproval.isPending}
            >
              <Send size={16} className="mr-2" />
              Submit for Approval
            </Button>
          )}

          {/* Pending Approval -> Approve (Medical Director/Admin only) */}
          {report.status === 'Pending Approval' &&
            hasRole(['super_admin', 'admin', 'medical_director']) && (
              <Button
                onClick={handleApprove}
                isLoading={approveReport.isPending}
              >
                <CheckCircle size={16} className="mr-2" />
                Approve
              </Button>
            )}

          {/* Approved -> Issue */}
          {report.status === 'Approved' &&
            hasRole(['super_admin', 'admin', 'medical_director', 'doctor']) && (
              <Button onClick={handleIssue} isLoading={issueReport.isPending}>
                <FileText size={16} className="mr-2" />
                Issue Report
              </Button>
            )}

          {/* Issued -> Revoke (Admin only) */}
          {report.status === 'Issued' && hasRole(['super_admin', 'admin']) && (
            <Button
              variant="danger"
              onClick={handleRevoke}
              isLoading={revokeReport.isPending}
            >
              <XCircle size={16} className="mr-2" />
              Revoke
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
