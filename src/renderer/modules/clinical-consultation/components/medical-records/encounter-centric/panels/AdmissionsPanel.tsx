/**
 * AdmissionsPanel - Ward admission records with comprehensive details
 * Includes nursing care tracking, ward rounds, and bed/ward information
 */

import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Calendar,
  Users,
  User,
  Stethoscope,
  Heart,
  FileText,
  Clipboard,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Activity,
  ClipboardList,
  ArrowRightLeft,
  Clock,
  AlertCircle,
  Building2,
  Thermometer,
  CheckCircle,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { formatDate, formatDateTime } from '../shared';
import { supabase } from '../../../../../../api/supabaseClient';
import { ClinicalNotesModal } from '../../ClinicalNotesModal';
import { checkEncounterContinuation } from '../../../../../../lib/encounter/continuation';

interface AdmissionsPanelProps {
  encounter: EncounterDetail;
}

export function AdmissionsPanel({ encounter }: AdmissionsPanelProps) {
  const [expandedWardRound, setExpandedWardRound] = useState<string | null>(
    null,
  );
  const [admissionData, setAdmissionData] = useState<any>(null);
  const [wardRounds, setWardRounds] = useState<any[]>([]);
  const [admissionStatus, setAdmissionStatus] = useState<any>(null);
  const [nursingNotes, setNursingNotes] = useState<any[]>([]);
  const [shiftHandovers, setShiftHandovers] = useState<any[]>([]);
  const [bedTransfers, setBedTransfers] = useState<any[]>([]);
  const [vitalsRecords, setVitalsRecords] = useState<any[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<any[]>([]);
  const [dailyProgressNotes, setDailyProgressNotes] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'status' | 'nursing' | 'rounds' | 'history'
  >('status');

  // Fetch admission data, ward rounds, nursing notes, vitals, and admission status for the patient
  useEffect(() => {
    async function fetchAdmissionData() {
      setLoading(true);
      try {
        // Get patient admission status - use maybeSingle() to handle no results gracefully
        const { data: statusData, error: statusError } = await supabase
          .from('patient_admission_status_view')
          .select('*')
          .eq('patient_id', encounter.patient_id)
          .maybeSingle();

        if (!statusError && statusData) {
          setAdmissionStatus(statusData);
        }

        // If currently admitted, get the active admission details
        if (
          statusData?.is_currently_admitted &&
          statusData?.current_admission_id
        ) {
          const { data: admData } = await supabase
            .from('active_admissions_view')
            .select('*')
            .eq('admission_id', statusData.current_admission_id)
            .maybeSingle();

          if (admData) {
            setAdmissionData(admData);
          }

          // Fetch nursing notes for this patient
          const { data: notesData } = await supabase
            .from('nursing_notes')
            .select(
              `
              *,
              nurse:staff!nursing_notes_recorded_by_fkey(first_name, last_name)
            `,
            )
            .eq('patient_id', encounter.patient_id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (notesData) {
            setNursingNotes(notesData);
          }

          // Fetch vitals records for this patient
          const { data: vitalsData } = await supabase
            .from('vitals')
            .select(
              `
              *,
              recorded_by_staff:staff!vitals_nurse_id_fkey(first_name, last_name)
            `,
            )
            .eq('patient_id', encounter.patient_id)
            .order('date_recorded', { ascending: false })
            .limit(30);

          if (vitalsData && vitalsData.length > 0) {
            setVitalsRecords(vitalsData);
            setLatestVitals(vitalsData[0]); // Most recent vitals
          }

          // Fetch doctor notes / ward round notes for this admission
          const { data: doctorNotesData } = await supabase
            .from('ward_round_notes')
            .select(
              `
              *,
              physician:staff!ward_round_notes_attending_physician_id_fkey(first_name, last_name),
              created_by_staff:staff!ward_round_notes_created_by_fkey(first_name, last_name)
            `,
            )
            .eq('admission_id', statusData.current_admission_id)
            .order('round_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20);

          if (doctorNotesData) {
            setDoctorNotes(doctorNotesData);
          }

          // Fetch daily progress notes (clinical notes added by doctors from EncounterCentric)
          const { data: progressNotesData } = await supabase
            .from('daily_progress_notes')
            .select(
              `
              *,
              recorded_by:staff!daily_progress_notes_recorded_by_fkey(first_name, last_name)
            `,
            )
            .eq('patient_id', encounter.patient_id)
            .order('recorded_at', { ascending: false })
            .limit(50);

          if (progressNotesData) {
            setDailyProgressNotes(progressNotesData);
          }

          // Fetch shift handovers for this patient
          const { data: handoversData } = await supabase
            .from('shift_handovers')
            .select(
              `
              *,
              outgoing_nurse:staff!shift_handovers_outgoing_nurse_id_fkey(first_name, last_name),
              incoming_nurse:staff!shift_handovers_incoming_nurse_id_fkey(first_name, last_name)
            `,
            )
            .eq('patient_id', encounter.patient_id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (handoversData) {
            setShiftHandovers(handoversData);
          }

          // Fetch bed transfers for this admission
          const { data: transfersData } = await supabase
            .from('bed_transfers')
            .select(
              `
              *,
              from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
              to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
              from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
              to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
              performed_by_user:staff!bed_transfers_performed_by_fkey(first_name, last_name)
            `,
            )
            .eq('admission_id', statusData.current_admission_id)
            .order('transfer_date', { ascending: false });

          if (transfersData) {
            setBedTransfers(transfersData);
          }
        }

        // Get all ward rounds for the patient (across all admissions)
        const { data: roundsData, error: roundsError } = await supabase
          .from('ward_round_summary_view')
          .select('*')
          .eq('patient_name', `${encounter.patient_name}`)
          .order('round_date', { ascending: false })
          .order('created_at', { ascending: false });

        // If patient_name match doesn't work, try via patient_id
        if (roundsError || !roundsData || roundsData.length === 0) {
          // Alternative: get via admission_history_view and ward_round_notes
          const { data: historyData } = await supabase
            .from('admission_history_view')
            .select('admission_id')
            .eq('patient_id', encounter.patient_id);

          if (historyData && historyData.length > 0) {
            const admissionIds = historyData.map(
              (h: { admission_id: string }) => h.admission_id,
            );
            const { data: rounds } = await supabase
              .from('ward_round_summary_view')
              .select('*')
              .in('admission_id', admissionIds)
              .order('round_date', { ascending: false });

            if (rounds) {
              setWardRounds(rounds);
            }
          }
        } else {
          setWardRounds(roundsData);
        }
      } catch (err) {
        console.error('Error fetching admission data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (encounter.patient_id) {
      fetchAdmissionData();
    }
  }, [encounter.patient_id, encounter.patient_name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Loading admission data...</span>
      </div>
    );
  }

  // Check if patient has any admission history
  const hasAdmissionHistory =
    admissionStatus?.total_admissions > 0 || wardRounds.length > 0;

  if (!hasAdmissionHistory) {
    return (
      <EmptyState
        title="No Admission Records"
        description="This patient has no admission history. Admission details and ward rounds will appear here when the patient is admitted to a ward."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Admission Status Banner */}
      <div
        className={`rounded-xl p-6 text-white ${
          admissionStatus?.is_currently_admitted
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700'
            : 'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <BedDouble size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">
                {admissionStatus?.is_currently_admitted
                  ? 'Currently Admitted'
                  : 'Not Currently Admitted'}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  admissionStatus?.is_currently_admitted
                    ? 'bg-green-400/20 text-green-100'
                    : 'bg-gray-400/20 text-gray-100'
                }`}
              >
                {admissionStatus?.is_currently_admitted
                  ? 'Active'
                  : 'Discharged'}
              </span>
            </div>
            <p className="text-white/80 mt-1">
              {admissionStatus?.is_currently_admitted
                ? `${admissionStatus.current_ward || 'Ward'} - Bed ${admissionStatus.current_bed || 'N/A'}`
                : `Total Admissions: ${admissionStatus?.total_admissions || 0} | Discharges: ${admissionStatus?.total_discharges || 0}`}
            </p>
          </div>
          {admissionStatus?.is_currently_admitted && (
            <div className="text-right">
              <p className="text-white/70 text-sm">Admission #</p>
              <p className="font-bold">
                {admissionStatus.current_admission_number || 'N/A'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'status'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BedDouble size={16} className="inline mr-2" />
          Admission Status
        </button>
        {admissionStatus?.is_currently_admitted && (
          <button
            onClick={() => setActiveTab('nursing')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'nursing'
                ? 'bg-pink-100 text-pink-700 border-b-2 border-pink-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ClipboardList size={16} className="inline mr-2" />
            Ward Care (
            {nursingNotes.length +
              doctorNotes.length +
              dailyProgressNotes.length}
            )
          </button>
        )}
        <button
          onClick={() => setActiveTab('rounds')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'rounds'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clipboard size={16} className="inline mr-2" />
          Ward Rounds ({wardRounds.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'status' && (
        <AdmissionStatusTab
          admissionStatus={admissionStatus}
          admissionData={admissionData}
        />
      )}

      {activeTab === 'nursing' && admissionStatus?.is_currently_admitted && (
        <NursingCareTab
          nursingNotes={nursingNotes}
          shiftHandovers={shiftHandovers}
          bedTransfers={bedTransfers}
          admissionData={admissionData}
          vitalsRecords={vitalsRecords}
          latestVitals={latestVitals}
          doctorNotes={doctorNotes}
          dailyProgressNotes={dailyProgressNotes}
          encounter={encounter}
        />
      )}

      {activeTab === 'rounds' && (
        <WardRoundsTab
          wardRounds={wardRounds}
          expandedWardRound={expandedWardRound}
          setExpandedWardRound={setExpandedWardRound}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab admissionStatus={admissionStatus} wardRounds={wardRounds} />
      )}
    </div>
  );
}

// Admission Status Tab
function AdmissionStatusTab({
  admissionStatus,
  admissionData,
}: {
  admissionStatus: any;
  admissionData: any;
}) {
  if (!admissionStatus?.is_currently_admitted || !admissionData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <BedDouble size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">
          Not Currently Admitted
        </h3>
        <p className="text-gray-500 mt-2">
          This patient is not currently admitted to any ward.
          {admissionStatus?.last_discharge_date && (
            <span className="block mt-1">
              Last discharged: {formatDate(admissionStatus.last_discharge_date)}
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Admission Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location & Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            Current Admission
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Admitted
                </p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(admissionData.admission_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Length of Stay
                </p>
                <p className="font-medium text-gray-900">
                  {admissionData.length_of_stay_days || 0} days
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Ward
                </p>
                <p className="font-medium text-gray-900">
                  {admissionData.ward_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Bed
                </p>
                <p className="font-medium text-gray-900">
                  {admissionData.bed_number || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Acuity Level
              </p>
              <span
                className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                  admissionData.acuity_level === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : admissionData.acuity_level === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : admissionData.acuity_level === 'moderate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                }`}
              >
                {admissionData.acuity_level || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Care Team */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-green-600" />
            Care Team
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Admitting Doctor</p>
                <p className="font-medium text-gray-900">
                  {admissionData.admitting_doctor_first_name
                    ? `Dr. ${admissionData.admitting_doctor_first_name} ${admissionData.admitting_doctor_last_name}`
                    : 'Not assigned'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Info */}
      {(admissionData.admitting_diagnosis || admissionData.chief_complaint) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-amber-600" />
            Clinical Information
          </h3>
          <div className="space-y-4">
            {admissionData.admitting_diagnosis && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Admitting Diagnosis
                </p>
                <p className="text-gray-900 mt-1">
                  {admissionData.admitting_diagnosis}
                </p>
              </div>
            )}
            {admissionData.chief_complaint && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Chief Complaint
                </p>
                <p className="text-gray-900 mt-1">
                  {admissionData.chief_complaint}
                </p>
              </div>
            )}
            {admissionData.reason_for_admission && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Reason for Admission
                </p>
                <p className="text-gray-900 mt-1">
                  {admissionData.reason_for_admission}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">
            {admissionData.ward_round_count || 0}
          </p>
          <p className="text-sm text-blue-600">Ward Rounds</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">
            {admissionData.transfer_count || 0}
          </p>
          <p className="text-sm text-purple-600">Bed Transfers</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">
            {admissionData.length_of_stay_days || 0}
          </p>
          <p className="text-sm text-green-600">Days Admitted</p>
        </div>
      </div>
    </div>
  );
}

// Ward Rounds Tab
function WardRoundsTab({
  wardRounds,
  expandedWardRound,
  setExpandedWardRound,
}: {
  wardRounds: any[];
  expandedWardRound: string | null;
  setExpandedWardRound: (id: string | null) => void;
}) {
  if (wardRounds.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <Clipboard size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">No Ward Rounds</h3>
        <p className="text-gray-500 mt-2">
          No ward round notes have been recorded for this patient.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {wardRounds.map((round, idx) => (
        <div
          key={round.ward_round_id || idx}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          {/* Round Header */}
          <button
            onClick={() =>
              setExpandedWardRound(
                expandedWardRound === round.ward_round_id
                  ? null
                  : round.ward_round_id,
              )
            }
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  round.round_type === 'attending'
                    ? 'bg-blue-100 text-blue-600'
                    : round.round_type === 'consultant'
                      ? 'bg-purple-100 text-purple-600'
                      : round.round_type === 'teaching'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-green-100 text-green-600'
                }`}
              >
                <Clipboard size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">
                  {round.round_type
                    ? round.round_type.charAt(0).toUpperCase() +
                      round.round_type.slice(1)
                    : 'Ward'}{' '}
                  Round
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(round.round_date)} • By{' '}
                  {round.attending_physician_name || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {round.patient_condition && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    round.patient_condition === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : round.patient_condition === 'unstable'
                        ? 'bg-orange-100 text-orange-700'
                        : round.patient_condition === 'stable'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {round.patient_condition}
                </span>
              )}
              {expandedWardRound === round.ward_round_id ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </div>
          </button>

          {/* Expanded Content - SOAP Notes */}
          {expandedWardRound === round.ward_round_id && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subjective */}
                {round.subjective_notes && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">
                        S
                      </span>
                      Subjective
                    </h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {round.subjective_notes}
                    </p>
                  </div>
                )}
                {/* Objective */}
                {round.objective_findings && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">
                        O
                      </span>
                      Objective
                    </h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {round.objective_findings}
                    </p>
                  </div>
                )}
                {/* Assessment */}
                {round.assessment && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">
                        A
                      </span>
                      Assessment
                    </h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {round.assessment}
                    </p>
                  </div>
                )}
                {/* Plan */}
                {round.plan && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold">
                        P
                      </span>
                      Plan
                    </h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {round.plan}
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {(round.nursing_instructions ||
                round.discharge_planning_notes ||
                round.new_orders) && (
                <div className="mt-4 space-y-3">
                  {round.nursing_instructions && (
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                      <h5 className="text-xs font-semibold text-pink-700 uppercase mb-1">
                        Nursing Instructions
                      </h5>
                      <p className="text-gray-700 text-sm">
                        {round.nursing_instructions}
                      </p>
                    </div>
                  )}
                  {round.discharge_planning_notes && (
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <h5 className="text-xs font-semibold text-teal-700 uppercase mb-1">
                        Discharge Planning
                      </h5>
                      <p className="text-gray-700 text-sm">
                        {round.discharge_planning_notes}
                      </p>
                    </div>
                  )}
                  {round.new_orders && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <h5 className="text-xs font-semibold text-indigo-700 uppercase mb-1">
                        New Orders
                      </h5>
                      <p className="text-gray-700 text-sm">
                        {Array.isArray(round.new_orders)
                          ? round.new_orders.join(', ')
                          : round.new_orders}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Admission: {round.admission_number}</span>
                <span>
                  Created: {formatDateTime(round.created_at)} by{' '}
                  {round.created_by_name || 'System'}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// History Tab
function HistoryTab({
  admissionStatus,
  wardRounds,
}: {
  admissionStatus: any;
  wardRounds: any[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Calendar size={16} className="text-indigo-600" />
        Admission History Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">
            {admissionStatus?.total_admissions || 0}
          </p>
          <p className="text-xs text-blue-600 uppercase">Total Admissions</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">
            {admissionStatus?.total_discharges || 0}
          </p>
          <p className="text-xs text-green-600 uppercase">Discharges</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-700">
            {wardRounds.length}
          </p>
          <p className="text-xs text-purple-600 uppercase">Total Rounds</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-700">
            {admissionStatus?.is_currently_admitted ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-amber-600 uppercase">Currently Admitted</p>
        </div>
      </div>

      {admissionStatus?.last_discharge_date && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Last Discharge:</span>{' '}
            {formatDate(admissionStatus.last_discharge_date)}
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-blue-800 font-medium">Full Admission Management</p>
          <p className="text-blue-600 text-sm mt-1">
            For comprehensive admission management including bed transfers,
            discharge planning, and care team updates, please access the{' '}
            <strong>In-Patient Module</strong> from the main navigation menu.
          </p>
        </div>
      </div>
    </div>
  );
}
// Nursing Care Tab - Shows vitals, clinical ward notes (nursing + doctor + progress), shift handovers, and bed transfers
function NursingCareTab({
  nursingNotes,
  shiftHandovers,
  bedTransfers,
  admissionData,
  vitalsRecords,
  latestVitals,
  doctorNotes,
  dailyProgressNotes,
  encounter,
}: {
  nursingNotes: any[];
  shiftHandovers: any[];
  bedTransfers: any[];
  admissionData: any;
  vitalsRecords: any[];
  latestVitals: any;
  doctorNotes: any[];
  dailyProgressNotes: any[];
  encounter: EncounterDetail;
}) {
  const [activeSubTab, setActiveSubTab] = useState<
    'vitals' | 'clinical' | 'handovers' | 'transfers'
  >('vitals');
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);

  // Build encounter context for the modal
  const encounterContext = React.useMemo(
    () => ({
      encounterStatus: encounter.status || 'active',
      encounterDate: encounter.encounter_date,
      visitType: encounter.visit_type,
      isAdmission: true,
      dischargeDate: null,
    }),
    [encounter],
  );

  // Combine nursing notes, doctor notes, and daily progress notes into a unified clinical notes timeline
  const clinicalNotes = React.useMemo(() => {
    const combined: Array<{
      id: string;
      type: 'nursing' | 'doctor' | 'progress';
      date: string;
      data: any;
    }> = [];

    // Add nursing notes
    nursingNotes.forEach((note) => {
      combined.push({
        id: `nursing-${note.id}`,
        type: 'nursing',
        date: note.created_at,
        data: note,
      });
    });

    // Add doctor notes
    doctorNotes.forEach((note) => {
      combined.push({
        id: `doctor-${note.id}`,
        type: 'doctor',
        date: note.created_at || note.round_date,
        data: note,
      });
    });

    // Add daily progress notes (clinical notes from EncounterCentric - Progress Note, Clinical Update, etc.)
    dailyProgressNotes.forEach((note) => {
      combined.push({
        id: `progress-${note.progress_id}`,
        type: 'progress',
        date: note.recorded_at || note.note_date,
        data: note,
      });
    });

    // Sort by date descending (most recent first)
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [nursingNotes, doctorNotes, dailyProgressNotes]);

  return (
    <div className="space-y-6">
      {/* Latest Vitals Banner */}
      {latestVitals && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Latest Vitals
            </h3>
            <span className="text-xs text-gray-500">
              {formatDateTime(latestVitals.date_recorded)}
              {latestVitals.recorded_by_staff &&
                ` • By ${latestVitals.recorded_by_staff.first_name} ${latestVitals.recorded_by_staff.last_name}`}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">Temp</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.temperature || '-'}°C
              </p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">BP</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.blood_pressure_systolic &&
                latestVitals.blood_pressure_diastolic
                  ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
                  : latestVitals.blood_pressure || '-'}
              </p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">Pulse</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.pulse || '-'} bpm
              </p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">Resp</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.respiratory_rate || '-'}/min
              </p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">SpO2</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.oxygen_saturation || '-'}%
              </p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500">Weight</p>
              <p className="text-lg font-bold text-blue-700">
                {latestVitals.weight || '-'} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ward & Bed Info Banner */}
      {admissionData && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-pink-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Current Ward</p>
                <p className="font-semibold text-gray-900">
                  {admissionData.ward_name || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BedDouble size={18} className="text-purple-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Bed Number</p>
                <p className="font-semibold text-gray-900">
                  {admissionData.bed_number || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-amber-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Acuity</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    admissionData.acuity_level === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : admissionData.acuity_level === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : admissionData.acuity_level === 'moderate'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                >
                  {admissionData.acuity_level || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('vitals')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'vitals'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity size={14} className="inline mr-1.5" />
          Vitals ({vitalsRecords.length})
        </button>
        <button
          onClick={() => setActiveSubTab('clinical')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'clinical'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText size={14} className="inline mr-1.5" />
          Clinical Ward Notes ({clinicalNotes.length})
        </button>
        <button
          onClick={() => setActiveSubTab('handovers')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'handovers'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock size={14} className="inline mr-1.5" />
          Handovers ({shiftHandovers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'transfers'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowRightLeft size={14} className="inline mr-1.5" />
          Transfers ({bedTransfers.length})
        </button>
      </div>

      {/* Vitals History Sub-Tab */}
      {activeSubTab === 'vitals' && (
        <div className="space-y-3">
          {vitalsRecords.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <Activity size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">
                No Vitals Recorded
              </h3>
              <p className="text-gray-500 mt-2">
                No vital signs have been recorded for this patient.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Date/Time
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Temp (°C)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        BP (mmHg)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Pulse (bpm)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Resp (/min)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        SpO2 (%)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                        Weight (kg)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Recorded By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {vitalsRecords.map((vital, idx) => (
                      <tr
                        key={vital.id || idx}
                        className={
                          idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(vital.date_recorded)}
                          {idx === 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              Latest
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.temperature || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.blood_pressure_systolic &&
                          vital.blood_pressure_diastolic
                            ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`
                            : vital.blood_pressure || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.pulse || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.respiratory_rate || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.oxygen_saturation || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                          {vital.weight || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {vital.recorded_by_staff
                            ? `${vital.recorded_by_staff.first_name} ${vital.recorded_by_staff.last_name}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clinical Ward Notes Sub-Tab - Unified Timeline for Nursing & Doctor Notes */}
      {activeSubTab === 'clinical' && (
        <div className="py-4">
          {clinicalNotes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">
                No Clinical Notes
              </h3>
              <p className="text-gray-500 mt-2">
                No nursing or doctor notes have been recorded for this patient.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header with Toggle */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-emerald-100 flex items-center justify-center">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Clinical Ward Notes
                    </h3>
                    <p className="text-sm text-gray-500">
                      {clinicalNotes.length} notes from nursing staff, doctors,
                      and progress updates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isNotesExpanded
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isNotesExpanded ? (
                    <>
                      <EyeOff size={16} />
                      <span>Hide Notes</span>
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      <span>View Notes ({clinicalNotes.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Notes Timeline */}
              {isNotesExpanded && (
                <div className="relative">
                  {/* Continuous Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-emerald-300 to-gray-200" />

                  <div className="space-y-8">
                    {clinicalNotes.map((item, idx) => (
                      <div key={item.id} className="relative pl-16 group">
                        {/* Render Nursing Note */}
                        {item.type === 'nursing' && (
                          <>
                            {/* Event Dot/Icon */}
                            <div
                              className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white ${
                                item.data.is_critical
                                  ? 'border-red-300 bg-red-50'
                                  : item.data.note_type === 'Progress_Note'
                                    ? 'border-blue-200 bg-blue-50'
                                    : item.data.note_type === 'Assessment'
                                      ? 'border-green-200 bg-green-50'
                                      : item.data.note_type === 'Observation'
                                        ? 'border-amber-200 bg-amber-50'
                                        : 'border-emerald-200 bg-emerald-50'
                              }`}
                            >
                              <ClipboardList
                                size={18}
                                className={
                                  item.data.is_critical
                                    ? 'text-red-600'
                                    : item.data.note_type === 'Progress_Note'
                                      ? 'text-blue-600'
                                      : item.data.note_type === 'Assessment'
                                        ? 'text-green-600'
                                        : item.data.note_type === 'Observation'
                                          ? 'text-amber-600'
                                          : 'text-emerald-600'
                                }
                              />
                            </div>

                            {/* Content Card */}
                            <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-black uppercase rounded-full">
                                      Nursing
                                    </span>
                                    <h4 className="text-base font-bold text-gray-900">
                                      {item.data.note_type
                                        ? item.data.note_type.replace('_', ' ')
                                        : 'Nursing Note'}
                                    </h4>
                                    {item.data.is_critical && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black uppercase rounded-full animate-pulse">
                                        Critical Alert
                                      </span>
                                    )}
                                    {item.data.shift && (
                                      <span
                                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${
                                          item.data.shift === 'morning'
                                            ? 'bg-amber-100 text-amber-700'
                                            : item.data.shift === 'afternoon'
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-indigo-100 text-indigo-700'
                                        }`}
                                      >
                                        {item.data.shift} shift
                                      </span>
                                    )}
                                    {item.data.patient_condition && (
                                      <span
                                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${
                                          item.data.patient_condition ===
                                          'Critical'
                                            ? 'bg-red-100 text-red-700'
                                            : item.data.patient_condition ===
                                                'Deteriorating'
                                              ? 'bg-orange-100 text-orange-700'
                                              : item.data.patient_condition ===
                                                  'Stable'
                                                ? 'bg-green-100 text-green-700'
                                                : item.data
                                                      .patient_condition ===
                                                    'Improving'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {item.data.patient_condition}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock
                                      size={12}
                                      className="text-gray-400"
                                    />
                                    <span className="text-xs font-medium text-gray-400">
                                      {formatDateTime(item.data.created_at)}
                                    </span>
                                  </div>
                                </div>

                                {item.data.nurse && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                                      {item.data.nurse.first_name?.charAt(0) ||
                                        'N'}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-tight">
                                      {item.data.nurse.first_name}{' '}
                                      {item.data.nurse.last_name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Note Content */}
                              {item.data.content && (
                                <div className="mb-4">
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {item.data.content}
                                  </p>
                                </div>
                              )}

                              {/* Additional Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                {item.data.interventions_performed && (
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <h5 className="text-xs font-bold text-green-700 uppercase mb-1">
                                      Interventions
                                    </h5>
                                    <p className="text-sm text-gray-700">
                                      {item.data.interventions_performed}
                                    </p>
                                  </div>
                                )}
                                {item.data.patient_response && (
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <h5 className="text-xs font-bold text-blue-700 uppercase mb-1">
                                      Patient Response
                                    </h5>
                                    <p className="text-sm text-gray-700">
                                      {item.data.patient_response}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Footer Info */}
                              <div className="flex items-center gap-3 mt-4 flex-wrap">
                                {item.data.pain_level !== null &&
                                  item.data.pain_level !== undefined && (
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        item.data.pain_level >= 7
                                          ? 'bg-red-100 text-red-700'
                                          : item.data.pain_level >= 4
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-green-100 text-green-700'
                                      }`}
                                    >
                                      Pain: {item.data.pain_level}/10
                                    </span>
                                  )}
                                {item.data.follow_up_required && (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Follow-up Required
                                  </span>
                                )}
                                {item.data.requires_doctor_review && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Stethoscope size={12} />
                                    Needs Doctor Review
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Render Doctor Note */}
                        {item.type === 'doctor' && (
                          <>
                            {/* Event Dot/Icon */}
                            <div
                              className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white ${
                                item.data.round_type === 'consultant'
                                  ? 'border-purple-300 bg-purple-50'
                                  : item.data.round_type === 'morning'
                                    ? 'border-amber-300 bg-amber-50'
                                    : item.data.round_type === 'evening'
                                      ? 'border-blue-300 bg-blue-50'
                                      : 'border-indigo-200 bg-indigo-50'
                              }`}
                            >
                              <Stethoscope
                                size={18}
                                className={
                                  item.data.round_type === 'consultant'
                                    ? 'text-purple-600'
                                    : item.data.round_type === 'morning'
                                      ? 'text-amber-600'
                                      : item.data.round_type === 'evening'
                                        ? 'text-blue-600'
                                        : 'text-indigo-600'
                                }
                              />
                            </div>

                            {/* Content Card */}
                            <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-black uppercase rounded-full">
                                      Doctor
                                    </span>
                                    <h4 className="text-base font-bold text-gray-900">
                                      Ward Round -{' '}
                                      {item.data.round_type
                                        ? item.data.round_type
                                            .charAt(0)
                                            .toUpperCase() +
                                          item.data.round_type
                                            .slice(1)
                                            .replace('_', ' ')
                                        : 'Regular'}
                                    </h4>
                                    {item.data.patient_condition && (
                                      <span
                                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${
                                          item.data.patient_condition ===
                                          'critical'
                                            ? 'bg-red-100 text-red-700'
                                            : item.data.patient_condition ===
                                                'deteriorating'
                                              ? 'bg-orange-100 text-orange-700'
                                              : item.data.patient_condition ===
                                                  'stable'
                                                ? 'bg-green-100 text-green-700'
                                                : item.data
                                                      .patient_condition ===
                                                    'improving'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {item.data.patient_condition}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock
                                      size={12}
                                      className="text-gray-400"
                                    />
                                    <span className="text-xs font-medium text-gray-400">
                                      {formatDateTime(
                                        item.data.round_date ||
                                          item.data.created_at,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {item.data.physician && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                      {item.data.physician.first_name?.charAt(
                                        0,
                                      ) || 'D'}
                                    </div>
                                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-tight">
                                      Dr. {item.data.physician.first_name}{' '}
                                      {item.data.physician.last_name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* SOAP Notes Grid */}
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                {item.data.subjective_notes && (
                                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs flex items-center justify-center font-black">
                                        S
                                      </span>
                                      <h5 className="text-xs font-bold text-blue-700 uppercase">
                                        Subjective
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.subjective_notes}
                                    </p>
                                  </div>
                                )}
                                {item.data.objective_findings && (
                                  <div className="p-3 bg-green-50 rounded-xl border border-green-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-green-200 text-green-700 text-xs flex items-center justify-center font-black">
                                        O
                                      </span>
                                      <h5 className="text-xs font-bold text-green-700 uppercase">
                                        Objective
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.objective_findings}
                                    </p>
                                  </div>
                                )}
                                {item.data.assessment && (
                                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs flex items-center justify-center font-black">
                                        A
                                      </span>
                                      <h5 className="text-xs font-bold text-amber-700 uppercase">
                                        Assessment
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.assessment}
                                    </p>
                                  </div>
                                )}
                                {item.data.plan && (
                                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-black">
                                        P
                                      </span>
                                      <h5 className="text-xs font-bold text-purple-700 uppercase">
                                        Plan
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.plan}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Nursing Instructions */}
                              {item.data.nursing_instructions && (
                                <div className="p-3 bg-pink-50 rounded-xl border border-pink-100 mb-4 overflow-hidden">
                                  <h5 className="text-xs font-bold text-pink-700 uppercase mb-1">
                                    Nursing Instructions
                                  </h5>
                                  <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                    {item.data.nursing_instructions}
                                  </p>
                                </div>
                              )}

                              {/* Discharge Planning Notes */}
                              {item.data.discharge_planning_notes && (
                                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 mb-4 overflow-hidden">
                                  <h5 className="text-xs font-bold text-cyan-700 uppercase mb-1">
                                    Discharge Planning
                                  </h5>
                                  <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                    {item.data.discharge_planning_notes}
                                  </p>
                                </div>
                              )}

                              {/* Footer Status Badges */}
                              <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-gray-100">
                                {item.data.estimated_discharge_date && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Calendar size={12} />
                                    Est. Discharge:{' '}
                                    {formatDate(
                                      item.data.estimated_discharge_date,
                                    )}
                                  </span>
                                )}
                                {item.data.created_by_staff && (
                                  <span className="text-xs text-gray-400">
                                    Documented by:{' '}
                                    {item.data.created_by_staff.first_name}{' '}
                                    {item.data.created_by_staff.last_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Render Progress Note (Clinical Notes from EncounterCentric) */}
                        {item.type === 'progress' && (
                          <>
                            {/* Event Dot/Icon */}
                            <div
                              className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white ${
                                item.data.alert_level === 'critical'
                                  ? 'border-red-300 bg-red-50'
                                  : item.data.alert_level === 'warning'
                                    ? 'border-orange-300 bg-orange-50'
                                    : 'border-sky-200 bg-sky-50'
                              }`}
                            >
                              <FileText
                                size={18}
                                className={
                                  item.data.alert_level === 'critical'
                                    ? 'text-red-600'
                                    : item.data.alert_level === 'warning'
                                      ? 'text-orange-600'
                                      : 'text-sky-600'
                                }
                              />
                            </div>

                            {/* Content Card */}
                            <div className="bg-white rounded-xl border border-sky-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-black uppercase rounded-full">
                                      Progress Note
                                    </span>
                                    <h4 className="text-base font-bold text-gray-900">
                                      Clinical Note
                                    </h4>
                                    {item.data.patient_condition && (
                                      <span
                                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${
                                          item.data.patient_condition ===
                                          'critical'
                                            ? 'bg-red-100 text-red-700'
                                            : item.data.patient_condition ===
                                                'deteriorating'
                                              ? 'bg-orange-100 text-orange-700'
                                              : item.data.patient_condition ===
                                                  'stable'
                                                ? 'bg-green-100 text-green-700'
                                                : item.data
                                                      .patient_condition ===
                                                    'improving'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {item.data.patient_condition}
                                      </span>
                                    )}
                                    {item.data.alert_level &&
                                      item.data.alert_level !== 'normal' && (
                                        <span
                                          className={`px-2 py-0.5 text-xs font-black uppercase rounded-full ${
                                            item.data.alert_level === 'critical'
                                              ? 'bg-red-100 text-red-700 animate-pulse'
                                              : item.data.alert_level ===
                                                  'warning'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {item.data.alert_level}
                                        </span>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock
                                      size={12}
                                      className="text-gray-400"
                                    />
                                    <span className="text-xs font-medium text-gray-400">
                                      {formatDateTime(
                                        item.data.recorded_at ||
                                          item.data.note_date,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {item.data.recorded_by && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-lg border border-sky-100">
                                    <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold text-white">
                                      {item.data.recorded_by.first_name?.charAt(
                                        0,
                                      ) || 'D'}
                                    </div>
                                    <span className="text-xs font-bold text-sky-700 uppercase tracking-tight">
                                      Dr. {item.data.recorded_by.first_name}{' '}
                                      {item.data.recorded_by.last_name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* SOAP Notes Grid */}
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                {item.data.subjective && (
                                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs flex items-center justify-center font-black">
                                        S
                                      </span>
                                      <h5 className="text-xs font-bold text-blue-700 uppercase">
                                        Subjective
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.subjective}
                                    </p>
                                  </div>
                                )}
                                {item.data.objective && (
                                  <div className="p-3 bg-green-50 rounded-xl border border-green-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-green-200 text-green-700 text-xs flex items-center justify-center font-black">
                                        O
                                      </span>
                                      <h5 className="text-xs font-bold text-green-700 uppercase">
                                        Objective
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.objective}
                                    </p>
                                  </div>
                                )}
                                {item.data.assessment && (
                                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs flex items-center justify-center font-black">
                                        A
                                      </span>
                                      <h5 className="text-xs font-bold text-amber-700 uppercase">
                                        Assessment
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.assessment}
                                    </p>
                                  </div>
                                )}
                                {item.data.plan && (
                                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-black">
                                        P
                                      </span>
                                      <h5 className="text-xs font-bold text-purple-700 uppercase">
                                        Plan
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                                      {item.data.plan}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Additional Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {item.data.nursing_summary && (
                                  <div className="p-3 bg-pink-50 rounded-xl border border-pink-100 overflow-hidden">
                                    <h5 className="text-xs font-bold text-pink-700 uppercase mb-1">
                                      Nursing Summary
                                    </h5>
                                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                      {item.data.nursing_summary}
                                    </p>
                                  </div>
                                )}
                                {item.data.vital_signs_summary && (
                                  <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 overflow-hidden">
                                    <h5 className="text-xs font-bold text-cyan-700 uppercase mb-1">
                                      Vital Signs Summary
                                    </h5>
                                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                      {item.data.vital_signs_summary}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* I/O Balance (if available) */}
                              {(item.data.oral_intake_ml ||
                                item.data.iv_intake_ml ||
                                item.data.urine_output_ml ||
                                item.data.other_output_ml) && (
                                <div className="mt-4 p-3 bg-teal-50 rounded-xl border border-teal-100">
                                  <h5 className="text-xs font-bold text-teal-700 uppercase mb-2">
                                    Intake / Output
                                  </h5>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    {item.data.oral_intake_ml && (
                                      <span className="text-gray-700">
                                        <strong>Oral:</strong>{' '}
                                        {item.data.oral_intake_ml}ml
                                      </span>
                                    )}
                                    {item.data.iv_intake_ml && (
                                      <span className="text-gray-700">
                                        <strong>IV:</strong>{' '}
                                        {item.data.iv_intake_ml}ml
                                      </span>
                                    )}
                                    {item.data.urine_output_ml && (
                                      <span className="text-gray-700">
                                        <strong>Urine:</strong>{' '}
                                        {item.data.urine_output_ml}ml
                                      </span>
                                    )}
                                    {item.data.other_output_ml && (
                                      <span className="text-gray-700">
                                        <strong>Other Output:</strong>{' '}
                                        {item.data.other_output_ml}ml
                                      </span>
                                    )}
                                  </div>
                                  {item.data.io_notes && (
                                    <p className="text-sm text-gray-600 mt-2 italic">
                                      {item.data.io_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Timeline End */}
                    <div className="relative pl-16">
                      <div className="absolute left-6 top-1 w-3 h-3 -ml-[5px] rounded-full bg-gray-300 border-4 border-white ring-1 ring-gray-100" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        End of clinical notes
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Note Button - Always visible */}
          <div className="mt-6 flex justify-center">
            <button
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-700 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              onClick={() => setIsAddNoteModalOpen(true)}
            >
              <Plus size={20} />
              <span>Add Clinical Note</span>
            </button>
          </div>

          {/* Clinical Notes Modal */}
          <ClinicalNotesModal
            isOpen={isAddNoteModalOpen}
            onClose={() => setIsAddNoteModalOpen(false)}
            encounterId={encounter.encounter_id}
            encounterNumber={encounter.encounter_number || 'N/A'}
            visitId={encounter.encounter_id}
            patientId={encounter.patient_id}
            patientName={encounter.patient_name || 'Patient'}
            encounterContext={encounterContext}
            onNoteAdded={() => {
              // Refresh will happen via query invalidation in the modal
              setIsAddNoteModalOpen(false);
            }}
          />
        </div>
      )}

      {/* Shift Handovers Sub-Tab */}
      {activeSubTab === 'handovers' && (
        <div className="space-y-3">
          {shiftHandovers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <Clock size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">
                No Shift Handovers
              </h3>
              <p className="text-gray-500 mt-2">
                No shift handovers have been recorded for this admission.
              </p>
            </div>
          ) : (
            shiftHandovers.map((handover, idx) => (
              <div
                key={handover.id || idx}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        handover.from_shift === 'morning'
                          ? 'bg-amber-100 text-amber-600'
                          : handover.from_shift === 'afternoon'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {handover.from_shift
                          ? handover.from_shift.charAt(0).toUpperCase() +
                            handover.from_shift.slice(1)
                          : 'Shift'}{' '}
                        →{' '}
                        {handover.to_shift
                          ? handover.to_shift.charAt(0).toUpperCase() +
                            handover.to_shift.slice(1)
                          : 'Shift'}{' '}
                        Handover
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(handover.shift_date)}
                      </p>
                    </div>
                  </div>
                  {handover.status && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        handover.status === 'acknowledged' ||
                        handover.status === 'reviewed'
                          ? 'bg-green-100 text-green-700'
                          : handover.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {handover.status}
                    </span>
                  )}
                </div>

                {/* Nurses */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">
                      Outgoing Nurse
                    </p>
                    <p className="font-medium text-gray-900">
                      {handover.outgoing_nurse?.first_name}{' '}
                      {handover.outgoing_nurse?.last_name}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">
                      Incoming Nurse
                    </p>
                    <p className="font-medium text-gray-900">
                      {handover.incoming_nurse?.first_name}{' '}
                      {handover.incoming_nurse?.last_name}
                    </p>
                  </div>
                </div>

                {/* Patient Status */}
                {handover.patient_status && (
                  <div className="p-3 bg-blue-50 rounded-lg mb-3">
                    <h5 className="text-xs font-semibold text-blue-700 uppercase mb-1">
                      Patient Status
                    </h5>
                    <p className="text-sm text-gray-700">
                      {handover.patient_status}
                    </p>
                  </div>
                )}

                {/* Key Observations */}
                {handover.key_observations && (
                  <div className="p-3 bg-amber-50 rounded-lg mb-3">
                    <h5 className="text-xs font-semibold text-amber-700 uppercase mb-1">
                      Key Observations
                    </h5>
                    <p className="text-sm text-gray-700">
                      {handover.key_observations}
                    </p>
                  </div>
                )}

                {/* Pending Tasks */}
                {handover.pending_tasks && (
                  <div className="p-3 bg-red-50 rounded-lg mb-3">
                    <h5 className="text-xs font-semibold text-red-700 uppercase mb-1">
                      Pending Tasks
                    </h5>
                    <p className="text-sm text-gray-700">
                      {handover.pending_tasks}
                    </p>
                  </div>
                )}

                {/* Special Instructions */}
                {handover.special_instructions && (
                  <div className="p-3 bg-purple-50 rounded-lg mb-3">
                    <h5 className="text-xs font-semibold text-purple-700 uppercase mb-1">
                      Special Instructions
                    </h5>
                    <p className="text-sm text-gray-700">
                      {handover.special_instructions}
                    </p>
                  </div>
                )}

                {/* Concerns */}
                {handover.concerns && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <h5 className="text-xs font-semibold text-orange-700 uppercase mb-1">
                      Concerns
                    </h5>
                    <p className="text-sm text-gray-700">{handover.concerns}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bed Transfers Sub-Tab */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-3">
          {bedTransfers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <ArrowRightLeft
                size={48}
                className="mx-auto text-gray-400 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-700">
                No Bed Transfers
              </h3>
              <p className="text-gray-500 mt-2">
                No bed transfers have been recorded for this admission.
              </p>
            </div>
          ) : (
            bedTransfers.map((transfer, idx) => (
              <div
                key={transfer.id || idx}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Bed Transfer
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(transfer.transfer_date)}
                      </p>
                    </div>
                  </div>
                  {transfer.transfer_status && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transfer.transfer_status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transfer.transfer_status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {transfer.transfer_status}
                    </span>
                  )}
                </div>

                {/* Transfer Path */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 uppercase">From</p>
                    <p className="font-semibold text-gray-900">
                      {transfer.from_ward?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Bed {transfer.from_bed?.bed_number || 'N/A'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowRightLeft size={24} className="text-blue-500" />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 uppercase">To</p>
                    <p className="font-semibold text-gray-900">
                      {transfer.to_ward?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Bed {transfer.to_bed?.bed_number || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                {transfer.reason && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h5 className="text-xs font-semibold text-blue-700 uppercase mb-1">
                      Reason
                    </h5>
                    <p className="text-sm text-gray-700">{transfer.reason}</p>
                  </div>
                )}

                {/* Performed By */}
                {transfer.performed_by_user && (
                  <div className="mt-3 text-xs text-gray-500">
                    Performed by: {transfer.performed_by_user.first_name}{' '}
                    {transfer.performed_by_user.last_name}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
