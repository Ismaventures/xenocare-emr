/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - CARE TEAM TAB (Encounter-Centric View)
 * =============================================================================
 *
 * Improved, user-friendly care team management panel for the encounter-centric
 * medical records view. Allows the primary/attending doctor to manage who can
 * document, order, and view this patient's encounter.
 *
 * Standard medical practice:
 *   - Primary Doctor has full control (owner)
 *   - Co-Managing Doctors can edit/order
 *   - Consultants provide opinions (limited write)
 *   - Nurses require explicit assignment
 *   - Department doctors get view-only
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  Loader2,
  Eye,
  Edit3,
  FileText,
  Stethoscope,
  Crown,
  UserCheck,
  Lock,
  Info,
  HeartPulse,
  ClipboardList,
  Phone,
} from 'lucide-react';
import { Button } from '../../../../../../components/ui/FormElements';
import {
  useEncounterAccess,
  type EncounterRole,
  type EncounterCareTeamMember,
} from '../../../../../../lib/encounter';
import {
  useDoctors,
  useClinicalStaff,
  type DoctorOption,
  type ClinicalStaffOption,
} from '../../../../../staff/hooks/useStaff';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { EncounterDetail } from '../../../../api/medical-records.api';

// =============================================================================
// TYPES
// =============================================================================

interface CareTeamTabProps {
  encounter: EncounterDetail;
}

// Roles the primary doctor can assign
const ASSIGNABLE_ROLES: {
  value: EncounterRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'co_managing_doctor',
    label: 'Co-Managing Doctor',
    description:
      'Full edit access — can write notes, make orders, and manage patient',
  },
  {
    value: 'consulting_doctor',
    label: 'Consultant',
    description: 'Can add consultation notes and recommendations',
  },
  {
    value: 'on_call_doctor',
    label: 'On-Call Doctor',
    description: 'Temporary coverage — can edit during assigned hours',
  },
  {
    value: 'nurse',
    label: 'Nurse',
    description: 'Can record vitals, nursing notes, and administer medications',
  },
];

// Role visual config
const ROLE_STYLES: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    dot: string;
    badge: string;
  }
