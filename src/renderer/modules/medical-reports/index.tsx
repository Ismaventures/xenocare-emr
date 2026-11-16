import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  CheckCircle,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  DataTable,
  EmptyState,
  StatsCard,
  StatusBadge,
  Tabs,
} from '../../components/ui/DataDisplay';
import { Button, Input, Select } from '../../components/ui/FormElements';
import { Modal } from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';
import {
  useMedicalReports,
  useMedicalReportStats,
} from './hooks/useMedicalReports';
import { usePatients } from '../patient-registration/hooks/usePatient';
import { MedicalReportForm } from './components/MedicalReportForm';
import { MedicalReportDetail } from './components/MedicalReportDetail';
import {
  MedicalReportDTO,
  REPORT_TYPES,
  getReportStatusColor,
  getReportTypeLabel,
} from './dtos/medical-reports.dto';

export default function MedicalReports() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPatientFilter = searchParams.get('patientId') || '';

  const [activeTab, setActiveTab] = useState('reports');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MedicalReportDTO | null>(
    null,
  );
  const [showReportDetail, setShowReportDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState(initialPatientFilter);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  const { data: patientsData } = usePatients({ query: patientSearchTerm });
  const patients = useMemo(() => {
    if (!patientsData) return [];
    if (Array.isArray(patientsData)) return patientsData;
    if (
      typeof patientsData === 'object' &&
      patientsData !== null &&
      'patients' in patientsData &&
      Array.isArray((patientsData as { patients: unknown[] }).patients)
    ) {
      return (
        patientsData as {
          patients: Array<{
            id?: string;
            patient_id: string;
            first_name: string;
            surname: string;
            emr_number?: string;
          }>;
        }
      ).patients;
    }
    return [];
  }, [patientsData]);

  const { data: reports, isLoading: loadingReports } = useMedicalReports({
    search: searchTerm,
    status: statusFilter,
    report_type: typeFilter,
    patient_id: patientFilter || undefined,
  });
  const { data: stats } = useMedicalReportStats();

  useEffect(() => {
    const currentPatientParam = searchParams.get('patientId') || '';
    if (currentPatientParam === patientFilter) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (patientFilter) {
      next.set('patientId', patientFilter);
    } else {
      next.delete('patientId');
    }
    setSearchParams(next, { replace: true });
  }, [patientFilter, searchParams, setSearchParams]);

  const handleViewReport = (report: MedicalReportDTO) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  };

  const tabs = [
    { id: 'reports', label: 'Medical Reports' },
    {
      id: 'templates',
      label: 'Templates',
      disabled: !hasRole(['super_admin', 'admin', 'medical_director']),
    },
  ];

  const columns = [
    {
      key: 'document_number',
      header: 'Document #',
      render: (report: MedicalReportDTO) => (
        <span className="font-medium text-gray-900">
          {report.document_number || 'Draft'}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (report: MedicalReportDTO) => (
        <div>
          <p className="text-sm text-gray-900">
            {report.patient?.first_name} {report.patient?.surname}
          </p>
          <p className="text-xs text-gray-500">
            {report.patient?.contact_phone}
          </p>
        </div>
      ),
    },
    {
      key: 'report_type',
      header: 'Type',
      render: (report: MedicalReportDTO) => (
        <span className="text-sm">
          {getReportTypeLabel(report.report_type)}
        </span>
      ),
    },
    {
      key: 'report_title',
      header: 'Title',
      render: (report: MedicalReportDTO) => (
        <span className="text-sm text-gray-700">{report.report_title}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report: MedicalReportDTO) => (
        <StatusBadge
          status={report.status}
          color={getReportStatusColor(report.status)}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (report: MedicalReportDTO) => (
        <span className="text-sm text-gray-500">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (report: MedicalReportDTO) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewReport(report)}
          >
            View
          </Button>
          {report.status === 'Issued' && report.document_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(report.document_url!, '_blank')}
            >
              <Download size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const canCreate = hasRole([
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
  ]);

  let tableContent: React.ReactNode;
  if (loadingReports && !reports) {
    tableContent = (
      <div className="p-4">
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  } else if (reports && reports.length > 0) {
    tableContent = <DataTable columns={columns} data={reports} />;
  } else {
    tableContent = (
      <EmptyState
        icon={FileText}
        title="No medical reports"
        description="Create a new medical report to get started"
        action={
          canCreate ? (
            <Button onClick={() => setShowCreateForm(true)} icon={Plus}>
              New Report
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Reports</h1>
          <p className="text-gray-500">
            Generate and manage medical certificates and reports
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateForm(true)} icon={Plus}>
            New Report
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Reports"
          value={stats?.total || 0}
          icon={FileText}
        />
        <StatsCard
          title="Pending Approval"
          value={stats?.pending || 0}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Approved"
          value={stats?.approved || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Issued Today"
          value={stats?.issued_today || 0}
          icon={FileCheck}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow">
          {/* Filters */}
          <div className="p-4 border-b flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by patient name or document number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={Search}
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[{ value: '', label: 'All Types' }, ...REPORT_TYPES]}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Pending Approval', label: 'Pending Approval' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Issued', label: 'Issued' },
                { value: 'Revoked', label: 'Revoked' },
              ]}
            />

            <div className="w-full md:w-[320px]">
              <Input
                placeholder="Track reports by patient name / EMR"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                leftIcon={Search}
              />
              {patientSearchTerm && patients.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg bg-white">
                  {patients.slice(0, 8).map((patient) => (
                    <button
                      key={patient.id || patient.patient_id}
                      type="button"
                      onClick={() => {
                        setPatientFilter(patient.id || patient.patient_id);
                        setPatientSearchTerm(
                          `${patient.first_name} ${patient.surname}`,
                        );
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <p className="text-sm text-gray-900">
                        {patient.first_name} {patient.surname}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient.emr_number || patient.patient_id}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {patientFilter && (
              <Button
                variant="outline"
                onClick={() => {
                  setPatientFilter('');
                  setPatientSearchTerm('');
                }}
              >
                Clear Patient Filter
              </Button>
            )}
          </div>

          {patientFilter && (
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700">
              Tracking reports for selected patient only.
            </div>
          )}

          {/* Table */}
          {tableContent}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Create Medical Report"
          size="xl"
        >
          <MedicalReportForm
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </Modal>
      )}

      {/* Report Detail Modal */}
      {showReportDetail && selectedReport && (
        <Modal
          isOpen={showReportDetail}
          onClose={() => setShowReportDetail(false)}
          title="Medical Report Details"
          size="xl"
        >
          <MedicalReportDetail
            report={selectedReport}
            onClose={() => setShowReportDetail(false)}
          />
        </Modal>
      )}
    </div>
  );
}
