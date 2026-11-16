import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import {
  AppointmentDTO,
  CreateAppointmentDTO,
  CreateFeedbackDTO,
  CustomerFeedbackDTO,
  UpdateAppointmentDTO,
  UpdateFeedbackDTO,
} from '../dtos/customer-service.dto';

export interface FeedbackFilters {
  query?: string;
  status?: string;
  priority?: string;
  type?: string;
}

export interface AppointmentFilters {
  query?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export const customerServiceApi = {
  async getFeedback(
    filters: FeedbackFilters = {},
  ): Promise<CustomerFeedbackDTO[]> {
    let query = supabase
      .from('customer_feedback')
      .select(
        `
        *,
        patient:patients(*),
        assignee:staff!customer_feedback_assigned_to_fkey(*)
      `,
      )
      .order('created_at', { ascending: false });

    if (filters.query) {
      const safeQuery = sanitizeFilterValue(filters.query);
      query = query.or(
        `subject.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`,
      );
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.type) query = query.eq('feedback_type', filters.type);

    const { data, error } = await query;
    if (error) throw error;
    return data as CustomerFeedbackDTO[];
  },

  async createFeedback(
    payload: CreateFeedbackDTO,
  ): Promise<CustomerFeedbackDTO> {
    const { data, error } = await supabase
      .from('customer_feedback')
      .insert({
        patient_id: payload.patient_id || null,
        feedback_type: payload.feedback_type,
        subject: payload.subject,
        description: payload.description,
        contact_name: payload.contact_name || null,
        contact_phone: payload.contact_phone || null,
        contact_email: payload.contact_email || null,
        priority: payload.priority || 'Normal',
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomerFeedbackDTO;
  },

  async updateFeedback(
    feedbackId: string,
    payload: UpdateFeedbackDTO,
  ): Promise<CustomerFeedbackDTO> {
    const { data, error } = await supabase
      .from('customer_feedback')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('feedback_id', feedbackId)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerFeedbackDTO;
  },

  async getAppointments(
    filters: AppointmentFilters = {},
  ): Promise<AppointmentDTO[]> {
    let query = supabase
      .from('appointments')
      .select(
        `
        *,
        patient:patients(*),
        doctor:staff!appointments_doctor_id_fkey(*)
      `,
      )
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (filters.query) {
      // Note: patient name search is limited by nested select; use reason/department/type for now.
      const safeQuery = sanitizeFilterValue(filters.query);
      query = query.or(
        `reason.ilike.%${safeQuery}%,department.ilike.%${safeQuery}%`,
      );
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date_from)
      query = query.gte('appointment_date', filters.date_from);
    if (filters.date_to) query = query.lte('appointment_date', filters.date_to);

    const { data, error } = await query;
    if (error) throw error;
    return data as AppointmentDTO[];
  },

  async createAppointment(
    payload: CreateAppointmentDTO,
    staffId?: string,
  ): Promise<AppointmentDTO> {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...payload,
        duration_minutes: payload.duration_minutes ?? 30,
        status: 'Scheduled',
        booked_by: staffId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentDTO;
  },

  async updateAppointment(
    appointmentId: string,
    payload: UpdateAppointmentDTO,
  ): Promise<AppointmentDTO> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('appointment_id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentDTO;
  },

  async getDoctors(): Promise<
    { staff_id: string; first_name: string; last_name: string }[]
  > {
    const { data, error } = await supabase
      .from('staff')
      .select('staff_id, first_name, last_name')
      .eq('role', 'doctor')
      .eq('is_active', true)
      .order('first_name');

    if (error) throw error;
    return (data || []) as {
      staff_id: string;
      first_name: string;
      last_name: string;
    }[];
  },
};
