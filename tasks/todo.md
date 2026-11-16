# Todo

## Plan - Specialty Clinic Stats Crash Fix (Apr 2026)

- [x] Trace the specialty dashboard payload shape causing metric cards to receive undefined values
- [x] Normalize specialty stats at the API boundary so legacy/missing RPC keys do not crash the page
- [x] Add a defensive metric-card numeric fallback and verify touched specialty files for diagnostics

## Review - Specialty Clinic Stats Crash Fix (Apr 2026)

- [x] Confirm opening specialty clinic pages no longer throws on `value.toString()`
- [x] Confirm metric cards and tab badges still show stable counts when some RPC stat keys are omitted

## Plan - Root README User Manual Refresh (Apr 2026)

- [x] Inventory live routes, modules, settings, and support pages from the current app
- [x] Replace the boilerplate root README with an EMR-specific user manual and training guide
- [x] Verify the README reflects the current navigation, configuration tabs, and role-based module access

## Review - Root README User Manual Refresh (Apr 2026)

- [x] Confirm the README covers all user-facing modules listed in App routing and menu config
- [x] Confirm the README explains where users find profile settings, themes, system settings, server settings, and audit trail
- [x] Confirm the README preserves a short technical startup section for IT/admin users of the repository

## Plan - README First-Time Module Training Expansion (Apr 2026)

- [x] Inventory visible tabs, actions, and first-use workflows for each exposed EMR module
- [x] Expand the root README with click-by-click first-time-user instructions across major operational modules
- [x] Verify the new README section is linked from the table of contents and sits alongside the existing workflow reference sections

## Review - README First-Time Module Training Expansion (Apr 2026)

- [x] Confirm the guide explains what users see first in each module before listing actions
- [x] Confirm the guide includes concrete first-use steps for registration, encounters, clinical care, diagnostics, specialty clinics, finance, and support modules
- [x] Confirm the guide covers personal/support surfaces such as messages, profile, and sync status management

## Plan - Physiotherapy NHIS Session Unlock Hardening (Apr 2026)

- [x] Trace whether NHIS physiotherapy plans already create NHIS approval requests and whether approved plans flow back into physio records
- [x] Align physiotherapy session UI lock/unlock behavior with the existing backend NHIS approval gate so sessions stay locked until NHIS clearance and payment readiness
- [x] Verify the physiotherapy and NHIS files involved are free of diagnostics after the lock-state changes

## Review - Physiotherapy NHIS Session Unlock Hardening (Apr 2026)

- [x] Confirm NHIS physiotherapy plans are still submitted as `physiotherapy_plan` approvals and visible in the NHIS approvals workflow
- [x] Confirm physiotherapy session recording remains blocked in the API until NHIS approval is `approved` or `not_required`
- [x] Confirm the physiotherapy UI now keeps pending, provisional, rejected, expired, or unpaid plans visibly locked before staff can open the session recorder

## Plan - EMR User Manual + PDF Refresh (Apr 2026)

- [ ] Inventory all end-user modules, routes, settings, and admin configuration surfaces from the current app
- [ ] Draft a comprehensive user manual covering navigation, workflows, every major module, and settings/configuration areas
- [ ] Generate a PDF export of the user manual for training/onboarding use
- [ ] Replace the root README with project-specific documentation that links to the new manual and explains how to regenerate it

## Review - EMR User Manual + PDF Refresh (Apr 2026)

- [ ] Verify the manual reflects the current route/menu structure rather than outdated boilerplate
- [ ] Verify the PDF file is generated successfully and opens from the repo
- [ ] Verify the README points to the manual and summarizes the live EMR modules and setup paths

## Plan - AI Agent Guardrails Hardening (Apr 2026)

- [x] Scan the repo for repeated AI-generated code failure patterns and collect representative examples
- [x] Draft repo-specific guardrails covering repo hygiene, secrets, SQL/RLS, typing, logging, duplication, and verification
- [x] Update CLAUDE.md with enforceable code-generation rules and a pre-completion checklist
- [x] Review the new guidance against current repo patterns to avoid generic or contradictory advice

## Review - AI Agent Guardrails Hardening (Apr 2026)

