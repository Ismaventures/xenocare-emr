-- =============================================================================
-- NDC Medical Centre EMR - Add Category-Based Pricing to Clinics
-- Adds pricing columns for all InsuranceType categories from patient registration
-- InsuranceType: 'Private' | 'Military_NHIS' | 'Civilian_NHIS' | 'Retainership' | 'GIFSHIP'
-- =============================================================================

-- Add Military NHIS pricing columns (InsuranceType: 'Military_NHIS')
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS military_nhis_consultation_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS military_nhis_follow_up_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS military_nhis_emergency_fee numeric(10,2) DEFAULT 0;

-- Add Retainership (Corporate) pricing columns to clinics
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS retainership_consultation_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retainership_follow_up_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retainership_emergency_fee numeric(10,2) DEFAULT 0;

-- Add GIFSHIP pricing columns (Government Insurance Fund for Social Healthcare)
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS gifship_consultation_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gifship_follow_up_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gifship_emergency_fee numeric(10,2) DEFAULT 0;

-- Add comments for clarity on InsuranceType mapping
COMMENT ON COLUMN public.clinics.consultation_fee IS 'Private patient consultation fee (InsuranceType: Private)';
COMMENT ON COLUMN public.clinics.military_nhis_consultation_fee IS 'Military NHIS patient consultation fee (InsuranceType: Military_NHIS)';
COMMENT ON COLUMN public.clinics.nhis_consultation_fee IS 'Civilian NHIS patient consultation fee (InsuranceType: Civilian_NHIS)';
COMMENT ON COLUMN public.clinics.retainership_consultation_fee IS 'Corporate retainership patient consultation fee (InsuranceType: Retainership)';
COMMENT ON COLUMN public.clinics.gifship_consultation_fee IS 'GIFSHIP patient consultation fee (InsuranceType: GIFSHIP)';

-- Drop existing view if it exists (to allow column structure changes)
DROP VIEW IF EXISTS public.clinic_category_prices;

-- Create a view for easy price lookup by InsuranceType category
CREATE VIEW public.clinic_category_prices AS
SELECT 
    id,
    clinic_id,
    clinic_name,
    clinic_code,
    -- Private pricing (InsuranceType: 'Private')
    consultation_fee as private_consultation_fee,
    follow_up_fee as private_follow_up_fee,
    emergency_fee as private_emergency_fee,
    -- Military NHIS pricing (InsuranceType: 'Military_NHIS')
    military_nhis_consultation_fee,
    military_nhis_follow_up_fee,
    military_nhis_emergency_fee,
    -- Civilian NHIS pricing (InsuranceType: 'Civilian_NHIS')
    nhis_consultation_fee as civilian_nhis_consultation_fee,
    nhis_follow_up_fee as civilian_nhis_follow_up_fee,
    nhis_emergency_fee as civilian_nhis_emergency_fee,
    -- Retainership pricing (InsuranceType: 'Retainership')
    retainership_consultation_fee,
    retainership_follow_up_fee,
    retainership_emergency_fee,
    -- GIFSHIP pricing (InsuranceType: 'GIFSHIP')
    gifship_consultation_fee,
    gifship_follow_up_fee,
    gifship_emergency_fee,
    is_active
FROM public.clinics;

-- Function to get clinic price by InsuranceType (from patient registration)
-- InsuranceType: 'Private' | 'Military_NHIS' | 'Civilian_NHIS' | 'Retainership' | 'GIFSHIP'
CREATE OR REPLACE FUNCTION public.get_clinic_price(
    p_clinic_id UUID,
    p_insurance_type VARCHAR(50),
    p_fee_type VARCHAR(20) DEFAULT 'consultation'
)
RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC(10,2);
    v_clinic RECORD;
BEGIN
    SELECT * INTO v_clinic FROM public.clinics WHERE id = p_clinic_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Determine price based on InsuranceType and fee type
    CASE p_insurance_type
        -- Private patients (cash/self-pay)
        WHEN 'Private', 'private', 'Cash', 'cash' THEN
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := v_clinic.consultation_fee;
                WHEN 'follow_up' THEN v_price := v_clinic.follow_up_fee;
                WHEN 'emergency' THEN v_price := v_clinic.emergency_fee;
                ELSE v_price := v_clinic.consultation_fee;
            END CASE;
        
        -- Military NHIS (previously DHML - uses Military NHIS rates)
        WHEN 'Military_NHIS', 'military_nhis', 'DHML', 'dhml' THEN
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := v_clinic.military_nhis_consultation_fee;
                WHEN 'follow_up' THEN v_price := v_clinic.military_nhis_follow_up_fee;
                WHEN 'emergency' THEN v_price := v_clinic.military_nhis_emergency_fee;
                ELSE v_price := v_clinic.military_nhis_consultation_fee;
            END CASE;
        
        -- Civilian NHIS (uses NHIS tariff rates)
        WHEN 'Civilian_NHIS', 'civilian_nhis', 'NHIS', 'nhis' THEN
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := v_clinic.nhis_consultation_fee;
                WHEN 'follow_up' THEN v_price := v_clinic.nhis_follow_up_fee;
                WHEN 'emergency' THEN v_price := v_clinic.nhis_emergency_fee;
                ELSE v_price := v_clinic.nhis_consultation_fee;
            END CASE;
        
        -- Retainership (Corporate accounts)
        WHEN 'Retainership', 'retainership', 'Corporate', 'corporate' THEN
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := v_clinic.retainership_consultation_fee;
                WHEN 'follow_up' THEN v_price := v_clinic.retainership_follow_up_fee;
                WHEN 'emergency' THEN v_price := v_clinic.retainership_emergency_fee;
                ELSE v_price := v_clinic.retainership_consultation_fee;
            END CASE;
        
        -- GIFSHIP (Government Insurance Fund for Social Healthcare)
        WHEN 'GIFSHIP', 'gifship', 'Gifship' THEN
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := COALESCE(v_clinic.gifship_consultation_fee, v_clinic.nhis_consultation_fee);
                WHEN 'follow_up' THEN v_price := COALESCE(v_clinic.gifship_follow_up_fee, v_clinic.nhis_follow_up_fee);
                WHEN 'emergency' THEN v_price := COALESCE(v_clinic.gifship_emergency_fee, v_clinic.nhis_emergency_fee);
                ELSE v_price := COALESCE(v_clinic.gifship_consultation_fee, v_clinic.nhis_consultation_fee);
            END CASE;
        
        -- Default to private pricing for unknown types
        ELSE
            CASE p_fee_type
                WHEN 'consultation' THEN v_price := v_clinic.consultation_fee;
                WHEN 'follow_up' THEN v_price := v_clinic.follow_up_fee;
                WHEN 'emergency' THEN v_price := v_clinic.emergency_fee;
                ELSE v_price := v_clinic.consultation_fee;
            END CASE;
    END CASE;
    
    RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

SELECT 'Category-based clinic pricing columns added successfully (InsuranceType aligned)' as status;
