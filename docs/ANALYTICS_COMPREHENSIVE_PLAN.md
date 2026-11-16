# NDC EMR Analytics & Reporting - Critical Analysis & Implementation Plan

## Executive Summary

### Current State Assessment
The NDC EMR analytics module is currently at a **basic operational level (Score: 4/10)** suitable for simple daily monitoring but **severely inadequate** for:
- Financial auditing and compliance
- Hospital board reporting
- Government inspections
- Medical records management (HIM)
- Departmental performance evaluation

### Critical Gaps Identified
1. **Financial Analytics**: No audit-trail reporting, no margin analysis, no debt aging
2. **Clinical Operations**: Missing ALOS, BOR, mortality rates, readmission tracking
3. **Pharmacy**: No cost-revenue analysis, no dead stock tracking, no procurement analytics
4. **Laboratory**: No TAT analysis, no quality metrics, no rejected sample tracking
5. **Medical Records**: No documentation completeness scoring, no coding compliance
6. **Drill-Down Capability**: Charts cannot be filtered by multiple dimensions simultaneously

---

## Critical Missing Analytics by Category

### 1️⃣ Clinical Operations Analytics

#### Currently Available ✅
- Patient count (total, daily, monthly)
- Consultation count (today, month, pending)
- Lab/Radiology request counts
- Department activity (basic queue counts)
- Top diagnoses (simple count)

#### MISSING ❌ (Must Implement)

| Metric | Priority | Description |
|--------|----------|-------------|
| **Average Length of Stay (ALOS)** | P0 | Days from admission to discharge by ward/department |
| **Bed Occupancy Rate (BOR)** | P0 | (Occupied beds / Available beds) × 100 |
| **Mortality Rate** | P0 | Deaths / Total discharges by department |
| **Readmission Rate** | P1 | Patients readmitted within 30 days |
| **Discharge Against Medical Advice (DAMA)** | P1 | Track DAMA vs regular discharge |
| **Referral In/Out Tracking** | P1 | External referrals with outcomes |
| **Surgery/Procedure Volume** | P1 | By type, surgeon, department |
| **OPD/SOPD/IPD/ER Split** | P0 | Patient volume by service type |
| **Doctor Productivity** | P2 | Consultations, procedures per doctor |
| **ICD-10 Coding Coverage** | P1 | % of encounters with proper ICD codes |
| **Clinical Outcomes** | P2 | Diagnosis vs treatment success rate |

### 2️⃣ Financial & Revenue Analytics

#### Currently Available ✅
- Revenue today/month (simple sum)
- Outstanding invoices (total)
- Revenue by payment method (daily only)
- Revenue trend (simple daily chart)

#### MISSING ❌ (CRITICAL for Audit)

| Metric | Priority | Description |
|--------|----------|-------------|
| **Revenue by Service Type** | P0 | Consultation, Lab, Radiology, Pharmacy, Surgery, Admission |
| **Revenue by Department** | P0 | Per department with drill-down |
| **Revenue by Doctor** | P1 | Doctor-attributed revenue |
| **Gross vs Net Revenue** | P0 | Before and after discounts/waivers |
| **Discount/Waiver Analysis** | P0 | Who authorized, why, total impact |
| **Write-off Tracking** | P0 | Bad debt with aging |
| **Debt Aging Report** | P0 | 0-30, 31-60, 61-90, 90+ days |
| **NHIS Claims vs Reimbursements** | P0 | Submitted, approved, rejected, pending |
| **Cash Flow Analysis** | P1 | Daily/weekly/monthly collections |
| **Service Profitability** | P1 | Cost vs revenue per service |
| **Payment Method Trends** | P1 | Cash vs Insurance vs NHIS over time |
| **Collection Efficiency** | P0 | Billed vs Collected ratio |
| **Revenue by Time Period** | P0 | Hourly, daily, weekly, monthly, quarterly, yearly |
| **Audit Trail Report** | P0 | All financial transactions with timestamps |

### 3️⃣ Pharmacy & Inventory Analytics

#### Currently Available ✅
- Dispensed today count
- Low stock items count
- Top medications (count only)

#### MISSING ❌ (Critical)