- [x] Confirm the guidance explicitly blocks root-level scratch artifacts and committed verification logs
- [x] Confirm the guidance blocks hardcoded secrets and blanket write-access RLS policies
- [x] Confirm the guidance steers agents toward existing logger utilities and stronger TypeScript boundaries
- [x] Confirm the guidance requires cleanup and proof of verification before a task is considered complete

## Plan - Query Identity + API Design Hardening (Apr 2026)

- [x] Add a shared query identity utility for stable cache-id serialization
- [x] Refactor representative high-traffic hooks to use the shared query identity helper
- [x] Validate touched query hook files for diagnostics regressions
- [x] Document recommended EMR API layering based on current repo patterns

## Review - Query Identity + API Design Hardening (Apr 2026)

- [ ] Verify touched hooks still build identical query keys and offline cache ids for equivalent filter objects
- [ ] Verify diagnostics remain clean in shared query identity utility and updated hooks
- [ ] Compare current API layering with recommended query/mutation/workflow split and list next refactor targets

## Plan - Consultation Workflow Draft Store Pilot (Apr 2026)

- [x] Add a shared Zustand-backed workflow draft store for consultation module snapshots
- [x] Refactor ConsultationWizard to use the shared draft persistence hook instead of inline save/load/clear helpers
- [x] Refactor SpecialtyConsultationWizard to use the shared draft persistence hook and remove localStorage draft writes
- [x] Validate touched consultation state files for diagnostics regressions

## Review - Consultation Workflow Draft Store Pilot (Apr 2026)

- [ ] Verify standard consultation drafts still restore and clear after successful submit
- [ ] Verify specialty consultation drafts restore from IndexedDB-backed storage instead of localStorage
- [ ] Verify specialty order/referral/care-plan draft slices persist across reopen within the same workflow

## Plan - Consultation Imaging Dropdown + AI Markdown Guard (Apr 2026)

- [x] Trace why imaging options do not render reliably in the main consultation orders step
- [x] Normalize imaging catalogue payloads at the shared radiology hook boundary so cached and live records use one shape
- [x] Guard AI chat session restore and streaming/render paths against non-string markdown payloads
- [x] Verify touched consultation/radiology/AI files for diagnostics regressions

## Review - Consultation Imaging Dropdown + AI Markdown Guard (Apr 2026)

- [x] Confirm touched files are free of VS Code diagnostics
- [ ] Manually verify consultation imaging dropdown renders options from both cached and live catalogue data
- [ ] Manually verify opening prior AI chat history no longer floods renderer logs with `[object Object]`

## Plan - Packaged Startup Green Screen Remediation (Apr 2026)

- [x] Reproduce the packaged startup failure and capture main/renderer diagnostics
- [x] Harden Electron startup to avoid unhandled updater failures and log renderer load issues
- [x] Add a renderer boot fallback screen so fatal startup errors do not collapse to a blank window
- [x] Rebuild/package and verify the packaged app no longer fails silently on startup

## Review - Packaged Startup Green Screen Remediation (Apr 2026)

- [x] Verify packaged startup no longer logs an unhandled updater rejection by default
- [x] Verify renderer load failures/crashes are written to the Electron main log with actionable details
- [ ] Verify a fatal renderer startup error shows an in-app fallback screen instead of a blank green window

## Plan - Lab Form Template Promotion (Apr 2026)

- [x] Add persistence layer for per-test lab form templates with versioning and active-template switching
- [x] Add renderer API/hooks for save, fetch active template, template history, and rollback
- [x] Add lab result form actions to save edited form as default template and roll back to earlier template version
- [ ] Verify newly opened forms load active template for the same test while existing result amendments keep original payload
- [x] Run diagnostics for save-template and rollback flows
- [ ] Run manual QA for save-template and rollback flows

## Review - Lab Form Template Promotion (Apr 2026)

- [ ] Verify Save as Template creates a new active version for selected test
- [ ] Verify next newly opened form for the same test preloads the saved template
- [ ] Verify rollback activates selected prior version for subsequent forms
- [ ] Verify editing an existing result still opens with that result payload (not overridden)

