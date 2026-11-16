// =============================================================================
// Notification Settings Component
// =============================================================================
// Provides UI for managing notification preferences per module/type
// Includes sound customization, volume control, and quiet hours
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Volume2,
  VolumeX,
  Settings,
  Play,
  Moon,
  Clock,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Stethoscope,
  Pill,
  Mail,
  CreditCard,
  Server,
  Activity,
  AlertTriangle,
  Shield,
  Users,
  Check,
  X,
  Repeat,
  Timer,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  getNotificationSounds,
  getGlobalNotificationSettings,
  getUserNotificationSettings,
  getUserMasterNotificationSettings,
  upsertUserNotificationSetting,
  upsertUserMasterNotificationSettings,
  updateGlobalNotificationSetting,
  playPresetSound,
  NotificationSound,
  GlobalNotificationSetting,
  UserNotificationSetting,
  UserMasterNotificationSettings,
} from '../../../lib/notifications/sound.service';

// =============================================================================
// Types
// =============================================================================

interface NotificationSettingsProps {
  isAdmin?: boolean;
}

interface CategoryGroup {
  name: string;
  icon: React.ElementType;
  types: GlobalNotificationSetting[];
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; description?: string }
> = {
  clinical: {
    icon: Stethoscope,
    label: 'Clinical',
    description: 'Lab results, vitals, critical values',
  },
  emar: {
    icon: Pill,
    label: 'eMAR / Medications',
    description: 'Medication due, overdue, administration',
  },
  care_team: {
    icon: Users,
    label: 'Care Team',
    description: 'Notes, orders, ward rounds, team actions',
  },
  nhis: {
    icon: Shield,
    label: 'NHIS',
    description: 'Claims, authorizations, requests',
  },
  module_requests: {
    icon: BellRing,
    label: 'Module Requests',
    description: 'Cross-module requests and completions',
  },
  workflow: {
    icon: Activity,
    label: 'Patient Flow',
    description: 'Queue, transfers, discharges',
  },
  billing: {
    icon: CreditCard,
    label: 'Billing',
    description: 'Payments, invoices',
  },
  messaging: {
    icon: Mail,
    label: 'Messaging',
    description: 'Direct messages, broadcasts',
  },
  system: {
    icon: Server,
    label: 'System',
    description: 'System alerts, maintenance',
  },
};

// =============================================================================
// Main Component
// =============================================================================

