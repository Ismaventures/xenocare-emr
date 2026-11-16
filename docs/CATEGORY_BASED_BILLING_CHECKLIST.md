# Category-Based Billing Implementation Checklist

> **Objective:** Generate one invoice and one receipt per service category, even when multiple individual items exist under that category.

## Overview

| Category       | Example Items                                    |
| -------------- | ------------------------------------------------ |
| **Pharmacy**   | Multiple drugs → one Pharmacy invoice            |
| **Laboratory** | Multiple lab tests → one Laboratory invoice      |
| **Radiology**  | Multiple imaging studies → one Radiology invoice |
| **Procedures** | Multiple procedures → one Procedures invoice     |

Each invoice must show:

- The service category
- All individual items listed under it
- A single total amount for that category

---

## Implementation Phases

### Phase 1: Foundation ✅

- [x] **1. Analyze Current Billing System**
  - **Status:** COMPLETED
  - Reviewed: `billing_orders`, `billing_items`, `invoices`, `receipts` tables
  - Reviewed: `billing-order.api.ts`, `billing.api.ts`, `VerifyPaymentModal.tsx`
  - Current state: System creates individual billing orders per service with items
  - **Gaps identified:**
    - No category-based invoice grouping
    - No item-level verification (verify/adjust/reject individual items)
    - No inventory validation at billing stage
    - Receipts don't mirror invoices by category

---

### Phase 2: Database & Schema ✅

- [x] **2. Database Schema Updates**
  - **File:** `migrations/064_category_based_invoicing.sql`
  - **Status:** COMPLETED
  - **Changes:**
    - Added `invoice_category` enum (Pharmacy, Laboratory, Radiology, Procedures, Consultation, Nursing, Admission, Supplies, Other)
    - Added `item_verification_status` enum (pending, verified, adjusted, rejected)
    - Added `billing_audit_event` enum
    - Created `category_invoices` table (one invoice per category per encounter with UNIQUE constraint)
    - Created `category_invoice_items` junction table with snapshots
    - Created `category_receipts` table
    - Created `category_receipt_items` table
    - Created `billing_audit_log` table
    - Added verification fields to `billing_items`:
      - `verification_status`, `verified_by`, `verified_at`
      - `rejection_reason`, `adjusted_price`, `adjusted_by`
      - `original_price`, `stock_validated`
    - Added helper functions: `generate_category_invoice_number()`, `generate_category_receipt_number()`
    - Added trigger: `update_category_invoice_totals()`
    - Added views: `category_invoice_summary`, `billing_audit_trail`
    - Added RLS policies and grants

---

### Phase 3: Inventory & Validation ✅

- [x] **3. Inventory Validation Layer**
  - **File:** `src/renderer/modules/billing/utils/inventory-validation.ts`
  - **Status:** COMPLETED
  - **Functions:**
    - `checkDrugAvailability(drugId, requestedQuantity)` - Check single drug stock with batch-level validation
    - `filterAvailableDrugs(drugIds[])` - Filter out unavailable drugs
    - `validateStockBeforeBilling(items[])` - Pre-billing bulk validation
    - `getAvailableDrugsForBilling(options)` - Get all available drugs for display
    - `validateBillingItemStock(drugId, quantity)` - Single item validation
    - `markBillingItemStockValidated(billingItemId)` - Update stock_validated flag
  - **Rules Implemented:**
    - Blocks drugs with `quantity_in_stock <= 0`
    - Blocks drugs marked as `is_active = false`
    - Blocks expired drugs (expiry < 30 days)
    - Blocks discontinued or quarantined drugs
    - Inventory check precedes billing - **no override allowed**