## Plan - Production Readiness Remediation (Apr 2026)

- [x] Harden renderer CSP for production while preserving dev-time allowances
- [x] Remove sensitive renderer login/Supabase initialization logs from production paths
- [x] Move renderer Supabase auth persistence off localStorage to session-scoped storage
- [x] Add user-visible error handling for dental export audit failures and specialty follow-up resolution failures
- [x] Reduce dashboard N+1 query load in My Patients widget
- [x] Add timeout + retry handling for main-process AI fetch calls
- [x] Replace remaining PHI-heavy debug logs in export/workflow modules with structured redacted logging
- [ ] Batch remaining encounter/queue summary queries behind RPCs or aggregated views
- [x] Enforce backend-side critical result escalation and duplicate-patient protections

## Review - Production Readiness Remediation (Apr 2026)

- [ ] Verify production build loads under strict CSP without blocked asset/runtime errors
- [ ] Verify login and Supabase session persistence still works across normal navigation and refresh
- [ ] Verify dental export still downloads and shows warning toast when audit logging fails
- [ ] Verify Specialty Consultation follow-up warning appears only when patient resolution fails
- [ ] Verify My Patients widget issues no per-visit billing/lab count queries
- [ ] Verify AI timeout path retries and returns a controlled error instead of hanging indefinitely

## Plan - Export Filter Consistency (Apr 2026)

- [x] Fix shared date-range normalization so export reports include full selected periods
- [x] Apply all boolean/category filter options consistently across report APIs
- [x] Validate PDF, Excel, and CSV exports use the fully filtered report datasets

## Review - Export Filter Consistency (Apr 2026)

- [ ] Verify each report modal exports the same filtered row count to PDF, Excel, and CSV
- [ ] Verify custom date ranges include records created on the selected end date
- [ ] Verify procedure and ophthalmology negative boolean filters return the expected records

## Plan - NHIS Interaction Speed Hardening (Apr 2026)

- [ ] Add optimistic cache updates for NHIS verification and specialty approval queues
- [ ] Make NHIS approve/reject interactions resolve immediately in the UI while background work completes
- [ ] Validate no diagnostics regressions in updated NHIS hooks and components

## Review - NHIS Interaction Speed Hardening (Apr 2026)

- [ ] Verify internal approval modal closes immediately after approve/reject and queue updates without visible lag
- [ ] Verify specialty referral approve/reject feels immediate and failed mutations restore queue state correctly
- [ ] Verify NHIS dashboard and queue counts reconcile after background completion

## Plan - NHIS Approval Modal Clinical Formatting (Apr 2026)

- [ ] Format legacy specialty examination JSON into readable clinical summaries in NHIS approval views
- [ ] Stop generating raw specialty exam JSON in new NHIS approval request clinical findings
- [ ] Apply the same fast interaction pattern to NHIS service approval modal decisions

## Review - NHIS Approval Modal Clinical Formatting (Apr 2026)

- [ ] Verify lab approval modal shows readable specialty examination summary instead of raw JSON blobs
- [ ] Verify new specialty-originated NHIS requests persist plain clinical narrative instead of serialized form JSON
- [ ] Verify approve, provisional, and reject actions in NHIS service approvals feel immediate and restore state on failure

## Plan - IndexedDB Caching Execution (Mar 2026)

- [x] Produce execution README with gap register, phased roadmap, and module rollout waves
- [ ] Approve data classification and conflict policy matrix for P0 entities
- [ ] Implement IndexedDB storage foundation and migrate query persistence off localStorage
- [ ] Implement Sync Center and conflict resolution workflow
- [ ] Roll out Wave 1 clinical modules with offline test coverage
- [ ] Roll out Wave 2 specialty modules with offline test coverage
- [ ] Roll out Wave 3 support/admin modules with explicit degraded behavior
- [ ] Complete hardening: quota governance, encryption controls, SLO telemetry

## Review - IndexedDB Caching Execution (Mar 2026)

- [ ] Verify core patient and encounter data are readable offline after app restart
- [ ] Verify queued offline writes replay deterministically with visible status outcomes
- [ ] Verify conflict cases provide user-resolvable mine/theirs/manual actions
- [ ] Verify PHI local storage controls (encryption + logout/user-switch wipe)
- [ ] Verify unstable-network simulations meet sync latency and failure SLOs

