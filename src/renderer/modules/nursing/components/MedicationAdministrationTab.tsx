import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Plus,
  Save,
  History,
  Activity,
  Check,
  User,
  FileText,
  Timer,
  Volume2,
  BellRing,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNursingNote } from '../api/nursing-notes.api';
import {
  CreateNursingNoteDTO,
  ShiftType,
  getCurrentShift,
} from '../dtos/nursing-notes.dto';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import {
  recordMedicationAdministered,
  recordMedicationRefused,
} from '../../../lib/notifications/emar-reminder.service';
import { notifyCareTeamAboutAction } from '../../../lib/notifications/care-team.service';
import { playPresetSound } from '../../../lib/notifications/sound.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MedicationAdministrationTabProps {
  encounterId: string;
  patientId: string;
  patientName: string;
  prescriptions: any[];
  nursingNotes?: any[];
  isLoading?: boolean;
}

type ViewFilter = 'all' | 'due' | 'completed' | 'history';

// ─── Duration & Status Helpers ─────────────────────────────────────────────────

function parseDurationToHours(
  duration: string | null | undefined,
): number | null {
  if (!duration) return null;
  const d = duration.toLowerCase().trim();
  const dayMatch = d.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1]) * 24;
  const weekMatch = d.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1]) * 24 * 7;
  const monthMatch = d.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1]) * 24 * 30;
  if (
    d.includes('continuous') ||
    d.includes('until') ||
    d.includes('as directed')
  )
    return null;
  return null;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

function getEndDate(
  createdAt: string | null | undefined,
  duration: string | null | undefined,
): Date | null {
  if (!createdAt) return null;
  const hours = parseDurationToHours(duration);
  if (hours === null) return null;
  const start = new Date(createdAt);
  if (!isValidDate(start)) return null;
  return new Date(start.getTime() + hours * 3_600_000);
}

function getTimeRemaining(
  createdAt: string | null | undefined,
  duration: string | null | undefined,
) {
  const hours = parseDurationToHours(duration);
  if (hours === null || !createdAt) {
    return {
      label: duration || 'No duration set',
      hoursLeft: null,
      percentComplete: 0,
      isExpired: false,
      isIndefinite: true,
    };
  }
  const start = new Date(createdAt);
  if (!isValidDate(start)) {
    return {
      label: duration || 'No duration set',
      hoursLeft: null,
      percentComplete: 0,
      isExpired: false,
      isIndefinite: true,
    };
  }
  const now = Date.now();
  const elapsed = (now - start.getTime()) / 3_600_000;
  const remaining = hours - elapsed;
  const pct = Math.min(100, Math.max(0, (elapsed / hours) * 100));

  if (remaining <= 0)
    return {
      label: 'Course completed',
      hoursLeft: 0,
      percentComplete: 100,
      isExpired: true,
      isIndefinite: false,
    };
  if (remaining >= 48) {
    const d = Math.ceil(remaining / 24);
    return {
      label: `${d} day${d > 1 ? 's' : ''} remaining`,
      hoursLeft: remaining,
      percentComplete: pct,
      isExpired: false,
      isIndefinite: false,
    };
  }
  if (remaining >= 1) {
    const h = Math.floor(remaining);
    const m = Math.round((remaining - h) * 60);
    return {
      label: `${h}h ${m}m remaining`,
      hoursLeft: remaining,
      percentComplete: pct,
      isExpired: false,
      isIndefinite: false,
    };
  }
  return {
    label: `${Math.round(remaining * 60)} min remaining`,
    hoursLeft: remaining,
    percentComplete: pct,
    isExpired: false,
    isIndefinite: false,
  };
}

function getProgressColor(pct: number, isExpired: boolean) {
  if (isExpired) return 'bg-gray-400';
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'administered':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
        label: 'Administered',
      };
    case 'omitted':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        icon: AlertCircle,
        label: 'Omitted',
      };
    case 'refused':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        dot: 'bg-red-500',
        icon: AlertCircle,
        label: 'Refused',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        dot: 'bg-gray-400',
        icon: Clock,
        label: status || 'Unknown',
      };
  }
}

