/**
 * Clinical Export System - Analytics Types
 * XENOCARE EMR
 *
 * Type definitions for clinical, operational, and financial analytics
 * Aligned with analytics-engine.ts output structures
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

// ==================== COMMON ANALYTICS TYPES ====================

/**
 * Time period for analytics grouping
 */
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Generic time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Time series item with period
 */
export interface PeriodDataPoint {
  period: string;
  count: number;
}

/**
 * Generic distribution item
 */
export interface DistributionItem {
  category: string;
  count: number;
  percentage: number;
  color?: string;
}

/**
 * Statistical summary
 */
export interface StatisticalSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode?: number;
  min: number;
  max: number;
  range: number;
  standardDeviation: number;
  variance: number;
  percentile25?: number;
  percentile75?: number;
  percentile90?: number;
  percentile95?: number;
}

/**
 * Comparison metrics (current vs previous period)
 */
export interface ComparisonMetric {
  current: number;
  previous: number;
  change: number; // Absolute change
  changePercent: number; // Percentage change
  trend: 'up' | 'down' | 'stable';
}

// ==================== CLINICAL ANALYTICS ====================

/**
 * ICD-10 Chapter statistics
 * Used by standards/icd10.service.ts
 */
export interface ICD10ChapterStats {
  chapter: string;
  chapterCode: string;
  description: string;
  count: number;
  percentage: number;
  topDiagnoses: {
    code: string;
    description: string;
    count: number;
  }[];
}

/**
 * Disease prevalence statistics
 * Matches analytics-engine.ts calculateDiseasePrevalence output
 */
export interface DiseasePrevalenceStats {
  totalDiagnoses: number;
  uniquePatients: number;

  // Top diagnoses by frequency
  topDiagnoses: {
    icd10_code: string;
    diagnosis_text: string;
    count: number;
    percentage: number;
    prevalence_per_1000: number;
  }[];

  // By diagnosis type
  byDiagnosisType: {
    primary: { count: number; percentage: number };
    secondary: { count: number; percentage: number };
  };

  // By ICD-10 chapter
  byICD10Chapter: {
    chapter: string;
    chapter_name: string;
    count: number;
    percentage: number;
  }[];

  // Time series data
  timeSeriesData: PeriodDataPoint[];
}

/**
 * Visit volume statistics
 * Matches analytics-engine.ts calculateVisitVolume output
 */
export interface VisitVolumeStats {
  totalEncounters: number;

  // By type
  byEncounterType: {
    type: string;
    count: number;
    percentage: number;
  }[];

  // By department
  byDepartment: {
    department: string;
    count: number;
    percentage: number;
  }[];

  // By clinic
  byClinic: {
    clinic: string;
    count: number;
    percentage: number;
  }[];

  // By status
  byStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];

  // By day of week
  byDayOfWeek: {
    day: string;
    count: number;
    percentage: number;
  }[];

  // Monthly trend
  monthlyTrend: PeriodDataPoint[];

  // Averages
  averages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

/**
 * Admission-Discharge-Transfer (ADT) statistics
 * Matches analytics-engine.ts calculateADTStats output
 */
export interface ADTStats {
  totalAdmissions: number;
  totalDischarges: number;
  totalTransfers: number;

  byAdmissionType: {
    type: string;
    count: number;
    percentage: number;
  }[];

  byWard: {
    ward: string;
    count: number;
    percentage: number;
  }[];

  byDischargeDisposition: {
    disposition: string;
    count: number;
    percentage: number;
  }[];

  byOutcome: {
    outcome: string;
    count: number;
    percentage: number;
  }[];

  monthlyTrend: {
    period: string;
    admissions: number;
    discharges: number;
    netChange: number;
  }[];
}

/**
 * Length of Stay (LOS) statistics
 * Matches analytics-engine.ts calculateLOSStats output
 */
export interface LOSStats {
  overall: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    p25: number;
    p75: number;
    p90: number;
  };

  byWard: {
    ward: string;
    mean: number;
    median: number;
    count: number;
  }[];

  byAdmissionType: {
    type: string;
    mean: number;
    median: number;
    count: number;
  }[];

  distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];

  monthlyTrend: {
    period: string;
    averageLOS: number;
    count: number;
  }[];
}

/**
 * Readmission statistics
 * Matches analytics-engine.ts calculateReadmissionStats output
 */
export interface ReadmissionStats {
  totalReadmissions: number;
  readmissionRate: number;
  patientsWithReadmission: number;

  byReason: {
    reason: string;
    count: number;
    percentage: number;
  }[];

  byTimeframe: {
    within7Days: number;
    within14Days: number;
    within30Days: number;
  };
}

/**
 * Mortality statistics
 */
export interface MortalityStats {
  totalDeaths: number;
  mortalityRate: number; // Per 1000 admissions

  // By location
  byLocation: {
    location: string;
    count: number;
    rate: number;
  }[];

