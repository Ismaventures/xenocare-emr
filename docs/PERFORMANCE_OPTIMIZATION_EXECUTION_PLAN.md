# NDC EMR - Performance Optimization Execution Plan

> **Date**: January 14, 2026  
> **Status**: 🔴 SLOW → 🟢 OPTIMIZED (Target)  
> **Estimated Time**: 3-5 days

---

## Overview

This document outlines the step-by-step execution plan to address all performance bottlenecks identified in the performance engineering audit. Implementing these fixes will:

- **Reduce startup time by ~60%** (from ~6-8s to ~2-3s)
- **Reduce bundle size by ~70%** (from 21 MB to ~6 MB)
- **Reduce API requests by ~80%** (from 3000+/hr to ~500/hr)

---

## Current Performance Baseline

| Metric | Current Value | Target |
|--------|---------------|--------|
| Initial Bundle (renderer.js) | 4.76 MB | ~1.5 MB |
| Source Maps (renderer.js.map) | 14.50 MB | 0 MB |
| Total Renderer Folder | 21.08 MB | ~5 MB |
| Startup Time | ~6-8s | ~2-3s |
| API Requests/Hour | 3000+ | ~500 |
| Code Splitting | None | Per-route |

---

## Phase 1: Quick Wins (Day 1) ⚡

### 1.1 Disable Source Maps in Production Build

**Risk Level**: 🟢 LOW  
**Estimated Time**: 5 minutes  
**Impact**: -14.5 MB bundle size

#### Problem
Production webpack config generates source maps that ship with the app, adding 14.5 MB to the bundle.

#### Solution
Change `devtool: 'source-map'` to `devtool: false` in production config.

#### File to Modify
- `.erb/configs/webpack.config.renderer.prod.ts` (Line 23)

#### Verification
```powershell
npm run build
Get-ChildItem -Path "release\app\dist\renderer" -Filter "*.map" | Measure-Object
# Should return 0 files
```

---

### 1.2 Fix Aggressive staleTime: 0 in React Query Hooks

**Risk Level**: 🟢 LOW  
**Estimated Time**: 30 minutes  
**Impact**: -70% unnecessary refetches

#### Problem
18 hooks have `staleTime: 0` which defeats React Query's caching, causing constant refetches.

#### Solution
Update staleTime to appropriate values based on data volatility:
- Queue data: 10 seconds
- Prescription data: 30 seconds
- Staff data: 5 minutes
- Static catalogs: 10 minutes

#### Files to Modify
| File | Current | New Value |
|------|---------|-----------|
| `src/renderer/modules/queue/hooks/useQueue.ts` | 0 | 10000 |
| `src/renderer/modules/pharmacy/hooks/usePharmacy.ts` | 0 | 30000 |
| `src/renderer/modules/radiology/hooks/useRadiology.ts` | 0 | 30000 |
| `src/renderer/modules/lab/hooks/useLab.ts` | 0 | 30000 |
| `src/renderer/modules/billing/hooks/useBillingOrders.ts` | 0 | 15000 |
| `src/renderer/modules/staff/hooks/useStaff.ts` | 0 | 300000 |
| `src/renderer/lib/workflow/hooks.ts` | 0 | 10000 |
| `src/renderer/modules/clinical-requests/hooks/useClinicalRequests.ts` | 0 | 30000 |

---

### 1.3 Reduce Aggressive Polling Intervals

**Risk Level**: 🟢 LOW  
**Estimated Time**: 30 minutes  
**Impact**: -60% API requests

#### Problem
Multiple hooks poll at 5-second intervals, generating 3000+ requests/hour per user.

#### Solution
Increase polling intervals and rely more on realtime subscriptions:
- Change 5s intervals to 30s minimum
- Change 3s intervals to 15s minimum

#### Files to Modify
| File | Current Interval | New Interval |
|------|------------------|--------------|
| `useQueue.ts` | 3000-5000ms | 15000-30000ms |
| `usePharmacy.ts` | 5000ms | 30000ms |
| `useRadiology.ts` | 5000ms | 30000ms |
| `useLab.ts` | 5000ms | 30000ms |

