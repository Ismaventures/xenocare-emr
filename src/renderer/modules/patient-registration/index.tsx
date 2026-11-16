import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Clock,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  CalendarPlus,
} from 'lucide-react';
import PatientList from './components/PatientList';
import PatientForm from './components/PatientForm';
import PatientDetail from './components/PatientDetail';
import {
  useCreatePatient,
  useUpdatePatient,
  usePatientStats,
  usePatientSubscription,
} from './hooks/usePatient';
import {
  PatientDTO,
  CreatePatientDTO,
  UpdatePatientDTO,
} from './dtos/patient.dto';
import { useToast } from '../../components/ui/Toast';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/FormElements';
import { EncounterForm } from '../encounter/components';
import { InlineGuidance } from '../../components/guidance/InlineGuidance';

// NDC Logo
const ndcLogoSrc = require('../../../../assets/ndclogo.png');

export default function PatientRegistration() {
  // Enable real-time updates
  usePatientSubscription();

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientDTO | null>(
    null,
  );
  const [editingPatient, setEditingPatient] = useState<PatientDTO | null>(null);
  const [formPreset, setFormPreset] =
    useState<Partial<CreatePatientDTO> | null>(null);

  // Post-registration encounter prompt
  const [showEncounterPrompt, setShowEncounterPrompt] = useState(false);
  const [newlyCreatedPatient, setNewlyCreatedPatient] =
    useState<PatientDTO | null>(null);

  // Encounter form modal (opens directly without navigation)
  const [isEncounterFormOpen, setIsEncounterFormOpen] = useState(false);

  // Toast
  const { showToast } = useToast();

  // Mutations
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const { data: stats } = usePatientStats();

  // Handlers
  const handleNewPatient = () => {
    setEditingPatient(null);
    setFormPreset(null);
    setIsFormOpen(true);
  };

  const handleViewPatient = (patient: PatientDTO) => {
    setSelectedPatient(patient);
    setIsDetailOpen(true);
  };

  const handleEditPatient = (patient: PatientDTO) => {
    setEditingPatient(patient);
    setFormPreset(null);
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const handleAddDependent = (principal: PatientDTO) => {
    setEditingPatient(null);
    setFormPreset({
      patient_type: 'Dependent',
      // Use principal.id (UUID) since principal_id references patients(id)
      principal_id: principal.id,
      patient_category: principal.patient_category ?? undefined,
      insurance_type: principal.insurance_type ?? undefined,
      // Inherit address/contact fields from principal
      state_of_origin: principal.state_of_origin ?? undefined,
      lga: principal.lga ?? undefined,
      residential_address: principal.residential_address ?? undefined,
      contact_phone: principal.contact_phone ?? undefined,
      nationality: principal.nationality ?? 'Nigerian',
      // Inherit surname (family name)
      surname: principal.surname ?? undefined,
    });
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const handleEditFromDetail = () => {
    if (selectedPatient) {
      handleEditPatient(selectedPatient);
    }
  };

  const handleFormSubmit = async (
    data: CreatePatientDTO | UpdatePatientDTO,
  ): Promise<PatientDTO> => {
    const isUpdate = 'patient_id' in data;

    showToast({
      type: 'info',
      title: isUpdate ? 'Updating in Background' : 'Registering in Background',
      message: 'You can continue working while we sync this record.',
    });

    if (isUpdate) {
      return updateMutation
        .mutateAsync(data)
        .then((result) => {
          showToast({
            type: 'success',
            title: 'Patient Updated',
            message: 'Patient record updated successfully',
          });
          return result;
        })
        .catch((error) => {
          showToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update patient record',
          });
          throw error;
        });
    }

    return createMutation
      .mutateAsync(data)
      .then((result) => {
        showToast({
          type: 'success',
          title: 'Patient Registered',
          message: 'New patient registered successfully',
        });

        // Show encounter creation prompt for new patients
        setNewlyCreatedPatient(result);
        setShowEncounterPrompt(true);
        return result;
      })
      .catch((error) => {
        showToast({
          type: 'error',
          title: 'Registration Failed',
          message: 'Failed to save patient record',
        });
        throw error;
      });
  };

  const handleCreateEncounter = () => {
    if (newlyCreatedPatient) {
      // Open encounter form modal directly (no navigation)
      setShowEncounterPrompt(false);
      setIsEncounterFormOpen(true);
    }
  };

  const handleSkipEncounter = () => {
    setShowEncounterPrompt(false);
    setNewlyCreatedPatient(null);
  };

  const handleEncounterFormClose = () => {
    setIsEncounterFormOpen(false);
    setNewlyCreatedPatient(null);
  };

  const handleEncounterFormSuccess = () => {
    setIsEncounterFormOpen(false);
    setNewlyCreatedPatient(null);
    showToast({
      type: 'success',
      title: 'Encounter Created',
      message: 'Patient encounter created successfully',
    });
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPatient(null);
    setFormPreset(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedPatient(null);
  };

  // Get time-based theme
  const {
    timeOfDay,
    greeting,
    colors: themeColors,
    isNightMode,
  } = useTimeTheme();

  // Get time icon based on time of day
  const TimeIcon = useMemo(() => {
    switch (timeOfDay) {
      case 'morning':
        return Sunrise;
      case 'afternoon':
        return Sun;
      case 'evening':
        return Sunset;
      case 'night':
        return Moon;
      default:
        return Sun;
    }
  }, [timeOfDay]);

  // Dynamic header gradient based on time
  const headerGradient = useMemo(() => {
    return `bg-gradient-to-r ${themeColors.header.gradient}`;
  }, [themeColors]);

  return (
    <div
      className={`space-y-6 sm:space-y-8 ${isNightMode ? 'text-slate-100' : ''}`}
    >
      <div
        className={`${headerGradient} relative overflow-hidden rounded-2xl border border-white/20 shadow-[0_24px_56px_-20px_rgba(13,94,86,0.45),inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:rounded-3xl`}
      >
        <div
          className={`pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full ${themeColors.header.decorativeCircle} blur-3xl opacity-[0.35]`}
        />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-96 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.28)] ring-2 ring-white/40 sm:h-16 sm:w-16 sm:rounded-[1.15rem]">
                <img
                  src={ndcLogoSrc}
                  alt="NDC Medical Centre"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 sm:text-[11px]">
                  Registry
                </p>
                <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl [text-rendering:optimizeLegibility]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                    <Users
                      className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
                      strokeWidth={2.25}
                    />
                  </span>
                  Patient registration
                </h1>
                <p
                  className={`mt-2 flex max-w-xl flex-wrap items-center gap-x-2 gap-y-1 text-sm ${themeColors.accent.muted}`}
                >
                  <TimeIcon className="h-4 w-4 shrink-0 opacity-90" />
                  <span className="font-medium text-white/95">
                    NDC Medical Centre
                  </span>
                  <span className="hidden text-white/40 sm:inline">·</span>
                  <span>Demographics, coverage & master patient index</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNewPatient}
              className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0d5e56] shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)] ring-1 ring-white/60 transition hover:bg-emerald-50/95 hover:shadow-lg active:scale-[0.99] sm:px-6"
            >
              <UserPlus className="h-5 w-5" strokeWidth={2.25} />
              Register new patient
            </button>
          </div>

          <div className="relative z-10 mt-6 sm:mt-7">
            <InlineGuidance
              module="registration"
              variant="onDark"
              message="This module is the entry point for all patients. Capture accurate phone numbers and NHIS details (if applicable) to prevent billing issues later."
            />
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Total patients',
                value: stats?.total?.toLocaleString() || '0',
                icon: Users,
                iconWrap: `rounded-xl p-2.5 ring-1 ring-white/20 ${themeColors.header.decorativeCircle}`,
                iconClass: 'text-white',
              },
              {
                label: 'Active',
                value: stats?.active?.toLocaleString() || '0',
                icon: UserCheck,
                iconWrap:
                  'rounded-xl bg-emerald-400/25 p-2.5 ring-1 ring-emerald-200/30',
                iconClass: 'text-emerald-100',
              },
              {
                label: 'Today',
                value: stats?.registeredToday?.toLocaleString() || '0',
                icon: Clock,
                iconWrap:
                  'rounded-xl bg-sky-400/25 p-2.5 ring-1 ring-sky-200/25',
                iconClass: 'text-sky-100',
              },
              {
                label: 'This month',
                value: stats?.registeredThisMonth?.toLocaleString() || '0',
                icon: TrendingUp,
                iconWrap:
                  'rounded-xl bg-violet-400/25 p-2.5 ring-1 ring-violet-200/25',
                iconClass: 'text-violet-100',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/[0.14]"
              >
                <div className="flex items-center gap-3">
                  <div className={card.iconWrap}>
                    <card.icon className={`h-5 w-5 ${card.iconClass}`} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wider ${themeColors.accent.muted}`}
                    >
                      {card.label}
                    </p>
                    <p className="text-xl font-bold tabular-nums text-white sm:text-2xl [text-rendering:optimizeLegibility]">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patient List */}
      <PatientList
        onNewPatient={handleNewPatient}
        onViewPatient={handleViewPatient}
        onEditPatient={handleEditPatient}
        onCreateEncounter={(patient) => {
          setNewlyCreatedPatient(patient);
          setIsEncounterFormOpen(true);
        }}
      />

      {/* Patient Form (Create/Edit) */}
      <PatientForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        onCreateDependent={(data) => createMutation.mutateAsync(data)}
        patient={editingPatient}
        preset={formPreset || undefined}
        onOpenDependentForPrincipal={handleAddDependent}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Patient Detail View */}
      <PatientDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        patient={selectedPatient}
        onEdit={handleEditFromDetail}
        onCreateEncounter={() => {
          if (selectedPatient) {
            setNewlyCreatedPatient(selectedPatient);
            setIsDetailOpen(false);
            setIsEncounterFormOpen(true);
          }
        }}
      />

      {/* Encounter Creation Prompt Modal */}
      <Modal
        isOpen={showEncounterPrompt}
        onClose={handleSkipEncounter}
        title="Create Encounter?"
        size="sm"
      >
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-100">
            <CalendarPlus className="h-8 w-8 text-white" strokeWidth={2.25} />
          </div>
          <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">
            Patient registered successfully
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Start a visit now for{' '}
            <span className="font-semibold text-slate-800">
              {newlyCreatedPatient?.first_name} {newlyCreatedPatient?.surname}
            </span>
            ?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <Button
              variant="outline"
              onClick={handleSkipEncounter}
              className="w-full sm:w-auto"
            >
              Skip for now
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateEncounter}
              className="w-full sm:w-auto"
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Create encounter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Encounter Form Modal - Opens directly without navigation */}
      <EncounterForm
        isOpen={isEncounterFormOpen}
        onClose={handleEncounterFormClose}
        onSuccess={handleEncounterFormSuccess}
        preSelectedPatient={
          newlyCreatedPatient
            ? {
                id: newlyCreatedPatient.id || '',
                patient_id: newlyCreatedPatient.patient_id,
                first_name: newlyCreatedPatient.first_name,
                last_name: newlyCreatedPatient.surname,
                emr_number: newlyCreatedPatient.emr_number || undefined,
                date_of_birth: newlyCreatedPatient.date_of_birth || undefined,
                phone: newlyCreatedPatient.contact_phone || undefined,
                service_number: newlyCreatedPatient.service_number || undefined,
                patient_category:
                  newlyCreatedPatient.patient_category || undefined,
                insurance_type: newlyCreatedPatient.insurance_type || undefined,
                nhis_patient_source:
                  newlyCreatedPatient.nhis_patient_source || undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
