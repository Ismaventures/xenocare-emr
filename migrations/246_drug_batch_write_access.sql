-- =============================================================================
-- Drug Batch Write Access
-- =============================================================================
-- drug_batches previously had only SELECT for authenticated users, so pharmacy
-- staff could receive or adjust stock in the UI but every INSERT/UPDATE was
-- rejected by RLS. Writes stay scoped to inventory and pharmacy roles.

BEGIN;

DROP POLICY IF EXISTS drug_batches_pharmacy_insert ON public.drug_batches;
DROP POLICY IF EXISTS drug_batches_pharmacy_update ON public.drug_batches;

CREATE POLICY drug_batches_pharmacy_insert
  ON public.drug_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN (
      'super_admin',
      'admin',
      'medical_director',
      'pharmacist',
      'inventory_manager'
    )
  );

CREATE POLICY drug_batches_pharmacy_update
  ON public.drug_batches
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN (
      'super_admin',
      'admin',
      'medical_director',
      'pharmacist',
      'inventory_manager'
    )
  )
  WITH CHECK (
    public.get_user_role() IN (
      'super_admin',
      'admin',
      'medical_director',
      'pharmacist',
      'inventory_manager'
    )
  );

COMMIT;