export function NotificationSettings({
  isAdmin = false,
}: NotificationSettingsProps) {
  const { staff } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const userId = staff?.id;

  // State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['clinical', 'messaging']),
  );
  const [editingType, setEditingType] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<string>('default');
  const [selectedVolume, setSelectedVolume] = useState<number>(80);

  // Queries
  const { data: sounds = [] } = useQuery({
    queryKey: ['notification-sounds'],
    queryFn: getNotificationSounds,
  });

  const { data: globalSettings = [] } = useQuery({
    queryKey: ['global-notification-settings'],
    queryFn: getGlobalNotificationSettings,
  });

  const { data: userSettings = [] } = useQuery({
    queryKey: ['user-notification-settings', userId],
    queryFn: () => (userId ? getUserNotificationSettings(userId) : []),
    enabled: !!userId,
  });

  const { data: masterSettings } = useQuery({
    queryKey: ['user-master-notification-settings', userId],
    queryFn: () => (userId ? getUserMasterNotificationSettings(userId) : null),
    enabled: !!userId,
  });

  // Mutations
  const updateUserSettingMutation = useMutation({
    mutationFn: ({
      notificationType,
      settings,
    }: {
      notificationType: string;
      settings: Partial<UserNotificationSetting>;
    }) => upsertUserNotificationSetting(userId!, notificationType, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-notification-settings'],
      });
      showToast({ type: 'success', message: 'Settings updated' });
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to update settings' });
    },
  });

  const updateMasterSettingsMutation = useMutation({
    mutationFn: (settings: Partial<UserMasterNotificationSettings>) =>
      upsertUserMasterNotificationSettings(userId!, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-master-notification-settings'],
      });
      showToast({ type: 'success', message: 'Master settings updated' });
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to update master settings' });
    },
  });

  const updateGlobalSettingMutation = useMutation({
    mutationFn: ({
      notificationType,
      updates,
    }: {
      notificationType: string;
      updates: Partial<GlobalNotificationSetting>;
    }) => updateGlobalNotificationSetting(notificationType, updates, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['global-notification-settings'],
      });
      showToast({ type: 'success', message: 'Global settings updated' });
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to update global settings' });
    },
  });

  // Group settings by category
  const categorizedSettings = React.useMemo(() => {
    const groups: CategoryGroup[] = [];
    const categoryMap = new Map<string, GlobalNotificationSetting[]>();

    globalSettings.forEach((setting) => {
      const existing = categoryMap.get(setting.category) || [];
      categoryMap.set(setting.category, [...existing, setting]);
    });

    categoryMap.forEach((types, category) => {
      const config = CATEGORY_CONFIG[category] || {
        icon: Bell,
        label: category,
      };
      groups.push({
        name: category,
        icon: config.icon,
        types,
      });
    });

    return groups;
  }, [globalSettings]);

  // Get user setting for a type
  const getUserSetting = useCallback(
    (notificationType: string): UserNotificationSetting | undefined => {
      return userSettings.find((s) => s.notification_type === notificationType);
    },
    [userSettings],
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle toggle notification
  const handleToggleNotification = (
    notificationType: string,
    enabled: boolean,
  ) => {
    updateUserSettingMutation.mutate({
      notificationType,
      settings: { is_enabled: enabled },
    });
  };

  // Handle sound change
  const handleSoundChange = (notificationType: string, sound: string) => {
    updateUserSettingMutation.mutate({
      notificationType,
      settings: { sound },
    });
  };

  // Handle volume change
  const handleVolumeChange = (notificationType: string, volume: number) => {
    updateUserSettingMutation.mutate({
      notificationType,
      settings: { volume },
    });
  };

  // Preview sound
  const handlePreviewSound = (soundName: string) => {
    playPresetSound(soundName, masterSettings?.master_volume || 80);
  };

  // Toggle master notifications
  const handleToggleMasterNotifications = (enabled: boolean) => {
    updateMasterSettingsMutation.mutate({ notifications_enabled: enabled });
  };

  // Toggle master sound
  const handleToggleMasterSound = (enabled: boolean) => {
    updateMasterSettingsMutation.mutate({ sound_enabled: enabled });
  };

  // Update master volume
  const handleMasterVolumeChange = (volume: number) => {
    updateMasterSettingsMutation.mutate({ master_volume: volume });
  };

  // Toggle quiet hours
  const handleToggleQuietHours = (enabled: boolean) => {
    updateMasterSettingsMutation.mutate({ quiet_hours_enabled: enabled });
  };

  // Update quiet hours times
  const handleQuietHoursChange = (start: string, end: string) => {
    updateMasterSettingsMutation.mutate({
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
  };

  // Admin: Toggle global setting
  const handleToggleGlobalSetting = (
    notificationType: string,
    enabled: boolean,
  ) => {
    updateGlobalSettingMutation.mutate({
      notificationType,
      updates: { is_enabled: enabled },
    });
  };

  // Admin: Toggle lock
  const handleToggleLock = (notificationType: string, locked: boolean) => {
    updateGlobalSettingMutation.mutate({
      notificationType,
      updates: { is_locked: locked },
    });
  };

  // Admin: Change default sound
  const handleChangeDefaultSound = (
    notificationType: string,
    sound: string,
  ) => {
    updateGlobalSettingMutation.mutate({
      notificationType,
      updates: { default_sound: sound },
    });
  };

  // Admin: Toggle global persistent
  const handleToggleGlobalPersistent = (
    notificationType: string,
    isPersistent: boolean,
  ) => {
    updateGlobalSettingMutation.mutate({
      notificationType,
      updates: { is_persistent_default: isPersistent } as any,
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={20} />
          Master Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {masterSettings?.notifications_enabled !== false ? (
                <Bell className="text-primary-600" size={24} />
              ) : (
                <BellOff className="text-gray-400" size={24} />
              )}
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-500">
                  Enable all notifications
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleToggleMasterNotifications(
                  masterSettings?.notifications_enabled === false,
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                masterSettings?.notifications_enabled !== false
                  ? 'bg-primary-600'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  masterSettings?.notifications_enabled !== false
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {masterSettings?.sound_enabled !== false ? (
                <Volume2 className="text-primary-600" size={24} />
              ) : (
                <VolumeX className="text-gray-400" size={24} />
              )}
              <div>
                <p className="font-medium text-gray-900">Sound</p>
                <p className="text-sm text-gray-500">
                  Play notification sounds
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleToggleMasterSound(masterSettings?.sound_enabled === false)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                masterSettings?.sound_enabled !== false
                  ? 'bg-primary-600'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  masterSettings?.sound_enabled !== false
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Master Volume */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="text-gray-600" size={20} />
              <p className="font-medium text-gray-900">Master Volume</p>
              <span className="ml-auto text-sm text-gray-500">
                {masterSettings?.master_volume || 80}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={masterSettings?.master_volume || 80}
              onChange={(e) =>
                handleMasterVolumeChange(parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Moon className="text-indigo-600" size={20} />
              <div>
                <p className="font-medium text-gray-900">Quiet Hours</p>
                <p className="text-sm text-gray-500">
                  Mute non-urgent notifications during specified hours
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleToggleQuietHours(!masterSettings?.quiet_hours_enabled)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                masterSettings?.quiet_hours_enabled
                  ? 'bg-indigo-600'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  masterSettings?.quiet_hours_enabled
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {masterSettings?.quiet_hours_enabled && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">From</span>
                <input
                  type="time"
                  value={masterSettings?.quiet_hours_start || '22:00'}
                  onChange={(e) =>
                    handleQuietHoursChange(
                      e.target.value,
                      masterSettings?.quiet_hours_end || '07:00',
                    )
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">To</span>
                <input
                  type="time"
                  value={masterSettings?.quiet_hours_end || '07:00'}
                  onChange={(e) =>
                    handleQuietHoursChange(
                      masterSettings?.quiet_hours_start || '22:00',
                      e.target.value,
                    )
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-Module Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={20} />
            Notification Types
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Customize notification settings for each module
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {categorizedSettings.map((group) => {
            const CategoryIcon = group.icon;
            const isExpanded = expandedCategories.has(group.name);
            const config = CATEGORY_CONFIG[group.name];

            return (
              <div key={group.name}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(group.name)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="text-gray-600" size={20} />
                    <div className="text-left">
                      <span className="font-medium text-gray-900">
                        {config?.label || group.name}
                      </span>
                      {config?.description && (
                        <p className="text-xs text-gray-500">
                          {config.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      ({group.types.length} types)
                    </span>
                    {/* Show persistent badge if any type in this category is persistent */}
                    {group.types.some((t: any) => t.is_persistent_default) && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                        Persistent
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="bg-gray-50 divide-y divide-gray-100">
                    {group.types.map((setting) => {
                      const userSetting = getUserSetting(
                        setting.notification_type,
                      );
                      const isEnabled =
                        userSetting?.is_enabled ?? setting.is_enabled;
                      const currentSound =
                        userSetting?.sound ?? setting.default_sound;
                      const currentVolume =
                        userSetting?.volume ??
                        masterSettings?.master_volume ??
                        80;

                      return (
                        <div
                          key={setting.notification_type}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                {setting.display_name}
                              </span>
                              {setting.is_locked && (
                                <Lock size={14} className="text-amber-500" />
                              )}
                              {(setting as any).is_persistent_default && (
                                <span
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded"
                                  title="This notification will persistently alert until acknowledged"
                                >
                                  <Repeat size={10} />
                                  Persistent
                                </span>
                              )}
                            </div>
                            {setting.description && (
                              <p className="text-sm text-gray-500 truncate">
                                {setting.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 ml-4">
                            {/* Sound Selector */}
                            <div className="flex items-center gap-2">
                              <select
                                value={currentSound}
                                onChange={(e) =>
                                  handleSoundChange(
                                    setting.notification_type,
                                    e.target.value,
                                  )
                                }
                                disabled={setting.is_locked && !isAdmin}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                              >
                                {sounds.map((sound) => (
                                  <option key={sound.name} value={sound.name}>
                                    {sound.display_name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handlePreviewSound(currentSound)}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                                title="Preview sound"
                              >
                                <Play size={16} />
                              </button>
                            </div>

                            {/* Volume Slider (compact) */}
                            <div className="flex items-center gap-2 w-24">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={currentVolume}
                                onChange={(e) =>
                                  handleVolumeChange(
                                    setting.notification_type,
                                    parseInt(e.target.value),
                                  )
                                }
                                disabled={setting.is_locked && !isAdmin}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:opacity-50"
                              />
                            </div>

                            {/* Enable/Disable Toggle */}
                            <button
                              onClick={() =>
                                handleToggleNotification(
                                  setting.notification_type,
                                  !isEnabled,
                                )
                              }
                              disabled={setting.is_locked && !isAdmin}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                isEnabled ? 'bg-primary-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-1'
                                }`}
                              />
                            </button>

                            {/* Admin Controls */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
                                {/* Lock Toggle */}
                                <button
                                  onClick={() =>
                                    handleToggleLock(
                                      setting.notification_type,
                                      !setting.is_locked,
                                    )
                                  }
                                  className={`p-1.5 rounded transition-colors ${
                                    setting.is_locked
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title={
                                    setting.is_locked
                                      ? 'Unlock (allow user changes)'
                                      : 'Lock (prevent user changes)'
                                  }
                                >
                                  {setting.is_locked ? (
                                    <Lock size={14} />
                                  ) : (
                                    <Unlock size={14} />
                                  )}
                                </button>

                                {/* Persistent Toggle (Admin only) */}
                                <button
                                  onClick={() =>
                                    handleToggleGlobalPersistent(
                                      setting.notification_type,
                                      !(setting as any).is_persistent_default,
                                    )
                                  }
                                  className={`p-1.5 rounded transition-colors ${
                                    (setting as any).is_persistent_default
                                      ? 'text-orange-600 hover:bg-orange-50'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title={
                                    (setting as any).is_persistent_default
                                      ? 'Disable persistent alerts for this type'
                                      : 'Make this type a persistent alert (repeats until acknowledged)'
                                  }
                                >
                                  <Repeat size={14} />
                                </button>

                                {/* Enable/Disable Global (Admin only) */}
                                <button
                                  onClick={() =>
                                    handleToggleGlobalSetting(
                                      setting.notification_type,
                                      !setting.is_enabled,
                                    )
                                  }
                                  className={`p-1.5 rounded transition-colors ${
                                    setting.is_enabled
                                      ? 'text-green-600 hover:bg-green-50'
                                      : 'text-red-500 hover:bg-red-50'
                                  }`}
                                  title={
                                    setting.is_enabled
                                      ? 'Deactivate globally'
                                      : 'Activate globally'
                                  }
                                >
                                  {setting.is_enabled ? (
                                    <Check size={14} />
                                  ) : (
                                    <X size={14} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Sounds Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Volume2 size={20} />
          Test Notification Sounds
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Click to preview each available sound
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sounds
            .filter((s) => s.name !== 'none')
            .map((sound) => (
              <button
                key={sound.name}
                onClick={() => handlePreviewSound(sound.name)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-lg transition-colors group"
              >
                <Play
                  size={16}
                  className="text-gray-400 group-hover:text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">
                  {sound.display_name}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
