import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getSyncMetaValue,
  setSyncMetaValue,
} from '../lib/offline/storage/persistence';

interface GuidancePreferences {
  enabled: boolean; // Global master switch
  modules: Record<string, boolean>; // Per-module switches
}

interface GuidanceContextType {
  isGuidanceEnabled: boolean;
  modulePreferences: Record<string, boolean>;
  toggleGlobalGuidance: () => void;
  toggleModuleGuidance: (module: string) => void;
  isModuleGuidanceEnabled: (module: string) => boolean;
}

const GuidanceContext = createContext<GuidanceContextType | undefined>(
  undefined,
);

const STORAGE_KEY = 'emr_guidance_preferences';
const DEFAULT_PREFERENCES: GuidancePreferences = { enabled: true, modules: {} };

export const GuidanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preferences, setPreferences] =
    useState<GuidancePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async (): Promise<void> => {
      try {
        const stored = await getSyncMetaValue<GuidancePreferences>(STORAGE_KEY);

        if (!mounted || !stored) return;
        setPreferences({
          enabled: typeof stored.enabled === 'boolean' ? stored.enabled : true,
          modules:
            stored.modules && typeof stored.modules === 'object'
              ? stored.modules
              : {},
        });
      } catch {
        // Keep default preferences on storage failure.
      }
    };

    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void setSyncMetaValue(STORAGE_KEY, preferences);
  }, [preferences]);

  const toggleGlobalGuidance = () => {
    setPreferences((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const toggleModuleGuidance = (module: string) => {
    setPreferences((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]:
          prev.modules[module] === undefined ? false : !prev.modules[module],
      },
    }));
  };

  const isModuleGuidanceEnabled = (module: string) => {
    if (!preferences.enabled) return false;
    // Default to true if not explicitly set to false
    return preferences.modules[module] !== false;
  };

  return (
    <GuidanceContext.Provider
      value={{
        isGuidanceEnabled: preferences.enabled,
        modulePreferences: preferences.modules,
        toggleGlobalGuidance,
        toggleModuleGuidance,
        isModuleGuidanceEnabled,
      }}
    >
      {children}
    </GuidanceContext.Provider>
  );
};

export const useGuidance = () => {
  const context = useContext(GuidanceContext);
  if (context === undefined) {
    throw new Error('useGuidance must be used within a GuidanceProvider');
  }
  return context;
};
