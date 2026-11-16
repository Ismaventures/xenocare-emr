-- Populate imaging_catalogue from nhis_procedures
-- Only selecting items with type 'Radiology Investigations'

INSERT INTO imaging_catalogue (
    code,
    name,
    modality,
    price,
    nhis_code,
    nhis_price,
    is_nhis_covered,
    is_active,
    body_part
)
SELECT
    code,
    name,
    CASE
        WHEN name ILIKE '%MRI%' THEN 'MRI'
        WHEN name ILIKE '%CT%' OR name ILIKE '%CAT Scan%' THEN 'CT Scan'
        WHEN name ILIKE '%Ultrasound%' OR name ILIKE '%USS%' OR name ILIKE '%Scan%' THEN 'Ultrasound'
        WHEN name ILIKE '%X-Ray%' OR name ILIKE '%X Ray%' OR name ILIKE '%Xray%' THEN 'X-Ray'
        WHEN name ILIKE '%Mammogram%' THEN 'Mammography'
        ELSE 'Other'
    END as modality,
    price,
    code,
    price,
    true,
    true,
    -- Attempt to infer body part (very basic)
    CASE
        WHEN name ILIKE '%Chest%' THEN 'Chest'
        WHEN name ILIKE '%Abdomen%' OR name ILIKE '%Abdominal%' THEN 'Abdomen'
        WHEN name ILIKE '%Head%' OR name ILIKE '%Brain%' OR name ILIKE '%Skull%' THEN 'Head'
        WHEN name ILIKE '%Spine%' OR name ILIKE '%Cervical%' OR name ILIKE '%Lumbar%' THEN 'Spine'
        WHEN name ILIKE '%Pelvis%' OR name ILIKE '%Pelvic%' THEN 'Pelvis'
        WHEN name ILIKE '%Knee%' THEN 'Knee'
        WHEN name ILIKE '%Shoulder%' THEN 'Shoulder'
        WHEN name ILIKE '%Hand%' OR name ILIKE '%Wrist%' THEN 'Hand/Wrist'
        WHEN name ILIKE '%Foot%' OR name ILIKE '%Ankle%' THEN 'Foot/Ankle'
        ELSE 'General'
    END as body_part
FROM nhis_procedures
WHERE type = 'Radiology Investigations'
ON CONFLICT (code) DO UPDATE SET
    nhis_code = EXCLUDED.nhis_code,
    nhis_price = EXCLUDED.nhis_price,
    is_nhis_covered = true,
    price = EXCLUDED.price; -- Update price to match NHIS price? Maybe safer to keep existing price if it was manually set, but for now let's sync.

-- Also update existing records that might match by name but have different codes
UPDATE imaging_catalogue ic
SET
    nhis_code = np.code,
    nhis_price = np.price,
    is_nhis_covered = true
FROM nhis_procedures np
WHERE ic.name = np.name
AND np.type = 'Radiology Investigations'
AND ic.nhis_code IS NULL;
