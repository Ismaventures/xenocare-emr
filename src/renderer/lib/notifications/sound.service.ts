// =============================================================================
// Notification Sound Service
// =============================================================================
// Provides programmatic sound generation and playback for notifications
// Supports both Web Audio API oscillator sounds and audio file playback
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('SoundService');

// =============================================================================
// Types
// =============================================================================

export interface SoundConfig {
  frequencies?: number[];
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  file_url?: string;
  duration_ms?: number;
}

export interface NotificationSound {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  is_active: boolean;
  is_system: boolean;
  is_programmatic: boolean;
  sound_config: SoundConfig;
  file_url?: string;
}

export interface GlobalNotificationSetting {
  id: string;
  notification_type: string;
  display_name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
  default_sound: string;
  default_priority: string;
  is_locked: boolean;
  custom_sound_url?: string;
  target_roles?: string[];
  icon?: string;
  color?: string;
}

export interface UserNotificationSetting {
  id: string;
  user_id: string;
  notification_type: string;
  is_enabled: boolean;
  sound: string;
  volume: number;
  show_popup: boolean;
  show_in_center: boolean;
  desktop_notification: boolean;
}

export interface UserMasterNotificationSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  master_volume: number;
  desktop_notifications_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_allow_urgent: boolean;
  group_notifications: boolean;
  group_interval_seconds: number;
  dnd_enabled: boolean;
  dnd_until?: string;
}

export interface EffectiveNotificationSettings {
  is_enabled: boolean;
  sound: string;
  volume: number;
  show_popup: boolean;
  show_in_center: boolean;
  desktop_notification: boolean;
  is_locked: boolean;
}

// =============================================================================
// Audio Context Management
// =============================================================================

let audioContext: AudioContext | null = null;
let audioContextInitialized = false;

/**
 * Initialize the AudioContext (must be called after user interaction)
 */
export function initializeAudioContext(): AudioContext | null {
  if (audioContext && audioContextInitialized) {
    return audioContext;
  }

  try {
    audioContext = new AudioContext();
    audioContextInitialized = true;

    // Resume if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    return audioContext;
  } catch (error) {
    log.error('Failed to create AudioContext:', error);
    return null;
  }
}

/**
 * Get or create AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (!audioContext || !audioContextInitialized) {
    return initializeAudioContext();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

// =============================================================================
// Sound Playback Functions
// =============================================================================

/**
 * Play a programmatic sound using Web Audio API oscillator
 */
export function playProgrammaticSound(
  config: SoundConfig,
  masterVolume = 80,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const {
    frequencies = [523, 659],
    duration = 0.1,
    type = 'sine',
    volume = 0.1,
  } = config;

  // Adjust volume by master volume
  const adjustedVolume = volume * (masterVolume / 100);

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = type;

  const now = ctx.currentTime;

  // Set frequencies in sequence
  frequencies.forEach((freq, i) => {
    oscillator.frequency.setValueAtTime(freq, now + i * duration);
  });

  // Volume envelope
  gainNode.gain.setValueAtTime(adjustedVolume, now);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    now + frequencies.length * duration,
  );

  oscillator.start(now);
  oscillator.stop(now + frequencies.length * duration);
}

/**
 * Play a sound from an audio file URL
 */
export async function playAudioFile(url: string, volume = 80): Promise<void> {
  try {
    const audio = new Audio(url);
    audio.volume = volume / 100;
    await audio.play();
  } catch (error) {
    log.error('Failed to play audio file:', error);
    // Fall back to programmatic sound
    playProgrammaticSound({ frequencies: [523, 659], duration: 0.1 }, volume);
  }
}

/**
 * Play a notification sound by name
 */
export async function playNotificationSound(
  soundName: string,
  volume = 80,
): Promise<void> {
  if (soundName === 'none') return;

  try {
    // Get sound config from database
    const { data: config } = await supabase.rpc(
      'get_notification_sound_config',
      {
        p_sound_name: soundName,
      },
    );

    if (config?.file_url) {
      await playAudioFile(config.file_url, volume);
    } else if (config?.frequencies) {
      playProgrammaticSound(config as SoundConfig, volume);
    } else {
      // Default sound
      playProgrammaticSound({ frequencies: [523, 659], duration: 0.1 }, volume);
    }
  } catch (error) {
    log.error('Error playing notification sound:', error);
    // Fallback to default
    playProgrammaticSound({ frequencies: [523, 659], duration: 0.1 }, volume);
  }
}

// =============================================================================
// Predefined Sound Presets (Client-side fallback)
// =============================================================================

export const SOUND_PRESETS: Record<string, SoundConfig> = {
  default: {
    frequencies: [523, 659],
    duration: 0.1,
    type: 'sine',
    volume: 0.1,
  },
  chime: {
    frequencies: [659, 784, 880],
    duration: 0.08,
    type: 'sine',
    volume: 0.08,
  },
  bell: {
    frequencies: [880, 1100],
    duration: 0.15,
    type: 'triangle',
    volume: 0.1,
  },
  ding: { frequencies: [1000], duration: 0.1, type: 'sine', volume: 0.08 },
  alert: {
    frequencies: [880, 660, 880],
    duration: 0.12,
    type: 'square',
    volume: 0.08,
  },
  urgent: {
    frequencies: [880, 660, 880, 660],
    duration: 0.15,
    type: 'sawtooth',
    volume: 0.12,
  },
  gentle: { frequencies: [440], duration: 0.2, type: 'sine', volume: 0.05 },
  message: {
    frequencies: [587, 784],
    duration: 0.1,
    type: 'sine',
    volume: 0.08,
  },
  success: {
    frequencies: [523, 659, 784],
    duration: 0.08,
    type: 'sine',
    volume: 0.08,
  },
  error: {
    frequencies: [200, 150],
    duration: 0.2,
    type: 'square',
    volume: 0.1,
  },
  none: { frequencies: [], duration: 0, volume: 0 },
};

