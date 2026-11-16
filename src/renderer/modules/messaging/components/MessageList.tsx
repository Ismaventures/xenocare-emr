import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  Circle,
  User,
} from 'lucide-react';
import type {
  StaffMessageInbox,
  MessageFolder,
  MessagePriority,
} from '../../../types/messaging.types';

// =============================================================================
// Message List Item (defined first to avoid hoisting issues)
// =============================================================================

interface MessageListItemProps {
  message: StaffMessageInbox;
  isSelected: boolean;
  onClick: () => void;
  folder: MessageFolder;
}

function MessageListItem({
  message,
  isSelected,
  onClick,
  folder,
}: MessageListItemProps) {
  const getPriorityIcon = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'high':
        return <AlertTriangle size={14} className="text-orange-500" />;
      case 'low':
        return <ArrowUp size={14} className="text-gray-400 rotate-180" />;
      default:
        return null;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });

  // Get preview text (first 100 chars of message)
  const preview =
    message.message.length > 100
      ? `${message.message.substring(0, 100)}...`
      : message.message;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
      } ${!message.is_read && folder === 'inbox' ? 'bg-blue-50/50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            <User size={18} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-sm truncate ${
                !message.is_read && folder === 'inbox'
                  ? 'font-semibold text-gray-900'
                  : 'font-medium text-gray-700'
              }`}
            >
              {folder === 'sent'
                ? `To: ${message.recipient_name || message.recipient_department_name || 'Unknown'}`
                : message.sender_name}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2 mb-1">
            {getPriorityIcon(message.priority)}
            {!message.is_read && folder === 'inbox' && (
              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
            )}
            <span
              className={`text-sm truncate ${
                !message.is_read && folder === 'inbox'
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-700'
              }`}
            >
              {message.subject}
            </span>
          </div>

          {/* Preview */}
          <p className="text-xs text-gray-500 truncate">{preview}</p>

          {/* Patient context if any */}
          {message.patient_name && (
            <div className="mt-2 flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded w-fit">
              <User size={12} />
              <span>{message.patient_name}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Message List Component
// =============================================================================

interface MessageListProps {
  messages: StaffMessageInbox[];
  selectedId?: string;
  onSelect: (message: StaffMessageInbox) => void;
  isLoading: boolean;
  folder: MessageFolder;
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  isLoading,
  folder,
}: MessageListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={`skeleton-${n}`} className="animate-pulse">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Circle size={48} strokeWidth={1} />
        <p className="mt-3 text-sm">No messages in {folder}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {messages.map((message) => (
        <MessageListItem
          key={message.id}
          message={message}
          isSelected={message.id === selectedId}
          onClick={() => onSelect(message)}
          folder={folder}
        />
      ))}
    </div>
  );
}