## Plan - UI Smoothness Hardening (Mar 2026)

- [x] Add IndexedDB maintenance cycle for expired-record cleanup and quota pressure trimming
- [x] Migrate draft autosave/restore hook from localStorage to IndexedDB
- [x] Migrate dynamic specialty menu cache path from localStorage to IndexedDB SWR
- [x] Remove repeated localStorage calls from high-frequency background outbox persistence
- [ ] Validate no regressions in draft restore, dynamic menu rendering, and background sync status updates

## Review - UI Smoothness Hardening (Mar 2026)

- [ ] Confirm consultation draft restore still works after reload and successful submit clears draft

## Plan - Patient Registration Admin Filters + PDF Export (Apr 2026)

- [x] Trace the current patient registration list filters, permissions, and export plumbing
- [x] Extend patient registration filtering to cover admin-facing registration categories and date-based criteria
- [x] Add PDF export for the filtered registration dataset and keep export actions inside the filter panel
- [x] Verify touched registration files for diagnostics regressions

## Review - Patient Registration Admin Filters + PDF Export (Apr 2026)

- [ ] Confirm admin users can filter registrations by the new category/date fields from the filter drawer
- [ ] Confirm PDF export uses the full filtered dataset rather than only the current table page
- [ ] Confirm export controls remain hidden unless the filter panel is opened
- [ ] Confirm specialty-specific menu label/icon resolve correctly on cold start and after login
- [ ] Confirm sync queue indicator updates correctly during normal and offline retry flows

## Plan - Lab Report Filter + Export Accuracy (Apr 2026)

- [x] Trace the lab report modal, filter panel, API query, and export output for filter mismatches
- [x] Add lab report filters for patient category, insurance type, and NHIS coverage segments including civilian NHIS patients/participants
- [x] Normalize lab category matching so filter values align with stored catalogue categories
- [x] Update lab PDF/Excel/CSV report output so filtered exports include full datasets and patient coverage fields
- [x] Verify touched lab report files for diagnostics regressions

## Review - Lab Report Filter + Export Accuracy (Apr 2026)

- [x] Confirm lab category filters return records for stored catalogue categories including Hematology and Chemical Pathology variants
- [x] Confirm staff can filter lab reports by patient category, insurance type, and civilian NHIS coverage combinations such as Civilian Participant + Civilian NHIS/GIFSHIP
- [x] Confirm PDF, Excel, and CSV exports contain the same filtered lab record count with no PDF truncation
- [x] Confirm filtered exports show patient category and insurance type columns for auditable report output

## Plan - Security Linter Phase 2 Remediation (Mar 2026)

- [x] Set immutable `search_path` on mutable public functions
- [x] Move `vector` extension out of `public` schema
- [x] Replace baseline `*_authenticated_all` write policies with authenticated SELECT-only where paired with service role policy
- [x] Tighten remaining non-SELECT permissive RLS policies to require authenticated session
- [ ] Re-run Supabase linter after migrations 221/222 in target environment

## Review - Security Linter Phase 2 Remediation (Mar 2026)

- [ ] Confirm `function_search_path_mutable` warnings are cleared
- [ ] Confirm `extension_in_public` warning for `vector` is cleared
- [ ] Confirm `rls_policy_always_true` warnings are materially reduced/cleared for non-SELECT policies
- [ ] Enable Supabase Auth leaked password protection in project settings (dashboard-side)

## Plan - Radiology Image 60-Day Retention

- [x] Add database cleanup function to remove radiology images older than 60 days
- [x] Add automatic daily scheduler for retention cleanup when pg_cron is available
- [x] Ensure cleanup removes both storage objects and scan_images metadata rows

## Review - Radiology Image 60-Day Retention

- [ ] Verify old images are removed from storage bucket and scan_images after 60 days
- [ ] Verify key and non-key images follow the same 60-day policy

## Plan - Radiology Imaging Upload Speed + Sharpness

