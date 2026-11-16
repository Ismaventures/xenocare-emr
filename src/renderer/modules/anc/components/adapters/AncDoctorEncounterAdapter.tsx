import React, { useEffect, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '../../../../api/supabaseClient';
import AncDoctorReviewForm from '../AncDoctorReviewForm';
import AncPregnancyTimeline from '../AncPregnancyTimeline';
import AncRiskAlertsBanner from '../AncRiskAlertsBanner';
import { AncVisit } from '../../api/anc.types';

interface Props {
  encounterId: string;
}

export const AncDoctorEncounterAdapter: React.FC<Props> = ({ encounterId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ancVisit, setAncVisit] = useState<AncVisit | null>(null);
  const [episodeData, setEpisodeData] = useState<{
    id: string;
    patient_id: string;
    risk_level: string;
  } | null>(null);

  const [needsInit, setNeedsInit] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const fetchAncData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsInit(false);

      const { data: visitData, error: visitError } = await supabase
        .from('anc_visits')
        .select('*')
        .eq('encounter_id', encounterId)
        .single();

      if (visitError) {
        if (visitError.code === 'PGRST116') {
          setNeedsInit(true);
        } else {
          throw visitError;
        }
      } else if (visitData) {
        setAncVisit(visitData);

        const { data: pregData, error: pregError } = await supabase
          .from('pregnancy_episodes')
          .select('id, patient_id, risk_level')
          .eq('id', visitData.pregnancy_episode_id)
          .single();

        if (pregError) throw pregError;
        if (pregData) setEpisodeData(pregData);
      }
    } catch (err: any) {
      console.error('Error fetching ANC Doctor details:', err);
      setError(err.message || 'Failed to load ANC details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (encounterId) {
      fetchAncData();
    }
  }, [encounterId]);

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      setError(null);

      const { data: enc } = await supabase
        .from('visits')
        .select('patient_id, encounter_date, start_time')
        .eq('id', encounterId)
        .single();
      if (!enc?.patient_id)
        throw new Error('Could not determine patient ID for this encounter.');

      const { data: episodes } = await supabase
        .from('pregnancy_episodes')
        .select('id, lmp, patient_id, risk_level')
        .eq('patient_id', enc.patient_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!episodes || episodes.length === 0) {
        throw new Error(
          'Patient has no active pregnancy episode. Please register them in Antenatal module first.',
        );
      }
      const episode = episodes[0];

      const { count } = await supabase
        .from('anc_visits')
        .select('*', { count: 'exact', head: true })
        .eq('pregnancy_episode_id', episode.id);
      const visitNo = (count || 0) + 1;

      const { data: newAncVisit, error: createError } = await supabase
        .from('anc_visits')
        .insert({
          pregnancy_episode_id: episode.id,
          encounter_id: encounterId,
          visit_number: visitNo,
          visit_date:
            enc.encounter_date ||
            enc.start_time?.split('T')[0] ||
            new Date().toISOString().split('T')[0],
          visit_status: 'in_progress',
          visit_type: 'routine_followup',
        })
        .select('*')
        .single();

      if (createError) throw createError;

      setAncVisit(newAncVisit);
      setEpisodeData(episode);
      setNeedsInit(false);
    } catch (err: any) {
      console.error('Error initializing ANC visit:', err);
      setError(err.message || 'Failed to initialize ANC visit');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <span className="ml-3 text-slate-600 font-medium">
          Loading Antenatal Review...
        </span>
      </div>
    );
  }

  if (needsInit) {
    return (
      <div className="bg-teal-50 text-teal-800 p-6 rounded-lg shadow-sm border border-teal-100 flex flex-col items-center text-center space-y-4">
        <p className="font-semibold text-lg">
          Initialize Antenatal Review for this Visit
        </p>
        <p className="text-sm">
          This encounter has NOT yet been linked to an active Antenatal Care
          record. Click below to initialize the ANC doctor forms.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-sm"
        >
          {initializing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlusCircle className="w-4 h-4" />
          )}
          {initializing ? 'Initializing...' : 'Start Antenatal Review'}
        </button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p className="font-semibold">Unable to load Antenatal Data</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!ancVisit || !episodeData) return null;

  return (
    <div className="space-y-6">
      {/* 1. Risk Alerts */}
      <AncRiskAlertsBanner pregnancyEpisodeId={episodeData.id} />

      {/* 2. Pregnancy Timeline Context */}
      <AncPregnancyTimeline pregnancyEpisodeId={episodeData.id} />

      {/* 3. Doctor Consultation Review Form */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <AncDoctorReviewForm
          ancVisit={ancVisit}
          pregnancyEpisodeId={episodeData.id}
          patientId={episodeData.patient_id}
          encounterId={encounterId}
          currentRisk={episodeData.risk_level || 'low'}
        />
      </div>
    </div>
  );
};