| Metric | Priority | Description |
|--------|----------|-------------|
| **Drug Revenue** | P0 | Total drug sales value |
| **Drug Cost Analysis** | P0 | Cost price vs selling price margin |
| **Drug Consumption by Value** | P0 | Not just count, but monetary value |
| **Fast-Moving vs Dead Stock** | P1 | Velocity analysis |
| **Expiry Tracking** | P0 | Drugs expiring in 30/60/90 days |
| **Expired Drug Losses** | P0 | Value of expired inventory |
| **Stock Variance** | P1 | System vs physical count discrepancy |
| **Procurement vs Consumption** | P1 | Purchase orders vs dispensing |
| **Drug Usage by Diagnosis** | P2 | Which drugs for which conditions |
| **Drug Usage by Doctor** | P2 | Prescribing patterns |
| **Reorder Point Analysis** | P1 | Auto-reorder suggestions |
| **ABC Analysis** | P1 | High/Medium/Low value items |
| **Supplier Performance** | P2 | Lead time, quality, pricing |

### 4️⃣ Laboratory & Diagnostic Analytics

#### Currently Available ✅
- Pending lab tests count
- Completed today count
- Top lab tests (count)

#### MISSING ❌ (Critical)

| Metric | Priority | Description |
|--------|----------|-------------|
| **Revenue per Test Category** | P0 | Lab revenue breakdown |
| **Turnaround Time (TAT)** | P0 | Order to result time by test |
| **TAT Compliance Rate** | P1 | % meeting target TAT |
| **Abnormal vs Normal Results** | P1 | Critical value tracking |
| **Rejected/Repeated Samples** | P1 | Quality metric |
| **Equipment Utilization** | P2 | Test volume per machine |
| **Reagent Consumption** | P2 | Cost per test tracking |
| **Critical Value Reporting** | P1 | Time to notification |
| **Test Volume by Department** | P1 | Which dept orders most |
| **Test Volume by Doctor** | P2 | Ordering patterns |

### 5️⃣ Radiology Analytics

#### Currently Available ✅
- Pending radiology count
- Completed today count

#### MISSING ❌

| Metric | Priority | Description |
|--------|----------|-------------|
| **Revenue by Modality** | P0 | X-ray, CT, MRI, Ultrasound revenue |
| **Volume by Modality** | P1 | Utilization per equipment type |
| **Reporting TAT** | P0 | Scan to report time |
| **Critical Finding Rate** | P1 | Urgent findings tracking |
| **Repeat/Recall Rate** | P1 | Quality metric |
| **Equipment Downtime** | P2 | Maintenance impact |

### 5️⃣ Medical Records & HIM Analytics

#### Currently Available ✅
- None specific to HIM

#### MISSING ❌ (Critical for Compliance)

| Metric | Priority | Description |
|--------|----------|-------------|
| **Documentation Completeness** | P0 | % encounters with full clinical notes |
| **ICD Coding Rate** | P0 | % with proper diagnosis codes |
| **Procedure Coding Rate** | P0 | % with CPT/procedure codes |
| **Missing Notes Report** | P0 | Encounters without clinical notes |
| **Signature/Authentication** | P1 | Unsigned documents tracking |
| **Documentation TAT** | P1 | Time to complete notes |
| **Encounter-to-Billing Consistency** | P0 | All services billed correctly |
| **Record Access Audit Log** | P0 | Who accessed what when |
| **Data Quality Score** | P1 | Completeness indicators |

### 6️⃣ Human Resource & Performance Analytics

#### Currently Available ✅
- None

#### MISSING ❌

| Metric | Priority | Description |
|--------|----------|-------------|
| **Doctor Workload** | P1 | Patients per doctor per day |
| **Nurse-to-Patient Ratio** | P1 | Especially for wards |
| **Department Utilization** | P1 | Capacity vs actual |
| **Staff Attendance** | P2 | Integration with HR |
| **Overtime Analysis** | P2 | Labor cost optimization |
| **Revenue per Doctor** | P1 | Financial productivity |

---

## Financial & Audit Risks

### High-Risk Gaps

