# NDC EMR Services Pricing Module - Implementation Plan

## Overview

This document outlines the architecture for managing service prices across the NDC EMR system, including Lab Tests, Radiology Exams, Pharmacy Drugs, and Consultation Fees. The pricing system supports both **Private/Uninsured patients** and **NHIS patients** with configurable rates.

---

## Patient Categories at Registration

### 1. Patient Category (Top Level)
| Category | Description |
|----------|-------------|
| **Military** | Armed forces personnel (Army, Navy, Air Force) |
| **Civilian** | Non-military patients |

### 2. Patient Type
| Type | Description |
|------|-------------|
| **Principal** | Primary insurance holder (military personnel or civilian with own insurance) |
| **Dependent** | Family member covered under a principal's insurance |
| **Private** | Uninsured patient paying out-of-pocket |

### 3. Insurance Types (Coverage Categories)
| Insurance Type | Category | NHIS Coverage | Description |
|----------------|----------|---------------|-------------|
| **DHML** | Military | 100% | Defence Health Maintenance Limited - Military personnel insurance |
| **Civilian_NHIS** | Civilian | 90% | Civilian National Health Insurance Scheme |
| **Private** | Either | 0% | Uninsured - Patient pays full amount |

---

## NHIS Coverage Rules

### Current Configuration (nhis_config table)

| Payment Category | Coverage % | Consultation 100% | Description |
|------------------|------------|-------------------|-------------|
| Military_NHIS | 100% | ✓ Yes | Military NHIS - Full coverage |
| DHML | 100% | ✓ Yes | Defence Health (Military) - Full coverage |
| Civilian_NHIS | 90% | ✓ Yes | Civilian NHIS - 90% services, 100% consultation |
| Private | 0% | ✗ No | Patient pays 100% |
| Cash | 0% | ✗ No | Patient pays 100% |

### Key NHIS Rules:
1. **Consultation is ALWAYS 100% covered** for ALL NHIS patients (Military and Civilian)
2. **Services (Lab, Radiology, Drugs)**: 
   - Military NHIS (DHML): 100% covered
   - Civilian NHIS: 90% covered (patient pays 10%)
3. **Private patients**: Pay full amount for all services
4. **NHIS verification** is required by admin before routing patient

---

## Service Catalogues & Current Structure

### 1. Lab Tests (`lab_test_catalogue`)
```sql
CREATE TABLE lab_test_catalogue (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,     -- e.g., 'HEM001'
    name VARCHAR(100) NOT NULL,            -- e.g., 'Full Blood Count (FBC)'
    category VARCHAR(100),                 -- Hematology, Chemical Pathology, etc.
    specimen_type VARCHAR(50),             -- Blood, Urine, Stool, etc.
    price DECIMAL(10, 2),                  -- Standard price for private patients
    tat_minutes INTEGER,                   -- Turnaround time
    is_active BOOLEAN DEFAULT TRUE,
    -- NHIS Fields (to be added)
    nhis_code VARCHAR(50),                 -- NHIS tariff code
    nhis_price DECIMAL(10, 2),             -- NHIS approved price
    is_nhis_covered BOOLEAN DEFAULT TRUE,  -- Whether NHIS covers this test
    nhis_percentage INTEGER DEFAULT 0      -- Override default coverage %
);
```

**Current Lab Test Categories:**
- Hematology (FBC, ESR, Blood Group, Coagulation, etc.)
- Chemical Pathology (FBS, LFT, U&E, Lipid Profile, HbA1c, etc.)
- Microbiology (Urinalysis, Stool M/C/S, Blood Culture, etc.)
- Serology (HIV, HBsAg, HCV, Pregnancy Test, Widal, PSA, etc.)

