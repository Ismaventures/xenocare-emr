import React, { useMemo, useState } from 'react';
import {
  Search,
  User,
  Phone,
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  FileText,
  StickyNote,
  X,
  Check,
  Loader2,
  CalendarPlus,
  Timer,
} from 'lucide-react';
import { useCreateAppointment, useDoctors } from '../hooks/useCustomerService';
import {
  AppointmentType,
  CreateAppointmentDTO,
} from '../dtos/customer-service.dto';
import { usePatients } from '../../patient-registration/hooks/usePatient';
import { useToast } from '../../../components/ui/Toast';

interface AppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700/20 transition-colors';
const LABEL_CLS = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

const appointmentTypes: { value: AppointmentType; label: string; color: string }[] = [
  { value: 'Consultation', label: 'Consultation', color: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'Follow-up', label: 'Follow-up', color: 'border-purple-200 bg-purple-50 text-purple-700' },
  { value: 'Lab', label: 'Lab', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'Radiology', label: 'Radiology', color: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  { value: 'Procedure', label: 'Procedure', color: 'border-orange-200 bg-orange-50 text-orange-700' },
];

export function AppointmentForm({ onSuccess, onCancel }: AppointmentFormProps) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSelected, setPatientSelected] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState<CreateAppointmentDTO>({
    patient_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    appointment_type: 'Consultation' as AppointmentType,
    duration_minutes: 30,
    department: '',
    doctor_id: '',
    reason: '',
    notes: '',
  });

  const createAppointment = useCreateAppointment();
  const { data: patients } = usePatients({ query: patientQuery });
  const { data: doctors } = useDoctors();
  const { showToast } = useToast();

  const patientChoices = useMemo(() => {
    if (!patients || !patientQuery || patientSelected) return [];
    return patients.slice(0, 6);
  }, [patients, patientQuery, patientSelected]);

  const doctorOptions = useMemo(() => {
    return (doctors || []).map((d) => ({
      value: d.staff_id,
      label: `Dr. ${d.first_name} ${d.last_name}`,
    }));
  }, [doctors]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!payload.patient_id) next.patient_id = 'Please select a patient';
    if (!payload.appointment_date) next.appointment_date = 'Date is required';
    if (!payload.appointment_time) next.appointment_time = 'Time is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createAppointment.mutateAsync({
        ...payload,
        department: payload.department || undefined,
        doctor_id: payload.doctor_id || undefined,
        reason: payload.reason || undefined,
        notes: payload.notes || undefined,
      });
      showToast({
        type: 'success',
        title: 'Appointment Scheduled',
        message: 'Appointment has been booked successfully',
      });
      onSuccess();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Booking Failed',
        message: 'Failed to create appointment. Please try again.',
      });
    }
  };

  const clearPatient = () => {
    setPayload((prev) => ({ ...prev, patient_id: '' }));
    setPatientQuery('');
    setPatientSelected(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ── Step 1: Patient Search ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">1</div>
          <span className="text-xs font-semibold text-gray-700">Select Patient</span>
        </div>

        {patientSelected && payload.patient_id ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900">{patientQuery}</span>
              <span className="ml-2 text-[11px] text-gray-400">Patient selected</span>
            </div>
            <button type="button" onClick={clearPatient} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient by name or phone number..."
              value={patientQuery}
              onChange={(e) => { setPatientQuery(e.target.value); setPatientSelected(false); }}
              className={`${INPUT_CLS} pl-10 ${errors.patient_id ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
            />
            {errors.patient_id && <p className="mt-1 text-[11px] text-red-500">{errors.patient_id}</p>}

            {/* Patient dropdown */}
            {patientChoices.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {patientChoices.map((p) => (
                  <button
                    key={p.patient_id}
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-primary-700/5 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                    onClick={() => {
                      setPayload((prev) => ({ ...prev, patient_id: p.patient_id }));
                      setPatientQuery(`${p.first_name} ${p.surname}`);
                      setPatientSelected(true);
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700/10 text-xs font-bold text-primary-700">
                      {(p.first_name?.[0] || '') + (p.surname?.[0] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.surname}</p>
                      {p.emr_number && <p className="text-[10px] text-gray-400">EMR: {p.emr_number}</p>}
                    </div>
                    {p.contact_phone && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <Phone className="h-3 w-3" />
                        {p.contact_phone}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: Appointment Type ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">2</div>
          <span className="text-xs font-semibold text-gray-700">Appointment Type</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {appointmentTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPayload((prev) => ({ ...prev, appointment_type: t.value }))}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                payload.appointment_type === t.value
                  ? `${t.color} ring-1 ring-current/20`
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 3: Date, Time & Duration ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">3</div>
          <span className="text-xs font-semibold text-gray-700">Schedule</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL_CLS}>
              <Calendar className="inline h-3 w-3 mr-1" />
              Date
            </label>
            <input
              type="date"
              value={payload.appointment_date}
              onChange={(e) => setPayload((prev) => ({ ...prev, appointment_date: e.target.value }))}
              className={`${INPUT_CLS} ${errors.appointment_date ? 'border-red-300' : ''}`}
            />
            {errors.appointment_date && <p className="mt-1 text-[11px] text-red-500">{errors.appointment_date}</p>}
          </div>
          <div>
            <label className={LABEL_CLS}>
              <Clock className="inline h-3 w-3 mr-1" />
              Time
            </label>
            <input
              type="time"
              value={payload.appointment_time}
              onChange={(e) => setPayload((prev) => ({ ...prev, appointment_time: e.target.value }))}
              className={`${INPUT_CLS} ${errors.appointment_time ? 'border-red-300' : ''}`}
            />
            {errors.appointment_time && <p className="mt-1 text-[11px] text-red-500">{errors.appointment_time}</p>}
          </div>
          <div>
            <label className={LABEL_CLS}>
              <Timer className="inline h-3 w-3 mr-1" />
              Duration
            </label>
            <div className="relative">
              <input
                type="number"
                min={5}
                value={payload.duration_minutes || 30}
                onChange={(e) => setPayload((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                className={INPUT_CLS}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step 4: Doctor & Department ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">4</div>
          <span className="text-xs font-semibold text-gray-700">Assignment</span>
          <span className="text-[10px] text-gray-400 ml-1">(optional)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>
              <Stethoscope className="inline h-3 w-3 mr-1" />
              Doctor
            </label>
            <select
              value={payload.doctor_id || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, doctor_id: e.target.value }))}
              className={INPUT_CLS}
            >
              <option value="">Select doctor...</option>
              {doctorOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>
              <Building2 className="inline h-3 w-3 mr-1" />
              Department
            </label>
            <input
              type="text"
              placeholder="e.g. General OPD"
              value={payload.department || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, department: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── Step 5: Reason & Notes ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] font-bold text-white">5</div>
          <span className="text-xs font-semibold text-gray-700">Details</span>
          <span className="text-[10px] text-gray-400 ml-1">(optional)</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLS}>
              <FileText className="inline h-3 w-3 mr-1" />
              Reason
            </label>
            <textarea
              placeholder="What is the appointment for?"
              value={payload.reason || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, reason: e.target.value }))}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              <StickyNote className="inline h-3 w-3 mr-1" />
              Notes
            </label>
            <textarea
              placeholder="Additional notes or instructions..."
              value={payload.notes || ''}
              onChange={(e) => setPayload((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createAppointment.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          {createAppointment.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CalendarPlus className="h-3.5 w-3.5" />
              Book Appointment
            </>
          )}
        </button>
      </div>
    </form>
  );
}