| Risk Area | Impact | Current State |
|-----------|--------|---------------|
| **No Audit Trail Export** | External auditors cannot verify transactions | ❌ Missing |
| **No Discount Authorization Tracking** | Fraud risk, revenue leakage | ❌ Missing |
| **No Debt Aging** | Cannot assess receivables health | ❌ Missing |
| **No NHIS Reconciliation** | Insurance revenue unverifiable | ⚠️ Partial |
| **No Write-off Documentation** | Bad debt unaccounted | ❌ Missing |
| **No Revenue by Service** | Cannot audit service pricing | ❌ Missing |
| **No Gross/Net Split** | Cannot verify discount impact | ❌ Missing |

---

## Recommended Analytics Dashboards to Add

### Dashboard 1: Executive Financial Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE FINANCIAL DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────┤
│  [KPI Cards]                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Gross Rev│ │ Net Rev  │ │ Discounts│ │Outstanding│           │
│  │ ₦5.2M    │ │ ₦4.8M    │ │ ₦400K    │ │ ₦1.2M    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  [Revenue by Payment Method - Stacked Bar]                      │
│  Cash | NHIS | Insurance | Corporate | POS | Transfer           │
│                                                                 │
│  [Revenue by Service Type - Pie]                                │
│  Consultation | Lab | Radiology | Pharmacy | Surgery            │
│                                                                 │
│  [Debt Aging - Horizontal Bar]                                  │
│  0-30 days | 31-60 days | 61-90 days | 90+ days                 │
│                                                                 │
│  [Collection Efficiency Trend - Line]                           │
│  Billed vs Collected over time                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard 2: Clinical Operations Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  CLINICAL OPERATIONS DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────┤
│  [KPI Cards]                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ BOR      │ │ ALOS     │ │ Mortality│ │ Readmit  │           │
│  │ 78%      │ │ 4.2 days │ │ 1.2%     │ │ 3.5%     │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  [Patient Volume - Stacked Area]                                │
│  OPD | SOPD | IPD | Emergency                                   │
│                                                                 │
│  [Department Performance - Bar]                                 │
│  Volume | Revenue | Avg Wait Time                               │
│                                                                 │
│  [Doctor Productivity - Table]                                  │
│  Rank | Name | Consultations | Revenue                          │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard 3: Pharmacy Analytics Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  PHARMACY ANALYTICS DASHBOARD                                   │
├─────────────────────────────────────────────────────────────────┤
│  [KPI Cards]                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Drug Rev │ │ Drug Cost│ │ Margin % │ │ Expiring │           │
│  │ ₦2.1M    │ │ ₦1.4M    │ │ 33%      │ │ 45 items │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  [Drug Revenue by Category - Bar]                               │
│  Antibiotics | Analgesics | Antimalaria | etc.                  │
│                                                                 │
│  [Stock Status - Donut]                                         │
│  Adequate | Low | Critical | Out of Stock                       │
│                                                                 │
│  [Top Drugs by Value - Table]                                   │
│  Drug Name | Qty Sold | Revenue | Cost | Margin                 │
│                                                                 │
│  [Expiry Alert - List]                                          │
│  Drug | Batch | Expiry Date | Qty | Value                       │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard 4: Laboratory Analytics Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  LABORATORY ANALYTICS DASHBOARD                                 │
├─────────────────────────────────────────────────────────────────┤
│  [KPI Cards]                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Tests    │ │ Revenue  │ │ Avg TAT  │ │ TAT %    │           │
│  │ 245      │ │ ₦890K    │ │ 2.5 hrs  │ │ 85%      │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  [Revenue by Test Category - Bar]                               │
│  Hematology | Chemistry | Microbiology | Serology               │
│                                                                 │
│  [TAT Distribution - Histogram]                                 │
│  <1hr | 1-2hr | 2-4hr | 4-8hr | >8hr                           │
│                                                                 │
│  [Abnormal Results Rate - Line Trend]                           │
│  % abnormal results over time                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Filter & Drill-Down Model

