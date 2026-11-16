// =============================================================================
// AeFluidChartForm — IV / IO Fluid Charts for A&E
// =============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Droplets, Clock } from 'lucide-react';
import {
  fluidChartFormSchema,
  type FluidChartFormDTO,
} from '../../dtos/ae.dto';
import { useCreateFluidChart, useAeFluidCharts } from '../../hooks/useAe';
import { SelectWithOther } from '../../../shared/components/SelectWithOther';
import { useToast } from '../../../../components/ui/Toast';

interface AeFluidChartFormProps {
  encounterId: string;
  patientId: string;
}

const FLUIDS = [
  'Normal Saline (0.9% NaCl)',
  "Ringer's Lactate",
  'Dextrose 5%',
  'Dextrose Saline',
  'Gelofusine',
  'Haemaccel',
  'Packed Red Cells',
  'Fresh Frozen Plasma',
  'Whole Blood',
  'Dextrose 10%',
  'Mannitol 20%',
  'Sodium Bicarbonate',
];

const ROUTES = [
  { value: 'iv', label: 'Intravenous (IV)' },
  { value: 'io', label: 'Intraosseous (IO)' },
  { value: 'sc', label: 'Subcutaneous' },
  { value: 'oral', label: 'Oral' },
];

export default function AeFluidChartForm({
  encounterId,
  patientId,
}: AeFluidChartFormProps) {
  const createFluid = useCreateFluidChart();
  const { data: fluidCharts = [] } = useAeFluidCharts(encounterId);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FluidChartFormDTO>({
    resolver: zodResolver(fluidChartFormSchema),
    defaultValues: {
      encounter_id: encounterId,
      patient_id: patientId,
      route: 'iv',
    },
  });

  const onSubmit = async (data: FluidChartFormDTO) => {
    try {
      await createFluid.mutateAsync({
        ...data,
        patient_id: patientId,
        route: data.route?.toLowerCase() as string,
        start_time: data.start_time || new Date().toISOString(),
      });
      reset({ encounter_id: encounterId, patient_id: patientId, route: 'iv' });
      showToast({ message: 'Fluid chart saved', type: 'success' });
    } catch (err) {
      console.error('[A&E] Fluid chart save failed:', err);
      showToast({ message: 'Failed to save fluid chart', type: 'error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        {/* Current Fluid Orders */}
        {fluidCharts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              Active / Completed Fluids
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Fluid
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Vol
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Rate
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Route
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fluidCharts.map((f: any) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{f.fluid_name}</td>
                      <td className="px-3 py-2">{f.volume_ml} ml</td>
                      <td className="px-3 py-2">
                        {f.rate_ml_hr ? `${f.rate_ml_hr} ml/hr` : '-'}
                      </td>
                      <td className="px-3 py-2">{f.route}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            f.status === 'running'
                              ? 'bg-green-100 text-green-700'
                              : f.status === 'completed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {f.started_at
                          ? new Date(f.started_at).toLocaleTimeString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Fluid Order Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border border-blue-200 rounded-lg p-4 space-y-4"
        >
          <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
            <Droplets className="h-4 w-4" /> New Fluid Order
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fluid *
              </label>
              <SelectWithOther
                fieldId="ae:fluid_type"
                value={watch('fluid_type') || ''}
                onChange={(v) => setValue('fluid_type', v as any)}
                options={FLUIDS}
                placeholder="Select fluid..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              />
              {errors.fluid_type && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.fluid_type.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route *
              </label>
              <SelectWithOther
                fieldId="ae:fluid_route"
                value={watch('route') || 'iv'}
                onChange={(v) => setValue('route', v as any)}
                options={ROUTES}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume (ml) *
              </label>
              <input
                type="number"
                {...register('volume_ml', { valueAsNumber: true })}
                placeholder="e.g., 1000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              {errors.volume_ml && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.volume_ml.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate (ml/hr)
              </label>
              <input
                type="number"
                {...register('rate_ml_hr', { valueAsNumber: true })}
                placeholder="e.g., 125"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                {...register('notes')}
                placeholder="Duration, additives, special instructions..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createFluid.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50"
            >
              {createFluid.isPending ? 'Saving...' : 'Start Fluid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
