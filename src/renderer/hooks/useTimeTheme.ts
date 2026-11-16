// =============================================================================
// Time-Based Theme Hook
// Automatically changes colors based on time of day for eye comfort
// Supports manual override to force day mode
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getSyncMetaValue,
  setSyncMetaValue,
} from '../lib/offline/storage/persistence';

// Storage key for manual override
const THEME_OVERRIDE_KEY = 'emr_theme_override';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type ThemeMode = 'auto' | 'navy' | 'crystal';

export interface TimeThemeColors {
  // Header/Banner colors
  header: {
    gradient: string;
    decorativeCircle: string;
  };
  // Sidebar colors
  sidebar: {
    gradient: string;
  };
  // Card colors
  card: {
    background: string;
    border: string;
    hover: string;
  };
  // Accent colors
  accent: {
    text: string;
    muted: string;
    border: string;
    bg: string;
  };
  // Button colors
  button: {
    primary: string;
    primaryHover: string;
  };
  // Icon colors
  icon: {
    bg: string;
    color: string;
  };
}

export interface TimeTheme {
  timeOfDay: TimeOfDay;
  greeting: string;
  isNightMode: boolean;
  colors: TimeThemeColors;
  // Manual override controls
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// Theme configurations for different times of day
const themes: Record<TimeOfDay, TimeThemeColors> = {
  morning: {
    // Teal/Cyan theme for morning (6am-12pm)
    header: {
      gradient: 'from-teal-600 via-cyan-500 to-teal-500',
      decorativeCircle: 'bg-cyan-300/30',
    },
    sidebar: {
      gradient: 'from-teal-700 via-teal-600 to-cyan-700',
    },
    card: {
      background: 'bg-teal-50',
      border: 'border-teal-100',
      hover: 'bg-teal-100',
    },
    accent: {
      text: 'text-teal-600',
      muted: 'text-teal-100',
      border: 'border-teal-500',
      bg: 'bg-teal-500',
    },
    button: {
      primary: 'bg-teal-600',
      primaryHover: 'hover:bg-teal-700',
    },
    icon: {
      bg: 'bg-teal-100',
      color: 'text-teal-600',
    },
  },
  afternoon: {
    // Teal/Cyan theme for afternoon (12pm-6pm)
    header: {
      gradient: 'from-teal-600 via-cyan-500 to-teal-500',
      decorativeCircle: 'bg-cyan-300/30',
    },
    sidebar: {
      gradient: 'from-teal-700 via-teal-600 to-cyan-700',
    },
    card: {
      background: 'bg-teal-50',
      border: 'border-teal-100',
      hover: 'bg-teal-100',
    },
    accent: {
      text: 'text-teal-600',
      muted: 'text-teal-100',
      border: 'border-teal-500',
      bg: 'bg-teal-500',
    },
    button: {
      primary: 'bg-teal-600',
      primaryHover: 'hover:bg-teal-700',
    },
    icon: {
      bg: 'bg-teal-100',
      color: 'text-teal-600',
    },
  },
  evening: {
    // Teal/Cyan theme for evening (6pm-9pm)
    header: {
      gradient: 'from-teal-600 via-cyan-500 to-teal-500',
      decorativeCircle: 'bg-cyan-300/30',
    },
    sidebar: {
      gradient: 'from-teal-700 via-teal-600 to-cyan-700',
    },
    card: {
      background: 'bg-teal-50',
      border: 'border-teal-100',
      hover: 'bg-teal-100',
    },
    accent: {
      text: 'text-teal-600',
      muted: 'text-teal-100',
      border: 'border-teal-500',
      bg: 'bg-teal-500',
    },
    button: {
      primary: 'bg-teal-600',
      primaryHover: 'hover:bg-teal-700',
    },
    icon: {
      bg: 'bg-teal-100',
      color: 'text-teal-600',
    },
  },
  night: {
    // Dark, eye-friendly colors for night (9pm-6am)
    header: {
      gradient: 'from-slate-800 via-slate-700 to-slate-800',
      decorativeCircle: 'bg-slate-600/30',
    },
    sidebar: {
      gradient: 'from-slate-900 via-slate-800 to-slate-900',
    },
    card: {
      background: 'bg-slate-800',
      border: 'border-slate-700',
      hover: 'bg-slate-700',
    },
    accent: {
      text: 'text-slate-300',
      muted: 'text-slate-400',
      border: 'border-slate-600',
      bg: 'bg-slate-700',
    },
    button: {
      primary: 'bg-slate-600',
      primaryHover: 'hover:bg-slate-500',
    },
    icon: {
      bg: 'bg-slate-700',
      color: 'text-slate-300',
    },
  },
};

// Navy blue theme - dark professional look
const navyTheme: TimeThemeColors = {
  header: {
    gradient: 'from-[#0a1628] via-[#0f2744] to-[#1e3a5f]',
    decorativeCircle: 'bg-blue-300/20',
  },
  sidebar: {
    gradient: 'from-[#0a1628] via-[#0f2744] to-[#0a1628]',
  },
  card: {
    background: 'bg-white',
    border: 'border-gray-200',
    hover: 'bg-gray-50',
  },
  accent: {
    text: 'text-[#0a1628]',
    muted: 'text-blue-100',
    border: 'border-[#1e3a5f]',
    bg: 'bg-[#0a1628]',
  },
  button: {
    primary: 'bg-[#0a1628]',
    primaryHover: 'hover:bg-[#1e3a5f]',
  },
  icon: {
    bg: 'bg-blue-100',
    color: 'text-[#0a1628]',
  },
};

// Crystal theme - soft, eye-friendly cream/warm white with elegant emerald accents
const crystalTheme: TimeThemeColors = {
  header: {
    gradient: 'from-emerald-600 via-teal-500 to-cyan-500',
    decorativeCircle: 'bg-emerald-300/30',
  },
  sidebar: {
    gradient: 'from-[#fafaf9] via-[#f5f5f4] to-[#fafaf9]',
  },
  card: {
    background: 'bg-white',
    border: 'border-stone-200',
    hover: 'bg-stone-50',
  },
  accent: {
    text: 'text-emerald-600',
    muted: 'text-emerald-100',
    border: 'border-emerald-300',
    bg: 'bg-emerald-500',
  },
  button: {
    primary: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
  },
  icon: {
    bg: 'bg-emerald-100',
    color: 'text-emerald-600',
  },
};

// Get greeting based on time of day
const getGreeting = (timeOfDay: TimeOfDay): string => {
  switch (timeOfDay) {
    case 'morning':
      return 'Good Morning';
    case 'afternoon':
      return 'Good Afternoon';
    case 'evening':
      return 'Good Evening';
    case 'night':
      return 'Good Night';
    default:
      return 'Welcome';
  }
};

// Determine time of day from current hour
const getTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night'; // 9pm to 6am
};

