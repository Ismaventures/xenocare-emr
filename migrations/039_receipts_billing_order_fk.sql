-- =============================================================================
-- Migration: Add FK constraint from receipts to billing_orders
-- Date: December 27, 2025
-- Purpose: Properly link receipts to billing_orders for standard accounting
-- =============================================================================

-- Add FK constraint for billing_order_id in receipts table
-- This ensures referential integrity between receipts and billing_orders

DO $$
BEGIN
    -- Check if the constraint doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'receipts_billing_order_id_fkey' 
        AND table_name = 'receipts'
    ) THEN
        -- Add the FK constraint
        ALTER TABLE receipts 
        ADD CONSTRAINT receipts_billing_order_id_fkey 
        FOREIGN KEY (billing_order_id) 
        REFERENCES billing_orders(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added FK constraint receipts_billing_order_id_fkey';
    ELSE
        RAISE NOTICE 'FK constraint receipts_billing_order_id_fkey already exists';
    END IF;
END $$;

-- Create index for better query performance on the FK column
CREATE INDEX IF NOT EXISTS idx_receipts_billing_order_id ON receipts(billing_order_id);

-- =============================================================================
-- Verify the constraint was added
-- =============================================================================
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'receipts_billing_order_id_fkey' 
        AND table_name = 'receipts'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'SUCCESS: receipts.billing_order_id now properly references billing_orders.id';
    ELSE
        RAISE WARNING 'FAILED: FK constraint was not created';
    END IF;
END $$;
