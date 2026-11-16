/**
 * =============================================================================
 * UNIVERSAL ORDER BUTTON
 *
 * A self-contained "Add Order" button that opens the QuickOrderModal.
 * Designed to be dropped into ANY clinical module (GOPD, Ward, A&E, Procedure,
 * ANC, Specialty, Dental, Nursing, etc.) with minimal props.
 *
 * Internally constructs the EncounterContinuationContext and resolves
 * encounter metadata. Mirrors standard CPOE (Computerised Physician Order
 * Entry) practice: single entry point → Lab / Radiology / Pharmacy / Procedure.
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  QuickOrderModal,
  OrderType,
} from '../../modules/clinical-consultation/components/medical-records/QuickOrderModal';
import {
  EncounterContinuationContext,
} from '../../lib/encounter/continuation';

// =============================================================================
// Props
// =============================================================================

export interface UniversalOrderButtonProps {
  /** UUID of the encounter/visit to attach orders to */
  encounterId: string;
  /** Patient ID (VARCHAR e.g. "PT-00001") */
  patientId: string;
  /** Display name of the patient */
  patientName: string;
  /** EMR / hospital number (optional, used for NHIS) */
  patientEmrNumber?: string;
  /** Encounter type — determines continuation time-limits */
  encounterType?: 'OPD' | 'In-Patient' | 'Emergency';
  /** Whether patient has an active admission (bypasses OPD time-limits) */
  hasActiveAdmission?: boolean;
  /** Pre-select a tab when modal opens */
  initialTab?: OrderType;
  /** Callback after orders are created (e.g. refetch queries) */
  onOrdersCreated?: () => void;
  /** Override default button styling */
  className?: string;
  /** Compact mode — icon-only button */
  compact?: boolean;
  /** Button label override */
  label?: string;
  /** Disable the button */
  disabled?: boolean;
}

// =============================================================================
// Lightweight encounter metadata fetcher
// =============================================================================

function useEncounterMeta(encounterId: string) {
  return useQuery({
    queryKey: ['encounter-meta-for-orders', encounterId],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select('id, visit_number, status, visit_type, current_stage, created_at')
        .eq('id', encounterId)
        .single();
      return data;
    },
    enabled: !!encounterId,
    staleTime: 60_000,
  });
}

// =============================================================================
// Component
// =============================================================================

export function UniversalOrderButton({
  encounterId,
  patientId,
  patientName,
  patientEmrNumber,
  encounterType = 'OPD',
  hasActiveAdmission = false,
  initialTab,
  onOrdersCreated,
  className,
  compact = false,
  label = 'Add Order',
  disabled = false,
}: UniversalOrderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { staff } = useAuth();

  // Fetch lightweight encounter metadata for continuation context + display
  const { data: meta } = useEncounterMeta(encounterId);

  // Build continuation context from available data
  const encounterContext: EncounterContinuationContext = useMemo(
    () => ({
      encounterId,
      patientId,
      currentStage: (meta?.current_stage as EncounterContinuationContext['currentStage']) || 'consultation',
      status: meta?.status || 'Active',
      createdAt: meta?.created_at || new Date().toISOString(),
      encounterType,
      hasUnresolvedResults: false,
      consultationCount: 1,
      hasActiveAdmission,
    }),
    [encounterId, patientId, meta, encounterType, hasActiveAdmission],
  );

  const encounterNumber = meta?.visit_number || encounterId.slice(0, 8);

  const isDisabled = disabled || !encounterId;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isDisabled}
        className={
          className ||
          `flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm border border-emerald-600 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${compact ? 'px-2' : ''}`
        }
        title={label}
      >
        <Plus size={14} />
        {!compact && <span>{label}</span>}
      </button>

      {showModal && (
        <QuickOrderModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          encounterId={encounterId}
          encounterNumber={encounterNumber}
          patientId={patientId}
          patientName={patientName}
          patientEmrNumber={patientEmrNumber}
          encounterContext={encounterContext}
          onOrdersCreated={() => {
            setShowModal(false);
            onOrdersCreated?.();
          }}
          initialTab={initialTab}
        />
      )}
    </>
  );
}