---

## Phase 2: Code Splitting (Day 1-2) 🔧

### 2.1 Implement React.lazy() for Route-Based Code Splitting

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 4 hours  
**Impact**: -60% initial bundle, faster startup

#### Problem
All 15+ modules are imported synchronously in App.tsx, loading 4.76 MB upfront even if user only needs login page.

#### Solution
Convert all module imports to lazy imports with Suspense boundaries.

#### File to Modify
- `src/renderer/App.tsx`

#### Before
```tsx
import PatientRegistration from './modules/patient-registration';
import ClinicalConsultation from './modules/clinical-consultation';
// ... 13 more synchronous imports
```

#### After
```tsx
import { lazy, Suspense } from 'react';

const PatientRegistration = lazy(() => import('./modules/patient-registration'));
const ClinicalConsultation = lazy(() => import('./modules/clinical-consultation'));
// ... 13 more lazy imports

// Wrap routes in Suspense
<Suspense fallback={<ModuleLoadingFallback />}>
  <Routes>...</Routes>
</Suspense>
```

---

### 2.2 Add Webpack SplitChunks Configuration

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 2 hours  
**Impact**: Better caching, smaller updates

#### Problem
All vendor code bundled into single renderer.js file.

#### Solution
Configure webpack to split vendors into separate chunks.

#### File to Modify
- `.erb/configs/webpack.config.renderer.prod.ts`

#### Configuration to Add
```typescript
optimization: {
  splitChunks: {
    chunks: 'all',
    maxInitialRequests: 10,
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
      recharts: {
        test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
        name: 'charts',
        chunks: 'all',
        priority: 20,
      },
      supabase: {
        test: /[\\/]node_modules[\\/]@supabase[\\/]/,
        name: 'supabase',
        chunks: 'all',
        priority: 20,
      },
    },
  },
},
```

---

## Phase 3: Data Layer Optimization (Day 2-3) 📊

### 3.1 Optimize SELECT * Queries

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 4-6 hours  
**Impact**: -40% payload size

#### Problem
50+ Supabase queries use `.select('*')`, fetching all columns even when only a few are needed.

#### Solution
Replace `.select('*')` with specific column selections.

#### Priority Files (Most Impactful)
1. `src/renderer/modules/billing/api/billing-order.api.ts` - 30+ queries
2. `src/renderer/modules/pharmacy/api/pharmacy.api.ts` - 25+ queries
3. `src/renderer/lib/workflow/api.ts` - 20+ queries

#### Example Transformation
```typescript
// Before
.from('billing_orders').select('*')

// After
.from('billing_orders').select('id, patient_id, status, total_amount, created_at')
```

---

### 3.2 Remove Redundant Polling Where Realtime Exists

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 3-4 hours  
**Impact**: -50% redundant requests

#### Problem
Modules use BOTH realtime subscriptions AND aggressive polling, causing double fetches.

#### Solution
Where realtime subscriptions exist, remove or greatly reduce polling intervals.

#### Files to Audit
- Check for `.subscribe()` calls alongside `refetchInterval`
- Keep only one update mechanism per data type

---

## Phase 4: UI Performance (Day 3-4) 🎨

### 4.1 Add List Virtualization

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 2 days  
**Impact**: -90% DOM nodes for large lists

#### Problem
Patient lists, queue displays, and billing items render full DOM regardless of visible items.

#### Solution
Install and implement `@tanstack/react-virtual` for lists with 100+ potential items.

#### Installation
```bash
npm install @tanstack/react-virtual
```

#### Priority Components
1. Patient list in patient-registration module
2. Queue display in queue module
3. Billing items list in billing module
4. Prescription list in pharmacy module

---

### 4.2 Lazy Load Heavy Libraries

**Risk Level**: 🟢 LOW  
**Estimated Time**: 4 hours  
**Impact**: -800KB initial bundle

#### Problem
PDF generation (jspdf) and charting (recharts) libraries load on startup even if not used.

