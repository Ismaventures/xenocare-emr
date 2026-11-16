# NDC Medical Centre EMR - Complete User Manual

<p align="center">
  <img src="assets/ndclogo.png" alt="NDC Medical Centre Logo" width="200"/>
</p>

**Version:** 3.0  
**Last Updated:** March 2026  
**Document Type:** User Manual & Operations Guide

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [System Overview](#3-system-overview)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Module Guide](#5-module-guide)
   - [5.1 Patient Registration](#51-patient-registration-module)
   - [5.2 Encounter Management](#52-encounter-management-module)
   - [5.3 Queue Management](#53-queue-management-module)
   - [5.4 Nursing Station](#54-nursing-station-module)
   - [5.5 Clinical Consultation](#55-clinical-consultation-module)
   - [5.6 Laboratory](#56-laboratory-module)
   - [5.7 Radiology](#57-radiology-module)
   - [5.8 Pharmacy](#58-pharmacy-module)
   - [5.9 Billing & Finance](#59-billing--finance-module)
   - [5.10 In-Patient Management](#510-in-patient-management-module)
   - [5.11 Specialty Clinics](#511-specialty-clinics)
   - [5.12 Inventory Management](#512-inventory-management-module)
   - [5.13 Staff Management](#513-staff-management-module)
   - [5.14 Configurations](#514-configurations-module)
   - [5.15 Analytics & Reports](#515-analytics--reports-module)
   - [5.16 Medical Reports](#516-medical-reports-module)
   - [5.17 Customer Service](#517-customer-service-module)
   - [5.18 NHIS Module](#518-nhis-module)
   - [5.19 Clinical Requests Module](#519-clinical-requests-module)
   - [5.20 Procedures Module](#520-procedures-module)
   - [5.21 A&E Module](#521-ae-accident--emergency-module)
   - [5.22 ANC Module](#522-anc-antenatal-care-module)
   - [5.23 Surgery Module](#523-surgery-theatre-module)
   - [5.24 Hygiene Module](#524-hygiene--infection-control-module)
   - [5.25 Messaging Module](#525-messaging-module)
   - [5.26 Additional Shared Modules](#526-additional-shared-modules)
6. [Complete Patient Workflow](#6-complete-patient-workflow)
   - [6.1 Out-Patient Visit (Cash)](#61-out-patient-visit-cash-patient)
   - [6.2 Out-Patient Visit (NHIS)](#62-out-patient-visit-nhis-patient)
   - [6.3 Referral and Clinical Request Workflow](#63-referral-and-clinical-request-workflow)
   - [6.4 Emergency (A&E) Workflow](#64-emergency-ae-workflow)
   - [6.5 Surgery Workflow](#65-surgery-workflow)
   - [6.6 Specialty Clinic Workflow](#66-specialty-clinic-workflow)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Troubleshooting](#8-troubleshooting)
9. [Technical Support](#9-technical-support)
10. [IT Operations Runbook](#10-it-operations-runbook)
11. [UI Guide Reference](#11-ui-guide-reference)

---

## 1. Introduction

### 1.1 About NDC Medical Centre EMR

The NDC Medical Centre Electronic Medical Record (EMR) system is a comprehensive healthcare management solution designed to digitize and streamline all hospital operations. Built for Nigerian healthcare facilities, it supports both private-pay ("Cash & Carry") and insurance-based (NHIS/HMO) patient workflows.

### 1.2 Key Features

- **Complete Patient Lifecycle Management** - From registration to discharge
- **Real-time Queue Management** - Live tracking of patient flow
- **Integrated Billing** - Automatic invoice generation and payment tracking
- **Clinical Documentation** - SOAP notes, prescriptions, and diagnostic orders
- **Insurance Support** - NHIS and HMO integration with capitation and co-pay handling
- **Inventory Management** - Drug and supplies stock management
- **Role-Based Access Control** - Secure access based on staff roles
- **Real-time Updates** - Live data synchronization across all stations

### 1.3 System Requirements

| Component | Requirement |
|-----------|-------------|
| Operating System | Windows 10/11, macOS 10.14+, Ubuntu 20.04+ |
| RAM | 8GB minimum, 16GB recommended |
| Storage | 500MB for application |
| Display | 1366x768 minimum, 1920x1080 recommended |
| Network | Stable internet connection required |

---

## 2. Getting Started

### 2.1 Logging In

1. Launch the NDC Medical Centre EMR application
2. Enter your **Email Address** (e.g., `doctor@ndchospital.com`)
3. Enter your **Password**
4. Click **Sign In**

> **Demo Accounts Available:**
> | Role | Email | Password |
> |------|-------|----------|
> | Super Admin | superadmin@ndchospital.com | Demo@123 |
> | Doctor | doctor@ndchospital.com | Demo@123 |
> | Nurse | nurse@ndchospital.com | Demo@123 |
> | Pharmacist | pharmacy@ndchospital.com | Demo@123 |
> | Billing Clerk | billing@ndchospital.com | Demo@123 |

### 2.2 Dashboard Overview

Upon login, you'll see the main dashboard with:

- **Navigation Sidebar** (left) - Access all modules
- **Stats Cards** (top) - Key metrics for your role
- **My Patients Widget** - Your current active patients
- **Quick Actions** - Frequently used functions
- **Notifications** - Alerts and pending tasks

### 2.3 Navigation

- Click module icons in the sidebar to switch between sections
- Use the **breadcrumb trail** to navigate back
- **Search bar** (Ctrl+K) for quick patient/record lookup
- **Night Mode** automatically adjusts based on time of day

---

## 3. System Overview

### 3.1 Patient Flow Diagram

```
┌─────────────────┐
│   REGISTRATION  │ ← Patient arrives, record created
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    ENCOUNTER    │ ← Visit/appointment created
└────────┬────────┘
         │
    ┌────┴────┐
    │ PAYMENT │ ← Cash patients pay first (if required)
    │ CATEGORY│
    └────┬────┘
         │
         ▼
┌─────────────────┐
│   NURSING       │ ← Vitals captured (BP, Temp, Pulse)
│   TRIAGE        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DOCTOR        │ ← Consultation, diagnosis, orders
│   CONSULTATION  │
└────────┬────────┘
         │
    ┌────┴────────────┬──────────────┐
    ▼                 ▼              ▼
┌─────────┐    ┌───────────┐   ┌──────────┐
│   LAB   │    │ RADIOLOGY │   │ PHARMACY │
│ TESTS   │    │  IMAGING  │   │  DRUGS   │
└────┬────┘    └─────┬─────┘   └─────┬────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   BILLING    │ ← Final payment/reconciliation
              │   CHECKOUT   │
              └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  COMPLETED   │ ← Visit ends
              └──────────────┘
```

### 3.2 Payment Categories

| Category | Description | Workflow |
|----------|-------------|----------|
| **Private/Cash** | Self-paying patients | Pay before each service |
| **NHIS** | National Health Insurance | Capitation + Co-pay |
| **HMO** | Health Maintenance Org. | Pre-authorization may apply |
| **Military** | Service personnel | Special rates may apply |
| **Retainership** | Corporate accounts | Monthly billing |

---

## 4. User Roles & Permissions

### 4.1 Available Roles

| Role | Access Level | Primary Modules |
|------|--------------|-----------------|
| **Super Admin** | Full system access | All modules + configurations |
| **Admin** | Administrative access | Staff, billing, reports |
| **Medical Director** | Clinical + Admin | All clinical modules |
| **Doctor** | Clinical care | Consultation, orders, history |
| **Nurse** | Nursing care | Vitals, triage, care plans |
| **Lab Technician** | Laboratory | Sample collection, results |
| **Radiologist** | Imaging | Scan processing, reports |
| **Pharmacist** | Pharmacy | Dispensing, inventory |
| **Billing Clerk** | Finance | Invoicing, payments |
| **Cashier** | Payments | Cash collection |
| **Receptionist** | Front desk | Registration, check-in |
| **Inventory Manager** | Stock | All inventory functions |

### 4.2 Module Access Matrix

| Module | Super Admin | Doctor | Nurse | Lab Tech | Pharmacist | Billing |
|--------|:-----------:|:------:|:-----:|:--------:|:----------:|:-------:|
| Registration | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Encounter | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Consultation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Nursing | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Laboratory | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Radiology | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pharmacy | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Inventory | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Module Guide

---

### 5.1 Patient Registration Module

![Patient Registration UI](docs/ui-captures/01-registration-dashboard.png)

**Access:** Receptionist, Nurse, Admin, Super Admin

**Purpose:** Create and manage patient demographic records.

#### 5.1.1 Registering a New Patient

1. Navigate to **Registration** from the sidebar
2. Click **+ New Patient** button
3. Fill in the registration form:

**Required Fields:**
- First Name
- Surname
- Date of Birth
- Gender
- Phone Number
- Patient Category (Private, NHIS, HMO, Military)

**Optional Fields:**
- Middle Name
- Email Address
- Address (State, LGA)
- Next of Kin Details
- Service Number (for military)
- NHIS/HMO Details (if applicable)

4. Click **Save Patient**
5. System generates unique **EMR Number** (e.g., `EMR-20260119-0001`)

#### 5.1.2 Patient Types

| Type | Description |
|------|-------------|
| **Principal** | Main account holder (for insurance) |
| **Dependent** | Family member linked to principal |
| **Individual** | Self-paying patient |

#### 5.1.3 Searching for Existing Patients

1. Use the **Search bar** at the top of the patient list
2. Search by:
   - Name (first, middle, or surname)
   - EMR Number
   - Phone Number
   - Service Number

#### 5.1.4 Editing Patient Information

1. Find the patient in the list
2. Click on the patient row to view details
3. Click **Edit** button
4. Modify required fields
5. Click **Save Changes**

#### 5.1.5 Adding Dependents

1. Open the principal patient's record
2. Click **Add Dependent**
3. Fill in dependent's details
4. Relationship and principal's insurance info are auto-populated
5. Save the dependent record

---

### 5.2 Encounter Management Module

![Encounter Management UI](docs/ui-captures/02-encounter-new.png)

**Access:** Receptionist, Nurse, Doctor, Admin

**Purpose:** Create and manage patient visits/encounters.

#### 5.2.1 Creating a New Encounter

An **Encounter** represents a single patient visit. Every clinical activity must be linked to an encounter.

1. Navigate to **Encounter** module
2. Click **+ New Encounter**
3. Search and select the patient
4. Select **Clinic** (e.g., General Out-Patient, Medical Out-Patient)
5. Select **Visit Type**:
   - New Visit
   - Follow-up
   - Emergency
   - Referral
6. Set **Priority**:
   - Normal
   - Urgent
   - Emergency
7. Assign **Attending Doctor** (optional)
8. Click **Create Encounter**

#### 5.2.2 Encounter Statuses

| Status | Description |
|--------|-------------|
| **Created** | Just created, awaiting processing |
| **Active** | Currently being processed |
| **Registered** | Checked in and ready |
| **Completed** | All services done |
| **Discharged** | Patient has left |
| **Cancelled** | Visit cancelled |

#### 5.2.3 Quick Encounter from Registration

After registering a patient, you'll see a prompt:

> "Would you like to create an encounter for this patient?"

Click **Yes, Create Encounter** to immediately start a visit.

---

### 5.3 Queue Management Module

![Queue Management UI](docs/ui-captures/03-queue-main.png)

**Access:** All clinical staff

**Purpose:** Track and manage patient flow through departments.

#### 5.3.1 Understanding the Queue

The queue shows real-time patient status across all departments:

| Queue Location | Meaning |
|----------------|---------|
| Reception | Awaiting check-in |
| Nursing | Awaiting vitals |
| Doctor | Waiting to see doctor |
| Lab | Lab tests pending |
| Radiology | Imaging pending |
| Pharmacy | Medications pending |
| Billing | Payment pending |

#### 5.3.2 Calling a Patient

1. Go to **Queue** module
2. Select your department tab
3. Find the next patient in queue
4. Click **Call** button
5. System announces the patient's name/number

#### 5.3.3 Serving a Patient

1. After calling, click **Start Serving**
2. Complete the required service
3. Click **Complete** to move patient to next queue

#### 5.3.4 Queue Display Screen

For waiting area screens:
1. Click **Display Mode** button
2. Shows large, easy-to-read queue numbers
3. Automatically updates in real-time

---

### 5.4 Nursing Station Module

![Nursing Station UI](docs/ui-captures/04-nursing-vitals.png)

**Access:** Nurse, Doctor, Medical Director, Admin

**Purpose:** Capture patient vitals and perform nursing assessments.

#### 5.4.1 Recording Vitals

1. Navigate to **Nursing** module
2. Select patient from the nursing queue
3. Click **Take Vitals**
4. Enter measurements:

| Vital Sign | Unit | Normal Range |
|------------|------|--------------|
| Blood Pressure (Systolic/Diastolic) | mmHg | 90-120/60-80 |
| Pulse Rate | bpm | 60-100 |
| Temperature | °C | 36.1-37.2 |
| Respiratory Rate | /min | 12-20 |
| Oxygen Saturation (SpO2) | % | 95-100 |
| Weight | kg | - |
| Height | cm | - |

5. **BMI** is automatically calculated
6. Add nursing notes if needed
7. Click **Save & Send to Doctor**

#### 5.4.2 Priority Triage

Based on vitals, the system may flag:
- 🔴 **Critical** - Immediate attention needed
- 🟠 **Abnormal** - Values outside normal range
- 🟢 **Normal** - All vitals within range

#### 5.4.3 Nursing Care Plans

For ongoing care:
1. Select patient
2. Click **Add Care Plan**
3. Define:
   - Care type (Wound Care, IV Therapy, etc.)
   - Frequency
   - Instructions
4. Track completion status

---

### 5.5 Clinical Consultation Module

![Clinical Consultation UI](docs/ui-captures/05-consultation-soap.png)

**Access:** Doctor, Medical Director, Admin

**Purpose:** Document clinical encounters, diagnoses, and order services.

#### 5.5.1 Starting a Consultation

1. Navigate to **Consultation** module
2. View your **Queue** tab - shows patients waiting for you
3. Click on a patient to start consultation
4. Review:
   - Patient demographics
   - Vitals (from nursing)
   - Medical history
   - Previous visits

#### 5.5.2 SOAP Note Documentation

The consultation follows the **SOAP** format:

**S - Subjective (Chief Complaints)**
- What the patient reports
- History of present illness
- Symptoms and duration

**O - Objective (Examination)**
- Physical examination findings
- Vitals review
- Test results review

**A - Assessment (Diagnosis)**
- Primary diagnosis
- Differential diagnoses
- ICD-10 codes (searchable)

**P - Plan (Treatment)**
- Medications (prescriptions)
- Lab tests ordered
- Imaging ordered
- Procedures
- Follow-up instructions

#### 5.5.3 Ordering Services

**Laboratory Tests:**
1. Click **+ Add Lab Order**
2. Search for test(s)
3. Set priority (Routine/Urgent/STAT)
4. Add clinical notes
5. Tests appear in Lab queue

**Radiology/Imaging:**
1. Click **+ Add Imaging Order**
2. Select modality (X-Ray, CT, MRI, Ultrasound)
3. Select body part/study
4. Provide clinical indication
5. Request appears in Radiology queue

**Prescriptions:**
1. Click **+ Add Prescription**
2. Search drug by name
3. Select formulation and strength
4. Enter:
   - Dosage
   - Frequency
   - Duration
   - Quantity
5. Prescription sent to Pharmacy

**Procedures:**
1. Click **+ Add Procedure**
2. Search procedure catalogue
3. Add notes
4. Create order

#### 5.5.4 Completing Consultation

1. Review all documentation
2. Click **Complete Consultation**
3. Choose next step:
   - Send to Lab/Radiology
   - Send to Pharmacy
   - Send to Billing
   - Discharge

#### 5.5.5 Patient History

- **History** tab shows all previous visits
- View past consultations, diagnoses, treatments
- Access old prescriptions and results
- Track chronic conditions

---

### 5.6 Laboratory Module

![Laboratory UI](docs/ui-captures/06-lab-approval.png)

**Access:** Lab Technician, Doctor, Medical Director, Admin

**Purpose:** Process laboratory test requests and record results.

#### 5.6.1 Lab Workflow

```
Ordered → Approved → Sample Collected → Processing → Results Entered → Completed
```

#### 5.6.2 Approval Queue

1. Navigate to **Laboratory** module
2. **Approval** tab shows new requests
3. Review each request:
   - Patient info
   - Tests ordered
   - Clinical notes
   - Payment status (for cash patients)
4. Click **Accept** to approve
5. Or **Reject** with reason

#### 5.6.3 Sample Collection

1. Go to **All Requests** tab
2. Filter by status: "Approved"
3. Select request
4. Click **Collect Sample**
5. Enter:
   - Sample type
   - Collection time
   - Collector name
6. Print sample labels if needed

#### 5.6.4 Entering Results

1. Find the sample in "Processing" status
2. Click **Enter Results**
3. Fill in values for each test
4. System highlights abnormal values
5. Add comments if needed
6. Click **Save Results**

#### 5.6.5 Lab Categories

| Category | Examples |
|----------|----------|
| Hematology | FBC, ESR, Blood Group |
| Chemistry | LFT, RFT, Lipid Profile |
| Microbiology | Urine M/C/S, Blood Culture |
| Serology | HIV, HBsAg, Widal |
| Parasitology | Malaria Test, Stool Analysis |

#### 5.6.6 Printing Lab Reports

1. Open completed result
2. Click **Print Report**
3. Report includes:
   - Patient details
   - Test results
   - Reference ranges
   - Lab scientist signature

---

### 5.7 Radiology Module

![Radiology UI](docs/ui-captures/07-radiology-report.png)

**Access:** Radiologist, Doctor, Medical Director, Admin

**Purpose:** Process imaging requests and create reports.

#### 5.7.1 Radiology Workflow

```
Ordered → Approved → Imaging Started → Completed → Report Written → Finalized
```

#### 5.7.2 Imaging Modalities

| Modality | Description |
|----------|-------------|
| X-Ray | Plain radiography |
| Ultrasound | Sonography |
| CT Scan | Computed Tomography |
| MRI | Magnetic Resonance Imaging |
| Fluoroscopy | Real-time X-ray imaging |
| Mammography | Breast imaging |

#### 5.7.3 Processing Imaging Requests

1. Navigate to **Radiology** module
2. Review **Approval** queue
3. Verify payment status
4. Click **Accept** to approve
5. When patient is ready, click **Start Imaging**
6. Complete the scan
7. Click **Complete Imaging**

#### 5.7.4 Writing Reports

1. Open completed study
2. Click **Write Report**
3. Enter findings:
   - Technique used
   - Findings description
   - Impression/Conclusion
   - Recommendations
4. Attach images if needed
5. Sign and finalize report

---

### 5.8 Pharmacy Module

![Pharmacy UI](docs/ui-captures/08-pharmacy-dispense.png)

**Access:** Pharmacist, Doctor, Medical Director, Admin

**Purpose:** Dispense medications and manage drug inventory.

#### 5.8.1 Pharmacy Workflow

```
Prescribed → Approved → Payment Verified → Dispensed
```

#### 5.8.2 Prescription Approval

1. Navigate to **Pharmacy** module
2. **Approval** tab shows pending prescriptions
3. Review:
   - Drug name and dosage
   - Patient allergies
   - Drug interactions
   - Stock availability
4. Click **Accept** to approve
5. Or **Reject** with reason (e.g., stock out, interaction)

#### 5.8.3 Dispensing Medications

1. Go to **Ready to Dispense** tab
2. Select prescription
3. Verify patient identity
4. Verify payment status
5. Select **Batch** (for batch tracking/expiry)
6. Enter quantity dispensed
7. Click **Dispense**
8. Provide patient counseling
9. Print dispensing label

#### 5.8.4 Drug Catalogue

The drug catalogue contains:
- Drug name
- Generic name
- Formulation
- Strength
- Unit of measure
- NHIS price
- Private price
- Stock level

#### 5.8.5 Inventory Management

1. Go to **Inventory** tab
2. View stock levels
3. See low stock alerts
4. Track batch expiry dates
5. Manage batch receipts

---

### 5.9 Billing & Finance Module

![Billing and Finance UI](docs/ui-captures/09-billing-queue.png)

**Access:** Billing Clerk, Cashier, Admin, Super Admin

**Purpose:** Generate invoices, process payments, and manage finances.

#### 5.9.1 Billing Queue

The billing queue shows:
- Services awaiting billing
- Payment category (Cash, NHIS, HMO)
- Outstanding amounts
- Payment status

#### 5.9.2 Creating Invoices

**Automatic Invoice Generation:**
- Invoices auto-generate when services are ordered
- Consultation fees, lab tests, drugs, etc.

**Manual Invoice:**
1. Click **+ Create Invoice**
2. Select patient/encounter
3. Add line items:
   - Service type
   - Description
   - Quantity
   - Unit price
4. Apply discounts if authorized
5. Generate invoice

#### 5.9.3 Processing Payments

1. Open invoice or billing order
2. Click **Record Payment**
3. Select payment method:
   - Cash
   - POS (Card)
   - Bank Transfer
   - NHIS
   - HMO
4. Enter amount received
5. Print receipt

#### 5.9.4 Insurance Billing (NHIS/HMO)

For insured patients:
1. Verify insurance details
2. Calculate co-pay portion
3. Record patient portion payment
4. Generate claim for insurer

#### 5.9.5 Service Pricing

Manage prices for all services:
- Consultation fees (by clinic)
- Lab test prices
- Imaging prices
- Drug prices
- Procedure prices

Separate pricing for:
- Private patients
- NHIS patients
- Emergency fees
- Follow-up fees

#### 5.9.6 Daily Reconciliation

End-of-day process:
1. View all transactions
2. Reconcile cash vs. system
3. Record any discrepancies
4. Close shift
5. Print summary report

---

### 5.10 In-Patient Management Module

![In-Patient Management UI](docs/ui-captures/21-in-patient-management.png)

**Access:** Doctor, Nurse, Medical Director, Admin

**Purpose:** Manage admitted patients, wards, and beds.

#### 5.10.1 Admitting a Patient

1. From consultation, click **Admit Patient**
2. Or navigate to **In-Patient** module
3. Select patient/encounter
4. Choose:
   - Ward type (General, ICU, Private)
   - Specific bed
   - Admitting diagnosis
   - Admitting doctor
5. Confirm admission

#### 5.10.2 Ward Management

| Ward Type | Description |
|-----------|-------------|
| General | Standard ward |
| ICU | Intensive Care Unit |
| Private | Single room |
| Emergency | Emergency holding |
| Pediatric | Children's ward |
| Maternity | Obstetric ward |

#### 5.10.3 Daily Ward Rounds

1. Select ward
2. View all patients
3. For each patient:
   - Review vitals trend
   - Update progress notes
   - Modify orders
   - Plan discharge if ready

#### 5.10.4 Discharge Process

1. Ensure all services complete
2. Write discharge summary
3. Provide discharge medications
4. Finalize billing
5. Process payment
6. Release bed

---

### 5.11 Specialty Clinics

![Specialty Clinics UI](docs/ui-captures/22-specialty-clinics-overview.png)

#### 5.11.1 Dental Module

**Access:** Doctor (Dental), Nurse, Admin

Features:
- Dental charting
- Treatment planning
- Procedure documentation
- Dental imaging requests

#### 5.11.2 Ophthalmology (Eye Clinic)

**Access:** Doctor (Ophthalmology), Nurse, Admin

Features:
- Visual acuity recording
- Eye examination forms
- Refraction results
- Tonometry records

#### 5.11.3 Physiotherapy

**Access:** Doctor, Physiotherapist, Nurse, Admin

Features:
- Treatment plans
- Session documentation
- Progress tracking
- Exercise prescriptions

---

### 5.12 Inventory Management Module

![Inventory Management UI](docs/ui-captures/23-inventory-management.png)

**Access:** Inventory Manager, Pharmacist, Admin

**Purpose:** Manage all hospital supplies and drugs.

#### 5.12.1 Stock Management

- View current stock levels
- Set reorder points
- Receive new stock
- Record stock adjustments
- Track batch numbers

#### 5.12.2 Low Stock Alerts

System alerts when:
- Stock falls below reorder level
- Items approaching expiry
- Items out of stock

#### 5.12.3 Stock Transactions

| Transaction | Description |
|-------------|-------------|
| Receipt | New stock received |
| Issue | Stock dispensed/used |
| Adjustment | Correction (+/-) |
| Transfer | Between locations |
| Expired | Write-off expired items |

---

### 5.13 Staff Management Module

![Staff Management UI](docs/ui-captures/24-staff-management.png)

**Access:** Admin, Super Admin

**Purpose:** Manage staff accounts and assignments.

#### 5.13.1 Creating Staff Accounts

1. Navigate to **Staff** module
2. Click **+ Add Staff**
3. Enter:
   - Full name
   - Email (for login)
   - Role
   - Department
   - Phone number
4. System creates login credentials

#### 5.13.2 Managing Roles

1. Select staff member
2. Click **Edit**
3. Change role assignment
4. Update department
5. Activate/deactivate account

---

### 5.14 Configurations Module

![Configurations UI](docs/ui-captures/20-config-pricing.png)

**Access:** Config Admin, Admin, Super Admin

**Purpose:** System-wide settings and configurations.

#### 5.14.1 Clinic Setup

- Add/edit clinics
- Set consultation fees
- Configure working hours
- Assign default staff

#### 5.14.2 Department Setup

- Create departments
- Define department heads
- Set access permissions

#### 5.14.3 Price Management

- Service pricing
- NHIS pricing
- Package pricing
- Discount rules

#### 5.14.4 System Settings

- Hospital information
- Logo and branding
- Receipt templates
- Report templates

---

### 5.15 Analytics & Reports Module

![Analytics and Reports UI](docs/ui-captures/18-analytics-dashboard.png)

**Access:** Admin, Medical Director, Super Admin

**Purpose:** Business intelligence and reporting.

#### 5.15.1 Dashboard Metrics

- Daily patient count
- Revenue summary
- Department utilization
- Pending payments

#### 5.15.2 Report Types

| Report | Description |
|--------|-------------|
| Patient Census | Daily/monthly patient counts |
| Revenue Report | Income by category/period |
| Department Statistics | Workload by department |
| Insurance Claims | NHIS/HMO claims status |
| Inventory Report | Stock levels and usage |
| Staff Performance | Activity metrics |

#### 5.15.3 Exporting Reports

- PDF format
- Excel format
- Print directly

---

### 5.16 Medical Reports Module

![Medical Reports UI](docs/ui-captures/19-medical-reports-form.png)

**Access:** Doctor, Medical Director, Admin

**Purpose:** Generate official medical documents.

#### 5.16.1 Available Reports

- Medical Certificate
- Sick Leave Certificate
- Referral Letter
- Discharge Summary
- Medical History Summary
- Fitness Certificate

#### 5.16.2 Generating Reports

1. Navigate to **Medical Reports**
2. Select report type
3. Search for patient
4. Fill in required details
5. Preview and print
6. Sign and stamp

---

### 5.17 Customer Service Module

![Customer Service UI](docs/ui-captures/25-customer-service.png)

**Access:** Customer Service, Receptionist, Admin

**Purpose:** Handle patient feedback and complaints.

#### 5.17.1 Features

- Record patient feedback
- Track complaints
- Assign to departments
- Monitor resolution
- Report trends

---

### 5.18 NHIS Module

![NHIS Module UI](docs/ui-captures/10-nhis-dashboard.png)

**Access:** NHIS Officers, Billing, Admin, Medical Director

**Purpose:** Central insurance workflow for verification, approvals, pre-authorization, claims, specialty referral authorization, and NHIS profile administration.

#### 5.18.1 NHIS Tabs and What Each Does

| Tab | Primary Use |
|-----|-------------|
| Dashboard | NHIS KPIs, pending workload, throughput |
| Verification | Verify patient eligibility and active encounter coverage |
| Specialty Referrals | Approve/reject specialty referral requests |
| Outgoing Referrals | Manage external facility referral flow |
| Service Approvals | Review service-specific authorization requests |
| Provisional Queue | Handle temporary authorization code requests |
| Claims | Claim preparation and submission status |
| Profiles | Patient NHIS profile management |
| Pre-Auth Config | Configure services that require pre-authorization |

#### 5.18.2 Enabling NHIS Logic (Operational Checklist)

1. In **Patient Registration**, set patient category to **NHIS/HMO** and complete insurer details.
2. In **Configurations/Billing**, ensure NHIS prices are populated for consultation, lab, imaging, pharmacy, and procedures.
3. In **NHIS > Pre-Auth Config**, mark services that require pre-authorization.
4. In **Clinical Consultation**, place orders normally; the system routes NHIS approval logic based on service type and configuration.
5. In **NHIS > Verification**, verify eligibility for active encounters.
6. In **NHIS queues**, approve/refuse pending requests and document notes.
7. In **Billing**, confirm co-pay/covered amounts and complete posting.

#### 5.18.3 NHIS Governance Rules

- Do not process paid/private flows for NHIS encounters unless explicitly converted.
- Pre-authorization services must be approved before execution.
- Use documented rejection reasons for auditability.
- Reconcile daily between NHIS approvals, billing postings, and claims queue.

---

### 5.19 Clinical Requests Module

![Clinical Requests UI](docs/ui-captures/11-clinical-requests-board.png)

**Access:** Doctors, Clinical Coordinators, Admin, Authorized Department Leads

**Purpose:** Cross-department request orchestration through a three-stage operational board.

#### 5.19.1 Workflow Stages

| Stage | Typical Requests |
|-------|------------------|
| Needs Approval | Procedures, surgery requests, referrals, transfers, discharges |
| Awaiting Payment | Approved requests waiting for payment confirmation |
| Ready to Execute | Paid/authorized requests ready for department action |

#### 5.19.2 Key Actions

1. Open request details.
2. Review urgency, clinical reason, ordering clinician, and notes.
3. Approve/reject/schedule/start/complete depending on stage.
4. For procedure/surgery requests, use dedicated scheduling modal.
5. For discharge requests, use discharge execution modal and complete required fields.

---

### 5.20 Procedures Module

![Procedures Module UI](docs/ui-captures/12-procedures-list.png)

**Access:** Doctors, Theatre Coordinators, Procedure Team, Admin

**Purpose:** Centralized procedure scheduling and tracking outside the surgery theatre module.

#### 5.20.1 Core Screens

- **Master Procedure List** (filterable, searchable)
- **Procedure Form** (new/edit)
- **Procedure Details** (timeline/status/checklists)
- **Procedure History**

#### 5.20.2 Daily Use

1. Click **Schedule Procedure**.
2. Capture patient, indication, planned date/time, priority.
3. Track status progression: scheduled -> in_progress -> completed/cancelled.
4. Review audit trail in details/history views.

---

### 5.21 A&E (Accident & Emergency) Module

![A and E Module UI](docs/ui-captures/13-ae-board.png)

**Access:** Emergency Team, Nurses, Doctors, Admin

**Purpose:** Emergency intake, active encounter management, and rapid triage operations.

#### 5.21.1 Main Views

| View | Purpose |
|------|---------|
| Dashboard | Emergency metrics and prioritized patients |
| Patient Board | Real-time emergency board |
| New Arrival | Register emergency arrivals quickly |
| Active Encounter | Full emergency encounter actions |

#### 5.21.2 Emergency Intake Flow

1. Click **New Arrival**.
2. Register or select patient.
3. Create emergency encounter and triage.
4. Move patient through diagnostics/procedures/ward transfer.

---

### 5.22 ANC (Antenatal Care) Module

![ANC Module UI](docs/ui-captures/14-anc-dashboard.png)

**Access:** Obstetrics Team, ANC Nurses, Doctors, Admin

**Purpose:** Pregnancy episode enrollment, maternal monitoring, and ANC follow-up tracking.

#### 5.22.1 ANC Views

- **ANC Dashboard**
- **New Enrollment**
- **Pregnancy Detail View**

#### 5.22.2 Typical ANC Cycle

1. Create enrollment episode.
2. Record maternal baseline and risk indicators.
3. Track scheduled visits and interventions.
4. Update pregnancy detail continuously until discharge/postnatal transition.

---

### 5.23 Surgery (Theatre) Module

![Surgery Module UI](docs/ui-captures/15-surgery-schedule.png)

**Access:** Surgeons, Theatre Nurses, Anesthesia Team, Admin

**Purpose:** Theatre scheduling and complete peri-operative documentation.

#### 5.23.1 Surgery Sub-Modules

| Sub-Module | Purpose |
|------------|---------|
| Dashboard | Theatre overview and case status |
| Schedule Calendar | Planned surgeries by date/room |
| Rooms Management | Theatre room setup and availability |
| Surgery History | Historical case review |
| Surgery Form | New/edit case setup |
| Pre-Op Form | Pre-operative assessment |
| Safe Surgery Checklist | WHO checklist style controls |
| Anesthesia Form | Anesthesia details and timing |
| Intra-Op Form | Intra-operative records |
| Post-Op Form | Immediate post-operative plan |
| Consumables Form | Consumable usage capture |

#### 5.23.2 End-to-End Surgery Workflow

1. Schedule surgery and assign theatre room.
2. Complete pre-op and checklist.
3. Capture anesthesia and intra-op records.
4. Complete post-op and consumables.
5. Close case and handoff for billing/discharge.

---

### 5.24 Hygiene & Infection Control Module

![Hygiene and Infection Control UI](docs/ui-captures/16-hygiene-worklist.png)

**Access:** Infection Control Team, Nursing Leadership, Admin

**Purpose:** Hygiene task management, infection surveillance, and compliance reporting.

#### 5.24.1 Main Areas

- Hygiene Dashboard
- Care Documentation Form
- Care Records List
- Infection Surveillance List
- Infection Report Form
- Hygiene Worklist

#### 5.24.2 Operational Pattern

1. Record hygiene care actions.
2. Log infection events.
3. Track worklist completion.
4. Escalate trends for clinical governance.

---

### 5.25 Messaging Module

![Messaging Module UI](docs/ui-captures/17-messaging-inbox.png)

**Access:** All authenticated users with module permission

**Purpose:** Internal communication between staff and departments.

#### 5.25.1 Messaging Capabilities

- Inbox, sent, archived mailboxes
- Compose and reply to messages/threads
- Role/department/staff recipient targeting
- Mark read/unread, archive, delete
- Notification and subscription support

#### 5.25.2 Recommended Use

- Use for operational handoffs and non-urgent coordination.
- Do not place PHI in free-text beyond approved policy.
- Escalate urgent patient safety issues through immediate clinical channels.

---

### 5.26 Additional Shared Modules

![Additional Shared Modules UI](docs/ui-captures/26-shared-modules-overview.png)

**Purpose:** Support modules that interact with primary care flows.

| Module | Use |
|--------|-----|
| Specialty Clinic (Generic) | Shared workflow for specialties beyond dedicated modules |
| Specialty Common | Shared specialty orders/referral logic and dashboards |
| Clinical Export | Encounter and workflow data exports |
| Medical Records | Unified encounter-centric patient history view |
| Treatment Plan | Structured multi-step plan management |
| Neuropsychiatry | Specialty-specific behavioral/mental health workflows where enabled |

#### 5.26.1 Shared Specialty Timeline Behavior

- Encounter history is shown as a timeline.
- Orders and Services tab tracks Lab, Imaging, Procedures, Medications, and Referrals.
- Request-to-result stages are visible per encounter where data exists.

#### 5.26.2 Price Editing and Service Catalog Governance

1. Open **Configurations** and relevant catalog/pricing pages.
2. Update NHIS/private prices carefully with effective-date discipline.
3. Re-test one encounter end-to-end (order -> billing -> execution).
4. Confirm analytics and billing totals reflect new price points.

---

## 6. Complete Patient Workflow

### 6.1 Out-Patient Visit (Cash Patient)

![Cash Patient Workflow UI](docs/ui-captures/31-cash-workflow.png)

```
Step 1: REGISTRATION
├── Search if patient exists
├── If new: Create patient record
└── Verify contact details

Step 2: CREATE ENCOUNTER
├── Select clinic
├── Set visit type
└── Patient moves to Nursing Queue

Step 3: NURSING TRIAGE
├── Nurse calls patient from queue
├── Record vitals
└── Send to Doctor Queue

Step 4: CONSULTATION
├── Doctor calls patient
├── Document SOAP notes
├── Order tests/medications
└── System creates billing orders

Step 5: BILLING (For Cash)
├── Patient sent to Billing
├── Invoice generated
├── Payment collected
└── Receipt issued

Step 6: LAB/RADIOLOGY (If ordered)
├── Proceed after payment
├── Samples collected
├── Results entered
└── Return to Doctor

Step 7: PHARMACY
├── Verify payment
├── Dispense medications
└── Counsel patient

Step 8: CHECKOUT
├── All services complete
├── Final billing check
└── Visit marked Complete
```

### 6.2 Out-Patient Visit (NHIS Patient)

![NHIS Patient Workflow UI](docs/ui-captures/32-nhis-workflow.png)

```
Step 1-2: Same as Cash Patient

Step 3: NURSING
├── Verify NHIS card
├── Check eligibility
└── Record vitals

Step 4: CONSULTATION
├── Services covered under capitation
└── Orders sent directly to service areas

Step 5: LAB/RADIOLOGY
├── No upfront payment required
└── Process immediately

Step 6: PHARMACY
├── Check drug formulary
├── Calculate co-pay
├── Collect co-pay portion
└── Dispense medications

Step 7: CHECKOUT
├── Record all services for claims
└── Generate NHIS encounter form
```

### 6.3 Referral and Clinical Request Workflow

![Referral and Clinical Request Workflow UI](docs/ui-captures/33-clinical-requests-workflow.png)

```
Step 1: ORDERING CLINIC RAISES REQUEST
├── Procedure / Surgery / Referral / Transfer / Discharge
└── Clinical reason + urgency captured

Step 2: NEEDS APPROVAL QUEUE
├── Clinical requests reviewer approves/rejects
└── Scheduling details added where required

Step 3: AWAITING PAYMENT/AUTH
├── Private: payment verification required
├── NHIS/HMO: approval/pre-auth verification required
└── Status moves to Ready to Execute

Step 4: EXECUTION BY TARGET UNIT
├── Start request
├── Perform service
└── Complete request with outcome notes
```

### 6.4 Emergency (A&E) Workflow

![Emergency Workflow UI](docs/ui-captures/34-ae-workflow.png)

```
Step 1: NEW ARRIVAL
├── Register emergency patient
└── Create emergency encounter

Step 2: RAPID TRIAGE
├── Vitals + risk classification
└── Prioritize on emergency board

Step 3: ACTIVE ENCOUNTER MANAGEMENT
├── Doctor review and immediate interventions
├── Orders (lab/imaging/procedures)
└── Admission/transfer/discharge decision
```

### 6.5 Surgery Workflow

![Surgery Workflow UI](docs/ui-captures/35-surgery-workflow.png)

```
Step 1: SURGERY REQUEST/SCHEDULING
├── Add case to theatre schedule
└── Assign room/team/time

Step 2: PRE-OPERATIVE READINESS
├── Pre-op assessment
├── Safe surgery checklist
└── Anesthesia plan

Step 3: OPERATIVE DOCUMENTATION
├── Intra-op notes and milestones
└── Consumables capture

Step 4: POST-OPERATIVE HANDOFF
├── Post-op orders and monitoring plan
└── Billing/recovery/discharge continuation
```

### 6.6 Specialty Clinic Workflow

![Specialty Clinic Workflow UI](docs/ui-captures/36-specialty-workflow.png)

```
Step 1: SPECIALTY CONSULT / TRIAGE
├── Dental / Ophthalmology / Physiotherapy / Generic specialty
└── Encounter-linked specialty assessment

Step 2: ORDERS & SERVICES
├── Lab + Imaging + Procedures + Medications + Referrals
└── Requests submitted from specialty workflow

Step 3: TRACKING
├── Status progression from request to result
└── Timeline view aggregates encounter history

Step 4: COMPLETION/FOLLOW-UP
├── Plan follow-up visit or discharge
└── Complete specialty documentation
```

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Ctrl + N` | New patient |
| `Ctrl + E` | New encounter |
| `Ctrl + S` | Save current form |
| `Escape` | Close modal/dialog |
| `F5` | Refresh current view |

---

## 8. Troubleshooting

### 8.1 Common Issues

**Cannot Login**
- Verify email and password
- Check CAPS LOCK
- Contact admin if locked out

**Patient Not Found**
- Try different search terms
- Check spelling
- Search by EMR number

**Cannot Save Record**
- Check required fields (marked with *)
- Verify internet connection
- Try refreshing the page

**Payment Not Reflecting**
- Check receipt was generated
- Verify correct encounter selected
- Contact billing department

### 8.2 Error Messages

| Error | Solution |
|-------|----------|
| "Session Expired" | Login again |
| "Network Error" | Check internet connection |
| "Permission Denied" | Contact admin for access |
| "Record Locked" | Another user is editing |

---

## 9. Technical Support

### 9.1 Contact Information

- **IT Help Desk:** [internal extension]
- **System Admin:** admin@ndchospital.com
- **Emergency Support:** [phone number]

### 9.2 Reporting Issues

When reporting issues, provide:
1. Your username
2. Module/screen affected
3. Steps to reproduce
4. Error message (if any)
5. Screenshot (if possible)

---

## 10. IT Operations Runbook

This section is for IT, implementation, and super admin support staff.

### 10.1 Daily Technical Health Checks

1. Confirm application login for at least one clinical role and one billing role.
2. Confirm queue updates propagate across Nursing, Consultation, Lab, Radiology, Pharmacy.
3. Confirm billing status transitions reflect in service modules.
4. Confirm NHIS verification and approval queues are loading.
5. Confirm one report export (PDF/Excel) succeeds.

### 10.2 Common Production Error Patterns

| Symptom | Typical Root Cause | IT Action |
|---------|--------------------|-----------|
| Supabase 400 on list loads | Query selects columns not present in current DB schema | Verify table columns in SQL schema and align query projection |
| Supabase 23503 FK violation | Wrong FK identifier type/value used in mutation | Check FK target column type and map correct ID source |
| Service shows Not Billed unexpectedly | Missing or mismatched billing_items to service link | Verify billing_items.service_reference_id/item_id linkage and billing_order status |
| 409 on update | Record version/state conflict or constrained transition | Refresh state, re-open record, retry with latest status |
| Permission denied or empty data | RLS/policy/user-role mismatch | Validate role permissions, policy scope, and facility filters |

### 10.3 Radiology and Imaging Technical Notes

- Ensure scan result queries support both `request_id` and legacy `scan_request_id` forms where applicable.
- Ensure `performed_by` in `radiology_requests` maps to `staff.staff_id` where FK uses varchar staff IDs.
- Ensure billing gate checks link imaging request IDs to billing_items and billing_orders correctly.

### 10.4 NHIS Enablement and Validation Checklist

1. Confirm patient category and NHIS profile completeness.
2. Confirm NHIS price mappings exist for all active service catalogs.
3. Confirm pre-authorization rules are configured in NHIS pre-auth settings.
4. Confirm specialty and outgoing referral approval queues are operational.
5. Confirm claims queue receives completed, approved service records.

### 10.5 Price Change Governance (IT + Billing)

1. Record baseline price snapshot before updates.
2. Apply updates in configuration/catalog pricing screens.
3. Validate one private and one NHIS encounter through full billing cycle.
4. Reconcile posted totals in analytics and billing reports.
5. Document effective date and approver.

### 10.6 Export and Reporting Validation

1. Validate medical report generation for at least one patient.
2. Validate analytics export in both PDF and spreadsheet format.
3. Confirm exports contain expected filters/date ranges.
4. Check rendering issues for missing logos/fonts.

### 10.7 Incident Escalation Template

Use this template when escalating to engineering:

- Incident ID:
- Date/Time:
- Environment (dev/staging/prod):
- Module/Screen:
- User role affected:
- Exact error message/code:
- Last successful action:
- Reproduction steps:
- Workaround found (yes/no):
- Data impact (none/low/medium/high):

### 10.8 PowerShell Verification Guidance

For API-level checks:

1. Use environment-scoped credentials from local secure config.
2. Query affected service table by request ID/encounter ID.
3. Query related billing_items and billing_orders for same service reference.
4. Compare workflow status in UI versus DB response.
5. Capture JSON output in incident ticket.

---

## 11. UI Guide Reference

### 11.1 Global UI Patterns

- **Sidebar Navigation:** Primary module switching.
- **Top Header + Stats Cards:** Role-specific context and KPIs.
- **Queue Tables:** Status-first operational worklists.
- **Detail Modals:** Approval, scheduling, and execution actions.
- **Timeline Views:** Encounter history and request-to-result tracking.

### 11.2 Status Badge Semantics (General)

| Status Family | Typical Meaning |
|--------------|-----------------|
| Pending/Needs Approval | Awaiting review action |
| Approved/Scheduled | Ready and planned |
| In Progress/Processing | Active execution underway |
| Completed/Finalized | Finished with documented outcome |
| Rejected/Cancelled | Not proceeding |
| Not Billed/Unknown | Billing gate unresolved |

### 11.3 UI Behavior Expectations

1. Lists should refresh after mutations (approve/reject/start/complete).
2. Payment-gated services should not proceed without valid paid/approved status.
3. Encounter-linked history should display latest items first.
4. Search and filter should apply before pagination where supported.
5. Modal close should not discard saved actions.

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **EMR** | Electronic Medical Record |
| **Encounter** | A single patient visit |
| **NHIS** | National Health Insurance Scheme |
| **HMO** | Health Maintenance Organization |
| **SOAP** | Subjective, Objective, Assessment, Plan |
| **RLS** | Row-Level Security |
| **Vitals** | Basic health measurements |
| **Queue** | Waiting list for service |
| **Capitation** | Fixed payment per enrolled patient |
| **Co-pay** | Patient portion of insured cost |

---

## Appendix B: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial release |
| 2.0 | Jan 2026 | Added specialty modules, updated workflows |
| 3.0 | Mar 2026 | Added full module coverage, NHIS operational logic, expanded workflow maps, UI guide, and IT runbook |

---

*© 2026 NDC Medical Centre. All rights reserved.*
