import React, {
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../api/supabaseClient';
import { messagingKeys } from '../hooks/useMessaging';
import {
  playPresetSound,
  getEffectiveNotificationSettings,
  getUserMasterNotificationSettings,
  isInQuietHours,
  initializeAudioContext,
} from '../../../lib/notifications/sound.service';

// =============================================================================
// Message Notification Context
// =============================================================================

interface MessageNotificationContextType {
  unreadCount: number;
}

const MessageNotificationContext =
  createContext<MessageNotificationContextType>({
    unreadCount: 0,
  });

export const useMessageNotifications = () =>
  useContext(MessageNotificationContext);

// =============================================================================
// Provider Component
// =============================================================================

interface MessageNotificationProviderProps {
  children: React.ReactNode;
}

export function MessageNotificationProvider({
  children,
}: MessageNotificationProviderProps) {
  const { staff, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const staffId = staff?.id;

  // Initialize audio context on mount
  useEffect(() => {
    const handleInteraction = () => {
      initializeAudioContext();
    };
    document.addEventListener('click', handleInteraction, { once: true });
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  // Play notification sound based on user settings
  const playMessageSound = useCallback(async () => {
    if (!staffId) return;

    try {
      // Check if in quiet hours
      const inQuietHours = await isInQuietHours(staffId);
      if (inQuietHours) return;

      // Get master settings
      const masterSettings = await getUserMasterNotificationSettings(staffId);
      if (
        masterSettings &&
        (!masterSettings.notifications_enabled || !masterSettings.sound_enabled)
      ) {
        return;
      }

      // Get effective settings for new_message type
      const settings = await getEffectiveNotificationSettings(
        staffId,
        'new_message',
      );
      if (!settings || !settings.is_enabled || settings.sound === 'none') {
        return;
      }

      // Play the sound
      playPresetSound(settings.sound, settings.volume);
    } catch (error) {
      // Fallback to default sound
      playPresetSound('message', 80);
    }
  }, [staffId]);

  // Handle new message notification
  const handleNewMessage = useCallback(
    async (payload: any) => {
      // Play notification sound
      await playMessageSound();

      // Fetch the message details to show in notification
      const messageId = payload.new?.message_id;

      if (messageId) {
        try {
          const { data: message } = await supabase
            .from('staff_messages_inbox_view')
            .select('*')
            .eq('id', messageId)
            .single();

          if (message) {
            // Show toast notification
            showToast({
              type: 'info',
              title: `New message from ${message.sender_name}`,
              message: message.subject,
              duration: 5000,
            });

            // Try to show browser notification if permitted
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification(`New message from ${message.sender_name}`, {
                body: message.subject,
                icon: '/icons/icon-192.png',
                tag: `message-${messageId}`,
              });
            }
          }
        } catch (error) {
          // Fallback to generic notification
          showToast({
            type: 'info',
            title: 'New Message',
            message: 'You have received a new message',
            duration: 5000,
          });
        }
      } else {
        // Fallback notification
        showToast({
          type: 'info',
          title: 'New Message',
          message: 'You have received a new message',
          duration: 5000,
        });
      }

      // Invalidate messaging queries to refresh data
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
    [showToast, queryClient, playMessageSound],
  );

  // Subscribe to new messages for this user
  useEffect(() => {
    if (!staffId || !isAuthenticated) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to message_recipients inserts for this staff member
    const channel = supabase
      .channel(`global-messages:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_recipients',
          filter: `recipient_id=eq.${staffId}`,
        },
        handleNewMessage,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId, isAuthenticated, handleNewMessage]);

  return (
    <MessageNotificationContext.Provider value={{ unreadCount: 0 }}>
      {children}
    </MessageNotificationContext.Provider>
  );
}
