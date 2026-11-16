/**
 * Clinical Export System - Analytics Engine
 * XENOCARE EMR
 *
 * Clinical, operational, and financial analytics calculations
 * Following healthcare reporting standards
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { PatientJourneyExport, MultiPatientExport } from '../api';
import type {
  DiseasePrevalenceStats,
  VisitVolumeStats,
  ADTStats,
  LOSStats,
  ReadmissionStats,
  PatientFlowStats,
  WaitTimeStats,
  BedOccupancyStats,
  RevenueStats,
  CombinedAnalytics,
  ChartConfig,
} from '../types';
import { getICD10ChapterTitle, getICD10ChapterCode } from '../standards';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate percentage
 */
function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

/**
 * Calculate average
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
  );
}

/**
 * Calculate median
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const squareDiffs = values.map((value) => (value - avg) ** 2);
  return Math.round(Math.sqrt(average(squareDiffs)) * 100) / 100;
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get month key from date
 */
function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get week key from date
 */
function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get day key from date
 */
function getDayKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// ==================== CLINICAL ANALYTICS ====================

/**
 * Calculate disease prevalence statistics
 */
export function calculateDiseasePrevalence(
  exports: PatientJourneyExport[],
): DiseasePrevalenceStats {
  const allDiagnoses = exports.flatMap((e) => e.diagnoses);
  const totalDiagnoses = allDiagnoses.length;
  const uniquePatients = new Set(exports.map((e) => e.patient.id)).size;

  // ICD-10 code frequency
  const icd10Counts = new Map<string, number>();
  const icd10Names = new Map<string, string>();

  for (const dx of allDiagnoses) {
    if (dx.icd10_code) {
      const count = icd10Counts.get(dx.icd10_code) || 0;
      icd10Counts.set(dx.icd10_code, count + 1);
      if (!icd10Names.has(dx.icd10_code)) {
        icd10Names.set(dx.icd10_code, dx.diagnosis_text);
      }
    }
  }

  // ICD-10 chapter distribution
  const chapterCounts = new Map<string, number>();
  for (const dx of allDiagnoses) {
    const chapter = getICD10ChapterCode(dx.icd10_code);
    if (chapter) {
      const count = chapterCounts.get(chapter) || 0;
      chapterCounts.set(chapter, count + 1);
    }
  }

  // Top diagnoses
  const topDiagnoses = Array.from(icd10Counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([code, count]) => ({
      icd10_code: code,
      diagnosis_text: icd10Names.get(code) || code,
      count,
      percentage: percentage(count, totalDiagnoses),
      prevalence_per_1000:
        Math.round((count / uniquePatients) * 1000 * 100) / 100,
    }));

  // By diagnosis type
  const primaryCount = allDiagnoses.filter(
    (d) => d.diagnosis_type === 'primary',
  ).length;
  const secondaryCount = allDiagnoses.filter(
    (d) => d.diagnosis_type === 'secondary',
  ).length;

  // By chapter
  const byChapter = Array.from(chapterCounts.entries())
    .map(([chapter, count]) => ({
      chapter,
      chapter_name: getICD10ChapterTitle(`${chapter}00`) || chapter,
      count,
      percentage: percentage(count, totalDiagnoses),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDiagnoses,
    uniquePatients,
    topDiagnoses,
    byDiagnosisType: {
      primary: {
        count: primaryCount,
        percentage: percentage(primaryCount, totalDiagnoses),
      },
      secondary: {
        count: secondaryCount,
        percentage: percentage(secondaryCount, totalDiagnoses),
      },
    },
    byICD10Chapter: byChapter,
    timeSeriesData: calculateDiagnosisTrend(allDiagnoses),
  };
}

/**
 * Calculate diagnosis trend over time
 */
function calculateDiagnosisTrend(
  diagnoses: PatientJourneyExport['diagnoses'],
): {
  period: string;
  count: number;
}[] {
  const byMonth = new Map<string, number>();

  for (const dx of diagnoses) {
    if (dx.diagnosed_at) {
      const month = getMonthKey(dx.diagnosed_at);
      const count = byMonth.get(month) || 0;
      byMonth.set(month, count + 1);
    }
  }

  return Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, count]) => ({ period, count }));
}

