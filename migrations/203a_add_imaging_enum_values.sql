-- =============================================================================
-- Migration 203a: Add new imaging_type enum values
-- =============================================================================
-- Run this FIRST and commit. Then run 203_expand_imaging_catalogue.sql.
-- PostgreSQL requires new enum values to be committed before they can be used.
-- =============================================================================

ALTER TYPE imaging_type ADD VALUE IF NOT EXISTS 'Ophthalmic Imaging';
ALTER TYPE imaging_type ADD VALUE IF NOT EXISTS 'Cardiac Imaging';
ALTER TYPE imaging_type ADD VALUE IF NOT EXISTS 'Pulmonary Diagnostics';
ALTER TYPE imaging_type ADD VALUE IF NOT EXISTS 'Nuclear Medicine';
