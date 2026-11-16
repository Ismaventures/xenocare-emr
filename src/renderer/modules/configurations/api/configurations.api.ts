import { supabase } from '../../../api/supabaseClient';
import {
  ConfigCategoryDTO,
  SystemConfigurationDTO,
  UpdateSystemConfigurationDTO,
} from '../dtos/configurations.dto';

export interface ConfigurationFilters {
  query?: string;
  category_id?: string;
  activeOnly?: boolean;
}

export const configurationsApi = {
  async getCategories(): Promise<ConfigCategoryDTO[]> {
    const { data, error } = await supabase
      .from('config_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as ConfigCategoryDTO[];
  },

  async getConfigurationsByPrefix(
    prefix: string,
  ): Promise<SystemConfigurationDTO[]> {
    const { data, error } = await supabase
      .from('system_configurations')
      .select(`*, category:config_categories(*)`)
      .like('key', `${prefix}%`)
      .eq('is_active', true)
      .order('key');

    if (error) throw error;
    return (data || []) as SystemConfigurationDTO[];
  },

  async getConfigurations(
    filters: ConfigurationFilters = {},
  ): Promise<SystemConfigurationDTO[]> {
    let query = supabase
      .from('system_configurations')
      .select(`*, category:config_categories(*)`)
      .order('key');

    if (filters.query) {
      query = query.or(
        `key.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
      );
    }
    if (filters.category_id)
      query = query.eq('category_id', filters.category_id);
    if (filters.activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as SystemConfigurationDTO[];
  },

  async updateConfiguration(
    payload: UpdateSystemConfigurationDTO,
  ): Promise<SystemConfigurationDTO> {
    const { data, error } = await supabase
      .from('system_configurations')
      .update({
        value: payload.value,
        updated_at: new Date().toISOString(),
      })
      .eq('config_id', payload.config_id)
      .select()
      .single();

    if (error) throw error;
    return data as SystemConfigurationDTO;
  },
};
