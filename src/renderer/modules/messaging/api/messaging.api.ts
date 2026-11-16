import { supabase } from '../../../api/supabaseClient';
import type {
  StaffMessage,
  StaffMessageInbox,
  CreateMessageInput,
  MessageFilters,
  MessageRecipient,
} from '../../../types/messaging.types';

// =============================================================================
// Message Queries
// =============================================================================

/**
 * Get inbox messages for the current user
 */
export async function getInboxMessages(
  staffId: string,
  filters?: Partial<MessageFilters>,
): Promise<StaffMessageInbox[]> {
  let query = supabase
    .from('staff_messages_inbox_view')
    .select('*')
    .eq('recipient_id', staffId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }
  if (filters?.searchQuery) {
    query = query.or(
      `subject.ilike.%${filters.searchQuery}%,message.ilike.%${filters.searchQuery}%,sender_name.ilike.%${filters.searchQuery}%`,
    );
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get sent messages for the current user
 */
export async function getSentMessages(
  senderId: string,
): Promise<StaffMessageInbox[]> {
  const { data, error } = await supabase
    .from('staff_messages')
    .select(
      `
      *,
      recipient:staff!recipient_id(id, first_name, last_name, role, department),
      sender:staff!sender_id(id, first_name, last_name, role, department)
    `,
    )
    .eq('sender_id', senderId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform to StaffMessageInbox format
  return (data || []).map((msg: any) => ({
    id: msg.id,
    subject: msg.subject,
    message: msg.message,
    priority: msg.priority,
    created_at: msg.created_at,
    thread_id: msg.thread_id,
    parent_message_id: msg.parent_message_id,
    patient_id: msg.patient_id,
    encounter_id: msg.encounter_id,
    metadata: msg.metadata,
    attachments: msg.attachments,
    // Sender info
    sender_id: msg.sender_id,
    sender_name: msg.sender
      ? `${msg.sender.first_name} ${msg.sender.last_name}`
      : 'Unknown',
    sender_role: msg.sender?.role || '',
    sender_department: msg.sender?.department,
    // Recipient info
    recipient_id: msg.recipient_id || '',
    recipient_name: msg.recipient
      ? `${msg.recipient.first_name} ${msg.recipient.last_name}`
      : msg.recipient_department_name ||
        msg.recipient_role ||
        'Multiple Recipients',
    recipient_role: msg.recipient?.role,
    recipient_department: msg.recipient?.department,
    recipient_department_name: msg.recipient_department_name,
    // Status (sender's view - always read)
    is_read: true,
    is_archived: false,
  }));
}

/**
 * Get archived messages for the current user
 */
export async function getArchivedMessages(
  staffId: string,
): Promise<StaffMessageInbox[]> {
  const { data, error } = await supabase
    .from('staff_messages_inbox_view')
    .select('*')
    .eq('recipient_id', staffId)
    .eq('is_archived', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single message by ID
 */
export async function getMessageById(
  messageId: string,
): Promise<StaffMessageInbox | null> {
  const { data, error } = await supabase
    .from('staff_messages_inbox_view')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get messages in a thread
 */
export async function getThreadMessages(
  threadId: string,
): Promise<StaffMessageInbox[]> {
  const { data, error } = await supabase
    .from('staff_messages_inbox_view')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get unread message count
 */
export async function getUnreadCount(staffId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_message_count', {
    p_staff_id: staffId,
  });

  if (error) throw error;
  return data || 0;
}

// =============================================================================
// Message Mutations
// =============================================================================

/**
 * Send a new message
 */
export async function sendMessage(
  senderId: string,
  senderDepartmentId: string | null,
  input: CreateMessageInput,
): Promise<StaffMessage> {
  // Check if recipient_department_id is a valid UUID or a department name
  let recipientDeptId: string | null = null;
  let recipientDeptName: string | null = null;

  if (input.recipient_department_id) {
    // Check if it's a valid UUID (36 chars with hyphens)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input.recipient_department_id)) {
      recipientDeptId = input.recipient_department_id;
    } else {
      // It's a department name
      recipientDeptName = input.recipient_department_id;
    }
  }

  const { data, error } = await supabase
    .from('staff_messages')
    .insert({
      sender_id: senderId,
      sender_department_id: senderDepartmentId,
      recipient_id: input.recipient_id,
      recipient_department_id: recipientDeptId,
      recipient_department_name: recipientDeptName,
      recipient_role: input.recipient_role,
      subject: input.subject,
      message: input.message,
      priority: input.priority || 'normal',
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      parent_message_id: input.parent_message_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Reply to a message
 */
export async function replyToMessage(
  senderId: string,
  senderDepartmentId: string | null,
  parentMessageId: string,
  message: string,
): Promise<StaffMessage> {
  // First, get the parent message to inherit subject and thread
  const parent = await getMessageById(parentMessageId);
  if (!parent) {
    throw new Error('Parent message not found');
  }

  const subject = parent.subject.startsWith('Re: ')
    ? parent.subject
    : `Re: ${parent.subject}`;

  const { data, error } = await supabase
    .from('staff_messages')
    .insert({
      sender_id: senderId,
      sender_department_id: senderDepartmentId,
      recipient_id: parent.sender_id, // Reply to the original sender
      subject,
      message,
      priority: parent.priority,
      patient_id: parent.patient_id,
      encounter_id: parent.encounter_id,
      parent_message_id: parentMessageId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(
  messageId: string,
  staffId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_message_read', {
    p_message_id: messageId,
    p_staff_id: staffId,
  });

  if (error) throw error;
}

/**
 * Mark all messages as read
 */
export async function markAllMessagesAsRead(staffId: string): Promise<number> {
  const { data, error } = await supabase.rpc('mark_all_messages_read', {
    p_staff_id: staffId,
  });

  if (error) throw error;
  return data || 0;
}

/**
 * Archive a message
 */
export async function archiveMessage(
  messageId: string,
  staffId: string,
): Promise<MessageRecipient | null> {
  const { data, error } = await supabase
    .from('message_recipients')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq('message_id', messageId)
    .eq('recipient_id', staffId)
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

/**
 * Unarchive a message
 */
export async function unarchiveMessage(
  messageId: string,
  staffId: string,
): Promise<MessageRecipient | null> {
  const { data, error } = await supabase
    .from('message_recipients')
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq('message_id', messageId)
    .eq('recipient_id', staffId)
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

/**
 * Delete a message (soft delete for recipient)
 */
export async function deleteMessage(
  messageId: string,
  staffId: string,
): Promise<MessageRecipient | null> {
  const { data, error } = await supabase
    .from('message_recipients')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('message_id', messageId)
    .eq('recipient_id', staffId)
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

// =============================================================================
// Recipient Helpers
// =============================================================================

/**
 * Get staff members for recipient selection
 */
export async function getStaffForRecipients() {
  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name, role, department_id, department')
    .eq('is_active', true)
    .order('first_name');

  if (error) throw error;
  return data || [];
}

/**
 * Get departments for recipient selection
 * Gets unique departments from staff table since departments table may be empty
 */
export async function getDepartmentsForRecipients() {
  // First try the departments table
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('status', 'Active')
    .order('name');

  if (!deptError && deptData && deptData.length > 0) {
    return deptData;
  }

  // Fallback: get unique departments from staff table
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('department')
    .eq('is_active', true)
    .not('department', 'is', null);

  if (staffError) throw staffError;

  // Get unique departments and format them
  const uniqueDepts = [
    ...new Set(staffData?.map((s) => s.department).filter(Boolean)),
  ];
  return uniqueDepts.map((name) => ({
    id: name, // Use name as ID since we don't have actual IDs
    name: name as string,
    code: null,
  }));
}

/**
 * Get unique roles for recipient selection
 */
export async function getRolesForRecipients() {
  const { data, error } = await supabase
    .from('staff')
    .select('role')
    .eq('is_active', true);

  if (error) throw error;

  // Get unique roles
  const uniqueRoles = [...new Set(data?.map((s) => s.role).filter(Boolean))];
  return uniqueRoles;
}

// =============================================================================
// Real-time Subscriptions
// =============================================================================

/**
 * Subscribe to new messages for a staff member
 */
export function subscribeToNewMessages(
  staffId: string,
  callback: (message: StaffMessage) => void,
) {
  return supabase
    .channel(`messages:${staffId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_recipients',
        filter: `recipient_id=eq.${staffId}`,
      },
      async (payload) => {
        // Fetch the full message when a new recipient entry is created
        const messageId = payload.new.message_id;
        const message = await getMessageById(messageId);
        if (message) {
          callback(message as unknown as StaffMessage);
        }
      },
    )
    .subscribe();
}

/**
 * Unsubscribe from messages channel
 */
export function unsubscribeFromMessages(staffId: string) {
  return supabase.channel(`messages:${staffId}`).unsubscribe();
}