- [x] Speed up radiology image upload flow to reduce waiting time
- [x] Keep diagnostic image quality sharp by uploading original files unchanged
- [x] Improve preview responsiveness for selected images
- [x] Validate TypeScript diagnostics for touched radiology components

## Review - Radiology Imaging Upload Speed + Sharpness

- [x] Confirm multiple image uploads complete faster than previous sequential flow
- [x] Confirm uploaded images remain sharp in viewer/report workflows
- [x] Confirm drag/drop and file-picker previews appear quickly

## Plan - Encounter AI Records Office Modal (Mar 2026)

- [x] Replace encounter AI slide-over with centered branded modal matching pharmacy AI shell
- [x] Add encounter AI patient selector built from encounter records with safe fallback
- [x] Pass richer encounter EMR context fields into AIChatPanel for Socratic records-office prompts
- [x] Run diagnostics for touched files and document review checks

## Review - Encounter AI Records Office Modal (Mar 2026)

- [ ] Verify modal opens/closes cleanly with backdrop click and close button
- [ ] Verify patient selector switches AI context to selected patient chart records
- [ ] Verify AI requests include patient and encounter context fields in encounter module

## Plan - Specialty Consultation AI Panel Reference Fix (Apr 2026)

- [x] Trace the missing `isAIPanelExpanded` state in SpecialtyConsultationWizard
- [x] Restore the wizard AI panel expand/collapse state wiring
- [x] Validate touched wizard file for diagnostics regressions

## Review - Specialty Consultation AI Panel Reference Fix (Apr 2026)

- [ ] Verify opening the specialty AI assistant no longer throws a runtime ReferenceError
- [ ] Verify expand/collapse still resizes the AI side panel and closing resets it

## Plan - Background Sync Performance Fixes (Mar 2026)

- [x] Add bounded concurrency to background mutation queue while preserving per-entity ordering
- [x] Add active-sync unload guard to reduce accidental navigation away during pending writes
- [x] Reduce redundant A&E order write lookups by sharing staff/NHIS/order catalogue context per batch submit
- [x] Improve addendum save perceived latency with optimistic local rendering in specialty consultation timeline
- [x] Run diagnostics on touched files and document residual risks

## Review - Background Sync Performance Fixes (Mar 2026)

- [ ] Verify unrelated background writes process in parallel while same-entity writes remain serialized
- [ ] Verify browser unload prompt appears only when active background sync exists
- [ ] Verify A&E batch order submission no longer repeats staff/NHIS lookups per order
- [ ] Verify addendum note appears instantly and reconciles correctly after server response/failure

## Plan - Codebase Review (Mar 2026)

- [x] Inventory architecture docs, runtime entrypoints, and module boundaries
- [x] Review critical UI/data flows (specialty timeline, orders, addendums)
- [x] Scan Supabase usage patterns for security, validation, and RLS assumptions
- [x] Review database schemas/indices for hot paths and reporting queries
- [x] Compile prioritized findings with refactoring examples and test gaps

## Review - Codebase Review (Mar 2026)

- [ ] Validate tightening RLS for addendums and admin IPC authorization
- [ ] Align Supabase client config with server-config flows
- [ ] Confirm high-volume query paths are paginated/virtualized

## Plan - Background Mutation Queue Hardening

- [x] Add global background mutation manager with queue, retries, and status tracking
- [x] Add shared useBackgroundMutation hook and global sync indicator
- [x] Route encounter creation, vitals save, consultation save/update, orders, NHIS approval, and billing create through background queue
- [x] Disable write-request timeout aborts in renderer Supabase fetch wrapper
- [x] Add form draft persistence for encounter creation form and standard consultation wizard
- [x] Add consultation update version field support and optimistic-lock update path
- [ ] Validate end-to-end save-then-navigate behavior for encounter, vitals, consultation, and orders
- [ ] Validate retry and failure indicator flows under offline/slow network conditions

## Review - Background Mutation Queue Hardening

- [ ] Confirm writes continue processing after route navigation and module unmounts
- [ ] Confirm no data loss when navigating away immediately after Save
- [ ] Confirm global Syncing, Saved, Retrying, Failed indicators reflect queue status
- [ ] Confirm consultation version conflict handling surfaces non-destructive errors