#### Solution
Dynamic import when actually needed.

#### Files to Modify
- Receipt printing utilities - lazy load jspdf
- Analytics module - lazy load recharts

#### Example
```typescript
// Before
import jsPDF from 'jspdf';

// After
const generatePDF = async () => {
  const { default: jsPDF } = await import('jspdf');
  // ... use jsPDF
};
```

---

## Phase 5: Cleanup & Monitoring (Day 4-5) 🧹

### 5.1 Console.log Cleanup

**Risk Level**: 🟢 LOW  
**Estimated Time**: 2 hours  
**Impact**: Cleaner logs, slight memory improvement

#### Problem
100+ console.log/error/warn statements throughout codebase.

#### Solution
Use the logger utility created earlier for environment-aware logging.

#### Pattern
```typescript
// Before
console.log('[Pharmacy Stats]', { ... });

// After
import { logger } from '@/utils/logger';
logger.debug('[Pharmacy Stats]', { ... });
```

---

### 5.2 Add Performance Monitoring

**Risk Level**: 🟢 LOW  
**Estimated Time**: 4 hours  
**Impact**: Ongoing visibility into performance

#### Solution
Add web-vitals tracking to measure real user metrics.

#### Metrics to Track
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Bundle load times per chunk

---

## Execution Checklist

### Phase 1 - Quick Wins ⚡
- [ ] 1.1 Disable source maps in production
- [ ] 1.2 Update staleTime values in 8 hook files
- [ ] 1.3 Increase polling intervals in 4 hook files
- [ ] Verify build passes
- [ ] Verify bundle size reduced

### Phase 2 - Code Splitting 🔧
- [ ] 2.1.1 Add lazy imports to App.tsx
- [ ] 2.1.2 Add Suspense wrapper with fallback
- [ ] 2.1.3 Create ModuleLoadingFallback component
- [ ] 2.2 Add splitChunks to webpack config
- [ ] Verify chunks generated correctly

### Phase 3 - Data Layer 📊
- [ ] 3.1 Optimize billing queries
- [ ] 3.1 Optimize pharmacy queries
- [ ] 3.1 Optimize workflow queries
- [ ] 3.2 Audit realtime vs polling overlap
- [ ] 3.2 Remove redundant polling

### Phase 4 - UI Performance 🎨
- [ ] 4.1 Install @tanstack/react-virtual
- [ ] 4.1 Virtualize patient list
- [ ] 4.1 Virtualize queue display
- [ ] 4.2 Lazy load jspdf
- [ ] 4.2 Lazy load recharts

### Phase 5 - Cleanup 🧹
- [ ] 5.1 Replace console.log with logger
- [ ] 5.2 Add web-vitals tracking
- [ ] Final build verification
- [ ] Performance testing

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| renderer.js | 4.76 MB | ~1.5 MB | 68% smaller |
| Source maps shipped | 14.5 MB | 0 MB | 100% removed |
| Total bundle | 21.08 MB | ~5 MB | 76% smaller |
| Startup time | ~6-8s | ~2-3s | 60% faster |
| API requests/hour | 3000+ | ~500 | 83% reduction |
| Time to Interactive | ~8s | ~3s | 62% faster |

---

## Rollback Plan

If issues arise during implementation:

1. **Git Reset**: All changes tracked, can revert to pre-optimization commit
2. **Incremental Testing**: Each phase can be reverted independently
3. **Feature Flags**: Code splitting can be disabled via build config

---

## Verification Commands

```powershell
# Check bundle size
Get-ChildItem -Path "release\app\dist\renderer" -Recurse | 
  Measure-Object -Property Length -Sum | 
  ForEach-Object { "Total: {0:N2} MB" -f ($_.Sum / 1MB) }

# Check for source maps
Get-ChildItem -Path "release\app\dist\renderer" -Filter "*.map" | Measure-Object

# Run bundle analyzer
$env:ANALYZE="true"; npm run build:renderer
```

---

**Document Version**: 1.0  
**Last Updated**: January 14, 2026
