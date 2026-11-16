-- Diagnostic queries for NHIS drug prices
-- Run these in your database to check for missing prices

-- 0. Check for DRG prefix drugs (legacy drugs to be removed)
SELECT COUNT(*) as drg_drugs_count FROM drug_catalogue WHERE code LIKE 'DRG%';
SELECT code, name, nhis_price FROM drug_catalogue WHERE code LIKE 'DRG%' LIMIT 20;

-- 1. Count drugs with missing/zero NHIS prices
SELECT 
    COUNT(*) as total_nhis_drugs,
    COUNT(CASE WHEN nhis_price IS NULL OR nhis_price = 0 THEN 1 END) as missing_prices,
    COUNT(CASE WHEN nhis_price > 0 THEN 1 END) as has_prices
FROM drug_catalogue 
WHERE is_nhis_covered = true;

-- 2. List all drugs with missing prices
SELECT code, name, nhis_category, nhis_subcategory, nhis_price 
FROM drug_catalogue 
WHERE is_nhis_covered = true AND (nhis_price IS NULL OR nhis_price = 0)
ORDER BY nhis_category, code;

-- 3. Summary by category
SELECT 
    nhis_category,
    COUNT(*) as drug_count,
    COUNT(CASE WHEN nhis_price IS NULL OR nhis_price = 0 THEN 1 END) as missing_prices,
    AVG(nhis_price) as avg_price,
    MAX(nhis_price) as max_price
FROM drug_catalogue 
WHERE is_nhis_covered = true AND nhis_category IS NOT NULL
GROUP BY nhis_category
ORDER BY nhis_category;

-- 4. Price distribution
SELECT 
    CASE 
        WHEN nhis_price IS NULL OR nhis_price = 0 THEN 'No price'
        WHEN nhis_price < 100 THEN 'Under N100'
        WHEN nhis_price < 1000 THEN 'N100-999'
        WHEN nhis_price < 10000 THEN 'N1,000-9,999'
        WHEN nhis_price < 100000 THEN 'N10,000-99,999'
        ELSE 'N100,000+'
    END as price_range,
    COUNT(*) as drug_count
FROM drug_catalogue 
WHERE is_nhis_covered = true
GROUP BY 1
ORDER BY 1;