## Plan - Specialty Orders And Services Submission

- [x] Add shared specialty orders/referrals submission utility using consultation order + clinical request APIs
- [x] Wire ophthalmology wizard save flow to submit lab, imaging, prescriptions, procedures, and referrals
- [x] Wire dental wizard save flow to submit lab, imaging, prescriptions, procedures, and referrals
- [x] Wire physiotherapy wizard save flow to submit lab, imaging, prescriptions, procedures, and referrals
- [x] Enable ophthalmology orders-only mode to allow direct "Send Requests" action
- [x] Extend shared specialty clinic timeline modal with Orders & Services send form across specialties
- [x] Validate TypeScript diagnostics on touched specialty modules

## Review - Specialty Orders And Services Submission

- [ ] Verify ophthalmology orders-only mode sends requests to Lab, Radiology, Pharmacy, Procedure, and Referral queues
- [ ] Verify dental and physiotherapy wizard submissions route orders to their respective modules
- [ ] Verify internal referrals created from specialty forms appear in Encounter Office internal referral queue

## Plan - Ophthalmology Clinical Timeline Notes Visibility

- [x] Show consultation addendum notes inside Summary under a dedicated Clinical Timeline Notes section
- [x] Place Clinical Timeline Notes above consultation/history content in the summary timeline flow
- [x] Include author role-prefixed names and full timestamp (date + time + relative)
- [x] Ensure note list updates automatically after new addendum save

## Review - Ophthalmology Clinical Timeline Notes Visibility

- [x] Validate TypeScript diagnostics on updated ophthalmology components
- [ ] Verify in UI that a nurse-entered note shows as Nurse <Name> and doctor-entered note shows as Dr. <Name>
- [ ] Verify ophthalmologist/optometrist roles render as Ophthalmologist <Name> / Optometrist <Name>

## Plan - Move Encounter Navigation To Top

- [x] Replace ophthalmology encounter left navigation with visible top navigation tabs
- [x] Replace specialty/dental encounter modal left navigation with visible top navigation tabs
- [x] Validate TypeScript diagnostics for touched timeline components

## Review - Move Encounter Navigation To Top

- [ ] Confirm top navigation remains visible and usable on desktop and mobile in ophthalmology encounter view
- [ ] Confirm top navigation remains visible and usable on desktop and mobile in specialty/dental encounter modal

## Plan - Fix Consultation NHIS Duplicate Identifier

- [x] Locate duplicate/mismatched patient NHIS flag declarations in consultation API
- [x] Normalize variable naming by function scope to avoid redeclaration and undefined usage
- [x] Validate renderer build no longer reports parser/compile failure

## Plan - Fix Radiology API Parse Errors

- [x] Inspect hydrateRadiologyScanResults corruption and expected behavior
- [x] Rewrite hydrateRadiologyScanResults to fetch scan results + images safely
- [x] Verify TypeScript errors are cleared

## Plan - Restore Legacy Report Visibility

- [x] Update NHIS filter to include null/legacy statuses in requests query
- [x] Align radiology stats counts with the same NHIS filter
- [x] Add legacy status fallback for enum errors
- [ ] Validate imaging/reports tabs now list legacy completed records

## Plan - Fix Scan Images + Staff Lookup Errors

- [x] Update radiology API staff lookup to use staff.user_id (auth uid) with fallback
- [x] Guard scan_images hydration and uploads when the table is missing
- [ ] Provide SQL to add scan_images table (if absent) and confirm enum migration

## Plan - Report Entry Image Preview

- [x] Show existing scan images in report entry form
- [ ] Confirm preview renders for scan_images and legacy image URLs

## Plan - Full Image Viewer Modal

- [x] Create reusable imaging gallery modal with navigation and descriptions
- [x] Add launch button from report entry existing images panel
- [ ] Validate multiple-image navigation and description display

## Review - Full Image Viewer Modal

- [ ] Confirm gallery opens from existing and newly uploaded images
- [ ] Confirm navigation + descriptions render in modal

## Plan - Image Viewer Zoom + Full-Width

