/**
 * BillingPanel - Placeholder for billing information
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';

interface BillingPanelProps {
  encounter: EncounterDetail;
}

export function BillingPanel({ encounter }: BillingPanelProps) {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={Receipt}
      title="Billing & Invoices"
      description={`Financial records for encounter ${encounter.encounter_number} are managed in the Billing module.`}
      action={
        <button
          onClick={() => navigate('/billing')}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition"
        >
          Go to Billing
        </button>
      }
    />
  );
}
