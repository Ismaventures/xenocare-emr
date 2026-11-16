// =============================================================================
// Payer Details Card — Reusable NHIS Payer Information Display
// =============================================================================
// Shows patient NHIS payer/scheme information in a compact, branded card.
// Used across all NHIS verification and approval modals.
// =============================================================================

import React from 'react';
import {
  CreditCard,
  Shield,
  User,
  Calendar,
  BadgeCheck,
  Building2,
  Star,
  Hash,
} from 'lucide-react';
import type { PayerInfo } from '../../../types/database.types';

export interface PayerDetailsCardProps {
  payerInfo: PayerInfo | null | undefined;
  nhisNumber?: string | null;
  insuranceType?: string | null;
  patientCategory?: string | null;
  hmoScheme?: string | null;
  /** Compact mode for smaller modals */
  compact?: boolean;
  /** Optional class overrides */
  className?: string;
}

/**
 * Renders a collapsible/stylized card showing all NHIS payer details for a patient.
 * Handles null/missing payer_info gracefully.
 */
export function PayerDetailsCard({
  payerInfo,
  nhisNumber,
  insuranceType,
  patientCategory,
  hmoScheme,
  compact = false,
  className = '',
}: PayerDetailsCardProps) {
  const scheme = payerInfo?.scheme || hmoScheme || insuranceType || null;
  const enrolee_id = payerInfo?.enrolee_id || nhisNumber || null;
  const relationship = payerInfo?.relationship || null;
  const expiration_date = payerInfo?.expiration_date || null;
  const principal_name = payerInfo?.principal_name || null;
  const principal_rank = payerInfo?.principal_rank || null;
  const principal_service_number = payerInfo?.principal_service_number || null;
  const principal_unit = payerInfo?.principal_unit || null;

  const hasPrincipalDetails =
    principal_name ||
    principal_rank ||
    principal_service_number ||
    principal_unit;
  const hasAnyData =
    scheme ||
    enrolee_id ||
    relationship ||
    expiration_date ||
    hasPrincipalDetails;

  if (!hasAnyData) {
    return (
      <div
        className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-center gap-2 text-amber-700">
          <CreditCard size={16} />
          <span className="text-sm font-medium">
            No payer/scheme details on file
          </span>
        </div>
        <p className="text-xs text-amber-600 mt-1">
          Patient payer information has not been registered. Please update
          patient records.
        </p>
      </div>
    );
  }

  // Format expiration date nicely
  const formattedExpiry = expiration_date
    ? (() => {
        try {
          const d = new Date(expiration_date);
          if (isNaN(d.getTime())) return expiration_date;
          const now = new Date();
          const isExpired = d < now;
          const formatted = d.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          return { text: formatted, isExpired };
        } catch {
          return { text: expiration_date, isExpired: false };
        }
      })()
    : null;

  if (compact) {
    return (
      <div
        className={`bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 ${className}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <Shield size={14} className="text-emerald-700" />
          </div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Payer / Scheme Details
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {scheme && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                Scheme
              </p>
              <p className="text-xs font-bold text-gray-800">{scheme}</p>
            </div>
          )}
          {enrolee_id && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                Enrolee ID / NHIS No.
              </p>
              <p className="text-xs font-bold text-emerald-700 font-mono">
                {enrolee_id}
              </p>
            </div>
          )}
          {relationship && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                Relationship
              </p>
              <p className="text-xs font-semibold text-gray-700 capitalize">
                {relationship}
              </p>
            </div>
          )}
          {formattedExpiry && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                Expiry
              </p>
              <p
                className={`text-xs font-semibold ${typeof formattedExpiry !== 'string' && formattedExpiry.isExpired ? 'text-red-600' : 'text-gray-700'}`}
              >
                {typeof formattedExpiry === 'string'
                  ? formattedExpiry
                  : formattedExpiry.text}
                {typeof formattedExpiry !== 'string' &&
                  formattedExpiry.isExpired && (
                    <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold">
                      EXPIRED
                    </span>
                  )}
              </p>
            </div>
          )}
          {principal_name && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                Principal
              </p>
              <p className="text-xs font-semibold text-gray-700">
                {principal_rank ? `${principal_rank} ` : ''}
                {principal_name}
                {principal_service_number
                  ? ` (${principal_service_number})`
                  : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3 border-b border-emerald-200/60">
        <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-wider">
          <Shield size={16} className="text-emerald-700" />
          Payer / Scheme Details
        </h4>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Scheme */}
          {scheme && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 size={12} className="text-emerald-600" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Scheme / HMO
                </span>
              </div>
              <span className="font-bold text-gray-900 text-sm">{scheme}</span>
            </div>
          )}

          {/* Enrolee ID */}
          {enrolee_id && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Hash size={12} className="text-emerald-600" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Enrolee ID / NHIS No.
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {enrolee_id}
              </span>
            </div>
          )}

          {/* Relationship */}
          {relationship && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <User size={12} className="text-emerald-600" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Relationship
                </span>
              </div>
              <span className="font-semibold text-gray-800 text-sm capitalize">
                {relationship}
              </span>
            </div>
          )}

          {/* Expiration Date */}
          {formattedExpiry && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-emerald-600" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Coverage Expiry
                </span>
              </div>
              <span
                className={`font-semibold text-sm ${typeof formattedExpiry !== 'string' && formattedExpiry.isExpired ? 'text-red-600' : 'text-gray-800'}`}
              >
                {typeof formattedExpiry === 'string'
                  ? formattedExpiry
                  : formattedExpiry.text}
                {typeof formattedExpiry !== 'string' &&
                  formattedExpiry.isExpired && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                      EXPIRED
                    </span>
                  )}
              </span>
            </div>
          )}
        </div>

        {/* Principal Details (for dependents) */}
        {hasPrincipalDetails && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Star size={12} className="text-amber-600" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Principal / Sponsor Details
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-amber-50/50 rounded-lg p-3 border border-amber-100">
              {principal_name && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-0.5">
                    Name
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {principal_name}
                  </span>
                </div>
              )}
              {principal_rank && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-0.5">
                    Rank
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {principal_rank}
                  </span>
                </div>
              )}
              {principal_service_number && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-0.5">
                    Service Number
                  </span>
                  <span className="font-mono font-semibold text-gray-800 text-sm">
                    {principal_service_number}
                  </span>
                </div>
              )}
              {principal_unit && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-0.5">
                    Unit
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {principal_unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patient Category Badge */}
        {patientCategory && (
          <div className="mt-3 flex items-center gap-2">
            <BadgeCheck size={13} className="text-gray-400" />
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                patientCategory === 'Military'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : patientCategory === 'Civilian'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : patientCategory === 'Dependent'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {patientCategory}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PayerDetailsCard;
