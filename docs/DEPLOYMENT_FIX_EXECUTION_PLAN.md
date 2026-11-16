# NDC EMR - Deployment Fix Execution Plan

> **Date**: January 14, 2026  
> **Status**: 🔴 NO-GO → 🟢 GO (Target)  
> **Estimated Time**: 2-3 days

---

## Overview

This document outlines the step-by-step execution plan to address all critical blockers identified in the deployment readiness audit. Each fix is sequenced to minimize dependencies and allow incremental testing.

---

## Phase 1: Critical Security Fixes (Day 1)

### 1.1 Remove Service Role Key from Client Bundle

**Risk Level**: 🔴 CRITICAL  
**Estimated Time**: 2-4 hours

#### Problem
The `SUPABASE_SERVICE_ROLE_KEY` is imported in the client-side code (`supabaseClient.ts`), which means it gets bundled into the Electron app. Anyone can extract this key and bypass all RLS policies.

#### Solution
1. Remove `supabaseAdmin` export from client code
2. Move admin operations to Supabase Edge Functions OR
3. Use Electron's main process (secure) to handle privileged operations via IPC

#### Files to Modify
- `src/renderer/api/supabaseClient.ts` - Remove service role key usage
- `src/renderer/modules/staff/api/staff.api.ts` - Refactor admin operations
- `src/main/main.ts` - Add secure admin client in main process
- `src/main/preload.ts` - Add IPC handlers for admin operations

#### Verification
```bash
# After build, search for service role key in bundle
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" release/app/dist/
# Should return NO results
```

---

### 1.2 Remove Demo Mode from Production

**Risk Level**: 🔴 CRITICAL  
**Estimated Time**: 1 hour

#### Problem
- Demo accounts displayed on login page with password "Demo@123"
- Auto-fill functionality exposes credentials
- Demo users seeded in production database

#### Solution
1. Add `VITE_SHOW_DEMO_MODE` environment variable
2. Conditionally render demo section based on environment
3. Create separate seeding script (not in migrations)

#### Files to Modify
- `src/renderer/pages/LoginPage.tsx` - Add environment check
- `.env.development` - Add VITE_SHOW_DEMO_MODE=true
- `.env.production` - Add VITE_SHOW_DEMO_MODE=false (or omit)

#### Verification
```bash
# Build production and verify no demo password in output
npm run build
grep -r "Demo@123" release/app/dist/
# Should return NO results
```

---

### 1.3 Environment Separation

**Risk Level**: 🔴 CRITICAL  
**Estimated Time**: 2-3 hours

#### Problem
Single `.env` file used for all environments with hardcoded production credentials.

#### Solution
1. Create `.env.example` with placeholder values
2. Create `.env.development` for local development
3. Create `.env.production` for production builds
4. Update webpack config to load correct env file
5. **Rotate all exposed credentials** (Supabase, ICD API)

#### Files to Create/Modify
- `.env.example` - Template with placeholder values
- `.env.development` - Development credentials
- `.env.production` - Production credentials (gitignored)
- `.erb/configs/webpack.config.renderer.prod.ts` - Load production env
- `.gitignore` - Ensure all .env files except .env.example are ignored

#### Credential Rotation Required
| Service | Action |
|---------|--------|
| Supabase | Generate new anon key in dashboard |
| Supabase | Generate new service role key |
| ICD API | Regenerate client credentials |

---

## Phase 2: Code Quality Fixes (Day 1-2)

### 2.1 Fix Test Suite

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 4-8 hours

#### Problem
- TypeScript TextEncoder compatibility issue
- Only 1 test file exists
- Zero test coverage for critical paths

#### Solution
1. Fix TextEncoder polyfill in test setup
2. Add critical path tests:
   - Authentication flow
   - Patient registration
   - Billing operations
   - Encounter management

#### Files to Modify
- `.erb/scripts/check-build-exists.ts` - Fix TextEncoder typing
- `jest.config.js` or `package.json` jest section - Update config
- `src/__tests__/` - Add new test files

#### New Test Files to Create
```
src/__tests__/
├── auth/
│   └── login.test.tsx
├── billing/
│   └── billing-order.test.ts
├── patient/
│   └── registration.test.ts
└── encounter/
    └── encounter-flow.test.ts
```

---

### 2.2 Fix Linting Configuration

**Risk Level**: 🟡 LOW  
**Estimated Time**: 30 minutes

#### Problem
Missing TypeScript declaration for `dotenv-webpack` module.

#### Solution
1. Install `@types/dotenv-webpack` OR
2. Add custom declaration file

