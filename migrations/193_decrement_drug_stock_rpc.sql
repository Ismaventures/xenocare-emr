-- =============================================================================
-- Migration 193: Create decrement_drug_stock RPC function
-- =============================================================================
-- Purpose: Atomic stock decrement for pharmacy dispensing
-- Called by: pharmacy.api.ts → dispenseMedication()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decrement_drug_stock(
  p_drug_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE drug_catalogue
  SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0),
      updated_at = NOW()
  WHERE id = p_drug_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drug not found: %', p_drug_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.decrement_drug_stock(UUID, INTEGER) IS 
  'Atomically decrements drug stock quantity during pharmacy dispensing. Prevents negative stock.';