// ─── Frequency → Hours Parser ──────────────────────────────────────────────────

/**
 * Parse prescription frequency string to interval in hours.
 * Supports common medical abbreviations: TDS, BD, QID, 8hrly, daily, etc.
 */
function parseFrequencyToHours(
  frequency: string | null | undefined,
): number | null {
  if (!frequency) return null;
  const f = frequency.toLowerCase().trim();

  // Exact hourly match: "4 hourly", "8hrly", "6 hours", "every 4 hours"
  const hourlyMatch = f.match(
    /(?:every\s*)?(\d+)\s*(?:hourly|hrly|hours?|hrs?)/i,
  );
  if (hourlyMatch) return parseInt(hourlyMatch[1]);

  // Standard frequency abbreviations
  if (/\bstat\b/.test(f)) return null; // one-time dose
  if (/\bod\b|once\s*daily|daily|q24h|qd/.test(f)) return 24;
  if (/\bbd\b|twice\s*daily|b\.?i\.?d|q12h|12\s*hourly/.test(f)) return 12;
  if (/\btds\b|t\.?i\.?d|thrice|three\s*times|q8h|8\s*hourly/.test(f)) return 8;
  if (/\bqid\b|q\.?i\.?d|four\s*times|q6h|6\s*hourly/.test(f)) return 6;
  if (/\bq4h\b|4\s*hourly|every\s*4/.test(f)) return 4;
  if (/\bq2h\b|2\s*hourly|every\s*2/.test(f)) return 2;
  if (/\bq1h\b|hourly|every\s*(?:1\s*)?hour/.test(f)) return 1;
  if (/\bnocte\b|at\s*night|night/.test(f)) return 24;
  if (/\bmane\b|morning/.test(f)) return 24;
  if (/\bweekly\b|once\s*weekly/.test(f)) return 168;
  if (/\balt\s*day|alternate\s*day|every\s*other/.test(f)) return 48;
  if (/\bprn\b|as\s*needed/.test(f)) return null; // as needed

  return null;
}

/**
 * Calculate next dose time based on last administration and frequency.
 * Returns { nextDueAt, msUntil, label, isOverdue, isDueSoon } or null.
 */
