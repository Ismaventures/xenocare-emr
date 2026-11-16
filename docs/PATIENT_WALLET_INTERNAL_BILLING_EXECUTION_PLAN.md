# Patient Wallet + Internal Billing Execution Plan

## 1. Purpose

This document defines the recommended implementation plan for adding a patient wallet and internal hospital billing flow to the existing NDC EMR without breaking the current encounter workflow, central billing controls, or audit expectations.

The goal is not to build a second finance system beside the current one. The goal is to extend the existing billing engine so prepaid wallet balances can settle charges centrally while clinical departments continue to create service requests through the current EMR workflow.

## 2. Current Architecture Baseline

The wallet design must fit the architecture already in the repo:

- Application stack: Electron + React renderer + Supabase/PostgreSQL.
- Business modules live under `src/renderer/modules/*`.
- Workflow orchestration lives under `src/renderer/lib/workflow/*`.
- Billing already has a central queue, receipt generation, payment verification, and service-price management.
- Lab, radiology, and pharmacy already create billing orders through a shared helper instead of each module owning its own payment system.
- Existing offline storage already reserves a `billing_finance` store, but finance writes are still better treated as server-first because wallet deductions are concurrency-sensitive.

### Verified Existing Integration Surfaces

The plan is anchored to the live code paths below:

- Consultation billing creation: `src/renderer/lib/workflow/api.ts`
- Service payment gating: `src/renderer/lib/workflow/payment-gating.ts`
- Shared billing order creation and payment verification: `src/renderer/modules/billing/api/billing-order.api.ts`
- Billing UI entry point: `src/renderer/modules/billing/index.tsx`
- Service pricing and NHIS configuration: `src/renderer/modules/billing/hooks/useServicePricing.ts`
- Lab charge creation: `src/renderer/modules/lab/api/lab.api.ts`
- Radiology charge creation: `src/renderer/modules/radiology/api/radiology.api.ts`
- Pharmacy charge creation: `src/renderer/modules/pharmacy/api/pharmacy.api.ts`
- Receipt generation: `src/renderer/modules/billing/utils/receiptPrint.ts`
- Billing route/menu exposure: `src/renderer/App.tsx` and `src/renderer/config/menu.ts`

### Important Existing Design Constraints

The current finance model already encodes several decisions that the wallet should respect:

1. Clinical modules create charges, but billing is the central authority for settlement.
2. Payment gating for lab, radiology, and pharmacy relies on billing order state, not departmental payment state.
3. NHIS coverage is snapshot-based and audit-safe at billing time.
4. Receipts and reports already depend on the billing/payments/receipts model.
5. Encounter consolidation already groups multiple department items into a single encounter-level billing order when possible.

These constraints make a direct "department deducts balance itself" model a bad fit for this codebase. The safer design is centralized wallet settlement through the billing engine.

## 3. Recommended Product Decision

### MVP Recommendation

Start with a prepaid wallet only.

That means:

- Patients or cashiers fund the wallet in advance.
- Departments continue creating billing orders exactly as they do today.
- The billing engine auto-settles the patient-payable portion from wallet balance when allowed.
- Service gating continues to trust billing order status, so downstream modules do not need to invent a second payment check.

### Recommended Settlement Model for This EMR

Use a hybrid of the two options described during planning:

- Departments create pending charges through the current shared billing-order path.
- A centralized wallet settlement RPC applies the wallet immediately when the order is eligible.
- The billing order is then marked paid using the existing finance path, with `payment_method = 'Wallet'`.

This preserves the current separation between care delivery and finance control while still giving the user-facing experience of real-time departmental billing.

### Do Not Start With These in Phase 1

- Credit wallets with negative balances
- HMO balance wallets
- Family/shared wallets
- Offline wallet deductions
- Auto-recharge and gateway webhooks
- Department-owned direct balance mutations

Those are valid later phases, but they should not be part of the initial rollout because they expand financial risk, approvals, and reconciliation complexity.

