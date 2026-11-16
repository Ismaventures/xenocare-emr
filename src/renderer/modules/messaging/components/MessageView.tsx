import React from 'react';
import { format } from 'date-fns';
import {
  Reply,
  Archive,
  Trash2,
  User,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  ExternalLink,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import {
  useArchiveMessage,
  useUnarchiveMessage,
  useDeleteMessage,
  useThreadMessages,
} from '../hooks/useMessaging';
import type {
  StaffMessageInbox,
  MessagePriority,
} from '../../../types/messaging.types';
import { useToast } from '../../../components/ui/Toast';

// =============================================================================
// Message View Component
// =============================================================================

interface MessageViewProps {
  message: StaffMessageInbox;
  onReply: (message: StaffMessageInbox) => void;
  onClose: () => void;
}

export function MessageView({ message, onReply, onClose }: MessageViewProps) {
  const { showToast } = useToast();

  // Mutations
  const archiveMessage = useArchiveMessage();
  const unarchiveMessage = useUnarchiveMessage();
  const deleteMessage = useDeleteMessage();

  // Get thread messages if this is part of a thread
  const { data: threadMessages = [] } = useThreadMessages(
    message.thread_id || '',
  );

  const getPriorityBadge = (priority: MessagePriority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      normal: 'bg-gray-100 text-gray-700 border-gray-200',
      low: 'bg-gray-50 text-gray-500 border-gray-200',
    };

    const icons = {
      urgent: AlertCircle,
      high: AlertTriangle,
      normal: null,
      low: ArrowUp,
    };

    const Icon = icons[priority];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[priority]}`}
      >
        {Icon && (
          <Icon size={12} className={priority === 'low' ? 'rotate-180' : ''} />
        )}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const handleArchive = () => {
    if (message.is_archived) {
      unarchiveMessage.mutate(message.id, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Message Unarchived',
            message: 'Message moved back to inbox',
          });
          onClose();
        },
      });
    } else {
      archiveMessage.mutate(message.id, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Message Archived',
            message: 'Message moved to archive',
          });
          onClose();
        },
      });
    }
  };

  const handleDelete = () => {
    deleteMessage.mutate(message.id, {
      onSuccess: () => {
        showToast({
          type: 'success',
          title: 'Message Deleted',
          message: 'Message has been deleted',
        });
        onClose();
      },
    });
  };

  const formattedDate = format(
    new Date(message.created_at),
    "MMMM d, yyyy 'at' h:mm a",
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={Reply}
            onClick={() => onReply(message)}
          >
            Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={message.is_archived ? ArchiveRestore : Archive}
            onClick={handleArchive}
            isLoading={archiveMessage.isPending || unarchiveMessage.isPending}
          >
            {message.is_archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={handleDelete}
            isLoading={deleteMessage.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Subject */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {message.subject}
          </h2>
          <div className="flex items-center gap-3">
            {getPriorityBadge(message.priority)}
            {message.patient_name && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                <User size={12} />
                Patient: {message.patient_name}
              </span>
            )}
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            <User size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {message.sender_name}
              </span>
              {message.sender_role && (
                <span className="text-sm text-gray-500 capitalize">
                  ({message.sender_role.replace('_', ' ')})
                </span>
              )}
            </div>
            {message.sender_department && (
              <p className="text-sm text-gray-500">
                {message.sender_department}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock size={12} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {message.message}
          </div>
        </div>

        {/* Thread / Previous Messages */}
        {threadMessages.length > 1 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Conversation ({threadMessages.length} messages)
            </h3>
            <div className="space-y-4">
              {threadMessages
                .filter((m) => m.id !== message.id)
                .map((threadMsg) => (
                  <div
                    key={threadMsg.id}
                    className="pl-4 border-l-2 border-gray-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {threadMsg.sender_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(
                          new Date(threadMsg.created_at),
                          'MMM d, h:mm a',
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {threadMsg.message}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Patient Context Link */}
        {message.encounter_id && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href={`/encounter/${message.encounter_id}`}
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <ExternalLink size={14} />
              View Related Encounter
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
