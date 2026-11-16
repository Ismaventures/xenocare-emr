-- Add security services NHIS fees to clinics table
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS security_services_nhis_consultation_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_services_nhis_follow_up_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_services_nhis_emergency_fee DECIMAL(10, 2) DEFAULT 0;
