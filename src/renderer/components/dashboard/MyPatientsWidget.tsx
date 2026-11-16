/**
 * MyPatientsWidget Component
 *
 * Shows a quick-access list of patients currently assigned to the logged-in staff member.
 * Enables fast navigation to patient charts without navigating through module lists.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ChevronRight,
  Clock,
  AlertCircle,
  Stethoscope,
  Activity,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../api/supabaseClient';
import { SkeletonList } from '../ui/SkeletonLoader';

interface MyPatient {
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  stage: string;
  encounter_type: string;
  started_at: string;
  has_pending_orders: boolean;
  has_critical_results: boolean;
}

interface VisitRow {
  id: string;
  patient_id: string;
  current_stage: string | null;
  visit_type: string | null;
  created_at: string;
}

interface MyPatientsWidgetProps {
  className?: string;
  isNightMode?: boolean;
}

export function MyPatientsWidget({
  className = '',
  isNightMode = false,
}: MyPatientsWidgetProps) {
  const navigate = useNavigate();
  const { staff } = useAuth();

  // Theme
  const theme = {
    cardBg: isNightMode ? 'bg-slate-900' : 'bg-white',
    cardBgAlt: isNightMode ? 'bg-slate-800/50' : 'bg-slate-50',
    text: isNightMode ? 'text-white' : 'text-slate-900',
    textMuted: isNightMode ? 'text-slate-400' : 'text-slate-600',
    textSubtle: isNightMode ? 'text-slate-500' : 'text-slate-400',
    border: isNightMode ? 'border-slate-800' : 'border-slate-200',
    shadow: isNightMode ? '' : 'shadow-lg shadow-slate-200/50',
  };

  // Fetch my patients based on role
  const { data: myPatients, isLoading } = useQuery({
    queryKey: ['my-patients', staff?.id, staff?.role],
    queryFn: async () => {
      if (!staff?.id) return [];

      // Build query based on role - NO patient join (PostgREST FK detection issues)
      let query = supabase
        .from('visits')
        .select(
          `
          id,
          patient_id,
          current_stage,
          visit_type,
          created_at,
          attending_doctor_id,
          registered_by
        `,
        )
        .in('status', ['Active', 'Created', 'Registered'])
        .order('created_at', { ascending: false })
        .limit(8);

      // Filter by role
      if (staff.role === 'doctor') {
        query = query.eq('attending_doctor_id', staff.id);
      } else if (staff.role === 'nurse') {
        query = query.eq('registered_by', staff.id);
      }
      // For other roles (admin, super_admin), show all active

      const { data, error } = await query;
      if (error) throw error;

      const visits = (data || []) as VisitRow[];

      // Fetch patient data separately (workaround for PostgREST FK issues)
      const patientIds = Array.from(
        new Set(visits.map((visit) => visit.patient_id).filter(Boolean)),
      );
      const encounterIds = visits.map((visit) => visit.id);
      let patientMap = new Map<
        string,
        { first_name: string; surname: string }
      >();
      const pendingOrderEncounters = new Set<string>();
      const criticalResultEncounters = new Set<string>();

      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from('patients')
          .select('patient_id, first_name, surname')
          .in('patient_id', patientIds);

        patientMap = new Map((patients || []).map((p) => [p.patient_id, p]));
      }

      if (encounterIds.length > 0) {
        const [{ data: pendingOrders }, { data: criticalResults }] =
          await Promise.all([
            supabase
              .from('billing_orders')
              .select('encounter_id')
              .in('encounter_id', encounterIds)
              .eq('status', 'Pending'),
            supabase
              .from('lab_requests')
              .select('encounter_id')
              .in('encounter_id', encounterIds)
              .eq('is_critical', true)
              .eq('status', 'Completed'),
          ]);

        (pendingOrders || []).forEach((row) => {
          if (row.encounter_id) pendingOrderEncounters.add(row.encounter_id);
        });
        (criticalResults || []).forEach((row) => {
          if (row.encounter_id) criticalResultEncounters.add(row.encounter_id);
        });
      }

      const patients: MyPatient[] = visits.map((visit) => {
        const patient = patientMap.get(visit.patient_id);

        return {
          encounter_id: visit.id,
          patient_id: visit.patient_id,
          patient_name:
            `${patient?.first_name || ''} ${patient?.surname || ''}`.trim(),
          stage: visit.current_stage || 'registration',
          encounter_type: visit.visit_type || 'outpatient',
          started_at: visit.created_at,
          has_pending_orders: pendingOrderEncounters.has(visit.id),
          has_critical_results: criticalResultEncounters.has(visit.id),
        };
      });

      return patients;
    },
    enabled: !!staff?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      registration: 'bg-slate-100 text-slate-700',
      nursing_vitals: 'bg-pink-100 text-pink-700',
      queue_waiting: 'bg-amber-100 text-amber-700',
      in_consultation: 'bg-indigo-100 text-indigo-700',
      lab_pending: 'bg-yellow-100 text-yellow-700',
      radiology_pending: 'bg-orange-100 text-orange-700',
      pharmacy_pending: 'bg-emerald-100 text-emerald-700',
      payment: 'bg-cyan-100 text-cyan-700',
      completed: 'bg-green-100 text-green-700',
    };
    return stageColors[stage] || 'bg-slate-100 text-slate-700';
  };

  const formatStageName = (stage: string) => {
    return stage
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  const handlePatientClick = (patient: MyPatient) => {
    // Navigate based on role
    if (staff?.role === 'doctor') {
      navigate(`/doctor?encounter=${patient.encounter_id}`);
    } else if (staff?.role === 'nurse') {
      navigate(`/nursing?encounter=${patient.encounter_id}`);
    } else {
      navigate(`/medical-records?patient=${patient.patient_id}`);
    }
  };

  const getRoleLabel = () => {
    switch (staff?.role) {
      case 'doctor':
        return 'My Patients';
      case 'nurse':
        return 'My Assigned Patients';
      default:
        return 'Active Patients';
    }
  };

  const getRoleIcon = () => {
    switch (staff?.role) {
      case 'doctor':
        return Stethoscope;
      case 'nurse':
        return Activity;
      default:
        return Users;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div
      className={`${theme.cardBg} rounded-xl ${theme.shadow} p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <RoleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${theme.text}`}>
              {getRoleLabel()}
            </h3>
            <p className={`text-sm ${theme.textMuted}`}>
              {myPatients?.length || 0} active encounter
              {(myPatients?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {staff?.role && ['doctor', 'nurse'].includes(staff.role) && (
          <button
            onClick={() =>
              navigate(staff.role === 'doctor' ? '/doctor' : '/nursing')
            }
            className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Patient List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="px-2 py-4">
            <SkeletonList count={3} />
          </div>
        ) : myPatients && myPatients.length > 0 ? (
          myPatients.slice(0, 5).map((patient) => (
            <button
              key={patient.encounter_id}
              onClick={() => handlePatientClick(patient)}
              className={`w-full text-left p-3 rounded-xl ${theme.cardBgAlt} hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {patient.patient_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  {/* Patient Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${theme.text} truncate`}>
                        {patient.patient_name}
                      </p>
                      {/* Alert indicators */}
                      {patient.has_critical_results && (
                        <span className="flex-shrink-0" title="Critical result">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </span>
                      )}
                      {patient.has_pending_orders && (
                        <span className="flex-shrink-0" title="Pending orders">
                          <Clock className="w-4 h-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStageColor(patient.stage)}`}
                      >
                        {formatStageName(patient.stage)}
                      </span>
                      <span className={`text-xs ${theme.textSubtle}`}>
                        {getTimeSince(patient.started_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className={`w-5 h-5 ${theme.textSubtle} group-hover:text-violet-500 group-hover:translate-x-1 transition-all flex-shrink-0`}
                />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <UserCog className="w-6 h-6 text-slate-400" />
            </div>
            <p className={`font-medium ${theme.text}`}>No Active Patients</p>
            <p className={`text-sm ${theme.textMuted} mt-1`}>
              {staff?.role === 'doctor'
                ? 'No patients assigned to you'
                : staff?.role === 'nurse'
                  ? 'No patients under your care'
                  : 'No active encounters'}
            </p>
          </div>
        )}

        {/* Show more indicator */}
        {myPatients && myPatients.length > 5 && (
          <button
            onClick={() =>
              navigate(
                staff?.role === 'doctor'
                  ? '/doctor'
                  : staff?.role === 'nurse'
                    ? '/nursing'
                    : '/encounters',
              )
            }
            className="w-full text-center py-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            +{myPatients.length - 5} more patients
          </button>
        )}
      </div>
    </div>
  );
}

export default MyPatientsWidget;
