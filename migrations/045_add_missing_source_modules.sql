-- =============================================================================
-- Migration: Add missing source_module enum values
-- Date: 2025-01-20
-- Description: Adds dental, ophthalmology, and physiotherapy to source_module enum
--              These modules were using billing integration but not in the enum
-- =============================================================================

-- Add missing source modules that are actively used in billing
ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'dental';
ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'ophthalmology';
ALTER TYPE source_module ADD VALUE IF NOT EXISTS 'physiotherapy';

-- Note: All three modules have been implemented and use createBillingOrder with these source_module values:
-- - dental: src/renderer/modules/dental/api/dental.api.ts
-- - ophthalmology: src/renderer/modules/ophthalmology/api/ophthalmology.api.ts
-- - physiotherapy: src/renderer/modules/physiotherapy/api/physiotherapy.api.ts
