import React, { useState } from 'react';
import {
  Mail,
  Send,
  Archive,
  Inbox,
  Plus,
  Search,
  CheckCheck,
  Bell,
  Settings,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  useInboxMessages,
  useSentMessages,
  useArchivedMessages,
  useUnreadCount,
  useMarkAllAsRead,
  useMarkAsRead,
  useMessageSubscription,
} from '../hooks/useMessaging';
import { MessageList } from './MessageList';
import { MessageView } from './MessageView';
import { ComposeMessage } from './ComposeMessage';
import { NotificationSettings } from './NotificationSettings';
import type {
  MessageFolder,
  StaffMessageInbox,
} from '../../../types/messaging.types';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// View types for the messaging module
type MessagingView = 'messages' | 'notifications';

// =============================================================================
// Main Messaging Module
// =============================================================================

export function MessagingModule() {
  const [activeView, setActiveView] = useState<MessagingView>('messages');
  const [activeFolder, setActiveFolder] = useState<MessageFolder>('inbox');
  const [selectedMessage, setSelectedMessage] =
    useState<StaffMessageInbox | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] =
    useState<StaffMessageInbox | null>(null);

  const { showToast } = useToast();
  const { staff } = useAuth();
  const isAdmin = staff?.role === 'admin' || staff?.role === 'super_admin';

  // Queries
  const { data: inboxMessages = [], isLoading: inboxLoading } =
    useInboxMessages({
      searchQuery: searchQuery || undefined,
    });
  const { data: sentMessages = [], isLoading: sentLoading } = useSentMessages();
  const { data: archivedMessages = [], isLoading: archivedLoading } =
    useArchivedMessages();
  const { data: unreadCount = 0 } = useUnreadCount();

  // Mutations
  const markAllAsRead = useMarkAllAsRead();
  const markAsRead = useMarkAsRead();

  // Real-time subscription
  useMessageSubscription(() => {
    showToast({
      type: 'info',
      title: 'New Message',
      message: 'You have received a new message',
    });
  });

  // Get messages based on active folder
  const getActiveMessages = () => {
    switch (activeFolder) {
      case 'inbox':
        return inboxMessages;
      case 'sent':
        return sentMessages;
      case 'archived':
        return archivedMessages;
      default:
        return inboxMessages;
    }
  };

  const isLoading =
    activeFolder === 'inbox'
      ? inboxLoading
      : activeFolder === 'sent'
        ? sentLoading
        : archivedLoading;

  const messages = getActiveMessages();

  // Handle message selection - mark as read when selecting
  const handleSelectMessage = (message: StaffMessageInbox) => {
    setSelectedMessage(message);
    // Mark as read when selecting (only if unread)
    if (!message.is_read) {
      markAsRead.mutate(message.id);
    }
  };

  // Handle reply
  const handleReply = (message: StaffMessageInbox) => {
    setReplyToMessage(message);
    setIsComposeOpen(true);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: (count: number) => {
        showToast({
          type: 'success',
          title: 'Messages Marked as Read',
          message: `${count} messages marked as read`,
        });
      },
    });
  };

  // Folder navigation items
  const folders = [
    {
      id: 'inbox' as MessageFolder,
      label: 'Inbox',
      icon: Inbox,
      count: unreadCount,
    },
    {
      id: 'sent' as MessageFolder,
      label: 'Sent',
      icon: Send,
      count: 0,
    },
    {
      id: 'archived' as MessageFolder,
      label: 'Archived',
      icon: Archive,
      count: 0,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* View Tabs */}
        <div className="p-2 border-b border-gray-200">
          <div className="flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => setActiveView('messages')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === 'messages'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mail size={16} />
              Messages
            </button>
            <button
              onClick={() => setActiveView('notifications')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === 'notifications'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>

        {activeView === 'messages' && (
          <>
            {/* Compose Button */}
            <div className="p-4">
              <Button
                variant="primary"
                icon={Plus}
                fullWidth
                onClick={() => {
                  setReplyToMessage(null);
                  setIsComposeOpen(true);
                }}
              >
                Compose
              </Button>
            </div>

            {/* Folder List */}
            <nav className="flex-1 px-3 space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedMessage(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFolder === folder.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <folder.icon size={18} />
                    <span>{folder.label}</span>
                  </div>
                  {folder.count > 0 && (
                    <span className="bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {folder.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Mark All as Read */}
            {activeFolder === 'inbox' && unreadCount > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  <CheckCheck size={16} />
                  Mark all as read
                </button>
              </div>
            )}
          </>
        )}

        {activeView === 'notifications' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <Bell size={40} className="text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 font-medium">
              Notification Settings
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Configure sounds and preferences for all notifications
            </p>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeView === 'messages' ? (
        <>
          {/* Message List */}
          <div className="w-96 border-r border-gray-200 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto">
              <MessageList
                messages={messages as StaffMessageInbox[]}
                selectedId={selectedMessage?.id}
                onSelect={handleSelectMessage}
                isLoading={isLoading}
                folder={activeFolder}
              />
            </div>
          </div>

          {/* Message View */}
          <div className="flex-1 flex flex-col">
            {selectedMessage ? (
              <MessageView
                message={selectedMessage}
                onReply={handleReply}
                onClose={() => setSelectedMessage(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Mail size={64} strokeWidth={1} />
                <p className="mt-4 text-lg">Select a message to read</p>
                <p className="text-sm">or compose a new message</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Notification Settings View */
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="text-primary-600" />
                Notification Settings
              </h2>
              <p className="text-gray-600 mt-1">
                Customize how you receive notifications for each module and
                service
              </p>
            </div>
            <NotificationSettings isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* Compose Modal */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyToMessage(null);
        }}
        title={
          replyToMessage ? `Reply: ${replyToMessage.subject}` : 'New Message'
        }
        size="lg"
      >
        <ComposeMessage
          replyTo={replyToMessage}
          onSuccess={() => {
            setIsComposeOpen(false);
            setReplyToMessage(null);
            showToast({
              type: 'success',
              title: 'Message Sent',
              message: 'Your message has been sent successfully',
            });
          }}
          onCancel={() => {
            setIsComposeOpen(false);
            setReplyToMessage(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default MessagingModule;
