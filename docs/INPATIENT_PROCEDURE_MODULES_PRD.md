# NDC Medical Centre EMR - In-Patient & Procedure Modules
## Product Requirements Document & Implementation Plan

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Module 10: In-Patient (Admission & Ward Management)](#module-10-in-patient-admission--ward-management)
3. [Module 11: Procedure Module](#module-11-procedure-module)
4. [Database Schema Design](#database-schema-design)
5. [Implementation Plan](#implementation-plan)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [Integration Points](#integration-points)
9. [Testing Strategy](#testing-strategy)

---

## Executive Summary

This document outlines the implementation plan for two critical hospital management modules:

- **In-Patient Module**: Manages hospital admissions, ward allocation, bed management, ward rounds, and discharge processes
- **Procedure Module**: Tracks all minor and major medical procedures for both outpatients and inpatients

Both modules integrate with existing EMR infrastructure including:
- Patient Registration
- Encounter Management
- Billing System
- Pharmacy/Inventory
- Clinical Consultation

---

## Module 10: In-Patient (Admission & Ward Management)

### Purpose
Manage patients requiring hospital admission with complete tracking of ward allocation, bed management, clinical progress, and discharge documentation.

### Core Features

#### 10.1 Admission Management
- Record admission decisions from consultation
- Capture admitting diagnosis and clinical justification
- Link to existing encounter for continuity
- Auto-generate admission number

#### 10.2 Ward & Bed Management
- Real-time bed availability dashboard
- Ward categories: Medical, Surgical, ICU, Pediatric, Maternity, Private
- Bed assignment with conflict prevention
- Transfer management between wards/beds

#### 10.3 Clinical Progress (Ward Rounds)
- Daily ward round documentation
- SOAP format clinical notes
- Treatment plan updates
- Multi-doctor review capability

#### 10.4 Nursing Care Integration
- Vital signs monitoring (linked to existing vitals)
- Medication administration records (MAR)
- Nursing notes and observations
- Care plan tracking

#### 10.5 Discharge Management
- Discharge summary generation
- Final diagnosis documentation
- Follow-up appointments scheduling
- Discharge medications (linked to pharmacy)
- Outcome tracking

### Business Rules
1. Admission requires active encounter
2. Bed cannot be double-assigned
3. Discharge requires completed discharge summary
4. Ward round notes required daily for active admissions
5. Auto-calculate length of stay (admission_date to current/discharge_date)

---

## Module 11: Procedure Module

### Purpose
Standardized documentation and management of all medical procedures with full billing and audit trail.

### Core Features

#### 11.1 Procedure Documentation
- Pre-procedure checklist
- Consent documentation tracking
- Procedure notes (standardized templates)
- Post-procedure instructions

#### 11.2 Procedure Types
| Category | Examples |
|----------|----------|
| Minor | Suturing, Wound dressing, I&D, Catheterization |
| Major | Endoscopy, Minor surgery, Biopsies |
| Emergency | Chest tube, Tracheostomy, Emergency drainage |

#### 11.3 Anaesthesia Tracking
- Local anaesthesia
- Regional anaesthesia
- General anaesthesia
- Sedation

#### 11.4 Resource Management
- Consumables tracking (linked to inventory)
- Theatre/procedure room scheduling
- Staff assignment

### Business Rules
1. Procedure requires either encounter_id OR admission_id
2. Consumables auto-deducted from inventory on completion
3. Procedure charges auto-generated for billing
4. Outcome documentation mandatory for completion

---

## Database Schema Design

### Migration File: `037_inpatient_procedure_modules.sql`

```sql
-- ============================================================================
-- WARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_id VARCHAR(50) UNIQUE NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    ward_type VARCHAR(50) NOT NULL CHECK (ward_type IN ('Medical', 'Surgical', 'ICU', 'Pediatric', 'Maternity', 'Private', 'Emergency')),
    bed_capacity INTEGER NOT NULL DEFAULT 10,
    location VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BEDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_id VARCHAR(50) UNIQUE NOT NULL,
    ward_id UUID NOT NULL REFERENCES wards(id),
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(50) DEFAULT 'Standard' CHECK (bed_type IN ('Standard', 'ICU', 'Isolation', 'Private', 'Semi-Private')),
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Reserved', 'Maintenance', 'Cleaning')),
    daily_rate DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ward_id, bed_number)
);

-- ============================================================================
-- ADMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    admitted_by UUID NOT NULL REFERENCES staff(id),
    
    -- Admission Details
    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admission_reason TEXT NOT NULL,
    admitting_diagnosis TEXT,
    admission_type VARCHAR(50) DEFAULT 'Elective' CHECK (admission_type IN ('Emergency', 'Elective', 'Transfer', 'Referral')),
    
    -- Ward & Bed Assignment
    ward_id UUID REFERENCES wards(id),
    bed_id UUID REFERENCES beds(id),
    
    -- Status Tracking
    admission_status VARCHAR(20) DEFAULT 'Active' CHECK (admission_status IN ('Active', 'Discharged', 'Transferred', 'Deceased', 'DAMA')),
    
    -- Discharge Info (nullable until discharge)
    discharge_date TIMESTAMPTZ,
    discharge_diagnosis TEXT,
    discharge_summary TEXT,
    discharge_type VARCHAR(50) CHECK (discharge_type IN ('Normal', 'Transfer', 'DAMA', 'Deceased', 'Referred')),
    discharged_by UUID REFERENCES staff(id),
    follow_up_plan TEXT,
    follow_up_date DATE,
    
    -- Calculated Fields
    length_of_stay INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN discharge_date IS NOT NULL THEN EXTRACT(DAY FROM discharge_date - admission_date)::INTEGER
            ELSE EXTRACT(DAY FROM NOW() - admission_date)::INTEGER
        END
    ) STORED,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- ============================================================================
-- WARD ROUND NOTES (Clinical Progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ward_round_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id VARCHAR(50) UNIQUE NOT NULL,
    admission_id UUID NOT NULL REFERENCES admissions(id),
    
    -- Review Details
    review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    doctor_id UUID NOT NULL REFERENCES staff(id),
    
    -- Clinical Documentation (SOAP)
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    clinical_notes TEXT,
    
    -- Updates
    updated_diagnosis TEXT,
    updated_plan TEXT,
    additional_orders TEXT,
    
    -- Status
    is_primary_review BOOLEAN DEFAULT false,
    reviewed_by_consultant BOOLEAN DEFAULT false,
    consultant_id UUID REFERENCES staff(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BED TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bed_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id VARCHAR(50) UNIQUE NOT NULL,
    admission_id UUID NOT NULL REFERENCES admissions(id),
    
    -- From
    from_ward_id UUID REFERENCES wards(id),
    from_bed_id UUID REFERENCES beds(id),
    
    -- To
    to_ward_id UUID NOT NULL REFERENCES wards(id),
    to_bed_id UUID NOT NULL REFERENCES beds(id),
    
    -- Transfer Details
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transfer_reason TEXT NOT NULL,
    transferred_by UUID NOT NULL REFERENCES staff(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCEDURE CATALOGUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procedure_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_code VARCHAR(50) UNIQUE NOT NULL,
    procedure_name VARCHAR(200) NOT NULL,
    procedure_type VARCHAR(20) NOT NULL CHECK (procedure_type IN ('Minor', 'Major', 'Emergency')),
    category VARCHAR(100),
    description TEXT,
    standard_duration_minutes INTEGER,
    requires_consent BOOLEAN DEFAULT true,
    requires_anaesthesia BOOLEAN DEFAULT false,
    default_anaesthesia_type VARCHAR(50),
    base_price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCEDURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Patient & Context
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    admission_id UUID REFERENCES admissions(id),
    
    -- Procedure Details
    catalogue_id UUID REFERENCES procedure_catalogue(id),
    procedure_name VARCHAR(200) NOT NULL,
    procedure_type VARCHAR(20) NOT NULL CHECK (procedure_type IN ('Minor', 'Major', 'Emergency')),
    procedure_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Anaesthesia
    anaesthesia_type VARCHAR(50) CHECK (anaesthesia_type IN ('None', 'Local', 'Regional', 'General', 'Sedation')),
    anaesthesia_notes TEXT,
    anaesthetist_id UUID REFERENCES staff(id),
    
    -- Performing Team
    performed_by UUID NOT NULL REFERENCES staff(id),
    assisted_by UUID REFERENCES staff(id),
    nurse_id UUID REFERENCES staff(id),
    
    -- Documentation
    indication TEXT,
    procedure_notes TEXT,
    findings TEXT,
    complications TEXT,
    post_procedure_instructions TEXT,
    
    -- Consumables (JSON array)
    consumables_used JSONB DEFAULT '[]',
    
    -- Outcome & Status
    outcome VARCHAR(50) CHECK (outcome IN ('Successful', 'Partial', 'Complication', 'Abandoned')),
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In_Progress', 'Completed', 'Cancelled', 'Postponed')),
    
    -- Consent
    consent_obtained BOOLEAN DEFAULT false,
    consent_document_id UUID,
    
    -- Timing
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Billing
    is_billable BOOLEAN DEFAULT true,
    total_charge DECIMAL(10,2),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    
    -- Ensure either encounter or admission is provided
    CONSTRAINT procedure_context_check CHECK (encounter_id IS NOT NULL OR admission_id IS NOT NULL)
);

-- ============================================================================
-- PROCEDURE CONSUMABLES (for detailed tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS procedure_consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id UUID NOT NULL REFERENCES procedures(id),
    item_id UUID REFERENCES inventory_items(id),
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_encounter ON admissions(encounter_id);
CREATE INDEX idx_admissions_status ON admissions(admission_status);
CREATE INDEX idx_admissions_ward ON admissions(ward_id);
CREATE INDEX idx_admissions_date ON admissions(admission_date);

CREATE INDEX idx_beds_ward ON beds(ward_id);
CREATE INDEX idx_beds_status ON beds(status);

CREATE INDEX idx_ward_rounds_admission ON ward_round_notes(admission_id);
CREATE INDEX idx_ward_rounds_date ON ward_round_notes(review_date);
CREATE INDEX idx_ward_rounds_doctor ON ward_round_notes(doctor_id);

CREATE INDEX idx_procedures_patient ON procedures(patient_id);
CREATE INDEX idx_procedures_encounter ON procedures(encounter_id);
CREATE INDEX idx_procedures_admission ON procedures(admission_id);
CREATE INDEX idx_procedures_date ON procedures(procedure_date);
CREATE INDEX idx_procedures_status ON procedures(status);
CREATE INDEX idx_procedures_type ON procedures(procedure_type);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Ward Occupancy View
CREATE OR REPLACE VIEW ward_occupancy AS
SELECT 
    w.id as ward_id,
    w.ward_name,
    w.ward_type,
    w.bed_capacity,
    COUNT(CASE WHEN b.status = 'Occupied' THEN 1 END) as occupied_beds,
    COUNT(CASE WHEN b.status = 'Available' THEN 1 END) as available_beds,
    COUNT(CASE WHEN b.status = 'Maintenance' THEN 1 END) as maintenance_beds,
    ROUND(COUNT(CASE WHEN b.status = 'Occupied' THEN 1 END)::DECIMAL / NULLIF(w.bed_capacity, 0) * 100, 1) as occupancy_rate
FROM wards w
LEFT JOIN beds b ON w.id = b.ward_id AND b.is_active = true
WHERE w.is_active = true
GROUP BY w.id, w.ward_name, w.ward_type, w.bed_capacity;

-- Active Admissions View
CREATE OR REPLACE VIEW active_admissions AS
SELECT 
    a.*,
    p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.surname as patient_name,
    p.emr_number,
    w.ward_name,
    b.bed_number,
    s.first_name || ' ' || s.last_name as admitting_doctor
FROM admissions a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN wards w ON a.ward_id = w.id
LEFT JOIN beds b ON a.bed_id = b.id
LEFT JOIN staff s ON a.admitted_by = s.id
WHERE a.admission_status = 'Active';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update bed status on admission
CREATE OR REPLACE FUNCTION update_bed_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bed_id IS NOT NULL AND NEW.admission_status = 'Active' THEN
        UPDATE beds SET status = 'Occupied', updated_at = NOW() WHERE id = NEW.bed_id;
    END IF;
    
    IF OLD.bed_id IS NOT NULL AND (NEW.admission_status IN ('Discharged', 'Transferred', 'Deceased', 'DAMA') OR NEW.bed_id != OLD.bed_id) THEN
        UPDATE beds SET status = 'Available', updated_at = NOW() WHERE id = OLD.bed_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bed_status_on_admission
AFTER INSERT OR UPDATE ON admissions
FOR EACH ROW EXECUTE FUNCTION update_bed_on_admission();

-- Generate admission ID
CREATE OR REPLACE FUNCTION generate_admission_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.admission_id := 'ADM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('admission_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS admission_seq START 1;

CREATE TRIGGER trigger_generate_admission_id
BEFORE INSERT ON admissions
FOR EACH ROW
WHEN (NEW.admission_id IS NULL)
EXECUTE FUNCTION generate_admission_id();

-- Generate procedure ID
CREATE OR REPLACE FUNCTION generate_procedure_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.procedure_id := 'PROC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('procedure_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS procedure_seq START 1;

CREATE TRIGGER trigger_generate_procedure_id
BEFORE INSERT ON procedures
FOR EACH ROW
WHEN (NEW.procedure_id IS NULL)
EXECUTE FUNCTION generate_procedure_id();
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
| Task | Description | Priority |
|------|-------------|----------|
| 1.1 | Create database migration | High |
| 1.2 | Set up Supabase tables & RLS | High |
| 1.3 | Create TypeScript types | High |
| 1.4 | Create API layer (medical-records style) | High |

### Phase 2: In-Patient Module (Week 3-4)
| Task | Description | Priority |
|------|-------------|----------|
| 2.1 | Ward & Bed Management UI | High |
| 2.2 | Admission Form (from Consultation) | High |
| 2.3 | Active Admissions Dashboard | High |
| 2.4 | Ward Round Notes Entry | High |
| 2.5 | Discharge Form & Summary | High |
| 2.6 | Bed Transfer Management | Medium |

### Phase 3: Procedure Module (Week 5-6)
| Task | Description | Priority |
|------|-------------|----------|
| 3.1 | Procedure Catalogue Management | High |
| 3.2 | New Procedure Form | High |
| 3.3 | Procedure List & Search | High |
| 3.4 | Consumables Tracking | Medium |
| 3.5 | Procedure Templates | Medium |

### Phase 4: Integration (Week 7)
| Task | Description | Priority |
|------|-------------|----------|
| 4.1 | Billing Integration | High |
| 4.2 | Pharmacy Integration (MAR) | High |
| 4.3 | Inventory Deduction | Medium |
| 4.4 | Reports & Analytics | Medium |

### Phase 5: Testing & Polish (Week 8)
| Task | Description | Priority |
|------|-------------|----------|
| 5.1 | Integration Testing | High |
| 5.2 | User Acceptance Testing | High |
| 5.3 | Performance Optimization | Medium |
| 5.4 | Documentation | Medium |

---

## API Endpoints

### In-Patient Module

```typescript
// Admissions
GET    /api/admissions                    // List admissions (with filters)
GET    /api/admissions/:id                // Get admission details
POST   /api/admissions                    // Create new admission
PUT    /api/admissions/:id                // Update admission
POST   /api/admissions/:id/discharge      // Discharge patient

// Wards & Beds
GET    /api/wards                         // List all wards
GET    /api/wards/:id/beds                // Get beds in ward
GET    /api/wards/occupancy               // Ward occupancy dashboard
PUT    /api/beds/:id/status               // Update bed status

// Ward Rounds
GET    /api/admissions/:id/rounds         // Get ward round notes
POST   /api/admissions/:id/rounds         // Add ward round note

// Transfers
POST   /api/admissions/:id/transfer       // Transfer patient
GET    /api/admissions/:id/transfers      // Transfer history
```

### Procedure Module

```typescript
// Procedures
GET    /api/procedures                    // List procedures (with filters)
GET    /api/procedures/:id                // Get procedure details
POST   /api/procedures                    // Create new procedure
PUT    /api/procedures/:id                // Update procedure
PUT    /api/procedures/:id/complete       // Complete procedure

// Catalogue
GET    /api/procedure-catalogue           // List procedure types
POST   /api/procedure-catalogue           // Add procedure type
PUT    /api/procedure-catalogue/:id       // Update procedure type

// Consumables
GET    /api/procedures/:id/consumables    // Get consumables used
POST   /api/procedures/:id/consumables    // Add consumable
```

---

## UI Components

### In-Patient Module

```
src/renderer/modules/inpatient/
├── api/
│   └── inpatient.api.ts
├── hooks/
│   ├── useAdmissions.ts
│   ├── useWards.ts
│   └── useWardRounds.ts
├── components/
│   ├── admission/
│   │   ├── AdmissionForm.tsx
│   │   ├── AdmissionDetails.tsx
│   │   └── DischargeForm.tsx
│   ├── ward/
│   │   ├── WardDashboard.tsx
│   │   ├── BedGrid.tsx
│   │   ├── BedCard.tsx
│   │   └── WardSelector.tsx
│   ├── rounds/
│   │   ├── WardRoundForm.tsx
│   │   ├── WardRoundList.tsx
│   │   └── WardRoundCard.tsx
│   └── common/
│       ├── PatientBanner.tsx
│       └── AdmissionTimeline.tsx
├── pages/
│   ├── InpatientDashboard.tsx
│   ├── AdmissionPage.tsx
│   ├── WardManagementPage.tsx
│   └── DischargePage.tsx
└── types/
    └── inpatient.types.ts
```

### Procedure Module

```
src/renderer/modules/procedures/
├── api/
│   └── procedures.api.ts
├── hooks/
│   └── useProcedures.ts
├── components/
│   ├── ProcedureForm.tsx
│   ├── ProcedureList.tsx
│   ├── ProcedureCard.tsx
│   ├── ProcedureDetails.tsx
│   ├── ConsumablesTracker.tsx
│   └── ProcedureCatalogue.tsx
├── pages/
│   ├── ProceduresListPage.tsx
│   ├── NewProcedurePage.tsx
│   └── ProcedureCataloguePage.tsx
└── types/
    └── procedures.types.ts
```

---

## Integration Points

### 1. Clinical Consultation → Admission
```
When doctor decides to admit:
1. Click "Admit Patient" in consultation
2. Opens admission form pre-filled with encounter data
3. Select ward and bed
4. Submit creates admission record
5. Encounter status updated to "Admitted"
```

### 2. Admission → Billing
```
On admission:
1. Create billing items for bed charges
2. Daily rate auto-calculated based on bed type
3. On discharge: finalize all charges
```

### 3. Procedure → Inventory
```
On procedure completion:
1. Consumables array processed
2. Inventory quantities decremented
3. If stock < threshold, alert generated
```

### 4. Procedure → Billing
```
On procedure completion:
1. Base procedure charge added
2. Consumables charges added
3. Anaesthesia charges (if applicable)
```

### 5. Admission → Medical Records
```
Admission data flows to:
1. Patient timeline
2. Medical records view
3. Discharge summary becomes part of encounter history
```

---

## Testing Strategy

### Unit Tests
- API functions
- Date calculations (length of stay)
- Status transitions
- Validation logic

### Integration Tests
- Admission workflow end-to-end
- Bed status updates
- Discharge process
- Procedure with billing

### E2E Tests
- Complete admission-to-discharge flow
- Procedure booking and completion
- Ward round documentation

---

## Security & Permissions

### Role-Based Access

| Role | Admissions | Ward Rounds | Procedures | Beds |
|------|------------|-------------|------------|------|
| Doctor | Create/View | Create/View | Create/Edit | View |
| Nurse | View | View | Assist | View/Update |
| Ward Admin | View | View | View | Full |
| Billing | View | - | View | - |
| Admin | Full | Full | Full | Full |

---

## Success Metrics

1. **Bed Utilization**: Track occupancy rates
2. **Average Length of Stay**: By ward type
3. **Discharge Turnaround**: Time from decision to actual discharge
4. **Procedure Completion Rate**: Scheduled vs completed
5. **Documentation Compliance**: Ward rounds per admission

---

## Dependencies

### Required Before Implementation
- [x] Patient Registration Module
- [x] Visit/Encounter Module
- [x] Staff Management
- [x] Billing Module (basic)
- [ ] Inventory Module (for consumables)

### Will Enhance
- Medical Records View
- Analytics Dashboard
- Reporting Module

---

## Next Steps

1. **Review & Approve** this PRD
2. **Create Migration** file (037_inpatient_procedure_modules.sql)
3. **Generate TypeScript Types** from schema
4. **Start Phase 1** implementation

---

*Document Version: 1.0*
*Last Updated: January 1, 2026*
*Author: NDC EMR Development Team*
