-- =============================================================================
-- ENCOUNTER EXPIRY CONFIGURABLE SETTINGS
-- Allows admin to configure how long encounters remain active before expiring
-- Settings can be configured per OPD classification (GOPD / Specialty) and
-- per encounter category (outpatient / inpatient / emergency / day_case)
-- =============================================================================

-- 1. Create config category for Encounter Settings
INSERT INTO config_categories (name, description, is_active)
VALUES ('Encounter Settings', 'Settings for encounter duration, expiry, and lifecycle management', true)
ON CONFLICT DO NOTHING;

-- 2. Seed encounter expiry configuration keys
-- Uses inline subquery to resolve category_id (avoids DO $$ block parsing issues)

-- Default encounter duration for GOPD (General OPD) outpatient encounters
-- Value is in HOURS. Default: 504 hours = 21 days = 3 weeks
INSERT INTO system_configurations (key, value, description, category_id, is_system, data_type, is_active)
VALUES (
  'encounter.expiry.gopd_outpatient_hours',
  '504',
  'How many hours a GOPD outpatient encounter stays active before expiring. Default: 504 (3 weeks)',
  (SELECT id FROM config_categories WHERE name = 'Encounter Settings' LIMIT 1),
  false, 'number', true
) ON CONFLICT (key) DO NOTHING;

-- Default encounter duration for Specialty OPD outpatient encounters
INSERT INTO system_configurations (key, value, description, category_id, is_system, data_type, is_active)
VALUES (
  'encounter.expiry.specialty_outpatient_hours',
  '504',
  'How many hours a Specialty OPD outpatient encounter stays active before expiring. Default: 504 (3 weeks)',
  (SELECT id FROM config_categories WHERE name = 'Encounter Settings' LIMIT 1),
  false, 'number', true
) ON CONFLICT (key) DO NOTHING;

-- Default encounter duration for Emergency encounters
INSERT INTO system_configurations (key, value, description, category_id, is_system, data_type, is_active)
VALUES (
  'encounter.expiry.emergency_hours',
  '72',
  'How many hours an emergency encounter stays active before expiring. Default: 72 (3 days)',
  (SELECT id FROM config_categories WHERE name = 'Encounter Settings' LIMIT 1),
  false, 'number', true
) ON CONFLICT (key) DO NOTHING;

-- Default encounter duration for Day Case encounters
INSERT INTO system_configurations (key, value, description, category_id, is_system, data_type, is_active)
VALUES (
  'encounter.expiry.day_case_hours',
  '48',
  'How many hours a day case encounter stays active before expiring. Default: 48 (2 days)',
  (SELECT id FROM config_categories WHERE name = 'Encounter Settings' LIMIT 1),
  false, 'number', true
) ON CONFLICT (key) DO NOTHING;

-- Overdue warning threshold (minutes before flagging as overdue/waiting too long)
INSERT INTO system_configurations (key, value, description, category_id, is_system, data_type, is_active)
VALUES (
  'encounter.overdue_warning_minutes',
  '30',
  'Minutes after which an active/waiting encounter is flagged as overdue. Default: 30',
  (SELECT id FROM config_categories WHERE name = 'Encounter Settings' LIMIT 1),
  false, 'number', true
) ON CONFLICT (key) DO NOTHING;