- [x] **4. Price Resolution Validation**
  - **File:** `src/renderer/modules/billing/utils/price-validation.ts`
  - **Status:** COMPLETED
  - **Functions:**
    - `getPriceFromCatalogue(category, serviceId, isNhisPatient)` - Get price from respective catalogue
    - `validatePriceForService(category, serviceId)` - Validate single service price
    - `validateAllItemPrices(items[])` - Bulk price validation
    - `getServicePriceInfo(category, serviceId)` - Comprehensive price info
    - `calculateNhisSplit(amount, isNhisCovered, nhisPercentage)` - Calculate NHIS/patient split
    - `mapItemTypeToCategory()`, `mapSourceModuleToCategory()` - Category mapping
  - **Catalogues Supported:**
    - `lab_test_catalogue` for Laboratory
    - `imaging_catalogue` for Radiology
    - `drug_catalogue` for Pharmacy
    - `procedure_catalogue` for Procedures
    - `nhis_procedures` for NHIS pricing
  - **Rules Implemented:**
    - Blocks if price is null, zero, or negative
    - Applies NHIS prices when applicable

---

### Phase 4: Item-Level Verification ✅

- [x] **5. Item-Level Verification UI**
  - **File:** `src/renderer/modules/billing/components/ItemLevelVerification.tsx`
  - **Status:** COMPLETED
  - **Features:**
    - Items grouped by category with expandable sections
    - Per-item actions: ✓ Verify | ✎ Adjust Price | ✗ Reject
    - Real-time running totals (only verified items count)
    - Stock validation integration for pharmacy items
    - NHIS coverage display with percentage breakdown
    - Progress bar showing verification completion
    - "Verify All" button per category for bulk verification
    - Rejection requires reason input
    - Price adjustment requires new price input
  - **Rules Implemented:**
    - Only verified items contribute to category total
    - Cannot proceed to invoice if any item is `pending`
    - Rejected items are excluded from invoice
    - Pharmacy items require stock validation

---

### Phase 5: Category Grouping & Invoicing ✅

- [x] **6. Category Grouping Logic**
  - **File:** `src/renderer/modules/billing/utils/category-grouping.ts`
  - **Status:** COMPLETED
  - **Functions:**
    - `groupBillingOrdersByCategory(orders[], options)` - Main grouping function with options
    - `groupBillingItemsByCategory(items[])` - Simple grouping returning Map
    - `getCategoryTotals(category, items[])` - Calculate totals for category
    - `validateCategoryGrouping(grouping)` - Validate before invoice generation
    - `getCategoriesForEncounter(orders[])` - Get unique categories in preferred order
    - `getItemsForCategory(orders[], category)` - Get items for specific category
    - `getCategoryColor(category)` - Get color scheme for category display
  - **Categories:**
    - `Pharmacy`, `Laboratory`, `Radiology`, `Procedures`
    - `Consultation`, `Nursing`, `Admission`, `Supplies`, `Other`
  - **Critical Rules Implemented:**
    - Category grouping is **READ-ONLY**
    - Never modifies `billing_items` during grouping
    - Groups for display and invoice generation only

- [x] **7. Category Invoice Generation**
  - **File:** `src/renderer/modules/billing/api/category-invoice.api.ts`
  - **Status:** COMPLETED
  - **Functions:**
    - `generateCategoryInvoice(params)` - Create single category invoice
    - `generateAllCategoryInvoices(params)` - Create all category invoices for encounter
    - `getCategoryInvoice(invoiceId)` - Retrieve invoice with items
    - `getCategoryInvoicesForEncounter(encounterId)` - Get all invoices for encounter
    - `getCategoryInvoiceByCategory(encounterId, category)` - Get specific category invoice
    - `updateInvoicePayment(invoiceId, amount, method, userId)` - Update payment
    - `voidCategoryInvoice(invoiceId, reason, userId)` - Void invoice
    - `getInvoiceSummaryForEncounter(encounterId)` - Get summary with totals
  - **Blocking Rules Implemented:**
    - Blocks if any item has invalid price
    - Blocks if any drug is out of stock
    - Blocks if category total ≠ sum of items
    - Blocks if any item verification is `pending`
    - Prevents duplicate invoices per category per encounter

---

### Phase 6: Receipt Generation ✅