## 4. Architecture Direction

### 4.1 Core Principle

Treat the wallet as a settlement layer under the existing billing engine, not as a replacement for `billing_orders`.

The source of truth for hospital charges should remain:

- `billing_orders`
- `billing_items`
- `payments`
- `receipts`

The source of truth for stored patient value should become:

- `patient_wallets`
- `wallet_ledger_entries`
- `wallet_settlements`

### 4.2 Recommended Flow

1. A department accepts or generates a billable service.
2. The existing shared `createBillingOrder()` path creates or appends to the encounter billing order.
3. A wallet settlement service checks:
   - wallet status
   - available balance
   - patient-payable amount
   - payment category exclusions
4. If funds are sufficient, the service writes immutable wallet ledger entries and marks the billing order paid through an atomic transaction.
5. Existing payment gating sees a paid billing order and allows service continuation.
6. Receipt generation continues through the current receipt flow, with wallet metadata added where needed.

### 4.3 Why This Fits Better Than Department-Side Deductions

If lab, radiology, and pharmacy each deduct balance independently:

- billing logic gets duplicated across multiple modules
- fraud controls become inconsistent
- race conditions become likely
- receipts and finance reports fragment
- payment gating becomes harder to reason about

The current codebase already solved those problems once with central billing. The wallet should plug into that layer instead of bypassing it.

## 5. Data Model Recommendation

### 5.1 New Tables

#### `patient_wallets`

One wallet row per patient for the MVP.

Suggested fields:

