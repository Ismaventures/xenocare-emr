/**
 * =============================================================================
 * XENOCARE EMR - COMPREHENSIVE AUDIT TRAIL VIEWER
 * Unified audit trail view for all system activities across all modules
 * Aggregates: comprehensive_audit_log, billing_audit_log, clinical_audit_log,
 * nhis_audit_log, nhis_activity_audit, user_session_audit
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Activity,
  Shield,
  CreditCard,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Database,
  Calendar,
  Download,
  Stethoscope,
  FlaskConical,
  Pill,
  Building2,
  DollarSign,
  UserPlus,
  Syringe,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  formatDistanceToNow,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { supabase } from '../../../api/supabaseClient';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/FormElements';

// =============================================================================
// Types
// =============================================================================

interface UnifiedAuditLog {
  id: string;
  source:
    | 'comprehensive'
    | 'billing'
    | 'clinical'
    | 'nhis'
    | 'nhis_activity'
    | 'session'
    | 'price_changes'
    | 'patient_registration'
    | 'nursing'
    | 'inventory'
    | 'exceptions';
  event_type: string;
  action_type: string;
  table_name?: string;
  record_id?: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  patient_name?: string;
  patient_id?: string;
  encounter_id?: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  is_critical?: boolean;
  ip_address?: string;
  performed_at: string;
  session_id?: string;
  reason?: string;
  changes_summary?: string;
}

interface AuditFilters {
  startDate: Date;
  endDate: Date;
  source: string;
  actionType: string;
  searchQuery: string;
  criticalOnly: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'comprehensive', label: 'System Activity' },
  { value: 'billing', label: 'Billing' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'nhis', label: 'NHIS' },
  { value: 'nhis_activity', label: 'NHIS Activity' },
  { value: 'session', label: 'User Sessions' },
  { value: 'price_changes', label: 'Price Changes' },
  { value: 'patient_registration', label: 'Patient Registration' },
  { value: 'nursing', label: 'Nursing Activities' },
  { value: 'inventory', label: 'Inventory/Stock' },
  { value: 'exceptions', label: 'Exceptions/Overrides' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'approve', label: 'Approved' },
  { value: 'reject', label: 'Rejected' },
  { value: 'verify', label: 'Verified' },
  { value: 'view', label: 'Viewed' },
];

const BRAND_COLORS = {
  primary: '#166534',
  secondary: '#15803d',
  accent: '#22c55e',
};

// =============================================================================
// API Functions
// =============================================================================

const fetchUnifiedAuditLogs = async (
  filters: AuditFilters,
): Promise<UnifiedAuditLog[]> => {
  const logs: UnifiedAuditLog[] = [];
  const startDate = startOfDay(filters.startDate).toISOString();
  const endDate = endOfDay(filters.endDate).toISOString();

  // 1. Fetch from comprehensive_audit_log
  if (!filters.source || filters.source === 'comprehensive') {
    try {
      let query = supabase
        .from('comprehensive_audit_log')
        .select('*')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.criticalOnly) {
        query = query.eq('is_critical', true);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'comprehensive',
          event_type: row.event_type,
          action_type: row.action_type,
          table_name: row.table_name,
          record_id: row.record_id,
          description: row.description,
          user_name: row.user_email?.split('@')[0] || 'System',
          user_email: row.user_email,
          user_role: row.user_role,
          patient_name: row.patient_name,
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.old_values,
          new_values: row.new_values,
          changed_fields: row.changed_fields,
          is_critical: row.is_critical,
          ip_address: row.ip_address,
          performed_at: row.performed_at,
          session_id: row.session_id,
          reason: row.reason,
        });
      });
    } catch (e) {
      console.warn('comprehensive_audit_log query failed:', e);
    }
  }

  // 2. Fetch from billing_audit_log
  if (!filters.source || filters.source === 'billing') {
    try {
      let query = supabase
        .from('billing_audit_log')
        .select('*')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('event_type', filters.actionType);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'billing',
          event_type: row.event_type,
          action_type: row.event_type,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          description:
            row.changes_summary ||
            `Billing ${row.event_type}: ${row.entity_type}`,
          user_name: 'Billing User',
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.old_value,
          new_values: row.new_value,
          performed_at: row.performed_at,
          changes_summary: row.changes_summary,
        });
      });
    } catch (e) {
      console.warn('billing_audit_log query failed:', e);
    }
  }

  // 3. Fetch from clinical_audit_log
  if (!filters.source || filters.source === 'clinical') {
    try {
      let query = supabase
        .from('clinical_audit_log')
        .select('*')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('action', filters.actionType.toUpperCase());
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'clinical',
          event_type: row.action,
          action_type: row.action?.toLowerCase() || 'update',
          entity_type: row.resource_type,
          entity_id: row.resource_id,
          description:
            row.details || `Clinical ${row.action}: ${row.resource_type}`,
          user_name: row.staff_name || 'Clinical Staff',
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.before_state,
          new_values: row.after_state,
          performed_at: row.performed_at,
        });
      });
    } catch (e) {
      console.warn('clinical_audit_log query failed:', e);
    }
  }

  // 4. Fetch from nhis_audit_log
  if (!filters.source || filters.source === 'nhis') {
    try {
      let query = supabase
        .from('nhis_audit_log')
        .select('*')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'nhis',
          event_type: row.action_type,
          action_type: row.action_type?.toLowerCase() || 'update',
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          description:
            row.action_description ||
            `NHIS ${row.action_type}: ${row.entity_type}`,
          user_name: 'NHIS User',
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.old_state,
          new_values: row.new_state,
          performed_at: row.performed_at,
        });
      });
    } catch (e) {
      console.warn('nhis_audit_log query failed:', e);
    }
  }

  // 5. Fetch from nhis_activity_audit
  if (!filters.source || filters.source === 'nhis_activity') {
    try {
      let query = supabase
        .from('nhis_activity_audit')
        .select('*')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'nhis_activity',
          event_type: row.event_type,
          action_type: row.action_type,
          description: `NHIS ${row.event_type}: ${row.action_type}${row.auth_code ? ` (Code: ${row.auth_code})` : ''}`,
          user_name: 'NHIS User',
          user_role: row.user_role,
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.before_state,
          new_values: row.after_state,
          ip_address: row.ip_address,
          performed_at: row.performed_at,
          session_id: row.session_id,
          reason: row.reason,
        });
      });
    } catch (e) {
      console.warn('nhis_activity_audit query failed:', e);
    }
  }

  // 6. Fetch from user_session_audit
  if (!filters.source || filters.source === 'session') {
    try {
      let query = supabase
        .from('user_session_audit')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(200);

      if (
        filters.actionType &&
        ['login', 'logout'].includes(filters.actionType)
      ) {
        query = query.eq('event_type', filters.actionType);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        logs.push({
          id: row.id,
          source: 'session',
          event_type: row.event_type,
          action_type: row.event_type,
          description: row.is_successful
            ? `User ${row.event_type}`
            : `Failed ${row.event_type}: ${row.failure_reason || 'Unknown'}`,
          user_name: 'Session User',
          ip_address: row.ip_address,
          performed_at: row.created_at,
          session_id: row.session_id,
          is_critical: !row.is_successful,
        });
      });
    } catch (e) {
      console.warn('user_session_audit query failed:', e);
    }
  }

  // 7. Fetch from service_price_audit (Price Changes)
  if (!filters.source || filters.source === 'price_changes') {
    try {
      const query = supabase
        .from('service_price_audit')
        .select(
          `
          id,
          service_type,
          service_id,
          service_name,
          field_changed,
          old_value,
          new_value,
          changed_at,
          reason,
          changed_by
        `,
        )
        .gte('changed_at', startDate)
        .lte('changed_at', endDate)
        .order('changed_at', { ascending: false })
        .limit(200);

      const { data } = await query;
      (data || []).forEach((row: any) => {
        // Format old/new values for price fields
        const formatValue = (field: string, value: string) => {
          if (
            ['price', 'nhis_price', 'selling_price'].includes(field) &&
            value
          ) {
            const num = parseFloat(value);
            return isNaN(num) ? value : `₦${num.toLocaleString('en-NG')}`;
          }
          return value || 'N/A';
        };

        logs.push({
          id: row.id,
          source: 'price_changes',
          event_type: 'PRICE_CHANGED',
          action_type: 'update',
          table_name: row.service_type,
          entity_type: row.service_type,
          entity_id: row.service_id,
          description: `Price change on ${row.service_name || 'Unknown Service'}: ${row.field_changed.replace(/_/g, ' ')} changed from ${formatValue(row.field_changed, row.old_value)} to ${formatValue(row.field_changed, row.new_value)}`,
          user_name: 'System',
          user_role: 'Admin',
          old_values: { [row.field_changed]: row.old_value },
          new_values: { [row.field_changed]: row.new_value },
          changed_fields: [row.field_changed],
          performed_at: row.changed_at,
          reason: row.reason,
          is_critical: ['price', 'nhis_price', 'selling_price'].includes(
            row.field_changed,
          ),
        });
      });
    } catch (e) {
      console.warn('service_price_audit query failed:', e);
    }
  }

  // 8. Fetch patient registration changes from comprehensive_audit_log (table_name = 'patients')
  if (!filters.source || filters.source === 'patient_registration') {
    try {
      let query = supabase
        .from('comprehensive_audit_log')
        .select('*')
        .eq('table_name', 'patients')
        .gte('performed_at', startDate)
        .lte('performed_at', endDate)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.criticalOnly) {
        query = query.eq('is_critical', true);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        // Build patient name from new_values if available
        const newVals = row.new_values || {};
        const oldVals = row.old_values || {};
        const patientName =
          newVals.first_name || oldVals.first_name
            ? `${newVals.first_name || oldVals.first_name || ''} ${newVals.surname || oldVals.surname || ''}`.trim()
            : row.patient_name || 'Unknown Patient';

        // Build description based on action type
        let { description } = row;
        if (!description) {
          switch (row.action_type?.toLowerCase()) {
            case 'insert':
            case 'create':
              description = `New patient registered: ${patientName}${newVals.emr_number ? ` (${newVals.emr_number})` : ''}`;
              break;
            case 'update':
              const changedFields = row.changed_fields || [];
              description =
                changedFields.length > 0
                  ? `Patient updated: ${patientName} - fields changed: ${changedFields.slice(0, 5).join(', ')}${changedFields.length > 5 ? ` (+${changedFields.length - 5} more)` : ''}`
                  : `Patient updated: ${patientName}`;
              break;
            case 'delete':
              description = `Patient record deleted: ${patientName}`;
              break;
            default:
              description = `Patient activity: ${patientName}`;
          }
        }

        logs.push({
          id: `pat-${row.id}`,
          source: 'patient_registration',
          event_type:
            row.action_type === 'insert'
              ? 'PATIENT_REGISTERED'
              : row.action_type === 'update'
                ? 'PATIENT_UPDATED'
                : 'PATIENT_DELETED',
          action_type:
            row.action_type === 'insert' ? 'create' : row.action_type,
          table_name: 'patients',
          record_id: row.record_id,
          description,
          user_name: row.user_email?.split('@')[0] || 'System',
          user_email: row.user_email,
          user_role: row.user_role,
          patient_name: patientName,
          patient_id: row.patient_id || row.record_id,
          old_values: row.old_values,
          new_values: row.new_values,
          changed_fields: row.changed_fields,
          is_critical: row.is_critical || row.action_type === 'delete',
          ip_address: row.ip_address,
          performed_at: row.performed_at,
          session_id: row.session_id,
          reason: row.reason,
        });
      });
    } catch (e) {
      console.warn('patient_registration query failed:', e);
    }
  }

  // 9. Fetch from nursing_audit_log (Nursing Activities)
  if (!filters.source || filters.source === 'nursing') {
    try {
      let query = supabase
        .from('nursing_audit_log')
        .select(
          `
          id,
          encounter_id,
          patient_id,
          user_id,
          user_role,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          ip_address,
          was_successful,
          error_message,
          created_at
        `,
        )
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        query = query.ilike('action', `%${filters.actionType}%`);
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        const userRole = row.user_role
          ? row.user_role
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          : 'Nurse';

        logs.push({
          id: `nurs-${row.id}`,
          source: 'nursing',
          event_type: row.action,
          action_type:
            row.action?.includes('CREATE') || row.action?.includes('INSERT')
              ? 'create'
              : row.action?.includes('UPDATE')
                ? 'update'
                : row.action?.includes('DELETE')
                  ? 'delete'
                  : 'view',
          table_name: row.table_name,
          record_id: row.record_id,
          description:
            `Nursing: ${row.action?.replace(/_/g, ' ')} ${row.table_name ? `on ${row.table_name.replace(/_/g, ' ')}` : ''}`.trim(),
          user_name: userRole,
          user_role: userRole,
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          old_values: row.old_values,
          new_values: row.new_values,
          ip_address: row.ip_address,
          performed_at: row.created_at,
          is_critical: !row.was_successful,
          reason: row.error_message,
        });
      });
    } catch (e) {
      console.warn('nursing_audit_log query failed:', e);
    }
  }

  // 10. Fetch from inventory_stock_movements (Pharmacy/Inventory Stock Changes)
  if (!filters.source || filters.source === 'inventory') {
    try {
      let query = supabase
        .from('inventory_stock_movements')
        .select(
          `
          movement_id,
          item_id,
          drug_id,
          batch_id,
          movement_type,
          quantity,
          reference_number,
          encounter_id,
          patient_id,
          reason,
          notes,
          performed_by,
          approved_by,
          created_at,
          drug:drug_catalogue!inventory_stock_movements_drug_id_fkey(drug_name),
          item:inventory_items!inventory_stock_movements_item_id_fkey(item_name)
        `,
        )
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.actionType) {
        const typeMap: Record<string, string> = {
          create: 'IN',
          delete: 'OUT',
          update: 'ADJUSTMENT',
        };
        query = query.eq(
          'movement_type',
          typeMap[filters.actionType] || filters.actionType.toUpperCase(),
        );
      }

      const { data } = await query;
      (data || []).forEach((row: any) => {
        const drugName =
          row.drug?.drug_name || row.item?.item_name || 'Unknown Item';
        const movementDesc: Record<string, string> = {
          IN: 'Stock received',
          OUT: 'Stock dispensed',
          ADJUSTMENT: 'Stock adjusted',
          TRANSFER: 'Stock transferred',
          RETURN: 'Stock returned',
          EXPIRED: 'Stock expired',
          DAMAGED: 'Stock damaged',
        };

        logs.push({
          id: `inv-${row.movement_id}`,
          source: 'inventory',
          event_type: `STOCK_${row.movement_type}`,
          action_type:
            row.movement_type === 'IN'
              ? 'create'
              : row.movement_type === 'OUT'
                ? 'delete'
                : 'update',
          entity_type: 'stock_movement',
          entity_id: row.movement_id,
          description: `${movementDesc[row.movement_type] || row.movement_type}: ${Math.abs(row.quantity)} units of ${drugName}${row.reference_number ? ` (Ref: ${row.reference_number})` : ''}`,
          user_name: row.performed_by || 'System',
          patient_id: row.patient_id,
          encounter_id: row.encounter_id,
          performed_at: row.created_at,
          reason: row.reason || row.notes,
          is_critical: ['EXPIRED', 'DAMAGED', 'ADJUSTMENT'].includes(
            row.movement_type,
          ),
        });
      });
    } catch (e) {
      console.warn('inventory_stock_movements query failed:', e);
    }
  }

  // 11. Fetch from workflow_exceptions (Exceptions/Overrides)
  if (!filters.source || filters.source === 'exceptions') {
    try {
      const query = supabase
        .from('workflow_exceptions')
        .select(
          `
          id,
          exception_number,
          exception_type,
          severity,
          entity_type,
          entity_id,
          reason,
          status,
          requested_by,
          approved_by,
          created_at,
          updated_at,
          requester:staff!workflow_exceptions_requested_by_fkey(first_name, last_name, role),
          approver:staff!workflow_exceptions_approved_by_fkey(first_name, last_name, role)
        `,
        )
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data } = await query;
      (data || []).forEach((row: any) => {
        const requester = row.requester as any;
        const approver = row.approver as any;
        const requesterName = requester
          ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim()
          : 'Unknown';
        const requesterRole = requester?.role
          ? requester.role
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          : '';

        const exceptionTypeLabels: Record<string, string> = {
          Payment_Override: 'Payment Override',
          Queue_Skip: 'Queue Skip',
          Triage_Override: 'Triage Override',
          Result_Amendment: 'Result Amendment',
          Workflow_Bypass: 'Workflow Bypass',
          Insurance_Exception: 'Insurance Exception',
        };

        const statusDesc =
          row.status === 'Approved' && approver
            ? ` - Approved by ${approver.first_name} ${approver.last_name}`
            : row.status === 'Rejected'
              ? ' - Rejected'
              : row.status === 'Pending'
                ? ' - Pending approval'
                : '';

        logs.push({
          id: `exc-${row.id}`,
          source: 'exceptions',
          event_type: row.exception_type,
          action_type:
            row.status === 'Approved'
              ? 'approve'
              : row.status === 'Rejected'
                ? 'reject'
                : 'create',
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          description: `${exceptionTypeLabels[row.exception_type] || row.exception_type}: ${row.exception_number}${statusDesc}`,
          user_name: requesterName,
          user_role: requesterRole,
          performed_at: row.created_at,
          reason: row.reason,
          is_critical: row.severity === 'High' || row.severity === 'Critical',
        });
      });
    } catch (e) {
      console.warn('workflow_exceptions query failed:', e);
    }
  }

  // Sort all logs by performed_at descending
  logs.sort(
    (a, b) =>
      new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime(),
  );

  // Apply search filter
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.description?.toLowerCase().includes(q) ||
        log.user_name?.toLowerCase().includes(q) ||
        log.table_name?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q) ||
        log.patient_name?.toLowerCase().includes(q),
    );
  }

  return logs.slice(0, 500);
};

// =============================================================================
// Helper Functions
// =============================================================================

const getSourceColor = (source: string): string => {
  switch (source) {
    case 'comprehensive':
      return 'bg-blue-100 text-blue-800';
    case 'billing':
      return 'bg-emerald-100 text-emerald-800';
    case 'clinical':
      return 'bg-purple-100 text-purple-800';
    case 'nhis':
    case 'nhis_activity':
      return 'bg-orange-100 text-orange-800';
    case 'session':
      return 'bg-cyan-100 text-cyan-800';
    case 'price_changes':
      return 'bg-rose-100 text-rose-800';
    case 'patient_registration':
      return 'bg-indigo-100 text-indigo-800';
    case 'nursing':
      return 'bg-pink-100 text-pink-800';
    case 'inventory':
      return 'bg-amber-100 text-amber-800';
    case 'exceptions':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'comprehensive':
      return 'System';
    case 'billing':
      return 'Billing';
    case 'clinical':
      return 'Clinical';
    case 'nhis':
      return 'NHIS';
    case 'nhis_activity':
      return 'NHIS Activity';
    case 'session':
      return 'Session';
    case 'price_changes':
      return 'Price Change';
    case 'patient_registration':
      return 'Patient';
    case 'nursing':
      return 'Nursing';
    case 'inventory':
      return 'Inventory';
    case 'exceptions':
      return 'Exception';
    default:
      return source;
  }
};

const getActionIcon = (action: string) => {
  switch (action?.toLowerCase()) {
    case 'create':
      return <CheckCircle size={14} className="text-green-600" />;
    case 'update':
      return <Edit size={14} className="text-blue-600" />;
    case 'delete':
      return <Trash2 size={14} className="text-red-600" />;
    case 'login':
      return <LogIn size={14} className="text-cyan-600" />;
    case 'logout':
      return <LogOut size={14} className="text-gray-600" />;
    case 'approve':
    case 'verify':
      return <CheckCircle size={14} className="text-emerald-600" />;
    case 'reject':
      return <XCircle size={14} className="text-red-600" />;
    case 'view':
      return <Eye size={14} className="text-purple-600" />;
    default:
      return <Activity size={14} className="text-gray-600" />;
  }
};

const getActionColor = (action: string): string => {
  switch (action?.toLowerCase()) {
    case 'create':
      return 'bg-green-100 text-green-800';
    case 'update':
      return 'bg-blue-100 text-blue-800';
    case 'delete':
      return 'bg-red-100 text-red-800';
    case 'login':
      return 'bg-cyan-100 text-cyan-800';
    case 'logout':
      return 'bg-gray-100 text-gray-800';
    case 'approve':
    case 'verify':
      return 'bg-emerald-100 text-emerald-800';
    case 'reject':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'comprehensive':
      return <Database size={14} />;
    case 'billing':
      return <CreditCard size={14} />;
    case 'clinical':
      return <Stethoscope size={14} />;
    case 'nhis':
    case 'nhis_activity':
      return <Shield size={14} />;
    case 'session':
      return <Users size={14} />;
    default:
      return <Activity size={14} />;
  }
};

// =============================================================================
// Detail Modal Component
// =============================================================================

function AuditDetailModal({
  log,
  onClose,
}: {
  log: UnifiedAuditLog;
  onClose: () => void;
}) {
  return (
    <Modal isOpen onClose={onClose} title="Audit Log Details" size="lg">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getSourceColor(log.source)}`}>
              {getSourceIcon(log.source)}
            </div>
            <div>
              <p className="font-bold text-gray-900">
                {getSourceLabel(log.source)} Activity
              </p>
              <p className="text-sm text-gray-500">
                {format(new Date(log.performed_at), 'PPpp')}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}
          >
            {log.action_type?.toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">
              User
            </label>
            <p className="text-sm font-medium text-gray-900">
              {log.user_name || 'System'}
            </p>
            {log.user_role && (
              <p className="text-xs text-gray-500">{log.user_role}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">
              IP Address
            </label>
            <p className="text-sm font-medium text-gray-900">
              {log.ip_address || 'N/A'}
            </p>
          </div>
          {log.table_name && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Table
              </label>
              <p className="text-sm font-medium text-gray-900">
                {log.table_name}
              </p>
            </div>
          )}
          {log.entity_type && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Entity Type
              </label>
              <p className="text-sm font-medium text-gray-900">
                {log.entity_type}
              </p>
            </div>
          )}
          {log.patient_name && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Patient
              </label>
              <p className="text-sm font-medium text-gray-900">
                {log.patient_name}
              </p>
            </div>
          )}
          {log.record_id && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">
                Record ID
              </label>
              <p className="text-sm font-mono text-gray-900 truncate">
                {log.record_id}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">
            Description
          </label>
          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
            {log.description || 'No description'}
          </p>
        </div>

        {/* Changed Fields */}
        {log.changed_fields && log.changed_fields.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">
              Changed Fields
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {log.changed_fields.map((field) => (
                <span
                  key={field}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {field.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Before/After Values */}
        {(log.old_values || log.new_values) && (
          <div className="grid grid-cols-2 gap-4">
            {log.old_values && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Before
                </label>
                <pre className="text-xs bg-red-50 p-3 rounded-lg overflow-auto max-h-48 text-red-800">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}
            {log.new_values && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">
                  After
                </label>
                <pre className="text-xs bg-green-50 p-3 rounded-lg overflow-auto max-h-48 text-green-800">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        {log.reason && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <label className="text-xs font-bold text-yellow-700 uppercase">
              Reason
            </label>
            <p className="text-sm text-yellow-800">{log.reason}</p>
          </div>
        )}

        {/* Critical Alert */}
        {log.is_critical && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="text-red-600" size={16} />
            <p className="text-sm text-red-800 font-medium">
              This is a critical audit event
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// =============================================================================
// Stats Cards Component
// =============================================================================

function AuditStats({ logs }: { logs: UnifiedAuditLog[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: logs.length,
      todayCount: logs.filter((l) => new Date(l.performed_at) >= today).length,
      criticalCount: logs.filter((l) => l.is_critical).length,
      loginCount: logs.filter((l) => l.action_type === 'login').length,
      updateCount: logs.filter((l) => l.action_type === 'update').length,
      createCount: logs.filter((l) => l.action_type === 'create').length,
    };
  }, [logs]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">
          Total Events
        </p>
        <p className="text-2xl font-black text-gray-900">{stats.total}</p>
      </div>
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">Today</p>
        <p className="text-2xl font-black text-blue-600">{stats.todayCount}</p>
      </div>
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">Critical</p>
        <p className="text-2xl font-black text-red-600">
          {stats.criticalCount}
        </p>
      </div>
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">Logins</p>
        <p className="text-2xl font-black text-cyan-600">{stats.loginCount}</p>
      </div>
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">Updates</p>
        <p className="text-2xl font-black text-blue-600">{stats.updateCount}</p>
      </div>
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase">Creates</p>
        <p className="text-2xl font-black text-green-600">
          {stats.createCount}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ComprehensiveAuditViewer() {
  const [filters, setFilters] = useState<AuditFilters>({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
    source: '',
    actionType: '',
    searchQuery: '',
    criticalOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UnifiedAuditLog | null>(null);

  const {
    data: logs = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['unified-audit-logs', filters],
    queryFn: () => fetchUnifiedAuditLogs(filters),
    staleTime: 30000,
  });

  const handleExport = () => {
    const csv = [
      [
        'Timestamp',
        'Source',
        'Action',
        'User',
        'Description',
        'IP Address',
      ].join(','),
      ...logs.map((log) =>
        [
          format(new Date(log.performed_at), 'yyyy-MM-dd HH:mm:ss'),
          getSourceLabel(log.source),
          log.action_type,
          log.user_name || 'System',
          `"${(log.description || '').replace(/"/g, '""')}"`,
          log.ip_address || '',
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-green-600" size={24} />
            Comprehensive Audit Trail
          </h2>
          <p className="text-sm text-gray-500">
            Track all system activities across patients, billing, NHIS, and user
            sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <AuditStats logs={logs} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[240px] relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by description, user, table..."
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((f) => ({ ...f, searchQuery: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={format(filters.startDate, 'yyyy-MM-dd')}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  startDate: new Date(e.target.value),
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={format(filters.endDate, 'yyyy-MM-dd')}
              onChange={(e) =>
                setFilters((f) => ({ ...f, endDate: new Date(e.target.value) }))
              }
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${
              showFilters
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, source: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">
                Action
              </label>
              <select
                value={filters.actionType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, actionType: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.criticalOnly}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      criticalOnly: e.target.checked,
                    }))
                  }
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Critical Only
                </span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    startDate: subDays(new Date(), 7),
                    endDate: new Date(),
                    source: '',
                    actionType: '',
                    searchQuery: '',
                    criticalOnly: false,
                  })
                }
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <SkeletonTable rows={10} columns={6} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Activity size={48} className="opacity-50 mb-4" />
            <p className="font-medium text-lg">No audit logs found</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={`${log.source}-${log.id}`}
                    className={`hover:bg-gray-50 cursor-pointer ${log.is_critical ? 'bg-red-50' : ''}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(
                              new Date(log.performed_at),
                              'MMM dd, HH:mm',
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(log.performed_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(log.source)}`}
                      >
                        {getSourceIcon(log.source)}
                        {getSourceLabel(log.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}
                      >
                        {getActionIcon(log.action_type)}
                        {log.action_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={12} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.user_name || 'System'}
                          </p>
                          {log.user_role && (
                            <p className="text-xs text-gray-500">
                              {log.user_role}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-sm text-gray-900 truncate">
                        {log.description || 'N/A'}
                      </p>
                      {log.table_name && (
                        <p className="text-xs text-gray-500">
                          Table: {log.table_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {log.is_critical && (
                          <AlertCircle size={16} className="text-red-500" />
                        )}
                        {log.changed_fields &&
                          log.changed_fields.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {log.changed_fields.length} fields
                            </span>
                          )}
                        <Eye size={16} className="text-gray-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
