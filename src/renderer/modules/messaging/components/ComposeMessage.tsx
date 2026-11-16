import React, { useState, useMemo } from 'react';
import {
  Send,
  User,
  Users,
  Building2,
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  Search,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import {
  useSendMessage,
  useReplyToMessage,
  useStaffRecipients,
  useDepartmentRecipients,
  useRoleRecipients,
} from '../hooks/useMessaging';
import type {
  StaffMessageInbox,
  MessagePriority,
  RecipientType,
  CreateMessageInput,
} from '../../../types/messaging.types';

// =============================================================================
// Compose Message Component
// =============================================================================

interface ComposeMessageProps {
  replyTo?: StaffMessageInbox | null;
  onSuccess: () => void;
  onCancel: () => void;
  // Optional: Pre-fill for patient context
  patientId?: string;
  encounterId?: string;
}

export function ComposeMessage({
  replyTo,
  onSuccess,
  onCancel,
  patientId,
  encounterId,
}: ComposeMessageProps) {
  // Form state
  const [recipientType, setRecipientType] =
    useState<RecipientType>('individual');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : '',
  );
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: staffList = [], isLoading: staffLoading } =
    useStaffRecipients();
  const { data: departments = [] } = useDepartmentRecipients();
  const { data: roles = [] } = useRoleRecipients();

  // Mutations
  const sendMessage = useSendMessage();
  const replyToMessage = useReplyToMessage();

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList;
    const query = searchQuery.toLowerCase();
    return staffList.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(query) ||
        s.last_name?.toLowerCase().includes(query) ||
        s.role?.toLowerCase().includes(query) ||
        s.department?.toLowerCase().includes(query),
    );
  }, [staffList, searchQuery]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (replyTo) {
      // Reply to existing message
      replyToMessage.mutate(
        { parentMessageId: replyTo.id, message },
        { onSuccess },
      );
    } else {
      // Send new message
      const input: CreateMessageInput = {
        subject,
        message,
        priority,
        patient_id: patientId,
        encounter_id: encounterId,
      };

      // Set recipient based on type
      if (recipientType === 'individual') {
        input.recipient_id = recipientId;
      } else if (recipientType === 'department') {
        input.recipient_department_id = recipientId;
      } else if (recipientType === 'role') {
        input.recipient_role = recipientId;
      }

      sendMessage.mutate(input, { onSuccess });
    }
  };

  const isSubmitting = sendMessage.isPending || replyToMessage.isPending;

  // Validate form
  const isValid = replyTo
    ? message.trim().length > 0
    : subject.trim().length > 0 && message.trim().length > 0 && recipientId;

  const priorityOptions = [
    { value: 'low', label: 'Low', icon: ArrowUp, color: 'text-gray-400' },
    { value: 'normal', label: 'Normal', icon: null, color: 'text-gray-600' },
    {
      value: 'high',
      label: 'High',
      icon: AlertTriangle,
      color: 'text-orange-500',
    },
    {
      value: 'urgent',
      label: 'Urgent',
      icon: AlertCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Reply header */}
      {replyTo && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={14} />
            <span>Replying to</span>
            <span className="font-medium text-gray-900">
              {replyTo.sender_name}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 truncate">
            {replyTo.message.substring(0, 100)}...
          </p>
        </div>
      )}

      {/* Recipient Selection (only for new messages) */}
      {!replyTo && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Send To
          </label>

          {/* Recipient Type Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRecipientType('individual');
                setRecipientId('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                recipientType === 'individual'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User size={16} />
              Individual
            </button>
            <button
              type="button"
              onClick={() => {
                setRecipientType('department');
                setRecipientId('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                recipientType === 'department'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Building2 size={16} />
              Department
            </button>
            <button
              type="button"
              onClick={() => {
                setRecipientType('role');
                setRecipientId('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                recipientType === 'role'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users size={16} />
              Role
            </button>
          </div>

          {/* Recipient Selector */}
          {recipientType === 'individual' && (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {staffLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading...
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No staff found
                  </div>
                ) : (
                  filteredStaff.map((staffMember) => (
                    <button
                      key={staffMember.id}
                      type="button"
                      onClick={() => setRecipientId(staffMember.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                        recipientId === staffMember.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <User size={14} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {staffMember.first_name} {staffMember.last_name}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {staffMember.role?.replace('_', ' ')}
                          {staffMember.department &&
                            ` · ${staffMember.department}`}
                        </div>
                      </div>
                      {recipientId === staffMember.id && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {recipientType === 'department' && (
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}

          {recipientType === 'role' && (
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select role...</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role
                    .replace('_', ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Subject (only for new messages) */}
      {!replyTo && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter message subject..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
      )}

      {/* Priority (only for new messages) */}
      {!replyTo && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <div className="flex gap-2">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value as MessagePriority)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  priority === opt.value
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.icon && (
                  <opt.icon
                    size={14}
                    className={opt.value === 'low' ? 'rotate-180' : opt.color}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={Send}
          isLoading={isSubmitting}
          disabled={!isValid}
        >
          {replyTo ? 'Send Reply' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}