- [x] **8. Receipt Generation (Mirror Invoices)**
  - **File:** `src/renderer/modules/billing/api/category-receipt.api.ts`
  - **Status:** COMPLETED
  - **Functions:**
    - `generateCategoryReceipt(params)` - Create receipt for category invoice
    - `generateReceiptsForPaidInvoices(encounterId, paymentMethod, userId)` - Batch receipt generation
    - `getCategoryReceipt(receiptId)` - Get receipt by ID
    - `getCategoryReceiptsForEncounter(encounterId)` - Get all receipts for encounter
    - `getReceiptsForInvoice(invoiceId)` - Get all receipts for specific invoice
    - `voidCategoryReceipt(receiptId, reason, userId)` - Void receipt
    - `refundCategoryReceipt(receiptId, refundAmount, reason, userId)` - Process refund
    - `getReceiptSummaryForEncounter(encounterId)` - Get summary with totals
    - `getReceiptForPrinting(receiptId)` - Get formatted receipt data for printing
  - **Rules Implemented:**
    - Receipts mirror invoices exactly (same categories, items, totals)
    - One receipt per payment on category invoice
    - Supports multiple payment methods (Cash, Card, Bank Transfer, Mobile Money, NHIS, Mixed)
    - Payment breakdown for mixed payments
    - NHIS payment tracking with separate amounts

---

### Phase 7: Error Prevention & Validation ✅

- [x] **9. Validation & Error Prevention**
  - **File:** `src/renderer/modules/billing/utils/billing-validation.ts`
  - **Status:** COMPLETED
  - **Pre-Invoice Validation Checks:**
    - [x] All items have valid prices
    - [x] All drugs are in stock (quantity > 0)
    - [x] Category total = sum of verified items
    - [x] No pending verifications
    - [x] No price mismatches
  - **Functions:**
    - `validateBeforeInvoiceGeneration(params)` - Comprehensive pre-invoice validation
    - `validateBillingItem(params)` - Single item validation
    - `validatePharmacyStock(billingItems[])` - Pharmacy stock validation
    - `validateNhisRequirements(encounterId, patientId)` - NHIS-specific validation
    - `validatePayment(invoiceId, amount, method)` - Payment validation
    - `formatValidationResult(result)` - Format for UI display
  - **Error Codes:** 30+ specific error codes for different validation failures
  - **Features:**
    - Clear validation error messages with codes
    - Severity levels: error, warning, info
    - Suggestions for corrective actions
    - Summary with item counts and totals
  - **Rules Implemented:**
    - No silent failures
    - All errors must be resolved before invoice generation
    - Strict mode option treats warnings as errors

---

### Phase 8: Audit & Compliance ✅

- [x] **10. Audit Logging Implementation**
  - **File:** `src/renderer/modules/billing/utils/billing-audit.ts`
  - **Status:** COMPLETED
  - **Table:** `billing_audit_log`
  - **Logged Events (30+ event types):**
    - Item lifecycle: ITEM_CREATED, ITEM_UPDATED, ITEM_DELETED, ITEM_VERIFIED, ITEM_ADJUSTED, ITEM_REJECTED, ITEM_REINSTATED
    - Invoice events: INVOICE_GENERATED, INVOICE_UPDATED, INVOICE_VOIDED, INVOICE_CANCELLED, INVOICE_PAID, INVOICE_PARTIALLY_PAID
    - Receipt events: RECEIPT_GENERATED, RECEIPT_VOIDED, RECEIPT_REFUNDED
    - Stock events: STOCK_VALIDATED, STOCK_VALIDATION_FAILED, STOCK_RESERVED, STOCK_RELEASED, STOCK_DEDUCTED
    - Price events: PRICE_OVERRIDE, DISCOUNT_APPLIED, NHIS_SPLIT_CALCULATED
    - System events: VALIDATION_PASSED, VALIDATION_FAILED, PAYMENT_RECEIVED, PAYMENT_REVERSED
  - **Specialized Logging Functions:**
    - `logBillingAudit(entry)` - Core logging function
    - `logItemVerification(params)` - Item verification actions
    - `logInvoiceGeneration(params)` - Invoice creation
    - `logInvoicePayment(params)` - Payment recording
    - `logReceiptGeneration(params)` - Receipt creation
    - `logStockValidation(params)` - Stock validation
    - `logPriceOverride(params)` - Price adjustments
    - `logDiscountApplied(params)` - Discount application
    - `logVoidAction(params)` - Void operations
  - **Query Functions:**
    - `queryAuditLogs(query)` - Query with filters
    - `getEntityAuditTrail(entityType, entityId)` - Entity history
    - `getEncounterAuditTrail(encounterId)` - Encounter history
    - `getUserRecentActivity(userId)` - User activity
  - **Reporting:**
    - `generateAuditSummary(startDate, endDate)` - Summary report
    - `getBillingTransactionsReport(params)` - Transaction report
    - `exportAuditLogsToCSV(logs)` - CSV export
  - **Audit Entry Structure:**
    ```typescript
    {
      id: UUID,
      event_type: 'ITEM_VERIFIED' | 'PRICE_ADJUSTED' | 'ITEM_REJECTED' | 'INVOICE_GENERATED' | 'RECEIPT_GENERATED',
      entity_type: 'billing_item' | 'category_invoice' | 'receipt',
      entity_id: UUID,
      old_value: JSONB,
      new_value: JSONB,
      performed_by: UUID,
      performed_at: timestamp,
      ip_address: string,
      notes: string
    }
    ```