/**
 * Play a preset sound by name (client-side only, no DB call)
 */
export function playPresetSound(name: string, volume = 80): void {
  const config = SOUND_PRESETS[name] || SOUND_PRESETS.default;
  if (name === 'none' || config.frequencies?.length === 0) return;
  playProgrammaticSound(config, volume);
}

/**
 * Preview a sound configuration
 */
export function previewSound(config: SoundConfig, volume = 80): void {
  if (config.file_url) {
    playAudioFile(config.file_url, volume);
  } else {
    playProgrammaticSound(config, volume);
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all available notification sounds
 */
export async function getNotificationSounds(): Promise<NotificationSound[]> {
  const { data, error } = await supabase
    .from('notification_sounds')
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  if (error) {
    log.error('Error fetching notification sounds:', error);
    return [];
  }

  return data || [];
}

/**
 * Get global notification settings (admin view)
 */
export async function getGlobalNotificationSettings(): Promise<
  GlobalNotificationSetting[]
> {
  const { data, error } = await supabase
    .from('global_notification_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    log.error('Error fetching global notification settings:', error);
    return [];
  }

  return data || [];
}

/**
 * Update global notification setting (admin only)
 */
export async function updateGlobalNotificationSetting(
  notificationType: string,
  updates: Partial<GlobalNotificationSetting>,
  updatedBy: string,
): Promise<GlobalNotificationSetting | null> {
  const { data, error } = await supabase
    .from('global_notification_settings')
    .update({ ...updates, updated_by: updatedBy })
    .eq('notification_type', notificationType)
    .select()
    .single();

  if (error) {
    log.error('Error updating global notification setting:', error);
    throw error;
  }

  return data;
}

/**
 * Get user notification settings
 */
export async function getUserNotificationSettings(
  userId: string,
): Promise<UserNotificationSetting[]> {
  const { data, error } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    log.error('Error fetching user notification settings:', error);
    return [];
  }

  return data || [];
}

/**
 * Update or create user notification setting
 */
export async function upsertUserNotificationSetting(
  userId: string,
  notificationType: string,
  settings: Partial<UserNotificationSetting>,
): Promise<UserNotificationSetting | null> {
  const { data, error } = await supabase
    .from('user_notification_settings')
    .upsert(
      {
        user_id: userId,
        notification_type: notificationType,
        ...settings,
      },
      { onConflict: 'user_id,notification_type' },
    )
    .select()
    .single();

  if (error) {
    log.error('Error upserting user notification setting:', error);
    throw error;
  }

  return data;
}

/**
 * Get user master notification settings
 */
export async function getUserMasterNotificationSettings(
  userId: string,
): Promise<UserMasterNotificationSettings | null> {
  const { data, error } = await supabase
    .from('user_notification_master_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    log.error('Error fetching user master notification settings:', error);
    return null;
  }

  return data;
}

/**
 * Update or create user master notification settings
 */
export async function upsertUserMasterNotificationSettings(
  userId: string,
  settings: Partial<UserMasterNotificationSettings>,
): Promise<UserMasterNotificationSettings | null> {
  const { data, error } = await supabase
    .from('user_notification_master_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    log.error('Error upserting user master notification settings:', error);
    throw error;
  }

  return data;
}

/**
 * Get effective notification settings for a user and type
 */
export async function getEffectiveNotificationSettings(
  userId: string,
  notificationType: string,
): Promise<EffectiveNotificationSettings | null> {
  const { data, error } = await supabase.rpc(
    'get_effective_notification_settings',
    {
      p_user_id: userId,
      p_notification_type: notificationType,
    },
  );

  if (error) {
    log.error('Error fetching effective notification settings:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Check if user is in quiet hours
 */
export async function isInQuietHours(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_in_quiet_hours', {
    p_user_id: userId,
  });

  if (error) {
    log.error('Error checking quiet hours:', error);
    return false;
  }

  return data || false;
}

// =============================================================================
// Notification Trigger (with sound)
// =============================================================================

/**
 * Trigger a notification with sound based on user settings
 */
export async function triggerNotificationWithSound(
  userId: string,
  notificationType: string,
  options?: {
    forceSound?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  },
): Promise<void> {
  try {
    // Check quiet hours (allow urgent notifications to bypass)
    if (options?.priority !== 'urgent' && options?.priority !== 'critical') {
      const inQuietHours = await isInQuietHours(userId);
      if (inQuietHours && !options?.forceSound) {
        return;
      }
    }

    // Get effective settings
    const settings = await getEffectiveNotificationSettings(
      userId,
      notificationType,
    );
    if (!settings) return;

    if (!settings.is_enabled) return;

    // Play sound if enabled
    if (settings.sound !== 'none') {
      await playNotificationSound(settings.sound, settings.volume);
    }

    // Show desktop notification if enabled
    if (settings.desktop_notification && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        // Desktop notification is handled elsewhere
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  } catch (error) {
    log.error('Error triggering notification:', error);
  }
}

// =============================================================================
// Initialize audio context on user interaction
// =============================================================================

export function setupAudioContextListener(): () => void {
  const handleInteraction = () => {
    initializeAudioContext();
  };

  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });

  return () => {
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
  };
}