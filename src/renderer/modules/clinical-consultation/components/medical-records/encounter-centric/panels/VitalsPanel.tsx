/**
 * VitalsPanel - Displays vital signs for an encounter
 */

import React from 'react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { Card, EmptyState } from '../../../../../../components/ui/DataDisplay';
import { VitalsDisplay } from '../shared';
import PatientVitalsChart from '../../../../../../components/charts/PatientVitalsChart';

interface VitalsPanelProps {
  encounter: EncounterDetail;
}

export function VitalsPanel({ encounter }: VitalsPanelProps) {
  const rawVitals = encounter.all_vitals || [];
  const latestVitals = encounter.vitals;

  if (!latestVitals && rawVitals.length === 0) {
    return (
      <EmptyState
        title="No Vitals Recorded"
        description="No vital signs recorded for this encounter."
      />
    );
  }

  // Sort by recorded_at descending (most recent first)
  const allVitals = [...rawVitals].sort((a, b) => {
    const da = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
    const db = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
    return db - da;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Vital Signs ({allVitals.length || 1} record
          {allVitals.length !== 1 ? 's' : ''})
        </h2>
      </div>

      {/* Vitals Trend Chart */}
      <PatientVitalsChart patientId={encounter.patient_id} />

      {/* Show all vitals records — most recent first */}
      {allVitals.length > 0 ? (
        allVitals.map((vitals, idx) => {
          const dateLabel = formatDate(vitals.recorded_at);
          const title = `Record #${idx + 1}${dateLabel ? ` — ${dateLabel}` : ''}${idx === 0 ? ' (Latest)' : ''}`;
          return (
            <Card key={vitals.recorded_at || idx} title={title}>
              <VitalsDisplay vitals={vitals} detailed />
            </Card>
          );
        })
      ) : latestVitals ? (
        <Card title="Latest Vitals">
          <VitalsDisplay vitals={latestVitals} detailed />
        </Card>
      ) : null}
    </div>
  );
}
