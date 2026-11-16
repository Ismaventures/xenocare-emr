// =============================================================================
// ANC Module — Risk Flags Panel
// Display, add, and resolve pregnancy risk flags
// =============================================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Plus,
  X,
  CheckCircle,
  Shield,
  Clock,
} from 'lucide-react';
import {
  useActiveRiskFlags,
  useRiskFlags,
  useCreateRiskFlag,
  useResolveRiskFlag,
} from '../hooks/useAnc';
import { ancRiskFlagSchema, type AncRiskFlagFormDTO } from '../dtos/anc.dto';
import type { AncRiskFlag } from '../api/anc.types';
import { SelectWithOther } from '../../shared/components/SelectWithOther';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';

interface Props {
  pregnancyEpisodeId: string;
  ancVisitId?: string;
}

const SEVERITY_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  low: {
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  moderate: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  high: {
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  critical: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const COMMON_RISK_CODES = [
  { code: 'PIH', name: 'Pregnancy Induced Hypertension' },
  { code: 'GDM', name: 'Gestational Diabetes' },
  { code: 'PREECLAMPSIA', name: 'Pre-eclampsia' },
  { code: 'ECLAMPSIA', name: 'Eclampsia' },
  { code: 'PLACENTA_PREVIA', name: 'Placenta Previa' },
  { code: 'ABRUPTION', name: 'Placental Abruption' },
  { code: 'IUGR', name: 'Intrauterine Growth Restriction' },
  { code: 'OLIGOHYDRAMNIOS', name: 'Oligohydramnios' },
  { code: 'POLYHYDRAMNIOS', name: 'Polyhydramnios' },
  { code: 'PROM', name: 'Premature Rupture of Membranes' },
  { code: 'PRETERM_LABOR', name: 'Preterm Labor' },
  { code: 'ANEMIA', name: 'Maternal Anemia' },
  { code: 'RH_NEGATIVE', name: 'Rh Negative' },
  { code: 'MULTIPLE_GESTATION', name: 'Multiple Gestation' },
  { code: 'ELDERLY_PRIMIGRAVIDA', name: 'Elderly Primigravida' },
  { code: 'PREV_CS', name: 'Previous Caesarean Section' },
  { code: 'MALPRESENTATION', name: 'Malpresentation' },
  { code: 'OTHER', name: 'Other' },
];

export default function AncRiskFlags({
  pregnancyEpisodeId,
  ancVisitId,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const { data: activeFlags } = useActiveRiskFlags(pregnancyEpisodeId);
  const { data: allFlags } = useRiskFlags(pregnancyEpisodeId);
  const createFlag = useCreateRiskFlag();
  const resolveFlag = useResolveRiskFlag(pregnancyEpisodeId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AncRiskFlagFormDTO>({
    resolver: zodResolver(ancRiskFlagSchema),
    defaultValues: {
      pregnancy_episode_id: pregnancyEpisodeId,
      anc_visit_id: ancVisitId || undefined,
      severity: 'moderate',
    },
  });

  const watchCode = watch('risk_code');

  const onSubmit = async (data: AncRiskFlagFormDTO) => {
    try {
      await createFlag.mutateAsync(data);
      reset();
      setShowForm(false);
    } catch (err: any) {
      alert(`Failed to add risk flag: ${err?.message || String(err)}`);
    }
  };

  const handleSelectCommon = (code: string, name: string) => {
    setValue('risk_code', code);
    setValue('risk_name', name);
  };

  const handleResolve = async (flagId: string) => {
    try {
      await resolveFlag.mutateAsync(flagId);
    } catch (err: any) {
      alert(`Failed to resolve flag: ${err?.message || String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Flags */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Active Risk Flags
          {activeFlags && activeFlags.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
              {activeFlags.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium"
        >
          {showForm ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {showForm ? 'Cancel' : 'Add Flag'}
        </button>
      </div>

      {/* Add Flag Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-50 rounded-lg border p-4 space-y-3"
        >
          {/* Quick select */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_RISK_CODES.map((rc) => (
                <button
                  key={rc.code}
                  type="button"
                  onClick={() => handleSelectCommon(rc.code, rc.name)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    watchCode === rc.code
                      ? 'bg-pink-100 border-pink-300 text-pink-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {rc.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Risk Code *
              </label>
              <input
                {...register('risk_code')}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="e.g. PIH"
              />
              {errors.risk_code && (
                <p className="text-xs text-red-600">
                  {errors.risk_code.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Risk Name *
              </label>
              <input
                {...register('risk_name')}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Pregnancy Induced Hypertension"
              />
              {errors.risk_name && (
                <p className="text-xs text-red-600">
                  {errors.risk_name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Severity *
              </label>
              <SelectWithOther
                fieldId="anc:severity"
                value={watch('severity') ?? ''}
                onChange={(v: string) =>
                  setValue(
                    'severity',
                    v as 'low' | 'moderate' | 'high' | 'critical',
                  )
                }
                options={['low', 'moderate', 'high', 'critical']}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Select severity"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">
                Notes
              </label>
              <SavedNotesPopover
                category="anc_notes"
                subcategory="risk_flag_notes"
                currentValue={watch('notes') || ''}
                onInsert={(content) => setValue('notes', content)}
              />
            </div>
            <textarea
              {...register('notes')}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[50px]"
              placeholder="Additional details…"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Add Risk Flag
            </button>
          </div>
        </form>
      )}

      {/* Active flags list */}
      {activeFlags && activeFlags.length > 0 ? (
        <div className="space-y-2">
          {activeFlags.map((flag) => (
            <FlagCard key={flag.id} flag={flag} onResolve={handleResolve} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-400">
          No active risk flags
        </div>
      )}

      {/* Resolved history (collapsible) */}
      {allFlags && allFlags.filter((f) => !f.active).length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {allFlags.filter((f) => !f.active).length} resolved flag(s)
          </summary>
          <div className="mt-2 space-y-2">
            {allFlags
              .filter((f) => !f.active)
              .map((flag) => (
                <FlagCard key={flag.id} flag={flag} resolved />
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FlagCard({
  flag,
  onResolve,
  resolved,
}: {
  flag: AncRiskFlag;
  onResolve?: (id: string) => void;
  resolved?: boolean;
}) {
  const config = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.moderate;
  return (
    <div
      className={`flex items-start justify-between rounded-lg border px-4 py-3 ${resolved ? 'opacity-60 bg-gray-50' : 'bg-white'}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 flex-shrink-0 mt-0.5 ${config.color}`}
        >
          {config.icon}
          {flag.severity}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{flag.risk_name}</p>
          <p className="text-xs text-gray-500">
            Code: {flag.risk_code} · Detected:{' '}
            {new Date(flag.detected_at).toLocaleDateString()}
            {flag.resolved_at &&
              ` · Resolved: ${new Date(flag.resolved_at).toLocaleDateString()}`}
          </p>
          {flag.notes && (
            <p className="text-xs text-gray-500 mt-1">{flag.notes}</p>
          )}
        </div>
      </div>
      {!resolved && onResolve && (
        <button
          onClick={() => onResolve(flag.id)}
          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium ml-2 flex-shrink-0"
          title="Resolve flag"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Resolve
        </button>
      )}
    </div>
  );
}