#### Commands
```bash
npm install --save-dev @types/dotenv-webpack
# OR create declaration file
```

---

## Phase 3: Observability & Hardening (Day 2-3)

### 3.1 Add Error Tracking

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 2-3 hours

#### Solution
1. Install Sentry SDK for Electron
2. Configure in main and renderer processes
3. Add error boundary components

#### Files to Create/Modify
- `src/main/sentry.ts` - Main process Sentry init
- `src/renderer/sentry.ts` - Renderer process Sentry init
- `src/renderer/components/ErrorBoundary.tsx` - React error boundary

---

### 3.2 Production Console Cleanup

**Risk Level**: 🟡 LOW  
**Estimated Time**: 1-2 hours

#### Solution
1. Create logger utility that respects environment
2. Replace `console.log` with logger
3. Strip console statements in production build

#### Files to Create
- `src/renderer/utils/logger.ts` - Environment-aware logger

---

### 3.3 Migration Cleanup

**Risk Level**: 🟡 MEDIUM  
**Estimated Time**: 2-3 hours

#### Problem
- Demo users seeded in migration 001
- Duplicate migration numbers

#### Solution
1. Create `scripts/seed-demo-users.ts` for development only
2. Remove demo user inserts from `001_fresh_schema.sql`
3. Rename duplicate migrations with correct sequence

---

## Phase 4: CI/CD Setup (Day 3)

### 4.1 Enable GitHub Actions

**Risk Level**: 🟡 LOW  
**Estimated Time**: 1 hour

#### Problem
CI/CD disabled (only runs for `electron-react-boilerplate` repo)

#### Solution
1. Update `publish.yml` condition
2. Add required secrets to GitHub repository
3. Test release workflow

#### Files to Modify
- `.github/workflows/publish.yml` - Remove/update repo condition
- `.github/workflows/test.yml` - Enable for all branches

---

## Execution Checklist

### Pre-Implementation
- [ ] Create backup of current `.env` file
- [ ] Document current Supabase project details
- [ ] Notify team of credential rotation

### Phase 1 Execution
- [ ] 1.1.1 Remove supabaseAdmin from client
- [ ] 1.1.2 Create secure IPC channel for admin ops
- [ ] 1.1.3 Update staff.api.ts to use IPC
- [ ] 1.2.1 Add VITE_SHOW_DEMO_MODE check
- [ ] 1.2.2 Hide demo section in production
- [ ] 1.3.1 Create .env.example
- [ ] 1.3.2 Create .env.development
- [ ] 1.3.3 Update webpack for env separation
- [ ] 1.3.4 Rotate Supabase credentials
- [ ] 1.3.5 Rotate ICD API credentials

### Phase 2 Execution
- [ ] 2.1.1 Fix TextEncoder typing issue
- [ ] 2.1.2 Add auth flow tests
- [ ] 2.1.3 Add billing tests
- [ ] 2.2.1 Fix dotenv-webpack types

### Phase 3 Execution
- [ ] 3.1.1 Install Sentry
- [ ] 3.1.2 Configure error tracking
- [ ] 3.2.1 Create logger utility
- [ ] 3.3.1 Clean demo data from migrations

### Phase 4 Execution
- [ ] 4.1.1 Update publish.yml
- [ ] 4.1.2 Add GitHub secrets
- [ ] 4.1.3 Test release build

### Post-Implementation
- [ ] Run full test suite
- [ ] Verify production build
- [ ] Security scan of built artifacts
- [ ] Update deployment documentation

---

## Rollback Plan

If issues arise during implementation:

1. **Git Reset**: All changes are tracked, can revert to pre-fix commit
2. **Credential Rollback**: Old credentials still work until rotated in Supabase dashboard
3. **Environment Rollback**: Keep backup of original `.env`

---

## Success Criteria

| Criteria | Verification Method |
|----------|---------------------|
| No service role key in bundle | `grep` search returns empty |
| Demo mode hidden in production | Visual inspection of login page |
| Tests passing | `npm test` exits with code 0 |
| Lint passing | `npm run lint` exits with code 0 |
| Build successful | `npm run build` exits with code 0 |
| Error tracking active | Test error appears in Sentry dashboard |

---

## Contact & Escalation

If blockers are encountered during execution:

1. **Supabase Issues**: Check Supabase status page, review RLS policies
2. **Electron Build Issues**: Consult electron-builder docs
3. **Test Failures**: Review Jest configuration and TypeScript setup

---

**Document Version**: 1.0  
**Last Updated**: January 14, 2026