- [x] Make the active image fill the viewer area width/height
- [x] Add zoom controls with reset and clamp
- [x] Reset zoom on image change and modal open

## Review - Image Viewer Zoom + Full-Width

- [ ] Confirm zoom in/out/reset works and respects limits
- [ ] Confirm image uses full viewer width/height without distortion
- [ ] Confirm drag-to-pan works when zoomed in

## Plan - Image Viewer Orientation + Scroll + Layout

- [x] Add flip controls (horizontal/vertical) and optional rotate
- [x] Enable scroll/pan area for oversized images
- [x] Widen viewer panel by shrinking left navigation pane
- [x] Reset transforms on image change

## Review - Image Viewer Orientation + Scroll + Layout

- [ ] Confirm flip/rotate toggles apply correctly
- [ ] Confirm scroll/pan works for large images
- [ ] Confirm viewer area is wider with smaller nav pane

## Plan - Radiology Technique/Comparison Dropdowns

- [x] Review current Radiology report form fields and related helpers
- [x] Add dropdown options and custom-input handling for Technique and Comparison
- [ ] Verify structured report narrative and save payload still use the new values

## Plan - Radiology Results Completeness

- [x] Audit report display surfaces (detail modal, list preview, print)
- [x] Add missing sections (notes/recommendations) and ensure scan_result fallbacks
- [ ] Verify results UI shows structured notes and impressions

## Plan - Standard Findings/Impression Phrases

- [x] Add standard phrase dropdowns to structured reporting
- [ ] Verify phrases appear in findings/impression output

## Plan - RADS Profile Categories

- [x] Add RADS profile options (BI/LI/PI/TI/O/CO/Lung/CAD/NI)
- [x] Render category dropdowns per profile
- [x] Wire categories into structured impression output

## Review - RADS Profile Categories

- [ ] Confirm each profile shows its category dropdown
- [ ] Confirm selected categories appear in report output

## Plan - Auto-Select RADS Profiles

- [x] Extend profile resolver with modality/body-part heuristics
- [ ] Verify profile auto-selection with common studies

## Plan - Radiology Workflow Refactor

- [x] Audit current radiology workflow screens, API mutations, and status transitions
- [x] Define new workflow statuses and map them to DB enum + UI status filters
- [x] Update request list columns/actions for schedule, upload, finalize
- [x] Split UI into workflow-specific views (Approval, Scheduling, Imaging, Reporting, History)
- [x] Add scheduling modal and wire schedule mutation
- [x] Add imaging upload modal and wire upload mutation
- [x] Enforce image-upload gating before report entry
- [x] Add finalize-report confirmation and role-based checks in UI
- [x] Update stats cards to new workflow counts
- [ ] Verify end-to-end flow with sample orders

## Review - Radiology Workflow Refactor

- [ ] Validate each workflow tab shows expected statuses
- [ ] Confirm schedule, upload, and finalize actions advance statuses
- [ ] Confirm reports are blocked until images exist

## Plan - Unused Index Noise Reduction (Mar 2026)

- [x] Inventory current Supabase `unused_index` findings and identify safe-removal patterns
- [x] Add migration to drop only unused auto FK indexes (`idx_fk_%`) when a covering equivalent index already exists
- [ ] Re-run linter and verify `unused_index` count reduction without new `unindexed_foreign_keys`

## Review - Unused Index Noise Reduction (Mar 2026)

- [ ] Confirm migration only drops non-constraint, non-unique indexes with `idx_scan = 0`
- [ ] Confirm dropped index keys are covered by another valid index on the same table
- [ ] Confirm no regression in FK index coverage warnings

## Plan - Nutrition Lab Linkage Phase 1/2 (Mar 2026)

- [x] Phase 1: Update consultation history aggregation to return lab requests grouped by consultation and compute real lab stats
- [x] Phase 1: Validate Patient Medical Records labs tab now renders historical lab entries from consultation history
- [x] Phase 2: Add nutrition module lab order action path using shared batch orders pipeline
- [x] Phase 2: Ensure nutrition-triggered lab orders include encounter/patient linkage and ordering staff attribution
- [x] Phase 2: Invalidate relevant query keys so new lab orders appear without manual refresh
- [x] Run TypeScript diagnostics on touched files and capture residual risks