> = {
  primary_doctor: {
    label: 'Primary Doctor (Owner)',
    icon: Crown,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  co_managing_doctor: {
    label: 'Co-Managing Doctor',
    icon: Users,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
  consulting_doctor: {
    label: 'Consultant',
    icon: Stethoscope,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-800',
  },
  on_call_doctor: {
    label: 'On-Call Doctor',
    icon: Phone,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800',
  },
  department_doctor: {
    label: 'Department Doctor',
    icon: Eye,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700',
  },
  referred_doctor: {
    label: 'Referred Doctor',
    icon: ArrowRightLeft,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  nurse: {
    label: 'Nurse',
    icon: HeartPulse,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    badge: 'bg-teal-100 text-teal-800',
  },
  lab_technician: {
    label: 'Lab Technician',
    icon: FileText,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  radiologist: {
    label: 'Radiologist',
    icon: FileText,
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    badge: 'bg-pink-100 text-pink-800',
  },
  pharmacist: {
    label: 'Pharmacist',
    icon: FileText,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  no_access: {
    label: 'No Access',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
  },
  queue_view_only: {
    label: 'Queue View',
    icon: Lock,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600',
  },
};

const getStyle = (role: string) => ROLE_STYLES[role] || ROLE_STYLES.no_access;

// =============================================================================
// HELPERS
// =============================================================================

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h left`;
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

const getFullName = (s: ClinicalStaffOption | DoctorOption) =>
  `${s.first_name} ${s.last_name}`.trim();

// =============================================================================
// MEMBER CARD
// =============================================================================

function MemberCard({
  member,
  canRemove,
  onRemove,
  isRemoving,
}: {
  member: EncounterCareTeamMember;
  canRemove: boolean;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  const style = getStyle(member.role);
  const Icon = style.icon;
  const hasExpiry =
    member.expires_at && new Date(member.expires_at) > new Date();
  const isPrimary = member.role === 'primary_doctor';

  return (
    <div
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border ${style.border} ${style.bg} transition-shadow hover:shadow-sm group`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${style.badge}`}
      >
        {member.staff_name
          ?.split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {member.staff_name}
          </span>
          {isPrimary && (
            <Crown size={14} className="text-amber-500 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${style.badge}`}
          >
            <Icon size={11} />
            {style.label}
          </span>
        </div>

        {member.department && (
          <span className="text-xs text-gray-500 mt-0.5 block">
            {member.department}
          </span>
        )}

        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
          <span>Added {formatRelativeTime(member.assigned_at)}</span>
          {hasExpiry && (
            <span className="flex items-center gap-0.5 text-orange-600 font-medium">
              <Clock size={10} />
              {getTimeRemaining(member.expires_at!)}
            </span>
          )}
        </div>

        {member.notes && (
          <div className="mt-2 text-xs text-gray-600 bg-white/60 px-2 py-1.5 rounded-lg border border-gray-100 italic">
            &ldquo;{member.notes}&rdquo;
          </div>
        )}
      </div>

      {/* Remove button (not for primary) */}
      {canRemove && !isPrimary && (
        <button
          onClick={() => onRemove(member.staff_id)}
          disabled={isRemoving}
          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
          title="Remove from care team"
        >
          {isRemoving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UserMinus size={14} />
          )}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// ADD MEMBER MODAL (Improved)
// =============================================================================

function AddMemberModal({
  isOpen,
  onClose,
  encounterId,
  onComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  onComplete: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRole, setSelectedRole] =
    useState<EncounterRole>('co_managing_doctor');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(8);
  const [isTemporary, setIsTemporary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const { addMemberToCareTeam } = useEncounterAccess({ encounterId });
  const { data: clinicalStaff = [], isLoading: loadingStaff } =
    useClinicalStaff();

  const filteredStaff = useMemo(() => {
    const staff = clinicalStaff as ClinicalStaffOption[];
    if (!searchQuery) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter(
      (s) =>
        getFullName(s).toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q),
    );
  }, [clinicalStaff, searchQuery]);

  const selectedStaff = (clinicalStaff as ClinicalStaffOption[]).find(
    (s) => s.id === selectedStaffId,
  );

  const handleSubmit = async () => {
    if (!selectedStaffId) return;
    setError('');
    setIsSubmitting(true);
    try {
      const expiresAt = isTemporary
        ? new Date(Date.now() + duration * 3600000).toISOString()
        : undefined;
      await addMemberToCareTeam(
        selectedStaffId,
        selectedRole,
        expiresAt,
        notes || undefined,
      );
      onComplete();
      onClose();
      setSelectedStaffId('');
      setSelectedRole('co_managing_doctor');
      setNotes('');
      setIsTemporary(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <UserPlus size={18} className="text-emerald-600" />
            </div>
            Add Care Team Member
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Assign staff to this encounter with appropriate access level
          </p>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Staff search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Staff Member
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>

            {/* Staff list */}
            <div className="mt-2 border border-gray-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-gray-100">
              {loadingStaff ? (
                <div className="p-4 text-center">
                  <Loader2
                    size={20}
                    className="animate-spin mx-auto text-gray-400"
                  />
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No staff found
                </div>
              ) : (
                filteredStaff.map((s: ClinicalStaffOption) => {
                  const isSelected = selectedStaffId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStaffId(s.id);
                        setSearchQuery('');
                        if (s.role === 'nurse') setSelectedRole('nurse');
                        else if (selectedRole === 'nurse')
                          setSelectedRole('co_managing_doctor');
                      }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition ${
                        isSelected
                          ? 'bg-emerald-50 ring-1 ring-emerald-200'
                          : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {s.first_name[0]}
                        {s.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                          {getFullName(s)}
                          {isSelected && (
                            <CheckCircle
                              size={14}
                              className="text-emerald-500"
                            />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.role && (
                            <span className="capitalize">{s.role}</span>
                          )}
                          {s.department && (
                            <span> &middot; {s.department}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedStaff && (
              <div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle size={14} />
                Selected: <strong>{getFullName(selectedStaff)}</strong>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Access Role
            </label>
            <div className="grid gap-2">
              {ASSIGNABLE_ROLES.map((r) => {
                const style = getStyle(r.value);
                const RIcon = style.icon;
                const isActive = selectedRole === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? `${style.border} ${style.bg} ring-1 ring-offset-1 ${style.border}`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${isActive ? style.badge : 'bg-gray-100 text-gray-500'}`}
                    >
                      <RIcon size={14} />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium ${isActive ? style.color : 'text-gray-900'}`}
                      >
                        {r.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.description}
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle
                        size={16}
                        className={`mt-0.5 ${style.color}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temporary access */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTemporary}
                onChange={(e) => setIsTemporary(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">
                Temporary access (auto-expires)
              </span>
            </label>

            {isTemporary && (
              <div className="flex items-center gap-3 pl-6">
                <Clock size={14} className="text-gray-400" />
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                >
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours (1 shift)</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notes{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cover for ward round, consult for cardiology opinion..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStaffId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus size={16} className="mr-1.5" />
                Add Member
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TRANSFER / CONSULTATION MODAL (Improved)
// =============================================================================

function TransferModal({
  isOpen,
  onClose,
  encounterId,
  transferType,
  onComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  transferType: 'reassignment' | 'co_management' | 'consultation' | 'handoff';
  onComplete: () => void;
}) {
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const { transferOwnership } = useEncounterAccess({ encounterId });
  const { data: doctors = [], isLoading: loadingDoctors } = useDoctors();

  const filteredDoctors = useMemo(() => {
    const list = doctors as DoctorOption[];
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) =>
        getFullName(d).toLowerCase().includes(q) ||
        d.department?.toLowerCase().includes(q),
    );
  }, [doctors, searchQuery]);

  const selectedDoctor = (doctors as DoctorOption[]).find(
    (d) => d.id === selectedDoctorId,
  );

  const config: Record<
    string,
    {
      title: string;
      desc: string;
      icon: React.ElementType;
      accent: string;
      btnLabel: string;
    }
  > = {
    reassignment: {
      title: 'Transfer Ownership',
      desc: 'Hand over primary responsibility to another doctor. You will lose editing access.',
      icon: ArrowRightLeft,
      accent: 'amber',
      btnLabel: 'Transfer Ownership',
    },
    co_management: {
      title: 'Add Co-Manager',
      desc: 'Grant another doctor full editing access alongside you.',
      icon: Users,
      accent: 'blue',
      btnLabel: 'Add Co-Manager',
    },
    consultation: {
      title: 'Request Consultation',
      desc: 'Request a specialist opinion. They will get limited write access to add findings.',
      icon: Stethoscope,
      accent: 'purple',
      btnLabel: 'Request Consultation',
    },
    handoff: {
      title: 'Shift Handoff',
      desc: 'Transfer care for end-of-shift. The receiving doctor becomes primary.',
      icon: Clock,
      accent: 'orange',
      btnLabel: 'Complete Handoff',
    },
  };

  const c = config[transferType];
  const TIcon = c.icon;

  const handleSubmit = async () => {
    if (!selectedDoctorId || !reason.trim()) return;
    setError('');
    setIsSubmitting(true);
    try {
      await transferOwnership(selectedDoctorId, transferType, reason);
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div
          className={`px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-${c.accent}-50 to-white`}
        >
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className={`p-1.5 bg-${c.accent}-100 rounded-lg`}>
              <TIcon size={18} className={`text-${c.accent}-600`} />
            </div>
            {c.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Doctor search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Select Doctor
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="mt-2 border border-gray-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-gray-100">
              {loadingDoctors ? (
                <div className="p-4 text-center">
                  <Loader2
                    size={20}
                    className="animate-spin mx-auto text-gray-400"
                  />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No doctors found
                </div>
              ) : (
                filteredDoctors.map((d: DoctorOption) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDoctorId(d.id);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition ${
                      selectedDoctorId === d.id
                        ? 'bg-emerald-50 ring-1 ring-emerald-200'
                        : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {d.first_name[0]}
                      {d.last_name?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        Dr. {getFullName(d)}
                        {selectedDoctorId === d.id && (
                          <CheckCircle size={14} className="text-emerald-500" />
                        )}
                      </div>
                      {d.department && (
                        <div className="text-xs text-gray-500">
                          {d.department}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            {selectedDoctor && (
              <div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle size={14} />
                Selected: <strong>Dr. {getFullName(selectedDoctor)}</strong>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                transferType === 'consultation'
                  ? 'Describe the clinical question or concern...'
                  : 'Provide reason for this action...'
              }
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          {transferType === 'reassignment' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle
                size={16}
                className="text-amber-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-amber-700">
                This will transfer <strong>full ownership</strong> of this
                encounter. You will lose editing privileges.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDoctorId || !reason.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              c.btnLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CARE TEAM TAB COMPONENT
// =============================================================================

export function CareTeamTab({ encounter }: CareTeamTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferType, setTransferType] = useState<
    'reassignment' | 'co_management' | 'consultation' | 'handoff'
  >('consultation');
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const { staff } = useAuth();
  const userRole = staff?.role || '';

  // Access control from the hook
  const {
    encounterRole,
    isLoading,
    isPrimaryDoctor,
    canEdit,
    canView,
    canTransfer,
    canAddToCareTeam,
    careTeam,
    careTeamLoading,
    removeMemberFromCareTeam,
    refetch,
  } = useEncounterAccess({ encounterId: encounter.encounter_id });

  const hasAccess = [
    'super_admin',
    'admin',
    'doctor',
    'medical_director',
    'nurse',
  ].includes(userRole);

  // Categorize members
  const { primaryMembers, doctorMembers, nurseMembers, otherMembers } =
    useMemo(() => {
      const primary: EncounterCareTeamMember[] = [];
      const doctors: EncounterCareTeamMember[] = [];
      const nurses: EncounterCareTeamMember[] = [];
      const others: EncounterCareTeamMember[] = [];

      careTeam.forEach((m) => {
        if (m.role === 'primary_doctor') primary.push(m);
        else if (
          [
            'co_managing_doctor',
            'consulting_doctor',
            'on_call_doctor',
            'department_doctor',
            'referred_doctor',
          ].includes(m.role)
        )
          doctors.push(m);
        else if (m.role === 'nurse') nurses.push(m);
        else others.push(m);
      });

      return {
        primaryMembers: primary,
        doctorMembers: doctors,
        nurseMembers: nurses,
        otherMembers: others,
      };
    }, [careTeam]);

  const handleRemove = async (staffId: string) => {
    setRemovingMember(staffId);
    try {
      await removeMemberFromCareTeam(staffId);
      refetch();
    } catch (err) {
      console.error('Failed to remove care team member:', err);
    } finally {
      setRemovingMember(null);
    }
  };

  const openTransfer = (type: typeof transferType) => {
    setTransferType(type);
    setShowTransferModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2
            size={28}
            className="animate-spin text-emerald-500 mx-auto mb-3"
          />
          <p className="text-sm text-gray-500">Loading care team...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <Lock size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Access Restricted
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Care team management is available to doctors, nurses, and
          administrators.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-6 pb-8">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-500" />
              Care Team
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage who can view, document, and order on this encounter
            </p>
          </div>

          {canAddToCareTeam && (
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus size={16} className="mr-1.5" />
              Add Member
            </Button>
          )}
        </div>

        {/* Your Access Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Your Access Level
            </h3>
          </div>
          <div className="p-5">
            {encounterRole && encounterRole !== 'no_access' ? (
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${getStyle(encounterRole).bg} ${getStyle(encounterRole).border} border`}
                >
                  {React.createElement(getStyle(encounterRole).icon, {
                    size: 22,
                    className: getStyle(encounterRole).color,
                  })}
                </div>
                <div>
                  <div className={`font-bold ${getStyle(encounterRole).color}`}>
                    {getStyle(encounterRole).label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isPrimaryDoctor
                      ? 'Full control — you own this encounter'
                      : canEdit
                        ? 'Can view, write notes, and make orders'
                        : canView
                          ? 'View only — cannot make changes'
                          : 'Limited access'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-600">
                <XCircle size={20} />
                <span className="font-medium">No access to this encounter</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions — Primary Doctor Only */}
        {isPrimaryDoctor && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Quick Actions
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => openTransfer('consultation')}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-purple-800">
                      Request Consultation
                    </div>
                    <div className="text-xs text-purple-600">
                      Get a specialist opinion
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => openTransfer('co_management')}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-blue-800">
                      Add Co-Manager
                    </div>
                    <div className="text-xs text-blue-600">
                      Share editing access
                    </div>
                  </div>
                </button>

                {canTransfer && (
                  <button
                    onClick={() => openTransfer('reassignment')}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left group"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition">
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-amber-800">
                        Transfer Ownership
                      </div>
                      <div className="text-xs text-amber-600">
                        Hand over to another doctor
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Care Team Members */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Team Members
              <span className="ml-2 text-gray-400">({careTeam.length})</span>
            </h3>
          </div>

          {careTeamLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : careTeam.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Users size={24} className="text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-700 mb-1">
                No team members yet
              </h4>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                {canAddToCareTeam
                  ? "Add doctors and nurses to collaborate on this patient's care."
                  : 'Only the primary doctor can assign care team members.'}
              </p>
              {canAddToCareTeam && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4"
                >
                  <UserPlus size={14} className="mr-1" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* Primary Doctor Section */}
              {primaryMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={14} className="text-amber-500" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Primary Doctor
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {primaryMembers.map((m) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        canRemove={false}
                        onRemove={handleRemove}
                        isRemoving={removingMember === m.staff_id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Doctors Section */}
              {doctorMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope size={14} className="text-blue-500" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Doctors ({doctorMembers.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {doctorMembers.map((m) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        canRemove={canAddToCareTeam}
                        onRemove={handleRemove}
                        isRemoving={removingMember === m.staff_id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Nurses Section */}
              {nurseMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <HeartPulse size={14} className="text-teal-500" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Nurses ({nurseMembers.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {nurseMembers.map((m) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        canRemove={canAddToCareTeam}
                        onRemove={handleRemove}
                        isRemoving={removingMember === m.staff_id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Staff Section */}
              {otherMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={14} className="text-indigo-500" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Other Staff ({otherMembers.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {otherMembers.map((m) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        canRemove={canAddToCareTeam}
                        onRemove={handleRemove}
                        isRemoving={removingMember === m.staff_id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Access Level Guide */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Info size={14} className="text-gray-400" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Access Level Guide
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  role: 'primary_doctor',
                  perms: 'Full control — notes, orders, transfer, close',
                },
                {
                  role: 'co_managing_doctor',
                  perms: 'Full edit — notes, orders, vitals (cannot transfer)',
                },
                {
                  role: 'consulting_doctor',
                  perms: 'Add consultation notes & diagnosis only',
                },
                {
                  role: 'nurse',
                  perms: 'Record vitals, nursing notes, administer meds',
                },
                {
                  role: 'on_call_doctor',
                  perms: 'Temporary full edit during coverage hours',
                },
                {
                  role: 'department_doctor',
                  perms: 'View only — can see records, cannot edit',
                },
              ].map(({ role, perms }) => {
                const s = getStyle(role);
                const I = s.icon;
                return (
                  <div key={role} className="flex items-start gap-2.5">
                    <div
                      className={`w-2 h-2 mt-1.5 rounded-full ${s.dot} flex-shrink-0`}
                    />
                    <div>
                      <span className={`text-xs font-semibold ${s.color}`}>
                        {s.label}
                      </span>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {perms}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        encounterId={encounter.encounter_id}
        onComplete={() => refetch()}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        encounterId={encounter.encounter_id}
        transferType={transferType}
        onComplete={() => {
          refetch();
        }}
      />
    </>
  );
}

export default CareTeamTab;
