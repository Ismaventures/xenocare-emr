# Radiology Module Workflow Standards

## NDC Medical Centre EMR - Radiology Integration Guide

This document outlines the minimum standards and best practices for the radiology workflow in the NDC Medical Centre EMR system.

---

## Table of Contents

1. [Radiology Study Standards](#1-radiology-study-standards)
2. [Image Management](#2-image-management)
3. [Radiology Reports](#3-radiology-reports)
4. [Role Separation](#4-role-separation)
5. [Status-Driven Workflow](#5-status-driven-workflow)
6. [UI Standards](#6-ui-standards)
7. [Database Schema Requirements](#7-database-schema-requirements)
8. [Integration Points](#8-integration-points)

---

## 1. Radiology Study Standards

### What a Radiology Study Must Contain (Minimum)

Every radiology study/request must store the following information:

| Field | Description | Required |
|-------|-------------|----------|
| `imaging_type` | X-Ray, CT Scan, MRI, Ultrasound, Mammography, Fluoroscopy | ✅ Yes |
| `body_part` | Anatomical region being imaged | ✅ Yes |
| `clinical_indication` | Reason for ordering the study | ✅ Yes |
| `ordered_by` | Reference to ordering physician | ✅ Yes |
| `visit_id` / `encounter_id` | Link to patient encounter | ✅ Yes |
| `patient_id` | Patient reference | ✅ Yes |
| `priority` | Routine, Urgent, Emergency | ✅ Yes |
| `status` | Current workflow state | ✅ Yes |
| `scheduled_date` | When the imaging is scheduled | Optional |
| `created_at` | Order timestamp | ✅ Yes |

### Key Principle
> **A study exists even before images are uploaded.** The study record is created when a doctor orders imaging, not when images arrive.

---

## 2. Image Management

### Critical Rules

| ✅ DO | ❌ DON'T |
|-------|----------|
| Store images as child records of a study | Store multiple images in one field |
| Allow multiple images per study | Overwrite old images |
| Track upload metadata separately | Assume upload happens only once |
| Support incremental uploads | Merge image data with report data |

### Image Record Structure

Each image record should contain:

```typescript
interface RadiologyImage {
  image_id: string;           // Unique identifier
  request_id: string;         // Parent study reference
  file_url: string;           // Storage location
  file_name: string;          // Original filename
  view_plane: ViewPlane;      // AP, PA, Lateral, Axial, Sagittal, Coronal
  sequence_number: number;    // Order in series
  uploaded_at: string;        // Upload timestamp
  uploaded_by: string;        // Staff who uploaded
  file_size: number;          // Size in bytes
  mime_type: string;          // image/jpeg, image/png, application/dicom
  notes: string | null;       // Optional notes
}

type ViewPlane = 
  | 'AP'        // Anterior-Posterior
  | 'PA'        // Posterior-Anterior
  | 'Lateral'   // Side view
  | 'Oblique'   // Angled view
  | 'Axial'     // Cross-section (CT/MRI)
  | 'Sagittal'  // Side plane (CT/MRI)
  | 'Coronal'   // Front plane (CT/MRI)
  | 'Other';
```

### Image Capacity by Modality

| Modality | Typical Image Count |
|----------|---------------------|
| X-Ray | 1-4 images |
| Ultrasound | 5-20 images |
| CT Scan | 50-500 images (slices) |
| MRI | 100-1000 images (sequences) |
| Mammography | 4-8 images |

---

## 3. Radiology Reports

### Key Principle
> **Reports are separate from images.** They are related entities, not merged data.

### Report Structure

```typescript
interface RadiologyReport {
  report_id: string;
  request_id: string;          // Link to study
  findings: string;            // Detailed observations
  impression: string;          // Clinical conclusion
  urgency: UrgencyLevel;       // Normal, Urgent, Critical
  reported_by: string;         // Radiologist ID
  reported_at: string;         // Report timestamp
  addendum: string | null;     // Later additions
  is_preliminary: boolean;     // Draft vs Final
  verified_by: string | null;  // Supervising radiologist
  verified_at: string | null;
}

type UrgencyLevel = 'Normal' | 'Urgent' | 'Critical';
```

### Report Workflow

```
Images Uploaded → Report Pending → Report Draft → Report Final → Verified
```

### Critical Finding Protocol

When `urgency = 'Critical'`:
1. System flags the report immediately
2. Ordering physician is notified
3. Alert appears in doctor's dashboard
4. Audit trail records notification

---

## 4. Role Separation

### This Matters Clinically & Legally

| Role | Responsibilities | System Permissions |
|------|------------------|-------------------|
| **Doctor** | Orders imaging, Views images, Reads report, Acts on findings | Create orders, View all, No upload, No report write |
| **Radiographer/Technician** | Performs scan, Uploads images, Updates status | Upload images, Update status, No report write |
| **Radiologist** | Reviews images, Writes official report, Flags urgent findings | Full image access, Write reports, Verify reports |

### Permission Matrix

| Action | Doctor | Radiographer | Radiologist |
|--------|--------|--------------|-------------|
| Order Study | ✅ | ❌ | ❌ |
| View Study | ✅ | ✅ | ✅ |
| Upload Images | ❌ | ✅ | ✅ |
| Start Procedure | ❌ | ✅ | ✅ |
| Complete Procedure | ❌ | ✅ | ✅ |
| Write Report | ❌ | ❌ | ✅ |
| Verify Report | ❌ | ❌ | ✅ |
| View Report | ✅ | ✅ | ✅ |

> **Your system should enforce this separation through RBAC, not rely on trust.**

---

## 5. Status-Driven Workflow

### Radiology is Asynchronous

The workflow must support these states without confusion:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Ordered   │ ──▶ │ In Progress │ ──▶ │  Completed  │ ──▶ │  Reported   │ ──▶ │  Verified   │
│             │     │             │     │             │     │             │     │             │
│ No images   │     │ Scanning    │     │ Images up   │     │ Report done │     │ Final       │
│ No report   │     │ Some images │     │ No report   │     │ Needs verify│     │ Complete    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                                                               │
       │                         ┌─────────────┐                                       │
       └────────────────────────▶│  Cancelled  │◀──────────────────────────────────────┘
                                 └─────────────┘
```

### Status Definitions

| Status | Description | Images | Report |
|--------|-------------|--------|--------|
| `Ordered` | Study ordered, waiting for patient | ❌ None | ❌ None |
| `In Progress` | Patient in radiology, scanning | 🔄 Uploading | ❌ None |
| `Completed` | All images captured and uploaded | ✅ Ready | ❌ Pending |
| `Reported` | Radiologist has written report | ✅ Ready | ✅ Draft/Final |
| `Verified` | Report verified by senior radiologist | ✅ Ready | ✅ Verified |
| `Cancelled` | Study cancelled (with reason) | ❌/✅ Varies | ❌ None |

### Common Questions This Prevents

| Question | System Answer |
|----------|---------------|
| "Where is the scan?" | Status shows `In Progress` - patient being scanned |
| "Why is report empty?" | Status shows `Completed` - awaiting radiologist |
| "Is radiology done?" | Status shows `Reported` or `Verified` = Yes |
| "Are all images uploaded?" | Compare uploaded count vs expected |

---

## 6. UI Standards

### Radiology Study View (Doctor's Perspective)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RADIOLOGY STUDY DETAILS                                     [Print] [Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Study Header                                                        │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Patient: John Doe (M, 45y)    │  Modality: CT Scan                 │   │
│  │ Study: Chest CT with Contrast │  Status: [REPORTED]                │   │
│  │ Ordered by: Dr. Smith         │  Date: 21 Dec 2025                 │   │
│  │ Clinical Indication: Rule out pulmonary embolism                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ IMAGE GALLERY                                        [Grid] [List]  │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │         │  │         │  │         │  │         │  │         │   │   │
│  │  │  IMG 1  │  │  IMG 2  │  │  IMG 3  │  │  IMG 4  │  │  IMG 5  │   │   │
│  │  │         │  │         │  │         │  │         │  │         │   │   │
│  │  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤   │   │
│  │  │ Axial 1 │  │ Axial 2 │  │ Axial 3 │  │ Sagittal│  │ Coronal │   │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │   │
│  │                                                                     │   │
│  │  Click image to zoom │ 125 images total │ Scroll for more ──────▶  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RADIOLOGY REPORT                              Reported: 21 Dec 2025 │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │                                                                     │   │
│  │ FINDINGS:                                                           │   │
│  │ The lungs are clear with no focal consolidation, pleural effusion  │   │
│  │ or pneumothorax. The heart size is within normal limits...         │   │
│  │                                                                     │   │
│  │ IMPRESSION:                                                         │   │
│  │ 1. No evidence of pulmonary embolism                               │   │
│  │ 2. Normal chest CT                                                  │   │
│  │                                                                     │   │
│  │ Reported by: Dr. Radiologist │ Verified: Yes │ Urgency: Normal     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Essential UI Features

1. **Study Details at Top** - Always visible context
2. **Image Gallery** - Scrollable grid with thumbnails
3. **Click to Zoom** - Full-screen image viewer
4. **View Labels** - AP, Lateral, Axial clearly visible
5. **Report Panel** - Alongside or below images
6. **Status Indicator** - Prominent, color-coded badge

### Image Viewer Requirements

- Zoom in/out
- Pan when zoomed
- Window/level adjustment (for DICOM)
- Rotate/flip
- Measurement tools (optional)
- Series navigation
- Full-screen mode

---

## 7. Database Schema Requirements

### Table Mapping to Standard EMR Fields

The radiology module uses the following table structure aligned with standard EMR naming:

| Standard Name | Database Table | Purpose |
|---------------|----------------|---------|
| SCAN | `imaging_catalogue` | Scan/imaging type catalogue |
| SCAN_REQUEST | `radiology_requests` | Individual scan requests |
| SCAN_RESULT | `scan_results` | Radiology reports |
| SCAN_IMAGES | `scan_images` | Multiple images per scan |

### SCAN Table (imaging_catalogue)

```sql
imaging_catalogue (
    imaging_id UUID PRIMARY KEY,      -- scan_id (PK)
    imaging_code TEXT UNIQUE,         -- scan_code
    imaging_name TEXT,                -- scan_name
    imaging_type TEXT,                -- Scan Type: X-Ray, Ultrasound, CT Scan, MRI
    category TEXT,                    -- Category: Chest, Limbs, Spine, Abdominal, Pelvic, Obstetric, Brain
    body_part TEXT,                   -- body_part
    price DECIMAL(10,2),              -- cost
    nhis_eligible BOOLEAN,            -- nhis_covered
    nhis_percentage DECIMAL(5,2),     -- nhis_percentage
    description TEXT,
    preparation_instructions TEXT,
    duration_minutes INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Scan Type Categories:**
- **X-Ray:** Chest, Limbs, Spine
- **Ultrasound:** Abdominal, Pelvic, Obstetric
- **CT Scan:** Brain, Chest, Abdomen
- **MRI:** Brain, Spine

### SCAN_REQUEST Table (radiology_requests)

```sql
radiology_requests (
    request_id UUID PRIMARY KEY,      -- scan_request_id (PK)
    encounter_id UUID,                -- encounter_id (FK to visits)
    patient_id UUID,                  -- patient reference
    visit_id UUID,                    -- visit reference
    imaging_id UUID,                  -- scan_id (FK to imaging_catalogue)
    ordered_by UUID,                  -- requested_by (Doctor ID)
    status TEXT,                      -- status
    request_date TIMESTAMPTZ,         -- request_date
    imaging_type TEXT,
    body_part TEXT,
    priority TEXT,
    clinical_indication TEXT,
    scheduled_date TIMESTAMPTZ,
    performed_at TIMESTAMPTZ,
    performed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### SCAN_RESULT Table (scan_results) - NEW

```sql
scan_results (
    scan_result_id UUID PRIMARY KEY,  -- scan_result_id (PK)
    scan_request_id UUID,             -- scan_request_id (FK)
    report TEXT,                      -- report
    findings TEXT,
    impression TEXT,
    technique TEXT,
    comparison TEXT,
    urgency TEXT,                     -- Normal, Urgent, Critical
    is_preliminary BOOLEAN,
    reported_by UUID,                 -- uploaded_by (Radiologist ID)
    reported_at TIMESTAMPTZ,          -- upload_date
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    addendum TEXT,
    addendum_by UUID,
    addendum_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### SCAN_IMAGES Table (scan_images) - NEW

```sql
scan_images (
    image_id UUID PRIMARY KEY,
    scan_request_id UUID,             -- FK to radiology_requests
    image_path TEXT,                  -- Storage URL
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    view_plane TEXT,                  -- AP, PA, Lateral, Axial, Sagittal, Coronal, Other
    sequence_number INTEGER,
    is_key_image BOOLEAN,
    notes TEXT,
    uploaded_by UUID,                 -- Staff ID
    upload_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);
```

### Field Mapping Reference

| Standard Field | Database Field | Table |
|----------------|----------------|-------|
| scan_id | imaging_id | imaging_catalogue |
| scan_code | imaging_code | imaging_catalogue |
| scan_name | imaging_name | imaging_catalogue |
| scan_type | imaging_type | imaging_catalogue |
| category | category | imaging_catalogue |
| body_part | body_part | imaging_catalogue |
| cost | price | imaging_catalogue |
| nhis_covered | nhis_eligible | imaging_catalogue |
| nhis_percentage | nhis_percentage | imaging_catalogue |
| scan_request_id | request_id | radiology_requests |
| encounter_id | encounter_id | radiology_requests |
| requested_by | ordered_by | radiology_requests |
| request_date | request_date | radiology_requests |
| scan_result_id | scan_result_id | scan_results |
| report | report | scan_results |
| uploaded_by | reported_by | scan_results |
| upload_date | reported_at | scan_results |
| image_path | image_path | scan_images |

### Indexes

```sql
CREATE INDEX idx_radiology_patient ON radiology_requests(patient_id);
CREATE INDEX idx_radiology_status ON radiology_requests(status);
CREATE INDEX idx_radiology_date ON radiology_requests(created_at);
CREATE INDEX idx_radiology_encounter ON radiology_requests(encounter_id);
CREATE INDEX idx_scan_results_request ON scan_results(scan_request_id);
CREATE INDEX idx_scan_results_reported_by ON scan_results(reported_by);
CREATE INDEX idx_scan_images_request ON scan_images(scan_request_id);
CREATE INDEX idx_scan_images_uploaded_by ON scan_images(uploaded_by);
```

---

## 8. Integration Points

### Workflow Integration with EMR

```
Doctor Consultation
       │
       ▼
Order Radiology Study ──────────────────┐
       │                                 │
       ▼                                 ▼
Billing Module (if applicable)    Radiology Queue
       │                                 │
       ▼                                 ▼
Payment Verified ───────────────▶ Patient Called
                                        │
                                        ▼
                                 Procedure Started
                                        │
                                        ▼
                                 Images Uploaded
                                        │
                                        ▼
                                 Report Written
                                        │
                                        ▼
                                 Report Verified
                                        │
                                        ▼
                               Results in Patient Record
                                        │
                                        ▼
                               Doctor Reviews & Acts
```

### API Endpoints Required

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/radiology/requests` | GET | List all requests |
| `/radiology/requests/:id` | GET | Get single request with images |
| `/radiology/requests` | POST | Create new request (doctor) |
| `/radiology/requests/:id/start` | PATCH | Start procedure |
| `/radiology/requests/:id/complete` | PATCH | Complete procedure |
| `/radiology/images` | POST | Upload image(s) |
| `/radiology/images/:id` | DELETE | Remove image |
| `/radiology/reports` | POST | Create report |
| `/radiology/reports/:id` | PATCH | Update/verify report |

### Notification Triggers

| Event | Notify |
|-------|--------|
| Study Ordered | Radiology Queue |
| Images Ready | Radiologist Queue |
| Report Completed | Ordering Physician |
| Critical Finding | Ordering Physician (STAT) |
| Verified | Patient Record Updated |

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Update `radiology_requests` table with all required fields
- [ ] Create `radiology_images` table
- [ ] Create `radiology_reports` table
- [ ] Update DTOs and TypeScript interfaces

### Phase 2: Image Management
- [ ] Multi-image upload component
- [ ] Image gallery viewer
- [ ] View plane labeling
- [ ] Zoom/pan functionality

### Phase 3: Report Workflow
- [ ] Report creation form (done ✅)
- [ ] Report verification flow
- [ ] Critical finding alerts
- [ ] Addendum support

### Phase 4: Role-Based Access
- [ ] Update RBAC for radiology roles
- [ ] Enforce upload permissions
- [ ] Enforce report write permissions
- [ ] Audit logging

### Phase 5: Integration
- [ ] Billing integration
- [ ] Notification system
- [ ] Dashboard widgets
- [ ] Print/export functionality

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial documentation |

---

*This document is part of the NDC Medical Centre EMR System documentation.*