```sql
id uuid primary key
patient_id uuid not null references patients(id)
wallet_number varchar(50) unique not null
wallet_type varchar(30) not null default 'prepaid'
status varchar(30) not null default 'active'
currency_code varchar(10) not null default 'NGN'
available_balance numeric(12,2) not null default 0
held_balance numeric(12,2) not null default 0
credit_limit numeric(12,2) not null default 0
auto_apply_to_billing boolean not null default true
created_by uuid null references staff(id)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

- `available_balance` is a cached balance for fast reads.
- Ledger entries remain the audit source of truth.
- `credit_limit` stays `0` in MVP but allows future extension.

#### `wallet_ledger_entries`

Immutable financial history. Never edit balances directly without a matching ledger write.

Suggested fields:

```sql
id uuid primary key
wallet_id uuid not null references patient_wallets(id)
patient_id uuid not null references patients(id)
entry_type varchar(40) not null
direction varchar(10) not null
amount numeric(12,2) not null
balance_before numeric(12,2) not null
balance_after numeric(12,2) not null
reference_type varchar(40) not null
reference_id uuid null
billing_order_id uuid null references billing_orders(id)
encounter_id uuid null references visits(id)
department varchar(40) null
performed_by uuid null references staff(id)
approved_by uuid null references staff(id)
reversal_of_entry_id uuid null references wallet_ledger_entries(id)
notes text null
metadata jsonb null
created_at timestamptz not null default now()
```

Recommended `entry_type` values for MVP:

- `funding`
- `deduction`
- `refund`
- `reversal`
- `adjustment`
- `hold`
- `hold_release`

#### `wallet_settlements`

Explicit bridge table between the wallet ledger and billing orders.

Suggested fields:

```sql
id uuid primary key
wallet_id uuid not null references patient_wallets(id)
billing_order_id uuid not null references billing_orders(id)
encounter_id uuid null references visits(id)
amount_applied numeric(12,2) not null
status varchar(30) not null default 'applied'
ledger_entry_id uuid not null references wallet_ledger_entries(id)
receipt_id uuid null references receipts(receipt_id)
created_by uuid null references staff(id)
created_at timestamptz not null default now()
reversed_at timestamptz null
reversed_by uuid null references staff(id)
```

This table makes reporting and reversal workflows much simpler than trying to infer everything from raw ledger entries.

### 5.2 Existing Tables to Extend

#### `billing_orders`

Recommended additions:

- add `payment_method = 'Wallet'` to the payment method enum if it does not already exist
- optionally add `settled_via_wallet boolean default false`
- optionally add `wallet_settled_amount numeric(12,2) default 0`

Prefer a minimal extension here. Avoid pushing wallet history into the billing order row itself.

#### `payments`

Recommended approach:

- continue creating a `payments` record for wallet-settled charges so current reports remain usable
- set `payment_method = 'Wallet'`
- keep `billing_order_id` populated
- add a transaction reference that links to wallet settlement or funding reference

#### `receipts`

Recommended approach:

- keep using receipts for finalized patient-facing proof of payment
- include wallet funding receipts and wallet settlement receipts
- extend print templates to show wallet payment method and remaining balance when appropriate

### 5.3 Key Modeling Rule

Use `patients.id` UUID for all new wallet tables.

The current finance area uses mixed patient key shapes:

- `billing_orders.patient_id` uses UUID
- older `payments`, `receipts`, and `invoices` still use string patient identifiers in places

Do not repeat that inconsistency in the wallet tables. Bridge to display IDs only at reporting and receipt boundaries.

## 6. Service and RPC Design

### 6.1 Use Atomic Supabase RPCs for Wallet Writes

The existing billing module already tries to use an atomic verification RPC. The wallet should follow the same pattern.

Recommended RPCs:

1. `create_patient_wallet(p_patient_id, p_created_by)`
2. `fund_patient_wallet(p_wallet_id, p_amount, p_payment_method, p_reference, p_received_by)`
3. `settle_billing_order_with_wallet(p_billing_order_id, p_wallet_id, p_amount, p_verified_by, p_idempotency_key)`
4. `reverse_wallet_settlement(p_settlement_id, p_reason, p_reversed_by)`
5. `refund_wallet_balance(p_wallet_id, p_amount, p_reason, p_approved_by, p_processed_by)`
6. `get_patient_wallet_summary(p_patient_id)`

### 6.2 Why RPCs Are Required

Wallet settlement is a concurrency problem. The following must happen in one transaction:

- verify wallet status
- read current balance with lock
- prevent double-spend
- create ledger entry
- create settlement record
- update billing order paid state
- create payment record
- create receipt

Doing those steps in the renderer with separate Supabase calls will produce race conditions.

### 6.3 Reuse Existing Shared Finance Paths

The wallet rollout should integrate with these current abstractions instead of bypassing them:

- `createBillingOrder()` remains the charge creation seam
- `verifyPaymentAtomic()` pattern becomes the model for wallet settlement
- receipt generation remains centralized in billing utilities
- payment gating continues to read billing order status as the execution guard

## 7. UI and Workflow Changes

### 7.1 Billing Module

Primary wallet UI should live inside the existing billing module.

Recommended additions to `src/renderer/modules/billing/index.tsx` and related components:

- Wallet summary card for selected patient
- Wallet funding action
- Wallet ledger tab
- Wallet settlement history tab
- Wallet refund/reversal modal
- Wallet balance indicator in billing queue rows
- `Charge Wallet` action for eligible pending orders

### 7.2 Patient-Facing Surfaces Inside the EMR

Recommended patient context additions:

- wallet snapshot on patient profile or encounter-scoped patient panel
- recent funding and deductions
- low-balance warning badge

This should be read-only for most clinical roles.

### 7.3 Department Modules

Lab, radiology, pharmacy, and consultation modules should not receive wallet mutation forms in MVP.

They should only gain:

- clearer payment state labels such as `Wallet Cleared`
- optional wallet balance visibility if clinically useful
- no direct balance-editing controls

### 7.4 Payment Gating

`src/renderer/lib/workflow/payment-gating.ts` should continue to trust billing order state.

Recommended MVP behavior:

- billing order status remains `Paid` after wallet settlement
- `payment_method` becomes `Wallet`
- gating logic does not need a separate wallet branch if it already treats `Paid` as sufficient

This is smaller and safer than inventing a new workflow status everywhere.

## 8. Reporting and Receipt Strategy

### 8.1 Reporting Principle

Do not create wallet-only reports that ignore the existing finance reports.

Instead:

- extend current revenue and receipt reports to include `Wallet` payment method
- add wallet funding and wallet liability reports
- add wallet reconciliation report by cashier and date
- add patient wallet balance report
- add exception report for reversals, refunds, and manual adjustments

### 8.2 Receipt Types Needed

MVP should support:

1. Wallet funding receipt
2. Wallet charge settlement receipt
3. Refund receipt
4. Reversal/adjustment audit trail view

### 8.3 Mixed Tender Handling

Do not make split payments the first implementation target unless required immediately.

Recommended MVP rule:

- full wallet coverage settles automatically
- insufficient wallet balance leaves the order pending and prompts top-up or standard payment verification

Phase 2 can add mixed settlement:

- wallet first
- then POS/cash/transfer for remainder

## 9. Security, Controls, and Compliance

### 9.1 Role Model

Recommended wallet permissions layered on the existing billing/cashier roles:

- `cashier`: fund wallet, settle wallet order, issue wallet receipt
- `billing_clerk`: view wallet, settle eligible orders, view ledger
- `admin` or `super_admin`: approve reversals, large refunds, adjustments, credit limits
- clinical roles: read-only wallet visibility where needed

### 9.2 Pre-Execution Security Corrections

The current schema snapshot shows broad finance table access patterns and old `Allow all access` policies on some billing tables. The wallet rollout should not copy that model.

Before implementation completes:

- new wallet tables must not use blanket write-access policies
- wallet mutations should be RPC-driven and role-checked
- reversals and refunds must require stronger approval rules than funding

### 9.3 Audit Requirements

Every wallet-affecting action must capture:

- patient
- wallet
- encounter if applicable
- billing order if applicable
- amount
- before and after balance
- acting staff member
- approving staff member where required
- timestamp
- reason for refund, reversal, or adjustment

## 10. Pre-Execution Hardening Items

These items should be handled before or during the first wallet sprint because they affect correctness.

### 10.1 Schema and Type Drift Reconciliation

There is visible drift between code expectations and the current checked-in schema/types in the finance area, especially around billing-order fields and legacy finance tables.

Before wallet work lands:

- confirm the authoritative live schema for `billing_orders`
- reconcile `schema.sql`, migration history, and `src/renderer/types/database.types.ts`
- confirm which finance fields are live versus legacy

### 10.2 Patient Identifier Normalization

The finance layer mixes UUID patient references with display/string patient identifiers.

Before wallet rollout:

- standardize new work on UUID FKs
- add explicit mapper utilities for receipt/report display IDs
- avoid more cross-table ambiguity

### 10.3 Payment Method Enum Update

Confirm whether the current database enum can safely support `Wallet`.

If not, add it in a forward-only migration and update:

- DTOs
- filters
- reports
- receipt UI
- payment verification forms

### 10.4 Offline Policy

Do not allow offline wallet deductions in MVP.

Reason:

- offline double-spend risk is too high
- financial settlement must stay atomic
- local cache can support read-only wallet visibility, but not authoritative deductions

## 11. Phased Execution Plan

### Phase 0: Architecture Hardening

Deliverables:

- reconcile billing schema/type drift
- decide wallet payment method enum and status strategy
- define approval rules for funding, refund, reversal
- finalize patient identifier strategy

Exit criteria:

- authoritative finance schema agreed
- wallet tables and RPC contracts approved

### Phase 1: Wallet Core and Ledger

Deliverables:

- migrations for `patient_wallets`, `wallet_ledger_entries`, `wallet_settlements`
- atomic funding RPC
- wallet summary query API
- initial wallet creation flow for patients

Files likely touched:

- `migrations/*`
- `schema.sql` or generated schema output
- billing API layer
- wallet DTO/hooks added under billing module or a dedicated finance submodule

Exit criteria:

- a patient can have a wallet created and funded
- ledger entries are immutable and balance calculations are correct

### Phase 2: Billing Settlement Integration

Deliverables:

- `settle_billing_order_with_wallet` RPC
- billing queue wallet action
- automatic receipt creation for wallet settlements
- `payment_method = 'Wallet'` reporting compatibility

Files likely touched:

- `src/renderer/modules/billing/api/billing-order.api.ts`
- `src/renderer/modules/billing/hooks/useBillingOrders.ts`
- `src/renderer/modules/billing/index.tsx`
- `src/renderer/modules/billing/utils/receiptPrint.ts`

Exit criteria:

- a pending billing order can be settled from wallet atomically
- existing receipts and billing reports still work

### Phase 3: Workflow and Department Integration

Deliverables:

- wallet-cleared visibility in queue and patient views
- payment-gating compatibility for wallet-paid orders
- optional automatic wallet settlement trigger for eligible prepaid patients after order creation

Files likely touched:

- `src/renderer/lib/workflow/payment-gating.ts`
- `src/renderer/lib/workflow/api.ts`
- `src/renderer/modules/lab/api/lab.api.ts`
- `src/renderer/modules/radiology/api/radiology.api.ts`
- `src/renderer/modules/pharmacy/api/pharmacy.api.ts`

Exit criteria:

- departments continue using the same workflow and automatically respect wallet settlements

### Phase 4: Reconciliation, Refunds, and Controls

Deliverables:

- refund and reversal flows
- cashier reconciliation extensions
- wallet ledger reporting
- approval workflow for exceptions

Exit criteria:

- finance team can reconcile wallet movement end to end

### Phase 5: Advanced Wallet Modes

Only after MVP proves stable:

- partial wallet plus POS/cash split payments
- credit wallets with approval limits
- HMO wallet logic
- family/shared wallets
- gateway integrations and auto-top-up

## 12. Verification Plan

Each phase should be proven with targeted checks, not assumption.

### Required Verification Areas

1. Atomicity
   - concurrent settlement attempts cannot double-spend the same wallet

2. Ledger correctness
   - balance before/after values are correct for funding, deduction, refund, reversal

3. Billing compatibility
   - wallet settlement updates billing orders, payments, and receipts consistently

4. Workflow compatibility
   - lab, radiology, and pharmacy can proceed when wallet settlement marks the billing order paid

5. Reporting compatibility
   - existing finance dashboards and exports include wallet transactions cleanly

6. Permission safety
   - only authorized users can fund, refund, reverse, or settle wallet transactions

### Suggested Test Coverage

- RPC-level integration tests for funding, settlement, refund, and reversal
- renderer tests for billing queue wallet actions
- targeted regression checks for receipt print data
- manual smoke test covering registration -> consultation -> lab -> pharmacy with one funded wallet

## 13. Open Decisions for Stakeholder Sign-Off

These questions should be answered before coding starts in earnest:

1. Should MVP be prepaid wallet only, or must split tender be included immediately?
2. Should wallet auto-apply to every eligible billing order by default, or only when a cashier triggers it?
3. Should consultation charges auto-settle from wallet the moment they are created, or remain visible in billing queue first?
4. Will wallet funding be limited to staff-entered cash/POS/transfer first, or must online gateway funding ship in MVP?
5. What approval threshold should trigger supervisor review for refunds and reversals?

## 14. Final Recommendation

For this EMR, the cleanest implementation path is:

- keep the current central billing model
- add prepaid patient wallets as a finance settlement layer
- settle through atomic Supabase RPCs
- record every movement in an immutable ledger
- reuse billing orders, payments, receipts, and payment gating as much as possible
- delay credit/HMO/shared-wallet complexity until the prepaid flow is stable

This gives you the operational benefit you want, patients no longer moving around the hospital to pay repeatedly, while staying aligned with the current architecture instead of fighting it.