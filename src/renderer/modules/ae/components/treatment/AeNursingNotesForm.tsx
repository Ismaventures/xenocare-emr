// =============================================================================
// AeNursingNotesForm — Repeat observations + nursing notes
// =============================================================================

import React, { useState } from 'react';
import { Thermometer, Activity, Clock, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAddVitalObservation, useAeVitals } from '../../hooks/useAe';
import { supabase } from '../../../../api/supabaseClient';
import { useToast } from '../../../../components/ui/Toast';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';

interface AeNursingNotesFormProps {
  encounterId: string;
  patientId: string;
}

export default function AeNursingNotesForm({
  encounterId,
  patientId,
}: AeNursingNotesFormProps) {
  const addVitals = useAddVitalObservation();
  const { data: vitals = [] } = useAeVitals(encounterId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [nursingNote, setNursingNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [vitalData, setVitalData] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    respiratory_rate: '',
    temperature: '',
    spo2: '',
    gcs_total: '',
    pain_score: '',
  });

  const handleVitalChange = (key: string, value: string) => {
    setVitalData((prev) => ({ ...prev, [key]: value }));
  };

  const submitVitals = async () => {
    const obs: Record<string, any> = {};
    if (vitalData.systolic_bp) obs.systolic_bp = Number(vitalData.systolic_bp);
    if (vitalData.diastolic_bp)
      obs.diastolic_bp = Number(vitalData.diastolic_bp);
    if (vitalData.heart_rate) obs.heart_rate = Number(vitalData.heart_rate);
    if (vitalData.respiratory_rate)
      obs.respiratory_rate = Number(vitalData.respiratory_rate);
    if (vitalData.temperature) obs.temperature = Number(vitalData.temperature);
    if (vitalData.spo2) obs.spo2 = Number(vitalData.spo2);
    if (vitalData.gcs_total) obs.gcs_total = Number(vitalData.gcs_total);
    if (vitalData.pain_score) obs.pain_score = Number(vitalData.pain_score);

    if (Object.keys(obs).length === 0) return;

    try {
      await addVitals.mutateAsync({
        encounter_id: encounterId,
        patient_id: patientId,
        blood_pressure_systolic: obs.systolic_bp,
        blood_pressure_diastolic: obs.diastolic_bp,
        pulse: obs.heart_rate,
        respiratory_rate: obs.respiratory_rate,
        temperature: obs.temperature,
        oxygen_saturation: obs.spo2,
        pain_level: obs.pain_score,
      });
      showToast({ message: 'Vitals recorded successfully', type: 'success' });
      setVitalData({
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        respiratory_rate: '',
        temperature: '',
        spo2: '',
        gcs_total: '',
        pain_score: '',
      });
    } catch (err) {
      console.error('[A&E] Vital save failed:', err);
    }
  };

  const submitNursingNote = async () => {
    if (!nursingNote.trim()) return;
    setSavingNote(true);
    try {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();

      await supabase.from('ae_timeline_events').insert({
        encounter_id: encounterId,
        patient_id: patientId,
        event_category: 'nursing',
        event_type: 'nursing_note',
        title: 'Nursing Note',
        description: nursingNote,
        performed_by: staffRow?.id ?? null,
        performed_at: new Date().toISOString(),
        severity: 'info',
      });

      queryClient.invalidateQueries({ queryKey: ['ae'] });
      setNursingNote('');
      showToast({ message: 'Nursing note saved', type: 'success' });
    } catch (err) {
      console.error('[A&E] Nursing note failed:', err);
      showToast({ message: 'Failed to save note', type: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        {/* Repeat Vital Signs */}
        <div className="border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
            <Thermometer className="h-4 w-4" /> Repeat Vital Signs
          </h4>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'systolic_bp', label: 'SBP', unit: 'mmHg' },
              { key: 'diastolic_bp', label: 'DBP', unit: 'mmHg' },
              { key: 'heart_rate', label: 'HR', unit: 'bpm' },
              { key: 'respiratory_rate', label: 'RR', unit: '/min' },
              { key: 'temperature', label: 'Temp', unit: '°C' },
              { key: 'spo2', label: 'SpO2', unit: '%' },
              { key: 'gcs_total', label: 'GCS', unit: '/15' },
              { key: 'pain_score', label: 'Pain', unit: '/10' },
            ].map((v) => (
              <div key={v.key}>
                <label className="block text-xs text-gray-500 mb-0.5">
                  {v.label} ({v.unit})
                </label>
                <input
                  type="number"
                  value={(vitalData as any)[v.key]}
                  onChange={(e) => handleVitalChange(v.key, e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  step={v.key === 'temperature' ? '0.1' : '1'}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitVitals}
              disabled={addVitals.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50"
            >
              {addVitals.isPending ? 'Saving...' : 'Record Vitals'}
            </button>
          </div>
        </div>

        {/* Recent Vital Trend */}
        {vitals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
              <Activity className="h-4 w-4 text-green-500" /> Vital Signs Trend
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-500">
                      Time
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      BP
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      HR
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      RR
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      Temp
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      SpO2
                    </th>
                    <th className="px-2 py-1.5 text-center text-gray-500">
                      Pain
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vitals.slice(0, 10).map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-600">
                        {new Date(
                          v.date_recorded || v.created_at,
                        ).toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.blood_pressure_systolic && v.blood_pressure_diastolic
                          ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
                          : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.pulse || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.respiratory_rate || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.temperature || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.oxygen_saturation ? `${v.oxygen_saturation}%` : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {v.pain_level || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Nursing Notes */}
        <div className="border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Nursing Note
            </h4>
            <SavedNotesPopover
              category="nursing_notes"
              subcategory="ae_nursing"
              currentValue={nursingNote}
              onInsert={(content) => setNursingNote(content)}
            />
          </div>
          <textarea
            value={nursingNote}
            onChange={(e) => setNursingNote(e.target.value)}
            rows={3}
            placeholder="Record nursing observations, interventions, patient response..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitNursingNote}
              disabled={savingNote || !nursingNote.trim()}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50"
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
