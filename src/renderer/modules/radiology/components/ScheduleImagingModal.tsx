import React, { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { RadiologyRequestDTO } from '../dtos/radiology.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';

interface ScheduleImagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scheduledDate: string) => void;
  request: RadiologyRequestDTO | null;
  isLoading?: boolean;
}

function toLocalInputValue(isoDate?: string | null) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function ScheduleImagingModal({
  isOpen,
  onClose,
  onSubmit,
  request,
  isLoading,
}: ScheduleImagingModalProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (request) {
      setScheduledDate(toLocalInputValue(request.scheduled_date) || '');
      setError('');
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleSubmit = () => {
    if (!scheduledDate) {
      setError('Select a date and time for the imaging appointment.');
      return;
    }
    setError('');
    onSubmit(new Date(scheduledDate).toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Schedule Imaging
                </h3>
                <p className="text-sm text-gray-500">
                  {request.imaging?.imaging_name || 'Imaging Study'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Patient</p>
              <p className="text-base text-gray-900">
                {request.patient
                  ? formatPatientName(request.patient)
                  : 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                {request.patient
                  ? `${request.patient.gender || 'N/A'} - ${formatDetailedAge(request.patient.date_of_birth)}`
                  : 'No demographic details'}
              </p>
            </div>

            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              error={error}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              Confirm Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