// ==================== VISIT VOLUME ANALYTICS ====================

/**
 * Calculate visit volume statistics
 */
export function calculateVisitVolume(
  exports: PatientJourneyExport[],
): VisitVolumeStats {
  const allEncounters = exports.flatMap((e) => e.encounters);
  const totalEncounters = allEncounters.length;

  // By type
  const byType = new Map<string, number>();
  for (const enc of allEncounters) {
    const count = byType.get(enc.encounter_type) || 0;
    byType.set(enc.encounter_type, count + 1);
  }

  // By department
  const byDepartment = new Map<string, number>();
  for (const enc of allEncounters) {
    const dept = enc.department_name || 'Unknown';
    const count = byDepartment.get(dept) || 0;
    byDepartment.set(dept, count + 1);
  }

  // By clinic
  const byClinic = new Map<string, number>();
  for (const enc of allEncounters) {
    const clinic = enc.clinic_name || 'Unknown';
    const count = byClinic.get(clinic) || 0;
    byClinic.set(clinic, count + 1);
  }

  // By status
  const byStatus = new Map<string, number>();
  for (const enc of allEncounters) {
    const count = byStatus.get(enc.status) || 0;
    byStatus.set(enc.status, count + 1);
  }

  // By month
  const byMonth = new Map<string, number>();
  for (const enc of allEncounters) {
    if (enc.encounter_date) {
      const month = getMonthKey(enc.encounter_date);
      const count = byMonth.get(month) || 0;
      byMonth.set(month, count + 1);
    }
  }

  // By day of week
  const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  for (const enc of allEncounters) {
    if (enc.encounter_date) {
      const day = new Date(enc.encounter_date).getDay();
      byDayOfWeek[day]++;
    }
  }

  // Monthly trend
  const monthlyTrend = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, count]) => ({ period, count }));

  // Calculate averages
  const dailyAvg = totalEncounters > 0 ? Math.round(totalEncounters / 30) : 0; // Approximate
  const weeklyAvg = totalEncounters > 0 ? Math.round(totalEncounters / 4) : 0;
  const monthlyAvg = average(monthlyTrend.map((m) => m.count));

  return {
    totalEncounters,
    byEncounterType: Array.from(byType.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: percentage(count, totalEncounters),
    })),
    byDepartment: Array.from(byDepartment.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([department, count]) => ({
        department,
        count,
        percentage: percentage(count, totalEncounters),
      })),
    byClinic: Array.from(byClinic.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([clinic, count]) => ({
        clinic,
        count,
        percentage: percentage(count, totalEncounters),
      })),
    byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: percentage(count, totalEncounters),
    })),
    byDayOfWeek: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ].map((day, index) => ({
      day,
      count: byDayOfWeek[index],
      percentage: percentage(byDayOfWeek[index], totalEncounters),
    })),
    monthlyTrend,
    averages: {
      daily: dailyAvg,
      weekly: weeklyAvg,
      monthly: monthlyAvg,
    },
  };
}

// ==================== ADT ANALYTICS ====================

/**
 * Calculate Admission/Discharge/Transfer statistics
 */