## Review - Nutrition Lab Linkage Phase 1/2 (Mar 2026)

- [x] Confirm medical records labs tab shows historical lab requests and correct totals
- [x] Confirm nutrition flow can submit lab orders and created rows are linked to patient + encounter
- [x] Confirm new lab requests appear in appropriate UI surfaces after mutation success
- [x] Confirm no TypeScript regressions in touched modules

## Plan - Nutrition Timeline + Refresh Phase 3/4 (Mar 2026)

- [x] Phase 3: Extend timeline event categories to include nutrition_plan, nutrition_session, and nutrition_order
- [x] Phase 3: Extend nursing timeline aggregator to emit nutrition care plan/session events for encounter-linked records
- [x] Phase 3: Render nutrition timeline categories with explicit visual styles in inpatient and nursing timeline UIs
- [x] Phase 4: Invalidate clinical timeline and patient history keys after nutrition care plan/session writes
- [x] Run TypeScript diagnostics on touched timeline and nutrition files

## Review - Nutrition Timeline + Refresh Phase 3/4 (Mar 2026)

- [x] Confirm admission and nursing timeline cards show nutrition events in chronological order
- [x] Confirm nutrition lab orders appear as nutrition_order events when ordered by nutrition staff
- [x] Confirm creating/completing nutrition care records updates timeline and history surfaces without manual reload
- [x] Confirm no TypeScript regressions in touched modules

## Review - Radiology Technique/Comparison Dropdowns

- [ ] Confirm dropdown options and custom inputs render correctly
- [ ] Confirm selected values save and reload as expected

## Plan

- [x] Locate referral queue completion gaps in dental, physiotherapy, and ophthalmology flows
- [x] Add clinical request completion on successful consult save where referral IDs are present
- [x] Verify referral queues refresh after completion and update plan notes

## Progress

- [x] Verify referral queues refresh after completion

## Review

- [x] Dental, physiotherapy, and ophthalmology pages compile without TypeScript errors (get_errors)
- [x] Referral completion triggers refetch/invalidation on save paths

---

## Plan (Nutrition Module)

- [x] Review specialty module standards and shared care plan infrastructure
- [x] Implement nutrition domain types, API, and React Query hooks
- [x] Build nutrition UI (queue, referrals, care plans, meal plan creation, follow-up sessions)
- [x] Integrate routing, menu navigation, and access control permissions
- [x] Validate changed files for TypeScript and lint diagnostics

## Progress (Nutrition Module)

- [x] Implemented nutrition module (queue, referrals, meal plans, follow-up sessions)
- [x] Registered module in app router, navigation menu, and role access maps
- [x] Added nutrition support to queue location typing and specialty care-plan registry

## Review (Nutrition Module)

- [x] Nutrition module follows existing specialty standards (folder layout, typed API/hooks/components)
- [x] Meal-plan workflow captures baseline assessment, prescription targets, and follow-up adherence
- [x] App navigation and module permissions are correctly wired
- [x] Diagnostics passed for all touched files (get_errors)

---

## Plan (Nutrition End-to-End: OPD + Inpatient)

- [x] Trace outpatient nutrition routing from encounter through billing and nursing handoff
- [x] Add inpatient nutrition referral entrypoint from ward round referrals UI
- [x] Create real clinical referral records from inpatient ward-round referrals
- [x] Harden atomic billing specialty handoff parity with nursing-first standard flow
- [x] Run diagnostics on all touched files and resolve introduced issues

## Review (Nutrition End-to-End: OPD + Inpatient)

- [x] Outpatient path remains encounter-driven and routes via Nursing before Nutrition using specialty handoff tags
- [x] Inpatient ward round now creates actionable `clinical_requests` referral records (including Nutrition)
- [x] Nutrition appears in inpatient internal specialty options, enabling ward-driven Nutrition consult workflow
- [x] Atomic billing success path now repairs/creates Nursing handoff for specialty clinics when legacy DB RPC behavior differs
- [x] Diagnostics passed for changed billing, inpatient API/component, and shared type files
