# NDC Medical Centre EMR System

A comprehensive Electronic Medical Record (EMR) system built for hospital operations, managing the complete patient journey from registration to discharge with integrated billing, clinical workflows, and analytics.

---

## 📋 Table of Contents

- [Overview](#overview)
- [General Workflow](#general-workflow)
- [User Roles](#user-roles)
- [Modules](#modules)
- [Project Structure](#project-structure)
- [Database Setup](#database-setup)
- [Technologies](#technologies)
- [Getting Started](#getting-started)

---

## Overview

The NDC Medical Centre EMR is a **"Cash & Carry"** system that enforces payment before service delivery. It digitizes the entire hospital workflow, ensuring:

- ✅ **Real-time patient tracking** across departments
- ✅ **Payment-gated services** (no unpaid orders proceed)
- ✅ **Integrated billing** with support for Cash, NHIS, and Retainership
- ✅ **Complete audit trail** of all clinical and financial transactions

---

## General Workflow

The system follows a **state-machine approach** to manage patient flow through the hospital. Here's the complete journey:

### 🔄 Patient Journey Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT ARRIVES                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1️⃣  CUSTOMER SERVICE / REGISTRATION                                        │
│  ─────────────────────────────────────                                       │
│  • New Patient: Register demographics, next of kin, payer info              │
│  • Returning Patient: Search & verify details                               │
│  • Create VISIT (Encounter) for the day                                      │
│  • Assign Priority: Emergency 🔴 | Urgent 🟡 | Normal 🟢                     │
│  • Set Payment Category: Cash | NHIS | Retainership                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            [Cash Patient]                  [NHIS/Retainership]
                    │                               │
                    ▼                               │
┌───────────────────────────────┐                   │
│  2️⃣  BILLING (Pre-Payment)    │                   │
│  ──────────────────────────── │                   │
│  • Pay Consultation Fee       │                   │
│  • Issue Receipt              │                   │
│  • Payment unlocks queue      │                   │
└───────────────────────────────┘                   │
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3️⃣  NURSING STATION (Triage)                                               │
│  ─────────────────────────────────                                          │
│  • Record Vitals: BP, Pulse, Temperature, SpO2, Weight, Height              │
│  • Chief Complaint                                                           │
│  • Allergy Alerts                                                            │
│  • Move patient to Doctor Queue                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4️⃣  DOCTOR CONSULTATION                                                    │
│  ─────────────────────────────                                              │
│  • Review Vitals & Patient History                                          │
│  • SOAP Notes (Subjective, Objective, Assessment, Plan)                     │
│  • Diagnosis (ICD-10 Codes)                                                 │
│  • Issue Orders:                                                             │
│    ├── 🧪 Lab Tests → Creates Billing Order → Lab Queue                     │
│    ├── 📷 Radiology → Creates Billing Order → Radiology Queue               │
│    └── 💊 Prescriptions → Creates Billing Order → Pharmacy Queue            │
│  • Referrals (if needed)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   LAB QUEUE   │         │ RADIOLOGY Q   │         │ PHARMACY Q    │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5️⃣  CASHIER / BILLING                                                      │
│  ───────────────────────                                                    │
│  • View all pending Billing Orders                                          │
│  • Process Payment (Cash / POS / Transfer)                                  │
│  • For NHIS: Verify authorization, apply co-pay                             │
│  • Mark order as PAID                                                       │
│  • Print Receipt                                                            │
│  • Payment Status updates in real-time across all modules                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  6️⃣  LABORATORY   │     │  6️⃣  RADIOLOGY    │     │  6️⃣  PHARMACY     │
│  ────────────────  │     │  ────────────────  │     │  ────────────────  │
│  • View Paid Reqs  │     │  • View Paid Reqs  │     │  • View Paid Rx    │
│  • Collect Sample  │     │  • Schedule Scan   │     │  • Verify Stock    │
│  • Run Tests       │     │  • Perform Imaging │     │  • Dispense Drugs  │
│  • Enter Results   │     │  • Upload Images   │     │  • Deduct Inventory│
│  • Validate & Sign │     │  • Write Report    │     │  • Patient Signs   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  7️⃣  DOCTOR FOLLOW-UP (If Results Require)                                  │
│  ───────────────────────────────────────────                                │
│  • Review Lab/Radiology Results                                             │
│  • Modify Treatment Plan                                                    │
│  • Additional Orders (if needed)                                            │
│  • Discharge or Admit                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            [Discharge]                       [Admit]
                    │                               │
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│  8️⃣  FINAL BILLING            │   │  INPATIENT (Future)           │
│  ──────────────────            │   │  Ward Management               │
│  • Review All Charges         │   │  Daily Rounds                  │
│  • Process Final Payment      │   │  Discharge Planning            │
│  • Print Final Receipt        │   └───────────────────────────────┘
│  • Close Visit                │
└───────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ✅ VISIT COMPLETED                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 💰 Payment Gating Logic

The system enforces a strict **"Pay Before Service"** policy:

| Service | Payment Required Before |
|---------|------------------------|
| Consultation | Entering Doctor Queue (Cash patients) |
| Lab Tests | Sample Collection |
| Radiology | Imaging Procedure |
| Pharmacy | Drug Dispensing |

**How It Works:**
1. Doctor creates an order (Lab/Radiology/Prescription)
2. System automatically creates a `billing_order` record with status `PENDING`
3. Order appears in Cashier queue with payment badge showing ⏳ **Pending**
4. Lab/Radiology/Pharmacy sees the order but cannot proceed until paid
5. Cashier processes payment → Status changes to ✅ **Paid**
6. Service department can now proceed with the order

---

### 🏥 Queue States

Each visit moves through queue stations:

| Queue Station | Department | Next Station |
|--------------|------------|--------------|
| `REGISTRATION` | Front Desk | BILLING or NURSING |
| `BILLING` | Cashier | NURSING |
| `NURSING` | Nursing Station | DOCTOR |
| `DOCTOR` | Consultation Room | LAB, RADIOLOGY, PHARMACY, or BILLING |
| `LAB` | Laboratory | DOCTOR or BILLING |
| `RADIOLOGY` | Imaging | DOCTOR or BILLING |
| `PHARMACY` | Dispensary | BILLING or COMPLETED |
| `COMPLETED` | - | Visit Closed |

---

## User Roles

| Role | Access | Key Functions |
|------|--------|---------------|
| **Admin** | Full System | User management, configurations, all modules |
| **Customer Service** | Registration | Patient registration, check-in, scheduling |
| **Cashier** | Billing | Payment processing, receipts, reconciliation |
| **Nurse** | Nursing | Vitals, triage, nursing notes |
| **Doctor** | Clinical | Consultations, orders, diagnoses |
| **Lab Technician** | Laboratory | Sample processing, results entry |
| **Radiologist** | Radiology | Imaging, reports |
| **Pharmacist** | Pharmacy | Drug dispensing, inventory |

---

## Modules

### Core Modules

| Module | Location | Description |
|--------|----------|-------------|
| **Patient Registration** | `modules/patient-registration` | Register patients, manage demographics |
| **Customer Service** | `modules/customer-service` | Check-in, visit creation, scheduling |
| **Queue Management** | `modules/queue` | Real-time patient tracking dashboard |
| **Nursing** | `modules/nursing` | Vitals recording, triage |
| **Clinical Consultation** | `modules/clinical-consultation` | Doctor's workspace, SOAP notes, orders |
| **Laboratory** | `modules/lab` | Test requests, results, validation |
| **Radiology** | `modules/radiology` | Imaging requests, uploads, reports |
| **Pharmacy** | `modules/pharmacy` | Prescriptions, dispensing, inventory |
| **Billing & Payments** | `modules/billing` | Payment queue, invoicing, receipts, payment processing |
| **Analytics** | `modules/analytics` | Reports, dashboards, statistics |
| **Configurations** | `modules/configurations` | System settings, service items, users |

### Shared Components

| Component | Location | Description |
|-----------|----------|-------------|
| **Workflow Engine** | `lib/workflow` | State machine, payment gating, transitions |
| **UI Components** | `components/ui` | Buttons, Cards, Modals, Forms |
| **Auth Components** | `components/auth` | Protected routes, role gates |

---

## Project Structure

```
src/renderer/
├── modules/                    # Business domain modules
│   ├── patient-registration/   # Patient demographics
│   ├── customer-service/       # Check-in, scheduling
│   ├── queue/                  # Queue management
│   ├── nursing/                # Vitals, triage
│   ├── clinical-consultation/  # Doctor's interface
│   ├── lab/                    # Laboratory
│   ├── radiology/              # Imaging
│   ├── pharmacy/               # Dispensary
│   ├── billing/                # Billing & Payments
│   ├── analytics/              # Reports
│   ├── configurations/         # Settings
│   └── inventory/              # Stock management
├── lib/
│   └── workflow/               # Core workflow engine
│       ├── api.ts              # Workflow API functions
│       ├── types.ts            # TypeScript types
│       ├── hooks.ts            # React hooks
│       └── payment-gating.ts   # Payment enforcement
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── auth/                   # Authentication guards
│   └── workflow/               # Workflow components
├── contexts/
│   └── AuthContext.tsx         # Authentication provider
└── api/
    └── supabaseClient.ts       # Database client
```

---

## Database Setup (Supabase)

1. Create a new Supabase project
2. Go to the SQL Editor in the Supabase dashboard
3. Run migration files in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_seed_admin_users.sql`
   - ... up to the latest migration
4. Get your Supabase URL and Anon Key from project settings
5. Create a `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Technologies

| Category | Technology |
|----------|------------|
| **Platform** | Electron (Desktop App) |
| **Frontend** | React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Routing** | React Router DOM |

---

## Getting Started

### Prerequisites
- Node.js v16+
- npm or yarn
- Supabase project

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd emr

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
# (Execute SQL files in Supabase SQL Editor)

# Start development server
npm start
```

### Production Build

```bash
npm run package
```

---

## Support

For issues or questions, contact the development team.
