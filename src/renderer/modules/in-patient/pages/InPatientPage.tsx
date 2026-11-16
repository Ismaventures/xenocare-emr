// =============================================================================
// XENOCARE EMR - In-Patient Module Main Page
// Ward management and patient admissions dashboard
// =============================================================================

import React, { useState } from 'react';
import {
  Building2,
  Bed,
  Users,
  Activity,
  AlertTriangle,
  AlertCircle,
  Plus,
  X,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import WardDashboard from '../components/WardDashboard';
import BedManagement from '../components/BedManagement';
import AdmissionForm from '../components/AdmissionForm';
import MasterAdmissionsTable from '../components/MasterAdmissionsTable';
import DischargeForm from '../components/DischargeForm';
import TransferBedModal from '../components/TransferBedModal';
import { AdmissionCareModal } from '../components/AdmissionCareModal';
import BedTransferModal from '../components/BedTransferModal';
import WardRoundNoteForm from '../components/WardRoundNoteForm';
import EditCareTeamModal from '../components/EditCareTeamModal';
import PendingAdmissions from '../components/PendingAdmissions';
import AddWardModal from '../components/AddWardModal';
import AddBedModal from '../components/AddBedModal';
import { useWardCensus } from '../hooks/useWards';
import {
  useAdmissionStatistics,
  useActiveAdmissions,
  usePendingAdmissionRequests,
} from '../hooks/useAdmissions';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import type {
  AdmissionWithDetails,
  ActiveAdmissionView,
} from '../../../types/database.types';

type TabType = 'pending' | 'dashboard' | 'admissions' | 'beds';

// Helper to convert ActiveAdmissionView to AdmissionWithDetails format
function toAdmissionWithDetails(
  admission: ActiveAdmissionView,
): AdmissionWithDetails {
  return {
    id: admission.admission_id,
    facility_id: admission.facility_id,
    patient_id: admission.patient_id,
    encounter_id: admission.encounter_id || null, // Updated to pass encounter_id
    admission_number: admission.admission_number,
    admission_date: admission.admission_date,
    expected_discharge_date: admission.expected_discharge_date,
    actual_discharge_date: null,
    admission_type: admission.admission_type,
    admission_source: null,
    current_ward_id: null,
    current_bed_id: null,
    admitting_diagnosis: admission.admitting_diagnosis,
    admitting_diagnosis_icd10: null,
    secondary_diagnoses: [],
    chief_complaint: null,
    acuity_level: admission.acuity_level,
    admission_status: admission.admission_status,
    discharge_type: null,
    discharge_disposition: null,
    discharge_summary: null,
    discharge_instructions: null,
    follow_up_required: false,
    follow_up_details: null,
    admitting_doctor_id: null,
    attending_physician_id: null,
    primary_nurse_id: null,
    care_team: [],
    special_requirements: [],
    isolation_required: false,
    isolation_type: null,
    isolation_reason: null,
    code_status: 'full_code',
    allergies_verified: false,
    advance_directives: false,
    discharge_planning_started: false,
    estimated_los_days: null,
    alerts: [],
    discharged_by: null,
    created_by: null,
    updated_by: null,
    created_at: admission.admission_date,
    updated_at: admission.admission_date,
    // Additional required fields
    reason_for_admission: admission.admitting_diagnosis || null,
    fall_risk_level: null,
    pressure_ulcer_risk: null,
    allergies_snapshot: null,
    medication_reconciliation_done: false,
    diet_type: null,
    diet_restrictions: null,
    activity_level: null,
    mobility_status: null,
    oxygen_requirement: null,
    iv_access: null,
    catheter: null,
    wound_care_required: false,
    pain_management_plan: null,
    discharge_diagnosis: null,
    discharge_diagnosis_icd10: null,
    follow_up_appointments: [],
    discharge_medications: [],
    insurance_verified: false,
    pre_authorization_number: null,
    estimated_cost: null,
    notes: null,
    patient: {
      id: admission.patient_id,
      patient_id: admission.patient_id,
      emr_number: admission.hospital_id,
      first_name: admission.first_name,
      middle_name: null,
      surname: admission.last_name,
      gender: admission.gender,
      date_of_birth: admission.date_of_birth,
      nationality: null,
      state_of_origin: null,
      lga: null,
      contact_phone: null,
      email: null,
      residential_address: null,
      nok_name: null,
      nok_relationship: null,
      nok_phone: null,
      nok_address: null,
      patient_category: null,
      insurance_type: null,
      patient_type: null,
      principal_id: null,
      relationship_to_principal: null,
      staff_category: null,
      military_branch: null,
      rank: null,
      service_number: null,
      unit: null,
      occupation: null,
      employer: null,
      nhis_number: null,
      national_id: null,
      nhis_patient_source: null,
      referral_code: null,
      referring_facility_name: null,
      referring_facility_nhis_id: null,
      is_active: true,
      blood_group: null,
      genotype: null,
      marital_status: null,
      religion: null,
      created_at: admission.admission_date,
      updated_at: admission.admission_date,
    },
    current_ward: admission.ward_name
      ? {
          id: '',
          name: admission.ward_name,
          ward_type: admission.ward_type || 'general',
        }
      : undefined,
    current_bed: admission.bed_number
      ? {
          id: '',
          bed_number: admission.bed_number,
          bed_type: 'standard',
        }
      : undefined,
  } as unknown as AdmissionWithDetails;
}

const InPatientPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [preSelectedBedId, setPreSelectedBedId] = useState<string>('');
  const [selectedAdmission, setSelectedAdmission] =
    useState<AdmissionWithDetails | null>(null);
  const [showDischargeForm, setShowDischargeForm] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWardRoundModal, setShowWardRoundModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showEditCareTeamModal, setShowEditCareTeamModal] = useState(false);
  const [showAddWardModal, setShowAddWardModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [selectedAdmissionForModal, setSelectedAdmissionForModal] = useState<
    AdmissionWithDetails | ActiveAdmissionView | null
  >(null);

  const {
    data: wardCensus,
    isLoading: censusLoading,
    refetch: refetchWardCensus,
  } = useWardCensus();
  const { data: admissionStats } = useAdmissionStatistics();
  const { refetch: refetchAdmissions } = useActiveAdmissions();
  const { data: pendingAdmissions = [] } = usePendingAdmissionRequests();

  const pendingCount = pendingAdmissions.length;

  const tabs = [
    {
      id: 'pending' as TabType,
      label: 'Pending Admissions',
      icon: ClipboardList,
      badge: pendingCount,
    },
    { id: 'dashboard' as TabType, label: 'Ward Dashboard', icon: Building2 },
    { id: 'admissions' as TabType, label: 'Active Patients', icon: Users },
    { id: 'beds' as TabType, label: 'Bed Management', icon: Bed },
  ];

  // Calculate summary stats
  const totalBeds = wardCensus?.reduce((sum, w) => sum + w.total_beds, 0) || 0;
  const occupiedBeds =
    wardCensus?.reduce((sum, w) => sum + w.occupied_beds, 0) || 0;
  const criticalPatients =
    wardCensus?.reduce((sum, w) => sum + w.critical_patients, 0) || 0;
  const isolationPatients =
    wardCensus?.reduce((sum, w) => sum + w.isolation_patients, 0) || 0;

  const handleAdmitPatient = () => {
    setShowAdmissionModal(true);
  };

  const handleDischargePatient = (admission: any) => {
    // Convert ActiveAdmissionView to AdmissionWithDetails if needed
    if (admission.admission_id) {
      setSelectedAdmission(
        toAdmissionWithDetails(admission as ActiveAdmissionView),
      );
    } else {
      setSelectedAdmission(admission as AdmissionWithDetails);
    }
    setShowDischargeForm(true);
  };

  const handleTransferPatient = (admission: any) => {
    // Convert ActiveAdmissionView to AdmissionWithDetails if needed
    if (admission.admission_id) {
      setSelectedAdmissionForModal(
        toAdmissionWithDetails(admission as ActiveAdmissionView),
      );
    } else {
      setSelectedAdmissionForModal(admission as AdmissionWithDetails);
    }
    setShowTransferModal(true);
  };

  const handleViewDetails = (admission: any) => {
    // Convert ActiveAdmissionView to AdmissionWithDetails if needed
    if (admission.admission_id) {
      setSelectedAdmissionForModal(
        toAdmissionWithDetails(admission as ActiveAdmissionView),
      );
    } else {
      setSelectedAdmissionForModal(admission as AdmissionWithDetails);
    }
    setShowDetailsModal(true);
  };

  const handleWardRound = (admission: any) => {
    // Convert ActiveAdmissionView to AdmissionWithDetails if needed
    if (admission.admission_id) {
      setSelectedAdmissionForModal(
        toAdmissionWithDetails(admission as ActiveAdmissionView),
      );
    } else {
      setSelectedAdmissionForModal(admission as AdmissionWithDetails);
    }
    setShowWardRoundModal(true);
  };

  const handleEditCareTeam = (admission: any) => {
    // Convert ActiveAdmissionView to AdmissionWithDetails if needed
    if (admission.admission_id) {
      setSelectedAdmissionForModal(admission as ActiveAdmissionView);
    } else {
      setSelectedAdmissionForModal(admission as AdmissionWithDetails);
    }
    setShowEditCareTeamModal(true);
  };

  // Handler for viewing admission history details (handles any admission-like object)
  const handleViewHistoryDetails = (admission: any) => {
    // Cast to AdmissionWithDetails for the modal (structure is compatible)
    setSelectedAdmissionForModal(admission as AdmissionWithDetails);
    setShowDetailsModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailsModal(false);
    setShowTransferModal(false);
    setShowWardRoundModal(false);
    setShowEditCareTeamModal(false);
    setSelectedAdmissionForModal(null);
  };

  const handleTransferFromDetails = () => {
    setShowDetailsModal(false);
    setShowTransferModal(true);
  };

  const handleWardRoundFromDetails = () => {
    setShowDetailsModal(false);
    setShowWardRoundModal(true);
  };

  const handleDischargeFromDetails = () => {
    if (selectedAdmissionForModal) {
      // Handle both AdmissionWithDetails and ActiveAdmissionView types
      if ('admission_id' in selectedAdmissionForModal) {
        setSelectedAdmission(
          toAdmissionWithDetails(
            selectedAdmissionForModal as ActiveAdmissionView,
          ),
        );
      } else {
        setSelectedAdmission(selectedAdmissionForModal as AdmissionWithDetails);
      }
      setShowDetailsModal(false);
      setSelectedAdmissionForModal(null);
      setShowDischargeForm(true);
    }
  };

  const handleTransferSuccess = () => {
    refetchAdmissions();
    handleCloseModals();
  };

  const handleViewWard = (wardId: string) => {
    setSelectedWardId(wardId);
    setActiveTab('beds');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              In-Patient Management
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Ward management, admissions, and bed tracking
            </p>
          </div>
          <button
            onClick={handleAdmitPatient}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            New Admission
          </button>
        </div>

        {/* Stats Pills - Compact */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2.5 border border-blue-200">
            <div className="bg-blue-500 p-2 rounded-md">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-900 leading-tight">
                {admissionStats?.totalActive || 0}
              </p>
              <p className="text-xs text-blue-600 font-medium">
                Total Patients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-2.5 border border-green-200">
            <div className="bg-green-500 p-2 rounded-md">
              <Bed className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-900 leading-tight">
                {occupiedBeds}/{totalBeds}
              </p>
              <p className="text-xs text-green-600 font-medium">
                Bed Occupancy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-purple-50 rounded-lg px-4 py-2.5 border border-purple-200">
            <div className="bg-purple-500 p-2 rounded-md">
              <LogOut className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-900 leading-tight">
                {admissionStats?.monthlyDischarges || 0}
              </p>
              <p className="text-xs text-purple-600 font-medium">
                Discharged (Month)
              </p>
            </div>
          </div>

          {criticalPatients > 0 && (
            <div className="flex items-center gap-3 bg-red-50 rounded-lg px-4 py-2.5 border border-red-300 animate-pulse">
              <div className="bg-red-500 p-2 rounded-md">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-900 leading-tight">
                  {criticalPatients}
                </p>
                <p className="text-xs text-red-600 font-medium">Critical</p>
              </div>
            </div>
          )}

          {isolationPatients > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 rounded-lg px-4 py-2.5 border border-amber-200">
              <div className="bg-amber-500 p-2 rounded-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-900 leading-tight">
                  {isolationPatients}
                </p>
                <p className="text-xs text-amber-600 font-medium">Isolation</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-sm w-fit mt-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area - with custom scrollbar */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        {activeTab === 'pending' && (
          <>
            <InlineGuidance
              module="in-patient"
              title="Admission Requests"
              message="Process incoming admission requests from doctors. Assign wards and beds to waiting patients."
            />
            <PendingAdmissions />
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <InlineGuidance
              module="in-patient"
              title="Ward Overview"
              message="Bed occupancy and ward status. Manage beds and ward configurations here."
            />
            <WardDashboard
              wardCensus={wardCensus || []}
              isLoading={censusLoading}
              onViewWard={handleViewWard}
              onAdmitPatient={() => setShowAdmissionModal(true)}
              onAddWard={() => setShowAddWardModal(true)}
              onAddBed={() => setShowAddBedModal(true)}
            />
          </>
        )}

        {activeTab === 'admissions' && (
          <>
            <InlineGuidance
              module="in-patient"
              title="Active Patients"
              message="List of all currently admitted patients. Access clinical notes, nursing charts, and discharge tools."
            />
            <MasterAdmissionsTable
              onViewDetails={handleViewDetails}
              onDischarge={handleDischargePatient}
              onTransfer={handleTransferPatient}
              onWardRound={handleWardRound}
              onEditCareTeam={handleEditCareTeam}
            />
          </>
        )}

        {activeTab === 'beds' && (
          <>
            <InlineGuidance
              module="in-patient"
              title="Bed Management"
              message="Detailed bed availability and maintenance status."
            />
            <BedManagement
              wardId={selectedWardId}
              onWardChange={setSelectedWardId}
              onAdmitToBed={(bedId) => {
                setPreSelectedBedId(bedId);
                setShowAdmissionModal(true);
              }}
              onAddBed={() => setShowAddBedModal(true)}
            />
          </>
        )}

        {/* Discharge Modal */}
        {showDischargeForm && selectedAdmission && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <DischargeForm
                admission={selectedAdmission}
                onSuccess={() => {
                  setShowDischargeForm(false);
                  setSelectedAdmission(null);
                  refetchAdmissions();
                }}
                onCancel={() => {
                  setShowDischargeForm(false);
                  setSelectedAdmission(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && selectedAdmission && (
          <TransferBedModal
            admission={selectedAdmission}
            onSuccess={() => {
              setShowTransferModal(false);
              setSelectedAdmission(null);
              refetchAdmissions();
            }}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedAdmission(null);
            }}
          />
        )}
      </div>

      {/* View Details Modal */}
      <AdmissionCareModal
        admission={selectedAdmissionForModal}
        isOpen={showDetailsModal}
        onClose={handleCloseModals}
        onTransfer={handleTransferFromDetails}
        onDischarge={handleDischargeFromDetails}
        onWardRound={handleWardRoundFromDetails}
      />

      {/* Bed Transfer Modal */}
      <BedTransferModal
        admission={selectedAdmissionForModal}
        isOpen={showTransferModal}
        onClose={handleCloseModals}
        onSuccess={handleTransferSuccess}
      />

      {/* Ward Round Modal */}
      {showWardRoundModal && selectedAdmissionForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <WardRoundNoteForm
                admission={selectedAdmissionForModal as AdmissionWithDetails}
                onSuccess={() => {
                  handleCloseModals();
                  refetchAdmissions();
                }}
                onCancel={handleCloseModals}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Admission Modal */}
      {showAdmissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  New Admission
                </h2>
                <p className="text-sm text-blue-100">
                  XenoCare - Patient Admission
                </p>
              </div>
              <button
                onClick={() => setShowAdmissionModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <AdmissionForm
                onSuccess={() => {
                  setShowAdmissionModal(false);
                  setPreSelectedBedId('');
                  refetchAdmissions();
                }}
                onCancel={() => {
                  setShowAdmissionModal(false);
                  setPreSelectedBedId('');
                }}
                initialWardId={selectedWardId || undefined}
                initialBedId={preSelectedBedId || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Care Team Modal */}
      <EditCareTeamModal
        admission={selectedAdmissionForModal}
        isOpen={showEditCareTeamModal}
        onClose={handleCloseModals}
        onSuccess={() => {
          refetchAdmissions();
        }}
      />

      {/* Add Ward Modal */}
      <AddWardModal
        isOpen={showAddWardModal}
        onClose={() => setShowAddWardModal(false)}
        onSuccess={() => {
          refetchWardCensus();
        }}
      />

      {/* Add Bed Modal */}
      <AddBedModal
        isOpen={showAddBedModal}
        onClose={() => setShowAddBedModal(false)}
        onSuccess={() => {
          refetchWardCensus();
        }}
        preSelectedWardId={selectedWardId}
      />
    </div>
  );
};

export default InPatientPage;
