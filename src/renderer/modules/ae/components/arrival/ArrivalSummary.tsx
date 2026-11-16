import React from 'react';
import {
  Ambulance,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Hash,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAeArrival } from '../../hooks/useAe';

export default function ArrivalSummary({
  encounterId,
}: {
  encounterId: string;
}) {
  const { data: arrival, isLoading } = useAeArrival(encounterId);

  if (isLoading)
    return (
      <div className="animate-pulse flex space-x-4 p-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    );

  if (!arrival)
    return (
      <div className="p-4 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        No arrival record found.
      </div>
    );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Ambulance className="h-5 w-5 text-blue-600" />
          Arrival Details
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(arrival.arrival_time), 'PP p')}
        </span>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Arrival Mode
          </label>
          <div className="font-medium text-slate-900 capitalize flex items-center gap-2">
            {arrival.arrival_mode.replace(/_/g, ' ')}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Referral Source
          </label>
          <div className="font-medium text-slate-900 capitalize">
            {arrival.referral_source.replace(/_/g, ' ')}
            {arrival.referral_source_detail && (
              <span className="text-slate-500 font-normal ml-1">
                ({arrival.referral_source_detail})
              </span>
            )}
          </div>
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Chief Complaint
          </label>
          <div className="font-medium text-slate-900">
            {arrival.chief_complaint}
          </div>
        </div>

        <div className="col-span-full h-px bg-slate-100 my-2" />

        {arrival.brought_by_name && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Brought By
              </label>
              <div className="font-medium text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {arrival.brought_by_name}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Relation
              </label>
              <div className="font-medium text-slate-900">
                {arrival.brought_by_relationship || 'Not specified'}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Contact
              </label>
              <div className="font-medium text-slate-900">
                {arrival.brought_by_phone || 'Not provided'}
              </div>
            </div>
          </>
        )}

        {arrival.incident_type && (
          <>
            <div className="col-span-full h-px bg-slate-100 my-2" />
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Incident Type
              </label>
              <div className="font-medium text-slate-900 capitalize">
                {arrival.incident_type.replace(/_/g, ' ')}
              </div>
            </div>
            {arrival.incident_time && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Incident Time
                </label>
                <div className="font-medium text-slate-900">
                  {format(new Date(arrival.incident_time), 'PP p')}
                </div>
              </div>
            )}
            {arrival.incident_location && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Location
                </label>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {arrival.incident_location}
                </div>
              </div>
            )}
          </>
        )}

        {arrival.medico_legal_flag && (
          <div className="col-span-full mt-2 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <Shield className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Medico-Legal Case
              </h4>
              {arrival.medico_legal_notes && (
                <p className="text-sm text-red-800 mt-1">
                  {arrival.medico_legal_notes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