export function calculateADTStats(exports: PatientJourneyExport[]): ADTStats {
  const allAdmissions = exports.flatMap((e) => e.admissions);
  const totalAdmissions = allAdmissions.length;

  // Total discharges (admissions with discharge date)
  const discharges = allAdmissions.filter((a) => a.discharge_date);
  const totalDischarges = discharges.length;

  // Transfers
  const allTransfers = exports.flatMap((e) => e.bedTransfers);
  const totalTransfers = allTransfers.length;

  // By admission type
  const byAdmissionType = new Map<string, number>();
  for (const adm of allAdmissions) {
    const count = byAdmissionType.get(adm.admission_type) || 0;
    byAdmissionType.set(adm.admission_type, count + 1);
  }

  // By ward
  const byWard = new Map<string, number>();
  for (const adm of allAdmissions) {
    const ward = adm.ward_name || 'Unknown';
    const count = byWard.get(ward) || 0;
    byWard.set(ward, count + 1);
  }

  // By discharge disposition
  const byDisposition = new Map<string, number>();
  for (const adm of discharges) {
    const disposition = adm.discharge_disposition || 'Unknown';
    const count = byDisposition.get(disposition) || 0;
    byDisposition.set(disposition, count + 1);
  }

  // By outcome
  const byOutcome = new Map<string, number>();
  for (const adm of discharges) {
    const outcome = adm.outcome || 'Unknown';
    const count = byOutcome.get(outcome) || 0;
    byOutcome.set(outcome, count + 1);
  }

  // Monthly trend
  const admissionsByMonth = new Map<string, number>();
  const dischargesByMonth = new Map<string, number>();

  for (const adm of allAdmissions) {
    if (adm.admission_date) {
      const month = getMonthKey(adm.admission_date);
      const count = admissionsByMonth.get(month) || 0;
      admissionsByMonth.set(month, count + 1);
    }
    if (adm.discharge_date) {
      const month = getMonthKey(adm.discharge_date);
      const count = dischargesByMonth.get(month) || 0;
      dischargesByMonth.set(month, count + 1);
    }
  }

  // Get all months
  const allMonths = new Set([
    ...admissionsByMonth.keys(),
    ...dischargesByMonth.keys(),
  ]);
  const monthlyTrend = Array.from(allMonths)
    .sort()
    .map((period) => ({
      period,
      admissions: admissionsByMonth.get(period) || 0,
      discharges: dischargesByMonth.get(period) || 0,
      netChange:
        (admissionsByMonth.get(period) || 0) -
        (dischargesByMonth.get(period) || 0),
    }));

  return {
    totalAdmissions,
    totalDischarges,
    totalTransfers,
    byAdmissionType: Array.from(byAdmissionType.entries()).map(
      ([type, count]) => ({
        type,
        count,
        percentage: percentage(count, totalAdmissions),
      }),
    ),
    byWard: Array.from(byWard.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ward, count]) => ({
        ward,
        count,
        percentage: percentage(count, totalAdmissions),
      })),
    byDischargeDisposition: Array.from(byDisposition.entries()).map(
      ([disposition, count]) => ({
        disposition,
        count,
        percentage: percentage(count, totalDischarges),
      }),
    ),
    byOutcome: Array.from(byOutcome.entries()).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: percentage(count, totalDischarges),
    })),
    monthlyTrend,
  };
}

// ==================== LENGTH OF STAY ANALYTICS ====================

/**
 * Calculate Length of Stay statistics
 */