  // By diagnosis
  byDiagnosis: {
    icd10Code: string;
    description: string;
    count: number;
    percentage: number;
  }[];

  // By age group
  byAgeGroup: {
    ageGroup: string;
    count: number;
    rate: number;
  }[];

  // Trend
  trend: TimeSeriesDataPoint[];
}

/**
 * Vital signs statistics
 */
export interface VitalsStats {
  totalRecordings: number;
  uniquePatients: number;

  byParameter: {
    parameter: string;
    loincCode: string;
    stats: StatisticalSummary;
    abnormalCount: number;
    abnormalPercentage: number;
    unit: string;
  }[];

  // Critical values
  criticalValues: {
    parameter: string;
    count: number;
    patients: number;
  }[];
}

/**
 * Complete clinical analytics
 */
export interface ClinicalAnalytics {
  period: {
    from: string;
    to: string;
  };

  diseasePrevalence: DiseasePrevalenceStats;
  visitVolumes: VisitVolumeStats;
  adt: ADTStats;
  lengthOfStay: LOSStats;
  readmissions: ReadmissionStats;
  mortality?: MortalityStats;
  vitals?: VitalsStats;

  generatedAt: string;
}

// ==================== OPERATIONAL ANALYTICS ====================

/**
 * Patient flow statistics
 */
export interface PatientFlowStats {
  // Overall flow
  totalArrivals: number;
  totalCompletions: number;
  currentInSystem: number;

  // By stage
  byStage: {
    stage: string;
    current: number;
    avgTimeMinutes: number;
    maxTimeMinutes: number;
    bottleneck: boolean;
  }[];

  // Flow diagram data
  flowStages: {
    from: string;
    to: string;
    count: number;
    avgTimeMinutes: number;
  }[];

  // Hourly pattern
  hourlyPattern: {
    hour: number;
    arrivals: number;
    completions: number;
    avgQueueLength: number;
  }[];
}

/**
 * Wait time statistics
 */
export interface WaitTimeStats {
  overall: StatisticalSummary;

  // By department
  byDepartment: {
    departmentId: string;
    departmentName: string;
    stats: StatisticalSummary;
    targetMinutes?: number;
    withinTargetPercent?: number;
  }[];

  // By clinic
  byClinic: {
    clinicId: string;
    clinicName: string;
    stats: StatisticalSummary;
  }[];

  // By priority
  byPriority: {
    priority: string;
    stats: StatisticalSummary;
  }[];

  // Distribution
  distribution: {
    range: string;
    minMinutes: number;
    maxMinutes: number;
    count: number;
    percentage: number;
  }[];

  // Trend
  trend: TimeSeriesDataPoint[];
}

/**
 * Workload statistics
 */
export interface WorkloadStats {
  // By department
  byDepartment: {
    departmentId: string;
    departmentName: string;
    encounters: number;
    uniquePatients: number;
    staffCount?: number;
    encountersPerStaff?: number;
  }[];

  // By doctor
  byDoctor: {
    doctorId: string;
    doctorName: string;
    specialty?: string;
    encounters: number;
    uniquePatients: number;
    avgConsultationMinutes?: number;
  }[];

  // By nurse
  byNurse: {
    nurseId: string;
    nurseName: string;
    ward?: string;
    patientsAssigned: number;
    notesRecorded: number;
    vitalsRecorded: number;
  }[];

  // Trend
  trend: {
    period: string;
    encounters: number;
    staffCount: number;
    ratio: number;
  }[];
}

/**
 * Bed occupancy statistics
 */
export interface BedOccupancyStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  overallOccupancyRate: number;

  // By ward
  byWard: {
    wardId: string;
    wardName: string;
    wardType: string;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    avgLOS: number;
  }[];

  // By room type
  byRoomType: {
    roomType: string;
    totalBeds: number;
    occupiedBeds: number;
    occupancyRate: number;
  }[];

  // Trend
  trend: TimeSeriesDataPoint[];

  // Prediction (if available)
  prediction?: {
    date: string;
    predictedOccupancy: number;
    confidence: number;
  }[];
}

/**
 * Theatre/OR utilization statistics
 */
export interface TheatreUtilizationStats {
  totalProcedures: number;
  totalTheatreMinutes: number;

  // By theatre
  byTheatre: {
    theatreId: string;
    theatreName: string;
    procedures: number;
    totalMinutes: number;
    availableMinutes: number;
    utilizationRate: number;
  }[];

  // By procedure type
  byProcedureType: {
    type: string;
    count: number;
    avgDurationMinutes: number;
  }[];

  // By surgeon
  bySurgeon: {
    surgeonId: string;
    surgeonName: string;
    procedures: number;
    totalMinutes: number;
    avgDurationMinutes: number;
  }[];

  // Cancellation/postponement
  cancellations: {
    total: number;
    rate: number;
    byReason: DistributionItem[];
  };

  // Trend
  trend: TimeSeriesDataPoint[];
}

/**
 * Complete operational analytics
 */
