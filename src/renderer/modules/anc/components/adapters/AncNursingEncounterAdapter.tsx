import React, { useEffect, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '../../../../api/supabaseClient';
import AncNursingForm from '../AncNursingForm';

interface Props {
  encounterId: string;
  patientId?: string;
}

export const AncNursingEncounterAdapter: React.FC<Props> = ({
  encounterId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ancVisitId, setAncVisitId] = useState<string | null>(null);
  const [pregnancyEpisodeId, setPregnancyEpisodeId] = useState<string | null>(
    null,
  );

  const [needsInit, setNeedsInit] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const fetchAncVisitData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsInit(false);

      const { data: ancVisit, error: visitError } = await supabase
        .from('anc_visits')
        .select('id, pregnancy_episode_id')
        .eq('encounter_id', encounterId)
        .single();

      if (visitError) {
        if (visitError.code === 'PGRST116') {
          setNeedsInit(true);
        } else {
          throw visitError;
        }
      } else if (ancVisit) {
        setAncVisitId(ancVisit.id);
        setPregnancyEpisodeId(ancVisit.pregnancy_episode_id);
      }
    } catch (err: any) {
      console.error('Error fetching ANC visit:', err);
      setError(err.message || 'Failed to load ANC visit details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (encounterId) {
      fetchAncVisitData();
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
        .select('id, lmp')
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
        .select('id, pregnancy_episode_id')
        .single();

      if (createError) throw createError;

      setAncVisitId(newAncVisit.id);
      setPregnancyEpisodeId(newAncVisit.pregnancy_episode_id);
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
      <div className="flex justify-center flex-col items-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <span className="text-slate-600 font-medium">
          Loading Antenatal Care Records...
        </span>
      </div>
    );
  }

  if (needsInit) {
    return (
      <div className="bg-teal-50 text-teal-800 p-6 rounded-lg shadow-sm border border-teal-100 m-4 flex flex-col items-center text-center space-y-4">
        <p className="font-semibold text-lg">
          Initialize Antenatal Care for this Visit
        </p>
        <p className="text-sm">
          This encounter has NOT yet been linked to an active Antenatal Care
          record. Click below to initialize the ANC forms for this visit.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
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
      <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-sm border border-red-100 m-4">
        <p className="font-semibold text-lg mb-1">
          Unable to load Antenatal Care Form
        </p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!ancVisitId || !pregnancyEpisodeId) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <AncNursingForm
        ancVisitId={ancVisitId}
        pregnancyEpisodeId={pregnancyEpisodeId}
      />
    </div>
  );
};