export function calculateLOSStats(exports: PatientJourneyExport[]): LOSStats {
  const allAdmissions = exports.flatMap((e) => e.admissions);

  // Get LOS values (only for completed admissions)
  const losValues = allAdmissions
    .filter((a) => a.length_of_stay !== undefined && a.length_of_stay !== null)
    .map((a) => a.length_of_stay as number);

  // By ward
  const losByWard = new Map<string, number[]>();
  for (const adm of allAdmissions) {
    if (adm.length_of_stay !== undefined && adm.length_of_stay !== null) {
      const ward = adm.ward_name || 'Unknown';
      if (!losByWard.has(ward)) {
        losByWard.set(ward, []);
      }
      losByWard.get(ward)!.push(adm.length_of_stay);
    }
  }

  // By admission type
  const losByType = new Map<string, number[]>();
  for (const adm of allAdmissions) {
    if (adm.length_of_stay !== undefined && adm.length_of_stay !== null) {
      if (!losByType.has(adm.admission_type)) {
        losByType.set(adm.admission_type, []);
      }
      losByType.get(adm.admission_type)!.push(adm.length_of_stay);
    }
  }

  // Distribution (0-3, 4-7, 8-14, 15-30, 31+)
  const distribution = {
    '0-3': 0,
    '4-7': 0,
    '8-14': 0,
    '15-30': 0,
    '31+': 0,
  };

  for (const los of losValues) {
    if (los <= 3) distribution['0-3']++;
    else if (los <= 7) distribution['4-7']++;
    else if (los <= 14) distribution['8-14']++;
    else if (los <= 30) distribution['15-30']++;
    else distribution['31+']++;
  }

  // Monthly trend
  const losByMonth = new Map<string, number[]>();
  for (const adm of allAdmissions) {
    if (
      adm.discharge_date &&
      adm.length_of_stay !== undefined &&
      adm.length_of_stay !== null
    ) {
      const month = getMonthKey(adm.discharge_date);
      if (!losByMonth.has(month)) {
        losByMonth.set(month, []);
      }
      losByMonth.get(month)!.push(adm.length_of_stay);
    }
  }

  return {
    overall: {
      mean: average(losValues),
      median: median(losValues),
      stdDev: stdDev(losValues),
      min: Math.min(...losValues, 0),
      max: Math.max(...losValues, 0),
      p25: percentile(losValues, 25),
      p75: percentile(losValues, 75),
      p90: percentile(losValues, 90),
    },
    byWard: Array.from(losByWard.entries()).map(([ward, values]) => ({
      ward,
      mean: average(values),
      median: median(values),
      count: values.length,
    })),
    byAdmissionType: Array.from(losByType.entries()).map(([type, values]) => ({
      type,
      mean: average(values),
      median: median(values),
      count: values.length,
    })),
    distribution: Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      percentage: percentage(count, losValues.length),
    })),
    monthlyTrend: Array.from(losByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, values]) => ({
        period,
        averageLOS: average(values),
        count: values.length,
      })),
  };
}

// ==================== READMISSION ANALYTICS ====================

/**
 * Calculate readmission statistics
 */
export function calculateReadmissionStats(
  exports: PatientJourneyExport[],
): ReadmissionStats {
  // Group admissions by patient
  const admissionsByPatient = new Map<
    string,
    PatientJourneyExport['admissions']
  >();

  for (const exp of exports) {
    if (!admissionsByPatient.has(exp.patient.id)) {
      admissionsByPatient.set(exp.patient.id, []);
    }
    admissionsByPatient.get(exp.patient.id)!.push(...exp.admissions);
  }

  // Calculate readmissions (within 30 days)
  let totalReadmissions = 0;
  const readmissionPatients = new Set<string>();
  const readmissionsByReason = new Map<string, number>();

  for (const [patientId, admissions] of admissionsByPatient) {
    // Sort admissions by date
    const sorted = [...admissions].sort(
      (a, b) =>
        new Date(a.admission_date).getTime() -
        new Date(b.admission_date).getTime(),
    );

    for (let i = 1; i < sorted.length; i++) {
      const prevDischarge = sorted[i - 1].discharge_date;
      const currAdmission = sorted[i].admission_date;

      if (prevDischarge && currAdmission) {
        const daysBetween = Math.floor(
          (new Date(currAdmission).getTime() -
            new Date(prevDischarge).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysBetween <= 30) {
          totalReadmissions++;
          readmissionPatients.add(patientId);

          const reason = sorted[i].admission_diagnosis || 'Unknown';
          const count = readmissionsByReason.get(reason) || 0;
          readmissionsByReason.set(reason, count + 1);
        }
      }
    }
  }

  const totalDischarges = exports
    .flatMap((e) => e.admissions)
    .filter((a) => a.discharge_date).length;

  return {
    totalReadmissions,
    readmissionRate: percentage(totalReadmissions, totalDischarges),
    patientsWithReadmission: readmissionPatients.size,
    byReason: Array.from(readmissionsByReason.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: percentage(count, totalReadmissions),
      })),
    byTimeframe: {
      within7Days: 0, // Would need more detailed tracking
      within14Days: 0,
      within30Days: totalReadmissions,
    },
  };
}

// ==================== FINANCIAL ANALYTICS ====================

/**
 * Calculate revenue statistics
 */
