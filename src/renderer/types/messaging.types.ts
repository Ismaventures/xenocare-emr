// =============================================================================
// Staff Messaging Types
// Types for internal staff-to-staff communication
// =============================================================================

// Message priority levels
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

// Message status
export type MessageStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'archived'
  | 'deleted';

// =============================================================================
// Core Message Types
// =============================================================================

export interface StaffMessage {
  id: string;

  // Sender information
  sender_id: string;
  sender_department_id?: string;

  // Recipient information (at least one must be present)
  recipient_id?: string;
  recipient_department_id?: string;
  recipient_role?: string;

  // Message content
  subject: string;
  message: string;
  priority: MessagePriority;

  // Status tracking
  status: MessageStatus;
  is_read: boolean;
  read_at?: string;

  // Related entities
  patient_id?: string;
  encounter_id?: string;

  // Threading
  parent_message_id?: string;
  thread_id?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;

  // Facility scope
  facility_id?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;
  archived_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
}

// =============================================================================
// View/Display Types
// =============================================================================

export interface StaffMessageInbox {
  id: string;
  subject: string;
  message: string;
  priority: MessagePriority;
  created_at: string;
  thread_id?: string;
  parent_message_id?: string;
  patient_id?: string;
  encounter_id?: string;
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];

  // Sender info
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_department?: string;

  // Recipient status
  recipient_id: string;
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;

  // Recipient info (for sent messages)
  recipient_name?: string;
  recipient_role?: string;
  recipient_department?: string;
  recipient_department_name?: string;

  // Patient context
  patient_name?: string;
  patient_emr_number?: string;
}

export interface MessageThread {
  thread_id: string;
  subject: string;
  messages: StaffMessageInbox[];
  participants: MessageParticipant[];
  last_message_at: string;
  unread_count: number;
}

export interface MessageParticipant {
  id: string;
  name: string;
  role: string;
  department?: string;
}

// =============================================================================
// Form/Input Types
// =============================================================================

export interface CreateMessageInput {
  recipient_id?: string;
  recipient_department_id?: string;
  recipient_role?: string;
  subject: string;
  message: string;
  priority?: MessagePriority;
  patient_id?: string;
  encounter_id?: string;
  parent_message_id?: string;
}

export interface ReplyMessageInput {
  parent_message_id: string;
  message: string;
}

// =============================================================================
// Filter/Query Types
// =============================================================================

export type MessageFolder = 'inbox' | 'sent' | 'archived' | 'all';

export interface MessageFilters {
  folder: MessageFolder;
  priority?: MessagePriority;
  isRead?: boolean;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  senderId?: string;
  patientId?: string;
}

// =============================================================================
// Recipient Selection Types
// =============================================================================

export type RecipientType = 'individual' | 'department' | 'role';

export interface RecipientOption {
  type: RecipientType;
  id: string;
  label: string;
  sublabel?: string;
}

// =============================================================================
// Real-time Types
// =============================================================================

export interface MessageNotification {
  type: 'new_message' | 'message_read' | 'message_deleted';
  message_id: string;
  sender_id: string;
  sender_name: string;
  subject: string;
  preview: string;
  priority: MessagePriority;
  created_at: string;
}
