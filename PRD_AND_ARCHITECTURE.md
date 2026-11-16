# NDC Medical Centre EMR - Product Requirements Document (PRD) & Technical Architecture

**Version:** 2.0  
**Date:** December 20, 2025  
**Status:** Active Development

---

## 1. Executive Summary
The NDC Medical Centre EMR is a comprehensive, desktop-based Electronic Medical Record system designed to digitize hospital operations. It manages the entire patient lifecycle from registration to discharge, enforcing strict financial controls ("Cash & Carry") while streamlining clinical workflows. The system is built on a modern tech stack (Electron, React, Supabase) to ensure performance, offline-first capabilities, and real-time collaboration.

---

## 2. System Architecture

### 2.1 High-Level Stack
- **Platform:** Electron (Cross-platform desktop application)
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **State Management:** React Query (Server state), React Context (Global UI state)
- **Backend:** Supabase (PostgreSQL Database, Auth, Realtime Subscriptions, Storage)
- **Routing:** React Router DOM

### 2.2 Folder Structure & Organization
The codebase follows a **Domain-Driven Design (DDD)** approach, grouping files by business function rather than technical type.

#### Root Directory
- `package.json`: Dependencies and build scripts.
- `tsconfig.json`: TypeScript configuration.
- `.erb/`: Electron React Boilerplate configuration (Webpack, build settings).
- `migrations/`: SQL scripts for database schema versioning.
- `assets/`: Static assets (icons, images).

#### Source Code (`src/`)

**`src/main/` (Electron Main Process)**
- `main.ts`: Application entry point. Handles window creation, auto-updates, and native OS integration.
- `preload.ts`: The bridge between the secure Main process and the UI (Renderer). Exposes safe APIs.
- `menu.ts`: Native application menu configuration.

**`src/renderer/` (React UI Application)**
- **`modules/`**: The core business logic. Each folder is a self-contained module:
  - `patient-registration/`: Registration forms, check-in logic.
  - `clinical-consultation/`: Doctor's interface, SOAP notes, diagnosis.
  - `nursing/`: Vitals triage, nursing care plans.
  - `billing/`: Invoicing, payments, receipts.
  - `pharmacy/`: Drug dispensing, inventory management.
  - `lab/` & `radiology/`: Diagnostic request processing and result uploads.
  - `queue/`: Global queue management dashboard.
  - `analytics/`: Reporting and dashboards.
  
- **`lib/workflow/`**: **The "Brain" of the App.**
  - `api.ts`: Centralized logic for fetching encounters and moving patients.
  - `index.ts`: Workflow state machine definitions.
  - `payment-gating.ts`: Logic that enforces "Pay before Service".
  
- **`components/`**: Shared UI components.
  - `ui/`: Atomic components (Buttons, Inputs, Modals, Cards).
  - `auth/`: Protected routes and role-based access control (RBAC) gates.
  
- **`api/`**: Base Supabase client configuration (`supabaseClient.ts`).
- **`contexts/`**: Global providers (AuthContext).

---

## 3. Functional Requirements (Modules)

### 3.1 Patient Registration & Access
- **Registration:** Capture demographics, next of kin, and payer details (Private/NHIS/HMO).
- **Check-In:** Create a "Visit" (Encounter).
- **Priority Triage:** Flag patients as Emergency, Urgent, or Normal.
- **Payment Category:** Auto-assign workflow based on payer (e.g., Cash patients sent to Billing first).

### 3.2 Queue Management
- **Real-time Dashboard:** Live view of who is waiting where.
- **Auto-Routing:** System automatically moves patient to the next stage (e.g., Doctor -> Pharmacy) based on actions.
- **Wait Time Tracking:** Monitor how long patients wait at each station.

### 3.3 Billing & Finance
- **Invoicing:** Auto-generate invoices from orders (Labs, Drugs, Consultations).
- **Payment Processing:** Accept Cash, POS, Transfer.
- **Insurance Logic:** Handle co-pays and capitation for NHIS/HMO.
- **Cashier Reconciliation:** End-of-day balancing and shift closure.

### 3.4 Clinical Care (Doctors & Nurses)
- **Nursing Station:** Capture Vitals (BP, Pulse, Temp, SpO2).
- **Consultation:** 
  - **SOAP Notes:** Structured clinical documentation.
  - **CPOE:** Order Labs, Radiology, and Prescriptions directly.
  - **History:** View past visits and trends.

### 3.5 Diagnostics & Pharmacy
- **Laboratory:** Receive requests, input results, print reports.
- **Radiology:** Schedule imaging, upload DICOM/Images, write reports.
- **Pharmacy:** View prescriptions, deduct stock, dispense medication.
- **Inventory:** Track stock levels, batches, and expiry dates.

---

## 4. Database Schema (Supabase/PostgreSQL)

The database is normalized and uses **Row Level Security (RLS)** for data protection.

### Key Tables
- `patients`: Core demographics.
- `visits`: The central record linking a patient to a specific day's encounter.
- `queue`: Tracks current location and status of active visits.
- `staff`: User accounts and role definitions.
- `billing` & `invoices`: Financial records.
- `consultations`: Clinical notes.
- `prescriptions`, `lab_requests`, `radiology_requests`: Clinical orders.

### Security Model
- **Authentication:** Supabase Auth (Email/Password).
- **Authorization:** RLS policies ensure:
  - Doctors can see clinical data.
  - Cashiers can only see billing data.
  - Admins can see everything.

---

## 5. Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- NPM or Yarn
- A Supabase Project

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd emr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Database Migration:**
   Run the SQL scripts in `migrations/` folder in your Supabase SQL Editor in order (001 -> 010).

5. **Run Development Server:**
   ```bash
   npm start
   ```

---

## 6. Workflow Logic (The "Secret Sauce")

The system uses a state machine approach to manage the patient journey:

1. **Start:** Patient Checks In.
2. **Decision Gate:** Is Payment Category = Cash?
   - **Yes:** Move to `Billing Queue`.
   - **No (Insurance):** Move to `Nursing Queue`.
3. **Nursing:** Vitals taken -> Move to `Doctor Queue`.
4. **Doctor:** 
   - Orders Tests -> Move to `Lab/Rad Queue`.
   - Prescribes Drugs -> Move to `Pharmacy Queue`.
   - Discharges -> Move to `Billing (Final)` or `Home`.
5. **End:** Visit marked as Completed.

---

## 7. Future Roadmap
- **Inpatient Management:** Ward management and admission logic.
- **Telemedicine:** Integrated video calls.
- **SMS/Email Notifications:** Patient reminders.
- **Offline Sync:** Enhanced local database for internet outages.
