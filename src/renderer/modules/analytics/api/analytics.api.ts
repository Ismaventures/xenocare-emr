import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface SummaryStats {
  registrations: number;
  discharges: number;
  dama: number;
  admissions: number;
  encountersByDepartment: { department: string; count: number }[];
  encountersByClinic: { clinic: string; count: number }[];
  labOrders: number;
  imagingOrders: number;
}

export interface DashboardStats {
  patients: {
    total: number;
    newToday: number;
    newThisMonth: number;
    byGender: { male: number; female: number };
  };
  consultations: {
    today: number;
    thisMonth: number;
    pending: number;
  };
  laboratory: {
    pending: number;
    completedToday: number;
    totalThisMonth: number;
  };
  radiology: {
    pending: number;
    completedToday: number;
    totalThisMonth: number;
  };
  pharmacy: {
    dispensedToday: number;
    pendingPrescriptions: number;
    lowStockItems: number;
  };
  billing: {
    revenueToday: number;
    revenueThisMonth: number;
    outstanding: number;
  };
  queue: {
    waiting: number;
    inProgress: number;
    completedToday: number;
  };
  operational: {
    labAverageTurnaroundMinutes: number;
    labAverageTurnaroundHours: number;
    labTargetHours: number;
    labWithinTargetRate: number;
    consultationAverageWaitMinutes: number;
    consultationWaitTargetMinutes: number;
    inactiveDoctors: number;
    doctorPerformance: {
      doctorId: string;
      doctorName: string;
      status: 'Active' | 'Inactive';
      consultations: number;
      avgConsultationWaitMinutes: number | null;
      throughputScore: number;
      waitScore: number;
      performanceScore: number;
    }[];
  };
  discharges: number;
  dama: number;
  encountersByDepartment: { department: string; count: number }[];
  encountersByClinic: { clinic: string; count: number }[];
  labOrders: number;
  imagingOrders: number;
  admissions: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  department?: string;
  type?: string;
}

export interface ModuleReport {
  title: string;
  data: any[];
  summary: Record<string, number | string>;
}

