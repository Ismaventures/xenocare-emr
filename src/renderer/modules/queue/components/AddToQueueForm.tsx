import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  Department,
  PriorityLevel,
  DEPARTMENTS,
  PRIORITY_LEVELS,
} from '../dtos/queue.dto';
import { useAddToQueue } from '../hooks/useQueue';
import { usePatients } from '../../patient-registration/hooks/usePatient';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../components/ui/Toast';
import { formatDetailedAge } from '../../patient-registration/dtos/patient.dto';

interface AddToQueueFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDepartment?: Department;
  preselectedPatientId?: string;
}

export function AddToQueueForm({
  isOpen,
  onClose,
  defaultDepartment = 'Reception',
  preselectedPatientId,
}: AddToQueueFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedPatientId, setSelectedPatientId] = useState(
    preselectedPatientId || '',
  );
  const [department, setDepartment] = useState<Department>(defaultDepartment);
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [notes, setNotes] = useState('');

  const { data: patientsData, isLoading: loadingPatients } = usePatients({
    query: debouncedSearch,
  });
  const patients = patientsData?.patients || [];
  const addToQueue = useAddToQueue();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId) {
      showToast({
        title: 'Error',
        message: 'Please select a patient',
        type: 'error',
      });
      return;
    }

    try {
      await addToQueue.mutateAsync({
        patient_id: selectedPatientId,
        department,
        priority,
        notes: notes || undefined,
      });
      showToast({
        title: 'Success',
        message: 'Patient added to queue',
        type: 'success',
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to add to queue:', error);
      showToast({
        title: 'Error',
        message: 'Failed to add to queue',
        type: 'error',
      });
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSelectedPatientId('');
    setDepartment(defaultDepartment);
    setPriority('Normal');
    setNotes('');
  };

  const selectedPatient = patients?.find(
    (p) => p.patient_id === selectedPatientId,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Patient to Queue"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient <span className="text-red-500">*</span>
          </label>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.surname}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedPatient.patient_id} • {selectedPatient.gender}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedPatientId('')}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search patients by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y">
                  {loadingPatients ? (
                    <div className="p-4 text-center text-gray-500">
                      Searching...
                    </div>
                  ) : patients && patients.length > 0 ? (
                    patients.slice(0, 10).map((patient) => (
                      <button
                        key={patient.patient_id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(patient.patient_id);
                          setSearchQuery('');
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">
                          {patient.first_name} {patient.surname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {patient.patient_id} • {patient.gender} •{' '}
                          {formatDetailedAge(patient.date_of_birth)}
                        </p>
                        {patient.contact_phone && (
                          <p className="text-xs text-gray-400">
                            {patient.contact_phone}
                          </p>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No patients found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Department */}
        <Select
          label="Department"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value as Department)}
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
        />

        {/* Priority */}
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityLevel)}
          options={PRIORITY_LEVELS.map((p) => ({ value: p, label: p }))}
          // Note: Emergency cases will be prioritized in the queue
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special notes or requirements..."
          rows={2}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedPatientId || addToQueue.isPending}
          >
            {addToQueue.isPending ? 'Adding...' : 'Add to Queue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
