import { supabase } from '../../../api/supabaseClient';
import { Clinic } from '../../../types/database.types';

export const getClinics = async () => {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('is_active', true)
    .order('clinic_name', { ascending: true });

  if (error) throw error;
  return data as Clinic[];
};
