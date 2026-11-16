# MUHEDA CLINIC — Database Migrations

This folder contains the deployment-specific migrations created for MUHEDA CLINIC.

## Apply order

Run these in order using the Supabase SQL editor or `psql`:

1. `001_disable_nhis_operations.sql`
   - Disables legacy NHIS triggers and zeroes NHIS coverage configuration.
2. `002_muheda_deployment_config.sql`
   - Rebrands the facility as **MUHEDA CLINIC**.
   - Adds `MHC-000001` hospital-number numbering configuration.
   - Adds structured patient allergies, RLS policies and legacy allergy backfill.
3. `003_fix_patient_duplicate_guard.sql`
   - Prevents duplicate-patient checks from blocking unrelated updates such as
     allergy-summary synchronization.
4. `004_clean_operational_data.sql` — optional, destructive data reset
   - Deletes patients, visits, clinical records, orders, billing, admissions,
     queue entries, stock/batches, notifications and audit/embedding data.
   - Preserves staff logins, facilities, clinics, wards, beds, catalogues,
     templates, settings and permissions.
   - Only run this after taking a database backup.
5. `005_external_prescriptions.sql`
   - Adds the external-medication flag used for prescriptions that must not enter
     pharmacy dispensing, stock, billing, or approval queues.
6. `006_lab_universal_reporting.sql`
   - Adds laboratory request grouping and specimen metadata for the universal
     laboratory result sheet and printable report.

If `002` already failed with `Duplicate patient detected: service number already exists`, run `003` first, then re-run `002`.

For a fresh MUHEDA start with existing operational data:
1. Run `003`.
2. Re-run `002`.
3. Run `004`.
If `001` has not been applied yet, run it before the others.

## Important notes

- Existing patient records, patient numbers and relationships are not rewritten.
- The facility address is seeded as `Jos, Plateau State, Nigeria` until the exact street address is supplied.
- The same SQL is mirrored in:
   - `migrations/241_disable_nhis_operations.sql`
   - `migrations/242_muheda_deployment_config.sql`
   - `migrations/243_fix_patient_duplicate_guard.sql`
   - `migrations/244_external_prescriptions.sql`
   - `migrations/245_lab_universal_reporting.sql`
   - `supabase/migrations/20261115000001_disable_nhis_operations.sql`
   - `supabase/migrations/20261115000002_muheda_deployment_config.sql`
   - `supabase/migrations/20261115000003_fix_patient_duplicate_guard.sql`
   - `supabase/migrations/20261116000001_external_prescriptions.sql`
   - `supabase/migrations/20261116000002_lab_universal_reporting.sql`
- Apply only one copy of each migration to a database.
