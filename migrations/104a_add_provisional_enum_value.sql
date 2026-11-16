-- Migration 104a: Add 'provisional' value to nhis_approval_status ENUM
-- Date: 2026-02-03
-- 
-- IMPORTANT: This migration MUST be run and committed BEFORE migration 104b.
-- PostgreSQL requires new enum values to be committed before they can be used.

-- Add 'provisional' to the nhis_approval_status enum type
ALTER TYPE nhis_approval_status ADD VALUE IF NOT EXISTS 'provisional';

-- That's all for this migration. Run migration 104b next to update CHECK constraints.