function getNextDoseInfo(
  lastAdminTime: string | null,
  prescriptionCreatedAt: string | null,
  frequency: string | null | undefined,
  isExpired: boolean,
): {
  nextDueAt: Date;
  msUntil: number;
  label: string;
  isOverdue: boolean;
  isDueSoon: boolean;
} | null {
  if (isExpired) return null;
  const intervalHours = parseFrequencyToHours(frequency);
  if (intervalHours === null) return null;

  const baseTime = lastAdminTime || prescriptionCreatedAt;
  if (!baseTime) return null;

  const base = new Date(baseTime);
  if (!isValidDate(base)) return null;

  const intervalMs = intervalHours * 3_600_000;
  const nextDue = new Date(base.getTime() + intervalMs);
  const now = Date.now();
  const ms = nextDue.getTime() - now;
  const isOverdue = ms <= 0;
  const isDueSoon = !isOverdue && ms <= 30 * 60_000; // due within 30 min

  let label: string;
  if (isOverdue) {
    const overdueMin = Math.abs(Math.round(ms / 60_000));
    if (overdueMin >= 60) {
      const h = Math.floor(overdueMin / 60);
      const m = overdueMin % 60;
      label = `Overdue by ${h}h ${m}m`;
    } else {
      label = `Overdue by ${overdueMin}m`;
    }
  } else {
    const totalMin = Math.round(ms / 60_000);
    if (totalMin >= 60) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      label = `Next dose in ${h}h ${m > 0 ? `${m}m` : ''}`;
    } else {
      label = `Next dose in ${totalMin}m`;
    }
  }

  return { nextDueAt: nextDue, msUntil: ms, label, isOverdue, isDueSoon };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function MedicationAdministrationTab({
  encounterId,
  patientId,
  patientName,
  prescriptions,
  nursingNotes = [],
  isLoading,
}: MedicationAdministrationTabProps) {
  const [selectedPrescription, setSelectedPrescription] = useState<
    string | null
  >(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [adminData, setAdminData] = useState<{
    status: 'administered' | 'omitted' | 'refused';
    notes: string;
    vitalsCheck: boolean;
  }>({
    status: 'administered',
    notes: '',
    vitalsCheck: false,
  });

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { staff } = useAuth();
  const currentUserId = staff?.id || '';
  const currentUserName = staff?.first_name
    ? `${staff.first_name} ${staff.last_name || ''}`.trim()
    : 'Nurse';

  // ── Countdown tick (updates every 30s) ─────────────────────────────────────
  const [tick, setTick] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const lastSoundRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── Persistent sound alert for overdue / due-soon medications ──────────────
  const playDueAlert = useCallback(() => {
    if (soundMuted) return;
    const now = Date.now();
    // Throttle: no more than once every 2 minutes
    if (now - lastSoundRef.current < 120_000) return;
    lastSoundRef.current = now;
    try {
      playPresetSound('urgent', 0.7);
    } catch {
      // sound not available
    }
  }, [soundMuted]);

  // Check for overdue/due-soon medications and trigger sound
  useEffect(() => {
    if (!prescriptions || prescriptions.length === 0) return;

    const hasOverdueOrDueSoon = prescriptions.some((rx: any) => {
      const rxId = rx.id || rx.prescription_id;
      const currentShiftAdmin = nursingNotes.find((note: any) => {
        if (note.note_type !== 'Medication_Note') return false;
        if (
          new Date(note.created_at).toDateString() !== new Date().toDateString()
        )
          return false;
        if (note.shift !== getCurrentShift()) return false;
        try {
          const interventions =
            typeof note.interventions_performed === 'string'
              ? JSON.parse(note.interventions_performed)
              : note.interventions_performed;
          return interventions?.medication_id === rxId;
        } catch {
          return false;
        }
      });
      if (currentShiftAdmin) return false; // already administered

      const timeInfo = getTimeRemaining(rx.created_at, rx.duration);
      if (timeInfo.isExpired) return false;

      const allAdmins = nursingNotes
        .filter((note: any) => {
          if (note.note_type !== 'Medication_Note') return false;
          try {
            const interventions =
              typeof note.interventions_performed === 'string'
                ? JSON.parse(note.interventions_performed)
                : note.interventions_performed;
            return interventions?.medication_id === rxId;
          } catch {
            return false;
          }
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      const lastAdmin = allAdmins.length > 0 ? allAdmins[0].created_at : null;
      const doseInfo = getNextDoseInfo(
        lastAdmin,
        rx.created_at,
        rx.frequency,
        timeInfo.isExpired,
      );
      return doseInfo && (doseInfo.isOverdue || doseInfo.isDueSoon);
    });

    if (hasOverdueOrDueSoon) {
      playDueAlert();
    }
  }, [tick, prescriptions, nursingNotes, playDueAlert]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Get ALL administration records for a prescription (across all shifts / days) */
  const getAllAdministrations = (prescriptionId: string) => {
    if (!nursingNotes || nursingNotes.length === 0) return [];
    return nursingNotes
      .filter((note) => {
        if (note.note_type !== 'Medication_Note') return false;
        try {
          const interventions =
            typeof note.interventions_performed === 'string'
              ? JSON.parse(note.interventions_performed)
              : note.interventions_performed;
          return interventions?.medication_id === prescriptionId;
        } catch {
          return false;
        }
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  };

  /** Check for existing administration in the CURRENT shift only */
  const getCurrentShiftAdministration = (prescriptionId: string) => {
    const currentShift = getCurrentShift();
    const today = new Date().toDateString();

    return nursingNotes.find((note) => {
      if (note.note_type !== 'Medication_Note') return false;
      if (new Date(note.created_at).toDateString() !== today) return false;
      if (note.shift !== currentShift) return false;
      try {
        const interventions =
          typeof note.interventions_performed === 'string'
            ? JSON.parse(note.interventions_performed)
            : note.interventions_performed;
        return interventions?.medication_id === prescriptionId;
      } catch {
        return false;
      }
    });
  };

  // ── Mutation ───────────────────────────────────────────────────────────────

  const createNoteMutation = useMutation({
    mutationFn: (data: CreateNursingNoteDTO & { _prescription?: any }) =>
      createNursingNote(data),
    onSuccess: (_result, variables) => {
      showToast({
        title: 'Medication Recorded',
        message: 'Administration event has been logged successfully.',
        type: 'success',
      });

      const rx = (variables as any)._prescription;
      if (rx && encounterId) {
        const drugName = rx.drug_name || 'Unknown';
        const prescriberId = rx.prescribed_by || '';

        if (adminData.status === 'administered') {
          if (prescriberId) {
            recordMedicationAdministered(
              rx.id || '',
              patientName,
              drugName,
              rx.dosage || '',
              currentUserName,
              prescriberId,
              encounterId,
              currentUserId,
            ).catch(() => {});
          }
          notifyCareTeamAboutAction(
            encounterId,
            patientName,
            `Medication administered: ${drugName} ${rx.dosage || ''}`,
            currentUserName,
            'care_team_action_performed',
            'medication_administration',
            rx.id || '',
            currentUserId,
          ).catch(() => {});
        } else if (
          adminData.status === 'refused' ||
          adminData.status === 'omitted'
        ) {
          if (prescriberId) {
            recordMedicationRefused(
              rx.id || '',
              patientName,
              drugName,
              adminData.notes || `Medication ${adminData.status}`,
              currentUserName,
              prescriberId,
              encounterId,
              currentUserId,
            ).catch(() => {});
          }
        }
      }

      setIsFormOpen(false);
      setSelectedPrescription(null);
      setAdminData({ status: 'administered', notes: '', vitalsCheck: false });
      queryClient.invalidateQueries({ queryKey: ['nursing-notes'] });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
    onError: (error) => {
      console.error('Failed to log administration:', error);
      showToast({
        title: 'Error',
        message: 'Failed to save medication administration record.',
        type: 'error',
      });
    },
  });

  const handleAdminister = (prescription: any) => {
    if (!encounterId) {
      showToast({
        title: 'Error',
        message: 'No active encounter found.',
        type: 'error',
      });
      return;
    }

    const noteContent = `MEDICATION ADMINISTRATION REPORT
--------------------------------
Drug: ${prescription.drug_name || 'Unknown Drug'}
Dosage: ${prescription.dosage || 'N/A'}
Frequency: ${prescription.frequency || 'N/A'}
Route: ${prescription.route || 'Oral'}
Duration: ${prescription.duration || 'N/A'}
Status: ${adminData.status.toUpperCase()}
Notes: ${adminData.notes || 'Routine administration.'}`;

    const noteData: CreateNursingNoteDTO = {
      encounter_id: encounterId,
      patient_id: patientId,
      note_type: 'Medication_Note',
      title: `Medication: ${prescription.drug_name || 'Unknown Drug'}`,
      content: noteContent.trim(),
      shift: getCurrentShift(),
      interventions_performed: JSON.stringify({
        medication_id: prescription.id || prescription.prescription_id,
        drug_name: prescription.drug_name,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        route: prescription.route,
        duration: prescription.duration,
        status: adminData.status,
        timestamp: new Date().toISOString(),
      }),
      selected_interventions: ['MED_ADMIN'],
      is_critical: adminData.status === 'refused',
      requires_doctor_review: false,
      follow_up_required: false,
    };

    createNoteMutation.mutate({
      ...noteData,
      _prescription: prescription,
    } as any);
  };

  // ── Derived data (hooks must run before any returns) ───────────────────────

  const pendingPrescriptions = useMemo(
    () =>
      prescriptions.filter(
        (rx: any) =>
          !getCurrentShiftAdministration(rx.id || rx.prescription_id),
      ),
    [prescriptions, nursingNotes],
  );

  const completedPrescriptions = useMemo(
    () =>
      prescriptions.filter((rx: any) =>
        getCurrentShiftAdministration(rx.id || rx.prescription_id),
      ),
    [prescriptions, nursingNotes],
  );

  const filteredPrescriptions = useMemo(() => {
    switch (viewFilter) {
      case 'due':
        return pendingPrescriptions;
      case 'completed':
        return completedPrescriptions;
      default:
        return prescriptions;
    }
  }, [viewFilter, prescriptions, pendingPrescriptions, completedPrescriptions]);

  // ── Loading / empty ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
          Loading medications…
        </div>
      </div>
    );
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Pill className="h-8 w-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-600">
          No Active Prescriptions
        </h3>
        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
          Prescriptions ordered by the doctor will appear here for nursing
          administration
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Gradient Header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                eMAR — Electronic Medication Administration
              </h3>
              <p className="text-sm text-emerald-100 mt-0.5 flex items-center gap-2">
                <Clock size={14} />
                {getCurrentShift()} Shift •{' '}
                {new Date().toLocaleDateString('en-NG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sound mute toggle */}
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className={`p-2 rounded-lg transition-all ${
                soundMuted
                  ? 'bg-white/10 text-white/40'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={
                soundMuted
                  ? 'Unmute medication alerts'
                  : 'Mute medication alerts'
              }
            >
              <Volume2 size={18} className={soundMuted ? 'opacity-40' : ''} />
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {pendingPrescriptions.length}
              </div>
              <div className="text-xs text-emerald-200">Due</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <div className="text-2xl font-bold">
                {completedPrescriptions.length}
              </div>
              <div className="text-xs text-emerald-200">Done</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <div className="text-2xl font-bold">{prescriptions.length}</div>
              <div className="text-xs text-emerald-200">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {(
          [
            {
              key: 'all' as ViewFilter,
              label: 'All Medications',
              Icon: Pill,
              count: prescriptions.length,
            },
            {
              key: 'due' as ViewFilter,
              label: 'Due Now',
              Icon: Clock,
              count: pendingPrescriptions.length,
            },
            {
              key: 'completed' as ViewFilter,
              label: 'Completed',
              Icon: CheckCircle2,
              count: completedPrescriptions.length,
            },
            {
              key: 'history' as ViewFilter,
              label: 'Timeline',
              Icon: History,
              count: null,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewFilter(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              viewFilter === tab.key
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.Icon size={15} />
            {tab.label}
            {tab.count !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  viewFilter === tab.key
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Medication Timeline ─────────────────────────────────────────────── */}
      <div className="relative">
        {/* vertical timeline line */}
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200 z-0" />

        <div className="space-y-4 relative z-10">
          {filteredPrescriptions.length === 0 ? (
            <div className="ml-12 bg-gray-50 rounded-xl p-10 text-center border border-gray-100">
              <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {viewFilter === 'due'
                  ? 'All medications administered for this shift'
                  : viewFilter === 'completed'
                    ? 'No completed medications yet'
                    : 'No medications to display'}
              </p>
            </div>
          ) : (
            filteredPrescriptions.map((rx: any) => {
              const rxId = rx.id || rx.prescription_id;
              const currentShiftAdmin = getCurrentShiftAdministration(rxId);
              const allAdmins = getAllAdministrations(rxId);
              const isDue = !currentShiftAdmin;
              const isSelected = selectedPrescription === rxId;
              const timeInfo = getTimeRemaining(rx.created_at, rx.duration);
              const progressColor = getProgressColor(
                timeInfo.percentComplete,
                timeInfo.isExpired,
              );

              // Compute next-dose countdown
              const lastAdmin =
                allAdmins.length > 0 ? allAdmins[0].created_at : null;
              const nextDoseInfo = getNextDoseInfo(
                lastAdmin,
                rx.created_at,
                rx.frequency,
                timeInfo.isExpired,
              );

              return (
                <div key={rxId} className="flex gap-4">
                  {/* ── Timeline node ── */}
                  <div className="flex-shrink-0 relative z-10">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-sm ${
                        currentShiftAdmin
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                          : timeInfo.isExpired
                            ? 'bg-gray-100 border-gray-400 text-gray-500'
                            : 'bg-white border-emerald-500 text-emerald-600'
                      }`}
                    >
                      {currentShiftAdmin ? (
                        <Check size={18} strokeWidth={3} />
                      ) : timeInfo.isExpired ? (
                        <Clock size={18} />
                      ) : (
                        <Pill size={18} />
                      )}
                    </div>
                  </div>

                  {/* ── Medication card ── */}
                  <div
                    className={`flex-1 rounded-2xl border overflow-hidden transition-all duration-300 ${
                      isSelected
                        ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-lg'
                        : currentShiftAdmin
                          ? 'border-gray-200 bg-gray-50/50'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    {/* Card header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Drug name + status badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-bold text-gray-900">
                              {rx.drug_name || 'Unknown Drug'}
                            </h4>
                            {currentShiftAdmin &&
                              (() => {
                                let interventions: any = {};
                                try {
                                  interventions =
                                    typeof currentShiftAdmin.interventions_performed ===
                                    'string'
                                      ? JSON.parse(
                                          currentShiftAdmin.interventions_performed,
                                        )
                                      : currentShiftAdmin.interventions_performed ||
                                        {};
                                } catch {
                                  /* */
                                }
                                const cfg = getStatusConfig(
                                  interventions?.status || 'administered',
                                );
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border`}
                                  >
                                    <cfg.icon size={12} />
                                    {cfg.label}
                                  </span>
                                );
                              })()}
                            {isDue && !timeInfo.isExpired && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
                                <Clock size={12} /> Due
                              </span>
                            )}
                            {timeInfo.isExpired && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                <CheckCircle2 size={12} /> Course Ended
                              </span>
                            )}
                          </div>

                          {/* Prescription detail grid */}
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-violet-50 rounded">
                                <Activity
                                  size={12}
                                  className="text-violet-500"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                  Dosage
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {rx.dosage || '—'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-50 rounded">
                                <Clock size={12} className="text-blue-500" />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                  Frequency
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {rx.frequency || '—'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-teal-50 rounded">
                                <Activity size={12} className="text-teal-500" />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                  Route
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {rx.route || 'Oral'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-amber-50 rounded">
                                <Calendar
                                  size={12}
                                  className="text-amber-500"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                  Duration
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {rx.duration || 'Not specified'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Extra info: qty, prescriber, date */}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {rx.quantity > 0 && (
                              <span className="flex items-center gap-1">
                                <Pill size={11} /> Qty: {rx.quantity}
                              </span>
                            )}
                            {(rx.prescribed_by_name || rx.prescribed_by) && (
                              <span className="flex items-center gap-1">
                                <User size={11} /> Dr.{' '}
                                {rx.prescribed_by_name || 'Unknown'}
                              </span>
                            )}
                            {rx.created_at &&
                              isValidDate(new Date(rx.created_at)) && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} /> Started{' '}
                                  {new Date(rx.created_at).toLocaleDateString(
                                    'en-NG',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                    },
                                  )}
                                </span>
                              )}
                          </div>

                          {/* Instructions */}
                          {rx.instructions && (
                            <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                              <AlertCircle
                                size={14}
                                className="text-amber-500 mt-0.5 flex-shrink-0"
                              />
                              <p className="text-sm text-amber-800 italic leading-snug">
                                {rx.instructions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action button column */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {isDue && !timeInfo.isExpired ? (
                            isSelected ? (
                              <button
                                onClick={() => {
                                  setSelectedPrescription(null);
                                  setIsFormOpen(false);
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedPrescription(rxId);
                                  setIsFormOpen(true);
                                }}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow hover:bg-emerald-700 transition flex items-center gap-2"
                              >
                                <Plus size={16} /> Administer
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>

                      {/* Duration progress bar */}
                      {!timeInfo.isIndefinite && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="flex items-center gap-1 text-gray-500">
                              <Timer size={12} /> {timeInfo.label}
                            </span>
                            <span className="text-gray-400 font-medium">
                              {Math.round(timeInfo.percentComplete)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                              style={{ width: `${timeInfo.percentComplete}%` }}
                            />
                          </div>
                          {!timeInfo.isExpired &&
                            timeInfo.hoursLeft !== null &&
                            rx.created_at &&
                            isValidDate(new Date(rx.created_at)) && (
                              <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                                <span>
                                  Started{' '}
                                  {new Date(rx.created_at).toLocaleDateString(
                                    'en-NG',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                    },
                                  )}
                                </span>
                                {(() => {
                                  const end = getEndDate(
                                    rx.created_at,
                                    rx.duration,
                                  );
                                  return end ? (
                                    <span>
                                      Ends{' '}
                                      {end.toLocaleDateString('en-NG', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            )}
                        </div>
                      )}

                      {/* ── Next Dose Countdown ─────────────────────────────── */}
                      {nextDoseInfo && !timeInfo.isExpired && (
                        <div
                          className={`mt-3 pt-3 border-t border-gray-100 ${
                            nextDoseInfo.isOverdue
                              ? 'bg-red-50/50'
                              : nextDoseInfo.isDueSoon
                                ? 'bg-amber-50/50'
                                : ''
                          } rounded-lg`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg ${
                                  nextDoseInfo.isOverdue
                                    ? 'bg-red-100'
                                    : nextDoseInfo.isDueSoon
                                      ? 'bg-amber-100'
                                      : 'bg-blue-100'
                                }`}
                              >
                                <BellRing
                                  size={14}
                                  className={
                                    nextDoseInfo.isOverdue
                                      ? 'text-red-600'
                                      : nextDoseInfo.isDueSoon
                                        ? 'text-amber-600'
                                        : 'text-blue-600'
                                  }
                                />
                              </div>
                              <div>
                                <div
                                  className={`text-sm font-bold ${
                                    nextDoseInfo.isOverdue
                                      ? 'text-red-700'
                                      : nextDoseInfo.isDueSoon
                                        ? 'text-amber-700'
                                        : 'text-blue-700'
                                  }`}
                                >
                                  {nextDoseInfo.label}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {nextDoseInfo.nextDueAt.toLocaleTimeString(
                                    'en-NG',
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}{' '}
                                  {nextDoseInfo.nextDueAt.toLocaleDateString(
                                    'en-NG',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                    },
                                  )}
                                </div>
                              </div>
                            </div>
                            {(nextDoseInfo.isOverdue ||
                              nextDoseInfo.isDueSoon) && (
                              <span
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  nextDoseInfo.isOverdue
                                    ? 'bg-red-100 text-red-700 animate-pulse'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                <Volume2 size={10} />
                                {nextDoseInfo.isOverdue
                                  ? 'OVERDUE'
                                  : 'DUE SOON'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Administer form (expandable) ──────────────────────── */}
                    {isSelected && isFormOpen && (
                      <div className="border-t border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-5">
                        <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileText size={14} /> Record Administration
                        </h4>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Action
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminData({
                                      ...adminData,
                                      status: 'administered',
                                    })
                                  }
                                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                                    adminData.status === 'administered'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  Administered
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminData({
                                      ...adminData,
                                      status: 'omitted',
                                    })
                                  }
                                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                                    adminData.status === 'omitted'
                                      ? 'bg-amber-500 text-white border-amber-500 shadow'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  Omitted
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminData({
                                      ...adminData,
                                      status: 'refused',
                                    })
                                  }
                                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                                    adminData.status === 'refused'
                                      ? 'bg-red-500 text-white border-red-500 shadow'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  Refused
                                </button>
                              </div>
                            </div>

                            <label className="flex items-center gap-2.5 p-3 bg-blue-50/60 rounded-lg border border-blue-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adminData.vitalsCheck}
                                onChange={(e) =>
                                  setAdminData({
                                    ...adminData,
                                    vitalsCheck: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-gray-700 select-none">
                                I have checked patient vitals before
                                administration
                              </span>
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes / Comments
                            </label>
                            <textarea
                              value={adminData.notes}
                              onChange={(e) =>
                                setAdminData({
                                  ...adminData,
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Enter observations, reactions, or reasons for omission..."
                              className="w-full min-h-[110px] p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 mt-4 border-t border-emerald-100">
                          <button
                            onClick={() => handleAdminister(rx)}
                            disabled={createNoteMutation.isPending}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {createNoteMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving…
                              </>
                            ) : (
                              <>
                                <Save size={18} />
                                Confirm & Save Record
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Administration History ────────────────────────────── */}
                    {allAdmins.length > 0 &&
                      (viewFilter === 'history' || viewFilter === 'all') && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <History size={12} /> Administration History (
                            {allAdmins.length})
                          </h5>
                          <div className="space-y-1.5">
                            {allAdmins.map((note: any, idx: number) => {
                              let interventions: any = {};
                              try {
                                interventions =
                                  typeof note.interventions_performed ===
                                  'string'
                                    ? JSON.parse(note.interventions_performed)
                                    : note.interventions_performed || {};
                              } catch {
                                /* */
                              }
                              const statusCfg = getStatusConfig(
                                interventions?.status || 'administered',
                              );
                              const noteDate = new Date(note.created_at);
                              const isToday =
                                noteDate.toDateString() ===
                                new Date().toDateString();

                              return (
                                <div
                                  key={note.id || idx}
                                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white transition"
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span
                                        className={`font-bold ${statusCfg.text}`}
                                      >
                                        {statusCfg.label}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span className="text-gray-500">
                                        {isToday
                                          ? 'Today'
                                          : noteDate.toLocaleDateString(
                                              'en-NG',
                                              {
                                                month: 'short',
                                                day: 'numeric',
                                              },
                                            )}{' '}
                                        {noteDate.toLocaleTimeString('en-NG', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span className="text-gray-500">
                                        {note.shift || '—'} shift
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      by {note.recorded_by_name || 'Nurse'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Quick completed indicator for filtered views */}
                    {currentShiftAdmin &&
                      viewFilter !== 'history' &&
                      viewFilter !== 'all' && (
                        <div className="border-t border-gray-100 bg-emerald-50/30 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-700">
                          <Check size={14} />
                          <span>
                            Administered by{' '}
                            {currentShiftAdmin.recorded_by_name || 'Nurse'} at{' '}
                            {new Date(
                              currentShiftAdmin.created_at,
                            ).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Footer Info ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
        <div className="p-2.5 bg-blue-100 rounded-xl flex-shrink-0 h-fit">
          <History className="text-blue-600 h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 text-sm">
            Complete Administration Trail
          </h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            All medication events are permanently recorded. Use the{' '}
            <strong>Timeline</strong> tab to view full administration history
            across all shifts. Past administration records also appear in
            Nursing Notes.
          </p>
        </div>
      </div>
    </div>
  );
}