export interface OperationalAnalytics {
  period: {
    from: string;
    to: string;
  };

  patientFlow: PatientFlowStats;
  waitTimes: WaitTimeStats;
  workload: WorkloadStats;
  bedOccupancy: BedOccupancyStats;
  theatreUtilization?: TheatreUtilizationStats;

  generatedAt: string;
}

// ==================== FINANCIAL ANALYTICS ====================

/**
 * Revenue statistics
 * Matches analytics-engine.ts calculateRevenueStats output
 */
export interface RevenueStats {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalDiscount: number;
  collectionRate: number;
  averageInvoice: number;

  // By payment category
  byPaymentCategory: {
    category: string;
    billed: number;
    paid: number;
    outstanding: number;
    collectionRate: number;
  }[];

  // By status
  byStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];

  // Monthly trend
  monthlyTrend: {
    period: string;
    billed: number;
    paid: number;
    count: number;
  }[];
}

/**
 * Insurance/NHIS analytics
 */
export interface InsuranceAnalytics {
  // NHIS
  nhis: {
    totalClaims: number;
    totalAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    pendingAmount: number;
    approvalRate: number;
    avgClaimAmount: number;
  };

  // By HMO
  byHMO: {
    hmoId: string;
    hmoName: string;
    claims: number;
    totalAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    approvalRate: number;
  }[];

  // Rejection reasons
  rejectionReasons: DistributionItem[];

  // Trend
  trend: {
    period: string;
    claims: number;
    approvedAmount: number;
    rejectedAmount: number;
  }[];
}

/**
 * Outstanding balance statistics
 */
export interface BalanceStats {
  totalOutstanding: number;
  accountsWithBalance: number;

  // Aging
  aging: {
    range: string;
    minDays: number;
    maxDays: number;
    amount: number;
    percentage: number;
    count: number;
  }[];

  // By category
  byCategory: {
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }[];

  // Top accounts
  topAccounts: {
    patientId: string;
    patientName: string;
    amount: number;
    oldestInvoiceDays: number;
  }[];
}

/**
 * Collection rate statistics
 */
export interface CollectionStats {
  overallRate: number;

  // By payment method
  byPaymentMethod: {
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }[];

  // By collector
  byCollector: {
    collectorId: string;
    collectorName: string;
    amount: number;
    count: number;
  }[];

  // Trend
  trend: {
    period: string;
    billed: number;
    collected: number;
    rate: number;
  }[];
}

/**
 * Complete financial analytics
 */
export interface FinancialAnalytics {
  period: {
    from: string;
    to: string;
  };
  currency: string; // NGN, USD, etc.

  revenue: RevenueStats;
  insurance: InsuranceAnalytics;
  balances: BalanceStats;
  collections: CollectionStats;

  generatedAt: string;
}

// ==================== PATIENT-LEVEL ANALYTICS ====================

/**
 * Individual patient analytics (for patient journey export)
 */
export interface PatientAnalytics {
  patientId: string;

  // Visit history
  totalVisits: number;
  firstVisitDate: string;
  lastVisitDate: string;
  avgVisitsPerYear: number;

  // Diagnoses
  totalDiagnoses: number;
  uniqueDiagnoses: number;
  chronicConditions: string[];

  // Medications
  totalPrescriptions: number;
  currentMedications: number;
  allergies: string[];

  // Lab/Imaging
  totalLabTests: number;
  abnormalLabResults: number;
  totalImagingStudies: number;

  // Admissions
  totalAdmissions: number;
  totalLOSDays: number;
  avgLOSDays: number;
  readmissions: number;

  // Financials
  totalBilled: number;
  totalPaid: number;
  balance: number;

  // Risk indicators (if calculable)
  riskIndicators?: {
    indicator: string;
    value: number;
    level: 'Low' | 'Medium' | 'High';
    description?: string;
  }[];
}

// ==================== COMBINED ANALYTICS ====================

/**
 * Complete analytics export
 * Matches analytics-engine.ts calculateCombinedAnalytics output
 */
export interface CombinedAnalytics {
  diseasePrevalence: DiseasePrevalenceStats;
  visitVolume: VisitVolumeStats;
  adtStats: ADTStats;
  losStats: LOSStats;
  readmissionStats: ReadmissionStats;
  revenueStats: RevenueStats;
  generatedAt: string;
  patientCount: number;
  dateRange: {
    from: string;
    to: string;
  };
}

// ==================== CHART TYPES ====================

/**
 * Chart type options for visualization
 */
export type ChartType =
  | 'bar'
  | 'horizontal-bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'stacked-bar'
  | 'grouped-bar'
  | 'gauge'
  | 'table'
  | 'heatmap'
  | 'treemap';

/**
 * Chart configuration
 * Matches analytics-engine.ts generateChartConfigs output
 */
export interface ChartConfig {
  type: ChartType;
  title: string;
  subtitle?: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
  width?: number;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * Chart data for export (legacy)
 */
export interface ChartData {
  config: ChartConfig;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}
