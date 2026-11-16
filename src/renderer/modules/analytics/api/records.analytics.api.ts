// =============================================================================
// NDC MEDICAL CENTRE EMR - Medical Records (HIM) Analytics API
// Real database queries for documentation completeness, coding coverage, etc.
// =============================================================================

import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface DocumentationCompletenessScore {
  total_encounters: number;
  with_diagnosis: number;
  with_clinical_notes: number;
  with_vitals: number;
  with_prescriptions: number;
  with_lab_orders: number;
  fully_complete: number;
  completeness_score: number; // 0-100
}

export interface CodingCoverage {
  total_diagnoses: number;
  with_icd_code: number;
  without_icd_code: number;
  coverage_rate: number;
  by_department: {
    department: string;
    total: number;
    coded: number;
    rate: number;
  }[];
}

export interface MissingDocumentation {
  encounter_id: string;
  encounter_number: string;
  patient_name: string;
  patient_emr: string;
  encounter_date: string;
  doctor_name: string;
  department: string;
  missing_items: string[];
  completeness_score: number;
}

export interface RecordAccessLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  patient_name?: string;
  timestamp: string;
  ip_address?: string;
}

export interface EncounterBillingConsistency {
  total_encounters: number;
  with_billing: number;
  without_billing: number;
  billing_rate: number;
  potential_missed_revenue: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get documentation completeness score for encounters
 */
export async function getDocumentationCompleteness(
  filters: DateFilters,
): Promise<DocumentationCompletenessScore> {
  const { startDate, endDate } = filters;

  // Get all encounters in date range
  const { data: encounters, error: encError } = await supabase
    .from('visits')
    .select('id')
    .gte('check_in_time', startDate)
    .lte('check_in_time', `${endDate}T23:59:59`);

  if (encError) throw encError;

  const encounterIds = encounters?.map((e) => e.id) || [];
  const totalEncounters = encounterIds.length;

  if (totalEncounters === 0) {
    return {
      total_encounters: 0,
      with_diagnosis: 0,
      with_clinical_notes: 0,
      with_vitals: 0,
      with_prescriptions: 0,
      with_lab_orders: 0,
      fully_complete: 0,
      completeness_score: 0,
    };
  }

  // Check for consultations with diagnosis
  const { count: withDiagnosis } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .in('encounter_id', encounterIds)
    .not('diagnosis', 'is', null);

  // Check for consultations with clinical notes
  const { count: withNotes } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .in('encounter_id', encounterIds)
    .not('clinical_notes', 'is', null);

  // Check for vitals
  const { data: vitalsData } = await supabase
    .from('vitals')
    .select('encounter_id')
    .in('encounter_id', encounterIds);
  const withVitals = new Set(vitalsData?.map((v) => v.encounter_id) || []).size;

  // Check for prescriptions
  const { data: prescData } = await supabase
    .from('prescriptions')
    .select('encounter_id')
    .in('encounter_id', encounterIds);
  const withPrescriptions = new Set(prescData?.map((p) => p.encounter_id) || [])
    .size;

  // Check for lab orders
  const { data: labData } = await supabase
    .from('lab_requests')
    .select('encounter_id')
    .in('encounter_id', encounterIds);
  const withLabOrders = new Set(labData?.map((l) => l.encounter_id) || []).size;

  // Calculate fully complete (has at least diagnosis and notes)
  const { count: fullyComplete } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .in('encounter_id', encounterIds)
    .not('diagnosis', 'is', null)
    .not('clinical_notes', 'is', null);

  // Calculate completeness score (weighted)
  const weights = {
    diagnosis: 30,
    notes: 25,
    vitals: 20,
    prescriptions: 15,
    lab: 10,
  };

  const score = Math.round(
    ((withDiagnosis || 0) / totalEncounters) * weights.diagnosis +
      ((withNotes || 0) / totalEncounters) * weights.notes +
      (withVitals / totalEncounters) * weights.vitals +
      (withPrescriptions / totalEncounters) * weights.prescriptions +
      (withLabOrders / totalEncounters) * weights.lab,
  );

  return {
    total_encounters: totalEncounters,
    with_diagnosis: withDiagnosis || 0,
    with_clinical_notes: withNotes || 0,
    with_vitals: withVitals,
    with_prescriptions: withPrescriptions,
    with_lab_orders: withLabOrders,
    fully_complete: fullyComplete || 0,
    completeness_score: Math.min(100, score),
  };
}

/**
 * Get ICD coding coverage for diagnoses
 */
export async function getCodingCoverage(
  filters: DateFilters,
): Promise<CodingCoverage> {
  const { startDate, endDate } = filters;

  // Get all consultations with diagnoses
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select(
      `
      id,
      diagnosis,
      diagnosis_code,
      encounter:visits!consultations_encounter_id_fkey(
        department,
        check_in_time
      )
    `,
    )
    .not('diagnosis', 'is', null)
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) {
    // Fallback: simpler query
    const { data: simpleConsultations } = await supabase
      .from('consultations')
      .select('id, diagnosis, diagnosis_code')
      .not('diagnosis', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`);

    const total = simpleConsultations?.length || 0;
    const coded =
      simpleConsultations?.filter((c) => c.diagnosis_code)?.length || 0;

    return {
      total_diagnoses: total,
      with_icd_code: coded,
      without_icd_code: total - coded,
      coverage_rate: total > 0 ? Math.round((coded / total) * 100) : 0,
      by_department: [],
    };
  }

  const total = consultations?.length || 0;
  const coded = consultations?.filter((c) => c.diagnosis_code)?.length || 0;

  // Group by department
  const deptMap = new Map<string, { total: number; coded: number }>();
  consultations?.forEach((c) => {
    const dept = (c.encounter as any)?.department || 'Unknown';
    const existing = deptMap.get(dept) || { total: 0, coded: 0 };
    existing.total++;
    if (c.diagnosis_code) existing.coded++;
    deptMap.set(dept, existing);
  });

  const byDepartment = Array.from(deptMap.entries()).map(([dept, stats]) => ({
    department: dept,
    total: stats.total,
    coded: stats.coded,
    rate: Math.round((stats.coded / stats.total) * 100),
  }));

  return {
    total_diagnoses: total,
    with_icd_code: coded,
    without_icd_code: total - coded,
    coverage_rate: total > 0 ? Math.round((coded / total) * 100) : 0,
    by_department: byDepartment,
  };
}

/**
 * Get encounters with missing documentation
 */
export async function getMissingDocumentation(
  filters: DateFilters,
  limit: number = 50,
): Promise<MissingDocumentation[]> {
  const { startDate, endDate } = filters;

  // Get encounters
  const { data: encounters, error } = await supabase
    .from('visits')
    .select(
      `
      id,
      visit_id,
      check_in_time,
      department,
      patient:patients(first_name, surname, emr_number),
      doctor:staff!visits_attending_doctor_id_fkey(first_name, last_name)
    `,
    )
    .gte('check_in_time', startDate)
    .lte('check_in_time', `${endDate}T23:59:59`)
    .order('check_in_time', { ascending: false })
    .limit(limit * 2); // Get more to filter

  if (error) throw error;

  const encounterIds = encounters?.map((e) => e.id) || [];

  if (encounterIds.length === 0) return [];

  // Get consultations
  const { data: consultations } = await supabase
    .from('consultations')
    .select('encounter_id, diagnosis, clinical_notes')
    .in('encounter_id', encounterIds);

  // Get vitals
  const { data: vitals } = await supabase
    .from('vitals')
    .select('encounter_id')
    .in('encounter_id', encounterIds);

  const consultMap = new Map(
    consultations?.map((c) => [c.encounter_id, c]) || [],
  );
  const vitalsSet = new Set(vitals?.map((v) => v.encounter_id) || []);

  const results: MissingDocumentation[] = [];

  encounters?.forEach((enc) => {
    const consult = consultMap.get(enc.id);
    const hasVitals = vitalsSet.has(enc.id);
    const missingItems: string[] = [];

    if (!consult) {
      missingItems.push('Consultation');
    } else {
      if (!consult.diagnosis) missingItems.push('Diagnosis');
      if (!consult.clinical_notes) missingItems.push('Clinical Notes');
    }
    if (!hasVitals) missingItems.push('Vitals');

    // Only include if something is missing
    if (missingItems.length > 0) {
      const patient = enc.patient as any;
      const doctor = enc.doctor as any;

      results.push({
        encounter_id: enc.id,
        encounter_number: enc.visit_id || enc.id,
        patient_name: patient
          ? `${patient.first_name} ${patient.surname}`
          : 'Unknown',
        patient_emr: patient?.emr_number || '',
        encounter_date: enc.check_in_time,
        doctor_name: doctor
          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
          : 'Unknown',
        department: enc.department || 'Unknown',
        missing_items: missingItems,
        completeness_score: Math.round(((4 - missingItems.length) / 4) * 100),
      });
    }
  });

  return results.slice(0, limit);
}

/**
 * Get encounter to billing consistency (are all services billed?)
 */
export async function getEncounterBillingConsistency(
  filters: DateFilters,
): Promise<EncounterBillingConsistency> {
  const { startDate, endDate } = filters;

  // Get all encounters
  const { data: encounters, error: encError } = await supabase
    .from('visits')
    .select('id')
    .gte('check_in_time', startDate)
    .lte('check_in_time', `${endDate}T23:59:59`);

  if (encError) throw encError;

  const totalEncounters = encounters?.length || 0;

  if (totalEncounters === 0) {
    return {
      total_encounters: 0,
      with_billing: 0,
      without_billing: 0,
      billing_rate: 0,
      potential_missed_revenue: 0,
    };
  }

  const encounterIds = encounters?.map((e) => e.id) || [];

  // Get encounters with billing
  const { data: billedEncounters } = await supabase
    .from('invoices')
    .select('encounter_id')
    .in('encounter_id', encounterIds);

  const billedSet = new Set(billedEncounters?.map((b) => b.encounter_id) || []);
  const withBilling = billedSet.size;
  const withoutBilling = totalEncounters - withBilling;

  // Estimate missed revenue (average invoice value * unbilled encounters)
  const { data: avgInvoice } = await supabase
    .from('invoices')
    .select('total_amount')
    .limit(100);

  const avgValue =
    avgInvoice && avgInvoice.length > 0
      ? avgInvoice.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) /
        avgInvoice.length
      : 5000; // Default estimate

  return {
    total_encounters: totalEncounters,
    with_billing: withBilling,
    without_billing: withoutBilling,
    billing_rate: Math.round((withBilling / totalEncounters) * 100),
    potential_missed_revenue: Math.round(withoutBilling * avgValue),
  };
}

/**
 * Get documentation completeness by doctor
 */
export async function getDocumentationByDoctor(filters: DateFilters): Promise<
  {
    doctor_id: string;
    doctor_name: string;
    total_encounters: number;
    with_diagnosis: number;
    with_notes: number;
    completeness_rate: number;
  }[]
> {
  const { startDate, endDate } = filters;

  const { data: consultations, error } = await supabase
    .from('consultations')
    .select(
      `
      doctor_id,
      diagnosis,
      clinical_notes,
      doctor:staff!fk_consultations_doctor(id, first_name, last_name)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw error;

  // Group by doctor
  const doctorMap = new Map<
    string,
    {
      name: string;
      total: number;
      withDiagnosis: number;
      withNotes: number;
    }
  >();

  consultations?.forEach((c) => {
    if (!c.doctor_id) return;
    const doctor = c.doctor as any;
    const existing = doctorMap.get(c.doctor_id) || {
      name: doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Unknown',
      total: 0,
      withDiagnosis: 0,
      withNotes: 0,
    };

    existing.total++;
    if (c.diagnosis) existing.withDiagnosis++;
    if (c.clinical_notes) existing.withNotes++;

    doctorMap.set(c.doctor_id, existing);
  });

  return Array.from(doctorMap.entries())
    .map(([id, stats]) => ({
      doctor_id: id,
      doctor_name: stats.name,
      total_encounters: stats.total,
      with_diagnosis: stats.withDiagnosis,
      with_notes: stats.withNotes,
      completeness_rate: Math.round(
        ((stats.withDiagnosis + stats.withNotes) / (stats.total * 2)) * 100,
      ),
    }))
    .sort((a, b) => b.total_encounters - a.total_encounters);
}

/**
 * Get unsigned/incomplete documentation
 */
export async function getUnsignedDocuments(
  filters: DateFilters,
  limit: number = 50,
): Promise<
  {
    id: string;
    type: string;
    patient_name: string;
    created_at: string;
    created_by: string;
    status: string;
  }[]
> {
  const { startDate, endDate } = filters;

  // Check consultations without finalization
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select(
      `
      id,
      created_at,
      status,
      patient:patients(first_name, surname),
      doctor:staff!fk_consultations_doctor(first_name, last_name)
    `,
    )
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .neq('status', 'Finalized')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (consultations || []).map((c) => {
    const patient = c.patient as any;
    const doctor = c.doctor as any;
    return {
      id: c.id,
      type: 'Consultation',
      patient_name: patient
        ? `${patient.first_name} ${patient.surname}`
        : 'Unknown',
      created_at: c.created_at,
      created_by: doctor
        ? `Dr. ${doctor.first_name} ${doctor.last_name}`
        : 'Unknown',
      status: c.status || 'Draft',
    };
  });
}

/**
 * Get documentation trends over time
 */
export async function getDocumentationTrends(year: number): Promise<
  {
    month: string;
    total_encounters: number;
    completeness_rate: number;
    coding_rate: number;
  }[]
> {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const results = [];

  for (let month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Skip future months
    if (startDate > new Date()) break;

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Get encounters count
    const { count: totalEncounters } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_time', startStr)
      .lte('check_in_time', `${endStr}T23:59:59`);

    // Get consultations with diagnosis
    const { count: withDiagnosis } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .not('diagnosis', 'is', null)
      .gte('created_at', startStr)
      .lte('created_at', `${endStr}T23:59:59`);

    // Get consultations with ICD code
    const { count: withCode } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .not('diagnosis_code', 'is', null)
      .gte('created_at', startStr)
      .lte('created_at', `${endStr}T23:59:59`);

    const total = totalEncounters || 0;
    const diagnosed = withDiagnosis || 0;
    const coded = withCode || 0;

    results.push({
      month: months[month],
      total_encounters: total,
      completeness_rate: total > 0 ? Math.round((diagnosed / total) * 100) : 0,
      coding_rate: diagnosed > 0 ? Math.round((coded / diagnosed) * 100) : 0,
    });
  }

  return results;
}
