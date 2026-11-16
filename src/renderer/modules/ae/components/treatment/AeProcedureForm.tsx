// =============================================================================
// AeProcedureForm — Bedside Procedures performed in A&E
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock } from 'lucide-react';
import {
  aeProcedureFormSchema,
  type AeProcedureFormDTO,
} from '../../dtos/ae.dto';
import { useCreateAeProcedure, useAeProcedures } from '../../hooks/useAe';
import { SelectWithOther } from '../../../shared/components/SelectWithOther';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../../components/ui/TemplateSearchPopover';
import { useToast } from '../../../../components/ui/Toast';

interface AeProcedureFormProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

const PROCEDURE_OUTCOMES_DISPLAY: { value: string; label: string }[] = [
  { value: 'successful', label: 'Successful' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
  { value: 'abandoned', label: 'Abandoned' },
];

export default function AeProcedureForm({
  encounterId,
  patientId,
  onSuccess,
}: AeProcedureFormProps) {
  const createProcedure = useCreateAeProcedure();
  const { data: procedures = [] } = useAeProcedures(encounterId);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AeProcedureFormDTO>({
    resolver: zodResolver(aeProcedureFormSchema),
    defaultValues: {
      encounter_id: encounterId,
      outcome: 'successful',
      consent_obtained: false,
    },
  });

  const onSubmit = async (data: AeProcedureFormDTO) => {
    try {
      await createProcedure.mutateAsync({
        ...data,
        patient_id: patientId,
        start_time: data.start_time || new Date().toISOString(),
      });
      reset({
        encounter_id: encounterId,
        outcome: 'successful',
        consent_obtained: false,
      });
      showToast({ message: 'Procedure recorded', type: 'success' });
      onSuccess?.();
    } catch (err) {
      console.error('[A&E] Procedure save failed:', err);
      showToast({ message: 'Failed to save procedure', type: 'error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Previous Procedures List */}
      {procedures.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Previous Procedures ({procedures.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="pb-2 pr-4">Procedure</th>
                  <th className="pb-2 pr-4">Site</th>
                  <th className="pb-2 pr-4">Outcome</th>
                  <th className="pb-2 pr-4">Complications</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procedures.map((p: any) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="py-2 pr-4 font-medium">
                      {p.procedure_name}
                    </td>
                    <td className="py-2 pr-4">{p.site || '-'}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.outcome === 'successful'
                            ? 'bg-green-100 text-green-700'
                            : p.outcome === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.outcome}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{p.complications || 'None'}</td>
                    <td className="py-2 text-xs text-slate-500">
                      {p.start_time
                        ? new Date(p.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procedure Name *
            </label>
            <input
              type="text"
              {...register('procedure_name')}
              placeholder="e.g., Wound suturing, Chest drain insertion..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            {errors.procedure_name && (
              <p className="text-red-600 text-xs mt-1">
                {errors.procedure_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site / Location
            </label>
            <input
              type="text"
              {...register('site')}
              placeholder="e.g., Left forearm, Right chest..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indication
          </label>
          <input
            type="text"
            {...register('indication')}
            placeholder="Reason for procedure..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anaesthesia Used
          </label>
          <input
            type="text"
            {...register('anaesthesia')}
            placeholder="e.g., Lidocaine 2% local infiltration..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Findings / Description
            </label>
            <div className="flex items-center gap-1">
              <TemplateSearchPopover
                templateType="ae"
                category="ae_notes"
                currentValues={{
                  findings: watch('findings') || '',
                  notes: watch('notes') || '',
                  complications: watch('complications') || '',
                }}
                onTemplateSelect={(data) => {
                  if (data.findings) setValue('findings', data.findings);
                  if (data.notes) setValue('notes', data.notes);
                  if (data.complications) setValue('complications', data.complications);
                }}
                buttonText="Fill All Fields"
              />
              <SavedNotesPopover
                category="ae_notes"
                subcategory="procedure_findings"
                currentValue={watch('findings') || ''}
                onInsert={(content) => setValue('findings', content)}
              />
            </div>
          </div>
          <textarea
            {...register('findings')}
            rows={3}
            placeholder="Procedure findings and description..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome *
            </label>
            <SelectWithOther
              fieldId="ae:procedure_outcome"
              value={watch('outcome') || 'successful'}
              onChange={(v) => setValue('outcome', v as any)}
              options={PROCEDURE_OUTCOMES_DISPLAY}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complications
            </label>
            <input
              type="text"
              {...register('complications')}
              placeholder="None / describe..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('consent_obtained')}
            id="consent"
            className="rounded"
          />
          <label htmlFor="consent" className="text-sm text-gray-700">
            Consent obtained from patient / next of kin
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <SavedNotesPopover
              category="ae_notes"
              subcategory="procedure_notes"
              currentValue={watch('notes') || ''}
              onInsert={(content) => setValue('notes', content)}
            />
          </div>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createProcedure.isPending}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
          >
            {createProcedure.isPending ? 'Saving...' : 'Record Procedure'}
          </button>
        </div>
      </form>
    </div>
  );
}
