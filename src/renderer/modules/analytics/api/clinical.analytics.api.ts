import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface ALOSData {
  overall: number;
  byWard: { ward: string; alos: number; discharges: number }[];
}

export interface BORData {
  overall: number;
  totalBeds: number;
  occupiedBeds: number;
  byWard: {
    ward: string;
    totalBeds: number;
    occupied: number;
    available: number;
    rate: number;
  }[];
}

export interface PatientVolume {
  type: string;
  count: number;
  percentage: number;
}

export interface DoctorProductivity {
  doctorId: string;
  doctorName: string;
  consultations: number;
  revenue: number;
}

export interface MonthlyPatients {
  month: string;
  newPatients: number;
  visits: number;
}

// =============================================================================
// Clinical Analytics Functions
// =============================================================================

/**
 * Get Average Length of Stay (ALOS)
 */
export async function getALOS(filters: DateFilters): Promise<ALOSData> {
  // Get admissions with discharge dates
  const { data, error } = await supabase
    .from('nursing_care')
    .select('ward, admission_date, discharge_date')
    .not('discharge_date', 'is', null)
    .not('admission_date', 'is', null)
    .gte('discharge_date', filters.startDate)
    .lte('discharge_date', filters.endDate);

  if (error) {
    console.error('Error fetching ALOS:', error);
    return { overall: 0, byWard: [] };
  }

  const byWardMap: Record<string, { totalDays: number; count: number }> = {};
  let totalDays = 0;
  let totalCount = 0;

  (data || []).forEach((admission) => {
    const admissionDate = new Date(admission.admission_date);
    const dischargeDate = new Date(admission.discharge_date);
    const days = Math.max(
      1,
      Math.ceil(
        (dischargeDate.getTime() - admissionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const ward = admission.ward || 'Unknown';
    if (!byWardMap[ward]) byWardMap[ward] = { totalDays: 0, count: 0 };
    byWardMap[ward].totalDays += days;
    byWardMap[ward].count++;

    totalDays += days;
    totalCount++;
  });

  return {
    overall:
      totalCount > 0 ? Math.round((totalDays / totalCount) * 10) / 10 : 0,
    byWard: Object.entries(byWardMap).map(([ward, data]) => ({
      ward,
      alos: Math.round((data.totalDays / data.count) * 10) / 10,
      discharges: data.count,
    })),
  };
}

/**
 * Get Bed Occupancy Rate (BOR)
 */
export async function getBOR(): Promise<BORData> {
  // Get wards with bed counts
  const { data: wards, error: wardError } = await supabase
    .from('wards')
    .select('id, name, total_beds');

  if (wardError) {
    console.error('Error fetching wards:', wardError);
    // Fallback to nursing_care based calculation
    return getBORFromNursingCare();
  }

  // Get active admissions
  const { data: admissions } = await supabase
    .from('nursing_care')
    .select('ward')
    .is('discharge_date', null)
    .not('ward', 'is', null);

  const occupiedByWard: Record<string, number> = {};
  (admissions || []).forEach((a) => {
    const ward = a.ward || 'Unknown';
    occupiedByWard[ward] = (occupiedByWard[ward] || 0) + 1;
  });

  let totalBeds = 0;
  let totalOccupied = 0;

  const byWard = (wards || []).map((w) => {
    const occupied = occupiedByWard[w.name] || 0;
    totalBeds += w.total_beds || 0;
    totalOccupied += occupied;

    return {
      ward: w.name,
      totalBeds: w.total_beds || 0,
      occupied,
      available: (w.total_beds || 0) - occupied,
      rate: w.total_beds > 0 ? Math.round((occupied / w.total_beds) * 100) : 0,
    };
  });

  return {
    overall: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0,
    totalBeds,
    occupiedBeds: totalOccupied,
    byWard,
  };
}

/**
 * Fallback BOR calculation from nursing_care
 */
async function getBORFromNursingCare(): Promise<BORData> {
  const { data: admissions } = await supabase
    .from('nursing_care')
    .select('ward, bed_number')
    .is('discharge_date', null)
    .not('ward', 'is', null);

  const occupiedByWard: Record<string, Set<string>> = {};
  (admissions || []).forEach((a) => {
    const ward = a.ward || 'Unknown';
    if (!occupiedByWard[ward]) occupiedByWard[ward] = new Set();
    if (a.bed_number) occupiedByWard[ward].add(a.bed_number);
  });

  // Estimate beds per ward (assuming 20 beds per ward as default)
  const ESTIMATED_BEDS_PER_WARD = 20;
  const byWard = Object.entries(occupiedByWard).map(([ward, beds]) => ({
    ward,
    totalBeds: ESTIMATED_BEDS_PER_WARD,
    occupied: beds.size,
    available: ESTIMATED_BEDS_PER_WARD - beds.size,
    rate: Math.round((beds.size / ESTIMATED_BEDS_PER_WARD) * 100),
  }));

  const totalBeds = byWard.length * ESTIMATED_BEDS_PER_WARD;
  const totalOccupied = byWard.reduce((sum, w) => sum + w.occupied, 0);

  return {
    overall: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0,
    totalBeds,
    occupiedBeds: totalOccupied,
    byWard,
  };
}

/**
 * Get patient volume by type (OPD/IPD/Emergency)
 */
export async function getPatientVolume(
  filters: DateFilters,
): Promise<PatientVolume[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('visit_type, patient_type')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching patient volume:', error);
    return [];
  }

  const byType: Record<string, number> = {
    OPD: 0,
    SOPD: 0,
    IPD: 0,
    Emergency: 0,
  };

  (data || []).forEach((v) => {
    const type = v.visit_type || v.patient_type || 'OPD';
    if (byType[type] !== undefined) {
      byType[type]++;
    } else {
      byType.OPD++;
    }
  });

  const total = Object.values(byType).reduce((sum, count) => sum + count, 0);

  return Object.entries(byType).map(([type, count]) => ({
    type,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

/**
 * Get doctor productivity metrics
 */
export async function getDoctorProductivity(
  filters: DateFilters,
): Promise<DoctorProductivity[]> {
  // Get consultations with doctor info
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('doctor_id, profiles!consultations_doctor_id_fkey(full_name)')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching doctor productivity:', error);
    return [];
  }

  // Get revenue by doctor
  const { data: billing } = await supabase
    .from('billing_orders')
    .select('doctor_id, net_amount')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  const doctorMap: Record<
    string,
    { name: string; consultations: number; revenue: number }
  > = {};

  (consultations || []).forEach((c) => {
    const id = c.doctor_id || 'unknown';
    const name = (c.profiles as any)?.full_name || 'Unknown Doctor';
    if (!doctorMap[id]) doctorMap[id] = { name, consultations: 0, revenue: 0 };
    doctorMap[id].consultations++;
  });

  (billing || []).forEach((b) => {
    const id = b.doctor_id || 'unknown';
    if (doctorMap[id]) {
      doctorMap[id].revenue += b.net_amount || 0;
    }
  });

  return Object.entries(doctorMap)
    .map(([doctorId, data]) => ({
      doctorId,
      doctorName: data.name,
      consultations: data.consultations,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.consultations - a.consultations)
    .slice(0, 20);
}

/**
 * Get monthly patient trends for a year
 */
export async function getMonthlyPatientTrends(
  year: number,
): Promise<MonthlyPatients[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Get new patient registrations
  const { data: patients } = await supabase
    .from('patients')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get visits
  const { data: visits } = await supabase
    .from('visits')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

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
  const monthlyPatients: number[] = Array(12).fill(0);
  const monthlyVisits: number[] = Array(12).fill(0);

  (patients || []).forEach((p) => {
    const month = new Date(p.created_at).getMonth();
    monthlyPatients[month]++;
  });

  (visits || []).forEach((v) => {
    const month = new Date(v.created_at).getMonth();
    monthlyVisits[month]++;
  });

  return months.map((month, i) => ({
    month,
    newPatients: monthlyPatients[i],
    visits: monthlyVisits[i],
  }));
}

/**
 * Get queue distribution by department
 */
export async function getQueueDistribution(): Promise<
  {
    department: string;
    waiting: number;
    inProgress: number;
    completed: number;
    avgWaitMinutes: number;
  }[]
> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('queue')
    .select('location, status, created_at, called_at')
    .gte('created_at', today);

  if (error) {
    console.error('Error fetching queue distribution:', error);
    return [];
  }

  const byDept: Record<
    string,
    {
      waiting: number;
      inProgress: number;
      completed: number;
      waitTimes: number[];
    }
  > = {};

  (data || []).forEach((q) => {
    const dept = q.location || 'Unknown';
    if (!byDept[dept]) {
      byDept[dept] = { waiting: 0, inProgress: 0, completed: 0, waitTimes: [] };
    }

    if (q.status === 'Waiting' || q.status === 'Called') {
      byDept[dept].waiting++;
    } else if (q.status === 'In Progress') {
      byDept[dept].inProgress++;
    } else if (q.status === 'Completed') {
      byDept[dept].completed++;
    }

    // Calculate wait time
    if (q.created_at && q.called_at) {
      const waitMs =
        new Date(q.called_at).getTime() - new Date(q.created_at).getTime();
      const waitMins = Math.round(waitMs / 60000);
      if (waitMins >= 0) byDept[dept].waitTimes.push(waitMins);
    }
  });

  return Object.entries(byDept).map(([department, data]) => ({
    department,
    waiting: data.waiting,
    inProgress: data.inProgress,
    completed: data.completed,
    avgWaitMinutes:
      data.waitTimes.length > 0
        ? Math.round(
            data.waitTimes.reduce((a, b) => a + b, 0) / data.waitTimes.length,
          )
        : 0,
  }));
}

/**
 * Get readmission rate (patients readmitted within 30 days)
 */
export async function getReadmissionRate(filters: DateFilters): Promise<{
  totalDischarges: number;
  readmissions: number;
  rate: number;
}> {
  // Get discharges in the period
  const { data: discharges } = await supabase
    .from('nursing_care')
    .select('patient_id, discharge_date')
    .not('discharge_date', 'is', null)
    .gte('discharge_date', filters.startDate)
    .lte('discharge_date', filters.endDate);

  if (!discharges || discharges.length === 0) {
    return { totalDischarges: 0, readmissions: 0, rate: 0 };
  }

  // Check for readmissions within 30 days
  let readmissions = 0;
  for (const discharge of discharges) {
    const thirtyDaysLater = new Date(discharge.discharge_date);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const { count } = await supabase
      .from('nursing_care')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', discharge.patient_id)
      .gt('admission_date', discharge.discharge_date)
      .lte('admission_date', thirtyDaysLater.toISOString());

    if (count && count > 0) readmissions++;
  }

  return {
    totalDischarges: discharges.length,
    readmissions,
    rate:
      discharges.length > 0
        ? Math.round((readmissions / discharges.length) * 100)
        : 0,
  };
}

/**
 * Get mortality rate
 */
export async function getMortalityRate(filters: DateFilters): Promise<{
  totalDischarges: number;
  deaths: number;
  rate: number;
}> {
  // Get all discharges
  const { count: totalDischarges } = await supabase
    .from('nursing_care')
    .select('*', { count: 'exact', head: true })
    .not('discharge_date', 'is', null)
    .gte('discharge_date', filters.startDate)
    .lte('discharge_date', filters.endDate);

  // Get deaths (assuming discharge_reason or status indicates death)
  const { count: deaths } = await supabase
    .from('nursing_care')
    .select('*', { count: 'exact', head: true })
    .not('discharge_date', 'is', null)
    .eq('discharge_reason', 'Deceased')
    .gte('discharge_date', filters.startDate)
    .lte('discharge_date', filters.endDate);

  return {
    totalDischarges: totalDischarges || 0,
    deaths: deaths || 0,
    rate:
      totalDischarges && totalDischarges > 0
        ? Math.round(((deaths || 0) / totalDischarges) * 1000) / 10
        : 0,
  };
}
