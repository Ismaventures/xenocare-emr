/**
 * Configuration Provider - Simplified
 *
 * Just provides config context using environment variables directly.
 * No health checks, no server setup flow - uses .env values.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('Config');

interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface ConfigContextValue {
  config: ServerConfig | null;
  isConfigured: boolean;
  resetConfig: () => Promise<void>;
  showServerSetup: () => void;
  reportConnectionFailure: () => void;
  serverUrl: string | null;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  isConfigured: false,
  resetConfig: async () => {},
  showServerSetup: () => {},
  reportConnectionFailure: () => {},
  serverUrl: null,
});

export function useServerConfig() {
  return useContext(ConfigContext);
}

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  // Get config directly from environment variables
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  const config: ServerConfig = {
    supabaseUrl,
    supabaseAnonKey,
  };

  log.info('[ConfigProvider] Using env config:', supabaseUrl);

  // Render main app with configuration context
  return (
    <ConfigContext.Provider
      value={{
        config,
        isConfigured: true,
        resetConfig: async () => {},
        showServerSetup: () => {},
        reportConnectionFailure: () => {},
        serverUrl: supabaseUrl,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}