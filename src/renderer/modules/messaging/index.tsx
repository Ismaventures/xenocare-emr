// =============================================================================
// Messaging Module - Main Export
// =============================================================================

export { MessagingModule } from './components/MessagingModule';
export { MessageList } from './components/MessageList';
export { MessageView } from './components/MessageView';
export { ComposeMessage } from './components/ComposeMessage';
export { NotificationSettings } from './components/NotificationSettings';

// Hooks
export {
  useInboxMessages,
  useSentMessages,
  useArchivedMessages,
  useMessage,
  useThreadMessages,
  useUnreadCount,
  useSendMessage,
  useReplyToMessage,
  useMarkAsRead,
  useMarkAllAsRead,
  useArchiveMessage,
  useDeleteMessage,
  useStaffRecipients,
  useDepartmentRecipients,
  useRoleRecipients,
  useMessageSubscription,
} from './hooks/useMessaging';

// Default export
export { MessagingModule as default } from './components/MessagingModule';
