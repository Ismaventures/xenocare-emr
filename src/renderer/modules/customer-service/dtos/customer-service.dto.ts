import { Patient, Staff } from '../../../types';

export type FeedbackType =
  | 'Complaint'
  | 'Suggestion'
  | 'Compliment'
  | 'Inquiry';
export type FeedbackStatus =
  | 'Open'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Escalated';
export type FeedbackPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface CustomerFeedbackDTO {
  feedback_id: string;
  patient_id: string | null;
  feedback_type: FeedbackType;
  subject: string;
  description: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolution_date: string | null;
  created_at: string;
  updated_at: string;

  patient?: Patient;
  assignee?: Staff;
}

export interface CreateFeedbackDTO {
  patient_id?: string;
  feedback_type: FeedbackType;
  subject: string;
  description: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  priority?: FeedbackPriority;
}

export interface UpdateFeedbackDTO {
  subject?: string;
  description?: string;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  assigned_to?: string;
  resolution_notes?: string;
  resolution_date?: string;
}

export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked-in'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export type AppointmentType =
  | 'Consultation'
  | 'Follow-up'
  | 'Lab'
  | 'Radiology'
  | 'Procedure';

export interface AppointmentDTO {
  appointment_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: AppointmentType;
  department: string | null;
  doctor_id: string | null;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  reminder_sent: boolean;
  reminder_date: string | null;
  booked_by: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;

  patient?: Patient;
  doctor?: Staff;
}

export interface CreateAppointmentDTO {
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  appointment_type: AppointmentType;
  department?: string;
  doctor_id?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentDTO {
  appointment_date?: string;
  appointment_time?: string;
  duration_minutes?: number;
  appointment_type?: AppointmentType;
  department?: string;
  doctor_id?: string;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
}

export const getFeedbackStatusColor = (status: FeedbackStatus): string => {
  switch (status) {
    case 'Open':
      return 'yellow';
    case 'In Progress':
      return 'blue';
    case 'Resolved':
      return 'green';
    case 'Closed':
      return 'gray';
    case 'Escalated':
      return 'red';
    default:
      return 'gray';
  }
};

export const getAppointmentStatusColor = (
  status: AppointmentStatus,
): string => {
  switch (status) {
    case 'Scheduled':
      return 'yellow';
    case 'Confirmed':
      return 'blue';
    case 'Checked-in':
      return 'cyan';
    case 'In Progress':
      return 'orange';
    case 'Completed':
      return 'green';
    case 'Cancelled':
      return 'red';
    case 'No Show':
      return 'gray';
    default:
      return 'gray';
  }
};
