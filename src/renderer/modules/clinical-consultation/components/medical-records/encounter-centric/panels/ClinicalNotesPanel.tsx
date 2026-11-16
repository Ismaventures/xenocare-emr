/**
 * ClinicalNotesPanel - Displays consultation notes for an encounter
 */

import React from 'react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { Card, EmptyState } from '../../../../../../components/ui/DataDisplay';
import { formatDate, formatDateTime } from '../shared/utils';

interface ClinicalNotesPanelProps {
  encounter: EncounterDetail;
}

export function ClinicalNotesPanel({ encounter }: ClinicalNotesPanelProps) {
  const { consultation } = encounter;

  if (!consultation) {
    return (
      <EmptyState
        title="No Clinical Notes"
        description="No consultation notes recorded for this encounter."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with doctor and timestamp */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {consultation.doctor_name
                ? consultation.doctor_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                : 'Dr'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {consultation.doctor_name ||
                encounter.doctor?.name ||
                'Unknown Doctor'}
            </p>
            <p className="text-xs text-gray-500">Consulting Physician</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-700">
            {consultation.consultation_date
              ? formatDateTime(consultation.consultation_date)
              : consultation.created_at
                ? formatDateTime(consultation.created_at)
                : 'Date not recorded'}
          </p>
          {consultation.updated_at &&
            consultation.updated_at !== consultation.created_at && (
              <p className="text-xs text-gray-500">
                Updated: {formatDateTime(consultation.updated_at)}
              </p>
            )}
        </div>
      </div>

      {consultation.history_of_present_illness && (
        <Card title="History of Present Illness">
          <p className="text-gray-700 whitespace-pre-wrap">
            {consultation.history_of_present_illness}
          </p>
        </Card>
      )}

      {consultation.examination_findings && (
        <Card title="Examination Findings">
          <p className="text-gray-700 whitespace-pre-wrap">
            {consultation.examination_findings}
          </p>
        </Card>
      )}

      {consultation.diagnosis && (
        <Card title="Diagnosis / Assessment">
          <p className="text-gray-900 font-medium">{consultation.diagnosis}</p>
        </Card>
      )}

      {consultation.treatment_plan && (
        <Card title="Treatment Plan">
          <p className="text-gray-700 whitespace-pre-wrap">
            {consultation.treatment_plan}
          </p>
        </Card>
      )}

      {consultation.recommendations && (
        <Card title="Recommendations">
          <p className="text-gray-700 whitespace-pre-wrap">
            {consultation.recommendations}
          </p>
        </Card>
      )}

      {consultation.follow_up_date && (
        <Card title="Follow-up">
          <p className="text-primary-700 font-medium">
            Scheduled for: {formatDate(consultation.follow_up_date)}
          </p>
          {consultation.follow_up_notes && (
            <p className="text-gray-600 mt-2">{consultation.follow_up_notes}</p>
          )}
        </Card>
      )}
    </div>
  );
}
