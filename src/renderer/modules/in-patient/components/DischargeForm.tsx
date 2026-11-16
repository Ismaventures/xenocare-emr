// =============================================================================
// XENOCARE EMR - Discharge Form Component
// Form for discharging patients from in-patient care
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Bed,
  Calendar,
  FileText,
  Pill,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Plus,
  Trash2,
  Search,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { useDischargePatient } from '../hooks/useAdmissions';
import { useToast } from '../../../components/ui/Toast';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import { supabase } from '../../../api/supabaseClient';
import {
  getPatientOutstandingBalance,
  getPatientUnverifiedBills,
} from '../../billing/api/billing-order.api';
import {
  calculateAdmissionBillableDays,
  syncAdmissionAccommodationBilling,
} from '../api/admissions.api';
import type {
  AdmissionWithDetails,
  DischargeType,
  DischargePatientDTO,
} from '../../../types/database.types';

interface DischargeFormProps {
  admission: AdmissionWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

// Types for follow-up appointments
interface FollowUpAppointment {
  id: string;
  date: string;
  time: string;
  department: string;
  doctor_id?: string;
  doctor_name?: string;
  reason: string;
  appointment_type: 'Follow-up' | 'Lab' | 'Radiology' | 'Procedure';
}

// Types for discharge medications
interface DischargeMedication {
  id: string;
  drug_name: string;
  drug_id?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
}

// Types for prescriptions from pharmacy
interface PrescriptionSummary {
  prescription_id: string;
  drug_name: string;
  drug_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  status: string;
}

// Available doctors
interface DoctorOption {
  staff_id: string;
  first_name: string;
  last_name: string;
  department?: string;
}

interface DischargeFormProps {
  admission: AdmissionWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

const dischargeTypes: {
  value: DischargeType;
  label: string;
  description: string;
}[] = [
  {
    value: 'home',
    label: 'Discharge to Home',
    description: 'Patient recovered and going home',
  },
  {
    value: 'transfer',
    label: 'Transfer to Another Facility',
    description: 'Patient being transferred to another hospital',
  },
  {
    value: 'against_medical_advice',
    label: 'Against Medical Advice (AMA)',
    description: 'Patient leaving against medical advice',
  },
  {
    value: 'deceased',
    label: 'Deceased',
    description: 'Patient deceased during admission',
  },
  {
    value: 'skilled_nursing',
    label: 'Skilled Nursing Facility',
    description: 'Transfer to skilled nursing facility',
  },
  {
    value: 'rehabilitation',
    label: 'Rehabilitation',
    description: 'Transfer to rehabilitation facility',
  },
  {
    value: 'hospice',
    label: 'Hospice Care',
    description: 'Transfer to hospice care',
  },
  { value: 'other', label: 'Other', description: 'Other discharge type' },
];

const DischargeForm: React.FC<DischargeFormProps> = ({
  admission,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<DischargePatientDTO>>({
    discharge_type: 'home',
    discharge_diagnosis: '',
    discharge_summary: '',
    discharge_instructions: '',
    discharge_medications: [],
    follow_up_appointments: [],
  });
  const [confirmAMA, setConfirmAMA] = useState(false);

  // State for follow-up appointments
  const [followUpAppointments, setFollowUpAppointments] = useState<
    FollowUpAppointment[]
  >([]);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState<
    Partial<FollowUpAppointment>
  >({
    date: '',
    time: '09:00',
    department: '',
    reason: 'Post-discharge follow-up',
    appointment_type: 'Follow-up',
  });

  // State for discharge medications
  const [dischargeMedications, setDischargeMedications] = useState<
    DischargeMedication[]
  >([]);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [newMedication, setNewMedication] = useState<
    Partial<DischargeMedication>
  >({
    drug_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: 0,
  });

  // State for loading patient prescriptions
  const [patientPrescriptions, setPatientPrescriptions] = useState<
    PrescriptionSummary[]
  >([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // State for doctors
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const { showToast } = useToast();
  const dischargePatient = useDischargePatient();

  // Billing State
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [accommodationTotal, setAccommodationTotal] = useState(0);
  const [isBillGenerating, setIsBillGenerating] = useState(false);
  // Unverified billing orders check (discharge gating)
  const [unverifiedBills, setUnverifiedBills] = useState<{
    hasUnverifiedBills: boolean;
    unverifiedCount: number;
    unverifiedTotal: number;
    details: Array<{
      id: string;
      order_number: string;
      source_module: string;
      total_amount: number;
      outstanding_amount: number;
      status: string;
      service_name?: string;
    }>;
  }>({
    hasUnverifiedBills: false,
    unverifiedCount: 0,
    unverifiedTotal: 0,
    details: [],
  });

  useEffect(() => {
    // 1. Get Daily Rate from Bed
    // Note: admission.current_bed might be partial, but let's check.
    // Ideally we should fetch the bed explicitly if not populated, but let's assume valid data or fetch.
    const fetchBillingInfo = async () => {
      setCheckingBalance(true);
      try {
        // Fetch daily rate
        let rate = 0;
        if (admission.current_bed?.daily_rate) {
          rate = admission.current_bed.daily_rate;
        } else if (admission.current_bed?.id) {
          // Fallback fetch if daily_rate missing in joined data
          const { data: bedData } = await supabase
            .from('beds')
            .select('daily_rate')
            .eq('id', admission.current_bed.id)
            .single();
          rate = bedData?.daily_rate || 0;
        }
        setDailyRate(rate);

        const days = calculateAdmissionBillableDays(admission.admission_date);
        const additionalDays = Math.max(days - 1, 0);
        setAccommodationTotal(additionalDays * rate);

        if (step === 4) {
          setIsBillGenerating(true);
          await syncAdmissionAccommodationBilling(admission.id);
        }

        // Fetch Outstanding Balance & Unverified Bills
        if (admission.patient_id) {
          const [balance, billsCheck] = await Promise.all([
            getPatientOutstandingBalance(admission.patient_id),
            getPatientUnverifiedBills(admission.patient_id),
          ]);
          setOutstandingBalance(balance);
          setUnverifiedBills(billsCheck);
        }
      } catch (err) {
        console.error('Error fetching billing info:', err);
      } finally {
        setIsBillGenerating(false);
        setCheckingBalance(false);
      }
    };

    fetchBillingInfo();
  }, [admission, step]); // Refresh when step changes (especially to confirm step)

  // Fetch patient's prescriptions on mount
  useEffect(() => {
    async function fetchPrescriptions() {
      if (!admission.patient_id) return;
      setLoadingPrescriptions(true);
      try {
        // Fetch prescriptions for this patient's admission
        const { data, error } = await supabase
          .from('prescriptions')
          .select(
            `
            prescription_id,
            drug_id,
            dosage,
            frequency,
            duration,
            instructions,
            quantity,
            status
          `,
          )
          .eq('patient_id', admission.patient_id)
          .in('status', ['Dispensed', 'Partial', 'Pending'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Fetch drug names separately
        if (data && data.length > 0) {
          const drugIds = [
            ...new Set(data.map((p) => p.drug_id).filter(Boolean)),
          ];
          const { data: drugs } = await supabase
            .from('drug_catalogue')
            .select('id, name')
            .in('id', drugIds);

          const drugMap = new Map(drugs?.map((d) => [d.id, d.name]) || []);

          const prescriptions: PrescriptionSummary[] = data.map((p) => ({
            prescription_id: p.prescription_id,
            drug_name: drugMap.get(p.drug_id) || 'Unknown Drug',
            drug_id: p.drug_id,
            dosage: p.dosage || '',
            frequency: p.frequency || '',
            duration: p.duration || '',
            instructions: p.instructions || '',
            quantity: p.quantity || 0,
            status: p.status,
          }));
          setPatientPrescriptions(prescriptions);
        }
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setLoadingPrescriptions(false);
      }
    }
    fetchPrescriptions();
  }, [admission.patient_id]);

  // Fetch doctors for appointment scheduling
  useEffect(() => {
    async function fetchDoctors() {
      setLoadingDoctors(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('staff_id, first_name, last_name, department')
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('first_name');

        if (error) throw error;
        setDoctors(data || []);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoadingDoctors(false);
      }
    }
    fetchDoctors();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Add follow-up appointment
  const handleAddAppointment = () => {
    if (!newAppointment.date || !newAppointment.department) {
      showToast({
        message: 'Please fill in date and department',
        type: 'error',
      });
      return;
    }
    const appointment: FollowUpAppointment = {
      id: crypto.randomUUID(),
      date: newAppointment.date!,
      time: newAppointment.time || '09:00',
      department: newAppointment.department!,
      doctor_id: newAppointment.doctor_id,
      doctor_name: doctors.find((d) => d.staff_id === newAppointment.doctor_id)
        ? `${doctors.find((d) => d.staff_id === newAppointment.doctor_id)?.first_name} ${doctors.find((d) => d.staff_id === newAppointment.doctor_id)?.last_name}`
        : undefined,
      reason: newAppointment.reason || 'Post-discharge follow-up',
      appointment_type: newAppointment.appointment_type || 'Follow-up',
    };
    setFollowUpAppointments([...followUpAppointments, appointment]);
    setNewAppointment({
      date: '',
      time: '09:00',
      department: '',
      reason: 'Post-discharge follow-up',
      appointment_type: 'Follow-up',
    });
    setShowAddAppointment(false);
  };

  // Remove follow-up appointment
  const handleRemoveAppointment = (id: string) => {
    setFollowUpAppointments(followUpAppointments.filter((a) => a.id !== id));
  };

  // Add discharge medication
  const handleAddMedication = () => {
    if (!newMedication.drug_name || !newMedication.dosage) {
      showToast({
        message: 'Please fill in drug name and dosage',
        type: 'error',
      });
      return;
    }
    const medication: DischargeMedication = {
      id: crypto.randomUUID(),
      drug_name: newMedication.drug_name!,
      drug_id: newMedication.drug_id,
      dosage: newMedication.dosage!,
      frequency: newMedication.frequency || '',
      duration: newMedication.duration || '',
      instructions: newMedication.instructions || '',
      quantity: newMedication.quantity || 0,
    };
    setDischargeMedications([...dischargeMedications, medication]);
    setNewMedication({
      drug_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 0,
    });
    setShowAddMedication(false);
  };

  // Remove discharge medication
  const handleRemoveMedication = (id: string) => {
    setDischargeMedications(dischargeMedications.filter((m) => m.id !== id));
  };

  // Add medication from prescription
  const handleAddFromPrescription = (prescription: PrescriptionSummary) => {
    const medication: DischargeMedication = {
      id: crypto.randomUUID(),
      drug_name: prescription.drug_name,
      drug_id: prescription.drug_id,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions,
      quantity: prescription.quantity,
    };
    setDischargeMedications([...dischargeMedications, medication]);
  };

  const handleSubmit = async () => {
    if (!formData.discharge_type || !formData.discharge_summary) {
      return;
    }

    // If AMA, require confirmation
    if (formData.discharge_type === 'against_medical_advice' && !confirmAMA) {
      return;
    }

    try {
      const dischargeData: DischargePatientDTO = {
        discharge_type: formData.discharge_type!,
        discharge_diagnosis: formData.discharge_diagnosis!,
        discharge_summary: formData.discharge_summary!,
        discharge_instructions: formData.discharge_instructions!,
        discharge_medications: dischargeMedications.map((m) => ({
          drug_name: m.drug_name,
          drug_id: m.drug_id || '',
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions || null,
          quantity: m.quantity,
        })) as any,
        follow_up_appointments: followUpAppointments.map((a) => ({
          date: a.date,
          time: a.time,
          department: a.department,
          doctor_id: a.doctor_id || null,
          doctor_name: a.doctor_name,
          reason: a.reason,
          appointment_type: a.appointment_type,
          notes: null,
        })) as any,
      };
      await dischargePatient.mutateAsync({
        admissionId: admission.id,
        dischargeData,
      });
      showToast({
        message: `Patient ${admission.patient?.first_name || ''} ${admission.patient?.surname || ''} has been successfully discharged`,
        type: 'success',
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to discharge patient:', error);
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to discharge patient. Please try again.',
        type: 'error',
      });
    }
  };

  const los = calculateAdmissionBillableDays(admission.admission_date);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Discharge Patient
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Patient Info Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {admission.admission_number}
                </p>
                <p className="text-sm text-gray-500">
                  Admitted{' '}
                  {new Date(admission.admission_date).toLocaleDateString()} •{' '}
                  {los} days LOS
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Diagnosis</p>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {admission.admitting_diagnosis}
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: 'Type' },
              { num: 2, label: 'Summary' },
              { num: 3, label: 'Follow-up' },
              { num: 4, label: 'Confirm' },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <div className="flex-1 h-0.5 bg-gray-200" />}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-sm hidden md:inline ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Discharge Type */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Select Discharge Type
              </h3>
              <div className="grid gap-3">
                {dischargeTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discharge_type: type.value,
                      }))
                    }
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.discharge_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${type.value === 'deceased' || type.value === 'against_medical_advice' ? 'border-l-4 border-l-red-400' : ''}`}
                  >
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Discharge Summary */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Fill all discharge fields from template */}
              <div className="flex justify-end">
                <TemplateSearchPopover
                  templateType="inpatient"
                  category="discharge_summary"
                  currentValues={{
                    discharge_notes: formData.discharge_summary || '',
                    discharge_medications: formData.discharge_instructions || '',
                    hospital_course: '',
                  }}
                  onTemplateSelect={(data) => {
                    if (data.hospital_course) setFormData(prev => ({ ...prev, discharge_summary: data.hospital_course }));
                    if (data.discharge_notes) setFormData(prev => ({ ...prev, discharge_summary: data.discharge_notes }));
                    if (data.discharge_medications || data.follow_up_instructions) setFormData(prev => ({ ...prev, discharge_instructions: data.discharge_medications || data.follow_up_instructions || prev.discharge_instructions }));
                    if (data.discharge_condition) setFormData(prev => ({ ...prev, discharge_diagnosis: data.discharge_condition }));
                  }}
                  buttonText="Fill All Fields"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Discharge Summary *
                  </label>
                  <SavedNotesPopover
                    category="discharge_notes"
                    subcategory="discharge_summary"
                    currentValue={formData.discharge_summary}
                    onInsert={(content) => setFormData(prev => ({ ...prev, discharge_summary: content }))}
                  />
                </div>
                <textarea
                  name="discharge_summary"
                  value={formData.discharge_summary}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Provide a comprehensive summary of the patient's hospital stay, treatments received, and outcome..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Discharge Diagnosis <span className="text-red-500">*</span>
                  </label>
                  <SavedNotesPopover
                    category="discharge_notes"
                    subcategory="discharge_diagnosis"
                    currentValue={formData.discharge_diagnosis || ''}
                    onInsert={(content) => setFormData(prev => ({ ...prev, discharge_diagnosis: content }))}
                  />
                </div>
                <textarea
                  name="discharge_diagnosis"
                  value={formData.discharge_diagnosis || ''}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Primary diagnosis at time of discharge..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Discharge Instructions
                  </label>
                  <SavedNotesPopover
                    category="discharge_notes"
                    subcategory="discharge_instructions"
                    currentValue={formData.discharge_instructions}
                    onInsert={(content) => setFormData(prev => ({ ...prev, discharge_instructions: content }))}
                  />
                </div>
                <textarea
                  name="discharge_instructions"
                  value={formData.discharge_instructions}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Instructions for the patient regarding care after discharge..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Follow-up */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Follow-up Appointments Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Follow-up Appointments
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddAppointment(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add Appointment
                  </button>
                </div>

                {/* Add Appointment Form */}
                {showAddAppointment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-3">
                      New Follow-up Appointment
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={newAppointment.date}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              date: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={newAppointment.time}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              time: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Department *
                        </label>
                        <select
                          value={newAppointment.department}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select department</option>
                          <option value="General Medicine">
                            General Medicine
                          </option>
                          <option value="Surgery">Surgery</option>
                          <option value="Orthopedics">Orthopedics</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Neurology">Neurology</option>
                          <option value="Oncology">Oncology</option>
                          <option value="Pediatrics">Pediatrics</option>
                          <option value="OB/GYN">OB/GYN</option>
                          <option value="Physiotherapy">Physiotherapy</option>
                          <option value="Laboratory">Laboratory</option>
                          <option value="Radiology">Radiology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Doctor
                        </label>
                        <select
                          value={newAppointment.doctor_id || ''}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              doctor_id: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          disabled={loadingDoctors}
                        >
                          <option value="">Select doctor (optional)</option>
                          {doctors.map((doc) => (
                            <option key={doc.staff_id} value={doc.staff_id}>
                              Dr. {doc.first_name} {doc.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Appointment Type
                        </label>
                        <select
                          value={newAppointment.appointment_type}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              appointment_type: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Follow-up">Follow-up</option>
                          <option value="Lab">Lab Test</option>
                          <option value="Radiology">Radiology</option>
                          <option value="Procedure">Procedure</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Reason
                        </label>
                        <input
                          type="text"
                          value={newAppointment.reason}
                          onChange={(e) =>
                            setNewAppointment({
                              ...newAppointment,
                              reason: e.target.value,
                            })
                          }
                          placeholder="Post-discharge follow-up"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddAppointment(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddAppointment}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Appointment
                      </button>
                    </div>
                  </div>
                )}

                {/* List of appointments */}
                {followUpAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {followUpAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {new Date(apt.date).toLocaleDateString()} at{' '}
                              {apt.time}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {apt.appointment_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {apt.department}{' '}
                            {apt.doctor_name && `• Dr. ${apt.doctor_name}`}
                          </p>
                          <p className="text-sm text-gray-500">{apt.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAppointment(apt.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No follow-up appointments scheduled
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Add Appointment" to schedule a follow-up
                    </p>
                  </div>
                )}
              </div>

              {/* Discharge Medications Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Discharge Medications (Take-Home)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddMedication(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add Medication
                  </button>
                </div>

                {/* Add from existing prescriptions */}
                {patientPrescriptions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Add from patient's prescriptions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {patientPrescriptions.slice(0, 5).map((rx) => (
                        <button
                          key={rx.prescription_id}
                          type="button"
                          onClick={() => handleAddFromPrescription(rx)}
                          disabled={dischargeMedications.some(
                            (m) => m.drug_id === rx.drug_id,
                          )}
                          className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          {rx.drug_name}
                        </button>
                      ))}
                      {loadingPrescriptions && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin" />{' '}
                          Loading...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Add Medication Form */}
                {showAddMedication && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-900 mb-3">
                      Add Discharge Medication
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">
                          Drug Name *
                        </label>
                        <input
                          type="text"
                          value={newMedication.drug_name}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              drug_name: e.target.value,
                            })
                          }
                          placeholder="e.g., Amoxicillin 500mg"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={newMedication.dosage}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              dosage: e.target.value,
                            })
                          }
                          placeholder="e.g., 1 tablet"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Frequency
                        </label>
                        <select
                          value={newMedication.frequency}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              frequency: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select frequency</option>
                          <option value="Once daily">Once daily</option>
                          <option value="Twice daily">Twice daily</option>
                          <option value="Three times daily">
                            Three times daily
                          </option>
                          <option value="Four times daily">
                            Four times daily
                          </option>
                          <option value="Every 8 hours">Every 8 hours</option>
                          <option value="Every 12 hours">Every 12 hours</option>
                          <option value="As needed">As needed (PRN)</option>
                          <option value="At bedtime">At bedtime</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={newMedication.duration}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              duration: e.target.value,
                            })
                          }
                          placeholder="e.g., 7 days"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={newMedication.quantity || ''}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              quantity: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="e.g., 14"
                          min="0"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">
                          Special Instructions
                        </label>
                        <input
                          type="text"
                          value={newMedication.instructions}
                          onChange={(e) =>
                            setNewMedication({
                              ...newMedication,
                              instructions: e.target.value,
                            })
                          }
                          placeholder="e.g., Take with food, avoid alcohol"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddMedication(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMedication}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Add Medication
                      </button>
                    </div>
                  </div>
                )}

                {/* List of medications */}
                {dischargeMedications.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            Medication
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            Dosage
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            Frequency
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            Duration
                          </th>
                          <th className="text-center px-3 py-2 font-medium text-gray-700">
                            Qty
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dischargeMedications.map((med) => (
                          <tr key={med.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <span className="font-medium">
                                {med.drug_name}
                              </span>
                              {med.instructions && (
                                <p className="text-xs text-gray-500">
                                  {med.instructions}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2">{med.dosage}</td>
                            <td className="px-3 py-2">
                              {med.frequency || '-'}
                            </td>
                            <td className="px-3 py-2">{med.duration || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              {med.quantity || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(med.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Pill className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No discharge medications added
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add medications the patient should take home
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-6">
              {/* AMA Warning */}
              {formData.discharge_type === 'against_medical_advice' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">
                        Against Medical Advice (AMA)
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        The patient is leaving against medical advice. Ensure
                        all risks have been explained and documented.
                      </p>
                      <label className="flex items-center gap-2 mt-3">
                        <input
                          type="checkbox"
                          checked={confirmAMA}
                          onChange={(e) => setConfirmAMA(e.target.checked)}
                          className="h-4 w-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                        />
                        <span className="text-sm text-red-700">
                          I confirm that the patient has been informed of all
                          risks
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Discharge Summary
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Discharge Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {formData.discharge_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Discharge Diagnosis</p>
                    <p className="font-medium text-gray-900">
                      {formData.discharge_diagnosis || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Length of Stay</p>
                    <p className="font-medium text-gray-900">{los} days</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Discharge Summary</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formData.discharge_summary}
                  </p>
                </div>

                {formData.discharge_instructions && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">Instructions</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {formData.discharge_instructions}
                    </p>
                  </div>
                )}

                {/* Follow-up Appointments Summary */}
                {followUpAppointments.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Follow-up Appointments ({followUpAppointments.length})
                    </p>
                    <div className="space-y-1">
                      {followUpAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="text-sm text-gray-900 flex items-center gap-2"
                        >
                          <span className="font-medium">
                            {new Date(apt.date).toLocaleDateString()} at{' '}
                            {apt.time}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span>{apt.department}</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {apt.appointment_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discharge Medications Summary */}
                {dischargeMedications.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <Pill className="h-4 w-4" />
                      Discharge Medications ({dischargeMedications.length})
                    </p>
                    <div className="space-y-1">
                      {dischargeMedications.map((med) => (
                        <div key={med.id} className="text-sm text-gray-900">
                          <span className="font-medium">{med.drug_name}</span>
                          {med.dosage && (
                            <span className="text-gray-500">
                              {' '}
                              - {med.dosage}
                            </span>
                          )}
                          {med.frequency && (
                            <span className="text-gray-500">
                              , {med.frequency}
                            </span>
                          )}
                          {med.duration && (
                            <span className="text-gray-500">
                              {' '}
                              for {med.duration}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Billing Status */}
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-gray-500" />
                    Billing & Payment Status
                  </h4>
                  {outstandingBalance === 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Cleared
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                      Additional Stay Charge
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-xl text-gray-900">
                        ₦{accommodationTotal.toLocaleString()}
                      </p>
                      <span className="text-xs text-gray-500">
                        ({dailyRate.toLocaleString()}/day ×{' '}
                        {Math.max(0, los - 1)} extra day
                        {Math.max(0, los - 1) === 1 ? '' : 's'}; day 1 billed on
                        admission)
                      </span>
                    </div>
                    {step === 4 && accommodationTotal > 0 && (
                      <p className="mt-3 text-xs text-gray-500">
                        {isBillGenerating
                          ? 'Updating stay charges automatically...'
                          : 'Stay charges update automatically on this step.'}
                      </p>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${outstandingBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}
                  >
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                      Total Outstanding
                    </p>
                    <p
                      className={`font-bold text-xl ${outstandingBalance > 0 ? 'text-red-700' : 'text-green-700'}`}
                    >
                      ₦{outstandingBalance.toLocaleString()}
                    </p>
                    {outstandingBalance > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs text-red-600 mb-2 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Payment Required
                        </p>
                        {step === 4 && isBillGenerating && (
                          <p className="text-xs text-red-600">
                            Updating stay charges automatically...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> All bills cleared
                      </p>
                    )}
                  </div>
                </div>

                {/* Unverified Bills Warning */}
                {unverifiedBills.hasUnverifiedBills && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-800">
                          Discharge Blocked — {unverifiedBills.unverifiedCount}{' '}
                          Unverified Bill
                          {unverifiedBills.unverifiedCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          All billing orders must be verified/cleared at the
                          Billing module before discharge. Please direct the
                          billing desk to verify the following:
                        </p>
                        <div className="mt-3 space-y-1.5">
                          {unverifiedBills.details.slice(0, 8).map((bill) => (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between bg-white/70 rounded px-3 py-1.5 text-sm border border-red-100"
                            >
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5 text-red-400" />
                                <span className="font-medium text-gray-800">
                                  {bill.order_number}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600">
                                  {bill.service_name || bill.source_module}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-red-700 font-medium">
                                  ₦{bill.outstanding_amount.toLocaleString()}
                                </span>
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-medium rounded">
                                  {bill.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {unverifiedBills.details.length > 8 && (
                            <p className="text-xs text-red-500 mt-1">
                              ...and {unverifiedBills.details.length - 8} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {outstandingBalance > 0 &&
                  !unverifiedBills.hasUnverifiedBills && (
                    <div className="text-sm bg-orange-50 text-orange-800 p-3 rounded border border-orange-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">
                          Cannot discharge patient!
                        </span>
                        <p className="text-xs mt-0.5">
                          Outstanding bills must be cleared before discharge can
                          be finalized. Please direct the patient or family to
                          billing.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Final Confirmation */}
              {!unverifiedBills.hasUnverifiedBills &&
                outstandingBalance <= 0 && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      All bills verified and cleared. By confirming this
                      discharge, the bed will be released and the patient's
                      admission record will be finalized.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 2 &&
                (!formData.discharge_summary || !formData.discharge_diagnosis)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={
                dischargePatient.isPending ||
                (formData.discharge_type === 'against_medical_advice' &&
                  !confirmAMA) ||
                // Block discharge if there are unverified bills OR outstanding balance (except deceased)
                ((unverifiedBills.hasUnverifiedBills ||
                  outstandingBalance > 0) &&
                  formData.discharge_type !== 'deceased')
              }
              className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                (unverifiedBills.hasUnverifiedBills ||
                  outstandingBalance > 0) &&
                formData.discharge_type !== 'deceased'
                  ? 'bg-gray-400 hover:bg-gray-500'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={
                unverifiedBills.hasUnverifiedBills
                  ? 'All bills must be verified at billing first'
                  : outstandingBalance > 0
                    ? 'Clear outstanding bills first'
                    : ''
              }
            >
              {dischargePatient.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Discharge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DischargeForm;