### Universal Filter Bar (All Dashboards)
```typescript
interface AnalyticsFilters {
  // Time Filters
  timeRange: 'today' | 'yesterday' | 'this_week' | 'last_week' | 
             'this_month' | 'last_month' | 'this_quarter' | 
             'this_year' | 'custom';
  startDate?: string;
  endDate?: string;
  
  // Organizational Filters
  facility?: string;        // For multi-facility
  department?: string;
  doctor?: string;
  ward?: string;
  
  // Service Filters
  serviceType?: ServiceType[];
  visitType?: 'OPD' | 'SOPD' | 'IPD' | 'Emergency';
  
  // Financial Filters
  paymentMethod?: PaymentMethod[];
  paymentStatus?: PaymentStatus[];
  
  // Clinical Filters
  diagnosis?: string;       // ICD code or text
  procedure?: string;
  
  // Comparison
  compareWith?: 'previous_period' | 'same_period_last_year';
}
```

### Drill-Down Hierarchy
```
Revenue Chart
  └── Click on "Laboratory" segment
      └── Lab Revenue by Test Category
          └── Click on "Chemistry"
              └── Chemistry Tests Detail Table
                  └── Click on row
                      └── Individual Test Details
```

---

## EMR Best-Practice Alignment Score

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Clinical Operations | 4/10 | 9/10 | -5 |
| Financial Reporting | 3/10 | 9/10 | -6 |
| Pharmacy Analytics | 2/10 | 8/10 | -6 |
| Laboratory Analytics | 3/10 | 8/10 | -5 |
| Medical Records (HIM) | 1/10 | 8/10 | -7 |
| HR/Performance | 0/10 | 7/10 | -7 |
| **Overall** | **4/10** | **8/10** | **-4** |

---

## Priority Roadmap

### Immediate (Week 1-2) - P0 Items
1. **Financial Audit Reports**
   - Revenue by service type
   - Revenue by payment method (with drill-down)
   - Debt aging report
   - Gross vs Net revenue
   - Discount/Waiver tracking

2. **Clinical Core Metrics**
   - Average Length of Stay (ALOS)
   - Bed Occupancy Rate (BOR)
   - OPD/IPD/ER volume split

3. **Export Functionality**
   - PDF export for all reports
   - Excel/CSV export for raw data

### Short-term (Week 3-4) - P1 Items
1. **NHIS Reconciliation Dashboard**
2. **Pharmacy Cost Analysis**
3. **Laboratory TAT Tracking**
4. **Doctor Productivity Report**
5. **Missing Documentation Report**

### Long-term (Month 2-3) - P2 Items
1. **Predictive Analytics** (readmission risk, demand forecasting)
2. **Service Profitability Scoring**
3. **ABC Inventory Analysis**
4. **Clinical Outcomes Dashboard**
5. **Staff Performance Metrics**

---

## Implementation Architecture

### New API Endpoints Required

```typescript
// Financial Analytics API
GET /analytics/revenue/by-service-type
GET /analytics/revenue/by-department  
GET /analytics/revenue/by-doctor
GET /analytics/revenue/by-payment-method
GET /analytics/debt-aging
GET /analytics/discounts-waivers
GET /analytics/collection-efficiency
GET /analytics/audit-trail

// Clinical Operations API
GET /analytics/clinical/alos
GET /analytics/clinical/bed-occupancy
GET /analytics/clinical/mortality-rate
GET /analytics/clinical/readmission-rate
GET /analytics/clinical/patient-volume
GET /analytics/clinical/doctor-productivity

// Pharmacy Analytics API
GET /analytics/pharmacy/revenue-by-category
GET /analytics/pharmacy/cost-analysis
GET /analytics/pharmacy/expiry-tracking
GET /analytics/pharmacy/stock-velocity
GET /analytics/pharmacy/margin-analysis

// Laboratory Analytics API
GET /analytics/lab/revenue-by-category
GET /analytics/lab/turnaround-time
GET /analytics/lab/abnormal-results
GET /analytics/lab/rejected-samples

// Medical Records API
GET /analytics/records/completeness-score
GET /analytics/records/coding-coverage
GET /analytics/records/missing-documentation
GET /analytics/records/audit-log
```

### Database Views Required

