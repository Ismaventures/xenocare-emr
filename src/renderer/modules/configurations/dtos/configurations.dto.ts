export interface ConfigCategoryDTO {
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SystemConfigurationDTO {
  config_id: string;
  key: string;
  value: string;
  description: string | null;
  category_id: string | null;
  is_system: boolean;
  data_type: 'string' | 'number' | 'boolean' | 'json' | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  category?: ConfigCategoryDTO;
}

export interface UpdateSystemConfigurationDTO {
  config_id: string;
  value: string;
}