### 2. Radiology/Imaging (`imaging_catalogue`)
```sql
CREATE TABLE imaging_catalogue (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,     -- e.g., 'RAD001'
    name VARCHAR(100) NOT NULL,            -- e.g., 'Chest X-Ray (PA)'
    modality imaging_type NOT NULL,        -- X-Ray, Ultrasound, CT, MRI
    body_part VARCHAR(100),                -- Chest, Abdomen, Head, etc.
    price DECIMAL(10, 2),                  -- Standard price
    is_active BOOLEAN DEFAULT TRUE,
    -- NHIS Fields (to be added)
    nhis_code VARCHAR(50),
    nhis_price DECIMAL(10, 2),
    is_nhis_covered BOOLEAN DEFAULT TRUE,
    nhis_percentage INTEGER DEFAULT 0
);
```

**Current Imaging Modalities:**
- X-Ray
- Ultrasound
- CT Scan
- MRI

### 3. Pharmacy/Drugs (`drug_catalogue`)
Already has NHIS fields:
- `nhis_code`, `nhis_price`, `is_nhis_covered`, `nhis_percentage`

### 4. Consultation Fees (`clinics`)
```sql
-- Clinic-based consultation fees
consultation_fee DECIMAL(10, 2),      -- Standard consultation
follow_up_fee DECIMAL(10, 2),         -- Follow-up visit
emergency_fee DECIMAL(10, 2),         -- Emergency consultation
-- NHIS fees (to be added)
nhis_consultation_fee DECIMAL(10, 2), -- NHIS consultation rate
nhis_follow_up_fee DECIMAL(10, 2),
nhis_emergency_fee DECIMAL(10, 2)
```

---

## Services Module - UI Structure

### Location: Billing & Paypoint Module > Services Tab

### Tab Structure:
```
[Queue] [Invoices] [Payments] [Reports] [Services*]
                                          ↓
         ┌─────────────────────────────────────────────┐
         │  SERVICES PRICE MANAGEMENT                   │
         │  (Super Admin Access Only)                   │
         ├─────────────────────────────────────────────┤
         │  [Services] [Consultation Fees] [NHIS Config] [Audit] │
         └─────────────────────────────────────────────┘
```

### Services Sub-tabs:

#### 1. **Services Tab** - Lab, Radiology, Pharmacy Prices
- Grouped by category (collapsible sections)
- Search & filter capability
- Columns: Code | Name | Private Price | NHIS Price | NHIS Covered | NHIS % | Status | Actions
- Edit modal for updating prices
- **Add New Service** button for creating new tests/exams

#### 2. **Consultation Fees Tab** - Clinic-based fees
- All clinics with their fees
- Columns: Clinic | Department | Consultation | Follow-up | Emergency | NHIS Consultation | NHIS Follow-up | NHIS Emergency
- Edit modal for updating fees

#### 3. **NHIS Config Tab** - Coverage percentages
- View/edit NHIS category rates
- Shows: Military_NHIS, DHML, Civilian_NHIS, Private coverage %
- Consultation fully covered flag

#### 4. **Audit History Tab** - Price change tracking
- All price changes with timestamp
- Shows: Service | Field | Old Value | New Value | Changed By | Date

---

## Implementation Tasks

### Phase 1: Database Updates ✅ (Migration 044)
- [x] Add NHIS fields to `lab_test_catalogue`
- [x] Add NHIS fields to `imaging_catalogue`
- [x] Add NHIS consultation fees to `clinics`
- [x] Create `service_price_audit` table

### Phase 2: API & Hooks ✅
- [x] `service-pricing.api.ts` - CRUD operations for all services
- [x] `useServicePricing.ts` - React Query hooks with optimistic updates
- [x] Create Lab Test function - `createLabTest()`
- [x] Create Radiology Exam function - `createRadiologyExam()`
- [x] Get Lab Categories helper
- [x] Get Specimen Types helper

### Phase 3: UI Components ✅
- [x] `ServicePriceManagement.tsx` - Main management component
- [x] Services tab with grouped services (Lab, Radiology, Pharmacy)
- [x] Consultation fees tab
- [x] NHIS config view
- [x] Audit history view
- [x] Edit modals for prices
- [x] **Add New Lab Test Modal** - Full form with NHIS config
- [x] **Add New Radiology Exam Modal** - Full form with modality selection