export function calculateRevenueStats(
  exports: PatientJourneyExport[],
): RevenueStats {
  const allBilling = exports.flatMap((e) => e.billingRecords);

  const totalBilled = allBilling.reduce(
    (sum, b) => sum + (b.total_amount || 0),
    0,
  );
  const totalPaid = allBilling.reduce(
    (sum, b) => sum + (b.amount_paid || 0),
    0,
  );
  const totalOutstanding = allBilling.reduce(
    (sum, b) => sum + (b.balance || 0),
    0,
  );
  const totalDiscount = allBilling.reduce(
    (sum, b) => sum + (b.discount || 0),
    0,
  );

  // By payment category
  const byCategory = new Map<
    string,
    { billed: number; paid: number; outstanding: number }
  >();
  for (const bill of allBilling) {
    const cat = bill.payment_category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, { billed: 0, paid: 0, outstanding: 0 });
    }
    const data = byCategory.get(cat)!;
    data.billed += bill.total_amount || 0;
    data.paid += bill.amount_paid || 0;
    data.outstanding += bill.balance || 0;
  }

  // By status
  const byStatus = new Map<string, number>();
  for (const bill of allBilling) {
    const count = byStatus.get(bill.status) || 0;
    byStatus.set(bill.status, count + 1);
  }

  // Monthly trend
  const byMonth = new Map<
    string,
    { billed: number; paid: number; count: number }
  >();
  for (const bill of allBilling) {
    if (bill.created_at) {
      const month = getMonthKey(bill.created_at);
      if (!byMonth.has(month)) {
        byMonth.set(month, { billed: 0, paid: 0, count: 0 });
      }
      const data = byMonth.get(month)!;
      data.billed += bill.total_amount || 0;
      data.paid += bill.amount_paid || 0;
      data.count++;
    }
  }

  return {
    totalBilled,
    totalPaid,
    totalOutstanding,
    totalDiscount,
    collectionRate: percentage(totalPaid, totalBilled),
    averageInvoice: totalBilled / (allBilling.length || 1),
    byPaymentCategory: Array.from(byCategory.entries()).map(
      ([category, data]) => ({
        category,
        billed: data.billed,
        paid: data.paid,
        outstanding: data.outstanding,
        collectionRate: percentage(data.paid, data.billed),
      }),
    ),
    byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: percentage(count, allBilling.length),
    })),
    monthlyTrend: Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, data]) => ({
        period,
        billed: data.billed,
        paid: data.paid,
        count: data.count,
      })),
  };
}

// ==================== COMBINED ANALYTICS ====================

/**
 * Calculate all analytics for a dataset
 */
export function calculateCombinedAnalytics(
  exports: PatientJourneyExport[],
): CombinedAnalytics {
  return {
    diseasePrevalence: calculateDiseasePrevalence(exports),
    visitVolume: calculateVisitVolume(exports),
    adtStats: calculateADTStats(exports),
    losStats: calculateLOSStats(exports),
    readmissionStats: calculateReadmissionStats(exports),
    revenueStats: calculateRevenueStats(exports),
    generatedAt: new Date().toISOString(),
    patientCount: exports.length,
    dateRange: {
      from: exports.length > 0 ? exports[0].exportMetadata.dateRange.from : '',
      to: exports.length > 0 ? exports[0].exportMetadata.dateRange.to : '',
    },
  };
}

// ==================== CHART CONFIGURATIONS ====================

/**
 * Generate chart configurations for analytics visualization
 */
