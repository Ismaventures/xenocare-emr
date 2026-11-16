-- =============================================================================
-- Enable Supabase Realtime for Key Tables
-- This allows real-time subscriptions to work properly
-- =============================================================================

-- Enable replica identity full for realtime to send full row data
ALTER TABLE queue REPLICA IDENTITY FULL;
ALTER TABLE visits REPLICA IDENTITY FULL;
ALTER TABLE consultations REPLICA IDENTITY FULL;
ALTER TABLE billing_orders REPLICA IDENTITY FULL;
ALTER TABLE billing_items REPLICA IDENTITY FULL;
ALTER TABLE receipts REPLICA IDENTITY FULL;
ALTER TABLE lab_requests REPLICA IDENTITY FULL;
ALTER TABLE radiology_requests REPLICA IDENTITY FULL;
ALTER TABLE prescriptions REPLICA IDENTITY FULL;
ALTER TABLE vitals REPLICA IDENTITY FULL;
ALTER TABLE patients REPLICA IDENTITY FULL;
ALTER TABLE inventory_items REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- Note: Supabase automatically creates a publication named 'supabase_realtime'
-- We add tables individually with error handling

DO $$
BEGIN
  -- Add queue
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE queue;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add visits
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE visits;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add consultations
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add billing_orders
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE billing_orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add billing_items
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE billing_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add receipts
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add lab_requests
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE lab_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add radiology_requests
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE radiology_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add prescriptions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add vitals
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vitals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add patients
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE patients;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Add inventory_items
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