### Phase 4: Enhancements (TODO)
- [ ] **Bulk Price Update** - CSV import for mass updates
- [ ] **Price History Charts** - Visual price trends
- [ ] **NHIS Tariff Integration** - Import official NHIS tariff codes/prices
- [ ] **Service Deactivation** - Soft delete services
- [ ] **Duplicate Service Detection** - Warn on similar code/name

---

## Pricing Logic Flow

```
Patient Registration
        ↓
Patient Category (Military/Civilian)
        ↓
Insurance Type (DHML/Civilian_NHIS/Private)
        ↓
Service Ordered (Lab/Radiology/Pharmacy/Consultation)
        ↓
Billing Order Created
        ↓
┌─────────────────────────────────────────────────┐
│ Price Calculation:                               │
│                                                  │
│ IF Private Patient:                              │
│   → Use standard price                           │
│   → Patient pays 100%                            │
│                                                  │
│ IF NHIS Patient:                                 │
│   → Use NHIS price (or standard if not set)      │
│   → Apply NHIS coverage %                        │
│   → Calculate: NHIS pays X%, Patient pays Y%     │
│   → Consultation = 100% covered                  │
└─────────────────────────────────────────────────┘
        ↓
Billing Queue (Awaiting Payment)
        ↓
Admin Verifies Payment
        ↓
Receipt Generated
```

---

## Access Control

| Role | View Services | Edit Prices | Add Services | View Audit |
|------|--------------|-------------|--------------|------------|
| Super Admin | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✗ | ✗ | ✓ |
| Billing Clerk | ✓ | ✗ | ✗ | ✗ |
| Others | ✗ | ✗ | ✗ | ✗ |

---

## Sample Pricing Data

### Lab Tests (Sample)
| Code | Name | Category | Private Price | NHIS Price | NHIS Covered |
|------|------|----------|---------------|------------|--------------|
| HEM001 | Full Blood Count (FBC) | Hematology | ₦3,500 | ₦3,000 | Yes |
| HEM002 | ESR | Hematology | ₦1,500 | ₦1,200 | Yes |
| CHM001 | Fasting Blood Sugar | Chemical Pathology | ₦1,000 | ₦800 | Yes |
| CHM002 | Liver Function Test | Chemical Pathology | ₦5,000 | ₦4,000 | Yes |
| SER001 | HIV Screening | Serology | ₦1,000 | ₦800 | Yes |

### Radiology (Sample)
| Code | Name | Modality | Private Price | NHIS Price | NHIS Covered |
|------|------|----------|---------------|------------|--------------|
| RAD001 | Chest X-Ray (PA) | X-Ray | ₦5,000 | ₦4,000 | Yes |
| RAD002 | Abdominal Ultrasound | Ultrasound | ₦6,000 | ₦5,000 | Yes |
| RAD005 | MRI Brain | MRI | ₦85,000 | ₦70,000 | Yes |
| RAD006 | CT Head | CT | ₦45,000 | ₦40,000 | Yes |

---

## Files Created/Modified

### New Files:
1. `migrations/044_service_pricing_nhis.sql` - Database migration
2. `src/renderer/modules/billing/api/service-pricing.api.ts` - API functions
3. `src/renderer/modules/billing/hooks/useServicePricing.ts` - React Query hooks
4. `src/renderer/modules/billing/components/ServicePriceManagement.tsx` - UI component

### Modified Files:
1. `src/renderer/modules/billing/index.tsx` - Added Services tab

---

## Next Steps

1. Run migration 044 on database
2. Test Services tab in Billing module
3. Add "Add New Service" functionality
4. Import NHIS tariff codes for all services
5. Train billing staff on new module

---

## Notes

- All price changes are audited with timestamp and user info
- NHIS prices should be set according to official NHIS tariff
- Service prices can have per-service NHIS override percentage
- Private price is always the baseline; NHIS price is what NHIS pays