---

### Phase 9: Testing ✅

- [x] **11. Integration Testing**
  - **File:** `src/renderer/modules/billing/__tests__/category-billing.integration.test.ts`
  - **Status:** COMPLETED
  - **Test Suites (10 suites, 50+ tests):**
    1. Category Grouping - grouping, totals, validation
    2. Inventory Validation - availability, stock, filtering
    3. Price Validation - catalogue lookup, NHIS pricing
    4. Billing Validation - pre-invoice, item, payment validation
    5. Invoice Generation - single, bulk, NHIS, discounts
    6. Receipt Generation - single, partial, mixed payment, NHIS
    7. Audit Logging - events, verification, trail queries
    8. End-to-End Flow - complete billing workflow
    9. Edge Cases - special characters, concurrent requests
    10. Performance - large datasets, multiple categories
  - **E2E Tests by Category:**
    - [x] Pharmacy: Multiple drugs → one invoice
    - [x] Laboratory: Multiple tests → one invoice
    - [x] Radiology: Multiple scans → one invoice
    - [x] Procedures: Multiple procedures → one invoice
  - **Edge Cases Covered:**
    - [x] Mixed NHIS and cash patients
    - [x] Partial verification (some rejected)
    - [x] Price adjustments during verification
    - [x] Empty encounters and orders
    - [x] Very large amounts
    - [x] Decimal quantities
    - [x] Concurrent invoice generation

---

## 📋 Quick Reference

