import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as messagingApi from '../api/messaging.api';
import type {
  CreateMessageInput,
  MessageFilters,
  MessageFolder,
} from '../../../types/messaging.types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  > & {
    backgroundScope?: string;
    maxRetries?: number;
  },
) => {
  const {
    backgroundScope = 'messaging:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// =============================================================================
// Query Keys
// =============================================================================

export const messagingKeys = {
  all: ['messaging'] as const,
  inbox: (staffId: string, filters?: Partial<MessageFilters>) =>
    [...messagingKeys.all, 'inbox', staffId, filters] as const,
  sent: (staffId: string) => [...messagingKeys.all, 'sent', staffId] as const,
  archived: (staffId: string) =>
    [...messagingKeys.all, 'archived', staffId] as const,
  thread: (threadId: string) =>
    [...messagingKeys.all, 'thread', threadId] as const,
  message: (messageId: string) =>
    [...messagingKeys.all, 'message', messageId] as const,
  unreadCount: (staffId: string) =>
    [...messagingKeys.all, 'unreadCount', staffId] as const,
  recipients: () => [...messagingKeys.all, 'recipients'] as const,
  departments: () => [...messagingKeys.all, 'departments'] as const,
  roles: () => [...messagingKeys.all, 'roles'] as const,
};

// =============================================================================
// Inbox Queries
// =============================================================================

/**
 * Get inbox messages for the current user
 */
export function useInboxMessages(filters?: Partial<MessageFilters>) {
  const { staff } = useAuth();
  const staffId = staff?.id;

  return useQuery({
    queryKey: messagingKeys.inbox(staffId || '', filters),
    queryFn: () => messagingApi.getInboxMessages(staffId!, filters),
    enabled: !!staffId,
  });
}

/**
 * Get sent messages for the current user
 */
export function useSentMessages() {
  const { staff } = useAuth();
  const staffId = staff?.id;

  return useQuery({
    queryKey: messagingKeys.sent(staffId || ''),
    queryFn: () => messagingApi.getSentMessages(staffId!),
    enabled: !!staffId,
  });
}

/**
 * Get archived messages for the current user
 */
export function useArchivedMessages() {
  const { staff } = useAuth();
  const staffId = staff?.id;

  return useQuery({
    queryKey: messagingKeys.archived(staffId || ''),
    queryFn: () => messagingApi.getArchivedMessages(staffId!),
    enabled: !!staffId,
  });
}

/**
 * Hook that returns messages based on folder selection
 */
export function useMessages(
  folder: MessageFolder,
  filters?: Partial<MessageFilters>,
) {
  const inbox = useInboxMessages(folder === 'inbox' ? filters : undefined);
  const sent = useSentMessages();
  const archived = useArchivedMessages();

  switch (folder) {
    case 'inbox':
      return inbox;
    case 'sent':
      return sent;
    case 'archived':
      return archived;
    case 'all':
    default:
      return inbox; // Default to inbox
  }
}

/**
 * Get a single message by ID
 */
export function useMessage(messageId: string) {
  return useQuery({
    queryKey: messagingKeys.message(messageId),
    queryFn: () => messagingApi.getMessageById(messageId),
    enabled: !!messageId,
  });
}

/**
 * Get messages in a thread
 */
export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: messagingKeys.thread(threadId),
    queryFn: () => messagingApi.getThreadMessages(threadId),
    enabled: !!threadId,
  });
}

/**
 * Get unread message count
 * Returns 0 when not authenticated or on error to prevent UI disruption
 */
export function useUnreadCount() {
  const { staff, isAuthenticated } = useAuth();
  const staffId = staff?.id;

  return useQuery({
    queryKey: messagingKeys.unreadCount(staffId || 'anonymous'),
    queryFn: async () => {
      if (!staffId) return 0;
      try {
        return await messagingApi.getUnreadCount(staffId);
      } catch {
        return 0;
      }
    },
    enabled: isAuthenticated && !!staffId,
    refetchInterval: staffId ? 30000 : false, // Only poll when authenticated
    placeholderData: 0, // Show 0 while loading
    staleTime: 10000, // Consider fresh for 10 seconds
  });
}

// =============================================================================
// Message Mutations
// =============================================================================

/**
 * Send a new message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (input: CreateMessageInput) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.sendMessage(
        staff.id,
        null, // department_id - not available in Staff type, handled by RPC
        input,
      );
    },
    onSuccess: () => {
      // Invalidate sent messages and inbox
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Reply to a message
 */
export function useReplyToMessage() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: ({
      parentMessageId,
      message,
    }: {
      parentMessageId: string;
      message: string;
    }) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.replyToMessage(
        staff.id,
        null, // department_id - not available in Staff type
        parentMessageId,
        message,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Mark message as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.markMessageAsRead(messageId, staff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Mark all messages as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.markAllMessagesAsRead(staff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Archive a message
 */
export function useArchiveMessage() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.archiveMessage(messageId, staff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Unarchive a message
 */
export function useUnarchiveMessage() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.unarchiveMessage(messageId, staff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!staff?.id) throw new Error('User not authenticated');
      return messagingApi.deleteMessage(messageId, staff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

// =============================================================================
// Recipient Selection Hooks
// =============================================================================

/**
 * Get staff members for recipient selection
 */
export function useStaffRecipients() {
  return useQuery({
    queryKey: messagingKeys.recipients(),
    queryFn: messagingApi.getStaffForRecipients,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get departments for recipient selection
 */
export function useDepartmentRecipients() {
  return useQuery({
    queryKey: messagingKeys.departments(),
    queryFn: messagingApi.getDepartmentsForRecipients,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get roles for recipient selection
 */
export function useRoleRecipients() {
  return useQuery({
    queryKey: messagingKeys.roles(),
    queryFn: messagingApi.getRolesForRecipients,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// =============================================================================
// Real-time Hook
// =============================================================================

/**
 * Subscribe to real-time message updates
 */
export function useMessageSubscription(
  onNewMessage?: (message: unknown) => void,
) {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const staffId = staff?.id;

  useEffect(() => {
    if (!staffId) return;

    messagingApi.subscribeToNewMessages(staffId, (message) => {
      // Invalidate queries to refresh the inbox
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });

      // Call the callback if provided
      if (onNewMessage) {
        onNewMessage(message);
      }
    });

    return () => {
      messagingApi.unsubscribeFromMessages(staffId);
    };
  }, [staffId, queryClient, onNewMessage]);
}