```sql
-- Revenue by Service Type View
CREATE VIEW v_revenue_by_service AS
SELECT 
  date_trunc('day', created_at) as period,
  source_module as service_type,
  SUM(gross_amount) as gross_revenue,
  SUM(discount_amount) as discounts,
  SUM(net_amount) as net_revenue,
  COUNT(*) as transaction_count
FROM billing_orders
WHERE status IN ('Paid', 'Paid_NHIS', 'Paid_Retainership')
GROUP BY 1, 2;

-- Debt Aging View
CREATE VIEW v_debt_aging AS
SELECT
  CASE 
    WHEN CURRENT_DATE - created_at::date <= 30 THEN '0-30 days'
    WHEN CURRENT_DATE - created_at::date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - created_at::date <= 90 THEN '61-90 days'
    ELSE '90+ days'
  END as aging_bucket,
  COUNT(*) as invoice_count,
  SUM(balance) as outstanding_amount
FROM invoices
WHERE status IN ('Pending', 'Partial')
GROUP BY 1;

-- ALOS View
CREATE VIEW v_alos AS
SELECT
  ward,
  AVG(EXTRACT(EPOCH FROM (discharge_date - admission_date)) / 86400) as avg_los_days,
  COUNT(*) as discharge_count
FROM admissions
WHERE discharge_date IS NOT NULL
GROUP BY ward;

-- Bed Occupancy View  
CREATE VIEW v_bed_occupancy AS
SELECT
  w.name as ward_name,
  w.total_beds,
  COUNT(a.id) as occupied_beds,
  ROUND(COUNT(a.id)::numeric / NULLIF(w.total_beds, 0) * 100, 1) as occupancy_rate
FROM wards w
LEFT JOIN admissions a ON a.ward_id = w.id AND a.status = 'Active'
GROUP BY w.id, w.name, w.total_beds;
```

---

## Advanced Analytics (Hospital-Grade Differentiators)

### 1. Predictive Analytics
- **Readmission Risk Score**: ML model predicting 30-day readmission
- **Demand Forecasting**: Predict patient volume by day/hour
- **Resource Planning**: Predict bed/staff needs

### 2. Variance Analysis
- Budget vs Actual Revenue
- Expected vs Actual Length of Stay
- Standard vs Actual Drug Consumption

### 3. Cost-to-Care Modeling
- Cost per Diagnosis
- Cost per Department
- Cost per Doctor

### 4. Service Profitability Scoring
```typescript
interface ServiceProfitability {
  service: string;
  grossRevenue: number;
  directCosts: number;  // Supplies, drugs
  indirectCosts: number; // Staff time, overhead
  netMargin: number;
  profitabilityScore: 'High' | 'Medium' | 'Low' | 'Loss';
}
```

---

## Files to Create/Modify

### New Files Required
1. `src/renderer/modules/analytics/api/financial.analytics.api.ts`
2. `src/renderer/modules/analytics/api/clinical.analytics.api.ts`
3. `src/renderer/modules/analytics/api/pharmacy.analytics.api.ts`
4. `src/renderer/modules/analytics/api/lab.analytics.api.ts`
5. `src/renderer/modules/analytics/api/records.analytics.api.ts`
6. `src/renderer/modules/analytics/hooks/useFinancialAnalytics.ts`
7. `src/renderer/modules/analytics/hooks/useClinicalAnalytics.ts`
8. `src/renderer/modules/analytics/components/FinancialDashboard.tsx`
9. `src/renderer/modules/analytics/components/ClinicalDashboard.tsx`
10. `src/renderer/modules/analytics/components/PharmacyDashboard.tsx`
11. `src/renderer/modules/analytics/components/LabDashboard.tsx`
12. `src/renderer/modules/analytics/components/HIMDashboard.tsx`
13. `src/renderer/modules/analytics/components/ExportManager.tsx`
14. `migrations/037_analytics_views.sql`

### Files to Modify
1. `src/renderer/modules/analytics/index.tsx` - Add new dashboard tabs
2. `src/renderer/modules/analytics/hooks/useAnalytics.ts` - Add new hooks
3. `src/renderer/modules/analytics/api/analytics.api.ts` - Add new endpoints

---

## Conclusion

The current analytics implementation provides basic operational visibility but falls **critically short** of hospital-grade requirements for:

1. **Financial Auditing** - Cannot produce defensible audit reports
2. **Compliance** - Missing documentation completeness tracking
3. **Management Decisions** - No profitability or productivity metrics
4. **External Reporting** - Cannot satisfy government/insurance requirements

**Immediate action required** on P0 items to bring the system to minimum professional standards.