### Processing Order (Safe Order)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Item Validation        → Validate service exists         │
│ 2. Inventory Check        → Drugs: stock > 0, not expired   │
│ 3. Price Resolution       → Get price from catalogue        │
│ 4. Insurance/NHIS Rules   → Apply coverage percentages      │
│ 5. Item-Level Verify      → Officer verifies each item      │
│ 6. Category Grouping      → Group by Pharmacy/Lab/Rad/Proc  │
│ 7. Invoice Generation     → One invoice per category        │
│ 8. Receipt Generation     → One receipt per category invoice│
└─────────────────────────────────────────────────────────────┘
```

### Invoice & Receipt Rules

| Rule                     | Description                           |
| ------------------------ | ------------------------------------- |
| Group by category        | Not by individual item                |
| Same category items      | Appear on same invoice                |
| Invoice total            | Sum of all verified items             |
| Receipts mirror invoices | Same categories, items, totals        |
| Separate per category    | Drugs ≠ Labs ≠ Radiology ≠ Procedures |
| No cross-category        | Items stay in their category          |

### Billing Verification Rules

| Rule               | Description                        |
| ------------------ | ---------------------------------- |
| See all items      | Under each category                |
| Individual actions | Verify, adjust, or reject per item |
| Real-time totals   | Update as items are verified       |
| Category total     | Only verified + approved prices    |
| Inventory check    | Available stock only (for drugs)   |

### Inventory & Drug Visibility

| Condition                | Visibility          |
| ------------------------ | ------------------- |
| `quantity_in_stock <= 0` | ❌ Hidden           |
| `is_available = false`   | ❌ Hidden           |
| `expiry_date < today`    | ❌ Hidden           |
| `is_discontinued = true` | ❌ Hidden           |
| Stock validation         | Before billing list |
| Override stock status    | ❌ Not allowed      |

### Error Prevention

| Condition            | Action           |
| -------------------- | ---------------- |
| Invalid price        | ❌ Block invoice |
| Out of stock drug    | ❌ Block invoice |
| Total mismatch       | ❌ Block invoice |
| Pending verification | ❌ Block invoice |

---

## Files Created

### Database Migration

- ✅ `migrations/064_category_based_invoicing.sql`

### Utility Files

- ✅ `src/renderer/modules/billing/utils/inventory-validation.ts`
- ✅ `src/renderer/modules/billing/utils/price-validation.ts`
- ✅ `src/renderer/modules/billing/utils/category-grouping.ts`
- ✅ `src/renderer/modules/billing/utils/billing-validation.ts`
- ✅ `src/renderer/modules/billing/utils/billing-audit.ts`

### API Files

- ✅ `src/renderer/modules/billing/api/category-invoice.api.ts`
- ✅ `src/renderer/modules/billing/api/category-receipt.api.ts`

### Component Files

- ✅ `src/renderer/modules/billing/components/ItemLevelVerification.tsx`

### Test Files

- ✅ `src/renderer/modules/billing/__tests__/category-billing.integration.test.ts`

### Modified Files

- `src/renderer/modules/billing/api/billing-order.api.ts`
- `src/renderer/modules/billing/components/VerifyPaymentModal.tsx`
- `src/renderer/modules/billing/utils/receiptPrint.ts`
- `src/renderer/modules/billing/dtos/billing-order.dto.ts`

---

## Progress Tracker

| Phase | Task                       | Status  | Notes                     |
| ----- | -------------------------- | ------- | ------------------------- |
| 1     | Analyze Current System     | ✅ Done | Gaps identified           |
| 2     | Database Schema            | ✅ Done | migration 064             |
| 3     | Inventory Validation       | ✅ Done | inventory-validation.ts   |
| 3     | Price Validation           | ✅ Done | price-validation.ts       |
| 4     | Item-Level Verification UI | ✅ Done | ItemLevelVerification.tsx |
| 5     | Category Grouping          | ✅ Done | category-grouping.ts      |
| 5     | Invoice Generation         | ✅ Done | category-invoice.api.ts   |
| 6     | Receipt Generation         | ✅ Done | category-receipt.api.ts   |
| 7     | Error Prevention           | ✅ Done | billing-validation.ts     |
| 8     | Audit Logging              | ✅ Done | billing-audit.ts          |
| 9     | Integration Testing        | ✅ Done | 50+ tests                 |

---

## 🎉 Implementation Complete!

All 11 tasks have been implemented. The category-based billing system now supports:

1. **One invoice per category per encounter** - enforced by database UNIQUE constraint
2. **Item-level verification** - verify, adjust, or reject individual items
3. **Strict inventory validation** - pharmacy items checked against stock
4. **Price validation from catalogues** - lab, imaging, drug, procedure catalogues
5. **NHIS support** - pricing, splits, and authorization tracking
6. **Receipts mirror invoices** - same categories, items, and totals
7. **Comprehensive audit logging** - all billing events tracked
8. **Validation & error prevention** - pre-invoice checks with clear messages

### Next Steps

1. Run migration: `migrations/064_category_based_invoicing.sql`
2. Run tests: `npm test src/renderer/modules/billing/__tests__/`
3. Integrate `ItemLevelVerification.tsx` into billing workflow
4. Update existing billing UI to use new APIs

---

_Last Updated: January 6, 2026_
_Implementation Completed: January 6, 2026_
