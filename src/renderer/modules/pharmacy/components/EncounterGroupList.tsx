import React, { useMemo, useState } from 'react';
import { User, Calendar, FileText, ChevronRight, Search } from 'lucide-react';
import { Button, EmptyState } from '../../../components/ui';
import { PrescriptionDTO } from '../dtos/pharmacy.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import {
  EncounterGroup,
  groupPrescriptionsByEncounter,
} from './EncounterApprovalModal';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

// =============================================================================
// Types
// =============================================================================

interface EncounterGroupListProps {
  prescriptions: PrescriptionDTO[];
  isLoading?: boolean;
  onSelectEncounter: (group: EncounterGroup) => void;
  onSearch?: (query: string) => void;
}

function parseDiagnosisList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fall back to plain text handling.
    }

    return [trimmed];
  }

  return [];
}

// =============================================================================
// Component
// =============================================================================

export default function EncounterGroupList({
  prescriptions,
  isLoading = false,
  onSelectEncounter,
  onSearch,
}: EncounterGroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(true);

  // Group prescriptions by encounter
  const encounterGroups = useMemo(() => {
    const groups = groupPrescriptionsByEncounter(prescriptions);

    // Filter to only show pending if enabled
    if (showPendingOnly) {
      return groups.filter((g) => g.pending_count > 0);
    }

    return groups;
  }, [prescriptions, showPendingOnly]);

  // Filter by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return encounterGroups;

    const query = searchTerm.toLowerCase();
    return encounterGroups.filter((group) => {
      const patientName = group.patient
        ? formatPatientName(group.patient).toLowerCase()
        : '';
      const doctorName = group.doctor
        ? `${group.doctor.first_name} ${group.doctor.last_name}`.toLowerCase()
        : '';
      const drugNames = group.prescriptions
        .map((p) => p.drug?.drug_name?.toLowerCase() || '')
        .join(' ');

      return (
        patientName.includes(query) ||
        doctorName.includes(query) ||
        drugNames.includes(query)
      );
    });
  }, [encounterGroups, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearch?.(e.target.value);
  };

  if (isLoading) {
    return <SkeletonList count={4} />;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by patient, doctor, or drug..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showPendingOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPendingOnly(true)}
          >
            Pending Only
          </Button>
          <Button
            variant={!showPendingOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPendingOnly(false)}
          >
            All
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No prescriptions"
          description={
            showPendingOnly
              ? 'No pending prescriptions to approve'
              : 'No prescriptions found'
          }
        />
      )}

      {/* Encounter Groups */}
      {filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <div
              key={group.encounter_id}
              onClick={() => onSelectEncounter(group)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
            >
              {(() => {
                const diagnosisSet = new Set<string>();
                const consultantNotes: string[] = [];
                const instructionNotes: string[] = [];

                group.prescriptions.forEach((prescription) => {
                  parseDiagnosisList((prescription as any).diagnosis).forEach(
                    (diagnosis) => {
                      diagnosisSet.add(diagnosis);
                    },
                  );

                  const clinical = (
                    (prescription as any).clinical_notes as string | undefined
                  )?.trim();
                  if (clinical) consultantNotes.push(clinical);

                  const instruction = prescription.instructions?.trim();
                  if (instruction) instructionNotes.push(instruction);

                  const specialInstruction =
                    prescription.special_instructions?.trim();
                  if (specialInstruction)
                    instructionNotes.push(specialInstruction);
                });

                const diagnoses = Array.from(diagnosisSet);
                const primaryNote =
                  consultantNotes[0] || instructionNotes[0] || '';

                return (
                  <div className="flex items-start justify-between">
                    {/* Left Side - Patient & Prescription Info */}
                    <div className="flex-1">
                      {/* Patient Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User size={18} className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {group.patient
                              ? formatPatientName(group.patient)
                              : 'Unknown Patient'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {group.patient && (
                              <>
                                <span>{group.patient.gender}</span>
                                <span>•</span>
                                <span>
                                  {formatDetailedAge(
                                    group.patient.date_of_birth,
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prescription Summary */}
                      <div className="flex items-center gap-4 text-sm mt-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(group.encounter_date).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </div>
                        {group.doctor && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <User size={14} className="text-gray-400" />
                            Dr. {group.doctor.first_name}{' '}
                            {group.doctor.last_name}
                          </div>
                        )}
                      </div>

                      {/* Drug Names Preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.prescriptions.slice(0, 3).map((prescription) => (
                          <span
                            key={prescription.prescription_id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {prescription.drug?.drug_name ||
                              (prescription as any).drug_name ||
                              'Unknown'}
                          </span>
                        ))}
                        {group.prescriptions.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            +{group.prescriptions.length - 3} more
                          </span>
                        )}
                      </div>

                      {(diagnoses.length > 0 || primaryNote) && (
                        <div className="mt-3 space-y-1">
                          {diagnoses.length > 0 && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold text-gray-800">
                                Diagnosis:
                              </span>{' '}
                              {diagnoses.slice(0, 2).join('; ')}
                              {diagnoses.length > 2 &&
                                ` +${diagnoses.length - 2} more`}
                            </div>
                          )}
                          {primaryNote && (
                            <div className="text-xs text-gray-600 line-clamp-2">
                              <span className="font-semibold text-gray-700">
                                Consultant note:
                              </span>{' '}
                              {primaryNote}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Side - Stats & Arrow */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {group.total_count} prescription
                          {group.total_count !== 1 ? 's' : ''}
                        </div>
                        {group.pending_count > 0 && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {group.pending_count} pending
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-gray-400 group-hover:text-green-600 transition-colors"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