export function generateChartConfigs(
  analytics: CombinedAnalytics,
): ChartConfig[] {
  const configs: ChartConfig[] = [];

  // Disease Prevalence - Top 10 Diagnoses
  if (analytics.diseasePrevalence.topDiagnoses.length > 0) {
    configs.push({
      type: 'bar',
      title: 'Top 10 Diagnoses',
      data: {
        labels: analytics.diseasePrevalence.topDiagnoses
          .slice(0, 10)
          .map((d) => d.icd10_code || d.diagnosis_text.substring(0, 20)),
        datasets: [
          {
            label: 'Count',
            data: analytics.diseasePrevalence.topDiagnoses
              .slice(0, 10)
              .map((d) => d.count),
          },
        ],
      },
    });
  }

  // Disease Prevalence - By ICD-10 Chapter
  if (analytics.diseasePrevalence.byICD10Chapter.length > 0) {
    configs.push({
      type: 'pie',
      title: 'Diagnoses by ICD-10 Chapter',
      data: {
        labels: analytics.diseasePrevalence.byICD10Chapter.map(
          (c) => c.chapter,
        ),
        datasets: [
          {
            label: 'Count',
            data: analytics.diseasePrevalence.byICD10Chapter.map(
              (c) => c.count,
            ),
          },
        ],
      },
    });
  }

  // Visit Volume - Monthly Trend
  if (analytics.visitVolume.monthlyTrend.length > 0) {
    configs.push({
      type: 'line',
      title: 'Monthly Visit Volume',
      data: {
        labels: analytics.visitVolume.monthlyTrend.map((m) => m.period),
        datasets: [
          {
            label: 'Encounters',
            data: analytics.visitVolume.monthlyTrend.map((m) => m.count),
          },
        ],
      },
    });
  }

  // Visit Volume - By Department
  if (analytics.visitVolume.byDepartment.length > 0) {
    configs.push({
      type: 'bar',
      title: 'Visits by Department',
      data: {
        labels: analytics.visitVolume.byDepartment
          .slice(0, 10)
          .map((d) => d.department),
        datasets: [
          {
            label: 'Count',
            data: analytics.visitVolume.byDepartment
              .slice(0, 10)
              .map((d) => d.count),
          },
        ],
      },
    });
  }

  // Visit Volume - By Day of Week
  configs.push({
    type: 'bar',
    title: 'Visits by Day of Week',
    data: {
      labels: analytics.visitVolume.byDayOfWeek.map((d) => d.day),
      datasets: [
        {
          label: 'Count',
          data: analytics.visitVolume.byDayOfWeek.map((d) => d.count),
        },
      ],
    },
  });

  // ADT - Monthly Trend
  if (analytics.adtStats.monthlyTrend.length > 0) {
    configs.push({
      type: 'line',
      title: 'Admissions & Discharges Trend',
      data: {
        labels: analytics.adtStats.monthlyTrend.map((m) => m.period),
        datasets: [
          {
            label: 'Admissions',
            data: analytics.adtStats.monthlyTrend.map((m) => m.admissions),
          },
          {
            label: 'Discharges',
            data: analytics.adtStats.monthlyTrend.map((m) => m.discharges),
          },
        ],
      },
    });
  }

  // LOS - Distribution
  configs.push({
    type: 'bar',
    title: 'Length of Stay Distribution',
    data: {
      labels: analytics.losStats.distribution.map((d) => `${d.range} days`),
      datasets: [
        {
          label: 'Count',
          data: analytics.losStats.distribution.map((d) => d.count),
        },
      ],
    },
  });

  // Revenue - Monthly Trend
  if (analytics.revenueStats.monthlyTrend.length > 0) {
    configs.push({
      type: 'line',
      title: 'Monthly Revenue',
      data: {
        labels: analytics.revenueStats.monthlyTrend.map((m) => m.period),
        datasets: [
          {
            label: 'Billed',
            data: analytics.revenueStats.monthlyTrend.map((m) => m.billed),
          },
          {
            label: 'Collected',
            data: analytics.revenueStats.monthlyTrend.map((m) => m.paid),
          },
        ],
      },
    });
  }

  // Revenue - By Payment Category
  if (analytics.revenueStats.byPaymentCategory.length > 0) {
    configs.push({
      type: 'pie',
      title: 'Revenue by Payment Category',
      data: {
        labels: analytics.revenueStats.byPaymentCategory.map((c) => c.category),
        datasets: [
          {
            label: 'Billed',
            data: analytics.revenueStats.byPaymentCategory.map((c) => c.billed),
          },
        ],
      },
    });
  }

  return configs;
}