// =============================================================================
// Dashboard Analytics
// =============================================================================

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().setDate(1))
    .toISOString()
    .split('T')[0];
  const LAB_TAT_TARGET_MINUTES = 150; // 2.5 hours target
  const CONSULTATION_WAIT_TARGET_MINUTES = 30;

  // Patients
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  const { count: newPatientsToday } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { count: newPatientsMonth } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfMonth);

  const { count: malePatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('gender', 'Male');

  const { count: femalePatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('gender', 'Female');

  // Consultations
  const { count: consultationsToday } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { count: consultationsMonth } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfMonth);

  const { count: pendingConsultations } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'In Progress');

  // Laboratory
  const { count: pendingLabTests } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Ordered', 'Sample Collected', 'In Progress']);

  const { count: labCompletedToday } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('completed_at', today);

  const { count: labTotalMonth } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfMonth);

  // Radiology
  const { count: pendingRadiology } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Ordered', 'Scheduled', 'In Progress']);

  const { count: radiologyCompletedToday } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Reported')
    .gte('completed_at', today);

  const { count: radiologyTotalMonth } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfMonth);

  // Pharmacy
  const { count: dispensedToday } = await supabase
    .from('prescriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Dispensed')
    .gte('updated_at', today);

  const { count: pendingPrescriptions } = await supabase
    .from('prescriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Active', 'Partial']);

  const { count: lowStockItems } = await supabase
    .from('pharmacy_inventory')
    .select('*', { count: 'exact', head: true })
    .lte('quantity', 50); // Threshold for low stock

  // Billing
  const { data: revenueData } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', today);
  const revenueToday = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const { data: revenueMonthData } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', firstOfMonth);
  const revenueThisMonth =
    revenueMonthData?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const { data: outstandingData } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', ['Pending', 'Partial']);
  const outstanding =
    outstandingData?.reduce((sum, inv) => sum + inv.balance, 0) || 0;

  // Queue
  const { count: queueWaiting } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Waiting', 'Called'])
    .gte('created_at', today);

  const { count: queueInProgress } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'In Progress')
    .gte('created_at', today);

  const { count: queueCompletedToday } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('created_at', today);

  // Operational KPIs (month-to-date)
  const { data: completedLabRequests } = await supabase
    .from('lab_requests')
    .select('created_at, completed_at')
    .eq('status', 'Completed')
    .not('completed_at', 'is', null)
    .gte('created_at', firstOfMonth);

  const labTatMinutes: number[] = [];
  (completedLabRequests || []).forEach((req) => {
    if (!req.created_at || !req.completed_at) return;
    const tat = Math.round(
      (new Date(req.completed_at).getTime() -
        new Date(req.created_at).getTime()) /
        60000,
    );
    if (tat >= 0 && tat < 10000) {
      labTatMinutes.push(tat);
    }
  });

  const labAverageTurnaroundMinutes =
    labTatMinutes.length > 0
      ? Math.round(
          labTatMinutes.reduce((sum, mins) => sum + mins, 0) /
            labTatMinutes.length,
        )
      : 0;
  const labAverageTurnaroundHours =
    Math.round((labAverageTurnaroundMinutes / 60) * 10) / 10;
  const labWithinTargetRate =
    labTatMinutes.length > 0
      ? Math.round(
          (labTatMinutes.filter((mins) => mins <= LAB_TAT_TARGET_MINUTES)
            .length /
            labTatMinutes.length) *
            100,
        )
      : 0;

  const { data: consultationQueueRows } = await supabase
    .from('queue')
    .select(
      'assigned_to, created_at, called_at, consultation_start_time, location',
    )
    .eq('location', 'Consultation')
    .gte('created_at', firstOfMonth);

  const consultationWaitSamples: number[] = [];
  const waitSamplesByDoctorId: Record<string, number[]> = {};
  (consultationQueueRows || []).forEach((q) => {
    if (!q.created_at) return;
    const waitEnd = q.consultation_start_time || q.called_at;
    if (!waitEnd) return;

    const waitMins = Math.round(
      (new Date(waitEnd).getTime() - new Date(q.created_at).getTime()) / 60000,
    );
    if (waitMins < 0 || waitMins > 1000) return;

    consultationWaitSamples.push(waitMins);
    if (q.assigned_to) {
      if (!waitSamplesByDoctorId[q.assigned_to]) {
        waitSamplesByDoctorId[q.assigned_to] = [];
      }
      waitSamplesByDoctorId[q.assigned_to].push(waitMins);
    }
  });

  const consultationAverageWaitMinutes =
    consultationWaitSamples.length > 0
      ? Math.round(
          consultationWaitSamples.reduce((sum, mins) => sum + mins, 0) /
            consultationWaitSamples.length,
        )
      : 0;

  const { data: doctors } = await supabase
    .from('staff')
    .select('id, staff_id, first_name, last_name')
    .eq('role', 'doctor');

  const { data: consultationsForDoctors } = await supabase
    .from('consultations')
    .select('doctor_id')
    .gte('created_at', firstOfMonth);

  const consultCountByDoctorKey: Record<string, number> = {};
  (consultationsForDoctors || []).forEach((consultation) => {
    const key = consultation.doctor_id;
    if (!key) return;
    consultCountByDoctorKey[key] = (consultCountByDoctorKey[key] || 0) + 1;
  });

  const maxConsultations = Math.max(
    1,
    ...(doctors || []).map((doc) => {
      const byStaffId = doc.staff_id
        ? consultCountByDoctorKey[doc.staff_id] || 0
        : 0;
      const byId = consultCountByDoctorKey[doc.id] || 0;
      return Math.max(byStaffId, byId);
    }),
  );

  const doctorPerformance = (doctors || [])
    .map((doctor) => {
      const byStaffId = doctor.staff_id
        ? consultCountByDoctorKey[doctor.staff_id] || 0
        : 0;
      const byId = consultCountByDoctorKey[doctor.id] || 0;
      const consultations = Math.max(byStaffId, byId);
      const doctorWaits = waitSamplesByDoctorId[doctor.id] || [];
      const avgConsultationWaitMinutes =
        doctorWaits.length > 0
          ? Math.round(
              doctorWaits.reduce((sum, mins) => sum + mins, 0) /
                doctorWaits.length,
            )
          : null;

      const throughputScore = Math.round(
        (consultations / maxConsultations) * 100,
      );
      const rawWaitScore =
        avgConsultationWaitMinutes === null
          ? consultations > 0
            ? 60
            : 50
          : Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (1 -
                    avgConsultationWaitMinutes /
                      (CONSULTATION_WAIT_TARGET_MINUTES * 2)) *
                    100,
                ),
              ),
            );

      const status: 'Active' | 'Inactive' =
        consultations > 0 ? 'Active' : 'Inactive';
      const performanceScore =
        status === 'Inactive'
          ? 50
          : Math.round(rawWaitScore * 0.6 + throughputScore * 0.4);

      return {
        doctorId: doctor.id,
        doctorName:
          `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() ||
          'Unknown Doctor',
        status,
        consultations,
        avgConsultationWaitMinutes,
        throughputScore,
        waitScore: rawWaitScore,
        performanceScore,
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      if (b.performanceScore !== a.performanceScore) {
        return b.performanceScore - a.performanceScore;
      }
      return a.doctorName.localeCompare(b.doctorName);
    });

  const inactiveDoctors = doctorPerformance.filter(
    (doctor) => doctor.status === 'Inactive',
  ).length;

  // Discharges (Completed Visits)
  const { count: discharges } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('updated_at', today);

  // DAMA (Placeholder)
  const dama = 0;

  // Encounters By Department (Queue)
  const { data: queueData } = await supabase
    .from('queue')
    .select('location')
    .gte('created_at', today);

  const deptCounts: Record<string, number> = {};
  queueData?.forEach((q) => {
    const dept = q.location || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const encountersByDepartment = Object.entries(deptCounts).map(
    ([department, count]) => ({ department, count }),
  );

  // Encounters By Clinic (Visits)
  const { data: visitData } = await supabase
    .from('visits')
    .select('visit_type')
    .gte('created_at', today);

  const clinicCounts: Record<string, number> = {};
  visitData?.forEach((v) => {
    clinicCounts[v.visit_type] = (clinicCounts[v.visit_type] || 0) + 1;
  });
  const encountersByClinic = Object.entries(clinicCounts).map(
    ([clinic, count]) => ({ clinic, count }),
  );

  // Lab Orders (Total)
  const { count: labOrders } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  // Imaging Orders (Total)
  const { count: imagingOrders } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  // Admissions (Inpatient visits or nursing care entries)
  const { count: admissions } = await supabase
    .from('nursing_care')
    .select('*', { count: 'exact', head: true })
    .not('ward', 'is', null)
    .gte('created_at', today);

  return {
    patients: {
      total: totalPatients || 0,
      newToday: newPatientsToday || 0,
      newThisMonth: newPatientsMonth || 0,
      byGender: {
        male: malePatients || 0,
        female: femalePatients || 0,
      },
    },
    consultations: {
      today: consultationsToday || 0,
      thisMonth: consultationsMonth || 0,
      pending: pendingConsultations || 0,
    },
    laboratory: {
      pending: pendingLabTests || 0,
      completedToday: labCompletedToday || 0,
      totalThisMonth: labTotalMonth || 0,
    },
    radiology: {
      pending: pendingRadiology || 0,
      completedToday: radiologyCompletedToday || 0,
      totalThisMonth: radiologyTotalMonth || 0,
    },
    pharmacy: {
      dispensedToday: dispensedToday || 0,
      pendingPrescriptions: pendingPrescriptions || 0,
      lowStockItems: lowStockItems || 0,
    },
    billing: {
      revenueToday,
      revenueThisMonth,
      outstanding,
    },
    queue: {
      waiting: queueWaiting || 0,
      inProgress: queueInProgress || 0,
      completedToday: queueCompletedToday || 0,
    },
    operational: {
      labAverageTurnaroundMinutes,
      labAverageTurnaroundHours,
      labTargetHours: LAB_TAT_TARGET_MINUTES / 60,
      labWithinTargetRate,
      consultationAverageWaitMinutes,
      consultationWaitTargetMinutes: CONSULTATION_WAIT_TARGET_MINUTES,
      inactiveDoctors,
      doctorPerformance,
    },
    discharges: discharges || 0,
    dama,
    encountersByDepartment,
    encountersByClinic,
    labOrders: labOrders || 0,
    imagingOrders: imagingOrders || 0,
    admissions: admissions || 0,
  };
}

/**
 * Get patient registration trends
 */
export async function getPatientTrends(
  days: number = 30,
): Promise<TrendData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('patients')
    .select('created_at')
    .gte('created_at', startDate.toISOString());

  // Group by date
  const grouped: Record<string, number> = {};
  data?.forEach((patient) => {
    const date = patient.created_at.split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });

  // Generate full date range
  const trends: TrendData[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({
      date: dateStr,
      value: grouped[dateStr] || 0,
    });
  }

  return trends;
}

/**
 * Get revenue trends
 */
export async function getRevenueTrends(
  days: number = 30,
): Promise<TrendData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('payments')
    .select('amount, created_at')
    .gte('created_at', startDate.toISOString());

  // Group by date
  const grouped: Record<string, number> = {};
  data?.forEach((payment) => {
    const date = payment.created_at.split('T')[0];
    grouped[date] = (grouped[date] || 0) + payment.amount;
  });

  // Generate full date range
  const trends: TrendData[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({
      date: dateStr,
      value: grouped[dateStr] || 0,
    });
  }

  return trends;
}

/**
 * Get department statistics
 */
export async function getDepartmentStats(): Promise<
  { department: string; count: number }[]
> {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('queue')
    .select('location')
    .gte('created_at', today);

  const counts: Record<string, number> = {};
  data?.forEach((q) => {
    const dept = q.location || 'Unknown';
    counts[dept] = (counts[dept] || 0) + 1;
  });

  return Object.entries(counts).map(([department, count]) => ({
    department,
    count,
  }));
}

/**
 * Get top diagnoses
 */
export async function getTopDiagnoses(
  limit: number = 10,
): Promise<{ diagnosis: string; count: number }[]> {
  const { data } = await supabase
    .from('consultations')
    .select('diagnosis')
    .not('diagnosis', 'is', null);

  const counts: Record<string, number> = {};
  data?.forEach((c) => {
    if (c.diagnosis) {
      counts[c.diagnosis] = (counts[c.diagnosis] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([diagnosis, count]) => ({ diagnosis, count }));
}

/**
 * Get most ordered lab tests
 */
export async function getTopLabTests(
  limit: number = 10,
): Promise<{ test_name: string; count: number }[]> {
  const { data } = await supabase.from('lab_requests').select('test_name');

  const counts: Record<string, number> = {};
  data?.forEach((r) => {
    counts[r.test_name] = (counts[r.test_name] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([test_name, count]) => ({ test_name, count }));
}

/**
 * Get most dispensed medications
 */
export async function getTopMedications(
  limit: number = 10,
): Promise<{ medication: string; count: number }[]> {
  const { data } = await supabase
    .from('prescription_items')
    .select('medication_name');

  const counts: Record<string, number> = {};
  data?.forEach((item) => {
    counts[item.medication_name] = (counts[item.medication_name] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([medication, count]) => ({ medication, count }));
}

/**
 * Get summary stats for a specific month
 */
export async function getSummaryStats(
  year: number,
  month: number,
): Promise<SummaryStats> {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Registrations
  const { count: registrations } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Discharges
  const { count: discharges } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('updated_at', startDate)
    .lte('updated_at', endDate);

  // DAMA (visits cancelled - could track separately)
  const { count: dama } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Cancelled')
    .gte('updated_at', startDate)
    .lte('updated_at', endDate);

  // Admissions
  const { count: admissions } = await supabase
    .from('nursing_care')
    .select('*', { count: 'exact', head: true })
    .not('ward', 'is', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Encounters By Department
  const { data: queueData } = await supabase
    .from('queue')
    .select('location')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const deptCounts: Record<string, number> = {};
  queueData?.forEach((q) => {
    const dept = q.location || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const encountersByDepartment = Object.entries(deptCounts).map(
    ([department, count]) => ({ department, count }),
  );

  // Encounters By Clinic
  const { data: visitData } = await supabase
    .from('visits')
    .select('visit_type')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const clinicCounts: Record<string, number> = {};
  visitData?.forEach((v) => {
    clinicCounts[v.visit_type] = (clinicCounts[v.visit_type] || 0) + 1;
  });
  const encountersByClinic = Object.entries(clinicCounts).map(
    ([clinic, count]) => ({ clinic, count }),
  );

  // Lab Orders
  const { count: labOrders } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Imaging Orders
  const { count: imagingOrders } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return {
    registrations: registrations || 0,
    discharges: discharges || 0,
    dama: dama || 0,
    admissions: admissions || 0,
    encountersByDepartment,
    encountersByClinic,
    labOrders: labOrders || 0,
    imagingOrders: imagingOrders || 0,
  };
}

// =============================================================================
// Billing Analytics (New)
// =============================================================================

export interface RevenueByPaymentMethod {
  payment_method: string;
  count: number;
  total_amount: number;
  percentage: number;
}

export interface OutstandingNHISClaims {
  total_claims: number;
  total_amount: number;
  by_date: { date: string; count: number; amount: number }[];
}

export interface DepartmentWaitTimes {
  department: string;
  avg_wait_minutes: number;
  min_wait_minutes: number;
  max_wait_minutes: number;
  total_served: number;
}

/**
 * Get daily revenue breakdown by payment method
 */
export async function getRevenueByPaymentMethod(
  date?: string,
): Promise<RevenueByPaymentMethod[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('billing_orders')
    .select('payment_method, net_amount, status, updated_at')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'])
    .gte('updated_at', targetDate)
    .lt('updated_at', nextDateStr);

  if (error) {
    console.error('Error fetching revenue by payment method:', error);
    return [];
  }

  // Group by payment method
  const grouped: Record<string, { count: number; total: number }> = {};
  let grandTotal = 0;

  (data || []).forEach((order) => {
    const method = order.payment_method || 'Unknown';
    if (!grouped[method]) {
      grouped[method] = { count: 0, total: 0 };
    }
    grouped[method].count++;
    const amount = order.net_amount || 0;
    grouped[method].total += amount;
    grandTotal += amount;
  });

  return Object.entries(grouped).map(([payment_method, stats]) => ({
    payment_method,
    count: stats.count,
    total_amount: stats.total,
    percentage: grandTotal > 0 ? (stats.total / grandTotal) * 100 : 0,
  }));
}

/**
 * Get outstanding NHIS claims
 */
export async function getOutstandingNHISClaims(): Promise<OutstandingNHISClaims> {
  // Get all paid NHIS orders that might need claiming
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      'id, status, net_amount, created_at, updated_at, receipts(receipt_number, issue_date)',
    )
    .eq('status', 'Paid_NHIS')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching NHIS claims:', error);
    return { total_claims: 0, total_amount: 0, by_date: [] };
  }

  const totalClaims = data?.length || 0;
  const totalAmount = (data || []).reduce(
    (sum, o) => sum + (o.net_amount || 0),
    0,
  );

  // Group by date
  const byDateMap: Record<string, { count: number; amount: number }> = {};
  (data || []).forEach((order) => {
    const receiptIssueDate = order.receipts?.[0]?.issue_date;
    const dateSource = receiptIssueDate || order.updated_at || order.created_at;
    const date = (dateSource || '').split('T')[0] || 'Unknown';
    if (!byDateMap[date]) {
      byDateMap[date] = { count: 0, amount: 0 };
    }
    byDateMap[date].count++;
    byDateMap[date].amount += order.net_amount || 0;
  });

  const byDate = Object.entries(byDateMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30); // Last 30 days

  return {
    total_claims: totalClaims,
    total_amount: totalAmount,
    by_date: byDate,
  };
}

/**
 * Get average wait times by department
 */
export async function getDepartmentWaitTimes(): Promise<DepartmentWaitTimes[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('queue')
    .select('location, created_at, called_at, completed_at, status')
    .eq('status', 'Completed')
    .gte('created_at', today);

  if (error) {
    console.error('Error fetching wait times:', error);
    return [];
  }

  // Group by department and calculate wait times
  const deptStats: Record<string, { waits: number[]; total: number }> = {};

  (data || []).forEach((entry) => {
    const dept = entry.location || 'Unknown';
    if (!deptStats[dept]) {
      deptStats[dept] = { waits: [], total: 0 };
    }

    // Calculate wait time in minutes (from created to called)
    if (entry.created_at && entry.called_at) {
      const created = new Date(entry.created_at);
      const called = new Date(entry.called_at);
      const waitMs = called.getTime() - created.getTime();
      const waitMins = Math.round(waitMs / 60000);
      if (waitMins >= 0) {
        deptStats[dept].waits.push(waitMins);
        deptStats[dept].total++;
      }
    }
  });

  return Object.entries(deptStats).map(([department, stats]) => {
    const { waits } = stats;
    const avg =
      waits.length > 0 ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
    const min = waits.length > 0 ? Math.min(...waits) : 0;
    const max = waits.length > 0 ? Math.max(...waits) : 0;

    return {
      department,
      avg_wait_minutes: Math.round(avg),
      min_wait_minutes: min,
      max_wait_minutes: max,
      total_served: stats.total,
    };
  });
}

/**
 * Get billing summary for a date range
 */
export async function getBillingSummary(
  startDate: string,
  endDate: string,
): Promise<{
  total_orders: number;
  total_revenue: number;
  pending_payments: number;
  by_source_module: { module: string; count: number; amount: number }[];
  by_payment_status: { status: string; count: number; amount: number }[];
}> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select('source_module, status, net_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) {
    console.error('Error fetching billing summary:', error);
    return {
      total_orders: 0,
      total_revenue: 0,
      pending_payments: 0,
      by_source_module: [],
      by_payment_status: [],
    };
  }

  const orders = data || [];
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'Pending' && o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.net_amount || 0), 0);
  const pendingPayments = orders
    .filter((o) => o.status === 'Pending')
    .reduce((sum, o) => sum + (o.net_amount || 0), 0);

  // Group by source module
  const moduleMap: Record<string, { count: number; amount: number }> = {};
  orders.forEach((o) => {
    const mod = o.source_module || 'other';
    if (!moduleMap[mod]) moduleMap[mod] = { count: 0, amount: 0 };
    moduleMap[mod].count++;
    moduleMap[mod].amount += o.net_amount || 0;
  });
  const bySourceModule = Object.entries(moduleMap).map(([module, stats]) => ({
    module,
    ...stats,
  }));

  // Group by payment status
  const statusMap: Record<string, { count: number; amount: number }> = {};
  orders.forEach((o) => {
    const status = o.status || 'Unknown';
    if (!statusMap[status]) statusMap[status] = { count: 0, amount: 0 };
    statusMap[status].count++;
    statusMap[status].amount += o.net_amount || 0;
  });
  const byPaymentStatus = Object.entries(statusMap).map(([status, stats]) => ({
    status,
    ...stats,
  }));

  return {
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    pending_payments: pendingPayments,
    by_source_module: bySourceModule,
    by_payment_status: byPaymentStatus,
  };
}