export function useTimeTheme(): TimeTheme {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  // Hydrate theme override from IndexedDB.
  useEffect(() => {
    let mounted = true;

    const hydrateThemeMode = async (): Promise<void> => {
      try {
        const stored = await getSyncMetaValue<ThemeMode>(THEME_OVERRIDE_KEY);

        if (!mounted) return;
        if (stored === 'auto' || stored === 'navy' || stored === 'crystal') {
          setThemeModeState(stored);
        }
      } catch {
        // Keep default auto mode when persistence is unavailable.
      }
    };

    void hydrateThemeMode();

    return () => {
      mounted = false;
    };
  }, []);

  // Update hour every minute to catch time changes
  useEffect(() => {
    const updateHour = () => {
      setCurrentHour(new Date().getHours());
    };

    // Update immediately
    updateHour();

    // Check every minute
    const interval = setInterval(updateHour, 60000);

    return () => clearInterval(interval);
  }, []);

  // Persist theme mode to IndexedDB
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    void setSyncMetaValue(THEME_OVERRIDE_KEY, mode);
  }, []);

  // Toggle between auto -> navy -> crystal -> auto
  const toggleTheme = useCallback(() => {
    if (themeMode === 'auto') {
      setThemeMode('navy');
    } else if (themeMode === 'navy') {
      setThemeMode('crystal');
    } else {
      setThemeMode('auto');
    }
  }, [themeMode, setThemeMode]);

  const theme = useMemo(() => {
    const actualTimeOfDay = getTimeOfDay(currentHour);

    // Select theme based on mode
    let themeColors: TimeThemeColors;
    if (themeMode === 'navy') {
      themeColors = navyTheme;
    } else if (themeMode === 'crystal') {
      themeColors = crystalTheme;
    } else {
      themeColors = themes[actualTimeOfDay];
    }
    const effectiveTimeOfDay = actualTimeOfDay;

    // Night mode is only true if in auto mode AND it's actually night time
    const isNightMode = themeMode === 'auto' && actualTimeOfDay === 'night';

    return {
      timeOfDay: effectiveTimeOfDay,
      greeting: getGreeting(actualTimeOfDay), // Always show actual time greeting
      isNightMode,
      colors: themeColors,
      themeMode,
      setThemeMode,
      toggleTheme,
    };
  }, [currentHour, themeMode, setThemeMode, toggleTheme]);

  return theme;
}

// Export a function to get theme colors for non-hook contexts
// Note: This returns static values without manual override capability
export function getTimeThemeColors(): Omit<
  TimeTheme,
  'setThemeMode' | 'toggleTheme'
> & { setThemeMode: (mode: ThemeMode) => void; toggleTheme: () => void } {
  const hour = new Date().getHours();
  const storedMode: ThemeMode = 'auto';
  const actualTimeOfDay = getTimeOfDay(hour);

  // Select theme based on stored mode
  let themeColors: TimeThemeColors;
  if (storedMode === 'navy') {
    themeColors = navyTheme;
  } else if (storedMode === 'crystal') {
    themeColors = crystalTheme;
  } else {
    themeColors = themes[actualTimeOfDay];
  }

  return {
    timeOfDay: actualTimeOfDay,
    greeting: getGreeting(actualTimeOfDay),
    isNightMode: storedMode === 'auto' && actualTimeOfDay === 'night',
    colors: themeColors,
    themeMode: storedMode,
    setThemeMode: () => {}, // No-op for non-hook context
    toggleTheme: () => {}, // No-op for non-hook context
  };
}

export default useTimeTheme;
